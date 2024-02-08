const fs = require("fs");
const path = require('path');
const crypto = require("crypto");

let settingsPath = './';


/**
 * 下载文件
 * @param {string} uri
 * @param {string} savePath - 保存的路径
 */
async function downloadFile(uri, savePath){
    let url = new URL(uri);
    if(url.protocol === "base64:"){
        fs.writeFileSync(savePath, Buffer.from(uri.split("base64://")[1], 'base64'));
    }else if(url.protocol === "http:" || url.protocol === "https:"){
        let res = await fetch(url)
        let blob = await res.blob();
        let buffer = await blob.arrayBuffer();
        fs.writeFileSync(savePath, Buffer.from(buffer));
    }
}


/**
 * 计算文件 md5
 * @param {string} filePath
 * @return {string}
 */
function md5(filePath){
    const hash = crypto.createHash('md5');
    hash.update(fs.readFileSync(filePath));
    return hash.digest('hex');
}

async function wait(ms){
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

/**
 * 从本地文件加载设置信息
 * @param plugin
 */
function loadSetting(plugin){
    const pluginDataPath = plugin.path.data;

    settingsPath = path.join(pluginDataPath, "settings.json");

    // 设置文件是否存在判断
    if(!fs.existsSync(pluginDataPath)){
        fs.mkdirSync(pluginDataPath, { recursive: true });
    }

    if(!fs.existsSync(settingsPath)){
        return null;
    }else{
        return JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
    }
}

function saveSetting(content){
    const new_config = typeof content == "string" ? JSON.stringify(JSON.parse(content), null, 4) : JSON.stringify(content, null, 4)
    fs.writeFileSync(settingsPath, new_config, "utf-8");
}


function logToFile(msg){
    let currentDateTime = new Date().toLocaleString();
    fs.appendFile("./onebotapi.log", currentDateTime + ":" + msg + "\n", (err) => { });
}


function checkAndCompleteKeys(json1, json2){
    // 补全缺少的 key
    const keys1 = Object.keys(json1);
    const keys2 = Object.keys(json2);
    for(const key of keys2){
        if(keys1.includes(key)){
            const keys3 = Object.keys(json1[key]);
            for(const key1 of Object.keys(json2[key])){
                if(!keys3.includes(key1)) json1[key][key1] = json2[key][key1];
            }
        }else{
            json1[key] = json2[key];
        }
    }
    return json1;
}


class LimitedHashMap{
    constructor(capacity){
        this.capacity = capacity;
        this.map = {};
        this.keys = [];
    }

    put(key, value){
        // 如果键不存在，检查容量是否达到上限
        if(this.keys.length >= this.capacity){
            // 移除最早的数据
            const oldestKey = this.keys.shift();
            delete this.map[oldestKey];
        }
        // 添加新数据
        this.map[key] = value;
        this.keys.push(key);
    }

    get(key){
        if(this.map.hasOwnProperty(key)){
            return this.map[key];
        }else{
            return null;
        }
    }
}

module.exports = {
    md5,
    wait,
    downloadFile,

    logToFile,
    checkAndCompleteKeys,

    loadSetting,
    saveSetting,

    LimitedHashMap,
}