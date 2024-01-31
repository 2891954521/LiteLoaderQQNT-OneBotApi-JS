const ipcRenderer = window.OneBotApi.ipcRenderer_OneBot;
const ipcRendererOn = window.OneBotApi.ipcRenderer_ON_OneBot;

const pluginPath = LiteLoader.plugins['OneBotApi-JS'].path.plugin;

function loadMain(){
	const isDebug = window.OneBotApi.isDebug;
	const IPCAction = window.OneBotApi.IPCAction;

	if(isDebug) print('loadMain');

	// 更新好友列表
	ntCall("ns-ntApi", "nodeIKernelBuddyService/getBuddyList", [{ force_update: false }, undefined]);

	// 加载群列表
	ntCall("ns-ntApi", "nodeIKernelGroupService/getGroupList", [{ force_update: false }, undefined]);

	// 获取自身信息
	// ntCall("ns-BusinessApi", "fetchAuthData", [])
	// 	.then((selfInfo) => {
	// 	print(selfInfo);
	// 	if(!selfInfo) return;
	// 	ipcRenderer.send(IPCAction.ACTION_UPDATE_SELF_INFO, selfInfo);
	// });

	ipcRendererOn(IPCAction.ACTION_NT_CALL, (event, data) => {
		ntCall(data['eventName'], data['cmdName'], data['args'], 'uuid' in data ? data['uuid'] : null)
	});

	if(isDebug) print('loadMain done');
}

async function onConfigView(view){

}

async function onSettingWindowCreated(view){

	const IPCAction = window.OneBotApi.IPCAction;

	const configData = await ipcRenderer.invoke(IPCAction.ACTION_GET_CONFIG);

	view.innerHTML = await (await fetch(`local:///${pluginPath}/src/common/setting.html`)).text();


	const httpStatus = view.querySelector('.http #httpServerStatus');

	ipcRenderer.invoke(IPCAction.ACTION_HTTP_SERVER_STATUS).then(errorMessage => {
		httpStatus.innerHTML = errorMessage == null ? '<font color="green">运行中</font>' : `<font color="red">${errorMessage}</font>`;
	});

	// 重启HTTP服务端按钮
	view.querySelector('.http #restartHTTPServer').addEventListener('click', () => {
		ipcRenderer.send('one_bot_api_restart_http_server', configData.port);
		httpStatus.innerHTML = "正在重启";
		setTimeout( () => ipcRenderer.invoke(IPCAction.ACTION_HTTP_SERVER_STATUS).then(errorMessage => {
			httpStatus.innerHTML = errorMessage == null ? '<font color="green">运行中</font>' : `<font color="red">${errorMessage}</font>`;
		}), 1000);
	});

    const httpPort = view.querySelector(".http .HTTPPort");
	const httpReport = view.querySelector(".http .HTTPReport");

	httpPort.value = configData.http.port;
	httpReport.value = configData.http.host;

	// 应用HTTP端口设置
	view.querySelector(".http #updateHTTPPort").addEventListener("click", () => {
		configData.http.port = parseInt(httpPort.value);
		ipcRenderer.send('one_bot_api_set_config', configData);
		ipcRenderer.send('one_bot_api_restart_http_server', configData.port);
		alert("设置成功");
	});

	bingToggle(view, ".http #enableHTTPReport", configData.http.enable, (enable) => {
		configData.http.enable = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	// 应用HTTP上报URL设置
    view.querySelector(".http #updateHTTPReport").addEventListener("click", () => {
		configData.http.host = httpReport.value;
		ipcRenderer.send('one_bot_api_set_config', configData);
		alert("设置成功");
    });

	// 自动接受好友请求
	const autoAcceptFriendRequest = view.querySelector(".setting #autoAcceptFriendRequest");
	autoAcceptFriendRequest.toggleAttribute("is-active", configData.setting.autoAcceptFriendRequest);
	autoAcceptFriendRequest.addEventListener("click", () => {
		configData.setting.autoAcceptFriendRequest = autoAcceptFriendRequest.toggleAttribute("is-active");
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	const debugMode = view.querySelector(".debug #debugMode");
	debugMode.toggleAttribute("is-active", configData.debug.debug);
	debugMode.addEventListener("click", () => {
		configData.debug.debug = debugMode.toggleAttribute("is-active");
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	const debugIPC = view.querySelector(".debug #debugIPC");
	debugIPC.toggleAttribute("is-active", configData.debug.ipc);
	debugIPC.addEventListener("click", () => {
		configData.debug.ipc = debugIPC.toggleAttribute("is-active");
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
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

function bingToggle(view, selector, value, callback){
	const toggle = view.querySelector(selector);
	toggle.toggleAttribute("is-active", value);
	toggle.addEventListener("click", () => {
		callback(toggle.toggleAttribute("is-active"));
	});
}

function print(...args){
	ipcRenderer.send("one_bot_api_log", args);
}


const url = location.href;
if(url.includes("/index.html") && url.includes("#/main/message")){
	ipcRenderer.send('one_bot_api_load_main_page');
	loadMain();
}else{
	navigation.addEventListener("navigatesuccess", function func(event){
		const url = event.target.currentEntry.url;
		// 检测是否为主界面
		if(url.includes("/index.html") && url.includes("#/main/message")){
			navigation.removeEventListener("navigatesuccess", func);
			ipcRenderer.send('one_bot_api_load_main_page')
			loadMain();
		}
	});
}

export {
	onConfigView,
	onSettingWindowCreated
}