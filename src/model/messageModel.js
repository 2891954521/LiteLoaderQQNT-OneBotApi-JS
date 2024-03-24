/**
 * 消息处理模块
 */

const { Log } = require('../logger');
const { Data, Runtime, Setting, Reporter } = require('../main/core');

const {
	createPeer,
	OneBot2CqCode,
	OneBot2QQNT,
	QQNT2OneBot
} = require("../common/message");


/**
 * 从message里提取信息
 */
async function parseMessage(message){
	let msgData = {
		time: parseInt(message?.msgTime || 0),
		message_id: message.msgId
	}

	if(message.chatType === 1){
		msgData.user_id = Data.getInfoByUid(message.senderUid)?.uin;

	}else if(message.chatType === 2){
		msgData.group_id = message.peerUid;
		msgData.user_id = Data.userMap[message.senderUid] || (await Data.getGroupMemberByUid(message.peerUid, message.senderUid))?.uin;
	}

	if(!msgData.user_id){
		Log.w(`无法获取发送者QQ号: uid: ${message.senderUid}`);
	}

	return msgData;
}

/**
 * 发送消息
 * @param postData
 */
async function sendMessage(postData){
    let peer = createPeer(postData.group_id, postData.user_id);

	if(!peer){
		return { msg: postData.group_id ? `找不到群 (${postData.group_id})` : `找不到好友 (${postData.user_id})`}
	}

	let oneBotMsg = {
		self_id: Data.selfInfo.uin,
		user_id: Data.selfInfo.uin,
		post_type: "message",
		font: 0,
		// sender
	}

    let messages = [];

    if(postData.message.constructor === String){
		oneBotMsg.message = [{ type: "text", data: {text: postData.message} }]
    }else{
		oneBotMsg.message = postData.message
	}

	try{
		for(let message of oneBotMsg.message) messages.push(await OneBot2QQNT(message));
	}catch(e){
		Log.w(e.stack);
		return { msg: e.toString() }
	}

	let content = oneBotMsg.message.map(item => OneBot2CqCode(item)).join('');
	if(postData.group_id) Log.i(`发送群 (${postData.group_id}) 消息：${content}`);
	else Log.i(`发送好友 (${postData.user_id}) 消息：${content}`);


	let qqNtMsg = await Runtime.sendMessage(peer, messages);

	oneBotMsg.time = parseInt(qqNtMsg?.msgTime || 0);
	oneBotMsg.message_id = qqNtMsg.msgId;
	if(postData.group_id){
		oneBotMsg.message_type = "group";
		oneBotMsg.sub_type = "normal";
		oneBotMsg.group_id = postData.group_id;
	}else{
		oneBotMsg.message_type = "private";
		oneBotMsg.sub_type = "friend";
	}

	Data.pushHistoryMessage(qqNtMsg, oneBotMsg);

	return { data: { message_id: qqNtMsg.msgId } };
}

/**
 * 处理新消息
 */
async function handleNewMessage(messages){
	for(/** @type QQNTMessage */ let message  of messages){
		let oneBotMsg = await parseMessage(message);

		if(!oneBotMsg.user_id){
			Log.w(`无法获取发送者QQ号: uid: ${message.senderUid}`);
			continue;
		}

		oneBotMsg.self_id = Data.selfInfo.uin;
		oneBotMsg.post_type = "message";
		oneBotMsg.font = 0;
		oneBotMsg.message = [];

		if(message.chatType == 1){
			oneBotMsg.message_type = "private";
			oneBotMsg.sub_type = "friend";
		}else if(message.chatType == 2){
			oneBotMsg.message_type = "group";
			oneBotMsg.sub_type = "normal";
		}

		for(let element of message.elements) oneBotMsg.message.push(await QQNT2OneBot(element, message));

		let content = oneBotMsg.message.map(item => OneBot2CqCode(item)).join('');
		if(oneBotMsg.group_id) Log.i(`收到群 (${oneBotMsg.group_id}) 内 (${oneBotMsg.user_id}) 的消息：${content}`);
		else Log.i(`收到好友 (${oneBotMsg.user_id}) 的消息：${content}`);

		Data.pushHistoryMessage(message, oneBotMsg);

		if(oneBotMsg.user_id != oneBotMsg.self_id || Setting.setting.setting.reportSelfMsg){
			Reporter.reportData(oneBotMsg);
		}
	}
}

async function recallMessage(message){
	let msgData = await parseMessage(message);
	msgData.notice_type = (message.chatType == 1 ? "friend_recall" : (message.chatType == 2 ? "group_recall" : "unknown"));

	if(msgData.group_id){
		for(let element of message.elements){
			if(element.elementType == 8 && element.grayTipElement.subElementType == 1){
				let operatorUid = element.grayTipElement.revokeElement.operatorUid;
				msgData.operator_id = Data.userMap[operatorUid] || (await Data.getGroupMemberByUid(msgData.group_id, operatorUid))?.uin;
				break;
			}
		}
	}else{
		msgData.operator_id = msgData.user_id;
	}

	if(msgData.group_id) Log.i(`群 (${msgData.group_id}) 内 (${msgData.user_id}) 撤回了一条消息`);
	else Log.i(`好友 (${msgData.user_id}) 撤回了一条消息`);

	postNoticeData(msgData);
}


/**
 * 发送通知上报
 * @param {*} postData
 */
function postNoticeData(postData){
	if(!postData.time) postData.time = 0;
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
	recallMessage,

	postNoticeData,
	postRequestData,
}