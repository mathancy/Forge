const { app, BrowserWindow, ipcMain, session, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const GoogleAuth = require('./google-auth');
const ChromeImporter = require('./chrome-importer');
const AIService = require('./ai-service');
const autoUpdaterService = require('./auto-updater');

// Initialize Chrome Importer
const chromeImporter = new ChromeImporter();

// AI Service will be initialized after app is ready
let aiService = null;

// Set app name for taskbar
app.setName('Forge');

// Set Windows app user model ID for proper taskbar identification
if (process.platform === 'win32') {
  app.setAppUserModelId('com.forgeworks.forge');
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
  // Create the browser window with lightweight settings
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    title: FORGE_CONFIG.name,
    icon: getAssetPath('forge-logo.ico'),
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

  // Set custom user agent
  const chromeVersion = process.versions.chrome;
  FORGE_CONFIG.userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36 Forge/${FORGE_CONFIG.version}`;
  
  session.defaultSession.setUserAgent(FORGE_CONFIG.userAgent);

  // Load the browser UI
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // DevTools can be opened via menu later
  // if (process.argv.includes('--enable-logging')) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }

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
  // Register custom protocol for assets
  protocol.registerFileProtocol('forge-asset', (request, callback) => {
    const url = request.url.replace('forge-asset://', '');
    const filePath = getAssetPath(url);
    callback({ path: filePath });
  });
  
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
// ipcMain.handle('toggle-adblock', (event, enabled) => { ... });

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

// Load credentials on startup
app.whenReady().then(() => {
  loadGoogleCredentials();
  aiService = new AIService(app);
});
