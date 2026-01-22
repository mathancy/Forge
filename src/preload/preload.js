const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('forgeAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openDevTools: () => ipcRenderer.invoke('open-devtools'),
  
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
  createPasswordAnvilWindow: () => ipcRenderer.invoke('create-password-anvil-window'),
  
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
  
  // Favorites
  favorites: {
    get: () => ipcRenderer.invoke('favorites-get'),
    setEnabled: (enabled) => ipcRenderer.invoke('favorites-set-enabled', enabled),
    set: (slotIndex, url, name) => ipcRenderer.invoke('favorites-set', slotIndex, url, name),
    remove: (slotIndex) => ipcRenderer.invoke('favorites-remove', slotIndex)
  },
  
  // URL Autocomplete
  getUrlSuggestions: (query) => ipcRenderer.invoke('get-url-suggestions', query),
  
  // Auto-updater
  updates: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getStatus: () => ipcRenderer.invoke('get-update-status'),
    onUpdateStatus: (callback) => {
      ipcRenderer.on('update-status', (event, data) => callback(data));
    }
  },
  
  // Ad-blocker controls
  adBlocker: {
    getStatus: () => ipcRenderer.invoke('adblock-get-status'),
    setEnabled: (enabled) => ipcRenderer.invoke('adblock-set-enabled', enabled),
    getStats: () => ipcRenderer.invoke('adblock-get-stats'),
    resetStats: () => ipcRenderer.invoke('adblock-reset-stats'),
    getRulesets: () => ipcRenderer.invoke('adblock-get-rulesets'),
    setRulesets: (rulesetIds) => ipcRenderer.invoke('adblock-set-rulesets', rulesetIds)
  },
  
  // Cosmetic filter controls (element hiding)
  cosmeticFilter: {
    getStatus: () => ipcRenderer.invoke('cosmetic-get-status'),
    setEnabled: (enabled) => ipcRenderer.invoke('cosmetic-set-enabled', enabled),
    getCSS: (url) => ipcRenderer.invoke('cosmetic-get-css', url)
  },
  
  // Script injection controls (YouTube ad blocking)
  scriptInjector: {
    getStatus: () => ipcRenderer.invoke('script-get-status'),
    setEnabled: (enabled) => ipcRenderer.invoke('script-set-enabled', enabled),
    getScript: (url) => ipcRenderer.invoke('script-get-for-url', url)
  },
  
  // Tab audio state
  isWebContentsAudible: (webContentsId) => ipcRenderer.invoke('is-webcontents-audible', webContentsId),
  
  // DevTools
  devTools: {
    open: (targetWebContentsId, devtoolsWebContentsId) => ipcRenderer.invoke('devtools-open', targetWebContentsId, devtoolsWebContentsId),
    close: (targetWebContentsId) => ipcRenderer.invoke('devtools-close', targetWebContentsId),
  },
  
  // Keyboard shortcuts (from main process)
  onKeyboardShortcut: (callback) => {
    ipcRenderer.on('keyboard-shortcut', (event, shortcut) => callback(shortcut));
  },
});

// Expose password manager API
contextBridge.exposeInMainWorld('electronAPI', {
  passwords: {
    getAll: () => ipcRenderer.invoke('passwords-get-all'),
    getForUrl: (url) => ipcRenderer.invoke('passwords-get-for-url', url),
    add: (url, username, password) => ipcRenderer.invoke('passwords-add', url, username, password),
    update: (id, url, username, password) => ipcRenderer.invoke('passwords-update', id, url, username, password),
    delete: (id) => ipcRenderer.invoke('passwords-delete', id),
    importCSV: (csvData) => ipcRenderer.invoke('passwords-import-csv', csvData),
    importSelected: (entries) => ipcRenderer.invoke('passwords-import-selected', entries),
    deleteAll: () => ipcRenderer.invoke('passwords-delete-all')
  }
});
