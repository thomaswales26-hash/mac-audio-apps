const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openPassage', {
  importProfile: (clientName, profilePath) =>
    ipcRenderer.invoke('vpn:import-profile', clientName, profilePath),
  isNative: true,
})
