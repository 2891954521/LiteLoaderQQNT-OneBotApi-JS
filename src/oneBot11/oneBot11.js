const Api = require("./api");
const MessageModel = require("./messageModel");
const { Data } = require("../main/core");
const { QQNtAPI } = require('../qqnt/QQNtAPI');
const { createPeer, parseFromQQNT } = require("./message");

const oneBot11API = {

	/**
	 * 获取用户信息
	 *
	 */
	'__getUserByUid': async (postData) => {
		try{
			return await QQNtAPI.getUserInfoByUid(postData['uid']);
		}catch(e){
			return e.stack.toString();
		}

	},

	'__sendMsg': async (postData) => {
		return {
			status: 'ok',
			retcode: 0,
			data: await QQNtAPI.ntCall("ns-ntApi", "nodeIKernelMsgService/sendMsg", [{
				msgId: "0",
				peer: postData.peer,
				msgElements: postData.elements,
				msgAttributeInfos: new Map()
			}, null])
		}
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
	'send_msg': async (postData) => {
		let response = await MessageModel.sendMessage(postData);
		if(response?.msg){
			response.status = 'failed';
			response.retcode = 400;
		}else{
			response.status = 'ok';
			response.retcode = 0;
		}
		return response;
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
	'send_private_msg': async (postData) => {
		let response = await MessageModel.sendMessage(postData);
		if(response?.msg){
			response.status = 'failed';
			response.retcode = 400;
		}else{
			response.status = 'ok';
			response.retcode = 0;
		}
		return response;
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
	'send_group_msg': async (postData) => {
		let response = await MessageModel.sendMessage(postData);
		if(response?.msg){
			response.status = 'failed';
			response.retcode = 400;
		}else{
			response.status = 'ok';
			response.retcode = 0;
		}
		return response;
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
	'download_file': (postData) => {
		let userInfo = Data.getInfoByQQ(postData['user_id']);

		if(userInfo == null){
			return { code: 400, msg: `User with QQ ${postData['user_id']} not found.` }
		}

		if(!postData["msgId"] || !postData['elementId']){
			return { code: 400, msg: "Must provide 'msgId' and 'elementId'." }
		}

		QQNtAPI.ntCall("ns-ntApi", "nodeIKernelMsgService/downloadRichMedia",[
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
		]).then();

		return { status: 'ok', retcode: 0, }
	},

	/**
	 * 撤回消息
	 */
	'delete_msg': async(postData) => {
		let peer = null;
		let msg = Data.historyMessage.get(postData.message_id);
		if(msg){
			peer = {
				chatType: msg.chatType,
				peerUid: msg.peerUid,
				guildId: ''
			}
		}else{
			let peer = createPeer(postData.group_id, postData.user_id);
			if(!peer){
				return {
					status: 'failed',
					retcode: 400,
					msg: "消息不存在"
				}
			}
		}

		let result = await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelMsgService/recallMsg",
			[{ peer, "msgIds": [ postData.message_id.toString() ]
			}, null]);

		if(result.result == 0){
			return {
				status: 'ok',
				retcode: 0,
			}
		}else{
			return {
				status: 'failed',
				retcode: result.result,
				msg: result.errMsg,
			}
		}
	},

	/**
	 * 获取消息
	 */
	'get_msg': async(postData) => {
		if(!postData.message_id){
			return { status: 'failed', "retcode": 400, msg: "Must provide 'message_id'." }
		}

		let oneBotMsg = Data.historyMessage.get(postData.message_id)?.oneBotMsg;
		if(oneBotMsg){
			return {
				status: 'ok',
				retcode: 0,
				data: {
					message: oneBotMsg.message
				}
			}
		}else{
			return {
				status: 'failed',
				retcode: 404,
				msg: `消息不存在, Can't find message with id: ${postData.message_id}`,
			}
		}
	},

	/**
	 * 获取合并转发的消息
	 */
	'get_forward_msg': async(postData) => {
		if(!postData.id){
			return { status: 'failed', "retcode": 400, msg: "Must provide 'id' (msgId)." }
		}

		let peer;
		let msg = Data.historyMessage.get(postData.id);
		if(msg){
			peer = {
				chatType: msg.chatType,
				peerUid: msg.peerUid,
				guildId: ''
			}
		}else{
			peer = createPeer(postData.group_id, postData.user_id);
			if(!peer){
				return {
					status: 'failed',
					retcode: 400,
					msg: "消息不存在"
				}
			}
		}

		let forwardMsg = [];
		let messages = await QQNtAPI.getMultiMessages(peer, postData.id);
		for(let message of messages){
			let content = [];
			for(let element of message.elements){
				content.push(await parseFromQQNT(message, element));
			}
			forwardMsg.push({
				"type": "node",
				"data": {
					"user_id": message.senderUid,
					"content": content
				}
			})
		}

		return {
			status: 'ok',
			retcode: 0,
			data: {
				'message': forwardMsg
			}
		};
	},

	/**
	 * 获取登录号信息
	 */
	'get_login_info': () => {
		return {
			status: 'ok',
			retcode: 0,
			data: {
				'user_id': Data.selfInfo.account
			}
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
	'get_friend_list': () => {
		return {
			status: 'ok',
			retcode: 0,
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
	'set_friend_add_request': async (postData) => {
		if('flag' in postData && 'approve' in postData){
			return {
				status: 'ok',
				retcode: 0,
				data: await QQNtAPI.ntCall(
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
			return {
				status: 'failed',
				retcode: 400,
				msg: "Must provide 'flag' and 'approve'."
			}
		}
	},

	// set_group_anonymous_ban 群组匿名用户禁言
	// set_group_anonymous 群组匿名
	// set_group_card 设置群名片（群备注）
	// set_group_special_title 设置群组专属头衔
	// set_group_add_request 处理加群请求／邀请
	// get_stranger_info 获取陌生人信息
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

for(let item of Api.api){
	oneBot11API[item.url] = item.handle
}

module.exports = {
	oneBot11API
}
