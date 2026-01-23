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
import { ThemesMixin } from './modules/themes.js';
import { BookmarksMixin } from './modules/bookmarks.js';
import TextContextMenuMixin from './modules/text-context-menu.js';

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
    this.initThemes();
    this.initBookmarksBar();
    this.initTextContextMenu();
    
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
    
    // Listen for open-url-in-new-tab message (when webview tries to open a new window)
    window.forgeAPI.onOpenUrlInNewTab((url) => {
      console.log('[Forge] Opening URL in new tab:', url);
      this.createTab(url);
    });
    
    // Try to restore previous session
    const sessionRestored = await this.restoreSession();
    
    // Create initial Home tab only if no session restored and no URL opened
    setTimeout(() => {
      if (!urlOpened && !sessionRestored) {
        this.createHomeTab();
      }
    }, 50);
    
    // Set up session save on window close
    this.setupSessionPersistence();
    
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
    this.urlContainer = document.querySelector('.url-container');
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
    this.bookmarkContextMenu = document.getElementById('bookmark-context-menu');
    this.bookmarksBarContextMenu = document.getElementById('bookmarks-bar-context-menu');
    this.folderContextMenu = document.getElementById('folder-context-menu');
    this.contextMenuOverlay = document.getElementById('context-menu-overlay');
    this.contextMenuWebview = null;
    this.contextMenuParams = null;
    this.contextMenuBookmark = null; // Currently right-clicked bookmark
    this.contextMenuFolder = null; // Currently right-clicked folder
    
    // Add Folder Modal
    this.addFolderModal = document.getElementById('add-folder-modal');
    this.addFolderOverlay = document.getElementById('add-folder-overlay');
    this.addFolderName = document.getElementById('add-folder-name');
    this.addFolderCancelBtn = document.getElementById('add-folder-cancel-btn');
    this.addFolderSaveBtn = document.getElementById('add-folder-save-btn');
    
    // Bookmark Edit Modal
    this.bookmarkEditModal = document.getElementById('bookmark-edit-modal');
    this.bookmarkEditOverlay = document.getElementById('bookmark-edit-overlay');
    this.bookmarkEditIconPreview = document.getElementById('bookmark-edit-icon-preview');
    this.bookmarkEditIconInput = document.getElementById('bookmark-edit-icon-input');
    this.bookmarkEditTitle = document.getElementById('bookmark-edit-title');
    this.bookmarkEditUrl = document.getElementById('bookmark-edit-url');
    this.bookmarkEditUploadBtn = document.getElementById('bookmark-edit-upload-btn');
    this.bookmarkEditResetBtn = document.getElementById('bookmark-edit-reset-btn');
    this.bookmarkEditCancelBtn = document.getElementById('bookmark-edit-cancel-btn');
    this.bookmarkEditSaveBtn = document.getElementById('bookmark-edit-save-btn');
    this.editingBookmark = null; // Bookmark being edited
    this.editingBookmarkNewIcon = null; // New icon data if uploaded
    
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
    
    // Bookmarks Bar
    this.bookmarksBar = document.getElementById('bookmarks-bar');
    this.bookmarksBarToggle = document.getElementById('bookmarks-bar-toggle');
    this.bookmarksContainer = document.getElementById('bookmarks-container');
    this.bookmarksBarEnabled = false;
    
    // Bookmark Button & Popup
    this.btnBookmark = document.getElementById('btn-bookmark');
    this.bookmarkIcon = document.getElementById('bookmark-icon');
    this.bookmarkPopup = document.getElementById('bookmark-popup');
    this.bookmarkPopupOverlay = document.getElementById('bookmark-popup-overlay');
    this.bookmarkPopupClose = document.getElementById('bookmark-popup-close');
    this.bookmarkNameInput = document.getElementById('bookmark-name');
    this.bookmarkUrlInput = document.getElementById('bookmark-url');
    this.bookmarkFolderSelect = document.getElementById('bookmark-folder');
    this.bookmarkNewFolderField = document.getElementById('new-folder-field');
    this.bookmarkNewFolderName = document.getElementById('bookmark-new-folder-name');
    this.bookmarkNewFolderBtn = document.getElementById('bookmark-new-folder-btn');
    this.bookmarkRemoveBtn = document.getElementById('bookmark-remove-btn');
    this.bookmarkSaveBtn = document.getElementById('bookmark-save-btn');
    this.bookmarksData = { bar: [], folders: {} };
    this.editingBookmark = null;
    
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
        this.urlInput.blur();
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
    
    // Click anywhere in URL container to focus input
    if (this.urlContainer) {
      this.urlContainer.addEventListener('click', (e) => {
        // Don't focus if clicking on buttons or other interactive elements
        if (!e.target.closest('button') && !e.target.closest('.ad-counter')) {
          this.urlInput.focus();
        }
      });
    }
    
    // Home search
    if (this.homeSearch) {
      this.homeSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.navigate(this.homeSearch.value);
          this.homeSearch.value = '';
          this.homeSearch.blur();
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
    
    // Bookmarks Bar
    if (this.bookmarksBarToggle) {
      this.bookmarksBarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBookmarksBar();
      });
    }
    
    // Bookmark Button & Popup
    if (this.btnBookmark) {
      this.btnBookmark.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleBookmarkPopup();
      });
    }
    if (this.bookmarkPopupClose) {
      this.bookmarkPopupClose.addEventListener('click', () => this.hideBookmarkPopup());
      if (this.bookmarkPopupOverlay) {
        // Use mousedown instead of click to prevent closing when drag-selecting text
        // and releasing outside the modal
        this.bookmarkPopupOverlay.addEventListener('mousedown', (e) => {
          if (e.target === this.bookmarkPopupOverlay) {
            this.hideBookmarkPopup();
          }
        });
      }
    }
    if (this.bookmarkNewFolderBtn) {
      this.bookmarkNewFolderBtn.addEventListener('click', () => this.toggleNewFolderField());
    }
    if (this.bookmarkRemoveBtn) {
      this.bookmarkRemoveBtn.addEventListener('click', () => this.removeCurrentBookmark());
    }
    if (this.bookmarkSaveBtn) {
      this.bookmarkSaveBtn.addEventListener('click', () => this.saveBookmark());
    }
    
    // Close bookmark popup when clicking outside
    // Use mousedown instead of click to prevent closing when drag-selecting text
    document.addEventListener('mousedown', (e) => {
      if (this.bookmarkPopup && !this.bookmarkPopup.classList.contains('hidden')) {
        if (!this.bookmarkPopup.contains(e.target) && e.target !== this.btnBookmark && !this.btnBookmark.contains(e.target)) {
          this.hideBookmarkPopup();
        }
      }
    });
    
    // Ad blocker toggle
    if (this.adblockToggle) {
      this.adblockToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleAdBlocker();
      });
    }
    
    // Context menu overlay
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.addEventListener('click', () => {
        this.hideAllContextMenus();
      });
    }
    
    // Bookmark context menu item clicks
    if (this.bookmarkContextMenu) {
      this.bookmarkContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.dataset.action;
          this.handleBookmarkContextAction(action);
        });
      });
    }
    
    // Bookmarks bar context menu item clicks (right-click on empty space)
    if (this.bookmarksBarContextMenu) {
      this.bookmarksBarContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.dataset.action;
          this.handleBookmarksBarContextAction(action);
        });
      });
    }
    
    // Folder context menu item clicks
    if (this.folderContextMenu) {
      this.folderContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.dataset.action;
          this.handleFolderContextAction(action);
        });
      });
    }
    
    // Add folder modal events
    if (this.addFolderOverlay) {
      // Use mousedown instead of click to prevent closing when drag-selecting text
      this.addFolderOverlay.addEventListener('mousedown', (e) => {
        if (e.target === this.addFolderOverlay) {
          this.hideAddFolderModal();
        }
      });
    }
    if (this.addFolderCancelBtn) {
      this.addFolderCancelBtn.addEventListener('click', () => this.hideAddFolderModal());
    }
    if (this.addFolderSaveBtn) {
      this.addFolderSaveBtn.addEventListener('click', () => this.saveNewFolder());
    }
    if (this.addFolderName) {
      this.addFolderName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.saveNewFolder();
        } else if (e.key === 'Escape') {
          this.hideAddFolderModal();
        }
      });
    }
    
    // Bookmark edit modal events
    if (this.bookmarkEditOverlay) {
      // Use mousedown instead of click to prevent closing when drag-selecting text
      this.bookmarkEditOverlay.addEventListener('mousedown', (e) => {
        if (e.target === this.bookmarkEditOverlay) {
          this.hideBookmarkEditModal();
        }
      });
    }
    if (this.bookmarkEditCancelBtn) {
      this.bookmarkEditCancelBtn.addEventListener('click', () => this.hideBookmarkEditModal());
    }
    if (this.bookmarkEditSaveBtn) {
      this.bookmarkEditSaveBtn.addEventListener('click', () => this.saveEditedBookmark());
    }
    if (this.bookmarkEditUploadBtn) {
      this.bookmarkEditUploadBtn.addEventListener('click', () => this.bookmarkEditIconInput?.click());
    }
    if (this.bookmarkEditIconInput) {
      this.bookmarkEditIconInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleBookmarkIconUpload(e.target.files[0]);
        }
      });
    }
    if (this.bookmarkEditResetBtn) {
      this.bookmarkEditResetBtn.addEventListener('click', () => this.resetBookmarkIcon());
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

  // Session persistence methods
  async restoreSession() {
    try {
      const session = await window.forgeAPI.session.load();
      if (!session || !session.tabs || session.tabs.length === 0) {
        console.log('[Session] No session to restore');
        return false;
      }
      
      console.log('[Session] Restoring', session.tabs.length, 'tabs');
      
      // Restore each tab - only load the active one immediately
      const activeIndex = session.activeTabIndex >= 0 ? session.activeTabIndex : 0;
      
      for (let i = 0; i < session.tabs.length; i++) {
        const tabData = session.tabs[i];
        const isActiveTab = (i === activeIndex);
        
        if (tabData.isHome) {
          this.createHomeTab();
        } else if (tabData.url) {
          // Only load the active tab immediately; defer others
          this.createTab(tabData.url, { 
            deferLoad: !isActiveTab,
            title: tabData.title,
            favicon: tabData.favicon
          });
        }
      }
      
      // Switch to the previously active tab
      if (activeIndex >= 0 && activeIndex < this.tabs.length) {
        this.switchTab(this.tabs[activeIndex].id);
      }
      
      // Clear the session file after successful restore
      await window.forgeAPI.session.clear();
      
      console.log('[Session] Restore complete');
      return true;
    } catch (e) {
      console.error('[Session] Restore failed:', e);
      return false;
    }
  }

  async saveSession() {
    try {
      // Only save if this is the last window
      const windowCount = await window.forgeAPI.session.getWindowCount();
      if (windowCount > 1) {
        console.log('[Session] Multiple windows open, not saving session');
        return false;
      }
      
      // Gather tab data - use pendingUrl if tab hasn't loaded yet
      const tabsData = this.tabs.map(tab => ({
        url: tab.pendingUrl || tab.url || '',
        title: tab.title || 'New Tab',
        isHome: tab.isHome || false,
        favicon: tab.favicon || null
      }));
      
      // Find active tab index
      const activeTabIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
      
      const sessionData = {
        tabs: tabsData,
        activeTabIndex: activeTabIndex,
        timestamp: Date.now()
      };
      
      await window.forgeAPI.session.save(sessionData);
      console.log('[Session] Saved', tabsData.length, 'tabs');
      return true;
    } catch (e) {
      console.error('[Session] Save failed:', e);
      return false;
    }
  }

  setupSessionPersistence() {
    // Save session before window closes
    window.addEventListener('beforeunload', async (e) => {
      await this.saveSession();
    });
    
    console.log('[Session] Persistence setup complete');
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
applyMixin(ForgeBrowser, BookmarksMixin);         // Bookmarks bar
applyMixin(ForgeBrowser, AdBlockerMixin);         // Ad blocking
applyMixin(ForgeBrowser, AIAssistantMixin);       // AI sidebar
applyMixin(ForgeBrowser, UrlSuggestionsMixin);    // URL autocomplete
applyMixin(ForgeBrowser, WindowControlsMixin);    // Window minimize/maximize/close
applyMixin(ForgeBrowser, KeyboardShortcutsMixin); // Keyboard shortcuts
applyMixin(ForgeBrowser, BrightnessControlMixin); // Brightness slider
applyMixin(ForgeBrowser, WelcomeParticlesMixin);  // Welcome page particles
applyMixin(ForgeBrowser, ThemesMixin);            // Theme management
applyMixin(ForgeBrowser, ModalSystemMixin);       // Modal dialogs and notifications
applyMixin(ForgeBrowser, TextContextMenuMixin);   // Text input context menus

// Start the browser
console.log('[Forge] Creating browser instance...');
window.forgeBrowser = new ForgeBrowser();
