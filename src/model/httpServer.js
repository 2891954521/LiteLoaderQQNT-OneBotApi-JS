const http = require('http');
const querystring = require('querystring');

const MessageModel = require('./messageModel');

const { IPCAction } = require('../common/const');
const { Data, RuntimeData } = require('../main/core');


let server = null;


const handleURL = {

    '/': (url, postData) => {
        return { code: 200, msg: "Http server is running" };
    },

    /**
     * 开关调试模式
     */
    '/debug': (url, postData) => {
        RuntimeData.isDebugMode = !RuntimeData.isDebugMode;
        return { code: 200, msg: `debug mode is: ${RuntimeData.isDebugMode}` };
    },

    /**
     * 调用ntCall
     */
    '/ntCall': async (url, postData) => {
        return {
            code: 200,
            msg: "OK",
            data: await RuntimeData.ntCall(postData['eventName'], postData['cmdName'], postData['args'])
        };
    },

    /**
     * 获取用户信息
     *
     */
    '/getUserByUid': async (url, postData) => {
        return {
            code: 200,
            msg: "OK",
            data: await RuntimeData.getUserInfoByUid(postData['uid'])
        };
    },

    /**
     * 发送消息
     * {
     *   "user_id" or "group_id": 123456,
     *   "message": "test"
     * }
     *   or
     * {
     *   "user_id" or "group_id": 123456,
     *   "message": [
     *     "type": "text", 
     *     "data": [
     *         "text": "test"
     *     ]
     *   ]
     * }
     */
    '/send_msg': async (url, postData) => {
        return {
            code: 200,
            msg: await MessageModel.sendMessage(postData)
        };
    },

    /**
     * 发送私聊消息
     * {
     *   "user_id": 123456,
     *   "message": "test"
     * }
     *   or
     * {
     *   "user_id": 123456,
     *   "message": [
     *     "type": "text", 
     *     "data": [
     *         "text": "test"
     *     ]
     *   ]
     * }
     */ 
    '/send_private_msg': async (url, postData) => {
        return {
            code: 200,
            msg: await MessageModel.sendMessage(postData)
        };
    },

    /**
     * 发送群消息
     * {
     *   "group_id": 123456,
     *   "message": "test"
     * }
     *   or
     * {
     *   "group_id": 123456,
     *   "message": [
     *     "type": "text", 
     *     "data": [
     *         "text": "test"
     *     ]
     *   ]
     * }
     */
    '/send_group_msg': async (url, postData) => {
        return {
            code: 200,
            msg: await MessageModel.sendMessage(postData)
        };
    },

    /**
     * 下载私聊文件
     * {
     *     "user_id": 123456,
     *     "msgId": e.g. 7310952964011716631,
     *     "elementId": e.g. 7311516200489877813
     *     "downloadPath" (可选): "C:/tmp/fileName"
     * }
     */
    '/download_file': (url, postData) => {
        let userInfo = Data.getUserByQQ(postData['user_id']);

        if(userInfo == null){
            return { code: 400, msg: `User with QQ ${postData['user_id']} not found.` }
        }

        if(!postData["msgId"] || !postData['elementId']){
            return { code: 400, msg: "Must provide 'msgId' and 'elementId'." }
        }

        let obj = {
            "eventName": "ns-ntApi",
            "cmdName": "nodeIKernelMsgService/downloadRichMedia",
            "args": [
                {
                    "getReq": {
                        "msgId": postData['msgId'],
                        "chatType": 1,
                        "peerUid": userInfo.uid,
                        "elementId": postData['elementId'],
                        "thumbSize": 0,
                        "downloadType": 1,
                        "filePath": postData['downloadPath'] || ""
                    }
                }
            ]
        }

        RuntimeData.mainPage.send(IPCAction.ACTION_NT_CALL, obj);

        return { code: 200, msg: "OK" }
    },


    /**
     * 获取登录号信息
     */
    '/get_login_info': (url, postData) => {
        return {
            code: 200,
            msg: "OK",
            data: Data.selfInfo
        };
    },

    /**
     * 获取好友列表
     * result:
     * {
     *   code: 200,
     *   msg: "OK",
     *   data: [
     *     {
     *       user_id: QQ号,
     *       nickname: 昵称,
     *       remark: 备注
     *     },
     *     ...
     *   ]
     * }
     */
    '/get_friend_list': (url, postData) => {
        return {
            code: 200,
            msg: "OK",
            data: Object.values(Data.friends).map(friend => {
                return {
                    user_id: friend.uin,
                    nickname: friend.nick,
                    remark: friend.remark
                }
            })
        };
    },

    /**
     * 处理加好友请求
     * {
     *     "flag": 	加好友请求的 flag（需从上报的数据中获得）
     *     "approve": 是否同意请求(true/false)
     * }
     */
    '/set_friend_add_request': async (url, postData) => {
        if('flag' in postData && 'approve' in postData){
            return {
                code: 200,
                msg: "OK",
                data: await RuntimeData.ntCall(
                    "ns-ntApi",
                    "nodeIKernelBuddyService/approvalFriendRequest",
                    [{
                        "approvalInfo":{
                            "friendUid": postData["flag"],
                            "accept": postData['approve']
                        }
                    }, null]
                )
            };
        }else{
            return { code: 400, msg: "Must provide 'flag' and 'approve'." }
        }
    },

    // get_group_info 获取群信息
    // get_group_list 获取群列表

    // delete_msg 撤回消息
    // get_msg 获取消息
    // get_forward_msg 获取合并转发消息
    // send_like 发送好友赞
    // set_group_kick 群组踢人
    // set_group_ban 群组单人禁言
    // set_group_anonymous_ban 群组匿名用户禁言
    // set_group_whole_ban 群组全员禁言
    // set_group_admin 群组设置管理员
    // set_group_anonymous 群组匿名
    // set_group_card 设置群名片（群备注）
    // set_group_name 设置群名
    // set_group_leave 退出群组
    // set_group_special_title 设置群组专属头衔
    // set_group_add_request 处理加群请求／邀请
    // get_stranger_info 获取陌生人信息
    // get_group_member_info 获取群成员信息
    // get_group_member_list 获取群成员列表
    // get_group_honor_info 获取群荣誉信息
    // get_record 获取语音
    // get_image 获取图片
    // can_send_image 检查是否可以发送图片
    // can_send_record 检查是否可以发送语音
    // get_status 获取运行状态
    // get_version_info 获取版本信息
    // set_restart 重启 OneBot 实现
    // clean_cache 清理缓存

}


function startHttpServer(port, restart = false){
    if(server){
        if(restart){
            server.close(() => {
                log(`Http server stopped.`);
            });
        }else{
            return;
        }
    }

    server = http.createServer(async (req, res) => {
        if(req.method !== 'POST'){
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Http server is running');
            return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', async() => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');

            try{
                let contentType = req.headers['content-type'];
                let form;

                if(contentType === "application/json"){
                    form = body !== "" ? JSON.parse(body) : {}

                }else if(contentType === "application/x-www-form-urlencoded"){
                    form = querystring.parse(body);

                }else if(contentType === "multipart/form-data"){
                    res.end('{ "code": 403, "msg": "Unsupport content type" }');
                    return;

                }else{
                    res.end('{ "code": 400, "msg": "Wrong content type" }');
                    return;
                }
                const handler = handleURL[req.url];
                if(handler){
                    res.end(JSON.stringify(await handler(req.url, form)));
                }else{
                    res.end('{ "code": 404, "msg": "Not Found" }');
                }
            }catch(error){
                log(error);
                res.end(`{ "code": 500, "msg": ${error.toString()} }`);
            }
        });

    });

    server.listen(port, '0.0.0.0', () => { 
        log(`Server running at http://0.0.0.0:${port}/`);
    });
}


function log(...args) {
    console.log("\x1b[32m[OneBotAPI-HttpServer]\x1b[0m", ...args);
}


module.exports = {
    getServer: () => server,

    startHttpServer
}