/**
 * 消息处理模块
 */

const fs = require("fs");

const { Data, RuntimeData, Setting } = require('../main/core');
const { IPCAction } = require("../common/const");

const { Log } = require('../logger');
const utils = require("../utils");


/**
 * 创建发送消息的对象
 * @param postData
 * @return { {
 * 		peerUid: string,
 * 		guildId: string,
 * 		chatType: number
 * } | null }
 */
function createPeer(postData){
	if(postData["group_id"]){
		let group = Data.getGroupByUid(postData['group_id']);

		if(group === null){
			Log.e(`Unable to find group with ${postData['group_id']}`);
			return null;

		}else{
			return {
				chatType: 2,
				peerUid: group.groupCode,
				guildId: ""
			}
		}
	}else if(postData["user_id"]){
		let friend = Data.getUserByQQ(postData['user_id']);

		if(friend === null){
			Log.e(`Unable to find friend with QQ ${postData['user_id']}`);
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


/**
 * 创建文本消息
 * @param content 文本内容
 */
function createText(content){
	return {
		elementType: 1,
		elementId: "",
		textElement: {
			content: content,
			atType: 0,
			atUid: "",
			atTinyId: "",
			atNtUid: "",
		}
	};
}


/**
 * 创建表情消息
 * @param id 表情ID
 */
function createFace(id) {
	return {
		elementType: 6,
		elementId: "",
		faceElement: {
			faceIndex: id,
			faceType: 1,
		}
		// {
		// 	"elementType": 6,
		// 	"elementId": "",
		// 	"faceElement": {
		// 		"faceIndex": 317,
		// 		"faceText": "[鑿滄豹]",
		// 		"faceType": 2,
		// 		"packId": "1",
		// 		"stickerId": "7",
		// 		"stickerType": 1,
		// 		"sourceType": 1,
		// 		"resultId": "",
		// 		"superisedId": "",
		// 		"randomType": 1
		// 	}
		// },
	};
}


/**
 * 创建图片消息
 * @param {string} url 以 file:// 或 http(s):// 开头或者直接为文件路径
 */
async function createImage(url) {
	let file;

	if(url.startsWith("file://")){
		file = url.split("file://")[1];

	}else if(url.startsWith("http://") || url.startsWith("https://")){
		return createText("暂不支持发送非本地图片");

	}else{
		file = url;
	}

	if(!fs.existsSync(file)){
		Log.e('发送图片失败，图片文件不存在');
		return createText("[图片]");
	}

	const md5 = utils.md5(file);
	const ext = file.substring(file.lastIndexOf('.') + 1);

	const fileName = `${md5}.${ext}`;
	const filePath = await RuntimeData.ntCall(
		"ns-ntApi",
		"nodeIKernelMsgService/getRichMediaFilePath",
		[{
			md5HexStr: md5,
			fileName: fileName,
			elementType: 2,
			elementSubType: 0,
			thumbSize: 0,
			needCreate: true,
			fileType: 1,
		}]
	);

	if(typeof filePath !== 'string' || filePath.trim() === ''){
		Log.e('发送图片失败，无法创建图片文件');
		return createText("[图片]");
	}

	fs.copyFileSync(file, filePath, fs.constants.COPYFILE_FICLONE);

	const fileSize = fs.statSync(filePath).size;

	const imageSize = await RuntimeData.ntCall("ns-fsApi", "getImageSizeFromPath", [file]);

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


async function downloadMedia(msgId, elementId, peerUid, chatType, filePath, originalFilePath) {
	if(fs.existsSync(originalFilePath)) return;
	return await RuntimeData.ntCall("ns-ntApi", "nodeIKernelMsgService/downloadRichMedia", [{
			getReq: {
				msgId: msgId,
				chatType: chatType,
				peerUid: peerUid,
				elementId: elementId,
				thumbSize: 0,
				downloadType: 2,
				filePath: filePath,
			},
		}, undefined,
	]);
}


/**
 * 发送消息
 * @param postData
 */
async function sendMessage(postData){
    let peer = createPeer(postData);

	if(!peer) return;

    let messages = [];

    if(postData.message.constructor === String){
        messages.push(createText(postData.message));

		if(Setting.setting.debug.debug){
			if(postData.group_id){
				Log.i(`发送群 (${postData.group_id}) 消息：${postData.message}`);
			}else{
				Log.i(`发送好友 (${postData.user_id}) 消息：${postData.message}`);
			}
		}
    }else{
        for(let message of postData.message){
            if(message.type === "text"){
                messages.push(createText(message.data.text));
            }else if (message.type === "image"){
				messages.push(await createImage(message.data.file));
			}else if (message.type === "face"){
				messages.push(createFace(message.data.id));
			}else if (message.type === "raw") {
				// return messages.push(messages.data)
			}
        }

		if(Setting.setting.debug.debug){
			let content = postData.message.map(item => item.type === "text" ? item.data.text : `[${item.type}]`).join('');
			if(postData.group_id){
				Log.i(`发送群 (${postData.group_id}) 消息：${content}`);
			}else{
				Log.i(`发送好友 (${postData.user_id}) 消息：${content}`);
			}
		}
    }

	RuntimeData.mainPage.send(IPCAction.ACTION_NT_CALL, {
        'eventName': "ns-ntApi",
        'cmdName': "nodeIKernelMsgService/sendMsg",
        'args': [{
            msgId: "0",
            peer: peer,
            msgElements: messages,
			msgAttributeInfos: new Map()
        }, null]
    });

	return 'OK';
}

/**
 * 处理新消息
 */
async function handleNewMessage(messages){
	for(let message of messages){

		let msgData = {
			time: 0,
			self_id: Data.selfInfo.uin,
			post_type: "message",
			message_id: message.msgId,
			message: []
		}

		if(message.chatType === 1){
			msgData["message_type"] = "private";
			msgData["sub_type"] = "friend";

			msgData["user_id"] = Data.getUserByUid(message.senderUid)?.uin;

		}else if(message.chatType === 2){
			msgData["message_type"] = "group";
			msgData["sub_type"] = "normal";

			msgData["group_id"] = message.peerUid;

			msgData.user_id = Data.userMap[message.senderUid];

			if(!msgData.user_id){
				if(Data.groupMember.hasOwnProperty(message.senderUid)){
					msgData.user_id = Data.groupMember[message.senderUid].uin;
				}else{
					Log.d(`联网查找用户信息: uid(${message.senderUid})`);
					let user = await RuntimeData.getUserInfoByUid(message.senderUid);
					Log.d(`找到用户: ${user.nick}(${user.uin})`);
					Data.groupMember[message.senderUid] = user;
					msgData.user_id = user.uin;
				}
			}
		}

		if(!msgData.user_id){
			Log.w(`无法获取发送者QQ号: uid: ${message.senderUid}`);
			continue;
		}

		for(let element of message.elements){
			let msgChain = { };

			switch(element.elementType){
				// 文本类消息
				case 1: {
					let textElement = element.textElement;
					if(textElement.atType === 1){
						// at全体成员
						msgChain.type = "at";
						msgChain.data = { qq: 'all' };

					}else if(textElement.atType === 2){
						// at消息
						msgChain.type = "at";
						msgChain.data = {
							qq: Data.getUserByUid(textElement.atNtUid).uin
						};

					}else{
						// 纯文本消息
						msgChain.type = "text";
						msgChain.data = {
							text: textElement.content
						};
					}
					break;
				}

				// 图片消息
				case 2: {
					let picElement = element.picElement;
					msgChain.type = "image";
					msgChain.data = {
						downloadedPromise: await downloadMedia(message.msgId, element.elementId, message.peerUid, message.chatType, picElement.thumbPath.get(0), picElement.sourcePath),
						file: picElement.sourcePath.startsWith("/") ? "file://" : "file:///" + picElement.sourcePath
					};
					break;
				}

				// 文件消息
				case 3: {
					let fileElement = element.fileElement
					if(fileElement){
						msgChain.type = "file";
						msgChain.data = {
							name: fileElement.fileName,
							size: parseInt(fileElement.fileSize),
							elementId: element.elementId
						};
					}
					break;
				}

				// 表情消息
				case 6: {
					msgChain.type = "face";
					msgChain.data = {
						id: element.faceElement.faceIndex,
						type: element.faceElement.faceType
					};
					break;
				}

				// 回复消息
				case 7: {
					msgChain.type = "reply";
					msgChain.data = {
						id: message.msgId
					};
					break;
				}

				default:
					msgChain.type = "unsupportType";
					msgChain.data = element;
			}

			msgData["message"].push(msgChain)
		}

		if(Log.isDebug){
			let content = msgData.message.map(item => item.type === "text" ? item.data.text : `[${item.type}]`).join('');
			if(msgData.group_id){
				Log.i(`收到群 (${msgData.group_id}) 内 (${msgData.user_id}) 的消息：${content}`);
			}else{
				Log.i(`收到好友 (${msgData.user_id}) 的消息：${content}`);
			}
		}

		postHttpData(msgData);
	}
}

// ===================
// HTTP上报模块
// ===================

/**
 * 上报HTTP消息
 * @param {*} postData
 */
function postHttpData(postData){
	if(!Setting.setting.http.enable) return;

	try{
		fetch(Setting.setting.http.host, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(postData)
		}).then((res) => {

		}, (err) => {
			Log.w(`http report fail: ${err}\n${JSON.stringify(postData)}`);
		});
	}catch(e){
		Log.e(e.toString());
	}
}

/**
 * 发送通知上报
 * @param {*} postData
 */
function postNoticeData(postData){
	postData['time'] = 0;
	postData['self_id'] = Data.selfInfo.uin;
	postData['post_type'] = "notice";
	postHttpData(postData);
}

/**
 * 发送通知上报
 * @param {*} postData
 */
function postRequestData(postData){
	postData['time'] = 0;
	postData['self_id'] = Data.selfInfo.uin;
	postData['post_type'] = "request";
	postHttpData(postData);
}


module.exports = {
    sendMessage,

    handleNewMessage,

	postHttpData,
	postNoticeData,
	postRequestData,
}