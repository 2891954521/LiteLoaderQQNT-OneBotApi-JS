/**
 * 模块核心
 */

const crypto = require('crypto');

const {IPCAction} = require("../common/const");

/**
 * 数据
 */
class Data{

    /**
     * 自身信息
     */
    static selfInfo = {
        uin: 0,
    };

    /**
     * uid -> QQ号
     */
    static userMap = {};

    /**
     * QQ号 -> 用户
     */
    static friends = {};

    /**
     * 群号 -> 群信息
     */
    static groups = {};

    /**
     * 根据QQ号获取用户信息
     * @param {string} qq 
     * @returns {object | null}
     */
    static getUserByQQ(qq){
        let user = this.friends.hasOwnProperty(qq.toString()) ? this.friends[qq] : null;
        if(user !== undefined){
            return user;
        }else{
            log(`User with QQ ${qq} not found.`);
            return null;
        }
    }

    /**
     * 根据uid获取用户信息
     * @param {string} uid
     * @returns {object | null}
     */
    static getUserByUid(uid){
        let qq = this.userMap.hasOwnProperty(uid.toString()) ? this.userMap[uid] : null;
        if(qq !== undefined){
            return this.getUserByQQ(qq);
        }else{
            log(`User with uid ${uid} not found.`);
            return null;
        }
    }

    /**
     * 根据群号获取群信息
     * @param {string} uid
     * @return {Object | null}
     */
    static getGroupByUid(uid){
        let group = this.groups.hasOwnProperty(uid.toString()) ? this.groups[uid] : null;
        if(group !== undefined){
            return group;
        }else{
            log(`Group with uid ${uid} not found.`);
            return null;
        }
    }
}

/**
 * 系统设置
 */
class Setting{
    static setting = {
        "port": 5000,
        "hosts": [
            "http://127.0.0.1:8080/"
        ]
    }
}

/**
 * 运行需要的数据
 */
class RuntimeData{
    /**
     * 主界面的webContents
     */
    static mainPage = null;

    /**
     * 是否为调试模式
     */
    static isDebugMode = false;

    static ntCallCallback = { };

    static getUserInfoCallback = { };

    /**
     * 主界面是否已加载
     */
    static isLoaded(){
        return this.mainPage != null;
    }

    static async ntCall(eventName, cmdName, args){
        return await new Promise((resolve) => {
            const uuid = crypto.randomUUID();
            this.ntCallCallback[uuid] = resolve;
            this.mainPage.send(IPCAction.ACTION_NT_CALL, {
                "eventName": eventName,
                "cmdName": cmdName,
                "args": args,
                "uuid": uuid
            });
        });
    }

    /**
     * 从网络拉取最新的用户信息
     */
    static async getUserInfoByUid(uid){
        return await new Promise((resolve) => {
            this.getUserInfoCallback[uid.toString()] = resolve;
            this.mainPage.send(IPCAction.ACTION_NT_CALL, {
                "eventName": "ns-ntApi",
                "cmdName": "nodeIKernelProfileService/getUserDetailInfo",
                "args": [ { "uid": uid.toString() }, undefined ]
            });
        });
    }
}


function log(...args){
    console.log("\x1b[32m[OneBotAPI-Core]\x1b[0m", ...args);
}

module.exports = {
    Data: Data,
    Setting: Setting,
    RuntimeData: RuntimeData
};
