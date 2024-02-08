const ipcRenderer = window.OneBotApi.ipcRenderer_OneBot;

const pluginPath = LiteLoader.plugins['OneBotApi-JS'].path.plugin;

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

	view.querySelector(".data #updateGroupList").addEventListener("click", () => {

	});

	// 上报自身消息
	bingToggle(view, ".setting #reportSelfMsg", configData.setting.reportSelfMsg, (enable) => {
		configData.setting.reportSelfMsg = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	// 自动接受好友请求
	bingToggle(view, ".setting #autoAcceptFriendRequest", configData.setting.autoAcceptFriendRequest, (enable) => {
		configData.setting.autoAcceptFriendRequest = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bingToggle(view, ".misc #disableUpdate", configData.misc.disableUpdate, (enable) => {
		configData.misc.disableUpdate = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bingToggle(view, ".debug #debugMode", configData.debug.debug, (enable) => {
		configData.debug.debug = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bingToggle(view, ".debug #debugIPC", configData.debug.ipc, (enable) => {
		configData.debug.ipc = enable;
		ipcRenderer.send(IPCAction.ACTION_SET_CONFIG, configData);
	});
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
}else{
	navigation.addEventListener("navigatesuccess", function func(event){
		const url = event.target.currentEntry.url;
		// 检测是否为主界面
		if(url.includes("/index.html") && url.includes("#/main/message")){
			navigation.removeEventListener("navigatesuccess", func);
			ipcRenderer.send('one_bot_api_load_main_page')
		}
	});
}

export {
	onConfigView,
	onSettingWindowCreated
}