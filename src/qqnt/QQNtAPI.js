const crypto = require("crypto");
const { ipcMain } = require("electron");
const {Log} = require("../logger");

class QQNtAPI {

    ntCallCallback = {};

    sendMessageCallback = {};

    ntCallAsyncCallback = {};

    ntCall(eventName, cmdName, args, webContentsId = '2') {
        return new Promise((resolve, reject) => {
            const uuid = crypto.randomUUID();
            this.ntCallCallback[uuid] = resolve;
            setTimeout(() => {
                if(this.ntCallCallback[uuid]){
                    delete this.ntCallCallback[uuid];
                    Log.e(`call QQNtAPI timeout: eventName=${eventName}, cmdName=${cmdName}`);
                    reject('timeout');
                }
            }, 5000)
            ipcMain.emit(
                `IPC_UP_${webContentsId}`,
                {}, // IpcMainEvent
                {type: 'request', callbackId: uuid, eventName: `${eventName}-${webContentsId}`},
                [cmdName, ...args],
            );
        })
    }

    /**
     * 具有异步返还结果的ntCall
     * @param eventName
     * @param cmdName
     * @param args {Array}
     * @param {string} callBackCmdName 回调的CmdName
     * @param {(Object) => Boolean} isMyResult 判断收到的消息是否为需要的消息
     * @param {boolean} registerAfterCall 是否在调用之前注册回调
     * @param {(Object) => Object} afterCallback 在Promise回调之前执行的操作(此时已经拿到了请求结果)
     * @param {string} webContentsId
     * @return {Promise<unknown>}
     */
    ntCallAsync(eventName, cmdName, args= [], callBackCmdName,
        isMyResult = () => { return true },
        registerAfterCall = false,
        webContentsId = '2',
        afterCallback = (obj) => { return obj },
    ){
        return new Promise((resolve, reject) => {
            const uuid = crypto.randomUUID();

            function IsMyResult(cmdObject){
                if(isMyResult(cmdObject)){
                    resolve(afterCallback(cmdObject));
                    return true;
                }else{
                    return false;
                }
            }

            if(!this.ntCallAsyncCallback[callBackCmdName]) this.ntCallAsyncCallback[callBackCmdName] = { };

            if(!registerAfterCall) this.ntCallAsyncCallback[callBackCmdName][uuid] = IsMyResult;

            this.ntCallCallback[uuid] = (cmdObject) => {
                if(!cmdObject || cmdObject.result == 0){
                    if(registerAfterCall) this.ntCallAsyncCallback[callBackCmdName][uuid] = IsMyResult;
                }else{
                    Log.e(`call QQNtAPI failed: eventName=${eventName}, cmdName=${cmdName}`);
                    reject('failed');
                }
            };

            setTimeout(() => {
                if(this.ntCallCallback[uuid] || this.ntCallAsyncCallback[callBackCmdName][uuid]){
                    if(this.ntCallCallback[uuid]) delete this.ntCallCallback[uuid];
                    if(this.ntCallAsyncCallback[callBackCmdName][uuid]) delete this.ntCallAsyncCallback[callBackCmdName][uuid];
                    Log.e(`call QQNtAPI timeout: eventName=${eventName}, cmdName=${cmdName}`);
                    reject('timeout');
                }
            }, 5000);

            ipcMain.emit(
                `IPC_UP_${webContentsId}`,
                {}, // IpcMainEvent
                {type: 'request', callbackId: uuid, eventName: eventName + "-" + webContentsId},
                [cmdName, ...args],
            );
        })
    }

    ntCallBack(args, cmdObject){
        if(args[0]?.callbackId){
            const id = args[0].callbackId;
            if(id in this.ntCallCallback){
                this.ntCallCallback[id](args[1]);
                delete this.ntCallCallback[id];
                return true;
            }
        }
        const cmdName = cmdObject?.cmdName;
        if(cmdName){
            if(cmdName in this.ntCallAsyncCallback){
                for(let uuid in this.ntCallAsyncCallback[cmdName]){
                    if(this.ntCallAsyncCallback[cmdName][uuid](cmdObject)){
                        delete this.ntCallAsyncCallback[cmdName][uuid];
                        return true;
                    }
                }
            }
        }
        return false
    }

    /**
     * 从网络拉取最新的用户信息
     */
    getUserInfoByUid(uid) {
        return this.ntCallAsync(
            "ns-ntApi", "nodeIKernelProfileService/getUserDetailInfo",
            [{"uid": uid.toString()}, undefined],
            "nodeIKernelProfileListener/onProfileDetailInfoChanged",
            (cmdObject) => {
                let info = cmdObject.payload?.info
                if(!info) return false
                return info?.uid == uid && info?.uin != "0"
            },
            false,
            "2",
            (obj) => { return obj.payload.info }
        )
    }

    /**
     * 获取缓存的频道列表
     */
    async getGuildList(){
        let guilds = {};
        let data = await this.ntCall("ns-ntApi", "nodeIKernelGuildService/getGuildAndChannelListFromCache", []);
        if(data?.guildList){
            for(let guild of data.guildList){
                let guildId = guild.guildId || guild.guild_id
                guilds[guildId] = {
                    guild_id: guildId,
                    guild_name: guild.name || guild.guild_info.guild_name,
                    guild_display_id: guild.showNumber || guild.guild_info.guild_code,
                    guild_profile: guild.profile || guild.guild_info.profile,
                    create_time: guild.createTime || 0,
                    max_member_count: guild.userMaxNum || 0,
                    max_robot_count: guild.robotMaxNum || 0,
                    max_admin_count: guild.adminMaxNum || 0,
                    member_count: guild.userNum || 0,
                    owner_id: ""
                }
            }
        }
        if(data?.guildInitList){
            for(let guild of data.guildInitList){
                let channelList = [];
                for(let category of guild.categoryList){
                    channelList = channelList.concat(category.channelList)
                }
                guilds[guild.guildId].channel_list = channelList;
            }
        }
        return guilds;
    }

    /**
     * 发送消息
     * @param peer
     * @param messages
     * @return {Promise<QQNTMessage>}
     */
    sendMessage(peer, messages) {
        return new Promise((resolve) => {
            this.sendMessageCallback[peer.peerUid] = (qqNtMsg) => {
                resolve(qqNtMsg)
            };
            this.ntCall("ns-ntApi", "nodeIKernelMsgService/sendMsg", [{
                msgId: "0",
                peer: peer,
                msgElements: messages,
                msgAttributeInfos: new Map()
            }, null]).then();
        });
    }

    /**
     * 获取群成员列表，有可能为空
     * @param groupId {string} 群号
     * @param num {number} 成员数量
     * @return {Promise<Map<string, GroupMember>>}
     */
    async getGroupMembers(groupId, num) {
        let sceneId = await this.ntCall("ns-ntApi", "nodeIKernelGroupService/createMemberListScene",
            [{groupCode: groupId, scene: "groupMemberList_MainWindow"}]
        )
        let res = await this.ntCall("ns-ntApi", "nodeIKernelGroupService/getNextMemberList",
            [{sceneId: sceneId, num: num}, null]
        );

        return res.result.infos;
    }

    /**
     * 获取合并转发的消息
     */
    async getMultiMessages(peer, rootId, msgId) {
        let js = await this.ntCall("ns-ntApi", "nodeIKernelMsgService/getMultiMsg", [{
            peer: peer,
            rootMsgId: rootId,
            parentMsgId: msgId ? msgId : rootId
        }, null])
        return js.msgList;
    }
}

QQNtAPI = new QQNtAPI()

module.exports = {
    QQNtAPI
}