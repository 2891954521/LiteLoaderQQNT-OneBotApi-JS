const http = require('http');

const WebSocketServer = require('../lib/websocket-server');
const { Log } = require("../logger");
const { Reporter } = require('../main/core');
const { oneBot11API} = require('../oneBot11/oneBot11')

const WsStatus = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3
};


let errorMsg = null;

let isRunning = false;

const wss = new WebSocketServer({ noServer: true });
const api = new WebSocketServer({ noServer: true });
const event = new WebSocketServer({ noServer: true });

const server = http.createServer();


function init(){
	wss.on('connection', (ws) => {
		ws.on('error', Log.w);
		ws.on('message', (data) => handle(ws, data));
	});
	api.on('connection', (ws) => {
		ws.on('error', Log.w);
		ws.on('message', (data) => handle(ws, data));
	});
	event.on('connection', (ws) => {
		ws.on('error', Log.w);
	});
	wss.on('error', (err) => Log.w(err));
	api.on('error', (err) => Log.w(err));
	event.on('error', (err) => Log.w(err));
}


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
	wss.clients.forEach((client) => {
		if(client.readyState === WsStatus.OPEN) client.send(data);
	});
	event.clients.forEach((client) => {
		if(client.readyState === WsStatus.OPEN) client.send(data);
	});
}


function startWsServer(port){
	if(isRunning) return;

	server.on('upgrade', function upgrade(request, socket, head) {
		if(request.url == '/'){
			wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
		}else if(request.url == '/api' || request.url == '/api/'){
			api.handleUpgrade(request, socket, head, (ws) => api.emit('connection', ws, request));
		}else if(request.url == '/event' || request.url == '/event/'){
			event.handleUpgrade(request, socket, head, (ws) => event.emit('connection', ws, request));
		}else{
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
			socket.destroy();
		}
	});

	server.on('error', (e) => {
		if(e.code === 'EADDRINUSE'){
			errorMsg = "端口已被占用";
			Log.w(`Port ${port} is already in used`);
		}
	});

	server.listen(port, '0.0.0.0', () => {
		isRunning = true;
		Reporter.webSocketReporter = report;
		Log.i(`WebSocket Server running at http://0.0.0.0:${port}/`);
	});
}


async function restartWsServer(port){
	if(isRunning){
		await stopWsServer();
		Log.i(`restarting WebSocket Server.`);
		startWsServer(port)
	}else{
		startWsServer(port);
	}
}


function stopWsServer(){
	return new Promise((resolve) => {
		if(isRunning){
			Reporter.webSocketReporter = null;
			server.close(() => {
				Log.i(`WebSocket Server stopped.`);
				isRunning = false;
				resolve();
			})
		}else{
			resolve();
		}
	})
}


init();

module.exports = {
	getStatus: () => {
		return {
			status: isRunning,
			msg: errorMsg
		}
	},

	startWsServer,
	restartWsServer,
	stopWsServer
}