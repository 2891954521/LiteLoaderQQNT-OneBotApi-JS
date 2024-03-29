const { Log } = require("../logger");
const { Data } = require("../main/core");
const { parseFromQQNT } = require("./message");

class Event{
	eventType = 0;
	constructor(time = 0, message_id = "", post_type = ""){
		this.time = time;
		this.message_id = message_id;
		this.self_id = Data.selfInfo.uin;
		this.post_type = post_type;
	}
}

class MessageEvent extends Event{
	eventType = 0;
	constructor(time = 0, message_id = "", user_id = 0, message = []){
		super(time, message_id, "message");
		this.user_id = user_id;
		this.font = 0;
		/** @type [Message] */
		this.message = message;
		this.raw_message = this.message.map(item => item.toCqCode()).join('');
	}
}

class FriendMessage extends MessageEvent{
	eventType = 1;
	constructor(QQNTMsg, user_id = 0, message = []){
		super(parseInt(QQNTMsg?.msgTime || 0), QQNTMsg.msgId, user_id, message);
		this.message_type = "private";
		this.sub_type = "friend"
		this.sender = {
			user_id: user_id,
			nickname: "",
			sex: "unknown",	//	性别，male 或 female 或
			age: 0
		}
	}
}


class GroupMessage extends MessageEvent{
	eventType = 2;
	constructor(QQNTMsg, user_id = 0, message = []){
		super(parseInt(QQNTMsg?.msgTime || 0), QQNTMsg.msgId, user_id, message);
		this.group_id = QQNTMsg.peerUid;
		this.message_type = "group";
		this.sub_type = "group"
		this.sender = {
			user_id: user_id,
			nickname: "",
			card: "",
			sex: "unknown",	//	性别，male 或 female 或
			age: 0,
			area: "",
			level: "0",
			role: "",
			title: ""
		}
	}
}

class GuildMessage extends MessageEvent{
	eventType = 4;
	constructor(QQNTMsg, user_id = 0, message = []){
		super(parseInt(QQNTMsg?.msgTime || 0), QQNTMsg.msgId, 0, message);
		this.guild_id = QQNTMsg.guildId;
		this.channel_id = QQNTMsg.channelId;
		this.tiny_id = user_id;
		this.message_type = "guild";
		this.sub_type = "message"
	}
}

class RecallMessage extends Event{
	constructor(time, message_id, notice_type, user_id, operator_id, group_id = -1){
		super(time, message_id, "notice");
		this.notice_type = notice_type;

		this.user_id = user_id;
		this.operator_id = operator_id;
		if(group_id != -1) this.group_id = group_id;
	}

	static async parseFromQQNT(QQNTMsg){
		let time = parseInt(QQNTMsg?.msgTime || 0)
		if(QQNTMsg.chatType === 1){
			let user_id = Data.getInfoByUid(QQNTMsg.senderUid)?.uin;
			if(!user_id){
				Log.w(`无法获取发送者QQ号: uid: ${QQNTMsg.senderUid}`);
				user_id = "";
			}
			return new RecallMessage(time, QQNTMsg.message_id, "friend_recall", user_id, user_id);
		}else if(QQNTMsg.chatType === 2){
			let group_id = QQNTMsg.peerUid;
			let user_id = Data.userMap[QQNTMsg.senderUid] || (await Data.getGroupMemberByUid(QQNTMsg.peerUid, QQNTMsg.senderUid))?.uin;
			let operator_id = user_id;
			if(user_id){
				for(let element of QQNTMsg.elements){
					if(element.elementType == 8 && element.grayTipElement.subElementType == 1){
						let operatorUid = element.grayTipElement.revokeElement.operatorUid;
						operator_id = Data.userMap[operatorUid] || (await Data.getGroupMemberByUid(QQNTMsg.group_id, operatorUid))?.uin;
						break;
					}
				}
			}else{
				Log.w(`无法获取发送者QQ号: uid: ${QQNTMsg.senderUid}`);
				user_id = "";
				operator_id = "";
			}
			return new RecallMessage(time, QQNTMsg.message_id, "group_recall", user_id, operator_id, group_id);
		}
	}
}

/**
 * 将收到的QQNTMessage转换为OneBot11Message
 * @param QQNTMsg { QQNTMessage }
 * @return { MessageEvent | null }
 */
async function parseMessage(QQNTMsg){
	let user_id = null;

	if(QQNTMsg.chatType === 1){
		user_id = Data.getInfoByUid(QQNTMsg.senderUid)?.uin;
	}else if(QQNTMsg.chatType === 2){
		user_id = Data.userMap[QQNTMsg.senderUid] || (await Data.getGroupMemberByUid(QQNTMsg.peerUid, QQNTMsg.senderUid))?.uin;
	}else if(QQNTMsg.chatType === 4){
		user_id = QQNTMsg.senderUid
	}

	if(user_id){
		let message = [];
		for(let element of QQNTMsg.elements) message.push(await parseFromQQNT(QQNTMsg, element));

		if(QQNTMsg.chatType === 1){
			return new FriendMessage(QQNTMsg, user_id, message)
		}else if(QQNTMsg.chatType === 2){
			return new GroupMessage(QQNTMsg, user_id, message)
		}else if(QQNTMsg.chatType === 4){
			return new GuildMessage(QQNTMsg, user_id, message)
		}else{
			return null;
		}
	}else{
		Log.w(`解析新消息失败，无法获取发送者QQ号: uid: ${QQNTMsg.senderUid}`);
		return null;
	}
}

module.exports = {
	MessageEvent,
	FriendMessage,
	GroupMessage,
	RecallMessage,
	parseMessage
}