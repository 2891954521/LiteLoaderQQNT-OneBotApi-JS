/**
 * 模块核心
 */

const crypto = require('crypto');

const { Log } = require("../logger");
const { IPCAction, defaultSetting} = require("../common/const");

const utils = require("../utils");
const {LimitedHashMap} = require("../utils");

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

    /**
     * uid -> QQ号
     * @type {Object.<string, string>}
     */
    static userMap = {};

    /**
     * @typedef User
     * @property {string} uid - u_uMB7xxxxxx
     * @property {string} qid - QID
     * @property {string} uin - QQ号
     * @property {string} nick - 昵称
     * @property {string} remark - 备注
     * @property {string} longNick - 签名
     * @property {string} avatarUrl - 头像URL
     * @property {int} sex - 性别
     *
     * @property {number} birthday_year - 生日年份
     * @property {number} birthday_month - 生日月份
     * @property {number} birthday_day - 生日日期
     *
     * @property {string} topTime - 顶部时间
     *
     * @property {boolean} isBlock - 是否被阻止
     * @property {boolean} isMsgDisturb - 是否消息打扰
     * @property {boolean} isSpecialCareOpen - 是否开启特别关心
     * @property {boolean} isSpecialCareZone - 是否特别关心区域
     *
     * @property {string} ringId - 铃声ID
     * @property {number} status - 状态
     * @property {number} extStatus - 扩展状态
     * @property {number} categoryId - 类别ID
     * @property {boolean} onlyChat - 是否仅聊天
     * @property {boolean} qzoneNotWatch - 是否不观看Qzone
     * @property {boolean} qzoneNotWatched - Qzone是否被观看
     *
     * @property {boolean} vipFlag - 是否是VIP
     * @property {boolean} yearVipFlag - 是否是年度VIP
     * @property {boolean} svipFlag - 是否是SVIP
     * @property {number} vipLevel - VIP等级
     */
    /**
     * QQ号 -> 用户
     * @type {Object.<string, User>}
     */
    static friends = {};

    /**
     * @typedef {Object} Group
     * @property {string} groupCode - 群号
     * @property {string} groupName - 群名称
     * @property {number} maxMember - 最大成员数
     * @property {number} memberCount - 成员数
     * @property {string} remarkName - 备注名称
     *
     * @property {boolean} isTop - 是否置顶
     * @property {number} groupStatus - 群组状态
     * @property {number} memberRole - 成员角色
     * @property {string} toppedTimestamp - 置顶时间戳
     * @property {number} privilegeFlag - 权限标志
     * @property {boolean} isConf - 是否是会议群
     * @property {boolean} hasModifyConfGroupFace - 是否可以修改会议群头像
     * @property {boolean} hasModifyConfGroupName - 是否可以修改会议群名称
     * @property {boolean} hasMemo - 是否有群公告
     * @property {string} groupShutupExpireTime - 群禁言到期时间
     * @property {string} personShutupExpireTime - 个人禁言到期时间
     * @property {string} discussToGroupUin - 讨论组转群目标 UIN
     * @property {number} discussToGroupMaxMsgSeq - 讨论组转群消息最大序列号
     * @property {number} discussToGroupTime - 讨论组转群时间
     */
    /**
     * 群号 -> 群聊信息
     * @type {Object.<string, Group>}
     */
    static groups = {};

    /**
     * @typedef GroupMember
     * @property {string} uid - u_uMB7xxxxxx
     * @property {string} qid - QID
     * @property {string} uin - QQ号
     * @property {string} nick - 昵称
     * @property {string} remark - 备注
     * @property {int} cardType -
     * @property {string} cardName - 群昵称
     * @property {int} role - 群主:4, 管理员:3, 群员:2
     * @property {string} avatarPath - 头像URL
     * @property {int} shutUpTime -
     * @property {boolean} isDelete -
     * @property {boolean} isSpecialConcerned -
     * @property {boolean} isRobot -
     */
    /**
     * 群成员的信息
     * 群号 -> 群成员列表 -> 群成员信息
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
            log(`User with QQ ${qq} not found.`);
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
            log(`User with uid ${uid} not found.`);
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
            log(`Group with uid ${groupId} not found.`);
            return null;
        }
    }


    /**
     * 根据 uid 获取群成员信息
     * @param groupId {string} 群号
     * @param uid {string} 用户uid
     * @return {GroupMember | null}
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
     * @return {GroupMember | null}
     */
    static async getGroupMemberByQQ(groupId, qq, force = false){
        let members = await this.getGroupMemberList(groupId, force);
        let member = members.find(m => m.uin == qq);
        return member || (Log.w(`getGroupMemberByQQ: 用户 QQ(${qq}) 在 群(${groupId}) 内不存在`), null);
    }


    /**
     * 获取群成员列表
     * @param groupId 群号
     * @param force 是否强制更新
     * @return {Promise<Array<GroupMember>>}
     */
    static async getGroupMemberList(groupId, force = false) {
        let group = this.getGroupById(groupId);
        if(!group){
            Log.w(`getGroupMemberList: 群(${groupId})不存在`);
            return [];
        }

        if(!force){
            let members = this.groupMembers[group.groupCode];
            if(members){
                let r = Object.values(members);
                if(r.length > 0) return r;
            }
        }
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
    static async __updateGroupMember(groupId, num = 30, retry = true){
        let members = await Runtime.getGroupMembers(groupId, num);

        if(members && members?.size > 0){
            Log.d(`加载 群(${groupId}) 成员列表，共计${members.size}人`);
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
 * 运行需要的数据
 */
class Runtime{

    static ipcMain = null;

    /**
     * 主界面的webContents
     */
    static mainPage = null;

    static webContentsId = '2';

    static ntCallCallback = { };

    static getUserInfoCallback = { };

    static sendMessageCallback = { };

    /**
     * 初始化Bot框架
     * @param ipcMain
     * @param webContents
     */
    static init(ipcMain, webContents){
        Log.i("正在加载Bot框架");

        this.ipcMain = ipcMain;
        this.mainPage = webContents;
        this.webContentsId = webContents.id.toString();

        this.ntCall("ns-GlobalDataApi", "fetchAuthData", []).then(info => {
            Log.d(`当前账号信息: uid: ${info.uid}, uin: ${info.uin}`);
            Data.selfInfo = info;
        });

        // 获取好友列表
        this.ntCall("ns-ntApi", "nodeIKernelBuddyService/getBuddyList", [{ force_update: false }, undefined]).then();
        // 获取群列表
        this.ntCall("ns-ntApi", "nodeIKernelGroupService/getGroupList", [{ force_update: false }, undefined]).then();

        Log.i("Bot框架加载完成");
    }

    /**
     * 主界面是否已加载
     */
    static isLoaded(){
        return this.mainPage != null;
    }

    static ntCall(eventName, cmdName, args){
        return new Promise((resolve) => {
            const uuid = crypto.randomUUID();
            this.ntCallCallback[uuid] = resolve;
            this.ipcMain.emit(
                `IPC_UP_${this.webContentsId}`,
                { }, // IpcMainEvent
                { type: 'request', callbackId: uuid, eventName: eventName + "-" + this.webContentsId },
                [cmdName, ...args],
            );
        })
    }

    /**
     * 从网络拉取最新的用户信息
     */
    static getUserInfoByUid(uid){
        return new Promise((resolve) => {
            this.getUserInfoCallback[uid.toString()] = resolve;
            this.ntCall("ns-ntApi", "nodeIKernelProfileService/getUserDetailInfo",
                [ { "uid": uid.toString() }, undefined ]
            ).then();
        });
    }

    /**
     * 发送消息
     * @param peer
     * @param messages
     * @return {Promise<QQNTMessage>}
     */
    static sendMessage(peer, messages){
        return new Promise((resolve) => {
            this.sendMessageCallback[peer.peerUid] = (qqNtMsg) => {
                resolve(qqNtMsg)
            };
            this.ntCall("ns-ntApi",  "nodeIKernelMsgService/sendMsg", [{
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
    static async getGroupMembers(groupId, num){
        let sceneId = await Runtime.ntCall("ns-ntApi",  "nodeIKernelGroupService/createMemberListScene",
            [{ groupCode: groupId, scene: "groupMemberList_MainWindow"}]
        )
        let res = await Runtime.ntCall("ns-ntApi",  "nodeIKernelGroupService/getNextMemberList",
            [{ sceneId: sceneId, num: num}, null]
        );

        return res.result.infos;
    }

    /**
     * 获取合并转发的消息
     */
    static async getMultiMessages(peer, rootId, msgId){
        let js = await Runtime.ntCall("ns-ntApi", "nodeIKernelMsgService/getMultiMsg", [{
            peer: peer,
            rootMsgId: rootId,
            parentMsgId: msgId ? msgId : rootId
        }, null])
        return js.msgList;
    }
}

/**
 * 上报模块
 */
class Reporter{

    static httpReporter = null;

    /** @type Function */
    static webSocketReporter = null;

    static webSocketReverseReporter = null;

    /**
     * 上报event消息
     */
    static reportData(data){
        if(!Runtime.isLoaded()) return;

        if(Setting.setting.http.enable) this.__reportHttp(data);

        let str = JSON.stringify(data);
        if(Setting.setting.ws.enable) this.__reportWs(str);
        if(Setting.setting.wsReverse.enable) this.__reportWsReverse(str);

    }

    static __reportHttp(data){
        if(this.httpReporter) this.httpReporter(data);
    }

    static __reportWs(str){
        if(this.webSocketReporter) this.webSocketReporter(str);
    }

    static  __reportWsReverse(str){
        if(this.webSocketReverseReporter) this.webSocketReverseReporter(str);
    }
}


function log(...args){
    console.log("\x1b[32m[OneBotAPI-Core]\x1b[0m", ...args);
}


module.exports = {
    Data,
    Setting,
    Runtime,
    Reporter
};
