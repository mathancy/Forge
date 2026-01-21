// UI Panels Module
// Handles About, Chrome Import panels and main menu

export const UIPanelsMixin = {
  // Main menu
  toggleMainMenu() {
    if (this.mainMenu.classList.contains('hidden')) {
      this.showMainMenu();
    } else {
      this.hideMainMenu();
    }
  },

  showMainMenu() {
    this.mainMenu.classList.remove('hidden');
    this.updateAdBlockerStats();
  },

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
  },

  handleMainMenuAction(action) {
    const panelActions = ['history', 'password-anvil', 'ai-assistant', 'import-chrome', 'about'];
    const toggleActions = ['favorites', 'adblock']; // Actions that don't close the menu
    const isOpeningPanel = panelActions.includes(action);
    const isToggleAction = toggleActions.includes(action);
    
    switch (action) {
      case 'new-tab':
        this.createTab();
        break;
      case 'history':
        this.hideMainMenu(true); // Instant hide
        this.showHistoryPanel();
        break;
      case 'password-anvil':
        this.hideMainMenu(true); // Instant hide
        this.showPasswordAnvil();
        break;
      case 'ai-assistant':
        this.hideMainMenu(true); // Instant hide
        this.showAISettingsPanel();
        break;
      case 'import-chrome':
        this.hideMainMenu(true); // Instant hide
        this.showChromeImportPanel();
        this.renderChromeImportPanel();
        break;
      case 'devtools':
        this.openDevTools();
        break;
      case 'about':
        this.hideMainMenu(true); // Instant hide
        this.showAboutPanel();
        break;
      case 'favorites':
        this.toggleFavoritesEnabled();
        break;
      case 'adblock':
        this.toggleAdBlocker();
        break;
    }
  },

  openDevTools() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.openDevTools();
    }
  },

  // Chrome Import panel
  showChromeImportPanel() {
    this.chromeImportPanel?.classList.remove('hidden');
  },

  hideChromeImportPanel() {
    this.chromeImportPanel?.classList.add('hidden');
  },

  async renderChromeImportPanel() {
    if (!this.chromeImportContent) return;
    this.chromeImportContent.innerHTML = '<div class="loading">Loading...</div>';
    // TODO: Implement Chrome import
  },

  // About panel
  async showAboutPanel() {
    if (this.aboutPanel) {
      this.aboutPanel.classList.remove('hidden');
      const appInfo = await window.forgeAPI.getAppInfo();
      if (this.aboutVersion) {
        this.aboutVersion.textContent = `v${appInfo.version}`;
      }
    }
  },

  hideAboutPanel() {
    this.aboutPanel?.classList.add('hidden');
  },

  // Updates
  initUpdateListener() {
    window.forgeAPI.updates.onUpdateStatus((data) => {
      this.handleUpdateStatus(data);
    });
  },

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
  },

  async checkForUpdates() {
    await window.forgeAPI.updates.checkForUpdates();
  },

  // Close all popups
  closeAllPopups() {
    this.hideMainMenu();
    this.hideTabContextMenu();
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
};
