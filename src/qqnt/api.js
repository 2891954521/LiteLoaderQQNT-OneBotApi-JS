const {Log} = require("../logger");
const {Data} = require("../main/core");

class BaseApi{
	constructor(cmdName){
		this.cmdName = cmdName;
	}
	handle(cmdObject){

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


module.exports = {
	api: [
		new RefreshGuildInfo()
	]
}