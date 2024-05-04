const {Data} = require("../main/core");
const {Text, createOneBot} = require("./message");
const Event = require("./event");
const {QQNtAPI} = require("../qqnt/QQNtAPI");
const {Log} = require("../logger");


class BaseApi{
	constructor(url){
		this.url = url;
	}
	async handle(postData){
		return {
			status: "ok",
			retcode: 0
		};
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

		new getGroupList(),
		new getGroupMsgMask(),

		new SendGuildMsg(),
		new getGuildList(),
		new getGuildProfile()
	]
}