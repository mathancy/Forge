const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('forgeAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Window state listeners
  onMaximized: (callback) => {
    ipcRenderer.on('window-maximized', callback);
  },
  onRestored: (callback) => {
    ipcRenderer.on('window-restored', callback);
  },
  onOpenUrl: (callback) => {
    ipcRenderer.on('open-url', (event, url) => callback(url));
  },
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Asset path resolver
  getAssetPath: (relativePath) => ipcRenderer.invoke('get-asset-path', relativePath),
  
  // Window management
  createNewWindow: (url) => ipcRenderer.invoke('create-new-window', url),
  
  // Google Auth
  googleAuth: {
    getStatus: () => ipcRenderer.invoke('google-auth-status'),
    signIn: () => ipcRenderer.invoke('google-auth-sign-in'),
    signOut: () => ipcRenderer.invoke('google-auth-sign-out'),
    setCredentials: (clientId, clientSecret) => ipcRenderer.invoke('google-auth-set-credentials', clientId, clientSecret)
  },
  
  // Chrome Import
  chromeImport: {
    getProfiles: () => ipcRenderer.invoke('chrome-get-profiles'),
    getImportSummary: (profileId) => ipcRenderer.invoke('chrome-get-import-summary', profileId),
    importBookmarks: (profileId) => ipcRenderer.invoke('chrome-import-bookmarks', profileId),
    importHistory: (profileId, limit) => ipcRenderer.invoke('chrome-import-history', profileId, limit),
    getSavedLogins: (profileId) => ipcRenderer.invoke('chrome-get-saved-logins', profileId)
  },
  
  // AI Service
  ai: {
    getProviders: () => ipcRenderer.invoke('ai-get-providers'),
    toggleProvider: (providerId, enabled) => ipcRenderer.invoke('ai-toggle-provider', providerId, enabled)
  },
  
  // Future: Ad-blocker controls
  // toggleAdBlock: (enabled) => ipcRenderer.invoke('toggle-adblock', enabled),
});
