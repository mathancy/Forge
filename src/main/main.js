const { app, BrowserWindow, ipcMain, session, protocol, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const GoogleAuth = require('./google-auth');
const ChromeImporter = require('./chrome-importer');
const AIService = require('./ai-service');
const autoUpdaterService = require('./auto-updater');
const FavoritesService = require('./favorites-service');
const PasswordService = require('./password-service');
const { getAdBlocker, getCosmeticInjector, getScriptInjector } = require('./ad-blocker');

// Initialize Chrome Importer
const chromeImporter = new ChromeImporter();

// Initialize Favorites Service
const favoritesService = new FavoritesService();

// Initialize Password Service
const passwordService = new PasswordService();

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

  // DevTools can be opened manually via menu or keyboard shortcut (Ctrl+Shift+I)

  mainWindow.on('closed', () => {
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
  
  passwordWindow.loadFile(path.join(__dirname, '../renderer/password-anvil.html'));
  return { success: true };
});
