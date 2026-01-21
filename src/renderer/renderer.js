// Forge Browser - Renderer Process (Modular)
// Lightweight browser by Forgeworks Interactive Limited

// Import modules
import { escapeHtml, isInternalUrl, getDomain, formatCount, debounce, generateId } from './modules/utils.js';
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
 */
class ForgeBrowser {
  constructor() {
    console.log('[Forge] Initializing browser...');
    
    // Core state
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.homepage = 'https://www.google.com';
    
    // Favicon cache
    this.faviconCache = new Map();
    this.loadFaviconCache();
    
    // Browser history
    this.browsingHistory = [];
    this.loadBrowsingHistory();
    
    // Site logos
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
    
    this.cacheElements();
    this.bindEvents();
    this.setupWindowControls();
    this.setupDragHandlers();
    this.initUpdateListener();
    this.initUrlSuggestions();
    
    // Initialize modules
    await this.initAdBlocker();
    await this.initFavorites();
    await this.initAIProviders();
    this.initAIPanelResize();
    this.initPasswordManager();
    
    // Display app info
    const appInfo = await window.forgeAPI.getAppInfo();
    console.log(`${appInfo.name} v${appInfo.version} by ${appInfo.company}`);
    console.log(`Electron: ${appInfo.electronVersion}, Chrome: ${appInfo.chromeVersion}`);
    
    // Listen for open-url message
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
    
    console.log('[Forge] tabsContainer:', this.tabsContainer);
    console.log('[Forge] btnNewTab:', this.btnNewTab);
    
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
    const toggleActions = ['favorites', 'adblock']; // Actions that don't close the menu
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
    if (this.btnImportPasswords) this.btnImportPasswords.addEventListener('click', () => this.passwordFileInput?.click());
    if (this.btnClosePasswordModal) this.btnClosePasswordModal.addEventListener('click', () => this.hidePasswordModal());
    if (this.btnCancelPassword) this.btnCancelPassword.addEventListener('click', () => this.hidePasswordModal());
    if (this.btnSavePassword) this.btnSavePassword.addEventListener('click', () => this.savePassword());
    if (this.passwordSearch) this.passwordSearch.addEventListener('input', () => this.filterPasswords());
    if (this.passwordFileInput) this.passwordFileInput.addEventListener('change', (e) => this.importPasswordsCSV(e.target.files[0]));
    if (this.passwordModal) this.passwordModal.addEventListener('click', (e) => { if (e.target === this.passwordModal) this.hidePasswordModal(); });
    
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
        this.hideContextMenu();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Skip shortcuts when typing in input fields (except for specific combos)
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                             document.activeElement?.tagName === 'TEXTAREA';
      
      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.createTab();
      }
      // Ctrl+W: Close tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (this.activeTabId) this.closeTab(this.activeTabId);
      }
      // Ctrl+L: Focus URL bar
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.urlInput.focus();
        this.urlInput.select();
      }
      // Ctrl+R / F5: Reload (only when not in input)
      if ((e.ctrlKey && e.key === 'r') || (e.key === 'F5' && !isInputFocused)) {
        e.preventDefault();
        this.reload();
      }
      // Escape: Close panels
      if (e.key === 'Escape') {
        this.closeAllPopups();
      }
    });
  }

  setupWindowControls() {
    console.log('[Forge] Setting up window controls...');
    console.log('[Forge] btnMinimize:', this.btnMinimize);
    console.log('[Forge] btnMaximize:', this.btnMaximize);
    console.log('[Forge] btnClose:', this.btnClose);
    
    if (this.btnMinimize) {
      this.btnMinimize.addEventListener('click', () => {
        console.log('[Forge] Minimize clicked');
        window.forgeAPI.minimize();
      });
    }
    if (this.btnMaximize) {
      this.btnMaximize.addEventListener('click', () => {
        console.log('[Forge] Maximize clicked');
        window.forgeAPI.maximize();
      });
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => {
        console.log('[Forge] Close clicked');
        window.forgeAPI.close();
      });
    }
  }

  setupDragHandlers() {
    this.handleMouseMove = (e) => {
      if (!this.draggedTab) return;
      
      const deltaX = Math.abs(e.clientX - this.dragStartX);
      if (deltaX > 5) {
        this.isDragging = true;
        this.draggedTab.classList.add('dragging');
      }
      
      if (this.isDragging) {
        const afterElement = this.getDragAfterElement(this.tabsContainer, e.clientX);
        if (afterElement) {
          this.tabsContainer.insertBefore(this.draggedTab, afterElement);
        } else {
          const newTabBtn = this.tabsContainer.querySelector('#btn-new-tab');
          if (newTabBtn) {
            this.tabsContainer.insertBefore(this.draggedTab, newTabBtn);
          } else {
            this.tabsContainer.appendChild(this.draggedTab);
          }
        }
      }
    };
    
    this.handleMouseUp = () => {
      if (this.draggedTab) {
        this.draggedTab.classList.remove('dragging');
        if (this.isDragging) {
          this.reorderTabsArray();
        }
        this.draggedTab = null;
      }
      
      setTimeout(() => {
        this.isDragging = false;
      }, 10);
      
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    };
  }

  getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.tab:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  reorderTabsArray() {
    const tabElements = [...this.tabsContainer.querySelectorAll('.tab')];
    const newOrder = [];
    
    tabElements.forEach(tabEl => {
      const tabId = tabEl.dataset.tabId;
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) newOrder.push(tab);
    });
    
    this.tabs = newOrder;
  }

  // ==================== Tab Management ====================

  createTab(url = null) {
    const tabId = `tab-${++this.tabCounter}`;
    
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
      <img class="tab-favicon tab-icon-plus" src="forge-asset://ui-icons/plus.svg" alt="">
      <span class="tab-title">New Tab</span>
      <button class="tab-close" title="Close tab">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    `;
    
    // Drag handler
    tab.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.tab-close')) return;
      this.draggedTab = tab;
      this.isDragging = false;
      this.dragStartX = e.clientX;
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });
    
    // Click handler
    tab.addEventListener('click', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!e.target.closest('.tab-close')) {
        this.switchTab(tabId);
      }
    });
    
    // Context menu
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY, tabId);
    });
    
    // Close button
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
    
    this.tabsContainer.appendChild(tab);
    
    // Create webview
    const webview = document.createElement('webview');
    webview.id = tabId;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', 'persist:main');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');
    
    this.setupWebviewEvents(webview, tabId);
    
    this.browserContent.appendChild(webview);
    
    // Store tab info
    this.tabs.push({
      id: tabId,
      element: tab,
      webview: webview,
      title: 'New Tab',
      url: url || '',
      history: [],
      historyIndex: -1,
      isPlayingAudio: false,
      isMuted: false,
      adsBlocked: 0
    });
    
    this.switchTab(tabId);
    
    if (url) {
      // Use setAttribute after webview is in DOM
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        console.log('[Forge] Setting webview src to:', url);
        webview.setAttribute('src', url);
      }, 50);
    }
    
    return tabId;
  }

  setupWebviewEvents(webview, tabId) {
    const self = this;
    
    webview.addEventListener('did-start-loading', () => {
      self.updateStatus('Loading...');
      self.updateTabLoading(tabId, true);
    });
    
    webview.addEventListener('did-stop-loading', () => {
      self.updateStatus('Ready');
      self.updateTabLoading(tabId, false);
    });
    
    webview.addEventListener('page-title-updated', (e) => {
      self.updateTabTitle(tabId, e.title);
    });
    
    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        self.updateTabFavicon(tabId, e.favicons[0]);
      }
    });
    
    webview.addEventListener('did-navigate', (e) => {
      const tab = self.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.url = e.url; // Store the URL on the tab object
      }
      
      if (tabId === self.activeTabId) {
        self.urlInput.value = e.url;
        self.updateSecurityIndicator(e.url);
        self.updateNavigationButtons();
      }
      
      if (!isInternalUrl(e.url)) {
        const title = tab ? tab.title : 'New Tab';
        const favicon = tab ? tab.favicon : null;
        self.addToHistory(e.url, title, favicon);
      }
      
      // Inject scripts
      console.log('[Password] did-navigate event for:', e.url);
      self.injectCosmeticCSS(webview, e.url);
      self.injectAdBlockScript(webview, e.url);
      self.injectPasswordAutofill(webview, e.url);
    });
    
    webview.addEventListener('dom-ready', () => {
      try {
        const url = webview.getURL();
        if (url) {
          console.log('[Password] dom-ready event for:', url);
          self.injectAdBlockScript(webview, url);
          self.injectCosmeticCSS(webview, url);
          self.injectPasswordAutofill(webview, url);
        }
      } catch (e) {
        console.error('[Webview] Error in dom-ready:', e);
      }
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
      const tab = self.tabs.find(t => t.id === tabId);
      if (tabId === self.activeTabId && e.isMainFrame) {
        self.urlInput.value = e.url;
        self.updateSecurityIndicator(e.url);
        self.updateNavigationButtons();
      }
      
      if (e.isMainFrame && !isInternalUrl(e.url)) {
        const title = tab ? tab.title : 'New Tab';
        const favicon = tab ? tab.favicon : null;
        self.addToHistory(e.url, title, favicon);
        self.injectCosmeticCSS(webview, e.url);
        self.injectAdBlockScript(webview, e.url);
      }
    });
    
    webview.addEventListener('new-window', (e) => {
      self.createTab(e.url);
    });
    
    webview.addEventListener('context-menu', (e) => {
      self.showWebviewContextMenu(e, webview);
    });
    
    webview.addEventListener('focus', () => {
      self.closeAllPopups();
    });
    
    // Console message handling for ad blocking and passwords
    webview.addEventListener('console-message', (e) => {
      if (e.message && e.message.startsWith('[FORGE_AD_BLOCKED]')) {
        const count = parseInt(e.message.split(' ')[1], 10);
        const tab = self.tabs.find(t => t.id === tabId);
        if (tab && !isNaN(count)) {
          tab.adsBlocked = count;
          if (tabId === self.activeTabId) {
            self.updateAdCounter(count);
          }
        }
      }
    });
    
    // Audio state checking
    const checkAudioState = async () => {
      const tab = self.tabs.find(t => t.id === tabId);
      if (!tab || !tab.webview) return;
      
      try {
        const webContentsId = webview.getWebContentsId ? webview.getWebContentsId() : null;
        if (webContentsId) {
          const isAudible = await window.forgeAPI.isWebContentsAudible(webContentsId);
          if (isAudible !== tab.isPlayingAudio) {
            tab.isPlayingAudio = isAudible;
            self.updateTabAudioIcon(tabId);
          }
        }
      } catch (e) {}
    };
    
    webview.addEventListener('dom-ready', () => {
      const interval = setInterval(checkAudioState, 500);
      const tab = self.tabs.find(t => t.id === tabId);
      if (tab) tab.audioCheckInterval = interval;
      checkAudioState();
    }, { once: true });
  }

  createHomeTab() {
    console.log('[Forge] createHomeTab called');
    console.log('[Forge] tabsContainer:', this.tabsContainer);
    
    const tabId = `tab-${++this.tabCounter}`;
    
    const tab = document.createElement('div');
    tab.className = 'tab active';
    tab.dataset.tabId = tabId;
    tab.dataset.isHome = 'true';
    tab.innerHTML = `
      <img class="tab-home-icon" src="forge-asset://ui-icons/home.svg" alt="Home">
      <span class="tab-title">Home</span>
      <button class="tab-close" title="Close tab">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    `;
    
    console.log('[Forge] Created tab element:', tab);
    
    // Drag handler
    tab.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.tab-close')) return;
      this.draggedTab = tab;
      this.isDragging = false;
      this.dragStartX = e.clientX;
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });
    
    tab.addEventListener('click', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!e.target.closest('.tab-close')) {
        this.switchTab(tabId);
      }
    });
    
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY, tabId);
    });
    
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
    
    console.log('[Forge] Appending tab to container...');
    this.tabsContainer.appendChild(tab);
    console.log('[Forge] Tab appended. Container children:', this.tabsContainer.children.length);
    
    this.tabs.push({
      id: tabId,
      element: tab,
      webview: null,
      title: 'Home',
      url: 'forge://home',
      isHome: true,
      history: ['forge://home'],
      historyIndex: 0
    });
    
    this.activeTabId = tabId;
    this.showWelcomePage();
  }

  closeTab(tabId, skipAnimation = false) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = this.tabs[tabIndex];
    
    if (tab.audioCheckInterval) {
      clearInterval(tab.audioCheckInterval);
    }
    
    if (!skipAnimation) {
      tab.element.classList.add('closing');
    }
    
    const removeTab = () => {
      tab.element.remove();
      if (tab.webview) {
        tab.webview.remove();
      }
      
      this.tabs.splice(tabIndex, 1);
      
      if (tabId === this.activeTabId) {
        if (this.tabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
          this.switchTab(this.tabs[newActiveIndex].id);
        } else {
          this.activeTabId = null;
          this.createHomeTab();
        }
      }
    };
    
    if (skipAnimation) {
      removeTab();
    } else {
      setTimeout(removeTab, 300);
    }
  }

  switchTab(tabId) {
    this.tabs.forEach(tab => {
      tab.element.classList.remove('active');
      if (tab.webview) {
        tab.webview.classList.remove('active');
      }
    });
    
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.element.classList.add('active');
      this.activeTabId = tabId;
      
      this.updateAdCounter(tab.adsBlocked || 0);
      
      if (tab.isHome) {
        this.showWelcomePage();
      } else {
        this.welcomePage.classList.add('hidden');
        if (tab.webview) {
          tab.webview.classList.add('active');
          try {
            const url = tab.webview.getURL();
            this.urlInput.value = url || '';
            this.updateSecurityIndicator(url);
          } catch (e) {
            this.urlInput.value = '';
          }
          this.updateNavigationButtons();
        }
      }
    }
  }

  showWelcomePage() {
    this.welcomePage.classList.remove('hidden');
    this.urlInput.value = '';
    this.updateSecurityIndicator('');
    this.btnBack.disabled = true;
    this.btnForward.disabled = true;
  }

  // ==================== Navigation ====================

  navigate(input) {
    const url = this.processUrl(input);
    
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        if (tab.isHome) {
          // Convert home tab to regular tab
          this.createWebviewForHomeTab(tab, url);
        } else if (tab.webview) {
          tab.webview.src = url;
        }
      }
    } else {
      this.createTab(url);
    }
  }

  createWebviewForHomeTab(tab, url) {
    const webview = document.createElement('webview');
    webview.id = tab.id;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', 'persist:main');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');
    
    this.setupWebviewEvents(webview, tab.id);
    
    this.browserContent.appendChild(webview);
    
    tab.webview = webview;
    tab.isHome = false;
    tab.element.dataset.isHome = 'false';
    
    const iconElement = tab.element.querySelector('.tab-home-icon, .tab-favicon');
    if (iconElement) {
      iconElement.classList.remove('tab-home-icon');
      iconElement.classList.add('tab-favicon');
      iconElement.src = '';
    }
    
    this.welcomePage.classList.add('hidden');
    webview.classList.add('active');
    
    webview.src = url;
    tab.url = url;
    this.urlInput.value = url;
    this.updateSecurityIndicator(url);
  }

  processUrl(input) {
    input = input.trim();
    
    if (input.match(/^https?:\/\//i)) {
      return input;
    }
    
    if (input.match(/^[\w-]+\.[\w-]+/)) {
      return 'https://' + input;
    }
    
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  goBack() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.goBack();
    }
  }

  goForward() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.goForward();
    }
  }

  reload() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.reload();
    }
  }

  goHome() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      if (tab.webview) {
        tab.webview.classList.remove('active');
      }
      tab.isHome = true;
      tab.element.dataset.isHome = 'true';
      
      const iconElement = tab.element.querySelector('.tab-favicon, .tab-home-icon');
      if (iconElement) {
        iconElement.classList.remove('tab-favicon');
        iconElement.classList.add('tab-home-icon');
        iconElement.src = 'forge-asset://ui-icons/home.svg';
      }
      
      tab.element.querySelector('.tab-title').textContent = 'Home';
      this.showWelcomePage();
    }
  }

  updateNavigationButtons() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      this.btnBack.disabled = !tab.webview.canGoBack();
      this.btnForward.disabled = !tab.webview.canGoForward();
    } else {
      this.btnBack.disabled = true;
      this.btnForward.disabled = true;
    }
  }

  // ==================== UI Updates ====================

  updateSecurityIndicator(url) {
    if (!this.securityIndicator) return;
    
    if (!url || url.startsWith('forge://')) {
      this.securityIndicator.className = 'security-indicator';
      this.securityIndicator.innerHTML = '';
    } else if (url.startsWith('https://')) {
      this.securityIndicator.className = 'security-indicator secure';
      this.securityIndicator.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor"/></svg>';
    } else {
      this.securityIndicator.className = 'security-indicator insecure';
      this.securityIndicator.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z" fill="currentColor"/></svg>';
    }
  }

  updateStatus(text) {
    if (this.statusText) {
      this.statusText.textContent = text;
    }
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

  // ==================== Context Menus ====================

  showContextMenu(x, y, tabId) {
    this.contextMenuTabId = tabId;
    this.tabContextMenu.style.left = x + 'px';
    this.tabContextMenu.style.top = y + 'px';
    this.tabContextMenu.classList.remove('hidden');
    
    // Add click handlers for menu items
    this.tabContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.onclick = () => {
        const action = item.dataset.action;
        this.handleContextMenuAction(action);
        this.hideContextMenu();
      };
    });
  }

  hideContextMenu() {
    this.tabContextMenu.classList.add('hidden');
    this.contextMenuTabId = null;
  }

  handleContextMenuAction(action) {
    const tabId = this.contextMenuTabId;
    if (!tabId) return;
    
    switch (action) {
      case 'new-tab-right':
        this.createTab();
        break;
      case 'reload':
        this.reloadTab(tabId);
        break;
      case 'duplicate':
        this.duplicateTab(tabId);
        break;
      case 'mute':
        this.toggleTabMute(tabId);
        break;
      case 'close-other':
        this.closeOtherTabs(tabId);
        break;
      case 'close-right':
        this.closeTabsToRight(tabId);
        break;
      case 'close':
        this.closeTab(tabId);
        break;
    }
  }

  reloadTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.webview) {
      tab.webview.reload();
    }
  }

  duplicateTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.webview) {
      const url = tab.webview.getURL();
      this.createTab(url);
    }
  }

  toggleTabMute(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && tab.webview) {
      tab.isMuted = !tab.isMuted;
      tab.webview.setAudioMuted(tab.isMuted);
      this.updateTabAudioIcon(tabId);
    }
  }

  closeOtherTabs(tabId) {
    const tabsToClose = this.tabs.filter(t => t.id !== tabId).map(t => t.id);
    tabsToClose.forEach(id => this.closeTab(id, true));
  }

  closeTabsToRight(tabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      const tabsToClose = this.tabs.slice(tabIndex + 1).map(t => t.id);
      tabsToClose.forEach(id => this.closeTab(id, true));
    }
  }

  showWebviewContextMenu(e, webview) {
    this.contextMenuWebview = webview;
    this.contextMenuParams = e.params;
    
    this.webviewContextMenu.style.left = e.params.x + 'px';
    this.webviewContextMenu.style.top = e.params.y + 'px';
    this.webviewContextMenu.classList.remove('hidden');
    this.contextMenuOverlay.classList.remove('hidden');
    
    // Update menu items based on context
    const hasSelection = e.params.selectionText && e.params.selectionText.length > 0;
    const hasLink = e.params.linkURL && e.params.linkURL.length > 0;
    const hasImage = e.params.hasImageContents;
    
    this.webviewContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      const action = item.dataset.action;
      if (action === 'copy' || action === 'search') {
        item.style.display = hasSelection ? 'flex' : 'none';
      } else if (action === 'open-link' || action === 'open-link-new-tab' || action === 'copy-link') {
        item.style.display = hasLink ? 'flex' : 'none';
      } else if (action === 'save-image' || action === 'copy-image') {
        item.style.display = hasImage ? 'flex' : 'none';
      }
      
      item.onclick = () => {
        this.handleWebviewContextMenuAction(action);
        this.hideWebviewContextMenu();
      };
    });
  }

  hideWebviewContextMenu() {
    this.webviewContextMenu.classList.add('hidden');
    this.contextMenuOverlay.classList.add('hidden');
    this.contextMenuWebview = null;
    this.contextMenuParams = null;
  }

  handleWebviewContextMenuAction(action) {
    const webview = this.contextMenuWebview;
    const params = this.contextMenuParams;
    if (!webview || !params) return;
    
    switch (action) {
      case 'back':
        webview.goBack();
        break;
      case 'forward':
        webview.goForward();
        break;
      case 'reload':
        webview.reload();
        break;
      case 'copy':
        webview.copy();
        break;
      case 'search':
        if (params.selectionText) {
          this.createTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`);
        }
        break;
      case 'open-link':
        if (params.linkURL) {
          webview.src = params.linkURL;
        }
        break;
      case 'open-link-new-tab':
        if (params.linkURL) {
          this.createTab(params.linkURL);
        }
        break;
      case 'copy-link':
        if (params.linkURL) {
          navigator.clipboard.writeText(params.linkURL);
        }
        break;
      case 'save-image':
        if (params.srcURL) {
          window.forgeAPI.downloadFile(params.srcURL);
        }
        break;
      case 'copy-image':
        if (params.srcURL) {
          navigator.clipboard.writeText(params.srcURL);
        }
        break;
      case 'inspect':
        webview.inspectElement(params.x, params.y);
        break;
    }
  }

  closeAllPopups() {
    this.hideMainMenu();
    this.hideContextMenu();
    this.hideWebviewContextMenu();
    this.hideHistoryPanel();
    this.hideAboutPanel();
    this.hideFavoritesPanel();
    this.hideFavoritesDialog();
    this.hidePasswordAnvilPanel();
    this.hidePasswordModal();
    this.hideChromeImportPanel();
    this.hideAISettingsPanel();
    this.hideSuggestions();
  }

  // ==================== Main Menu ====================

  toggleMainMenu() {
    if (this.mainMenu.classList.contains('hidden')) {
      this.showMainMenu();
    } else {
      this.hideMainMenu();
    }
  }

  showMainMenu() {
    this.mainMenu.classList.remove('hidden');
    this.updateAdBlockerStats();
  }

  hideMainMenu(instant = false) {
    if (instant || !this.mainMenu) {
      this.mainMenu?.classList.add('hidden');
      this.mainMenu?.classList.remove('closing');
      return;
    }
    
    // Add closing class for reverse animation
    this.mainMenu.classList.add('closing');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      this.mainMenu?.classList.add('hidden');
      this.mainMenu?.classList.remove('closing');
    }, 280); // Total animation time including delays
  }

  handleMainMenuAction(action) {
    switch (action) {
      case 'new-tab':
        this.createTab();
        break;
      case 'history':
        this.showHistoryPanel();
        break;
      case 'password-anvil':
        this.showPasswordAnvil();
        break;
      case 'ai-assistant':
        this.showAISettingsPanel();
        break;
      case 'import-chrome':
        this.showChromeImportPanel();
        this.renderChromeImportPanel();
        break;
      case 'devtools':
        this.openDevTools();
        break;
      case 'about':
        this.showAboutPanel();
        break;
      case 'favorites':
        this.toggleFavoritesEnabled();
        break;
      case 'adblock':
        this.toggleAdBlocker();
        break;
    }
  }

  openDevTools() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.openDevTools();
    }
  }

  // ==================== Panels ====================

  showChromeImportPanel() {
    this.chromeImportPanel?.classList.remove('hidden');
  }

  hideChromeImportPanel() {
    this.chromeImportPanel?.classList.add('hidden');
  }

  async renderChromeImportPanel() {
    if (!this.chromeImportContent) return;
    this.chromeImportContent.innerHTML = '<div class="loading">Loading...</div>';
    // TODO: Implement Chrome import
  }

  async showAboutPanel() {
    if (this.aboutPanel) {
      this.aboutPanel.classList.remove('hidden');
      const appInfo = await window.forgeAPI.getAppInfo();
      if (this.aboutVersion) {
        this.aboutVersion.textContent = `v${appInfo.version}`;
      }
    }
  }

  hideAboutPanel() {
    this.aboutPanel?.classList.add('hidden');
  }

  // ==================== Updates ====================

  initUpdateListener() {
    window.forgeAPI.updates.onUpdateStatus((data) => {
      this.handleUpdateStatus(data);
    });
  }

  handleUpdateStatus(data) {
    if (!this.updateStatusElement) return;
    
    switch (data.status) {
      case 'checking':
        this.updateStatusElement.innerHTML = '<span class="update-checking">Checking for updates...</span>';
        break;
      case 'available':
        this.updateStatusElement.innerHTML = `<span class="update-available">Update available: v${data.version}</span>`;
        break;
      case 'not-available':
        this.updateStatusElement.innerHTML = '<span class="update-current">You have the latest version</span>';
        break;
      case 'downloading':
        this.updateStatusElement.innerHTML = `<span class="update-downloading">Downloading... ${Math.round(data.percent || 0)}%</span>`;
        break;
      case 'downloaded':
        this.updateStatusElement.innerHTML = '<span class="update-ready">Update ready - restart to install</span>';
        break;
      case 'error':
        this.updateStatusElement.innerHTML = `<span class="update-error">Update error: ${data.error}</span>`;
        break;
    }
  }

  async checkForUpdates() {
    await window.forgeAPI.updates.checkForUpdates();
  }
}

// Apply mixins
applyMixin(ForgeBrowser, TabManagerMixin);
applyMixin(ForgeBrowser, NavigationMixin);
applyMixin(ForgeBrowser, WebviewEventsMixin);
applyMixin(ForgeBrowser, UIPanelsMixin);
applyMixin(ForgeBrowser, PasswordManagerMixin);
applyMixin(ForgeBrowser, HistoryMixin);
applyMixin(ForgeBrowser, FavoritesMixin);
applyMixin(ForgeBrowser, AdBlockerMixin);
applyMixin(ForgeBrowser, AIAssistantMixin);
applyMixin(ForgeBrowser, UrlSuggestionsMixin);

// Start the browser
console.log('[Forge] Creating browser instance...');
window.forgeBrowser = new ForgeBrowser();
