const { ipcMain, BrowserWindow } = require("electron");

const { IPCAction, defaultSetting} = require('../common/const');
const { Data, Setting, Runtime } = require('./core');

const { Log } = require('../logger');
const utils = require('../utils');

const wsServer = require('../model/wsServer');
const wsReverse = require('../model/wsReverseServer');
const httpServer = require('../model/httpServer');
const httpReporter = require("../model/httpReporter");

const IPCHandle = require('../model/ipcHandle');

function onLoad(plugin) {

    const setting = utils.loadSetting(plugin);
    if(setting){
        Setting.setting = utils.checkAndCompleteKeys(setting, defaultSetting);
    }else{
        utils.saveSetting(defaultSetting);
    }

    Log.setDebug(Setting.setting.debug.debug, Setting.setting.debug.ipc, plugin.path.data);

    ipcMain.on('one_bot_api_get_runtime_data', (event) => {
        event.returnValue = {
            'IPCAction': IPCAction,
            'Setting': Setting.setting,
            'isDebug': Log.isDebug
        };
    });

    // 获取设置
    ipcMain.handle(IPCAction.ACTION_GET_CONFIG, (event) => Setting.setting);

    // 获取服务状态
    ipcMain.handle(IPCAction.ACTION_SERVER_STATUS, (event) => {
        return {
            http: httpServer.getStatus(),
            ws: wsServer.getStatus(),
            wsReverse: wsReverse.getStatus()
        }
    });


    ipcMain.handle(IPCAction.ACTION_GET_GROUPS, () => {
        return Object.values(Data.groups);
    });

    ipcMain.on(IPCAction.ACTION_LOG, (event, args) => {
        console.log("\x1b[32m[OneBotAPI-Render]\x1b[0m", ...args);
    });

    ipcMain.on(IPCAction.ACTION_LOAD_MAIN_PAGE, (event, arg) => {
        if(Runtime.isLoaded()){
            Log.w('主页面已加载');
            return false;
        }

        const window = BrowserWindow.getAllWindows().find((window) => window.webContents.getURL().includes('#/main/message'));
        if(window){
            Runtime.init(ipcMain, window.webContents);
            httpServer.startHttpServer(Setting.setting.http.port);
            httpReporter.startHttpReport()
            if(Setting.setting.ws.enable) wsServer.startWsServer(Setting.setting.ws.port)
            if(Setting.setting.wsReverse.enable) wsReverse.startWsClient(Setting.setting.wsReverse)
            return true;
        }

        Log.e('无法加载Bot框架');
        return false;
    });

    ipcMain.on(IPCAction.ACTION_SET_CONFIG, (event, setting) => {
        Setting.setting = setting;
        Log.setDebug(setting.debug.debug, setting.debug.ipc);
        utils.saveSetting(setting);
    });

    ipcMain.on(IPCAction.ACTION_RESTART_HTTP_SERVER, (event, port) => httpServer.restartHttpServer(port).then());

    ipcMain.on(IPCAction.ACTION_RESTART_WS_SERVER, (event, port) => wsServer.restartWsServer(port).then());
    ipcMain.on(IPCAction.ACTION_STOP_WS_SERVER, (event) => wsServer.stopWsServer().then());

    ipcMain.on(IPCAction.ACTION_RESTART_WS_REVERSE_SERVER, (event, params) => wsReverse.restartWsClient(params));
    ipcMain.on(IPCAction.ACTION_STOP_WS_REVERSE_SERVER, (event) => wsReverse.stopWsClient());
}


function onBrowserWindowCreated(window){
    const original_send = (window.webContents.__qqntim_original_object && window.webContents.__qqntim_original_object.send) || window.webContents.send;
    const patched_send = function(channel, ...args){
        if(!patchedSend(channel, ...args)){
            // 调用原始的send方法
            return original_send.call(window.webContents, channel, ...args);
        }
    };

    if(window.webContents.__qqntim_original_object){
        window.webContents.__qqntim_original_object.send = patched_send;
    }else{
        window.webContents.send = patched_send;
    }

    const original_ipc_message = window.webContents._events["-ipc-message"]?.[0] || window.webContents._events["-ipc-message"];
    const proxyEvents = new Proxy(original_ipc_message, {
        apply(target, thisArg, argumentsList){
            patchedIPC(...argumentsList)
            return target.apply(thisArg, argumentsList);
        }
    });

    if(window.webContents._events["-ipc-message"][0]){
        window.webContents._events["-ipc-message"][0] = proxyEvents
    }else{
        window.webContents._events["-ipc-message"] = proxyEvents
    }
}


/**
 * 监听渲染进程向主进程发送的消息
 */
function patchedIPC(_, status, name, ...args) {
    if(Log.isDebugIPC) Log.ipcDebugger.IPCSend(_, status, name, ...args);
}

/**
 * 解析向渲染进程发送的消息
 */
function patchedSend(channel, ...args){
    if(Log.isDebugIPC) Log.ipcDebugger.IPCReceive(channel, ...args);

    const cmdObject = args?.[1]?.[0];
    if(cmdObject?.cmdName){
        IPCHandle.onMessageHandle(cmdObject);
    }

    if(args[0]?.callbackId){
        const id = args[0].callbackId;
        if(id in Runtime.ntCallCallback){
            Runtime.ntCallCallback[id](args[1]);
            delete Runtime.ntCallCallback[id];
            return true;
        }
    }
    return false;
}

if(LiteLoader?.plugins?.['OneBotApi-JS']){
    onLoad(LiteLoader.plugins['OneBotApi-JS']);
}

module.exports = {
    onLoad,
    onBrowserWindowCreated
}