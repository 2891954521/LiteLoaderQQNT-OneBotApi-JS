const { ipcMain, BrowserWindow } = require("electron");

const { IPCAction, defaultSetting} = require('../common/const');
const { Data, Setting, RuntimeData } = require('./core');

const { Log } = require('../logger');
const utils = require('../utils');
const httpServer = require('../model/httpServer');
const ActionHandle = require('../model/actionHandle');


const debugIPC = {};


function onLoad(plugin) {

    const setting = utils.loadSetting(plugin);
    if(setting){
        Setting.setting = utils.checkAndCompleteKeys(setting, defaultSetting);
    }else{
        utils.saveSetting(defaultSetting);
    }

    Log.setDebug(Setting.setting.debug.debug, plugin.path.data);
    Log.isDebugIPC = Setting.setting.debug.ipc;

    ipcMain.on('one_bot_api_get_runtime_data', (event) => {
        event.returnValue = {
            'IPCAction': IPCAction,
            'Setting': Setting.setting,
            'isDebug': Log.isDebug
        };
    });

    // 获取设置
    ipcMain.handle(IPCAction.ACTION_GET_CONFIG, (event) => Setting.setting);

    // 获取HTTP服务器状态
    ipcMain.handle(IPCAction.ACTION_HTTP_SERVER_STATUS, (event) => httpServer.getErrorMessage());

    // 主页面是否已加载
    ipcMain.handle(IPCAction.ACTION_IS_LOADED, (event, arg) => RuntimeData.isLoaded());

    ipcMain.handle(IPCAction.ACTION_GET_GROUPS, () => {
        return Object.values(Data.groups);
    });

    ipcMain.on(IPCAction.ACTION_LOG, (event, args) => {
        console.log("\x1b[32m[OneBotAPI-Render]\x1b[0m", ...args);
    });

    ipcMain.on(IPCAction.ACTION_LOAD_MAIN_PAGE, (event, arg) => {
        if(RuntimeData.isLoaded()){
            Log.w('主页面已加载');
            return;
        }

        BrowserWindow.getAllWindows().some((window) => {
            const webContents = window.webContents;
            if(webContents.getURL().includes('#/main/message')){
                Log.d("正在加载Bot框架");

                RuntimeData.mainPage = webContents;
                httpServer.startHttpServer(Setting.setting.http.port);

                RuntimeData.ntCall("ns-GlobalDataApi", "fetchAuthData", []).then(info => {
                    Log.d(`当前账号信息: uid: ${info.uid}, uin: ${info.uin}`);
                    Data.selfInfo = info;
                });

                return true;
            }else{
                return false;
            }
        });
    });

    ipcMain.on(IPCAction.ACTION_SET_CONFIG, (event, setting) => {
        Setting.setting = setting;
        Log.setDebug(setting.debug.debug);
        Log.isDebugIPC = setting.debug.ipc;
        Log.i(`debug is: ${setting.debug.debug}, debug pic is: ${setting.debug.ipc}`);
        utils.saveSetting(setting);
    });

    ipcMain.on('one_bot_api_restart_http_server', (event, port) => httpServer.startHttpServer(port, true));
}


function onBrowserWindowCreated(window){
    const original_send = (window.webContents.__qqntim_original_object && window.webContents.__qqntim_original_object.send) || window.webContents.send;
    const patched_send = function(channel, ...args){
        patchedSend(channel, ...args);
        return original_send.call(window.webContents, channel, ...args);
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
    if(Log.isDebugIPC){
        if(name === '___!log') return;
        let eventName = args?.[0]?.[0]?.eventName;
        if(eventName?.startsWith("ns-LoggerApi")) return;
        let callbackId = args?.[0]?.[0]?.callbackId;
        if(callbackId){
            let str = JSON.stringify(args?.[0]?.[1]);
            // if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
            debugIPC[callbackId] = str;
        }else{
            Log.d(`[IPC Call] -> ${JSON.stringify(args)}`);
        }
    }
}

/**
 * 解析向渲染进程发送的消息
 */
function patchedSend(channel, ...args){

    if(Log.isDebugIPC){
        let skip = false;
        if(args?.[0]?.eventName?.startsWith("ns-LoggerApi")) skip = true;

        let cmdName = args?.[1]?.[0]?.cmdName;
        if(cmdName){
            if(cmdName.includes("onBuddyListChange")) skip = true;
            else if(cmdName == "nodeIKernelMsgListener/onMsgInfoListUpdate") skip = true;
            else if(cmdName == "nodeIKernelMsgListener/onAddSendMsg") skip = true;
            else if(cmdName == "nodeIKernelRecentContactListener/onRecentContactListChangedVer2") skip = true;
        }

        if(!skip){
            let callbackId = args?.[0]?.callbackId;
            if(callbackId){
                if(args?.[1]){
                    let str = JSON.stringify(args?.[1]);
                    // if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
                    Log.d(`\x1b[36m[IPC Func]\x1b[0m ${debugIPC[callbackId]} \x1b[36m=>\x1b[0m ${str}`);
                }
                delete debugIPC[callbackId];
            }else{
                let str = JSON.stringify(args);
                // if(str.length > 100) str = str.slice(0, 45) + ' ... ' + str.slice(str.length - 45);
                Log.d(`[IPC Resp] <- ${str}`);
            }
        }

    }

    const cmdObject = args?.[1]?.[0];
    if(cmdObject?.cmdName){
        ActionHandle.onMessageHandle(cmdObject);
    }

    if(args[0]?.callbackId){
        const id = args[0].callbackId;
        if(id in RuntimeData.ntCallCallback){
            RuntimeData.ntCallCallback[id](args[1]);
            delete RuntimeData.ntCallCallback[id];
        }
    }
}

if(LiteLoader?.plugins?.['OneBotApi-JS']){
    onLoad(LiteLoader.plugins['OneBotApi-JS']);
}

module.exports = {
    onLoad,
    onBrowserWindowCreated
}