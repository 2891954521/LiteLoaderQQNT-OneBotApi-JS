const fs = require("fs");
const path = require('path');

let settingsPath = './';

function loadSetting(plugin){
    let configData = {
        "port": 5000,
        "hosts": [
            "http://127.0.0.1:8080/"
        ]
    };

    const pluginDataPath = plugin.path.data;

    settingsPath = path.join(pluginDataPath, "settings.json");

    // 设置文件判断
    if(!fs.existsSync(pluginDataPath)){
        fs.mkdirSync(pluginDataPath, { recursive: true });
    }

    if(!fs.existsSync(settingsPath)){
        fs.writeFileSync(settingsPath, JSON.stringify(configData, null, 4));
    }else{
        const data = fs.readFileSync(settingsPath, "utf-8");
        configData = checkAndCompleteKeys(JSON.parse(data), configData);
    }

    return configData;
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
        if(!keys1.includes(key)){
            json1[key] = json2[key];
        }
    }
    return json1;
}


module.exports = {
    logToFile: logToFile,
    checkAndCompleteKeys: checkAndCompleteKeys,
    loadSetting: loadSetting,
    saveSetting: saveSetting,
}