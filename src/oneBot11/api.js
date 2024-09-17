const {Data} = require("../main/core");
const {Text, createOneBot} = require("./message");
const Event = require("./event");
const {QQNtAPI} = require("../qqnt/QQNtAPI");
const {Log} = require("../logger");

const OneBotOK = { status: "ok", retcode: 0 };

function OneBotFail(code, data = ""){
	return { status: 'fail', retcode: code, data: data };
}

class BaseApi{
	constructor(url){
		this.url = url;
	}
	async handle(postData){
		return OneBotOK;
	}
}


class NtCall extends BaseApi{

	constructor(){ super("__ntCall") }

	async handle(postData){
		return {
			code: 200,
			msg: "OK",
			data: await QQNtAPI.ntCall(postData['eventName'], postData['cmdName'], postData['args'], postData['webContentsId'] || '2')
		};
	}
}

class NtCallAsync extends BaseApi{

	constructor(){ super("__ntCallAsync") }

	async handle(postData){
		return {
			code: 200,
			msg: "OK",
			data: await QQNtAPI.ntCallAsync(
				postData['eventName'],
				postData['cmdName'],
				postData['args'],
				postData['callBackCmdName'],
				() => {return true},
				false,
				postData['webContentsId'] || '2'
			)
		};
	}
}

/**
 * 获取好友列表<br>
 * result:
 *       user_id: QQ号,
 *       nickname: 昵称,
 *       remark: 备注
 */
class GetFriendList extends BaseApi {
	constructor(){ super("get_friend_list") }

	async handle(postData){
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
	}
}

class SendLike extends BaseApi{

	constructor(){ super("send_like") }

	async handle(postData){
		let user = Data.getInfoByQQ(postData.user_id);
		if(user == null) return OneBotFail(404, "好友不存在");

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelProfileLikeService/setBuddyProfileLike",
			[{
				"doLikeUserInfo":{
					"friendUid": user.uid,
					"sourceId": 71,
					"doLikeCount": postData.times || 1,
					"doLikeTollCount": 0
				}
			}, null]
		))

		if(result.succCounts > 0) return OneBotOK; else return OneBotFail(500, "今日点赞次数已达上限");
	}
}


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
class GetGroupInfo extends BaseApi{

	constructor(){ super("get_group_info") }

	async handle(postData){
		const group = Data.groups[postData.group_id]

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
	}
}

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
class GetGroupMemberList extends BaseApi{

	constructor(){ super("get_group_member_list") }

	async handle(postData){
		let members = await Data.getGroupMemberList(postData.group_id, (postData?.no_cache || false));
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
	}
}

class GetGroupMemberInfo extends BaseApi{
	constructor(){ super("get_group_member_info") }

	async handle(postData){
		let member = await Data.getGroupMemberByQQ(postData.group_id,  postData.user_id, false);
		if(!member) return OneBotFail(404, "用户在群聊中不存在");

		let info = await Data.getGroupMemberInfo(postData.group_id,  postData.user_id, false);
		member.info = info

		return {
			status: 'ok',
			retcode: 0,
			data: {
				group_id: postData.group_id,// 群号
				user_id: member.uin,        // QQ 号
				nickname: member.nick,      // 昵称
				card: member.cardName,      // 群名片／备注
				level: member.memberRealLevel, // 群等级
				role: member.role == 4 ? 'owner' : (member.role == 3 ? 'admin' : (member.role == 2 ? 'member' : 'unknown')),	// 角色，owner 或 admin 或 member

				sex: info?.sex == 1 ? "male" : (info?.sex == 2 ? "female" : "unknown"),
				age: new Date().getFullYear() - info?.birthday_year,
				area: `${info?.country} ${info?.province} ${info?.city}`,

				raw: member
			}
		}
	}
}

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
class getGroupList extends BaseApi{

	constructor(){ super("get_group_list") }

	async handle(postData){
		return {
			status: 'ok',
			retcode: 0,
			data: Object.values(Data.groups).map(group => {
				return{
					'group_id': group.groupCode,
					'group_name': group.groupName,
					'member_count': group.memberCount,
					'max_member_count': group.maxMember,
				}
			})
		};
	}
}

class getGroupMsgMask extends BaseApi{

	constructor(){ super("get_group_msg_mask") }

	async handle(postData){
		const type = {
			1: "接收并提醒",
			2: "收入群助手且不提醒",
			3: "屏蔽消息",
			4: "接受消息但不提醒",
		}
		const groups = Data.groups

		return {
			status: 'ok',
			retcode: 0,
			data:
				(await QQNtAPI.ntCallAsync("ns-ntApi", "nodeIKernelGroupService/getGroupMsgMask", [null, null],
					"nodeIKernelGroupListener/onGroupsMsgMaskResult",
					() => { return true },
					false,
					'3'
				)).payload.groupsMsgMask.map(group => {
					return {
						'group_id': group.groupCode,
						'group_name': groups[group.groupCode].groupName,
						'msg_mask': group.msgMask,
						'msg_type': type[group.msgMask],
					}
				})
		};
	}
}

class KickMember extends BaseApi{

	constructor(){ super("set_group_kick") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');

		let user = await Data.getGroupMemberByQQ(postData.group_id, postData.user_id);
		if(user == null) return OneBotFail(404, "群成员不存在");

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/kickMember",
			[{
				"groupCode": group.groupCode,
				"kickUids":[ user.uid ],
				"refuseForever": !!postData.reject_add_request,
				"kickReason": ""
			}, null]
		))

		if(result.errCode == 0) return OneBotOK; else return OneBotFail(result.errCode);
	}
}

class setGroupAdmin extends BaseApi{

	constructor(){ super("set_group_admin") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, "群不存在");

		let user = await Data.getGroupMemberByQQ(postData.group_id, postData.user_id);
		if(user == null) return OneBotFail(404, "群成员不存在");

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/modifyMemberRole",
			[{
				"groupCode": group.groupCode,
				"uid": user.uid,
				"role": !!postData.enable ? 3 : 2,
			}, null]
		))

		if(result.result == 0) return OneBotOK; else return OneBotFail(result.result, result.errMsg);
	}
}

class setGroupBan extends BaseApi{

	constructor(){ super("set_group_ban") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');

		let user = await Data.getGroupMemberByQQ(postData.group_id, postData.user_id);
		if(user == null) return OneBotFail(404, "群成员不存在");

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/setMemberShutUp",
			[{
				groupCode: group.groupCode,
				memList: [{ uid: user.uid, timeStamp: postData.duration | 0 }]
			}, null]
		))

		if(result.result == 0) return OneBotOK; else return OneBotFail(500, result);
	}
}

class setGroupWholeBan extends BaseApi{

	constructor(){ super("set_group_whole_ban") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');


		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/setGroupShutUp",
			[{
				"groupCode": group.groupCode,
				"shutUp": !!postData.enable
			}, null]
		))

		if(result.result == 0) return OneBotOK; else return OneBotFail(500, result);
	}
}

class setGroupName extends BaseApi{

	constructor(){ super("set_group_name") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');


		if(postData.group_name == null || group.group_name == ""){
			return { status: 'fail', retcode: 500, data: '群名称不能为空' };
		}

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/modifyGroupName",
			[{
				groupCode: group.groupCode,
				groupName: postData.group_name,
			}, null]
		))

		if(result.result == 0) return OneBotOK; else return OneBotFail(500, result);
	}
}

class setGroupSpecialTitle extends BaseApi{

	constructor(){ super("set_group_special_title") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');

		let user = await Data.getGroupMemberByQQ(postData.group_id, postData.user_id);
		if(user == null) return OneBotFail(404, '群成员不存在');

		// {"errCode":0,"errMsg":"success","resultList":[{"uid":"u_uMoA","result":0}]}

		return OneBotFail(404);
	}
}

class setGroupCard extends BaseApi{

	constructor(){ super("set_group_card") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');

		let user = await Data.getGroupMemberByQQ(postData.group_id, postData.user_id);
		if(user == null) return OneBotFail(404, '群成员不存在');

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/modifyMemberCardName",
			[{
				"groupCode": group.groupCode,
				"uid": user.uid,
				"cardName": postData.card || ''
			}, null]
		))

		if(result.result == 0) return OneBotOK; else return OneBotFail(result.result);
	}
}

class setGroupLeave extends BaseApi{

	constructor(){ super("set_group_leave") }

	async handle(postData){
		let group = Data.getGroupById(postData.group_id);
		if(group == null) return OneBotFail(404, '群不存在');

		let result = (await QQNtAPI.ntCall(
			"ns-ntApi",
			"nodeIKernelGroupService/quitGroup",
			[{ "groupCode": group.groupCode }, null]
		))

		if(result.errCode == 0) return OneBotOK; else return OneBotFail(result.errCode);
	}
}

class SetGroupAddRequest extends BaseApi{

	constructor(){ super("set_group_add_request") }

	async handle(postData){
		if(!('flag' in postData)) return OneBotFail(400, "Must provide 'flag'");

		return {
			status: 'ok',
			retcode: 0,
			data: await QQNtAPI.ntCall(
				"ns-ntApi",
				"nodeIKernelGroupService/operateSysNotify",
				[{
					doubt: false,
					operateMsg: {
						operateType: postData.approve ? 1 : 2,
						targetMsg: {
							seq: postData.flag, // 通知序列号
							type: postData.type || postData.sub_type,
							// groupCode: notify.group.groupCode,
							postscript: postData.reason,
						},
					}
				}, null]
			)
		};
	}
}


/**
 * 获取频道系统内BOT的资料
 */
class getGuildProfile extends BaseApi{
	constructor(){ super('get_guild_service_profile'); }
	async handle(postData){
		let data = await QQNtAPI.ntCall("ns-GuildInitApi", "ensureLoginInfo", [])
		Data.guildInfo.tiny_id = data.tinyId;

		return {
			status: 'ok',
			retcode: 0,
			data: Data.guildInfo
		};
	}
}


/**
 * 获取频道列表
 */
class getGuildList extends BaseApi{
	constructor(){ super('get_guild_list'); }
	async handle(postData){
		Data.guilds = await QQNtAPI.getGuildList();
		return {
			status: 'ok',
			retcode: 0,
			data: Object.values(Data.guilds)
		}
	}
}


/**
 * 发送信息到子频道
 */
class SendGuildMsg extends BaseApi{
	constructor(){ super('send_guild_channel_msg'); }
	async handle(postData){
		let guild = Data.guilds[postData.guild_id];
		if(!guild && guild.channel_list.includes(postData.channel_id)){
			return {
				status: 'failed',
				retcode: 404,
				msg: `找不到频道 (${postData.guild_id}/${postData.channel_id})`
			}
		}
		let peer = {
			chatType: 4,
			peerUid: postData.channel_id,
			guildId: postData.guild_id
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
		oneBotMsg.message_type = "guild";
		oneBotMsg.sub_type = "message";
		oneBotMsg.guild_id = qqNtMsg.guildId;
		oneBotMsg.channel_id = qqNtMsg.channelId;

		Log.i(`发送频道 (${postData.guildId}/${qqNtMsg.channelId}) 消息：${oneBotMsg.raw_message}`);

		Data.pushHistoryMessage(qqNtMsg, oneBotMsg);

		return {
			status: 'ok',
			retcode: 0,
			data: { message_id: qqNtMsg.msgId }
		};
	}
}


module.exports = {
	api: [
		new BaseApi(''),

		new NtCall(),
		new NtCallAsync(),

		new GetFriendList(),

		new SendLike(),

		new GetGroupInfo(),
		new GetGroupMemberList(),
		new GetGroupMemberInfo(),
		new getGroupList(),
		new getGroupMsgMask(),

		new KickMember(),

		new setGroupAdmin(),
		new setGroupBan(),
		new setGroupWholeBan(),
		new setGroupName(),
		new setGroupCard(),
		new setGroupLeave(),

		new SendGuildMsg(),
		new getGuildList(),
		new getGuildProfile()
	]
}