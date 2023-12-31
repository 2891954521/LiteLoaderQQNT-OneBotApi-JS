const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("OneBotApi", {

    ipcRenderer_OneBot: ipcRenderer,

    webContentsId: "2",

    IPCAction: ipcRenderer.sendSync('one_bot_api_get_actions'),

    // (() => {
    //     let { webContentsId } = ipcRenderer.sendSync("___!boot")
    //     return webContentsId ? webContentsId : "2";
    // })(),

    ipcRenderer_ON_OneBot: (channel, callback) => ipcRenderer.on(channel, callback),

    ipcRenderer_ONCE_OneBot: (channel, callback) => ipcRenderer.once(channel, callback),

});