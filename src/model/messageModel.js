/**
 * 消息处理模块
 */

const { Log } = require('../logger');
const { Data, RuntimeData, Setting } = require('../main/core');

const { Text, Face, At, Image, File, Reply, OneBot2CqCode } = require("../common/message");


/**
 * 创建发送消息的对象
 * @param postData
 * @return { {
 * 		peerUid: string,
 * 		guildId: string,
 * 		chatType: number
 * } | null }
 */
function createPeer(postData){
	if(postData["group_id"]){
		let group = Data.getGroupById(postData['group_id']);

		if(!group){
			Log.e(`Unable to find group with ${postData['group_id']}`);
			return null;

		}else{
			return {
				chatType: 2,
				peerUid: group.groupCode,
				guildId: ""
			}
		}
	}else if(postData["user_id"]){
		let friend = Data.getInfoByQQ(postData['user_id']);

		if(!friend){
			Log.e(`Unable to find friend with QQ ${postData['user_id']}`);
			return null;

		}else{
			return {
				chatType: 1,
				peerUid: friend.uid,
				guildId: ""
			}
		}
	}else{
		return null;
	}
}


/**
 * 发送消息
 * @param postData
 */
async function sendMessage(postData){
    let peer = createPeer(postData);

	if(!peer) return {
		msg: postData.group_id ? `找不到群 (${postData.group_id})` : `找不到好友 (${postData?.user_id})`
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
			for(let message of postData.message){
				switch(message.type){
					case 'text': { messages.push(Text.OneBot2QQNT(message)); break; }
					case 'face': { messages.push(Face.OneBot2QQNT(message)); break; }
					case 'at': { messages.push(await At.OneBot2QQNT(message, peer.peerUid)); break; }
					case 'image': { messages.push(await Image.OneBot2QQNT(message)); break; }
				}
			}
		}catch(e){
			Log.w(e.toString());
			Log.w(e.stack);
			return {
				msg: e.toString()
			}
		}

		if(Setting.setting.debug.debug){
			let content = postData.message.map(item => OneBot2CqCode(item)).join('');
			if(postData.group_id) Log.i(`发送群 (${postData.group_id}) 消息：${content}`);
			else Log.i(`发送好友 (${postData.user_id}) 消息：${content}`);
		}
    }

	return {
		message_id: await RuntimeData.sendMessage(peer, messages)
	};
}

/**
 * 处理新消息
 */
async function handleNewMessage(messages){
	for(let message of messages){

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

		for(let element of message.elements){

			switch(element.elementType){
				// 文本消息和At消息
				case 1: {
					let textElement = element.textElement;
					if(textElement.atType == 0) msgData.message.push(Text.QQNT2OneBot(element))
					else msgData.message.push(await At.QQNT2OneBot(element, message.peerUid))
					break;
				}

				// 图片消息
				case 2: msgData.message.push(await Image.QQNT2OneBot(element, message)); break;

				// 文件消息
				case 3: msgData.message.push(File.QQNT2OneBot(element)); break;

				// 表情消息
				case 6: msgData.message.push(Face.QQNT2OneBot(element)); break;

				// 回复消息
				case 7: msgData.message.push(Reply.QQNT2OneBot(element, message)); break;

				default:
					msgData.message.push({
						type: "unsupportType",
						data: element
					})
			}
		}

		if(Setting.setting.debug.debug){
			let content = msgData.message.map(item => OneBot2CqCode(item)).join('');
			if(msgData.group_id) Log.i(`收到群 (${msgData.group_id}) 内 (${msgData.user_id}) 的消息：${content}`);
			else Log.i(`收到好友 (${msgData.user_id}) 的消息：${content}`);
		}

		if(msgData.user_id != msgData.self_id || Setting.setting.setting.reportSelfMsg){
			postHttpData(msgData);
		}
	}
}

// ===================
// HTTP上报模块
// ===================

/**
 * 上报HTTP消息
 * @param {*} postData
 */
function postHttpData(postData){
	if(!Setting.setting.http.enable) return;

	try{
		fetch(Setting.setting.http.host, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(postData)
		}).then((res) => {

		}, (err) => {
			Log.w(`http report fail: ${err}\n${JSON.stringify(postData)}`);
		});
	}catch(e){
		Log.e(e.toString());
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
	postHttpData(postData);
}

/**
 * 发送通知上报
 * @param {*} postData
 */
function postRequestData(postData){
	postData['time'] = 0;
	postData['self_id'] = Data.selfInfo.uin;
	postData['post_type'] = "request";
	postHttpData(postData);
}


module.exports = {
    sendMessage,

    handleNewMessage,

	postHttpData,
	postNoticeData,
	postRequestData,
}