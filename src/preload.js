const { contextBridge, ipcRenderer } = require("electron");

const runtimeData = ipcRenderer.sendSync('one_bot_api_get_runtime_data');

contextBridge.exposeInMainWorld("OneBotApi", {

    ipcRenderer_OneBot: ipcRenderer,

    webContentsId: "2",

    isDebug: runtimeData['isDebug'],

    IPCAction: runtimeData['IPCAction'],

    // (() => {
    //     let { webContentsId } = ipcRenderer.sendSync("___!boot")
    //     return webContentsId ? webContentsId : "2";
    // })(),

    ipcRenderer_ON_OneBot: (channel, callback) => ipcRenderer.on(channel, callback),
});