const { contextBridge, ipcRenderer } = require("electron");

const runtimeData = ipcRenderer.sendSync('one_bot_api_get_runtime_data');

// const setting = runtimeData['Setting'];

contextBridge.exposeInMainWorld("OneBotApi", {

    ipcRenderer_OneBot: ipcRenderer,

    isDebug: runtimeData['isDebug'],

    IPCAction: runtimeData['IPCAction'],
});