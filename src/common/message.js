const {Data, Runtime} = require('../main/core');
const {Log} = require("../logger");
const fs = require("fs");
const utils = require("../utils");

/**
 * 消息的基类
 * @class Message
 */
class Message{

	constructor(){
		if(this.constructor == Message){
			throw new Error("Abstract classes can't be instantiated.");
		}
	}

	static QQNT2OneBot(element){
		return {
			type: "unsupportType",
			data: {raw: element}
		}
	}

	static OneBot2QQNT(item){
		return {
			elementType: 1,
			elementId: "",
			textElement: {
				content: "",
				atType: 0,
				atUid: "",
				atTinyId: "",
				atNtUid: "",
			}
		}
	}

	static OneBot2CqCode(item){
		return item.data.text;
	}

}

class Text extends Message{

	static QQNT2OneBot(element){
		return {
			type: "text",
			data: {text: element.textElement.content}
		}
	}

	static OneBot2QQNTFast(text){
		return {
			elementType: 1,
			elementId: "",
			textElement: {
				content: text,
				atType: 0,
				atUid: "",
				atTinyId: "",
				atNtUid: "",
			}
		}
	}

	static OneBot2QQNT(item){
		return {
			elementType: 1,
			elementId: "",
			textElement: {
				content: item.data.text,
				atType: 0,
				atUid: "",
				atTinyId: "",
				atNtUid: "",
			}
		}
	}

	static OneBot2CqCode(item){
		return item.data.text;
	}
}


/**
 * 表情消息
 */
class Face extends Message{

	// "faceElement": {
	// 	"faceIndex": 317,
	// 	"faceText": "[鑿滄豹]",
	// 	"faceType": 2,
	// 	"packId": "1",
	// 	"stickerId": "7",
	// 	"stickerType": 1,
	// 	"sourceType": 1,
	// 	"resultId": "",
	// 	"superisedId": "",
	// 	"randomType": 1
	// }

	static QQNT2OneBot(element){
		return {
			type: "face",
			data: {id: element.faceElement.faceIndex}
		}
	}

	static OneBot2QQNT(item){
		return {
			elementType: 6,
			elementId: "",
			faceElement: {
				faceIndex: item.data.id,
				faceType: 1,
			}
		}
	}

	static OneBot2CqCode(item){
		return '[CQ:face,id=' + item.data.id + ']';
	}

}


class At{

	static async QQNT2OneBot(element, group){
		if(element.textElement.atType == 1){
			return {type: "at", data: {qq: 'all'}}
		}else if(element.textElement.atType == 2){
			return {
				type: "at", data: {
					qq: (await Data.getGroupMemberByUid(group, element.textElement.atNtUid))?.uin || ""
				}
			}
		}else{
			return {type: "at", data: {qq: ""}}
		}
	}

	static async OneBot2QQNT(item, group){
		if(item.data.qq === 'all') return {
			elementType: 1,
			elementId: "",
			textElement: {
				"content": "@全体成员",
				"atType": 1,
				"atUid": "0"
			}
		}

		let member = await Data.getGroupMemberByQQ(group, item.data.qq);
		if(!member){
			throw `群成员 QQ(${item.data.qq}) 不在 群(${group}) 里`;
		}else{
			return {
				elementType: 1,
				elementId: "",
				textElement: {
					"content": member.cardName,
					"atType": 2,
					"atUid": member.uid,
					"atNtUid": member.uid,
					"atTinyId": "",
				}
			}
		}
	}

	static OneBot2CqCode(item){
		return '[CQ:at,qq=' + item.data.qq + ']';
	}
}


class Image{

	static async QQNT2OneBot(element, message){
		let picElement = element.picElement;

		if(!fs.existsSync(picElement.sourcePath)){
			await Runtime.ntCall("ns-ntApi", "nodeIKernelMsgService/downloadRichMedia", [{
				getReq: {
					msgId: message.msgId,
					elementId: element.elementId,
					chatType: message.chatType,
					peerUid: message.peerUid,
					thumbSize: 0,
					downloadType: 2,
					filePath: picElement.thumbPath.get(0),
				},
			}, undefined,
			]);
		}

		return {
			type: "image",
			data: {
				file: picElement.sourcePath.startsWith("/") ? "file://" : "file:///" + picElement.sourcePath
			}
		}
	}

	static async OneBot2QQNT(item){
		let url = item.data.file;
		let file;

		if(url.startsWith("file://")){
			file = url.split("file://")[1];

		}else if(url.startsWith("http://") || url.startsWith("https://")){
			Log.e('暂不支持发送非本地图片');
			return Text.OneBot2QQNTFast("暂不支持发送非本地图片");

		}else{
			file = url;
		}

		if(!fs.existsSync(file)){
			Log.e('发送图片失败，图片文件不存在');
			return Text.OneBot2QQNTFast("[图片]");
		}

		const md5 = utils.md5(file);
		const ext = file.substring(file.lastIndexOf('.') + 1);

		const fileName = `${md5}.${ext}`;
		// const filePath = await RuntimeData.ntCall(
		// 	"ns-ntApi",
		// 	"nodeIKernelMsgService/getRichMediaFilePath",
		// 	[{
		// 		md5HexStr: md5,
		// 		fileName: fileName,
		// 		elementType: 2,
		// 		elementSubType: 0,
		// 		thumbSize: 0,
		// 		needCreate: true,
		// 		fileType: 1,
		// 	}]
		// );

		const filePath = await Runtime.ntCall("ns-ntApi", "nodeIKernelMsgService/getRichMediaFilePathForGuild", [
			{
				path_info: {
					md5HexStr: md5,
					fileName: fileName,
					elementType: 2,
					elementSubType: 0,
					thumbSize: 0,
					needCreate: true,
					downloadType: 1,
					file_uuid: ""
				}
			}
		]);

		if(typeof filePath !== 'string' || filePath.trim() === ''){
			Log.e(`发送图片失败，无法创建图片文件, path: ${filePath}, name: ${fileName}`);
			return Text.OneBot2QQNTFast("[图片]");
		}

		// fs.copyFileSync(file, filePath, fs.constants.COPYFILE_FICLONE);

		const fileSize = fs.statSync(filePath).size;

		const imageSize = await Runtime.ntCall("ns-FsApi", "getImageSizeFromPath", [filePath]);

		if(!imageSize?.width || !imageSize?.height){
			Log.e(`发送图片失败，无法获取图片大小, path: ${filePath}, name: ${fileName}`);
			return Text.OneBot2QQNTFast("[图片]");
		}

		return {
			elementType: 2,
			elementId: "",
			picElement: {
				md5HexStr: md5,
				fileSize: fileSize,
				picWidth: imageSize.width,
				picHeight: imageSize.height,
				fileName: fileName,
				sourcePath: filePath,
				original: true,
				picType: 1001,
				picSubType: 0,
				fileUuid: "",
				fileSubId: "",
				thumbFileSize: 0,
				summary: "",
			}
		};
	}

	static OneBot2CqCode(item){
		return '[CQ:image,file=' + item.data.file + ']';
	}
}


class File extends Message{

	static QQNT2OneBot(element){
		let fileElement = element.fileElement
		if(fileElement){
			return {
				type: "file",
				data: {
					name: fileElement.fileName,
					size: parseInt(fileElement.fileSize),
					elementId: element.elementId
				}
			}
		}else{
			return {
				type: "file",
				data: {}
			}
		}
	}

	// static OneBot2QQNT(item){ }

	static OneBot2CqCode(item){
		return '[CQ:file,file=' + item.data.name + ']';
	}

}


class Reply extends Message{

	static QQNT2OneBot(element, message){
		let replyMsg = message.records?.[0];
		if(!replyMsg){
			Log.w(`无法解析回复消息`);
			return {type: "reply", data: {}}
		}else{
			return {
				type: "reply",
				data: {
					id: replyMsg.msgId,
					seq: replyMsg.msgSeq
				}
			}
		}
	}

	static OneBot2QQNT(item){
		let msg = Data.historyMessage.get(item.data.id);
		if(!msg){
			throw `无法找到回复的消息`;
		}
		return {
			elementType: 7,
			elementId: "",
			replyElement: {
				"replayMsgId": item.data.id,
				"replayMsgSeq": msg.msgSeq,
				"sourceMsgText": "",
				"senderUid": msg.senderUid,
				"senderUidStr": msg.senderUid,
				"replyMsgClientSeq": "",
				"replyMsgTime": "",
				"replyMsgRevokeType": 0,
				"sourceMsgTextElems": [],
				"sourceMsgIsIncPic": false,
				"sourceMsgExpired": false
			}
		}
	}

	static OneBot2CqCode(item){
		return '[CQ:reply,id=' + item.data.id + ']';
	}

}

/**
 * 窗口抖动
 */
class Shake extends Message{

	static QQNT2OneBot(element){
		return {
			type: "shake",
			data: { }
		}
	}

	static OneBot2QQNT(item){
		return {
			"elementId": "0",
			"elementType": 6,
			"faceElement": {"faceIndex": 0, "faceType": 5, "msgType": 0, "pokeType": 1, "pokeStrength": 0}
		}
	}

	static OneBot2CqCode(item){
		return '[CQ:shake]';
	}
}

function OneBot2CqCode(item){
	switch(item.type){
		case 'text':
			return Text.OneBot2CqCode(item);
		case 'face':
			return Face.OneBot2CqCode(item);
		case 'at':
			return At.OneBot2CqCode(item);
		case 'image':
			return Image.OneBot2CqCode(item);
		case 'file':
			return File.OneBot2CqCode(item);
		case 'reply':
			return Reply.OneBot2CqCode(item);
		case 'shake':
			 return Shake.OneBot2CqCode(item);
	}
}

async function OneBot2QQNT(item){
	switch(item.type){
		case 'text':
			return Text.OneBot2QQNT(item);
		case 'face':
			return Face.OneBot2QQNT(item);
		case 'at':
			return await At.OneBot2QQNT(item);
		case 'image':
			return await Image.OneBot2QQNT(item);
		case 'file':
			return File.OneBot2QQNT(item);
		case 'reply':
			return Reply.OneBot2QQNT(item);
		// case 'shake':
		// 	return Shake.OneBot2QQNT(item);
		default:
			throw '无法解析的消息类型: ' + item.type;
	}
}

async function QQNT2OneBot(element, message){
	switch(element.elementType){
		// 文本消息和At消息
		case 1: {
			let textElement = element.textElement;
			if(textElement.atType == 0) return Text.QQNT2OneBot(element);
			else return await At.QQNT2OneBot(element, message.peerUid);
		}

		// 图片消息
		case 2: return await Image.QQNT2OneBot(element, message);

		// 文件消息
		case 3: return File.QQNT2OneBot(element);

		// 表情消息
		case 6:
			let faceElement = element.faceElement;
			if(faceElement.faceType == 5) return Shake.QQNT2OneBot(element);
			return Face.QQNT2OneBot(element);

		// 回复消息
		case 7: return Reply.QQNT2OneBot(element, message);

		default:
			return {
				type: "unsupportType",
				data: element
			}
	}
}

/**
 * 创建发送消息的对象
 * @param group_id
 * @param user_id
 * @return { {
 * 		peerUid: string,
 * 		guildId: string,
 * 		chatType: number
 * } | null }
 */
function createPeer(group_id, user_id){
	if(group_id){
		let group = Data.getGroupById(group_id);

		if(!group){
			Log.e(`Unable to find group with ${group_id}`);
			return null;

		}else{
			return {
				chatType: 2,
				peerUid: group.groupCode,
				guildId: ""
			}
		}
	}else if(user_id){
		let friend = Data.getInfoByQQ(user_id);

		if(!friend){
			Log.e(`Unable to find friend with QQ ${user_id}`);
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


module.exports = {
	Text,
	Face,
	At,
	Image,
	File,
	Reply,

	createPeer,

	OneBot2CqCode,
	OneBot2QQNT,
	QQNT2OneBot
}