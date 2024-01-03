const { ipcMain, BrowserWindow } = require("electron");

const { IPCAction } = require('../common/const');
const { Data, Setting, RuntimeData } = require('./core');

const utils = require('../utils');
const httpServer = require('../model/httpServer');
const messageModel = require('../model/messageModel');


function onLoad(plugin, liteloader) {
    
    Setting.setting = utils.loadSetting(plugin);
    
    // 获取IPC Action
    ipcMain.on('one_bot_api_get_actions', (event) => {
        event.returnValue = IPCAction;
    });

    // 获取设置
    ipcMain.handle(IPCAction.ACTION_GET_CONFIG, (event) => Setting.setting);

    // 获取HTTP服务器状态
    ipcMain.handle(IPCAction.ACTION_HTTP_SERVER_STATUS, (event) => httpServer.getServer() && true);

    // 主页面是否已加载
    ipcMain.handle(IPCAction.ACTION_IS_LOADED, (event, arg) => RuntimeData.isLoaded());

    ipcMain.on(IPCAction.ACTION_LOG, (event, args) => {
        console.log("\x1b[32m[OneBotAPI-Render]\x1b[0m", ...args);
    });

    ipcMain.on(IPCAction.ACTION_LOAD_MAIN_PAGE, (event, arg) => {
        if(RuntimeData.isLoaded()){
            log('main page is loaded');
            return;
        }
        BrowserWindow.getAllWindows().some((window) => {
            const webContents = window.webContents;
            if(webContents.getURL().includes('#/main/message')){
                RuntimeData.mainPage = webContents;
                httpServer.startHttpServer(Setting.setting.port);
                return true;
            }else{
                return false;
            }
        });
    });

    ipcMain.on(IPCAction.ACTION_SET_CONFIG, (event, setting) => {
        Setting.setting = setting;
        utils.saveSetting(setting);
    });

    ipcMain.on(IPCAction.ACTION_UPDATE_SELF_INFO, (event, selfInfo) => Data.selfInfo = selfInfo);
    ipcMain.on(IPCAction.ACTION_UPDATE_GROUPS, (event, groups) => Data.groups = groups);

    ipcMain.on('one_bot_api_restart_http_server', (event, port) => httpServer.startHttpServer(port, true));
}


function onBrowserWindowCreated(window, plugin){
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
    if(RuntimeData.isDebugMode){
        if(name === '___!log') return;
        let eventName = args?.[0]?.[0]?.eventName;
        if(eventName === "ns-LoggerApi-2" || eventName === 'ns-LoggerApi-5') return;
        log(`->: _ = ${JSON.stringify(_)}, status = ${status}, name = ${name}, args = ${JSON.stringify(args, null, 2)}`)
    }
}

/**
 * 监听向渲染进程发送的消息
 */
function patchedSend(channel, ...args){

    if(RuntimeData.isDebugMode){
        if(args?.[1]?.[0]?.cmdName !== "nodeIKernelBuddyListener/onBuddyListChange"){
            log(`<-: ${JSON.stringify(args, null, 2)}`);
        }
    }

    const cmdName = args?.[1]?.[0]?.cmdName;
    if(cmdName){
        switch(cmdName){

            // 监听新消息
            case "nodeIKernelMsgListener/onRecvMsg":

                const messages = args[1][0].payload?.msgList;
                if(messages) messageModel.handleNewMessage(messages);
                break;

            // 更新好友信息
            case "nodeIKernelBuddyListener/onBuddyListChange":
                const data = args[1][0]?.payload?.data;
                if(!data) break;

                const friends = {};
                const userMap = {};

                data.forEach((category) => {
                    const buddyList = category?.buddyList;
                    if(buddyList) buddyList.forEach((friend) => {
                        friends[friend.uin] = friend;
                        userMap[friend.uid] = friend.uin;
                    })
                });

                const friendsCount = Object.keys(friends).length;
                if(friendsCount === 0) break;
                
                Data.friends = friends;
                Data.userMap = userMap;

                log(`load ${friendsCount} friends`);

                break;

            // 更新群信息
            case "nodeIKernelGroupListener/onGroupListUpdate":
                const groupList = args[1][0]?.payload?.groupList;
                if(!groupList) break;
                
                const groups = {};

                groupList.forEach((group) => groups[group.groupCode] = group);

                const groupsCount = Object.keys(groups).length;
                if(groupsCount === 0) break;

                Data.groups = groups;

                log(`load ${groupsCount} groups`);

                break;

            // 更新好友请求列表
            case "nodeIKernelBuddyListener/onBuddyReqChange":
                args[1][0]?.payload?.data?.buddyReqs
                    ?.filter(user => user.isUnread && !user.isDecide)
                    .forEach(user => {
                        RuntimeData.getUserInfoByUid(user.friendUid).then(info => {
                            messageModel.postRequestData({
                                request_type: 'friend',
                                user_id: info.uin,
                                comment: user.extWords,
                                flag: user.friendUid
                            })
                        })
                    });
                return;

            // 媒体文件下载完成
            case "nodeIKernelMsgListener/onRichMediaDownloadComplete":
                messageModel.postNoticeData({
                    notice_type: "download_finish",
                    file: {
                        msgId: args[1][0].payload.notifyInfo.msgId,
                        filePath: args[1][0].payload.notifyInfo.filePath,
                        totalSize: args[1][0].payload.notifyInfo.totalSize,
                    }
                })
                break;

            // 获取用户信息完成
            case "nodeIKernelProfileListener/onProfileDetailInfoChanged":
                const uid = args[1][0].payload?.info?.uid;
                if(uid && uid in RuntimeData.getUserInfoCallback){
                    RuntimeData.getUserInfoCallback[uid](args[1][0].payload.info);
                    delete RuntimeData.getUserInfoCallback[uid];
                }
                return;

            // 禁用更新
            case "nodeIKernelUnitedConfigListener/onUnitedConfigUpdate":
                args[1][0].payload.configData.content = "";
                args[1][0].payload.configData.isSwitchOn = false;
                break;

            default:
                break;
        }
    }

    if(args[0]?.callbackId){
        const id = args[0].callbackId;
        if(id in RuntimeData.ntCallCallback){
            RuntimeData.ntCallCallback[id](args[1]);
            delete RuntimeData.ntCallCallback[id];
        }
    }
}


function log(...args) {
    console.log("\x1b[32m[OneBotAPI]\x1b[0m", ...args);
}


module.exports = {
    onLoad,
    onBrowserWindowCreated
}