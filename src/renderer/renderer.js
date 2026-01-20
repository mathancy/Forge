// Forge Browser - Renderer Process
// Lightweight browser by Forgeworks Interactive Limited

class ForgeBrowser {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.tabCounter = 0;
    this.homepage = 'https://www.google.com';
    
    // Favicon cache: Map of domain -> {url: faviconUrl, timestamp: Date}
    this.faviconCache = new Map();
    this.loadFaviconCache();
    
    // Browser history: Array of {url, title, favicon, timestamp}
    this.browsingHistory = [];
    this.loadBrowsingHistory();
    
    // Site logo mapping for custom branding
    this.siteLogos = {
      'www.youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'm.youtube.com': 'forge-asset://site-logos/YouTube.svg',
      'www.google.com': 'forge-asset://site-logos/Google.svg',
      'google.com': 'forge-asset://site-logos/Google.svg'
    };
    
    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    this.setupWindowControls();
    this.initUpdateListener();
    
    // Display app info
    const appInfo = await window.forgeAPI.getAppInfo();
    console.log(`${appInfo.name} v${appInfo.version} by ${appInfo.company}`);
    console.log(`Electron: ${appInfo.electronVersion}, Chrome: ${appInfo.chromeVersion}`);
    
    // Listen for open-url message from main process
    let urlOpened = false;
    window.forgeAPI.onOpenUrl((url) => {
      if (!urlOpened) {
        urlOpened = true;
        // Close the Home tab if it was created
        if (this.tabs.length === 1 && this.tabs[0].isHome) {
          this.closeTab(this.tabs[0].id, true); // true = skip confirmation
        }
        this.createTab(url);
      }
    });
    
    // Create initial Home tab after a small delay to allow open-url to fire first
    setTimeout(() => {
      if (!urlOpened) {
        this.createHomeTab();
      }
    }, 50);
    
    this.updateStatus('Ready');
  }

  cacheElements() {
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
    
    // Content
    this.browserContent = document.getElementById('browser-content');
    this.welcomePage = document.getElementById('welcome-page');
    this.homeSearch = document.getElementById('home-search');
    
    // Status bar
    this.statusText = document.getElementById('status-text');
    this.statusInfo = document.getElementById('status-info');
    
    // Context menu
    this.tabContextMenu = document.getElementById('tab-context-menu');
    this.contextMenuTabId = null;
    
    // Main menu
    this.btnMenu = document.getElementById('btn-menu');
    this.mainMenu = document.getElementById('main-menu');
    
    // History panel
    this.historyPanel = document.getElementById('history-panel');
    this.historyList = document.getElementById('history-list');
    this.historySearch = document.getElementById('history-search');
    this.btnCloseHistory = document.getElementById('btn-close-history');
    this.btnClearHistory = document.getElementById('btn-clear-history');
    
    // Google Account panel
    this.googleAccountPanel = document.getElementById('google-account-panel');
    this.googleAccountContent = document.getElementById('google-account-content');
    this.btnCloseGooglePanel = document.getElementById('btn-close-google-panel');
    this.googleAccountText = document.getElementById('google-account-text');
    
    // Chrome Import panel
    this.chromeImportPanel = document.getElementById('chrome-import-panel');
    this.chromeImportContent = document.getElementById('chrome-import-content');
    this.btnCloseChromeImport = document.getElementById('btn-close-chrome-import');
    
    // About panel
    this.aboutPanel = document.getElementById('about-panel');
    this.btnCloseAbout = document.getElementById('btn-close-about');
    this.aboutVersion = document.getElementById('about-version');
    this.btnCheckUpdates = document.getElementById('btn-check-updates');
    this.updateStatus = document.getElementById('update-status');
    
    // AI Assistant elements
    this.aiButtons = document.getElementById('ai-buttons');
    this.aiSettingsPanel = document.getElementById('ai-settings-panel');
    this.aiSettingsContent = document.getElementById('ai-settings-content');
    this.btnCloseAISettings = document.getElementById('btn-close-ai-settings');
    this.aiWebviewPanel = document.getElementById('ai-webview-panel');
    this.aiWebviewContainer = document.getElementById('ai-webview-container');
    this.aiWebviewIcon = document.getElementById('ai-webview-icon');
    this.aiWebviewName = document.getElementById('ai-webview-name');
    this.btnAIWebviewClose = document.getElementById('btn-ai-webview-close');
    
    // AI state
    this.currentAIProvider = null;
    this.aiWebview = null;
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
    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(this.urlInput.value);
      }
    });
    
    this.urlInput.addEventListener('focus', () => {
      this.urlInput.select();
    });
    
    // Home search
    this.homeSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.createTab(this.processUrl(this.homeSearch.value));
        this.homeSearch.value = '';
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.createTab();
      }
      // Ctrl+W: Close tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (this.activeTabId) {
          this.closeTab(this.activeTabId);
        }
      }
      // Ctrl+L: Focus URL bar
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.urlInput.focus();
      }
      // F5 or Ctrl+R: Reload
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        this.reload();
      }
      // Alt+Left: Back
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        this.goBack();
      }
      // Alt+Right: Forward
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        this.goForward();
      }
    });
    
    // Close context menu on click outside
    document.addEventListener('click', (e) => {
      // Close tab context menu
      if (!this.tabContextMenu.contains(e.target) && !e.target.closest('.tab')) {
        this.hideContextMenu();
      }
      // Close main menu
      if (!this.mainMenu.contains(e.target) && !e.target.closest('#btn-menu')) {
        this.hideMainMenu();
      }
    });
    
    // Context menu item clicks
    this.tabContextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (item) {
        const action = item.dataset.action;
        this.handleContextMenuAction(action, item);
        this.hideContextMenu();
      }
    });
    
    // Main menu button click
    this.btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMainMenu();
    });
    
    // Main menu item clicks
    this.mainMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (item) {
        const action = item.dataset.action;
        this.handleMainMenuAction(action);
        this.hideMainMenu();
      }
    });
    
    // History panel events
    this.btnCloseHistory.addEventListener('click', () => this.hideHistoryPanel());
    this.btnClearHistory.addEventListener('click', () => this.clearHistory());
    this.historySearch.addEventListener('input', () => this.filterHistory());
    
    // Google Account panel events
    this.btnCloseGooglePanel.addEventListener('click', () => this.hideGoogleAccountPanel());
    
    // Chrome Import panel events
    this.btnCloseChromeImport.addEventListener('click', () => this.hideChromeImportPanel());
    
    // About panel events
    this.btnCloseAbout.addEventListener('click', () => this.hideAboutPanel());
    this.btnCheckUpdates.addEventListener('click', () => this.checkForUpdates());
    
    // AI Assistant events
    this.btnCloseAISettings.addEventListener('click', () => this.hideAISettingsPanel());
    this.btnAIWebviewClose.addEventListener('click', () => this.hideAIWebviewPanel());
    
    // Initialize Google auth status
    this.updateGoogleAuthStatus();
    
    // Initialize AI providers
    this.initAIProviders();
    
    // Custom tab drag and drop for reordering (using mouse events for cursor control)
    this.draggedTab = null;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragThreshold = 5; // pixels before drag starts
    
    // Mouse move handler for dragging
    this.handleMouseMove = (e) => {
      if (!this.draggedTab) return;
      
      // Check if we've passed the drag threshold
      if (!this.isDragging) {
        const distance = Math.abs(e.clientX - this.dragStartX);
        if (distance < this.dragThreshold) return;
        
        // Start actual dragging
        this.isDragging = true;
        this.draggedTab.classList.add('dragging');
        document.documentElement.classList.add('tab-dragging');
        document.body.classList.add('tab-dragging');
        this.tabsContainer.classList.add('dragging-active');
      }
      
      // Reorder tabs based on mouse position
      const afterElement = this.getDragAfterElement(this.tabsContainer, e.clientX);
      
      if (afterElement == null) {
        this.tabsContainer.appendChild(this.draggedTab);
      } else if (afterElement !== this.draggedTab) {
        this.tabsContainer.insertBefore(this.draggedTab, afterElement);
      }
    };
    
    // Mouse up handler to end dragging
    this.handleMouseUp = (e) => {
      if (this.draggedTab) {
        if (this.isDragging) {
          this.draggedTab.classList.remove('dragging');
          document.documentElement.classList.remove('tab-dragging');
          document.body.classList.remove('tab-dragging');
          this.tabsContainer.classList.remove('dragging-active');
          // Update tabs array to match DOM order
          this.reorderTabsArray();
        }
        this.draggedTab = null;
        this.isDragging = false;
      }
      document.removeEventListener('mousemove', this.handleMouseMove);
      document.removeEventListener('mouseup', this.handleMouseUp);
    };
  }

  setupWindowControls() {
    this.btnMinimize.addEventListener('click', () => window.forgeAPI.minimize());
    this.btnMaximize.addEventListener('click', () => window.forgeAPI.maximize());
    this.btnClose.addEventListener('click', () => window.forgeAPI.close());
    
    window.forgeAPI.onMaximized(() => {
      this.btnMaximize.title = 'Restore';
    });
    
    window.forgeAPI.onRestored(() => {
      this.btnMaximize.title = 'Maximize';
    });
  }

  createTab(url = null) {
    const tabId = `tab-${++this.tabCounter}`;
    
    // Create tab element
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
    
    // Mouse-based drag handler (replaces native drag API for cursor control)
    tab.addEventListener('mousedown', (e) => {
      // Only start drag on left click and not on close button
      if (e.button !== 0 || e.target.closest('.tab-close')) return;
      
      this.draggedTab = tab;
      this.isDragging = false;
      this.dragStartX = e.clientX;
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });
    
    // Tab click handler
    tab.addEventListener('click', (e) => {
      // Don't switch tabs if we just finished dragging
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!e.target.closest('.tab-close')) {
        this.switchTab(tabId);
      }
    });
    
    // Tab right-click handler
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY, tabId);
    });
    
    // Close button handler
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
    
    // Webview event handlers
    webview.addEventListener('did-start-loading', () => {
      this.updateStatus('Loading...');
      this.updateTabLoading(tabId, true);
    });
    
    webview.addEventListener('did-stop-loading', () => {
      this.updateStatus('Ready');
      this.updateTabLoading(tabId, false);
    });
    
    webview.addEventListener('page-title-updated', (e) => {
      this.updateTabTitle(tabId, e.title);
    });
    
    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        this.updateTabFavicon(tabId, e.favicons[0]);
      }
    });
    
    webview.addEventListener('did-navigate', (e) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tabId === this.activeTabId) {
        this.urlInput.value = e.url;
        this.updateSecurityIndicator(e.url);
        this.updateNavigationButtons();
      }
      // Add to browsing history (exclude home and internal pages)
      if (!e.url.startsWith('forge://') && !e.url.startsWith('about:')) {
        const title = tab ? tab.title : 'New Tab';
        const favicon = tab ? tab.favicon : null;
        this.addToHistory(e.url, title, favicon);
      }
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tabId === this.activeTabId && e.isMainFrame) {
        this.urlInput.value = e.url;
        this.updateSecurityIndicator(e.url);
        this.updateNavigationButtons();
      }
      // Add to browsing history for in-page navigation too
      if (e.isMainFrame && !e.url.startsWith('forge://') && !e.url.startsWith('about:')) {
        const title = tab ? tab.title : 'New Tab';
        const favicon = tab ? tab.favicon : null;
        this.addToHistory(e.url, title, favicon);
      }
    });
    
    webview.addEventListener('new-window', (e) => {
      // Open new windows in a new tab
      this.createTab(e.url);
    });
    
    this.browserContent.appendChild(webview);
    
    // Store tab info with history tracking
    this.tabs.push({
      id: tabId,
      element: tab,
      webview: webview,
      title: 'New Tab',
      url: '',
      history: [], // Custom history stack
      historyIndex: -1 // Current position in history
    });
    
    // Switch to new tab and navigate if URL provided
    this.switchTab(tabId);
    
    if (url) {
      webview.src = url;
    }
    
    return tabId;
  }

  closeTab(tabId, skipAnimation = false) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;
    
    const tab = this.tabs[tabIndex];
    
    if (!skipAnimation) {
      // Add closing animation
      tab.element.classList.add('closing');
    }
    
    const removeTab = () => {
      // Remove elements
      tab.element.remove();
      if (tab.webview) {
        tab.webview.remove();
      }
      
      // Remove from array
      this.tabs.splice(tabIndex, 1);
      
      // If closed tab was active, switch to another tab
      if (tabId === this.activeTabId) {
        if (this.tabs.length > 0) {
          const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
          this.switchTab(this.tabs[newActiveIndex].id);
        } else {
          // No tabs left, create a new home tab
          this.activeTabId = null;
          this.createHomeTab();
        }
      }
      
      this.updateStatus(`Closed tab`);
    };
    
    if (skipAnimation) {
      removeTab();
    } else {
      // Wait for animation to complete before removing
      setTimeout(removeTab, 300); // Match animation duration
    }
  }

  switchTab(tabId) {
    // Deactivate current tab
    this.tabs.forEach(tab => {
      tab.element.classList.remove('active');
      if (tab.webview) {
        tab.webview.classList.remove('active');
      }
    });
    
    // Activate new tab
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.element.classList.add('active');
      this.activeTabId = tabId;
      
      if (tab.isHome) {
        // Show welcome page for home tab
        this.welcomePage.classList.remove('hidden');
        this.urlInput.value = '';
        this.updateSecurityIndicator('');
        this.btnBack.disabled = true;
        this.btnForward.disabled = true;
      } else {
        // Hide welcome page and show webview
        this.welcomePage.classList.add('hidden');
        if (tab.webview) {
          tab.webview.classList.add('active');
          
          // Update URL bar
          try {
            const currentUrl = tab.webview.getURL();
            this.urlInput.value = currentUrl || '';
            this.updateSecurityIndicator(currentUrl);
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

  navigate(input) {
    const url = this.processUrl(input);
    
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        this.navigateTabTo(tab, url);
      }
    } else {
      this.createTab(url);
    }
  }

  navigateTabTo(tab, url) {
    // Add to history (remove any forward history when navigating to new page)
    tab.history = tab.history.slice(0, tab.historyIndex + 1);
    tab.history.push(url);
    tab.historyIndex = tab.history.length - 1;
    
    // Load the URL
    this.loadHistoryEntry(tab, url);
  }

  loadHistoryEntry(tab, url) {
    if (url === 'forge://home') {
      // Show Home page
      if (tab.webview) {
        tab.webview.classList.remove('active');
        
        // Mute audio to stop media playback (preserves history unlike about:blank)
        try {
          tab.webview.setAudioMuted(true);
        } catch (e) {
          // Webview not ready, ignore
        }
      }
      tab.isHome = true;
      tab.url = 'forge://home';
      tab.title = 'Home';
      tab.element.dataset.isHome = 'true';
      
      // Update tab icon
      const iconElement = tab.element.querySelector('.tab-home-icon, .tab-favicon');
      if (iconElement) {
        iconElement.classList.remove('tab-favicon');
        iconElement.classList.add('tab-home-icon');
        iconElement.src = 'forge-asset://ui-icons/home.svg';
      }
      
      // Update tab title
      tab.element.querySelector('.tab-title').textContent = 'Home';
      
      // Show welcome page
      this.welcomePage.classList.remove('hidden');
      this.urlInput.value = '';
      this.updateSecurityIndicator('');
    } else {
      // Show webview with URL
      if (!tab.webview) {
        // Create webview if it doesn't exist (for home-created tabs)
        this.createWebviewForTab(tab, url);
      } else {
        tab.isHome = false;
        tab.element.dataset.isHome = 'false';
        this.welcomePage.classList.add('hidden');
        tab.webview.classList.add('active');
        
        // Unmute audio when returning to webview
        try {
          tab.webview.setAudioMuted(false);
        } catch (e) {
          // Ignore
        }
        
        // Load cached favicon immediately if available
        const cachedFavicon = this.getCachedFavicon(url);
        if (cachedFavicon) {
          const iconElement = tab.element.querySelector('.tab-home-icon, .tab-favicon');
          if (iconElement) {
            iconElement.classList.remove('tab-home-icon');
            iconElement.classList.add('tab-favicon');
            iconElement.src = cachedFavicon;
          }
        }
        
        // Navigate to the URL
        // We always want to navigate when the user explicitly enters a URL
        tab.webview.src = url;
        
        tab.url = url;
        this.urlInput.value = url;
        this.updateSecurityIndicator(url);
      }
    }
    
    this.updateNavigationButtons();
  }

  processUrl(input) {
    input = input.trim();
    
    // Check if it's already a valid URL
    if (input.match(/^https?:\/\//i)) {
      return input;
    }
    
    // Check if it looks like a domain
    if (input.match(/^[\w-]+(\.[\w-]+)+/)) {
      return `https://${input}`;
    }
    
    // Treat as search query
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }

  goBack() {
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (!tab) return;
      
      // If we're on a webview, check if it has internal history first
      if (tab.webview && !tab.isHome) {
        try {
          if (tab.webview.canGoBack()) {
            tab.webview.goBack();
            setTimeout(() => this.updateNavigationButtons(), 100);
            return;
          }
        } catch (e) {
          // Webview not ready, fall through to custom history
        }
      }
      
      // Use custom history if webview can't go back
      if (tab.historyIndex > 0) {
        tab.historyIndex--;
        const url = tab.history[tab.historyIndex];
        this.loadHistoryEntry(tab, url);
      }
    }
  }

  goForward() {
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (!tab) return;
      
      // If we're on Home but have custom forward history, use it first to show webview
      if (tab.isHome && tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex++;
        const url = tab.history[tab.historyIndex];
        this.loadHistoryEntry(tab, url);
        return;
      }
      
      // If we're on a webview, check if it has internal forward history
      if (tab.webview && !tab.isHome) {
        try {
          if (tab.webview.canGoForward()) {
            tab.webview.goForward();
            setTimeout(() => this.updateNavigationButtons(), 100);
            return;
          }
        } catch (e) {
          // Webview not ready, fall through to custom history
        }
      }
      
      // Use custom history if webview can't go forward
      if (tab.historyIndex < tab.history.length - 1) {
        tab.historyIndex++;
        const url = tab.history[tab.historyIndex];
        this.loadHistoryEntry(tab, url);
      }
    }
  }

  reload() {
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        // Don't reload if we're on Home page
        if (tab.isHome) {
          return;
        }
        if (tab.webview) {
          tab.webview.reload();
        }
      }
    }
  }

  goHome() {
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab && !tab.isHome) {
        this.navigateTabTo(tab, 'forge://home');
      }
    } else {
      // Create a new home tab
      this.createHomeTab();
    }
  }

  updateTabTitle(tabId, title) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    tab.title = title;
    const titleElement = tab.element.querySelector('.tab-title');
    
    // Check if this site has a custom logo
    let logoPath = null;
    let contentText = title;
    
    if (tab.url) {
      try {
        const domain = new URL(tab.url).hostname;
        logoPath = this.siteLogos[domain];
        
        // If we have a logo, parse out the content description
        if (logoPath) {
          // Remove site name suffix (e.g., " - YouTube", " - Google")
          contentText = title
            .replace(/ - YouTube$/i, '')
            .replace(/ - Google$/i, '')
            .replace(/^YouTube$/i, '') // Just "YouTube" with no content
            .replace(/^Google$/i, ''); // Just "Google" with no content
        }
      } catch (e) {
        // Invalid URL, use plain title
      }
    }
    
    // Build the title HTML
    if (logoPath && contentText.trim()) {
      // Show logo + content text
      titleElement.innerHTML = `
        <img class="tab-title-logo" src="${logoPath}" alt="">
        <span class="tab-title-text">${this.escapeHtml(contentText)}</span>
      `;
    } else if (logoPath) {
      // Just logo, no content
      titleElement.innerHTML = `<img class="tab-title-logo" src="${logoPath}" alt="">`;
    } else {
      // Plain text
      titleElement.innerHTML = `<span class="tab-title-text">${this.escapeHtml(title)}</span>`;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  updateTabFavicon(tabId, faviconUrl) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      // Store favicon on tab object
      tab.favicon = faviconUrl;
      
      const favicon = tab.element.querySelector('.tab-favicon, .tab-home-icon');
      if (favicon) {
        // Ensure it has the correct class for regular favicons (remove special icon classes)
        favicon.classList.remove('tab-home-icon', 'tab-icon-plus');
        favicon.classList.add('tab-favicon');
        favicon.src = faviconUrl;
        favicon.onerror = () => {
          // Fallback to plus icon if favicon fails to load
          favicon.classList.add('tab-icon-plus');
          favicon.src = 'forge-asset://ui-icons/plus.svg';
        };
        
        // Cache the favicon for this URL
        if (tab.url && faviconUrl) {
          try {
            const domain = new URL(tab.url).hostname;
            this.faviconCache.set(domain, {
              url: faviconUrl,
              timestamp: Date.now()
            });
            this.saveFaviconCache();
            
            // Update any history entries for this URL with the favicon
            this.updateHistoryFavicon(tab.url, faviconUrl);
          } catch (e) {
            // Invalid URL, skip caching
          }
        }
      }
    }
  }
  
  loadFaviconCache() {
    try {
      const cached = localStorage.getItem('forge_favicon_cache');
      if (cached) {
        const data = JSON.parse(cached);
        // Convert array back to Map
        this.faviconCache = new Map(data);
        
        // Clean old entries (older than 7 days)
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        for (const [domain, entry] of this.faviconCache.entries()) {
          if (entry.timestamp < weekAgo) {
            this.faviconCache.delete(domain);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load favicon cache:', e);
      this.faviconCache = new Map();
    }
  }
  
  saveFaviconCache() {
    try {
      // Convert Map to array for JSON storage
      const data = Array.from(this.faviconCache.entries());
      localStorage.setItem('forge_favicon_cache', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save favicon cache:', e);
    }
  }
  
  getCachedFavicon(url) {
    try {
      const domain = new URL(url).hostname;
      const cached = this.faviconCache.get(domain);
      if (cached) {
        return cached.url;
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  }

  updateTabLoading(tabId, isLoading) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      if (isLoading) {
        tab.element.classList.add('loading');
      } else {
        tab.element.classList.remove('loading');
      }
    }
  }

  updateNavigationButtons() {
    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) {
        // Check if we can go back (webview internal history OR custom history)
        let canGoBack = tab.historyIndex > 0;
        let canGoForward = tab.historyIndex < tab.history.length - 1;
        
        if (tab.webview && !tab.isHome) {
          try {
            canGoBack = canGoBack || tab.webview.canGoBack();
            canGoForward = canGoForward || tab.webview.canGoForward();
          } catch (e) {
            // Webview not ready, use custom history only
          }
        }
        
        this.btnBack.disabled = !canGoBack;
        this.btnForward.disabled = !canGoForward;
      } else {
        this.btnBack.disabled = true;
        this.btnForward.disabled = true;
      }
    } else {
      this.btnBack.disabled = true;
      this.btnForward.disabled = true;
    }
  }

  updateSecurityIndicator(url) {
    this.securityIndicator.classList.remove('secure', 'insecure');
    
    if (url && url.startsWith('https://')) {
      this.securityIndicator.classList.add('secure');
    } else if (url && url.startsWith('http://')) {
      this.securityIndicator.classList.add('insecure');
    }
  }

  updateStatus(text) {
    this.statusText.textContent = text;
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
    const newOrder = [];
    const tabElements = this.tabsContainer.querySelectorAll('.tab');
    
    tabElements.forEach(tabElement => {
      const tabId = tabElement.dataset.tabId;
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        newOrder.push(tab);
      }
    });
    
    this.tabs = newOrder;
  }

  showContextMenu(x, y, tabId) {
    this.contextMenuTabId = tabId;
    this.tabContextMenu.classList.remove('hidden');
    
    // Disable/enable menu items based on context
    const moveToNewWindowItem = this.tabContextMenu.querySelector('[data-action="move-to-new-window"]');
    if (moveToNewWindowItem) {
      if (this.tabs.length <= 1) {
        moveToNewWindowItem.classList.add('disabled');
      } else {
        moveToNewWindowItem.classList.remove('disabled');
      }
    }
    
    // Position the menu
    this.tabContextMenu.style.left = `${x}px`;
    this.tabContextMenu.style.top = `${y}px`;
    
    // Ensure menu stays within viewport
    const rect = this.tabContextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.tabContextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.tabContextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  }

  hideContextMenu() {
    this.tabContextMenu.classList.add('hidden');
    this.contextMenuTabId = null;
  }

  handleContextMenuAction(action, element) {
    if (!this.contextMenuTabId) return;
    
    // Don't execute action if menu item is disabled
    if (element && element.classList.contains('disabled')) return;
    
    switch(action) {
      case 'new-tab-right':
        this.createTabToRight(this.contextMenuTabId);
        break;
      case 'move-to-new-window':
        this.moveTabToNewWindow(this.contextMenuTabId);
        break;
      case 'close':
        this.closeTab(this.contextMenuTabId);
        break;
      // Other actions will be implemented later
    }
  }

  createTabToRight(referenceTabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === referenceTabId);
    if (tabIndex === -1) return;
    
    // Create new tab
    const newTabId = this.createTab();
    
    // Find the newly created tab (it was appended to the end)
    const newTab = this.tabs.find(t => t.id === newTabId);
    if (!newTab) return;
    
    // Remove from current position
    const currentIndex = this.tabs.indexOf(newTab);
    this.tabs.splice(currentIndex, 1);
    
    // Insert after reference tab
    this.tabs.splice(tabIndex + 1, 0, newTab);
    
    // Reorder DOM elements
    const referenceTab = this.tabs[tabIndex];
    referenceTab.element.insertAdjacentElement('afterend', newTab.element);
    
    this.updateStatus('New tab created');
  }

  async moveTabToNewWindow(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    // Get the current URL from the webview (if it exists)
    let url = null;
    if (tab.webview) {
      try {
        url = tab.webview.getURL();
      } catch (e) {
        url = null;
      }
    }
    
    // Close the tab in current window
    this.closeTab(tabId);
    
    // Request main process to create new window with the URL
    await window.forgeAPI.createNewWindow(url);
    
    this.updateStatus('Tab moved to new window');
  }

  createWebviewForTab(tab, url) {
    // Create webview
    const webview = document.createElement('webview');
    webview.id = tab.id;
    webview.setAttribute('allowpopups', '');
    webview.setAttribute('partition', 'persist:main');
    webview.setAttribute('webpreferences', 'contextIsolation=yes');
    
    // Webview event handlers
    webview.addEventListener('did-start-loading', () => {
      this.updateStatus('Loading...');
      this.updateTabLoading(tab.id, true);
    });
    
    webview.addEventListener('did-stop-loading', () => {
      this.updateStatus('Ready');
      this.updateTabLoading(tab.id, false);
    });
    
    webview.addEventListener('page-title-updated', (e) => {
      this.updateTabTitle(tab.id, e.title);
    });
    
    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        this.updateTabFavicon(tab.id, e.favicons[0]);
      }
    });
    
    webview.addEventListener('did-navigate', (e) => {
      if (tab.id === this.activeTabId) {
        this.urlInput.value = e.url;
        this.updateSecurityIndicator(e.url);
      }
      // Add to browsing history (exclude home and internal pages)
      if (!e.url.startsWith('forge://') && !e.url.startsWith('about:')) {
        const title = tab.title || 'New Tab';
        const favicon = tab.favicon || null;
        this.addToHistory(e.url, title, favicon);
      }
    });
    
    webview.addEventListener('did-navigate-in-page', (e) => {
      if (tab.id === this.activeTabId && e.isMainFrame) {
        this.urlInput.value = e.url;
        this.updateSecurityIndicator(e.url);
      }
      // Add to browsing history for in-page navigation too
      if (e.isMainFrame && !e.url.startsWith('forge://') && !e.url.startsWith('about:')) {
        const title = tab.title || 'New Tab';
        const favicon = tab.favicon || null;
        this.addToHistory(e.url, title, favicon);
      }
    });
    
    webview.addEventListener('new-window', (e) => {
      this.createTab(e.url);
    });
    
    this.browserContent.appendChild(webview);
    tab.webview = webview;
    
    // Update tab properties
    tab.isHome = false;
    tab.element.dataset.isHome = 'false';
    
    // Update tab icon - load from cache if available
    const iconElement = tab.element.querySelector('.tab-home-icon, .tab-favicon');
    if (iconElement) {
      iconElement.classList.remove('tab-home-icon');
      iconElement.classList.add('tab-favicon');
      
      // Try to load cached favicon immediately
      const cachedFavicon = this.getCachedFavicon(url);
      iconElement.src = cachedFavicon || '';
    }
    
    // Hide welcome page and show webview
    this.welcomePage.classList.add('hidden');
    webview.classList.add('active');
    
    // Load the URL
    webview.src = url;
    tab.url = url;
    this.urlInput.value = url;
    this.updateSecurityIndicator(url);
  }

  createHomeTab() {
    const tabId = `tab-${++this.tabCounter}`;
    
    // Create tab element
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
    
    // Mouse-based drag handler (replaces native drag API for cursor control)
    tab.addEventListener('mousedown', (e) => {
      // Only start drag on left click and not on close button
      if (e.button !== 0 || e.target.closest('.tab-close')) return;
      
      this.draggedTab = tab;
      this.isDragging = false;
      this.dragStartX = e.clientX;
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    });
    
    // Tab click handler
    tab.addEventListener('click', (e) => {
      // Don't switch tabs if we just finished dragging
      if (this.isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!e.target.closest('.tab-close')) {
        this.switchTab(tabId);
      }
    });
    
    // Tab right-click handler
    tab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY, tabId);
    });
    
    // Close button handler
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeTab(tabId);
    });
    
    this.tabsContainer.appendChild(tab);
    
    // Store tab info (no webview for home tab, uses welcome page)
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
    this.updateStatus('Ready');
  }

  // ==================== Main Menu Methods ====================
  
  toggleMainMenu() {
    if (this.mainMenu.classList.contains('hidden')) {
      this.showMainMenu();
    } else {
      this.hideMainMenu();
    }
  }
  
  showMainMenu() {
    const btnRect = this.btnMenu.getBoundingClientRect();
    
    // Position menu below the button, aligned to the right
    this.mainMenu.classList.remove('hidden');
    this.mainMenu.style.top = `${btnRect.bottom + 8}px`;
    this.mainMenu.style.right = `${window.innerWidth - btnRect.right}px`;
    this.mainMenu.style.left = 'auto';
  }
  
  hideMainMenu() {
    this.mainMenu.classList.add('hidden');
  }
  
  handleMainMenuAction(action) {
    switch(action) {
      case 'history':
        this.showHistoryPanel();
        break;
      case 'devtools':
        this.openDevTools();
        break;
      case 'google-account':
        this.showGoogleAccountPanel();
        break;
      case 'import-chrome':
        this.showChromeImportPanel();
        break;
      case 'ai-assistant':
        this.showAISettingsPanel();
        break;
      case 'about':
        this.showAboutPanel();
        break;
    }
  }
  
  openDevTools() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.openDevTools();
    }
  }

  // ==================== Google Account Methods ====================
  
  async updateGoogleAuthStatus() {
    try {
      const status = await window.forgeAPI.googleAuth.getStatus();
      if (status.isSignedIn && status.userInfo) {
        this.googleAccountText.textContent = status.userInfo.name || status.userInfo.email;
      } else {
        this.googleAccountText.textContent = 'Sign in with Google';
      }
    } catch (e) {
      console.error('Failed to get Google auth status:', e);
    }
  }
  
  showGoogleAccountPanel() {
    this.googleAccountPanel.classList.remove('hidden');
    this.renderGoogleAccountPanel();
  }
  
  hideGoogleAccountPanel() {
    this.googleAccountPanel.classList.add('hidden');
  }
  
  async renderGoogleAccountPanel() {
    const status = await window.forgeAPI.googleAuth.getStatus();
    
    if (status.isSignedIn && status.userInfo) {
      // Signed in view
      this.googleAccountContent.innerHTML = `
        <div class="google-signed-in">
          <img class="google-user-avatar" src="${status.userInfo.picture || 'forge-asset://ui-icons/globe.svg'}" alt="Avatar">
          <div class="google-user-name">${this.escapeHtml(status.userInfo.name || 'User')}</div>
          <div class="google-user-email">${this.escapeHtml(status.userInfo.email || '')}</div>
          <button class="google-sign-out-btn" id="btn-google-sign-out">Sign out</button>
        </div>
      `;
      
      document.getElementById('btn-google-sign-out').addEventListener('click', () => this.googleSignOut());
    } else {
      // Signed out view
      let credentialsSection = '';
      
      if (!status.hasCredentials) {
        credentialsSection = `
          <div class="google-setup-section">
            <h3>Setup Required</h3>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">
              To use Google Sign-In, you need to create OAuth credentials in Google Cloud Console.
            </p>
            <div class="google-credentials-form">
              <input type="text" id="google-client-id" placeholder="Client ID">
              <input type="password" id="google-client-secret" placeholder="Client Secret">
              <button class="google-save-btn" id="btn-save-credentials">Save Credentials</button>
            </div>
            <p class="google-setup-note">
              Get credentials from <a href="#" id="link-google-console">Google Cloud Console</a><br>
              Create an OAuth 2.0 Client ID (Desktop app type)
            </p>
          </div>
        `;
      }
      
      this.googleAccountContent.innerHTML = `
        <div class="google-signed-out">
          <p>Sign in with your Google account to stay logged into Google services across browser sessions.</p>
          <button class="google-sign-in-btn" id="btn-google-sign-in" ${!status.hasCredentials ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <svg viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          ${credentialsSection}
        </div>
      `;
      
      if (status.hasCredentials) {
        document.getElementById('btn-google-sign-in').addEventListener('click', () => this.googleSignIn());
      }
      
      if (!status.hasCredentials) {
        document.getElementById('btn-save-credentials').addEventListener('click', () => this.saveGoogleCredentials());
        document.getElementById('link-google-console').addEventListener('click', (e) => {
          e.preventDefault();
          this.createTab('https://console.cloud.google.com/apis/credentials');
          this.hideGoogleAccountPanel();
        });
      }
    }
  }
  
  async googleSignIn() {
    const btn = document.getElementById('btn-google-sign-in');
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    
    try {
      const result = await window.forgeAPI.googleAuth.signIn();
      if (result.success) {
        this.updateGoogleAuthStatus();
        this.renderGoogleAccountPanel();
      } else {
        alert('Sign in failed: ' + result.error);
      }
    } catch (e) {
      alert('Sign in failed: ' + e.message);
    }
    
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    `;
  }
  
  async googleSignOut() {
    const btn = document.getElementById('btn-google-sign-out');
    btn.disabled = true;
    btn.textContent = 'Signing out...';
    
    try {
      await window.forgeAPI.googleAuth.signOut();
      this.updateGoogleAuthStatus();
      this.renderGoogleAccountPanel();
    } catch (e) {
      alert('Sign out failed: ' + e.message);
    }
  }
  
  async saveGoogleCredentials() {
    const clientId = document.getElementById('google-client-id').value.trim();
    const clientSecret = document.getElementById('google-client-secret').value.trim();
    
    if (!clientId || !clientSecret) {
      alert('Please enter both Client ID and Client Secret');
      return;
    }
    
    try {
      const result = await window.forgeAPI.googleAuth.setCredentials(clientId, clientSecret);
      if (result.success) {
        this.renderGoogleAccountPanel();
      } else {
        alert('Failed to save credentials: ' + result.error);
      }
    } catch (e) {
      alert('Failed to save credentials: ' + e.message);
    }
  }

  // ==================== Chrome Import Methods ====================
  
  showChromeImportPanel() {
    this.chromeImportPanel.classList.remove('hidden');
    this.renderChromeImportPanel();
  }
  
  hideChromeImportPanel() {
    this.chromeImportPanel.classList.add('hidden');
  }
  
  async renderChromeImportPanel() {
    this.chromeImportContent.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading...</div>';
    
    try {
      const result = await window.forgeAPI.chromeImport.getProfiles();
      
      if (!result.success) {
        this.chromeImportContent.innerHTML = `
          <div class="chrome-not-found">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <h3>Chrome Not Found</h3>
            <p>${result.error || 'Chrome user data could not be located on this computer.'}</p>
          </div>
        `;
        return;
      }
      
      if (result.profiles.length === 0) {
        this.chromeImportContent.innerHTML = `
          <div class="chrome-not-found">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4M12 16h.01"/>
            </svg>
            <h3>No Profiles Found</h3>
            <p>No Chrome profiles were found on this computer.</p>
          </div>
        `;
        return;
      }
      
      // Build profile options
      const profileOptions = result.profiles.map(p => {
        const label = p.email ? `${p.name} (${p.email})` : p.name;
        return `<option value="${p.id}">${this.escapeHtml(label)}</option>`;
      }).join('');
      
      this.chromeImportContent.innerHTML = `
        <p class="chrome-import-intro">
          Import your bookmarks, browsing history, and saved login information from your local Chrome installation.
        </p>
        
        <div class="chrome-profile-selector">
          <label>Chrome Profile</label>
          <select id="chrome-profile-select">
            ${profileOptions}
          </select>
        </div>
        
        <div class="chrome-import-options" id="chrome-import-options">
          <label class="chrome-import-option">
            <input type="checkbox" id="import-bookmarks" checked>
            <div class="chrome-import-option-info">
              <div class="chrome-import-option-title">Bookmarks</div>
              <div class="chrome-import-option-desc">Import your saved bookmarks</div>
            </div>
            <span class="chrome-import-option-count" id="count-bookmarks">-</span>
          </label>
          
          <label class="chrome-import-option">
            <input type="checkbox" id="import-history" checked>
            <div class="chrome-import-option-info">
              <div class="chrome-import-option-title">Browsing History</div>
              <div class="chrome-import-option-desc">Import recent browsing history</div>
            </div>
            <span class="chrome-import-option-count" id="count-history">-</span>
          </label>
          
          <label class="chrome-import-option">
            <input type="checkbox" id="import-logins">
            <div class="chrome-import-option-info">
              <div class="chrome-import-option-title">Saved Logins</div>
              <div class="chrome-import-option-desc">Import saved usernames (passwords are encrypted)</div>
            </div>
            <span class="chrome-import-option-count" id="count-logins">-</span>
          </label>
        </div>
        
        <button class="chrome-import-btn" id="btn-start-import">Import Selected Data</button>
        
        <div class="chrome-import-progress hidden" id="chrome-import-progress">
          <div class="chrome-import-progress-bar">
            <div class="chrome-import-progress-fill" id="chrome-progress-fill"></div>
          </div>
          <div class="chrome-import-progress-text" id="chrome-progress-text">Importing...</div>
        </div>
        
        <div id="chrome-import-results" class="chrome-import-results hidden"></div>
      `;
      
      // Bind events
      document.getElementById('chrome-profile-select').addEventListener('change', (e) => {
        this.loadChromeProfileSummary(e.target.value);
      });
      
      document.getElementById('btn-start-import').addEventListener('click', () => this.startChromeImport());
      
      // Load initial profile summary
      this.loadChromeProfileSummary(result.profiles[0].id);
      
    } catch (e) {
      this.chromeImportContent.innerHTML = `
        <div class="chrome-import-error">
          Error: ${e.message}
        </div>
      `;
    }
  }
  
  async loadChromeProfileSummary(profileId) {
    try {
      const summary = await window.forgeAPI.chromeImport.getImportSummary(profileId);
      
      if (summary.success) {
        document.getElementById('count-bookmarks').textContent = 
          summary.summary.bookmarks.available ? `${summary.summary.bookmarks.count} items` : 'N/A';
        document.getElementById('count-history').textContent = 
          summary.summary.history.available ? 'Available' : 'N/A';
        document.getElementById('count-logins').textContent = 
          summary.summary.logins.available ? 'Available' : 'N/A';
        
        // Disable unavailable options
        document.getElementById('import-bookmarks').disabled = !summary.summary.bookmarks.available;
        document.getElementById('import-history').disabled = !summary.summary.history.available;
        document.getElementById('import-logins').disabled = !summary.summary.logins.available;
      }
    } catch (e) {
      console.error('Failed to load profile summary:', e);
    }
  }
  
  async startChromeImport() {
    const profileId = document.getElementById('chrome-profile-select').value;
    const importBookmarks = document.getElementById('import-bookmarks').checked;
    const importHistory = document.getElementById('import-history').checked;
    const importLogins = document.getElementById('import-logins').checked;
    
    if (!importBookmarks && !importHistory && !importLogins) {
      alert('Please select at least one item to import');
      return;
    }
    
    const btn = document.getElementById('btn-start-import');
    const progress = document.getElementById('chrome-import-progress');
    const progressFill = document.getElementById('chrome-progress-fill');
    const progressText = document.getElementById('chrome-progress-text');
    const resultsDiv = document.getElementById('chrome-import-results');
    
    btn.disabled = true;
    btn.textContent = 'Importing...';
    progress.classList.remove('hidden');
    resultsDiv.classList.add('hidden');
    
    const results = {
      bookmarks: { imported: 0, error: null },
      history: { imported: 0, error: null },
      logins: { imported: 0, error: null }
    };
    
    let step = 0;
    const totalSteps = (importBookmarks ? 1 : 0) + (importHistory ? 1 : 0) + (importLogins ? 1 : 0);
    
    try {
      // Import bookmarks
      if (importBookmarks) {
        progressText.textContent = 'Importing bookmarks...';
        progressFill.style.width = `${(step / totalSteps) * 100}%`;
        
        const result = await window.forgeAPI.chromeImport.importBookmarks(profileId);
        if (result.success) {
          results.bookmarks.imported = result.count;
          // Store bookmarks (you could save to localStorage or a file)
          this.importedBookmarks = result.bookmarks;
        } else {
          results.bookmarks.error = result.error;
        }
        step++;
      }
      
      // Import history
      if (importHistory) {
        progressText.textContent = 'Importing history...';
        progressFill.style.width = `${(step / totalSteps) * 100}%`;
        
        const result = await window.forgeAPI.chromeImport.importHistory(profileId, 5000);
        if (result.success) {
          results.history.imported = result.count;
          // Merge with existing history
          this.mergeImportedHistory(result.history);
        } else {
          results.history.error = result.error;
        }
        step++;
      }
      
      // Import logins
      if (importLogins) {
        progressText.textContent = 'Importing saved logins...';
        progressFill.style.width = `${(step / totalSteps) * 100}%`;
        
        const result = await window.forgeAPI.chromeImport.getSavedLogins(profileId);
        if (result.success) {
          results.logins.imported = result.count;
          this.importedLogins = result.logins;
        } else {
          results.logins.error = result.error;
        }
        step++;
      }
      
      // Complete
      progressFill.style.width = '100%';
      progressText.textContent = 'Import complete!';
      
      // Show results
      let resultsHtml = '';
      if (importBookmarks) {
        resultsHtml += `
          <div class="chrome-import-result-item">
            <span class="chrome-import-result-label">Bookmarks</span>
            <span class="chrome-import-result-value">${results.bookmarks.error ? 'Error: ' + results.bookmarks.error : results.bookmarks.imported + ' imported'}</span>
          </div>
        `;
      }
      if (importHistory) {
        resultsHtml += `
          <div class="chrome-import-result-item">
            <span class="chrome-import-result-label">History</span>
            <span class="chrome-import-result-value">${results.history.error ? 'Error: ' + results.history.error : results.history.imported + ' imported'}</span>
          </div>
        `;
      }
      if (importLogins) {
        resultsHtml += `
          <div class="chrome-import-result-item">
            <span class="chrome-import-result-label">Saved Logins</span>
            <span class="chrome-import-result-value">${results.logins.error ? 'Error: ' + results.logins.error : results.logins.imported + ' imported'}</span>
          </div>
        `;
      }
      
      resultsDiv.innerHTML = resultsHtml;
      resultsDiv.classList.remove('hidden');
      
    } catch (e) {
      progressText.textContent = 'Import failed: ' + e.message;
    }
    
    btn.disabled = false;
    btn.textContent = 'Import Selected Data';
  }
  
  mergeImportedHistory(importedHistory) {
    // Convert imported history to our format and merge
    for (const item of importedHistory) {
      // Check if this URL already exists
      const existing = this.browsingHistory.findIndex(h => h.url === item.url);
      
      if (existing === -1) {
        // Add new entry
        this.browsingHistory.push({
          url: item.url,
          title: item.title,
          timestamp: item.lastVisit || Date.now(),
          visitCount: item.visitCount || 1,
          imported: true
        });
      } else {
        // Update visit count if imported has more
        if (item.visitCount > (this.browsingHistory[existing].visitCount || 1)) {
          this.browsingHistory[existing].visitCount = item.visitCount;
        }
      }
    }
    
    // Sort by timestamp (newest first)
    this.browsingHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    // Save
    this.saveBrowsingHistory();
  }

  // ==================== About Panel Methods ====================
  
  async showAboutPanel() {
    // Update version from app info
    try {
      const appInfo = await window.forgeAPI.getAppInfo();
      this.aboutVersion.textContent = `Version ${appInfo.version}`;
    } catch (e) {
      console.error('Failed to get app info:', e);
    }
    
    this.updateStatus.textContent = '';
    this.updateStatus.className = 'about-update-status';
    this.aboutPanel.classList.remove('hidden');
  }
  
  hideAboutPanel() {
    this.aboutPanel.classList.add('hidden');
  }
  
  initUpdateListener() {
    // Listen for update status events from main process
    window.forgeAPI.updates.onUpdateStatus((data) => {
      this.handleUpdateStatus(data);
    });
  }
  
  handleUpdateStatus(data) {
    const { status, version, percent, error } = data;
    
    switch (status) {
      case 'checking-for-update':
        this.updateStatus.textContent = 'Checking for updates...';
        this.updateStatus.className = 'about-update-status checking';
        break;
        
      case 'update-available':
        this.updateStatus.innerHTML = `
          <span>Version ${version} is available!</span>
          <button id="download-update-btn" class="about-update-download-btn">Download Update</button>
        `;
        this.updateStatus.className = 'about-update-status available';
        document.getElementById('download-update-btn')?.addEventListener('click', async () => {
          await window.forgeAPI.updates.downloadUpdate();
        });
        break;
        
      case 'update-not-available':
        this.updateStatus.textContent = 'You are running the latest version.';
        this.updateStatus.className = 'about-update-status success';
        break;
        
      case 'download-progress':
        this.updateStatus.textContent = `Downloading update: ${percent.toFixed(1)}%`;
        this.updateStatus.className = 'about-update-status downloading';
        break;
        
      case 'update-downloaded':
        this.updateStatus.innerHTML = `
          <span>Update ${version} ready to install!</span>
          <button id="install-update-btn" class="about-update-install-btn">Restart & Install</button>
        `;
        this.updateStatus.className = 'about-update-status ready';
        document.getElementById('install-update-btn')?.addEventListener('click', () => {
          window.forgeAPI.updates.installUpdate();
        });
        break;
        
      case 'update-error':
        this.showUpdateError(error || 'Unknown error');
        break;
    }
  }
  
  showUpdateError(errorMessage) {
    this.lastUpdateError = errorMessage;
    this.updateStatus.innerHTML = `
      <span>Update check failed</span>
      <button id="copy-error-btn" class="about-update-copy-btn">Copy Error</button>
    `;
    this.updateStatus.className = 'about-update-status error';
    document.getElementById('copy-error-btn')?.addEventListener('click', () => {
      this.copyUpdateErrorToClipboard();
    });
  }
  
  async copyUpdateErrorToClipboard() {
    try {
      await navigator.clipboard.writeText(this.lastUpdateError);
      const btn = document.getElementById('copy-error-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Error';
        }, 2000);
      }
    } catch (e) {
      console.error('Failed to copy error:', e);
    }
  }
  
  async checkForUpdates() {
    this.updateStatus.textContent = 'Checking for updates...';
    this.updateStatus.className = 'about-update-status checking';
    
    try {
      const result = await window.forgeAPI.updates.checkForUpdates();
      if (!result.success) {
        this.showUpdateError(result.error || 'Unknown error');
      }
      // Status will be updated via the update-status event
    } catch (e) {
      this.showUpdateError(e.message || 'Could not check for updates');
    }
  }

  // ==================== AI Assistant Methods ====================
  
  async initAIProviders() {
    try {
      const providers = await window.forgeAPI.ai.getProviders();
      this.renderAIToolbarButtons(providers);
    } catch (e) {
      console.error('Failed to initialize AI providers:', e);
    }
  }
  
  renderAIToolbarButtons(providers) {
    this.aiButtons.innerHTML = '';
    
    // Map provider IDs to SVG filenames
    const iconMap = {
      chatgpt: 'gpt',
      claude: 'claude',
      gemini: 'gemini',
      grok: 'grok'
    };
    
    for (const [id, provider] of Object.entries(providers)) {
      if (provider.enabled) {
        const btn = document.createElement('button');
        btn.className = 'ai-agent-btn';
        btn.title = provider.name;
        btn.dataset.provider = id;
        btn.dataset.url = provider.url;
        const iconName = iconMap[id] || id;
        btn.innerHTML = `<img class="ai-toolbar-icon" src="forge-asset://ui-icons/${iconName}.svg" alt="${provider.name}" width="18" height="18">`;
        btn.addEventListener('click', () => this.openAIWebview(id, provider.name, provider.url));
        this.aiButtons.appendChild(btn);
      }
    }
  }
  
  showAISettingsPanel() {
    this.aiSettingsPanel.classList.remove('hidden');
    this.renderAISettingsPanel();
  }
  
  hideAISettingsPanel() {
    this.aiSettingsPanel.classList.add('hidden');
  }
  
  async renderAISettingsPanel() {
    try {
      const providers = await window.forgeAPI.ai.getProviders();
      
      // Map provider IDs to SVG filenames
      const iconMap = {
        chatgpt: 'gpt',
        claude: 'claude',
        gemini: 'gemini',
        grok: 'grok'
      };
      
      let html = '<p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">Enable AI assistants to access them directly from your browser toolbar.</p>';
      html += '<div class="ai-provider-list">';
      
      for (const [id, provider] of Object.entries(providers)) {
        const statusText = provider.enabled ? 'Enabled' : 'Disabled';
        const statusClass = provider.enabled ? 'enabled' : '';
        const iconName = iconMap[id] || id;
        
        html += `
          <div class="ai-provider-item" data-provider="${id}">
            <span class="ai-provider-icon ai-icon-${id}">
              <img src="forge-asset://ui-icons/${iconName}.svg" alt="${provider.name}" width="20" height="20">
            </span>
            <div class="ai-provider-info">
              <div class="ai-provider-name">${provider.name}</div>
              <div class="ai-provider-status ${statusClass}">${statusText}</div>
            </div>
            <div class="ai-provider-toggle ${provider.enabled ? 'enabled' : ''}" data-provider="${id}"></div>
          </div>
        `;
      }
      
      html += '</div>';
      this.aiSettingsContent.innerHTML = html;
      
      // Bind toggle events
      this.aiSettingsContent.querySelectorAll('.ai-provider-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => this.handleAIProviderToggle(toggle));
      });
    } catch (e) {
      this.aiSettingsContent.innerHTML = `<p style="color: #f44336;">Error: ${e.message}</p>`;
    }
  }
  
  async handleAIProviderToggle(toggle) {
    const providerId = toggle.dataset.provider;
    const isEnabled = toggle.classList.contains('enabled');
    
    // Toggle the provider
    const result = await window.forgeAPI.ai.toggleProvider(providerId, !isEnabled);
    
    if (result.success) {
      this.renderAISettingsPanel();
      this.initAIProviders(); // Refresh toolbar buttons
    } else {
      alert('Failed to toggle provider: ' + result.error);
    }
  }
  
  openAIWebview(providerId, providerName, url) {
    this.currentAIProvider = providerId;
    this.aiWebviewName.textContent = providerName;
    
    // Map provider IDs to SVG filenames
    const iconMap = {
      chatgpt: 'gpt',
      claude: 'claude',
      gemini: 'gemini',
      grok: 'grok'
    };
    const iconName = iconMap[providerId] || providerId;
    
    // Set the icon
    this.aiWebviewIcon.className = 'ai-webview-icon';
    this.aiWebviewIcon.innerHTML = `<img src="forge-asset://ui-icons/${iconName}.svg" alt="${providerName}" width="16" height="16">`;
    
    // Remove existing webview if any
    if (this.aiWebview) {
      this.aiWebview.remove();
    }
    
    // Create new webview
    this.aiWebview = document.createElement('webview');
    this.aiWebview.setAttribute('src', url);
    this.aiWebview.setAttribute('allowpopups', 'true');
    this.aiWebview.setAttribute('partition', 'persist:ai-assistant');
    this.aiWebview.setAttribute('webpreferences', 'contextIsolation=yes');
    
    // Style the webview to fill the container
    this.aiWebview.style.width = '100%';
    this.aiWebview.style.height = '100%';
    this.aiWebview.style.display = 'flex';
    
    this.aiWebviewContainer.appendChild(this.aiWebview);
    
    // Show panel and adjust layout
    this.aiWebviewPanel.classList.remove('hidden');
    document.body.classList.add('ai-panel-open');
  }
  
  hideAIWebviewPanel() {
    this.aiWebviewPanel.classList.add('hidden');
    document.body.classList.remove('ai-panel-open');
    
    // Clean up webview
    if (this.aiWebview) {
      this.aiWebview.remove();
      this.aiWebview = null;
    }
    this.currentAIProvider = null;
  }

  // ==================== History Methods ====================
  
  loadBrowsingHistory() {
    try {
      const saved = localStorage.getItem('forge-browsing-history');
      if (saved) {
        this.browsingHistory = JSON.parse(saved);
        console.log(`Loaded ${this.browsingHistory.length} history entries`);
      } else {
        this.browsingHistory = [];
        console.log('No saved history found, starting fresh');
      }
    } catch (e) {
      console.error('Failed to load browsing history:', e);
      this.browsingHistory = [];
    }
  }
  
  saveBrowsingHistory() {
    try {
      // Keep only the last 1000 entries
      if (this.browsingHistory.length > 1000) {
        this.browsingHistory = this.browsingHistory.slice(-1000);
      }
      localStorage.setItem('forge-browsing-history', JSON.stringify(this.browsingHistory));
    } catch (e) {
      console.error('Failed to save browsing history:', e);
    }
  }
  
  addToHistory(url, title, favicon) {
    console.log('Adding to history:', url, title);
    
    // Don't add duplicates if the last entry is the same URL
    const lastEntry = this.browsingHistory[this.browsingHistory.length - 1];
    if (lastEntry && lastEntry.url === url) {
      // Update title/favicon if they've changed
      lastEntry.title = title || lastEntry.title;
      lastEntry.favicon = favicon || lastEntry.favicon;
      this.saveBrowsingHistory();
      return;
    }
    
    this.browsingHistory.push({
      url: url,
      title: title || url,
      favicon: favicon || null,
      timestamp: Date.now()
    });
    
    this.saveBrowsingHistory();
    console.log('History now has', this.browsingHistory.length, 'entries');
  }
  
  showHistoryPanel() {
    this.historyPanel.classList.remove('hidden');
    this.historySearch.value = '';
    this.renderHistoryList();
    this.historySearch.focus();
  }
  
  hideHistoryPanel() {
    this.historyPanel.classList.add('hidden');
  }
  
  filterHistory() {
    this.renderHistoryList(this.historySearch.value.toLowerCase());
  }
  
  renderHistoryList(filter = '') {
    // Get filtered and sorted history (newest first)
    let items = [...this.browsingHistory].reverse();
    
    if (filter) {
      items = items.filter(item => 
        item.url.toLowerCase().includes(filter) || 
        (item.title && item.title.toLowerCase().includes(filter))
      );
    }
    
    // Group by date
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    items.forEach(item => {
      const date = new Date(item.timestamp);
      date.setHours(0, 0, 0, 0);
      
      let groupKey;
      if (date.getTime() === today.getTime()) {
        groupKey = 'Today';
      } else if (date.getTime() === yesterday.getTime()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    // Render
    if (items.length === 0) {
      this.historyList.innerHTML = `
        <div class="panel-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
          <div class="panel-empty-text">${filter ? 'No matching history' : 'No browsing history yet'}</div>
        </div>
      `;
      return;
    }
    
    let html = '';
    for (const [groupName, groupItems] of Object.entries(groups)) {
      html += `<div class="history-date-group">${groupName}</div>`;
      
      for (const item of groupItems) {
        const time = new Date(item.timestamp).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });
        
        // Try to get favicon: from item, from cache, or fallback to globe
        let favicon = item.favicon;
        if (!favicon) {
          try {
            const domain = new URL(item.url).hostname;
            const cached = this.faviconCache.get(domain);
            if (cached) {
              favicon = cached.url;
            }
          } catch (e) {
            // Invalid URL
          }
        }
        favicon = favicon || 'forge-asset://ui-icons/globe.svg';
        
        const title = this.escapeHtml(item.title || item.url);
        const url = this.escapeHtml(item.url);
        
        html += `
          <div class="history-item" data-url="${url}">
            <img class="history-item-favicon" src="${favicon}" onerror="this.src='forge-asset://ui-icons/globe.svg'">
            <div class="history-item-content">
              <div class="history-item-title">${title}</div>
              <div class="history-item-url">${url}</div>
            </div>
            <span class="history-item-time">${time}</span>
            <button class="history-item-delete" data-url="${url}" title="Remove from history">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        `;
      }
    }
    
    this.historyList.innerHTML = html;
    
    // Add click handlers
    this.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.history-item-delete')) {
          e.stopPropagation();
          const url = e.target.closest('.history-item-delete').dataset.url;
          this.removeFromHistory(url);
        } else {
          const url = item.dataset.url;
          this.createTab(url);
          this.hideHistoryPanel();
        }
      });
    });
  }
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  removeFromHistory(url) {
    // Remove all entries with this URL
    this.browsingHistory = this.browsingHistory.filter(item => item.url !== url);
    this.saveBrowsingHistory();
    this.renderHistoryList(this.historySearch.value.toLowerCase());
  }
  
  updateHistoryFavicon(url, faviconUrl) {
    // Update all history entries matching this URL with the favicon
    let updated = false;
    for (const item of this.browsingHistory) {
      if (item.url === url && item.favicon !== faviconUrl) {
        item.favicon = faviconUrl;
        updated = true;
      }
    }
    if (updated) {
      this.saveBrowsingHistory();
    }
  }
  
  clearHistory() {
    if (confirm('Are you sure you want to clear all browsing history?')) {
      this.browsingHistory = [];
      this.saveBrowsingHistory();
      this.renderHistoryList();
    }
  }
}

// Initialize the browser
document.addEventListener('DOMContentLoaded', () => {
  window.forgeBrowser = new ForgeBrowser();
});
