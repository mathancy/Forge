// Webview Events Module
// Handles webview event setup and content script injection coordination

import { isInternalUrl, getDomain } from './utils.js';

export const WebviewEventsMixin = {
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
      
      // Store URL on the tab object for other methods to use
      if (tab) {
        tab.url = e.url;
      }
      
      if (tabId === self.activeTabId) {
        self.urlInput.value = e.url;
        self.updateSecurityIndicator(e.url);
        self.updateNavigationButtons();
        
        // Hide welcome page when navigating
        if (e.url && e.url !== 'about:blank') {
          self.welcomePage.classList.add('hidden');
          self.welcomePage.classList.remove('blank-tab');
        }
      }
      
      if (!isInternalUrl(e.url)) {
        const title = tab ? tab.title : 'New Tab';
        const favicon = tab ? tab.favicon : null;
        self.addToHistory(e.url, title, favicon);
      }
      
      // Inject scripts
      console.log('[Webview] did-navigate event for:', e.url);
      self.injectCosmeticCSS(webview, e.url);
      self.injectAdBlockScript(webview, e.url);
      self.injectPasswordAutofill(webview, e.url);
    });
    
    webview.addEventListener('dom-ready', () => {
      try {
        const url = webview.getURL();
        if (url) {
          console.log('[Webview] dom-ready event for:', url);
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
};
