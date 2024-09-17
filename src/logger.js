// const fs = require('fs');
// const path = require("path");
// const WebSocket = require('./lib/websocket');

class Log {

	static isDebug = false;
	static isDebugIPC = false;

	static logPath = './';

	static fileStream = null;
	static ws = null;

	/** @type IPCDebugger */
	static ipcDebugger = null;

	static setDebug(debug, isDebugIPC, logPath = null){
		this.isDebug = debug;
		this.isDebugIPC = isDebugIPC;
		if(logPath != null) this.logPath = logPath;

		if(this.isDebugIPC) this.ipcDebugger = new IPCDebugger();

		if(this.fileStream) this.fileStream.end();

		if(debug){
			// try{
			// 	this.ws = new WebSocket("ws://127.0.0.1:12345", { headers: { 'X-Self-ID': 0, 'X-Client-Role': "" }});
			// 	this.ws.on('open', () => { this.isOpen = true });
			// 	this.ws.on('close', (code) => { this.isOpen = false });
			// }catch(e){ }

			// let d = new Date();
			// let logFile = path.join(this.logPath, `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}.log`);
			// this.fileStream = null
			// this.fileStream = fs.createWriteStream(logFile);
			// Log.i(`debug mode is on, debug log to ${logFile}`)
		}
	}

	static d(...args){
		if(this.isDebug){
			console.log("\x1b[36m[OneBotAPI-Debug]\x1b[0m", ...args);
			const data = args.join('')
			if(this.ws) this.ws.send("\x1b[36m[Debug]\x1b[0m" + data + '\n');
			this.fileStream?.write("[Debug]" + data + '\n');
		}
	}

	static i(...args){
		console.log("\x1b[32m[OneBotAPI-Info]\x1b[0m", ...args);
		if(this.isDebug){
			const data = args.join('')
			if(this.ws) this.ws.send("\x1b[32m[Info]\x1b[0m" + data + '\n');
			this.fileStream?.write("[Info]" + data + '\n');
		}
	}

	static w(...args){
		console.log("\x1b[33m[OneBotAPI-Warn]\x1b[0m", ...args);
		if(this.isDebug){
			const data = args.join('')
			if(this.ws) this.ws.send("\x1b[33m[Warn]\x1b[0m" + data + '\n');
			this.fileStream?.write("[Warn]" + data + '\n');
		}
	}

	static e(...args){
		console.log("\x1b[31m[OneBotAPI-Error]\x1b[0m", ...args);
		if(this.isDebug){
			const data = args.join('')
			if(this.ws) this.ws.send("\x1b[31m[Error]\x1b[0m" + data + '\n');
			this.fileStream?.write("[Error]" + data + '\n');
		}
	}
}


class IPCDebugger {

	debugIPC = {};

	blackList = [
		"nodeIKernelMsgListener/onAddSendMsg",
		"nodeIKernelMsgListener/onMsgInfoListUpdate",
		// "nodeIKernelProfileListener/onProfileDetailInfoChanged",
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
			this.debugIPC[callbackId] = args[0];
			// Log.d(`[IPC Call ${callbackId}] -> ${JSON.stringify(args)}`);
		}else{
			Log.d(`[IPC Call] -> ${JSON.stringify(args)}`);
		}
	}

	IPCReceive(channel, ...args){
		if(args?.[0]?.eventName?.startsWith("ns-LoggerApi")) return;

		let callbackId = args?.[0]?.callbackId;
		if(callbackId){
			if(this.debugIPC[callbackId]){
				if(args?.[1]){
					let str = JSON.stringify(args?.[1]);
					// if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
					let ipc = this.debugIPC[callbackId]
					Log.d(`\x1b[36m[IPC Func]\x1b[0m ${ipc[1][0]}: ${JSON.stringify(ipc[1][1])} \x1b[36m=>\x1b[0m ${str}`);
				}
				delete this.debugIPC[callbackId];
			}else{
				if(args?.[1]){
					let str = JSON.stringify(args?.[1]);
					Log.d(`[IPC Resp ${callbackId}] <- ${str}`);
				}
			}
		}else{
			let cmdName = args?.[1]?.[0]?.cmdName;
			if(cmdName){
				if(cmdName.includes("onBuddyListChange")) return;
				else if(cmdName in this.blackList) return;
				Log.d(`[IPC Resp] <- ${cmdName}: ${JSON.stringify(args[1][0]?.["payload"])}`);
			}
		}

	}
}

module.exports = {
	Log,
}