const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateNote: (formData, onProgress) => {
    ipcRenderer.on('generation-progress', (event, data) => onProgress(data));
    return ipcRenderer.invoke('generate-note', formData);
  }
});
