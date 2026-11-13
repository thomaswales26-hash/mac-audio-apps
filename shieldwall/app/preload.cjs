const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shieldwall", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  revealExtension: (browser) => ipcRenderer.invoke("extension:reveal", browser),
  openHelp: (browser) => ipcRenderer.invoke("help:open", browser),
  openPrivacy: () => ipcRenderer.invoke("privacy:open"),
});
