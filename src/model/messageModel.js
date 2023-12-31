/**
 * 消息处理模块
 */

const { Data, RuntimeData } = require('../main/core');
const { IPCAction } = require("../common/const");

/**
 * 发送消息
 * @param postData
 */
function sendMessage(postData){
    let peer = null;
    let message = [];

    if(postData["user_id"]){

        let friend = Data.getUserByQQ(postData['user_id']);

        if(friend === null){
            log(`Unable to find friend with QQ ${postData['user_id']}`);
            return;
        }

        peer = {
            chatType: 1,
            peerUid: friend.uid,
            guildId: ""
        }

    }else if(postData["group_id"]){
        let group = Data.getGroupByUid(postData['group_id']);

        if(group === null){
            log(`Unable to find group with ${postData['group_id']}`);
            return;
        }

        peer = {
            chatType: 2,
            peerUid: group.groupCode,
            guildId: ""
        }

    }else{
        return;
    }

    if(postData.message.constructor === String){
        message.push({
            elementType: 1,
            elementId: "",
            textElement: {
                content: postData.message,
                atType: 0,
                atUid: "",
                atTinyId: "",
                atNtUid: "",
            },
        })

    }else{
        for(let message of postData.message){
            if(message.type === "text"){
                message.push({
                    elementType: 1,
                    elementId: "",
                    textElement: {
                        content: message.data.text,
                        atType: 0,
                        atUid: "",
                        atTinyId: "",
                        atNtUid: "",
                    },
                })
            }
        }
    }

    RuntimeData.mainPage.send(IPCAction.ACTION_NT_CALL, {
        'eventName': "ns-ntApi",
        'cmdName': "nodeIKernelMsgService/sendMsg",
        'args': [{
            msgId: "0",
            peer: peer,
            msgElements: message,
        }, null]
    });
}

/**
 * 处理新消息
 * @param {*} messages 
 */
function handleNewMessage(messages){
	for(let message of messages){

		let msgData = {
			time: 0,
			self_id: selfQQ,
			post_type: "message",
			message_id: message.msgId,
			message: []
		}

        if(message.chatType === 1){
			msgData["message_type"] = "private";
			msgData["sub_type"] = "friend";

			msgData["user_id"] = Data.getUserByUid(message.senderUid).uin;
            
		}else if(message.chatType === 2){
			msgData["message_type"] = "group";
			msgData["sub_type"] = "normal";

			msgData["group_id"] = message.peerUid;
			msgData["user_id"] = Data.getUserByUid(message.senderUid).uin;
		} 

		for(let element of message.elements){
			let msgChain = { };

			if(element.elementType === 1){
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

			}else if(element.elementType === 3 && element.fileElement){
				msgChain.type = "file";
				msgChain.data = {
					name: element.fileElement.fileName,
					size: parseInt(element.fileElement.fileSize),
					elementId: element.elementId
				};
			}else{
                msgChain = {
                    type: "unsupportType",
                    data: element
                }
            }

			msgData["message"].push(msgChain)
		}

		ipcRenderer.send(IPCAction.ACTION_POST_ONEBOT_DATA, msgData);
	}
}



function log(...args){
    console.log("\x1b[32m[OneBotAPI-MessageModel]\x1b[0m", ...args);
}

module.exports = {
    sendMessage,

    handleNewMessage
}