const crypto = require("crypto");
const { ipcMain } = require("electron");
const {Log} = require("../logger");

class QQNtAPI {

    webContentsId = '2';

    ntCallCallback = {};

    getUserInfoCallback = {};

    sendMessageCallback = {};

    ntCall(eventName, cmdName, args) {
        return new Promise((resolve) => {
            const uuid = crypto.randomUUID();
            this.ntCallCallback[uuid] = resolve;
            ipcMain.emit(
                `IPC_UP_${this.webContentsId}`,
                {}, // IpcMainEvent
                {type: 'request', callbackId: uuid, eventName: eventName + "-" + this.webContentsId},
                [cmdName, ...args],
            );
        })
    }

    /**
     * 从网络拉取最新的用户信息
     */
    getUserInfoByUid(uid) {
        return new Promise((resolve) => {
            this.getUserInfoCallback[uid.toString()] = resolve;
            this.ntCall("ns-ntApi", "nodeIKernelProfileService/getUserDetailInfo",
                [{"uid": uid.toString()}, undefined]
            ).then();
        });
    }

    /**
     * 获取缓存的频道列表
     */
    async getGuildList(){
        let guilds = {};
        let data = await this.ntCall("ns-ntApi", "nodeIKernelGuildService/getGuildAndChannelListFromCache", []);
        if(data?.guildList){
            for(let guild of data.guildList){
                guilds[guild.guildId] = {
                    guild_id: guild.guildId,
                    guild_name: guild.name,
                    guild_display_id: guild.showNumber,
                    guild_profile: guild.profile,
                    create_time: guild.createTime,
                    max_member_count: guild.userMaxNum,
                    max_robot_count: guild.robotMaxNum,
                    max_admin_count: guild.adminMaxNum,
                    member_count: guild.userNum,
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