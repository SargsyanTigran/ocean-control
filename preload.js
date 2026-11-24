// Exposes a minimal, safe API to the renderer.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('oceanAPI', {
  isElectron: true,
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
  store: {
    get: () => ipcRenderer.invoke('store:get'),
    set: (data) => ipcRenderer.invoke('store:set', data)
  },
  win: {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    onState: (cb) => ipcRenderer.on('win:state', (_e, s) => cb(s))
  }
});
