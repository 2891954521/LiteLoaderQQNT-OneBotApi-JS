const fs = require("fs");
const utils = require("../utils");
const { Data } = require('../main/core');
const { Log } = require("../logger");
const { QQNtAPI } = require('../qqnt/QQNtAPI');

/**
 * 消息的基类
 * @class Message
 */
class Message{
	/**
	 * @param type {string}
	 * @param data {Object}
	 */
	constructor(type, data){
		this.type = type
		this.data = data
	}

	toCqCode(){
		return `[CQ:${this.type}]`;
	}

	/**
	 * @return Object
	 */
	toQQNT(){
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

	/**
	 * 从QQNTMsg创建OneBot11Message
	 * @param QQNTMsg {QQNTMessage}
	 * @param element
	 * @return {Promise<Message> | Message}
	 */
	static parseFromQQNT(QQNTMsg, element){
		return new Message("unsupportType",{raw: element})
	}
}


class Text extends Message{
	/**
	 * @param text {string}
	 */
	constructor(text){
		super("text", {
			text: text
		});
	}

	toCqCode(){
		return this.data.text;
	}

	toQQNT(){
		return {
			elementType: 1,
			elementId: "",
			textElement: {
				content: this.data.text,
				atType: 0,
				atUid: "",
				atTinyId: "",
				atNtUid: "",
			}
		}
	}

	static parseFromQQNT(QQNTMsg, element){
		return new Text(element.textElement.content)
	}
}


/**
 * 表情消息
 */
class Face extends Message{

	/**
	 * @param id {number}
	 */
	constructor(id){
		super("face", {
			id: id
		});
	}

	toCqCode(){
		return `[CQ:face,id=${this.data.id}]`;
	}

	toQQNT(){
		return {
			elementType: 6,
			elementId: "",
			faceElement: {
				faceIndex: this.data.id,
				faceType: 1,
			}
		}
	}

	static parseFromQQNT(QQNTMsg, element){
		return new Face(element.faceElement.faceIndex)
	}
}


class At extends Message{

	/**
	 * @param atAll {boolean}
	 * @param member {GroupMember | null}
	 */
	constructor(atAll = false, member = null){
		super("at", {
			qq: atAll ? "all" : (member?.uin ? member.uin : "")
		});
		this.member = member;
	}

	toCqCode(){
		return `[CQ:at,qq=${this.data.qq}]`;
	}

	 toQQNT(){
		if(this.data.qq === 'all'){
			return {
				elementType: 1,
				elementId: "",
				textElement: {
					"content": "@全体成员",
					"atType": 1,
					"atUid": "0"
				}
			}
		}else{
			return {
				elementType: 1,
				elementId: "",
				textElement: {
					"content": this.member.cardName,
					"atType": 2,
					"atUid": this.member.uid,
					"atNtUid": this.member.uid,
					"atTinyId": "",
				}
			}
		}
	}

	static async createAt(group, qq){
		if(group){
			let member = await Data.getGroupMemberByQQ(group, qq);
			if(member){
				return new At(false, member);
			}else{
				throw `群成员 QQ(${qq}) 不在 群(${group}) 里`;
			}
		}else{
			throw 'Must provide group'
		}
	}

	static async parseFromQQNT(QQNTMsg, element){
		if(element.textElement.atType == 1){
			return new At(true, null)
		}else if(element.textElement.atType == 2){
			return new At(false, await Data.getGroupMemberByUid(QQNTMsg.peerUid, element.textElement.atNtUid))
		}else{
			return new At(false, null)
		}
	}
}


class Image extends Message{

	/**
	 * @param data {Object}
	 * @param filePath
	 * @param fileName
	 * @param fileSize
	 * @param width
	 * @param height
	 */
	constructor(data, filePath = "", fileName = "", fileSize = 0, width = 0, height = 0,){
		super("image", data);
		this.filePath = filePath;
		this.fileName = fileName;
		this.fileSize = fileSize;
		this.width = width;
		this.height = height;
	}

	toCqCode(){
		return `[CQ:image,md5=${this.data.md5}]`;
	}

	toQQNT(){
		return {
			elementType: 2,
			elementId: "",
			picElement: {
				md5HexStr: this.data.md5,
				fileSize: this.fileSize,
				picWidth: this.width,
				picHeight: this.height,
				fileName: this.fileName,
				sourcePath: this.filePath,
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

	/**
	 * @return {Promise<Image> | Promise<Text>}
	 */
	static async createImage(url){
		let file;

		if(url.startsWith("file://")){
			file = url.split("file://")[1];

		}else if(url.startsWith("http://") || url.startsWith("https://")){
			Log.e('暂不支持发送非本地图片');
			return new Text("[图片]");

		}else{
			file = url;
		}

		if(!fs.existsSync(file)){
			Log.e('发送图片失败，图片文件不存在');
			return new Text("[图片]");
		}

		const md5 = utils.md5(file);
		const ext = file.substring(file.lastIndexOf('.') + 1);
		const fileName = `${md5}.${ext}`;

		const filePath = await QQNtAPI.ntCall("ns-ntApi", "nodeIKernelMsgService/getRichMediaFilePathForGuild", [
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
			return new Text("[图片]");
		}

		fs.copyFileSync(file, filePath, fs.constants.COPYFILE_FICLONE);

		const fileSize = fs.statSync(filePath).size;

		const imageSize = await QQNtAPI.ntCall("ns-FsApi", "getImageSizeFromPath", [filePath]);

		if(!imageSize?.width || !imageSize?.height){
			Log.e(`发送图片失败，无法获取图片大小, path: ${filePath}, name: ${fileName}`);
			return new Text("[图片]");
		}
		return new Image({
			file: filePath.startsWith("/") ? "file://" : "file:///" + filePath,
			url: "",
			md5: md5,
		}, filePath, fileName, fileSize, imageSize.width, imageSize.height)
	}


	static async parseFromQQNT(QQNTMsg, element){
		let picElement = element.picElement;

		// if(!fs.existsSync(picElement.sourcePath)){
		// 	await QQNtAPI.ntCall("ns-ntApi", "nodeIKernelMsgService/downloadRichMedia", [{
		// 		getReq: {
		// 			msgId: QQNTMsg.msgId,
		// 			elementId: element.elementId,
		// 			chatType: QQNTMsg.chatType,
		// 			peerUid: QQNTMsg.peerUid,
		// 			thumbSize: 0,
		// 			downloadType: 2,
		// 			filePath: picElement.thumbPath.get(0),
		// 		},
		// 	}, undefined,
		// 	]);
		// }

		return new Image({
			file: picElement.sourcePath.startsWith("/") ? "file://" : "file:///" + picElement.sourcePath,
			url: 'https://c2cpicdw.qpic.cn' + picElement.originImageUrl,
			md5: picElement.md5HexStr.toUpperCase()
		}, picElement.sourcePath, picElement.fileName, picElement.fileSize, picElement.picWidth, picElement.picHeight)
	}
}


class File extends Message{
	/**
	 * @param data {Object}
	 */
	constructor(data){
		super("file", data);
	}

	toCqCode(){
		return `[CQ:file,id=${this.data.name}]`;
	}

	toQQNT(){
		return new Text("").toQQNT()
	}

	static parseFromQQNT(QQNTMsg, element){
		let fileElement = element.fileElement
		if(fileElement){
			return new File({
				name: fileElement.fileName,
				size: parseInt(fileElement.fileSize),
				elementId: element.elementId
			})
		}else{
			return new File({})
		}
	}
}


class Reply extends Message{
	/**
	 * @param data {Object}
	 */
	constructor(data){
		super("reply", data);
	}

	toCqCode(){
		return `[CQ:reply,id=${this.data.id}]`;
	}

	toQQNT(){
		let msg = Data.historyMessage.get(this.data.id);
		if(!msg) throw `无法找到回复的消息`;
		return {
			elementType: 7,
			elementId: "",
			replyElement: {
				"replayMsgId": this.data.id,
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

	static parseFromQQNT(QQNTMsg, element){
		let replyMsg = QQNTMsg.records?.[0];
		if(replyMsg){
			return new Reply({
				id: replyMsg.msgId
			})
		}else{
			Log.w(`无法解析回复消息`);
			return new Reply({})
		}
	}
}


/**
 * 窗口抖动
 */
class Shake extends Message{

}

/**
 * Json消息
 */
class Ark extends Message{
	/**
	 * @param data {Object}
	 */
	constructor(data){
		super("json", data);
	}

	toCqCode(){
		return `[CQ:json,data=${this.data.data}]`;
	}

	toQQNT(){
		return {
			elementType: 10,
			elementId: "",
			arkElement: {
				"bytesData": JSON.stringify(this.data.data),
				"linkInfo": null,
				"subElementType": null
			}
		}
	}

	static parseFromQQNT(QQNTMsg, element){
		return new Ark({ data: element.arkElement.bytesData })
	}
}

/**
 * 转发消息
 */
class Forward extends Message{
	/**
	 * @param data {Object}
	 */
	constructor(data){
		super("forward", data);
	}

	toCqCode(){
		return `[CQ:forward,id=${this.data.id}]`;
	}

	toQQNT(){
		return new Text("[聊天记录]").toQQNT()
	}

	static parseFromQQNT(QQNTMsg, element){
		return new Forward({ id: QQNTMsg.msgId })
	}
}


class MarkDown extends Message{

	constructor(content){
		super("markdown", {
			content: content
		});
	}

	toCqCode(){
		return this.data.content;
	}

	toQQNT(){
		return new Text("[MarkDown消息]").toQQNT()
	}

	static parseFromQQNT(QQNTMsg, element){
		return new MarkDown(element.markdownElement.content)
	}
}


/**
 * 从Json中创建QQNTMessage
 * @param oneBotMsg {Object}
 * @param group_id {number | null}
 * @return Message
 */
async function createOneBot(oneBotMsg, group_id = null){
	switch(oneBotMsg.type){
		case 'text':
			return new Text(oneBotMsg.data.text);

		case 'face':
			return new Face(oneBotMsg.data.id);

		case 'at':
			if(oneBotMsg.data.qq == 'all'){
				return new At(true);
			}else{
				return (await At.createAt(group_id, oneBotMsg.data.qq));
			}

		case 'image':
			return (await Image.createImage(oneBotMsg.data.file));

		case 'file':
			return new File(oneBotMsg.data);

		case 'reply':
			return new Reply(oneBotMsg.data);

		case 'json':
			return new Ark(oneBotMsg.data.data);

		case 'markdown':
			return new MarkDown(oneBotMsg.data.content);

		// case 'shake':
		// 	return Shake.OneBot2QQNT(item);
		default:
			throw '无法解析的消息类型: ' + oneBotMsg.type;
	}
}

/**
 * @return {Promise<Message>}
 */
async function parseFromQQNT(QQNTMessage, element){
	switch(element.elementType){
		// 文本消息和At消息
		case 1: {
			let textElement = element.textElement;
			if(textElement.atType == 0){
				return Text.parseFromQQNT(QQNTMessage, element);
			}else{
				return await At.parseFromQQNT(QQNTMessage, element);
			}
		}

		// 图片消息
		case 2: return await Image.parseFromQQNT(QQNTMessage, element);

		// 文件消息
		case 3: return File.parseFromQQNT(QQNTMessage, element);

		// 表情消息
		case 6:
			let faceElement = element.faceElement;
			if(faceElement.faceType == 5) return Shake.parseFromQQNT(QQNTMessage, element);
			return Face.parseFromQQNT(QQNTMessage, element);

		// 回复消息
		case 7: return Reply.parseFromQQNT(QQNTMessage, element);

		// Json消息
		case 10: return Ark.parseFromQQNT(QQNTMessage, element);

		// MD消息
		case 14: return MarkDown.parseFromQQNT(QQNTMessage, element);

		// 转发消息
		case 16: return Forward.parseFromQQNT(QQNTMessage, element)

		default:
			return Message.parseFromQQNT(QQNTMessage, element)
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
	createOneBot,
	parseFromQQNT
}