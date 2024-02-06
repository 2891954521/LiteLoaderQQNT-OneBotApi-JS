const fs = require('fs');
const path = require("path");

class Log {

	static isDebug = false;
	static isDebugIPC = false;

	static logPath = './';

	static fileStream = null;

	static setDebug(debug, logPath){
		this.isDebug = debug;

		if(this.fileStream){
			this.fileStream.end();
		}

		if(debug){
			if(logPath) this.logPath = logPath;

			let d = new Date();
			let logFile = path.join(this.logPath, `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}-${d.getMinutes()}-${d.getSeconds()}.log`);

			this.fileStream = fs.createWriteStream(logFile);
			Log.i(`debug mode is on, debug log to ${logFile}`)
		}
	}
	static d(...args){
		if(this.isDebug){
			console.log("\x1b[37m[OneBotAPI-Debug]\x1b[0m", ...args);
			this.fileStream.write("[Debug]" + args.join('') + '\n');
		}
	}

	static i(...args){
		console.log("\x1b[32m[OneBotAPI-Info]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream.write("[Info]" + args.join('') + '\n');
		}
	}

	static w(...args){
		console.log("\x1b[33m[OneBotAPI-Warn]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream.write("[Warn]" + args.join('') + '\n');
		}
	}

	static e(...args){
		console.log("\x1b[31m[OneBotAPI-Error]\x1b[0m", ...args);
		if(this.isDebug){
			this.fileStream.write("[Error]" + args.join('') + '\n');
		}
	}
}


module.exports = {
	Log,
}