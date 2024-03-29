const WebSocket = require('../lib/websocket');
const { Log } = require("../logger");
const { Reporter, Data} = require('../main/core');
const { oneBot11API} = require('../oneBot11/oneBot11')

class WebSocketClient{

	constructor(name, handleMsg, role){
		this.ws = null;
		this.error = null;
		this.isOpen = false;

		this.name = name;
		this.role = role;
		this.handleMsg = handleMsg;
	}

	openSocket(url){
		try{
			this.ws = new WebSocket(url, {
				headers: {
					'X-Self-ID': Data.selfInfo.uin,
					'X-Client-Role': this.role
				}
			});

			this.ws.on('open', () => {
				Log.i(`${this.name} is connected`);
				this.error = null;
				this.isOpen = true;
				if(this.handleMsg) this.ws.on('message', (data) => handle(this.ws, data));
			});

			this.ws.on('error', (e) => {
				Log.e(e.stack);
				this.error = e.stack;
				this.isOpen = false;
			});

			this.ws.on('close', (code) => {
				if(code != 1000){
					Log.w(`${this.name} was closed with code ${code}`);
					this.error = '连接意外关闭';
				}
				this.ws = null;
				this.isOpen = false;
			});
		}catch(e){
			Log.e(e.stack);
			this.error = e.stack;
		}
	}

	stopSocket(){
		if(this.ws && this.isOpen) this.ws.close();
		this.ws = null;
		this.error = null;
		this.isOpen = false;
	}
}


let wss = new WebSocketClient('ws', true, 'Universal');
let api = new WebSocketClient('api', false, 'API');
let event = new WebSocketClient('event', true, 'Event');

function handle(ws, data){
	try{
		let params = JSON.parse(data);
		const handler = oneBot11API[params?.action];
		if(handler){
			new Promise(async(resolve) => {
				resolve(await handler(params.params || {}))
			}).then((result) => {
				result.echo = params.echo;
				ws.send(JSON.stringify(result));
			}, (err) => {
				Log.e(err.stack);
			});
		}else{
			ws.send(`{"status": "failed", "retcode": 1404, "data": null, "echo": "${params.echo}"}`)
		}
	}catch(e){
		Log.e(e.stack);
	}
}


function report(data){
	try{
		wss.ws?.send(data);
		event.ws?.send(data);
	}catch(e){
		Log.e(e.stack);
	}
}


function startWsClient(params){
	Log.i(`Starting WebSocket Client.`);
	if(params.url && !wss.ws) wss.openSocket(params.url);
	if(params.apiUrl && !api.ws) api.openSocket(params.apiUrl);
	if(params.eventUrl && !event.ws) event.openSocket(params.eventUrl);
	if(wss.ws || event.ws) Reporter.webSocketReverseReporter = report;
}


function restartWsClient(params){
	Log.i(`Restarting WebSocket Client.`);
	stopWsClient();
	startWsClient(params);
}


function stopWsClient(){
	Log.i(`Stopping WebSocket Client.`);
	Reporter.webSocketReverseReporter = null;
	wss.stopSocket();
	api.stopSocket();
	event.stopSocket();
}


module.exports = {
	getStatus: () => {
		return {
			"wss": {
				status: wss.ws != null && wss.error == null,
				msg: wss.error
			},
			"api": {
				status: api.ws != null && api.error == null,
				msg: api.error
			},
			"event": {
				status: event.ws != null && event.error == null,
				msg: event.error
			}
		}
	},

	startWsClient,
	restartWsClient,
	stopWsClient
}