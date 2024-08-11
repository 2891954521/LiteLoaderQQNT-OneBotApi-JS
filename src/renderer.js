const ipcRenderer = window.OneBotApi.ipcRenderer_OneBot;

const pluginPath = LiteLoader.plugins['OneBotApi-JS'].path.plugin;

async function onConfigView(view){

}

async function onSettingWindowCreated(view){

	const IPCAction = OneBotApi.IPCAction;

	const configData = await OneBotApi.settingData();

	view.innerHTML = await (await fetch(`local:///${pluginPath}/src/common/setting.html`)).text();

	const wsStatus = view.querySelector('.ws #wsServerStatus');
	const httpStatus = view.querySelector('.http #httpServerStatus');

	const wsReverse = view.querySelector(".ws #wsReverseStatus");
	const wsReverseApi = view.querySelector(".ws #wsReverseApiStatus");
	const wsReverseEvent = view.querySelector(".ws #wsReverseEventStatus");

	const wsPort = view.querySelector(".ws #wsPort");
	const httpPort = view.querySelector(".http .HTTPPort");
	const httpReport = view.querySelector(".http .HTTPReport");

	const wsReverseUrl = view.querySelector(".ws #wsReverseUrl");
	const wsReverseApiUrl = view.querySelector(".ws #wsReverseApiUrl");
	const wsReverseEventUrl = view.querySelector(".ws #wsReverseEventUrl");

	OneBotApi.invoke(IPCAction.ACTION_GET_FRIENDS).then(friends => {
		view.querySelector('.data #friendList').innerHTML = `共计: ${friends.length} 个好友`;
	});

	OneBotApi.invoke(IPCAction.ACTION_GET_GROUPS).then(groups => {
		view.querySelector('.data #groupList').innerHTML = `共计: ${groups.length} 个群聊`;
	});

	function updateServerStatus(){
		OneBotApi.invoke(IPCAction.ACTION_SERVER_STATUS).then(data => {
			updateStatus(httpStatus, data.http);
			updateStatus(wsStatus, data.ws);

			updateStatus(wsReverse, data.wsReverse.wss);
			updateStatus(wsReverseApi, data.wsReverse.api);
			updateStatus(wsReverseEvent, data.wsReverse.event);
		});
	}

	updateServerStatus();

	function restartServerBtn(selector, label, action, data){
		view.querySelector(selector).addEventListener("click", () => {
			label.innerHTML = "正在重启";
			OneBotApi.send(action, data);
			setTimeout(updateServerStatus, 1000);
		});
	}

	wsPort.value = configData.ws.port;
	httpPort.value = configData.http.port;

	httpReport.value = configData.http.host;

	wsReverseUrl.value = configData.wsReverse.url;
	wsReverseApiUrl.value = configData.wsReverse.apiUrl;
	wsReverseEventUrl.value = configData.wsReverse.eventUrl;

	// 启用HTTP API
	bindToggle(view, ".http #enableHttpServer", configData.http.enableServer, (enable) => {
		configData.http.enableServer = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		setTimeout(updateServerStatus, 1000);
	});

	// 重启HTTP API 按钮
	restartServerBtn('.http #restartHTTPServer', httpStatus, IPCAction.ACTION_RESTART_HTTP_SERVER, configData.http.port);

	// 重启Ws服务端按钮
	restartServerBtn('.ws #restartWsServer', wsStatus, IPCAction.ACTION_RESTART_WS_SERVER, configData.ws.port);

	// 启用HTTP上报
	bindToggle(view, ".http #enableHTTPReport", configData.http.enable || configData.http.enableReport, (enable) => {
		configData.http.enableReport = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	// 应用HTTP端口设置
	bindButton(view, ".http #updateHTTPPort", () => {
		configData.http.port = parseInt(httpPort.value);
		httpStatus.innerHTML = "正在重启";
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		OneBotApi.send(IPCAction.ACTION_RESTART_HTTP_SERVER, configData.port);
		setTimeout(updateServerStatus, 1000);
	});

	// 应用HTTP上报URL设置
	bindButton(view, ".http #updateHTTPReport", () => {
		configData.http.host = httpReport.value;
		OneBotApi.send('one_bot_api_set_config', configData);
		alert("设置成功");
	});

	// 启用正向Ws
	bindToggle(view, ".ws #enableWs", configData.ws.enable, (enable) => {
		configData.ws.enable = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(enable){
			wsStatus.innerHTML = "正在启动";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_SERVER, configData.ws.port);
		}else{
			wsStatus.innerHTML = "正在关闭";
			OneBotApi.send(IPCAction.ACTION_STOP_WS_SERVER);
		}
		setTimeout(updateServerStatus, 1000);
	});

	// 应用ws端口设置
	bindButton(view, ".ws #applyWsPort", () => {
		configData.ws.port = parseInt(wsPort.value);
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(configData.ws.enable){
			wsStatus.innerHTML = "正在重启";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_SERVER, configData.ws.port);
			setTimeout(updateServerStatus, 1000);
		}
	});

	// 启用反向Ws
	bindToggle(view, ".ws #enableWsReverse", configData.wsReverse.enable, (enable) => {
		configData.wsReverse.enable = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(enable){
			wsReverse.innerHTML = "正在重启";
			wsReverseApi.innerHTML = "正在重启";
			wsReverseEvent.innerHTML = "正在重启";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_REVERSE_SERVER, configData.wsReverse);
		}else{
			wsReverse.innerHTML = "正在关闭";
			wsReverseApi.innerHTML = "正在关闭";
			wsReverseEvent.innerHTML = "正在关闭";
			OneBotApi.send(IPCAction.ACTION_STOP_WS_REVERSE_SERVER);
		}
		setTimeout(updateServerStatus, 3000);
	});

	// 应用ws url
	bindButton(view, ".ws #applyWsReverseUrl", () => {
		configData.wsReverse.url = wsReverseUrl.value;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(configData.wsReverse.enable){
			wsReverse.innerHTML = "正在重启";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_REVERSE_SERVER, configData.wsReverse);
			setTimeout(updateServerStatus, 3000);
		}
	});

	// 应用ws api url
	bindButton(view, ".ws #applyWsReverseApiUrl", () => {
		configData.wsReverse.apiUrl = wsReverseApiUrl.value;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(configData.wsReverse.enable){
			wsReverseApi.innerHTML = "正在重启";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_REVERSE_SERVER, configData.wsReverse);
			setTimeout(updateServerStatus, 3000);
		}
	});

	// 应用ws event url
	bindButton(view, ".ws #applyWsReverseEventUrl", () => {
		configData.wsReverse.eventUrl = wsReverseEventUrl.value;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
		if(configData.wsReverse.enable){
			wsReverseEvent.innerHTML = "正在重启";
			OneBotApi.send(IPCAction.ACTION_RESTART_WS_REVERSE_SERVER, configData.wsReverse);
			setTimeout(updateServerStatus, 1000);
		}
	});

	bindButton(view, ".data #updateFriendList", () => {
		OneBotApi.invoke(IPCAction.ACTION_GET_FRIENDS).then(friends => {
			view.querySelector('.data #friendList').innerHTML = `共计: ${friends.length} 个好友`;
		});
	});

	bindButton(view, ".data #updateGroupList", () => {
		OneBotApi.invoke(IPCAction.ACTION_GET_GROUPS).then(groups => {
			view.querySelector('.data #groupList').innerHTML = `共计: ${groups.length} 个群聊`;
		});
	});

	// 上报自身消息
	bindToggle(view, ".setting #reportSelfMsg", configData.setting.reportSelfMsg, (enable) => {
		configData.setting.reportSelfMsg = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	// 上报启动前的消息
	bindToggle(view, ".setting #reportOldMsg", configData.setting.reportOldMsg, (enable) => {
		configData.setting.reportOldMsg = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	// 自动接受好友请求
	bindToggle(view, ".setting #autoAcceptFriendRequest", configData.setting.autoAcceptFriendRequest, (enable) => {
		configData.setting.autoAcceptFriendRequest = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bindToggle(view, ".misc #disableUpdate", configData.misc.disableUpdate, (enable) => {
		configData.misc.disableUpdate = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bindToggle(view, ".debug #debugMode", configData.debug.debug, (enable) => {
		configData.debug.debug = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bindToggle(view, ".debug #debugIPC", configData.debug.ipc, (enable) => {
		configData.debug.ipc = enable;
		OneBotApi.send(IPCAction.ACTION_SET_CONFIG, configData);
	});

	bindButton(view, ".debug #get_group_msg_mask", () => {
		OneBotApi.invoke(IPCAction.ACTION_HTTP_TEST, 'get_group_msg_mask').then(result => {
			view.querySelector('.debug #apiTestResult').innerHTML = JSON.stringify(result, null, 2);
		});
	});
}


function bindButton(view, selector, callback){
	view.querySelector(selector).addEventListener("click", callback);
}

function bindToggle(view, selector, value, callback){
	const toggle = view.querySelector(selector);
	toggle.toggleAttribute("is-active", value);
	toggle.addEventListener("click", () => {
		callback(toggle.toggleAttribute("is-active"));
	});
}

function updateStatus(view, data){
	if(data.status) view.innerHTML = '<font color="green">运行中</font>';
	else if(data.msg) {
		view.title = data.msg;
		view.innerHTML = `<font color="red">${data.msg}</font>`;
	}else view.innerHTML = '<font color="gray">未运行</font>';
}


const url = location.href;
if(url.includes("/index.html") && url.includes("#/main/message")){
	OneBotApi.send('one_bot_api_load_main_page');
}else{
	navigation.addEventListener("navigatesuccess", function func(event){
		const url = event.target.currentEntry.url;
		// 检测是否为主界面
		if(url.includes("/index.html") && url.includes("#/main/message")){
			navigation.removeEventListener("navigatesuccess", func);
			OneBotApi.send('one_bot_api_load_main_page')
		}
	});
}

export {
	onConfigView,
	onSettingWindowCreated
}