const {Data} = require("../main/core");
const {createPeer, Text, createOneBot} = require("./message");
const Event = require("./event");
const {QQNtAPI} = require("../qqnt/QQNtAPI");
const {Log} = require("../logger");
const {oneBot11API} = require("./oneBot11");

class BaseApi{
	constructor(url){
		this.url = url;
	}
	async handle(postData){
		return {
			code: 0,
			msg: "Http server is running"
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
		new SendGuildMsg(),
		new getGuildList(),
		new getGuildProfile()
	]
}