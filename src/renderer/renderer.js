// Forge Browser - Renderer Process (Modular)
// Lightweight browser by Forgeworks Interactive Limited

// Import utility functions
import { escapeHtml, isInternalUrl, getDomain, formatCount, debounce, generateId } from './modules/utils.js';

// Import mixins
import { TabManagerMixin } from './modules/tab-manager.js';
import { NavigationMixin } from './modules/navigation.js';
import { WebviewEventsMixin } from './modules/webview-events.js';
import { UIPanelsMixin } from './modules/ui-panels.js';
import { PasswordManagerMixin } from './modules/password-manager.js';
import { HistoryMixin } from './modules/history.js';
import { FavoritesMixin } from './modules/favorites.js';
import { AdBlockerMixin } from './modules/ad-blocker.js';
import { AIAssistantMixin } from './modules/ai-assistant.js';
import { UrlSuggestionsMixin } from './modules/url-suggestions.js';
import { WindowControlsMixin } from './modules/window-controls.js';
import { KeyboardShortcutsMixin } from './modules/keyboard-shortcuts.js';
import { BrightnessControlMixin } from './modules/brightness-control.js';
import { WelcomeParticlesMixin } from './modules/welcome-particles.js';
import { ModalSystemMixin } from './modules/modal-system.js';

console.log('[Forge] Loading modular renderer...');

/**
 * Apply mixin methods to a class prototype
 */
function applyMixin(targetClass, mixin) {
  Object.keys(mixin).forEach(key => {
    if (typeof mixin[key] === 'function') {
      targetClass.prototype[key] = mixin[key];
    }
  });
}

/**
 * Main ForgeBrowser class
 * Core orchestration - actual functionality lives in mixin modules
 */
class ForgeBrowser {
  constructor() {
    console.log('[Forge] Initializing browser...');
    
    // Core state
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.homepage = 'https://www.google.com';
    
    // Closed tabs for reopen (Ctrl+Shift+T)
    this.closedTabs = [];
    this.maxClosedTabs = 10;
    
    // Favicon cache
    this.faviconCache = new Map();
    this.loadFaviconCache();
    
    // Browser history
    this.browsingHistory = [];
    this.loadBrowsingHistory();
    
    // Site logos for tab titles
    this.siteLogos = {
      'www.youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'm.youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'www.google.com': 'forge-asset://site-logos/Google.svg',
      'google.com': 'forge-asset://site-logos/Google.svg',
      'www.twitch.tv': 'forge-asset://site-logos/Twitch.svg',
      'twitch.tv': 'forge-asset://site-logos/Twitch.svg',
      'm.twitch.tv': 'forge-asset://site-logos/Twitch.svg'
    };
    
    // Drag state
    this.draggedTab = null;
    this.isDragging = false;
    this.dragStartX = 0;
    
    // Initialize
    this.init();
  }

  async init() {
    console.log('[Forge] Running init...');
    
    // Cache DOM elements
    this.cacheElements();
    
    // Bind core event listeners
    this.bindEvents();
    
    // Initialize modules
    this.setupWindowControls();
    this.setupDragHandlers();
    this.initUpdateListener();
    this.initUrlSuggestions();
    this.initBrightnessControl();
    this.initKeyboardShortcuts();
    this.initWelcomeParticles();
    this.initModalSystem();
    
    await this.initAdBlocker();
    await this.initFavorites();
    await this.initAIProviders();
    this.initAIPanelResize();
    this.initPasswordManager();
    
    // Display app info
    const appInfo = await window.forgeAPI.getAppInfo();
    console.log(`${appInfo.name} v${appInfo.version} by ${appInfo.company}`);
    console.log(`Electron: ${appInfo.electronVersion}, Chrome: ${appInfo.chromeVersion}`);
    
    // Listen for open-url message (when opening files/links with the browser)
    let urlOpened = false;
    window.forgeAPI.onOpenUrl((url) => {
      if (!urlOpened) {
        urlOpened = true;
        if (this.tabs.length === 1 && this.tabs[0].isHome) {
          this.closeTab(this.tabs[0].id, true);
        }
        this.createTab(url);
      }
    });
    
    // Create initial Home tab
    setTimeout(() => {
      if (!urlOpened) {
        this.createHomeTab();
      }
    }, 50);
    
    this.updateStatus('Ready');
    console.log('[Forge] Initialization complete');
  }

  cacheElements() {
    console.log('[Forge] Caching elements...');
    
    // Window controls
    this.btnMinimize = document.getElementById('btn-minimize');
    this.btnMaximize = document.getElementById('btn-maximize');
    this.btnClose = document.getElementById('btn-close');
    
    // Tab bar
    this.tabsContainer = document.getElementById('tabs-container');
    this.btnNewTab = document.getElementById('btn-new-tab');
    
    // Navigation
    this.btnBack = document.getElementById('btn-back');
    this.btnForward = document.getElementById('btn-forward');
    this.btnReload = document.getElementById('btn-reload');
    this.btnHome = document.getElementById('btn-home');
    this.urlInput = document.getElementById('url-input');
    this.securityIndicator = document.getElementById('security-indicator');
    this.adCounter = document.getElementById('ad-counter');
    this.adCounterValue = document.getElementById('ad-counter-value');
    
    // Content
    this.browserContent = document.getElementById('browser-content');
    this.welcomePage = document.getElementById('welcome-page');
    this.homeSearch = document.getElementById('home-search');
    
    // Status bar
    this.statusText = document.getElementById('status-text');
    this.statusInfo = document.getElementById('status-info');
    
    // Context menus
    this.tabContextMenu = document.getElementById('tab-context-menu');
    this.contextMenuTabId = null;
    this.webviewContextMenu = document.getElementById('webview-context-menu');
    this.contextMenuOverlay = document.getElementById('context-menu-overlay');
    this.contextMenuWebview = null;
    this.contextMenuParams = null;
    
    // Main menu
    this.btnMenu = document.getElementById('btn-menu');
    this.mainMenu = document.getElementById('main-menu');
    this.brightnessSlider = document.getElementById('brightness-slider');
    
    // History panel
    this.historyPanel = document.getElementById('history-panel');
    this.historyList = document.getElementById('history-list');
    this.historySearch = document.getElementById('history-search');
    this.btnCloseHistory = document.getElementById('btn-close-history');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    
    // Password Anvil panel
    this.passwordAnvilPanel = document.getElementById('password-anvil-panel');
    this.passwordList = document.getElementById('password-list');
    this.passwordSearch = document.getElementById('password-search');
    this.btnClosePasswordAnvil = document.getElementById('btn-close-password-anvil');
    this.btnAddPassword = document.getElementById('btn-add-password');
    this.btnImportPasswords = document.getElementById('btn-import-passwords');
    this.btnDeleteAllPasswords = document.getElementById('btn-delete-all-passwords');
    this.passwordModal = document.getElementById('password-modal');
    this.passwordModalTitle = document.getElementById('password-modal-title');
    this.btnClosePasswordModal = document.getElementById('btn-close-password-modal');
    this.btnCancelPassword = document.getElementById('btn-cancel-password');
    this.btnSavePassword = document.getElementById('btn-save-password');
    this.passwordEditId = document.getElementById('password-edit-id');
    this.passwordUrlInput = document.getElementById('password-url');
    this.passwordUsernameInput = document.getElementById('password-username');
    this.passwordPasswordInput = document.getElementById('password-password');
    this.passwordFileInput = document.getElementById('password-file-input');
    
    // Password Import Modal
    this.passwordImportModal = document.getElementById('password-import-modal');
    this.btnCloseImportModal = document.getElementById('btn-close-import-modal');
    this.btnSelectImportFile = document.getElementById('btn-select-import-file');
    this.btnSelectAllImport = document.getElementById('btn-select-all-import');
    this.btnDeselectAllImport = document.getElementById('btn-deselect-all-import');
    this.btnCancelImport = document.getElementById('btn-cancel-import');
    this.btnImportSelected = document.getElementById('btn-import-selected');
    
    // Chrome Import panel
    this.chromeImportPanel = document.getElementById('chrome-import-panel');
    this.chromeImportContent = document.getElementById('chrome-import-content');
    this.btnCloseChromeImport = document.getElementById('btn-close-chrome-import');
    
    // About panel
    this.aboutPanel = document.getElementById('about-panel');
    this.btnCloseAbout = document.getElementById('btn-close-about');
    this.aboutVersion = document.getElementById('about-version');
    this.btnCheckUpdates = document.getElementById('btn-check-updates');
    this.updateStatusElement = document.getElementById('update-status');
    
    // AI Assistant
    this.aiButtons = document.getElementById('ai-buttons');
    this.aiSettingsPanel = document.getElementById('ai-settings-panel');
    this.aiSettingsContent = document.getElementById('ai-settings-content');
    this.btnCloseAISettings = document.getElementById('btn-close-ai-settings');
    this.aiWebviewPanel = document.getElementById('ai-webview-panel');
    this.aiWebviewContainer = document.getElementById('ai-webview-container');
    this.aiWebviewIcon = document.getElementById('ai-webview-icon');
    this.aiWebviewName = document.getElementById('ai-webview-name');
    this.btnAIWebviewClose = document.getElementById('btn-ai-webview-close');
    this.currentAIProvider = null;
    this.aiWebview = null;
    
    // Favorites
    this.btnFavorites = document.getElementById('btn-favorites');
    this.favoritesToggle = document.getElementById('favorites-toggle');
    this.favoritesPanel = document.getElementById('favorites-panel');
    this.favoritesSlots = document.getElementById('favorites-slots');
    this.favoritesEditDialog = document.getElementById('favorites-edit-dialog');
    this.favoritesDialogTitle = document.getElementById('favorites-dialog-title');
    this.favoriteUrlInput = document.getElementById('favorite-url-input');
    this.btnCloseFavoritesDialog = document.getElementById('btn-close-favorites-dialog');
    this.btnCancelFavorite = document.getElementById('btn-cancel-favorite');
    this.btnSaveFavorite = document.getElementById('btn-save-favorite');
    this.favoritesEnabled = false;
    this.favorites = [];
    this.editingFavoriteSlot = null;
    
    // Hide favorites button until settings load
    if (this.btnFavorites) this.btnFavorites.style.display = 'none';
    
    // Ad-blocker
    this.adblockToggle = document.getElementById('adblock-toggle');
    this.adblockStats = document.getElementById('adblock-stats');
    this.adblockEnabled = true;
    this.adblockBlockedCount = 0;
    
    // URL suggestions
    this.urlSuggestions = document.getElementById('url-suggestions');
  }

  bindEvents() {
    // New tab button
    this.btnNewTab.addEventListener('click', () => this.createTab());
    
    // Navigation buttons
    this.btnBack.addEventListener('click', () => this.goBack());
    this.btnForward.addEventListener('click', () => this.goForward());
    this.btnReload.addEventListener('click', () => this.reload());
    this.btnHome.addEventListener('click', () => this.goHome());
    
    // URL input
    this.urlInput.addEventListener('input', () => this.handleUrlInputChange());
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.hideSuggestions();
        this.navigate(this.urlInput.value);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNextSuggestion();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevSuggestion();
      } else if (e.key === 'Escape') {
        this.hideSuggestions();
      }
    });
    
    this.urlInput.addEventListener('focus', () => {
      this.urlInput.select();
    });
    
    this.urlInput.addEventListener('blur', () => {
      setTimeout(() => this.hideSuggestions(), 150);
    });
    
    // Home search
    if (this.homeSearch) {
      this.homeSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.navigate(this.homeSearch.value);
          this.homeSearch.value = '';
        }
      });
    }
    
    // Main menu
    if (this.btnMenu) {
      this.btnMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMainMenu();
      });
    }
    
    // Menu items
    const toggleActions = ['favorites', 'adblock'];
    document.querySelectorAll('#main-menu .context-menu-item[data-action]').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.handleMainMenuAction(action);
        if (!toggleActions.includes(action)) {
          this.hideMainMenu();
        }
      });
    });
    
    // Panel close buttons
    if (this.btnCloseHistory) this.btnCloseHistory.addEventListener('click', () => this.hideHistoryPanel());
    if (this.btnClearHistory) this.btnClearHistory.addEventListener('click', () => this.clearHistory());
    if (this.historySearch) this.historySearch.addEventListener('input', () => this.filterHistory());
    if (this.btnCloseAbout) this.btnCloseAbout.addEventListener('click', () => this.hideAboutPanel());
    if (this.btnCheckUpdates) this.btnCheckUpdates.addEventListener('click', () => this.checkForUpdates());
    if (this.btnCloseChromeImport) this.btnCloseChromeImport.addEventListener('click', () => this.hideChromeImportPanel());
    if (this.btnCloseAISettings) this.btnCloseAISettings.addEventListener('click', () => this.hideAISettingsPanel());
    if (this.btnAIWebviewClose) this.btnAIWebviewClose.addEventListener('click', () => this.hideAIWebviewPanel());
    
    // Password Anvil
    if (this.btnClosePasswordAnvil) this.btnClosePasswordAnvil.addEventListener('click', () => this.hidePasswordAnvilPanel());
    if (this.btnAddPassword) this.btnAddPassword.addEventListener('click', () => this.showPasswordModal());
    if (this.btnImportPasswords) this.btnImportPasswords.addEventListener('click', () => this.showPasswordImportModal());
    if (this.btnDeleteAllPasswords) this.btnDeleteAllPasswords.addEventListener('click', () => this.deleteAllPasswords());
    if (this.btnClosePasswordModal) this.btnClosePasswordModal.addEventListener('click', () => this.hidePasswordModal());
    if (this.btnCancelPassword) this.btnCancelPassword.addEventListener('click', () => this.hidePasswordModal());
    if (this.btnSavePassword) this.btnSavePassword.addEventListener('click', () => this.savePassword());
    if (this.passwordSearch) this.passwordSearch.addEventListener('input', () => this.filterPasswords());
    if (this.passwordFileInput) this.passwordFileInput.addEventListener('change', (e) => this.importPasswordsCSV(e.target.files[0]));
    if (this.passwordModal) this.passwordModal.addEventListener('click', (e) => { if (e.target === this.passwordModal) this.hidePasswordModal(); });
    
    // Password Import Modal event listeners
    if (this.btnCloseImportModal) this.btnCloseImportModal.addEventListener('click', () => this.hidePasswordImportModal());
    if (this.btnSelectImportFile) this.btnSelectImportFile.addEventListener('click', () => this.passwordFileInput?.click());
    if (this.btnSelectAllImport) this.btnSelectAllImport.addEventListener('click', () => this.selectAllImportEntries());
    if (this.btnDeselectAllImport) this.btnDeselectAllImport.addEventListener('click', () => this.deselectAllImportEntries());
    if (this.btnCancelImport) this.btnCancelImport.addEventListener('click', () => this.hidePasswordImportModal());
    if (this.btnImportSelected) this.btnImportSelected.addEventListener('click', () => this.importSelectedPasswords());
    if (this.passwordImportModal) this.passwordImportModal.addEventListener('click', (e) => { if (e.target === this.passwordImportModal) this.hidePasswordImportModal(); });
    
    // Favorites
    if (this.btnFavorites) this.btnFavorites.addEventListener('click', () => this.toggleFavoritesPanel());
    if (this.favoritesToggle) {
      this.favoritesToggle.addEventListener('change', () => this.toggleFavoritesEnabled());
    }
    if (this.btnCloseFavoritesDialog) this.btnCloseFavoritesDialog.addEventListener('click', () => this.hideFavoritesDialog());
    if (this.btnCancelFavorite) this.btnCancelFavorite.addEventListener('click', () => this.hideFavoritesDialog());
    if (this.btnSaveFavorite) this.btnSaveFavorite.addEventListener('click', () => this.saveFavorite());
    
    // Ad blocker toggle
    if (this.adblockToggle) {
      this.adblockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleAdBlocker();
      });
    }
    
    // Context menu overlay
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.addEventListener('click', () => this.hideWebviewContextMenu());
    }
    
    // Close popups on click outside
    document.addEventListener('click', (e) => {
      if (this.mainMenu && !this.mainMenu.classList.contains('hidden') && 
          !this.mainMenu.contains(e.target) && !this.btnMenu.contains(e.target)) {
        this.hideMainMenu();
      }
      if (this.tabContextMenu && !this.tabContextMenu.classList.contains('hidden') && 
          !this.tabContextMenu.contains(e.target)) {
        this.hideTabContextMenu();
      }
    });
  }

  // ==================== Favicon Cache ====================
  
  loadFaviconCache() {
    try {
      const saved = localStorage.getItem('forge-favicon-cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.faviconCache = new Map(Object.entries(parsed));
      }
    } catch (e) {
      this.faviconCache = new Map();
    }
  }

  saveFaviconCache() {
    try {
      const obj = Object.fromEntries(this.faviconCache);
      localStorage.setItem('forge-favicon-cache', JSON.stringify(obj));
    } catch (e) {}
  }

  getCachedFavicon(url) {
    try {
      const domain = getDomain(url);
      const cached = this.faviconCache.get(domain);
      if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return cached.url;
      }
    } catch (e) {}
    return null;
  }
}

// Apply mixins - order matters for dependencies
applyMixin(ForgeBrowser, TabManagerMixin);        // Tab creation, switching, drag & drop
applyMixin(ForgeBrowser, NavigationMixin);        // URL processing, back/forward, reload
applyMixin(ForgeBrowser, WebviewEventsMixin);     // Webview event handlers
applyMixin(ForgeBrowser, UIPanelsMixin);          // UI panels, main menu, updates
applyMixin(ForgeBrowser, PasswordManagerMixin);   // Password Anvil
applyMixin(ForgeBrowser, HistoryMixin);           // Browsing history
applyMixin(ForgeBrowser, FavoritesMixin);         // Favorites bar
applyMixin(ForgeBrowser, AdBlockerMixin);         // Ad blocking
applyMixin(ForgeBrowser, AIAssistantMixin);       // AI sidebar
applyMixin(ForgeBrowser, UrlSuggestionsMixin);    // URL autocomplete
applyMixin(ForgeBrowser, WindowControlsMixin);    // Window minimize/maximize/close
applyMixin(ForgeBrowser, KeyboardShortcutsMixin); // Keyboard shortcuts
applyMixin(ForgeBrowser, BrightnessControlMixin); // Brightness slider
applyMixin(ForgeBrowser, WelcomeParticlesMixin);  // Welcome page particles
applyMixin(ForgeBrowser, ModalSystemMixin);       // Modal dialogs and notifications

// Start the browser
console.log('[Forge] Creating browser instance...');
window.forgeBrowser = new ForgeBrowser();
