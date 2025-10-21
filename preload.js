const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Seleção de arquivos e pastas
    selectFile: () => ipcRenderer.invoke('select-file'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
    
    // Controle da janela
    closeWindow: () => ipcRenderer.invoke('window-close'),
    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
    
    // Abrir pasta no explorador
    openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
    
    // Abrir URL no navegador padrão
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Informações da aplicação
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    
    // Controle do servidor Python
    startPythonServer: () => ipcRenderer.invoke('start-python-server'),
    checkPythonStatus: () => ipcRenderer.invoke('check-python-status'),
    forceStopPython: () => ipcRenderer.invoke('force-stop-python'),
    
    // Eventos da aplicação
    onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
    
    // Controle de atualizações
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
    
    // Eventos de atualização
    onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
    onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
    onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
    
    // Remover listeners de eventos
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // Utilitários
    platform: process.platform,
    versions: process.versions
});

// Log de inicialização
console.log('🔒 Preload script carregado com segurança');
console.log('🌐 APIs expostas para o renderer process');
