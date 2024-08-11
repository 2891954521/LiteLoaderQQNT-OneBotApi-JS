const fs = require('fs');
const path = require("path");

class Log {

	static isDebug = false;
	static isDebugIPC = false;

	static logPath = './';

	static fileStream = null;

	/** @type IPCDebugger */
	static ipcDebugger = null;

	static setDebug(debug, isDebugIPC, logPath){
		this.isDebug = debug;
		this.isDebugIPC = isDebugIPC;

		if(this.isDebugIPC) this.ipcDebugger = new IPCDebugger();

		if(this.fileStream) this.fileStream.end();

		if(debug){
			if(logPath) this.logPath = logPath;

			let d = new Date();
			let logFile = path.join(this.logPath, `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}.log`);

			this.fileStream = null
			this.fileStream = fs.createWriteStream(logFile);

			Log.i(`debug mode is on, debug log to ${logFile}`)
		}
	}

	static d(...args){
		if(this.isDebug){
			console.log("\x1b[36m[OneBotAPI-Debug]\x1b[0m", ...args);
			this.fileStream?.write("[Debug]" + args.join('') + '\n');
		}
	}

	static i(...args){
		console.log("\x1b[32m[OneBotAPI-Info]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream?.write("[Info]" + args.join('') + '\n');
		}
	}

	static w(...args){
		console.log("\x1b[33m[OneBotAPI-Warn]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream?.write("[Warn]" + args.join('') + '\n');
		}
	}

	static e(...args){
		console.log("\x1b[31m[OneBotAPI-Error]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream?.write("[Error]" + args.join('') + '\n');
		}
	}
}


class IPCDebugger {

	debugIPC = {};

	blackList = [
		"nodeIKernelMsgListener/onAddSendMsg",
		"nodeIKernelMsgListener/onMsgInfoListUpdate",
		"nodeIKernelProfileListener/onProfileDetailInfoChanged",
		"nodeIKernelRecentContactListener/onRecentContactListChangedVer2",
	]

	constructor(){

	}

	IPCSend(_, status, name, ...args) {
		if(name === '___!log') return;
		let eventName = args?.[0]?.[0]?.eventName;
		if(eventName?.startsWith("ns-LoggerApi")) return;
		let callbackId = args?.[0]?.[0]?.callbackId;
		if(callbackId){
			// if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
			this.debugIPC[callbackId] = JSON.stringify(args?.[0]);
			// Log.d(`[IPC Call ${callbackId}] -> ${JSON.stringify(args)}`);
		}else{
			Log.d(`[IPC Call] -> ${JSON.stringify(args)}`);
		}
	}

	IPCReceive(channel, ...args){
		if(args?.[0]?.eventName?.startsWith("ns-LoggerApi")) return;

		let cmdName = args?.[1]?.[0]?.cmdName;
		if(cmdName){
			if(cmdName.includes("onBuddyListChange")) return;
			else if(cmdName in this.blackList) return;
		}

		let callbackId = args?.[0]?.callbackId;
		if(callbackId){
			if(this.debugIPC[callbackId]){
				if(args?.[1]){
					let str = JSON.stringify(args?.[1]);
					// if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
					Log.d(`\x1b[36m[IPC Func]\x1b[0m ${this.debugIPC[callbackId]} \x1b[36m=>\x1b[0m ${str}`);
				}
				delete this.debugIPC[callbackId];
			}else{
				if(args?.[1]){
					let str = JSON.stringify(args?.[1]);
					Log.d(`[IPC Resp ${callbackId}] <- ${str}`);
				}
			}
		}else{
			let str = JSON.stringify(args);
			// if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
			Log.d(`[IPC Resp] <- ${str}`);
		}

	}
}

module.exports = {
	Log,
}