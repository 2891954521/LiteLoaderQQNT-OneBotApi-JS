const {Log} = require("../logger");
const {Data, Setting} = require("../main/core");
const { QQNtAPI } = require('../qqnt/QQNtAPI');
const MessageModel = require("../oneBot11/messageModel");
const utils = require("../utils");

class BaseApi{
	constructor(...cmdNames){
		this.cmdNames = cmdNames;
	}
	handle(cmdObject){

	}
}

/**
 * 收到消息
 */
class ReceiveMessage extends BaseApi{
	constructor(){ super('onRecvMsg', "nodeIKernelMsgListener/onRecvMsg", "nodeIKernelMsgListener/onRecvActiveMsg"); }
	handle(cmdObject){
		const messages = cmdObject?.payload?.msgList;
		if(messages){
			MessageModel.handleNewMessage(messages).then(() => { }, (err) => {
				Log.e("解析消息失败: " + err.stack + '\n消息内容: ' + JSON.stringify(messages));
			})
		}
	}
}


/**
 * 监听自己发送的消息，用于获取msgId
 */
class SendMessage extends BaseApi{
	constructor(){ super("nodeIKernelMsgListener/onAddSendMsg"); }
	handle(cmdObject){
		/** @type QQNTMessage */
		const msgRecord = cmdObject.payload?.msgRecord;
		if(msgRecord){
			if(msgRecord.peerUid in QQNtAPI.sendMessageCallback){
				QQNtAPI.sendMessageCallback[msgRecord.peerUid](msgRecord);
				delete QQNtAPI.sendMessageCallback[msgRecord.peerUid];
			}
		}
	}
}


/**
 * 更新好友信息
 */
class UpdateFriendList extends BaseApi{
	constructor(){ super("onBuddyListChange", "nodeIKernelBuddyListener/onBuddyListChange"); }
	handle(cmdObject){
		const data = cmdObject?.payload?.data;
		if(!data) return;

		const friends = {};
		const userMap = {};

		data.forEach((category) => {
			const buddyList = category?.buddyList;
			if(buddyList) buddyList.forEach((friend) => {
				friends[friend.uin] = friend;
				userMap[friend.uid] = friend.uin;
			})
		});

		const friendsCount = Object.keys(friends).length;
		if(friendsCount === 0) return;

		Log.i(`加载 ${friendsCount} 个好友.`);

		Data.friends = friends;
		Data.userMap = userMap;
	}
}


/**
 * 更新群信息，包括群人数变动
 */
class UpdateGroupList extends BaseApi{
	constructor(){ super("onGroupListUpdate", "nodeIKernelGroupListener/onGroupListUpdate"); }
	handle(cmdObject){
		const groupList = cmdObject?.payload?.groupList;
		if(!groupList || groupList.length == 0) return;

		const type = cmdObject.payload?.updateType;
		if(type == 2){
			groupList.forEach((group) => {
				let oldGroup = Data.groups[group.groupCode]
				if(oldGroup.memberCount != group.memberCount){
					new Promise(async() => {
						let isDecrease = oldGroup.memberCount > group.memberCount;
						let oldMembers = Data.groupMembers[group.groupCode];

						await utils.wait(1000);
						await Data.__updateGroupMember(group.groupCode, group.memberCount);

						let newMembers = Data.groupMembers[group.groupCode];

						let members = isDecrease ?
							Object.keys(oldMembers).filter(key => !Object.keys(newMembers).includes(key)) :
							Object.keys(newMembers).filter(key => !Object.keys(oldMembers).includes(key));

						for(let member of members){
							let uin = isDecrease ? oldMembers[member].uin : newMembers[member].uin
							Log.i(`群(${group.groupCode}) 成员(${uin}) ${ isDecrease ? "退群" : "入群"}`);
							MessageModel.postNoticeData({
								time: Date.now() / 1000,
								notice_type: isDecrease ? "group_decrease" : "group_increase",
								sub_type: isDecrease ? "leave" : "invite",
								user_id: uin,
								group_id: group.groupCode,
								operator_id: uin
							})
						}
					}).then().catch(Log.e)
				}
				Data.groups[group.groupCode] = group
			});
		}else{
			groupList.forEach((group) => Data.groups[group.groupCode] = group);
			Log.i(`更新 ${Object.keys(groupList).length} 个群聊.`);
		}
	}
}


/**
 * 撤回消息, msgType = 5, subMsgType = 4
 */
class MsgInfoListUpdate extends BaseApi{
	constructor(){ super("nodeIKernelMsgListener/onMsgInfoListUpdate"); }

	handle(cmdObject){
		let msgList = cmdObject?.payload?.msgList;
		if(!msgList) return;
		for(let msg of msgList){
			for(let element of msg.elements){
				if(element.elementType == 8 && element.grayTipElement.subElementType == 1){
					MessageModel.recallMessage(msg).then(() => { }, (err) => {
						Log.e("解析撤回消息失败: " + err.stack + '\n消息内容: ' + JSON.stringify(msg));
					});
					break;
				}
			}
		}
	}
}

/**
 * 更新好友请求列表
 *
 * @typedef friendRequest
 * @property {boolean} isDecide - 是否已处理
 * @property {boolean} isUnread - 是否未读
 * @property {boolean} isInitiator
 * @property {boolean} isShowCard
 * @property {boolean} isDoubt
 * @property {boolean} isAgreed
 *
 * @property {string} friendUid - 好友Uid, 字母和数字组成的字符串
 * @property {string} friendNick - 好友昵称
 * @property {string} nameMore
 * @property {string} extWords - 加好友的请求消息
 * @property {string} reqTime - 加好友的时间戳
 * @property {string} friendAvatarUrl - 好友头像Url
 * @property {string} groupCode
 *
 * @property {int} reqType
 * @property {int} reqSubType
 * @property {int} flag
 * @property {int} preGroupingId
 * @property {int} commFriendNum
 * @property {int} curFriendMax
 * @property {int} sourceId
 * @property {int} relation
 *
 * @property {Object} isBuddy
 */
class FriendRequest extends BaseApi{
	constructor(){ super("nodeIKernelBuddyListener/onBuddyReqChange"); }

	handle(cmdObject){
		cmdObject?.payload?.data?.buddyReqs
			?.filter(friendRequest => friendRequest.isUnread && !friendRequest.isDecide)
			.forEach(friendRequest => {
				QQNtAPI.getUserInfoByUid(friendRequest.friendUid).then(info => {
					if(Setting.setting.setting.autoAcceptFriendRequest){
						QQNtAPI.ntCall(
							"ns-ntApi",
							"nodeIKernelBuddyService/approvalFriendRequest",
							[{
								"approvalInfo":{
									"friendUid": friendRequest.friendUid,
									"accept": true
								}
							}, null]
						).then();
					}
					MessageModel.postRequestData({
						request_type: 'friend',
						user_id: info.uin,
						comment: friendRequest.extWords,
						flag: friendRequest.friendUid
					})
				})
			});
	}
}

/**
 * 媒体文件下载完成
 */
class FileDownloadComplete extends BaseApi{
	constructor(){ super("nodeIKernelMsgListener/onRichMediaDownloadComplete"); }

	handle(cmdObject){
		MessageModel.postNoticeData({
			notice_type: "download_finish",
			file: {
				msgId: cmdObject.payload.notifyInfo.msgId,
				filePath: cmdObject.payload.notifyInfo.filePath,
				totalSize: cmdObject.payload.notifyInfo.totalSize,
			}
		})
	}
}


/**
 * 刷新频道个人资料
 */
class RefreshGuildInfo extends BaseApi{
	constructor(){ super('nodeIKernelGuildListener/onRefreshGuildUserProfileInfo'); }
	handle(cmdObject){
		let info = cmdObject?.payload?.profileInfo;
		if(info){
			Data.guildInfo.nickname = info.nick;
			Data.guildInfo.tiny_id = info.tinyId;
			// Data.guildInfo.avatar_url = ;
		}
	}
}


/**
 * 禁用更新提示
 */
class DisableUpdate extends BaseApi{
	constructor(){ super("nodeIKernelUnitedConfigListener/onUnitedConfigUpdate"); }

	handle(cmdObject){
		if(Setting.setting.misc.disableUpdate){
			cmdObject.payload.configData.content = "";
			cmdObject.payload.configData.isSwitchOn = false;
		}
	}
}


module.exports = {
	api: [
		new ReceiveMessage(),
		new SendMessage(),
		new MsgInfoListUpdate(),

		new UpdateFriendList(),
		new UpdateGroupList(),

		new FileDownloadComplete(),

		new FriendRequest(),

		new RefreshGuildInfo(),

		new DisableUpdate()
	]
}