/**
 * 消息处理模块
 */

const { Log } = require('../logger');
const { QQNtAPI } = require('../qqnt/QQNtAPI');
const { Data, Setting, Reporter } = require('../main/core');

const { createPeer, createOneBot, Text} = require("./message");

const Event = require("./event")


/**
 * 发送消息
 * @param postData
 */
async function sendMessage(postData){
    let peer = createPeer(postData.group_id, postData.user_id);

	if(!peer){
		return { msg: postData.group_id ? `找不到群 (${postData.group_id})` : `找不到好友 (${postData.user_id})`}
	}

	let message;
	if(postData.message.constructor === String){
		message = [ new Text(postData.message) ]
	}else{
		message = []
		for(let item of postData.message){
			message.push(await createOneBot(item, postData.group_id))
		}
	}

	let oneBotMsg = new Event.MessageEvent(0, "", postData.user_id, message)

	let qqNtMsg = await QQNtAPI.sendMessage(peer, oneBotMsg.message.map((item) => item.toQQNT()));

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
	if(postData.group_id) Log.i(`发送群 (${postData.group_id}) 消息：${oneBotMsg.raw_message}`);
	else Log.i(`发送好友 (${postData.user_id}) 消息：${oneBotMsg.raw_message}`);

	Data.pushHistoryMessage(qqNtMsg, oneBotMsg);

	return { data: { message_id: qqNtMsg.msgId } };
}

/**
 * 处理新消息
 */
async function handleNewMessage(messages){
	for(/** @type QQNTMessage */ let message  of messages){
		let oneBotMsg = await Event.parseMessage(message)
		if(oneBotMsg){
			switch(oneBotMsg.eventType){
				case 1:
					Log.i(`收到好友 (${oneBotMsg.user_id}) 的消息：${oneBotMsg.raw_message}`); break;
				case 2:
					Log.i(`收到群 (${oneBotMsg.group_id}) 内 (${oneBotMsg.user_id}) 的消息：${oneBotMsg.raw_message}`); break;
				case 4:
					Log.i(`收到频道 (${oneBotMsg.guild_id}/${oneBotMsg.channel_id}) 内 (${oneBotMsg.tiny_id}) 的消息：${oneBotMsg.raw_message}`); break;
			}

			Data.pushHistoryMessage(message, oneBotMsg);

			if(oneBotMsg.user_id != oneBotMsg.self_id || Setting.setting.setting.reportSelfMsg){
				Reporter.reportData(oneBotMsg);
			}
		}else{
			Log.w(`解析消息失败, 消息内容: ${JSON.stringify(messages)}`)
		}
	}
}

async function recallMessage(message){
	let recall = await Event.RecallMessage.parseFromQQNT(message)
	if(recall.group_id) Log.i(`群 (${recall.group_id}) 内 (${recall.user_id}) 撤回了一条消息`);
	else Log.i(`好友 (${recall.user_id}) 撤回了一条消息`);
	Reporter.reportData(recall);
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