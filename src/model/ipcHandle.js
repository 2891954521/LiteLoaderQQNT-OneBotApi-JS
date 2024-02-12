/**
 * 客户端内部消息处理模块
 */

const { Log } = require("../logger");
const { Data, Runtime, Setting } = require('../main/core');
const MessageModel = require('../model/messageModel');


/**
 * 接收新消息
 */
function onRecvMsg(arg){
	const messages = arg?.payload?.msgList;
	if(messages){
		MessageModel.handleNewMessage(messages)
			.then(() => { }, (err) => {
				Log.e("解析消息失败: " + err.stack + '\n消息内容: ' + JSON.stringify(messages));
		})
	}
}


/**
 * 监听自己发送的消息，用于获取msgId
 */
function onSendMsg(arg){
	const msgRecord = arg.payload?.msgRecord;
	if(msgRecord){
		Data.pushHistoryMessage(msgRecord);
		if(msgRecord.peerUid in Runtime.sendMessageCallback){
			Runtime.sendMessageCallback[msgRecord.peerUid](msgRecord.msgId);
			delete Runtime.sendMessageCallback[msgRecord.peerUid];
		}
	}
}


/**
 * 更新好友信息
 */
function onBuddyListChange(arg){
	const data = arg?.payload?.data;
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

	Log.d(`加载 ${friendsCount} 个好友.`);

	Data.friends = friends;
	Data.userMap = userMap;
}


/**
 * 更新群信息
 */
function onGroupListUpdate(arg){
	const groupList = arg?.payload?.groupList;
	if(!groupList) return;

	groupList.forEach((group) => Data.groups[group.groupCode] = group);

	Log.d(`更新 ${Object.keys(groupList).length} 个群聊.`);
}


const handleCmd = {

	"onRecvMsg": onRecvMsg,
	"nodeIKernelMsgListener/onRecvMsg": onRecvMsg,

	"nodeIKernelMsgListener/onAddSendMsg": onSendMsg,

	"onBuddyListChange": onBuddyListChange,
	"nodeIKernelBuddyListener/onBuddyListChange": onBuddyListChange,

	"onGroupListUpdate": onGroupListUpdate,
	"nodeIKernelGroupListener/onGroupListUpdate": onGroupListUpdate,

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
	"nodeIKernelBuddyListener/onBuddyReqChange": (arg) => {
		arg?.payload?.data?.buddyReqs
			?.filter(friendRequest => friendRequest.isUnread && !friendRequest.isDecide)
			.forEach(friendRequest => {
				Runtime.getUserInfoByUid(friendRequest.friendUid).then(info => {
					if(Setting.setting.setting.autoAcceptFriendRequest){
						Runtime.ntCall(
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
	},

	/**
	 * 媒体文件下载完成
	 */
	"nodeIKernelMsgListener/onRichMediaDownloadComplete": (arg) => {
		MessageModel.postNoticeData({
			notice_type: "download_finish",
			file: {
				msgId: arg.payload.notifyInfo.msgId,
				filePath: arg.payload.notifyInfo.filePath,
				totalSize: arg.payload.notifyInfo.totalSize,
			}
		})
	},

	/**
	 * 获取用户信息完成
	 */
	"nodeIKernelProfileListener/onProfileDetailInfoChanged": (arg) => {
		const uid = arg.payload?.info?.uid;
		if(uid && uid in Runtime.getUserInfoCallback){
			Runtime.getUserInfoCallback[uid](arg.payload.info);
			delete Runtime.getUserInfoCallback[uid];
		}
	},

	/**
	 * 禁用更新提示
	 */
	"nodeIKernelUnitedConfigListener/onUnitedConfigUpdate": (arg) => {
		if(Setting.setting.misc.disableUpdate){
			arg.payload.configData.content = "";
			arg.payload.configData.isSwitchOn = false;
		}
	}
}

/**
 * 解析向渲染进程发送的消息
 */
function onMessageHandle(cmdObject){
	if(cmdObject.cmdName in handleCmd){
		handleCmd[cmdObject.cmdName](cmdObject);
	}
}

function log(...args) {
	console.log("\x1b[32m[OneBotAPI-MessageHandle]\x1b[0m", ...args);
}

module.exports = {
	onMessageHandle
}