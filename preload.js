const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeApp: () => ipcRenderer.send("close-app"),
  saveSettings: (data) => ipcRenderer.invoke("save-settings", data),
  loadSettings: () => ipcRenderer.invoke("load-settings"),
  openExternal: (url) => ipcRenderer.send("open-external", url)
});