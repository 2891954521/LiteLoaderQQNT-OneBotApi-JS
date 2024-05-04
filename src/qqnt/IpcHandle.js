/**
 * 客户端内部消息处理模块
 */

const Api = require("./api");

const handleCmd = new Map()

for(let item of Api.api){
	for(let key of item.cmdNames){
		handleCmd.set(key, item.handle)
	}
}

/**
 * 解析向渲染进程发送的消息
 */
function onMessageHandle(cmdObject){
	handleCmd.get(cmdObject.cmdName)?.(cmdObject);
}

module.exports = {
	onMessageHandle
}