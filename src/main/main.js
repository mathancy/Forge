const { app, BrowserWindow, ipcMain, session, protocol, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable default Electron menu to prevent Ctrl+R from reloading the whole window
// Our renderer handles all keyboard shortcuts
Menu.setApplicationMenu(null);
const GoogleAuth = require('./google-auth');
const ChromeImporter = require('./chrome-importer');
const AIService = require('./ai-service');
const autoUpdaterService = require('./auto-updater');
const FavoritesService = require('./favorites-service');
const PasswordService = require('./password-service');
const BookmarksService = require('./bookmarks-service');
const { getAdBlocker, getCosmeticInjector, getScriptInjector } = require('./ad-blocker');

// Initialize Chrome Importer
const chromeImporter = new ChromeImporter();

// Initialize Favorites Service
const favoritesService = new FavoritesService();

// Initialize Password Service
const passwordService = new PasswordService();

// Initialize Bookmarks Service
const bookmarksService = new BookmarksService();

// Initialize Ad Blocker (network blocking)
const adBlocker = getAdBlocker();

// Initialize Cosmetic Injector (element hiding)
const cosmeticInjector = getCosmeticInjector();

// Initialize Script Injector (YouTube ad blocking)
const scriptInjector = getScriptInjector();

// AI Service will be initialized after app is ready
let aiService = null;

// Set app name for taskbar
app.setName('Forge');

// Set Windows app user model ID for proper taskbar identification
// Using a unique ID based on version to bypass icon cache
if (process.platform === 'win32') {
  const version = require('../../package.json').version.replace(/[^a-zA-Z0-9]/g, '');
  app.setAppUserModelId(`Forgeworks.Forge.Browser.${version}`);
}

// Initialize Google Auth
const googleAuth = new GoogleAuth(app);

// Load Google OAuth credentials from config file if exists
function loadGoogleCredentials() {
  try {
    const configPath = path.join(app.getPath('userData'), 'google-oauth-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.clientId && config.clientSecret) {
        googleAuth.setCredentials(config.clientId, config.clientSecret);
        console.log('Google OAuth credentials loaded');
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to load Google OAuth credentials:', e);
  }
  return false;
}

// Helper to get asset path (works in both dev and production)
function getAssetPath(...paths) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', ...paths);
  }
  return path.join(__dirname, '../../assets', ...paths);
}

// Keep a global reference of the window object
let mainWindow = null;

// Track all open browser windows for session management
const browserWindows = new Set();

// Session file path for tab persistence
function getSessionFilePath() {
  return path.join(app.getPath('userData'), 'session.json');
}

// Save session data
function saveSession(sessionData) {
  try {
    fs.writeFileSync(getSessionFilePath(), JSON.stringify(sessionData, null, 2));
    console.log('[Session] Saved', sessionData.tabs?.length || 0, 'tabs');
  } catch (e) {
    console.error('[Session] Failed to save:', e);
  }
}

// Load session data
function loadSession() {
  try {
    const sessionPath = getSessionFilePath();
    if (fs.existsSync(sessionPath)) {
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      console.log('[Session] Loaded', data.tabs?.length || 0, 'tabs');
      return data;
    }
  } catch (e) {
    console.error('[Session] Failed to load:', e);
  }
  return null;
}

// Clear session (called after successful restore)
function clearSession() {
  try {
    const sessionPath = getSessionFilePath();
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log('[Session] Cleared');
    }
  } catch (e) {
    console.error('[Session] Failed to clear:', e);
  }
}

// Handle keyboard shortcuts globally
function handleKeyboardShortcut(event, input, targetWindow) {
  if (input.type !== 'keyDown') return;
  
  const ctrl = input.control || input.meta;
  const shift = input.shift;
  const alt = input.alt;
  const key = input.key.toLowerCase();
  
  // Define shortcuts that should be handled by the browser UI
  let shortcut = null;
  
  if (ctrl && !shift && key === 't') shortcut = 'new-tab';
  else if (ctrl && !shift && key === 'w') shortcut = 'close-tab';
  else if (ctrl && shift && key === 't') shortcut = 'reopen-tab';
  else if (ctrl && !shift && key === 'tab') shortcut = 'next-tab';
  else if (ctrl && shift && key === 'tab') shortcut = 'prev-tab';
  else if (ctrl && !shift && key === 'l') shortcut = 'focus-url';
  else if (ctrl && shift && key === 'r') shortcut = 'hard-reload';
  else if (ctrl && !shift && key === 'r') shortcut = 'reload';
  else if (!ctrl && !shift && !alt && key === 'f5') shortcut = 'reload';
  else if (alt && !ctrl && key === 'arrowleft') shortcut = 'go-back';
  else if (alt && !ctrl && key === 'arrowright') shortcut = 'go-forward';
  else if (ctrl && !shift && key === 'h') shortcut = 'show-history';
  else if (ctrl && shift && key === 'b') shortcut = 'toggle-bookmarks-bar';
  else if (key === 'escape') shortcut = 'close-popups';
  else if (ctrl && shift && key === 'i') {
    // Open DevTools for the main window (docked) - works for inspecting both browser UI and webviews
    event.preventDefault();
    targetWindow.webContents.openDevTools();
    return;
  }
  
  if (shortcut) {
    event.preventDefault();
    targetWindow.webContents.send('keyboard-shortcut', shortcut);
  }
}

// Listen for all new webContents (including webviews) and add keyboard shortcut handling
app.on('web-contents-created', (event, contents) => {
  // Only handle webview webContents
  if (contents.getType() === 'webview') {
    contents.on('before-input-event', (event, input) => {
      // Find the parent BrowserWindow to send the shortcut to
      if (mainWindow && !mainWindow.isDestroyed()) {
        handleKeyboardShortcut(event, input, mainWindow);
      }
    });
    
    // Handle window.open() and target="_blank" links - open in new tab instead
    contents.setWindowOpenHandler(({ url, frameName, features, disposition }) => {
      // Send message to renderer to open URL in a new tab
      const parentWindow = BrowserWindow.fromWebContents(contents.hostWebContents);
      if (parentWindow && !parentWindow.isDestroyed()) {
        parentWindow.webContents.send('open-url-in-new-tab', url);
      }
      // Deny the default window creation
      return { action: 'deny' };
    });
  }
});

// Forge Browser Configuration
const FORGE_CONFIG = {
  name: 'Forge',
  version: require('../../package.json').version,
  company: 'Forgeworks Interactive Limited',
  homepage: 'https://www.google.com',
  userAgent: null // Will be set dynamically
};

function createWindow() {
  // Load icon - use absolute path and verify it exists
  const iconPath = getAssetPath('forge-logo.ico');
  console.log('[Icon] Icon path:', iconPath);
  console.log('[Icon] Icon exists:', fs.existsSync(iconPath));
  
  const icon = nativeImage.createFromPath(iconPath);
  console.log('[Icon] Icon isEmpty:', icon.isEmpty());
  console.log('[Icon] Icon size:', icon.getSize());
  
  // Create the browser window with lightweight settings
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    title: FORGE_CONFIG.name,
    icon: icon,
    frame: false, // Custom titlebar for lightweight feel
    backgroundColor: '#161616',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js'),
      webviewTag: true // Enable webview for browser tabs
    }
  });
  
  // Explicitly set the icon for Windows taskbar
  if (process.platform === 'win32') {
    mainWindow.setIcon(icon);
    console.log('[Icon] Set window icon for Windows');
    
    // Set icon again after window is shown (taskbar timing issue)
    mainWindow.once('show', () => {
      mainWindow.setIcon(icon);
      console.log('[Icon] Re-set icon on show event');
    });
    
    // Also set on focus to catch any missed updates
    mainWindow.once('focus', () => {
      mainWindow.setIcon(icon);
      console.log('[Icon] Re-set icon on focus event');
    });
  }

  // Set custom user agent
  const chromeVersion = process.versions.chrome;
  FORGE_CONFIG.userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Forge/${FORGE_CONFIG.version}`;
  
  session.defaultSession.setUserAgent(FORGE_CONFIG.userAgent);

  // Load the browser UI
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Maximize window on startup
  mainWindow.maximize();

  // Handle keyboard shortcuts globally (for main window, not webviews)
  // Webviews are handled separately via app.on('web-contents-created')
  mainWindow.webContents.on('before-input-event', (event, input) => {
    handleKeyboardShortcut(event, input, mainWindow);
  });

  // DevTools can be opened manually via menu or keyboard shortcut (Ctrl+Shift+I)

  // Track this window
  browserWindows.add(mainWindow);
  console.log('[Session] Window opened. Total windows:', browserWindows.size);

  mainWindow.on('closed', () => {
    browserWindows.delete(mainWindow);
    console.log('[Session] Window closed. Remaining windows:', browserWindows.size);
    mainWindow = null;
  });

  // Handle maximize/restore for custom titlebar
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-restored');
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Set app icon for Windows taskbar/dock
  if (process.platform === 'win32') {
    const iconPath = getAssetPath('forge-logo.ico');
    if (fs.existsSync(iconPath)) {
      const icon = nativeImage.createFromPath(iconPath);
      app.setAppUserModelId('com.forgeworks.forge');
      // Note: Electron doesn't support app.setIcon(), icon is set per-window
    }
  }
  
  // Register custom protocol for assets
  protocol.registerFileProtocol('forge-asset', (request, callback) => {
    const url = request.url.replace('forge-asset://', '');
    const filePath = getAssetPath(url);
    callback({ path: filePath });
  });
  
  // Initialize services
  favoritesService.initialize();
  passwordService.initialize();
  bookmarksService.initialize();
  
  createWindow();
  
  // Initialize auto-updater after window is created
  if (app.isPackaged) {
    autoUpdaterService.initialize(mainWindow);
    // Check for updates 3 seconds after app starts
    setTimeout(() => {
      autoUpdaterService.checkForUpdates().catch(err => {
        console.log('Auto-update check failed:', err.message);
      });
    }, 3000);
  } else {
    // In dev mode, register stub handlers to avoid IPC errors
    ipcMain.handle('check-for-updates', () => {
      console.log('[Dev] Update check skipped in dev mode');
      return { success: false, error: 'Updates disabled in dev mode' };
    });
    ipcMain.handle('download-update', () => ({ success: false, error: 'Updates disabled in dev mode' }));
    ipcMain.handle('install-update', () => ({ success: false, error: 'Updates disabled in dev mode' }));
    ipcMain.handle('get-update-status', () => ({ updateAvailable: false, updateDownloaded: false }));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for window controls
ipcMain.handle('window-minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window?.isMaximized()) {
    window.restore();
  } else {
    window?.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window?.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window?.isMaximized() ?? false;
});

// Session management IPC handlers
ipcMain.handle('session-save', (event, sessionData) => {
  saveSession(sessionData);
  return true;
});

ipcMain.handle('session-load', () => {
  return loadSession();
});

ipcMain.handle('session-clear', () => {
  clearSession();
  return true;
});

ipcMain.handle('get-window-count', () => {
  return browserWindows.size;
});

// IPC Handler for opening DevTools (docked in main window)
ipcMain.handle('open-devtools', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.webContents.openDevTools();
  }
});

// IPC Handler for getting app info
ipcMain.handle('get-app-info', () => {
  return {
    name: FORGE_CONFIG.name,
    version: FORGE_CONFIG.version,
    company: FORGE_CONFIG.company,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node
  };
});

// IPC Handler for getting asset path
ipcMain.handle('get-asset-path', (event, relativePath) => {
  return getAssetPath(relativePath);
});

// IPC Handler for creating new window
ipcMain.handle('create-new-window', (event, url) => {
  const newWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    title: FORGE_CONFIG.name,
    icon: path.join(__dirname, '../../assets/forge-logo.ico'),
    frame: false,
    backgroundColor: '#161616',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js'),
      webviewTag: true
    }
  });
  
  session.defaultSession.setUserAgent(FORGE_CONFIG.userAgent);
  
  newWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Track this window
  browserWindows.add(newWindow);
  console.log('[Session] New window opened. Total windows:', browserWindows.size);
  
  newWindow.on('closed', () => {
    browserWindows.delete(newWindow);
    console.log('[Session] Window closed. Remaining windows:', browserWindows.size);
  });
  
  // If URL is provided, send it to the new window once it's ready
  if (url) {
    newWindow.webContents.once('did-finish-load', () => {
      newWindow.webContents.send('open-url', url);
    });
  }
  
  return newWindow.id;
});

// Future: Ad-blocker will be implemented here
// Ad-blocker IPC Handlers
ipcMain.handle('adblock-get-status', () => {
  return {
    enabled: adBlocker.isEnabled(),
    stats: adBlocker.getStats(),
    enabledRulesets: adBlocker.getEnabledRulesets(),
    availableRulesets: adBlocker.getAvailableRulesets()
  };
});

ipcMain.handle('adblock-set-enabled', (event, enabled) => {
  adBlocker.setEnabled(enabled);
  return { success: true, enabled };
});

ipcMain.handle('adblock-get-stats', () => {
  return adBlocker.getStats();
});

ipcMain.handle('adblock-reset-stats', () => {
  adBlocker.resetStats();
  return { success: true };
});

ipcMain.handle('adblock-get-rulesets', () => {
  return {
    available: adBlocker.getAvailableRulesets(),
    enabled: adBlocker.getEnabledRulesets()
  };
});

ipcMain.handle('adblock-set-rulesets', async (event, rulesetIds) => {
  try {
    await adBlocker.setEnabledRulesets(rulesetIds);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cosmetic Filter IPC Handlers
ipcMain.handle('cosmetic-get-status', () => {
  return cosmeticInjector.getStats();
});

ipcMain.handle('cosmetic-set-enabled', (event, enabled) => {
  cosmeticInjector.setEnabled(enabled);
  return { success: true, enabled };
});

ipcMain.handle('cosmetic-get-css', (event, url) => {
  return cosmeticInjector.getCSSForUrl(url);
});

// Script Injection IPC Handlers (YouTube ad blocking)
ipcMain.handle('script-get-status', () => {
  return scriptInjector.getStats();
});

ipcMain.handle('script-set-enabled', (event, enabled) => {
  scriptInjector.setEnabled(enabled);
  return { success: true, enabled };
});

ipcMain.handle('script-get-for-url', (event, url) => {
  const script = scriptInjector.getScriptForUrl(url);
  if (script) {
    scriptInjector.trackInjection();
  }
  return { script, hasScript: !!script };
});

// Tab audio state handler
ipcMain.handle('is-webcontents-audible', (event, webContentsId) => {
  try {
    const { webContents } = require('electron');
    const wc = webContents.fromId(webContentsId);
    if (wc) {
      return wc.isCurrentlyAudible();
    }
  } catch (e) {
    // WebContents may not exist
  }
  return false;
});

// DevTools IPC handlers
ipcMain.handle('devtools-open', (event, targetWebContentsId, devtoolsWebContentsId) => {
  try {
    const { webContents } = require('electron');
    const targetWC = webContents.fromId(targetWebContentsId);
    const devtoolsWC = webContents.fromId(devtoolsWebContentsId);
    
    if (targetWC && devtoolsWC) {
      targetWC.setDevToolsWebContents(devtoolsWC);
      targetWC.openDevTools({ mode: 'detach' });
      return true;
    }
  } catch (e) {
    console.error('[DevTools] Failed to open:', e);
  }
  return false;
});

ipcMain.handle('devtools-close', (event, targetWebContentsId) => {
  try {
    const { webContents } = require('electron');
    const targetWC = webContents.fromId(targetWebContentsId);
    
    if (targetWC) {
      targetWC.closeDevTools();
      return true;
    }
  } catch (e) {
    console.error('[DevTools] Failed to close:', e);
  }
  return false;
});

// Google OAuth IPC Handlers
ipcMain.handle('google-auth-status', () => {
  return {
    isSignedIn: googleAuth.isSignedIn(),
    userInfo: googleAuth.getUserInfo(),
    hasCredentials: !!googleAuth.config.clientId
  };
});

ipcMain.handle('google-auth-sign-in', async () => {
  try {
    const userInfo = await googleAuth.signIn();
    return { success: true, userInfo };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('google-auth-sign-out', async () => {
  try {
    await googleAuth.signOut();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('google-auth-set-credentials', (event, clientId, clientSecret) => {
  try {
    googleAuth.setCredentials(clientId, clientSecret);
    
    // Save credentials
    const configPath = path.join(app.getPath('userData'), 'google-oauth-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ clientId, clientSecret }, null, 2));
    
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Chrome Import IPC Handlers
ipcMain.handle('chrome-get-profiles', () => {
  return chromeImporter.getProfiles();
});

ipcMain.handle('chrome-get-import-summary', (event, profileId) => {
  return chromeImporter.getImportSummary(profileId);
});

ipcMain.handle('chrome-import-bookmarks', (event, profileId) => {
  return chromeImporter.importBookmarks(profileId);
});

ipcMain.handle('chrome-import-history', (event, profileId, limit) => {
  return chromeImporter.importHistory(profileId, limit);
});

ipcMain.handle('chrome-get-saved-logins', (event, profileId) => {
  return chromeImporter.getSavedLoginSites(profileId);
});

// AI Service IPC Handlers
ipcMain.handle('ai-get-providers', () => {
  return aiService ? aiService.getProviders() : {};
});

ipcMain.handle('ai-toggle-provider', (event, providerId, enabled) => {
  return aiService ? aiService.toggleProvider(providerId, enabled) : { success: false, error: 'AI service not ready' };
});

// Favorites IPC handlers
ipcMain.handle('favorites-get', () => {
  return favoritesService.getFavorites();
});

ipcMain.handle('favorites-set-enabled', (event, enabled) => {
  return favoritesService.setEnabled(enabled);
});

ipcMain.handle('favorites-set', (event, slotIndex, url, name) => {
  return favoritesService.setFavorite(slotIndex, url, name);
});

ipcMain.handle('favorites-remove', (event, slotIndex) => {
  return favoritesService.removeFavorite(slotIndex);
});

// Bookmarks IPC handlers
ipcMain.handle('bookmarks-get', () => {
  return bookmarksService.getBookmarks();
});

ipcMain.handle('bookmarks-set-bar-enabled', (event, enabled) => {
  return bookmarksService.setBarEnabled(enabled);
});

ipcMain.handle('bookmarks-is-bar-enabled', () => {
  return bookmarksService.isBarEnabled();
});

ipcMain.handle('bookmarks-add', (event, { url, title, icon, folderId }) => {
  return bookmarksService.addBookmark({ url, title, icon, folderId });
});

ipcMain.handle('bookmarks-create-folder', (event, { name, parentFolderId }) => {
  return bookmarksService.createFolder({ name, parentFolderId });
});

ipcMain.handle('bookmarks-remove', (event, itemId) => {
  return bookmarksService.removeItem(itemId);
});

ipcMain.handle('bookmarks-update', (event, itemId, updates) => {
  return bookmarksService.updateItem(itemId, updates);
});

ipcMain.handle('bookmarks-move', (event, itemId, targetFolderId, targetIndex) => {
  return bookmarksService.moveItem(itemId, targetFolderId, targetIndex);
});

ipcMain.handle('bookmarks-is-bookmarked', (event, url) => {
  return bookmarksService.isBookmarked(url);
});

ipcMain.handle('bookmarks-find-by-url', (event, url) => {
  return bookmarksService.findBookmarkByUrl(url);
});

ipcMain.handle('bookmarks-get-folders', () => {
  return bookmarksService.getFolderList();
});

ipcMain.handle('bookmarks-import', (event, htmlContent) => {
  return bookmarksService.importFromHtml(htmlContent);
});

ipcMain.handle('bookmarks-save-icon', (event, bookmarkId, base64Data, mimeType) => {
  return bookmarksService.saveCustomIcon(bookmarkId, base64Data, mimeType);
});

ipcMain.handle('bookmarks-delete-icon', (event, bookmarkId) => {
  return bookmarksService.deleteCustomIcon(bookmarkId);
});

// URL Autocomplete IPC handler
ipcMain.handle('get-url-suggestions', async (event, query) => {
  try {
    const https = require('https');
    const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
    
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed[1] || []);
          } catch (e) {
            resolve([]);
          }
        });
      }).on('error', (e) => {
        console.error('Suggestions fetch error:', e);
        resolve([]);
      });
    });
  } catch (e) {
    console.error('Suggestions error:', e);
    return [];
  }
});

// Load credentials on startup
app.whenReady().then(() => {
  loadGoogleCredentials();
  aiService = new AIService(app);
  favoritesService.initialize();
  bookmarksService.initialize();
  
  // Initialize ad-blocker with bundled filter lists
  const rulesDir = app.isPackaged
    ? path.join(process.resourcesPath, 'filter-lists')
    : path.join(__dirname, '../../filter-lists');
  
  // Create filter-lists directory if it doesn't exist
  if (!fs.existsSync(rulesDir)) {
    fs.mkdirSync(rulesDir, { recursive: true });
    console.log('[AdBlocker] Created filter-lists directory:', rulesDir);
  }
  
  // Initialize network request blocking (with YouTube-specific rules)
  adBlocker.init(rulesDir, { enabledRulesets: ['default', 'youtube'] }).catch(err => {
    console.error('[AdBlocker] Initialization failed:', err);
  });
  
  // Initialize cosmetic filtering (element hiding)
  try {
    const cosmeticStats = cosmeticInjector.init(rulesDir);
    console.log('[Cosmetic Injector] Ready with', cosmeticStats.genericCount, 'generic selectors');
  } catch (err) {
    console.error('[Cosmetic Injector] Initialization failed:', err);
  }
  
  // Initialize script injection (YouTube ad skipping)
  try {
    const scriptStats = scriptInjector.init(rulesDir);
    console.log('[Script Injector] Ready with', scriptStats.sitesCovered, 'site scripts (YouTube, etc.)');
  } catch (err) {
    console.error('[Script Injector] Initialization failed:', err);
  }
});

// Password Manager IPC Handlers
ipcMain.handle('passwords-get-all', () => {
  return passwordService.getAllPasswords();
});

ipcMain.handle('passwords-get-for-url', (event, url) => {
  return passwordService.getPasswordsForUrl(url);
});

ipcMain.handle('passwords-add', (event, url, username, password) => {
  return passwordService.addPassword(url, username, password);
});

ipcMain.handle('passwords-update', (event, id, url, username, password) => {
  passwordService.updatePassword(id, url, username, password);
  return { success: true };
});

ipcMain.handle('passwords-delete', (event, id) => {
  passwordService.deletePassword(id);
  return { success: true };
});

ipcMain.handle('passwords-import-csv', (event, csvData) => {
  return passwordService.importFromCSV(csvData);
});

ipcMain.handle('passwords-import-selected', (event, entries) => {
  return passwordService.importSelected(entries);
});

ipcMain.handle('passwords-delete-all', () => {
  try {
    const fs = require('fs');
    const dbPath = path.join(app.getPath('userData'), 'passwords.db');
    const keyPath = path.join(app.getPath('userData'), 'password.key');
    
    // Close the database connection first to release the lock
    passwordService.close();
    
    // Delete both files if they exist
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }
    
    // Reinitialize the password service with fresh database
    passwordService.initialize();
    
    return { success: true };
  } catch (err) {
    console.error('Error deleting passwords:', err);
    
    // Try to reinitialize even if deletion failed partially
    try {
      passwordService.initialize();
    } catch (reinitErr) {
      console.error('Error reinitializing password service:', reinitErr);
    }
    
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-password-anvil-window', () => {
  const passwordWindow = new BrowserWindow({
    width: 900,
    height: 700,
    title: 'Password Anvil',
    icon: getAssetPath('forge-logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });
  
  passwordWindow.loadFile(path.join(__dirname, '../renderer/password-anvil/index.html'));
  return { success: true };
});
