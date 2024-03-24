const MessageModel = require("./messageModel");
const { Runtime, Data } = require("../main/core");
const { createPeer, QQNT2OneBot} = require("../common/message");
const {Log} = require("../logger");

const oneBot11API = {

	'': () => {
		return { code: 200, msg: "Http server is running" };
	},

	/**
	 * 调用ntCall
	 */
	'__ntCall': async (postData) => {
		return {
			code: 200,
			msg: "OK",
			data: await Runtime.ntCall(postData['eventName'], postData['cmdName'], postData['args'])
		};
	},

	/**
	 * 获取用户信息
	 *
	 */
	'__getUserByUid': async (postData) => {
		try{
			return await Runtime.getUserInfoByUid(postData['uid']);
		}catch(e){
			return e.stack.toString();
		}

	},

	'__sendMsg': async (postData) => {
		return {
			status: 'ok',
			retcode: 0,
			data: await Runtime.ntCall("ns-ntApi", "nodeIKernelMsgService/sendMsg", [{
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

		Runtime.ntCall("ns-ntApi", "nodeIKernelMsgService/downloadRichMedia",[
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

		let result = await Runtime.ntCall(
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

		let peer = null;
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
		let messages = await Runtime.getMultiMessages(peer, postData.id);
		for(let message of messages){
			let content = [];
			for(let element of message.elements){
				content.push(await QQNT2OneBot(element, message));
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
	 * 获取群列表
	 * result:
	 * {
	 *   code: 200,
	 *   msg: "OK",
	 *   data: [
	 *     {
	 *       group_id: 群号,
	 *       group_name: 群名称,
	 *       member_count: 成员数,
	 *       max_member_count: 最大成员数（群容量）
	 *     },
	 *     ...
	 *   ]
	 * }
	 */
	'get_group_list': () => {
		return {
			status: 'ok',
			retcode: 0,
			data: Object.values(Data.groups).map(group => {
				return {
					'group_id': group.groupCode,
					'group_name': group.groupName,
					'member_count': group.memberCount,
					'max_member_count': group.maxMember,
				}
			})
		};
	},

	/**
	 * 获取群信息
	 * { "group_id": 123456 }
	 *
	 * result:
	 * {
	 *   code: 200,
	 *   msg: "OK",
	 *   data: {
	 *       group_id: 群号,
	 *       group_name: 群名称,
	 *       member_count: 成员数,
	 *       max_member_count: 最大成员数（群容量）
	 *   }
	 * }
	 */
	'get_group_info': (postData) => {
		let group = Data.groups[postData.group_id];
		return {
			status: 'ok',
			retcode: 0,
			data: {
				'group_id': group.groupCode,
				'group_name': group.groupName,
				'member_count': group.memberCount,
				'max_member_count': group.maxMember,
			}
		};
	},

	/**
	 * 获取群成员列表
	 * { "group_id": 123456 }
	 *
	 * result:
	 * {
	 *   code: 200,
	 *   msg: "OK",
	 *   data: [
	 *
	 *   ]
	 */
	'get_group_member_list': async (postData) => {
		let members = await Data.getGroupMemberList(postData.group_id, true);
		return {
			status: 'ok',
			retcode: 0,
			data: members.map((member) => { return {
				group_id: postData.group_id,// 群号
				user_id: member.uin,        // QQ 号
				nickname: member.nick,      // 昵称
				card: member.cardName,      // 群名片／备注
				role: member.role == 4 ? 'owner' : (member.role == 3 ? 'admin' : (member.role == 2 ? 'member' : 'unknown')),	// 角色，owner 或 admin 或 member
			}})
		};
	},

	/**
	 * 获取群成员信息
	 * {
	 * 	group_id: 123456,
	 * 	user_id: 123456,
	 * 	no_cache: false
	 * }
	 */
	'get_group_member_info': async (postData) => {
		let member = await Data.getGroupMemberByQQ(postData.group_id,  postData.user_id, (postData?.no_cache || false));
		return {
			status: 'ok',
			retcode: 0,
			data: {
				group_id: postData.group_id,// 群号
				user_id: member.uin,        // QQ 号
				nickname: member.nick,      // 昵称
				card: member.cardName,      // 群名片／备注
				role: member.role == 4 ? 'owner' : (member.role == 3 ? 'admin' : (member.role == 2 ? 'member' : 'unknown')),	// 角色，owner 或 admin 或 member
			}
		}
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
				data: await Runtime.ntCall(
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

	// get_msg 获取消息
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


module.exports = {
	oneBot11API
}
