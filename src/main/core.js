/**
 * 模块核心
 */

const { Log } = require("../logger");
const { defaultSetting } = require("../common/const");

const utils = require("../utils");
const {LimitedHashMap} = require("../utils");
const { QQNtAPI } = require('../qqnt/QQNtAPI');

/**
 * 数据
 */
class Data{

    /**
     * 自身信息
     */
    static selfInfo = {
        account: "",
        uin: "",
        uid: "",
    };

    static guildInfo = {
        nickname: "",
        tiny_id: "",
        avatar_url: ""
    }

    /**
     * uid -> QQ号
     * @type {Object.<string, string>}
     */
    static userMap = {};


    /**
     * QQ号 -> 用户
     * @type {Object.<string, User>}
     */
    static friends = {};


    static userInfo = new LimitedHashMap(100);

    /**
     * 群号 -> 群聊信息
     * @type {Object.<string, Group>}
     */
    static groups = {};

    /**
     * 频道
     */
    static guilds = {};


    /**
     * 群成员的信息
     * 群号 -> { 群成员列表 -> 群成员信息 }
     * @type {Object.<string, Object.<string, GroupMember>>}
     */
    static groupMembers = {};

    /**
     * @typedef {Object} QQNTMessage
     * @property {string} msgId - 消息ID
     * @property {string} msgSeq - 消息序列号
     * @property {string} msgTime - 消息时间戳
     *
     * @property {number} chatType - 聊天类型
     *
     * @property {string} peerUid - 接收者UID
     * @property {string} senderUid - 发送者UID
     *
     * @property {Object} elements - 消息内容
     *
     * @property {number} msgType - 消息类型
     * @property {number} subMsgType - 子消息类型
     * @property {number} sendType - 发送类型
     *
     * @property {string} msgRandom - 消息随机数
     * @property {string} cntSeq - 计数序列号
     *
     * @property {string} fromUid - 来源UID
     * @property {string} fromAppid - 来源应用ID
     *
     * @property {string} msgMeta - 消息元数据
     * @property {string} sendRemarkName - 发送者备注名
     * @property {string} sendMemberName - 发送者成员名
     * @property {string} sendNickName - 发送者昵称
     *
     * @property {string} channelName - 频道名
     * @property {string} channelId - 频道ID
     *
     * @property {string} guildId - 公会/群组ID
     * @property {string} guildCode - 公会/群组代码
     * @property {string} guildName - 公会/群组名
     */

    static historyMessage = new LimitedHashMap(1000);

    static pushHistoryMessage(/** @type QQNTMessage */ qqNtMsg, oneBotMsg){
        this.historyMessage.put(qqNtMsg.msgId, {
            chatType: qqNtMsg.chatType,
            peerUid: qqNtMsg.peerUid,
            senderUid: qqNtMsg.senderUid,
            msgSeq: qqNtMsg.msgSeq,
            oneBotMsg: oneBotMsg
        });
    }

    /**
     * 根据QQ号获取用户信息
     * @param {string} qq 
     * @returns {User | null}
     */
    static getInfoByQQ(qq){
        let user = this.friends[qq?.toString()];
        if(user){
            return user;
        }else{
            Log.e(`User with QQ ${qq} not found.`);
            return null;
        }
    }

    /**
     * 根据uid获取用户信息
     * @param {string} uid
     * @returns {User | null}
     */
    static getInfoByUid(uid){
        let qq = this.userMap[uid?.toString()];
        if(qq){
            return this.getInfoByQQ(qq);
        }else{
            Log.e(`User with uid ${uid} not found.`);
            return null;
        }
    }

    /**
     * 根据群号获取群信息
     * @param {string} groupId
     * @return {Group | null}
     */
    static getGroupById(groupId){
        let group = this.groups[groupId?.toString()];
        if(group){
            return group;
        }else{
            Log.e(`Group with uid ${groupId} not found.`);
            return null;
        }
    }


    /**
     * 根据 uid 获取群成员信息
     * @param groupId {string} 群号
     * @param uid {string} 用户uid
     * @return {Promise<GroupMember|null>}
     */
    static async getGroupMemberByUid(groupId, uid){
        let members = await this.__getGroupMembers(groupId);
        return members[uid] || (Log.w(`getGroupMemberByUid: 用户 uid(${uid}) 在 群(${groupId}) 内不存在`), null);
    }


    /**
     * 根据 QQ号 获取群成员信息
     * @param groupId 群号
     * @param qq {string}
     * @param force 是否强制更新
     * @return {Promise<GroupMember|null>}
     */
    static async getGroupMemberByQQ(groupId, qq, force = false){
        let members = await this.getGroupMemberList(groupId, force);
        let member = members.find(m => m.uin == qq);
        return member || (Log.w(`getGroupMemberByQQ: 用户 QQ(${qq}) 在 群(${groupId}) 内不存在`), null);
    }

    static async getGroupMemberInfo(groupId, qq, force = false){
        let member = await this.getGroupMemberByQQ(groupId, qq, false);
        if(!member) return null;

        let info = this.userInfo[member.uin];
        if(force || !info){
            info = await QQNtAPI.getUserInfoByUid(member.uid);
            this.userInfo[member.uin] = info;
        }
        return info;
    }


    /**
     * 获取群成员列表
     * @param groupId 群号
     * @param force 是否强制更新
     * @return {Promise<GroupMember[]>}
     */
    static async getGroupMemberList(groupId, force = false) {
        let group = this.getGroupById(groupId);
        if(!group){
            Log.w(`getGroupMemberList: 群(${groupId})不存在`);
            return [];
        }

        if(!force){
            Log.d(`从缓存获取群成员列表`);
            let members = this.groupMembers[group.groupCode];
            if(members){
                let r = Object.values(members);
                if(r.length > 0){
                    Log.d(`返还缓存群成员列表`);
                    return r;
                }
            }
        }
        Log.d(`联网刷新群成员列表 force = ${force}`);
        await this.__updateGroupMember(group.groupCode, group.memberCount)
        return Object.values(this.groupMembers[group.groupCode] || {});
    }

    /**
     * 获取群成员列表
     * @return {Promise<Object.<string, GroupMember>>}
     */
    static async __getGroupMembers(groupId){
        // 有缓存直接使用缓存
        let members = this.groupMembers[groupId];
        if(members) return members;

        // 群不存在
        let group = this.getGroupById(groupId);
        if(!group) return {};

        await this.__updateGroupMember(groupId, group.memberCount);
        return this.groupMembers[groupId] || {};
    }

    // 更新群聊成员
    static async __updateGroupMember(groupId, num = 3000, retry = true){
        Log.i(`尝试加载 群(${groupId}) 成员列表，加载${num}人`);

        let members = await QQNtAPI.getGroupMembers(groupId, num);

        if(members && members?.size > 0){
            Log.i(`加载 群(${groupId}) 成员列表，共计${members.size}人`);
            let obj = {};
            for(let [key, value] of members) obj[key] = value;
            this.groupMembers[groupId] = obj;
        }else if(retry){
            Log.d(`重新尝试加载 群(${groupId}) 成员列表`);
            await utils.wait(1000);
            await this.__updateGroupMember(groupId, num, false);
        }else{
            Log.e(`无法获取 群(${groupId}) 成员列表`)
        }
    }

}

/**
 * 系统设置
 */
class Setting{
    static setting = defaultSetting;
}

/**
 * 上报模块
 */
class Reporter{

    time = Date.now() / 1000;

    isLoaded = false;
    httpReporter = null;

    /** @type Function */
    webSocketReporter = null;

    webSocketReverseReporter = null;

    /**
     * 上报event消息
     */
    reportData(data){
        if(!this.isLoaded) return;

        if(!Setting.setting.setting.reportOldMsg && data.time < this.time) return;

        if(Setting.setting.http.enable || Setting.setting.http.enableReport) this.__reportHttp(data);

        let str = JSON.stringify(data);
        if(Setting.setting.ws.enable) this.__reportWs(str);
        if(Setting.setting.wsReverse.enable) this.__reportWsReverse(str);

    }

    __reportHttp(data){
        if(this.httpReporter) this.httpReporter(data);
    }

    __reportWs(str){
        if(this.webSocketReporter) this.webSocketReporter(str);
    }

    __reportWsReverse(str){
        if(this.webSocketReverseReporter) this.webSocketReverseReporter(str);
    }
}

module.exports = {
    Data,
    Setting,
    Reporter: new Reporter()
};
