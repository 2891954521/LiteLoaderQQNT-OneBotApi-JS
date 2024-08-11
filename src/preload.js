const { contextBridge, ipcRenderer } = require("electron");

const runtimeData = ipcRenderer.sendSync('one_bot_api_get_runtime_data');

const IPCAction = runtimeData['IPCAction'];
// const setting = runtimeData['Setting'];

contextBridge.exposeInMainWorld("OneBotApi", {

    ipcRenderer_OneBot: ipcRenderer,

    isDebug: runtimeData['isDebug'],

    IPCAction: IPCAction,

    send: (action, data) => ipcRenderer.send(action, data),

    invoke: (action) => ipcRenderer.invoke(action),

    settingData: () => ipcRenderer.invoke(IPCAction.ACTION_GET_CONFIG)
});