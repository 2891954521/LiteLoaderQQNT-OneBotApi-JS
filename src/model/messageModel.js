/**
 * 消息处理模块
 */

const { Log } = require('../logger');
const { Data, Runtime, Setting, Reporter } = require('../main/core');

const {
	Text,
	createPeer,
	OneBot2CqCode,
	OneBot2QQNT,
	QQNT2OneBot
} = require("../common/message");


/**
 * 发送消息
 * @param postData
 */
async function sendMessage(postData){
    let peer = createPeer(postData.group_id, postData.user_id);

	if(!peer) return {
		msg: postData.group_id ? `找不到群 (${postData.group_id})` : `找不到好友 (${postData.user_id})`
	};

    let messages = [];

    if(postData.message.constructor === String){
        messages.push(Text.OneBot2QQNTFast(postData.message));

		if(Setting.setting.debug.debug){
			if(postData.group_id) Log.i(`发送群 (${postData.group_id}) 消息：${postData.message}`);
			else Log.i(`发送好友 (${postData.user_id}) 消息：${postData.message}`);
		}

    }else{
		try{
			for(let message of postData.message) messages.push(await OneBot2QQNT(message));
		}catch(e){
			Log.w(e.toString());
			Log.w(e.stack);
			return {
				msg: e.toString()
			}
		}

		let content = postData.message.map(item => OneBot2CqCode(item)).join('');
		if(postData.group_id) Log.i(`发送群 (${postData.group_id}) 消息：${content}`);
		else Log.i(`发送好友 (${postData.user_id}) 消息：${content}`);

    }

	return {
		data: {
			message_id: await Runtime.sendMessage(peer, messages)
		}
	};
}

/**
 * 处理新消息
 */
async function handleNewMessage(messages){
	for(/** @type Message */ let message  of messages){

		let msgData = {
			time: parseInt(message?.msgTime || 0),
			self_id: Data.selfInfo.uin,
			post_type: "message",
			message_id: message.msgId,
			message: []
		}

		if(message.chatType === 1){
			msgData["message_type"] = "private";
			msgData["sub_type"] = "friend";

			msgData.user_id = Data.getInfoByUid(message.senderUid)?.uin;

		}else if(message.chatType === 2){
			msgData["message_type"] = "group";
			msgData["sub_type"] = "normal";

			msgData.group_id = message.peerUid;
			msgData.user_id = Data.userMap[message.senderUid] || (await Data.getGroupMemberByUid(message.peerUid, message.senderUid))?.uin;
		}

		if(!msgData.user_id){
			Log.w(`无法获取发送者QQ号: uid: ${message.senderUid}`);
			continue;
		}

		for(let element of message.elements) msgData.message.push(await QQNT2OneBot(element, message));

		let content = msgData.message.map(item => OneBot2CqCode(item)).join('');
		if(msgData.group_id) Log.i(`收到群 (${msgData.group_id}) 内 (${msgData.user_id}) 的消息：${content}`);
		else Log.i(`收到好友 (${msgData.user_id}) 的消息：${content}`);

		Data.pushHistoryMessage(message);

		if(msgData.user_id != msgData.self_id || Setting.setting.setting.reportSelfMsg){
			Reporter.reportData(msgData);
		}
	}
}


/**
 * 发送通知上报
 * @param {*} postData
 */
function postNoticeData(postData){
	postData['time'] = 0;
	postData['self_id'] = Data.selfInfo.uin;
	postData['post_type'] = "notice";
	Reporter.reportData(postData);
}


/**
 * 发送通知上报
 * @param {*} postData
 */
function postRequestData(postData){
	postData['time'] = 0;
	postData['self_id'] = Data.selfInfo.uin;
	postData['post_type'] = "request";
	Reporter.reportData(postData);
}


module.exports = {
    sendMessage,

    handleNewMessage,

	postNoticeData,
	postRequestData,
}