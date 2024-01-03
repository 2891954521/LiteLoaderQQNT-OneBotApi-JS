const ipcRenderer = window.OneBotApi.ipcRenderer_OneBot;
const ipcRendererOn = window.OneBotApi.ipcRenderer_ON_OneBot;
const ipcRendererOnce = window.OneBotApi.ipcRenderer_ONCE_OneBot;

const pluginPath = LiteLoader.plugins['OneBotApi-JS'].path.plugin;


/**
 * 是否处于调试模式
 */
let isDebug = false;

function loadMain(){
	if(isDebug) log('loadMain');

	const IPCAction = window.OneBotApi.IPCAction;

	// 更新好友列表
	ntCall("ns-ntApi", "nodeIKernelBuddyService/getBuddyList", [{ force_update: false }, undefined]);

	// 加载群列表
	ntCall("ns-ntApi", "nodeIKernelGroupService/getGroupList", [{ force_update: false }, undefined]);

	// 获取自身信息
	// ntCall("ns-BusinessApi", "fetchAuthData", []).then((selfInfo) => {
	// 	if(!selfInfo) return;
	// 	ipcRenderer.send(IPCAction.ACTION_UPDATE_SELF_INFO, selfInfo);
	// });

	ipcRendererOn(IPCAction.ACTION_NT_CALL, (event, data) => {
		ntCall(data['eventName'], data['cmdName'], data['args'], 'uuid' in data ? data['uuid'] : null)
	});

	if(isDebug) log('loadMain done');
}

function onLoad(){
	const url = location.href;
	if(url.includes("/index.html") && url.includes("#/main/message")){
		if(isDebug) log('call loadMain');
		ipcRenderer.send('one_bot_api_load_main_page');
		loadMain();
	}else{
		navigation.addEventListener("navigatesuccess", function func(event){
			const url = event.target.currentEntry.url;
			// 检测是否为主界面
			if(url.includes("/index.html") && url.includes("#/main/message")){
				navigation.removeEventListener("navigatesuccess", func);
				if(isDebug) log('call loadMain navigation');
				ipcRenderer.send('one_bot_api_load_main_page')
				loadMain();
			}
		});
	}
}

async function onConfigView(view){

	const IPCAction = window.OneBotApi.IPCAction;

	const configData = await ipcRenderer.invoke(IPCAction.ACTION_GET_CONFIG);

	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = `llqqnt://local-file/${pluginPath}/src/common/setting.css`;

	document.head.appendChild(link);

	const htmlText = await (await fetch(`llqqnt://local-file/${pluginPath}/src/common/setting.html`)).text();

    new DOMParser()
		.parseFromString(htmlText, "text/html")
		.querySelectorAll("section")
		.forEach((node) => view.appendChild(node));

	const httpStatus = view.querySelector('.http .http-server-status');

    const httpPort = view.querySelector(".http .http-port-input");
    const httpReport = view.querySelector(".http .http-report-input");

	const restartServer = view.querySelector('.http .start-http-server');
    const applyHttpPort = view.querySelector(".http .apply-http-port");
    const applyHttpReport = view.querySelector(".http .apply-http-report");

    httpPort.value = configData.port;
	httpReport.value = configData.hosts[0];

	ipcRenderer.invoke(IPCAction.ACTION_HTTP_SERVER_STATUS).then(httpServer => {
		httpStatus.innerHTML = httpServer ? '<font color="green">运行中</font>' : '<font color="red">未运行</font>';
	});

	restartServer.addEventListener('click', () => {
		ipcRenderer.send('one_bot_api_restart_http_server', configData.port);
		ipcRenderer.invoke(IPCAction.ACTION_HTTP_SERVER_STATUS).then(httpServer => {
			httpStatus.innerHTML = httpServer ? '<font color="green">运行中</font>' : '<font color="red">未运行</font>';
		});
		alert("HTTP服务正在重启");
	});

    applyHttpPort.addEventListener("click", () => {
		configData.port = parseInt(httpPort.value);
		ipcRenderer.send('one_bot_api_set_config', configData);
		ipcRenderer.send('one_bot_api_restart_http_server', configData.port);
		alert("设置成功");
    });

    applyHttpReport.addEventListener("click", () => {
		configData.hosts[0] = httpReport.value;
		ipcRenderer.send('one_bot_api_set_config', configData);
		alert("设置成功");
    });
}


function ntCall(eventName, cmdName, args, uuid = null){
	const webContentsId = window.OneBotApi.webContentsId;
	ipcRenderer.send(
		`IPC_UP_${webContentsId}`,
		{
			type: "request",
			callbackId: uuid === null ? crypto.randomUUID() : uuid,
			eventName: `${eventName}-${webContentsId}`,
		},
		[cmdName, ...args]
	);
}


function log(...args){
	console.log("\x1b[32m[OneBotAPI-renderer]\x1b[0m", ...args);
	ipcRenderer.send("one_bot_api_log", args);
}


export {
	onLoad,
	onConfigView
}