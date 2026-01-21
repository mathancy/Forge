/**
 * Script Injector - Handles JavaScript injection into webviews
 * Used primarily for YouTube ad blocking and other site-specific scripts
 */

const fs = require('fs');
const path = require('path');

class ScriptInjector {
  constructor() {
    this.enabled = true;
    this.scriptsDir = null;
    
    // Site-specific scripts Map<hostname pattern, script content>
    this.siteScripts = new Map();
    
    // Stats
    this.stats = {
      injectionCount: 0,
      sitesCovered: 0
    };
  }

  /**
   * Initialize the script injector
   * @param {string} scriptsDir - Directory containing injection scripts
   */
  init(scriptsDir) {
    this.scriptsDir = scriptsDir;
    
    // Load built-in scripts
    this.loadBuiltInScripts();
    
    // Load custom scripts from directory if exists
    if (scriptsDir && fs.existsSync(scriptsDir)) {
      this.loadScriptsFromDir(scriptsDir);
    }
    
    this.stats.sitesCovered = this.siteScripts.size;
    console.log(`[Script Injector] Initialized with ${this.stats.sitesCovered} site scripts`);
    
    return this.getStats();
  }

  /**
   * Load built-in scripts (hardcoded for reliability)
   */
  loadBuiltInScripts() {
    // YouTube ad blocking script
    this.siteScripts.set('youtube.com', this.getYouTubeScript());
    this.siteScripts.set('www.youtube.com', this.getYouTubeScript());
    this.siteScripts.set('m.youtube.com', this.getYouTubeScript());
    this.siteScripts.set('music.youtube.com', this.getYouTubeScript());
  }

  /**
   * Get the YouTube ad blocking script
   * This script handles:
   * - Pre-roll ad skipping
   * - Mid-roll ad skipping
   * - Ad overlay removal
   * - Sponsored content hiding
   */
  getYouTubeScript() {
    return `
(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.__forgeAdBlockLoaded) return;
  window.__forgeAdBlockLoaded = true;
  
  console.log('[Forge AdBlock] YouTube script injected at', new Date().toISOString());
  
  // ==================== Configuration ====================
  const CONFIG = {
    checkInterval: 50,       // Check for ads every 50ms (faster)
    batchRemoveInterval: 500, // Remove promoted content every 500ms
    debug: true              // Enable logging
  };
  
  function log(...args) {
    if (CONFIG.debug) {
      console.log('[Forge AdBlock]', ...args);
    }
  }
  
  // ==================== Method 1: Override YouTube's ad config ====================
  
  // Try to intercept ytInitialPlayerResponse before it's used
  function patchPlayerResponse() {
    try {
      // Check if ytInitialPlayerResponse exists and has ad data
      if (window.ytInitialPlayerResponse) {
        log('Found ytInitialPlayerResponse, attempting to patch...');
        
        // Remove ad-related data
        if (window.ytInitialPlayerResponse.adPlacements) {
          delete window.ytInitialPlayerResponse.adPlacements;
          log('Removed adPlacements');
        }
        if (window.ytInitialPlayerResponse.playerAds) {
          delete window.ytInitialPlayerResponse.playerAds;
          log('Removed playerAds');
        }
        if (window.ytInitialPlayerResponse.adSlots) {
          delete window.ytInitialPlayerResponse.adSlots;
          log('Removed adSlots');
        }
        
        // Also check playabilityStatus for ads
        if (window.ytInitialPlayerResponse.playabilityStatus?.liveStreamability?.liveStreamabilityRenderer?.displayAds) {
          delete window.ytInitialPlayerResponse.playabilityStatus.liveStreamability.liveStreamabilityRenderer.displayAds;
        }
      }
    } catch (e) {
      log('Error patching player response:', e);
    }
  }
  
  // Call immediately
  patchPlayerResponse();
  
  // ==================== Method 2: Video element manipulation ====================
  
  function getPlayer() {
    return document.querySelector('.html5-video-player');
  }
  
  function getVideo() {
    return document.querySelector('video.html5-main-video, video.video-stream');
  }
  
  function isAdPlaying() {
    const player = getPlayer();
    if (!player) return false;
    
    // Method 1: Check for ad-showing class
    if (player.classList.contains('ad-showing')) {
      log('Ad detected via ad-showing class');
      return true;
    }
    
    // Method 2: Check for ad-interrupting class  
    if (player.classList.contains('ad-interrupting')) {
      log('Ad detected via ad-interrupting class');
      return true;
    }
    
    // Method 3: Check for video ad container
    const adContainer = document.querySelector('.video-ads.ytp-ad-module');
    if (adContainer && adContainer.offsetHeight > 0) {
      log('Ad detected via ad-module container');
      return true;
    }
    
    // Method 4: Check for ad text/preview
    const adText = document.querySelector('.ytp-ad-simple-ad-badge, .ytp-ad-text, .ytp-ad-preview-container');
    if (adText && adText.offsetParent !== null) {
      log('Ad detected via ad badge/text');
      return true;
    }
    
    // Method 5: Check for skip button
    const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
    if (skipBtn && skipBtn.offsetParent !== null) {
      log('Ad detected via skip button presence');
      return true;
    }
    
    return false;
  }
  
  function clickSkipButton() {
    // Comprehensive list of skip button selectors
    const skipSelectors = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern', 
      '.ytp-skip-ad-button',
      'button.ytp-ad-skip-button',
      'button.ytp-ad-skip-button-modern',
      '.ytp-ad-skip-button-slot button',
      '.ytp-ad-skip-button-container button',
      '.ytp-ad-overlay-close-button',
      '[class*="ytp-ad-skip"]',
      'button[id*="skip"]',
      // New YouTube layout selectors
      '.ytp-ad-skip-button-text',
      '[data-skip-button]'
    ];
    
    for (const selector of skipSelectors) {
      try {
        const buttons = document.querySelectorAll(selector);
        for (const btn of buttons) {
          if (btn && btn.offsetParent !== null) {
            log('Clicking skip button:', selector);
            btn.click();
            
            // Also try dispatching events directly
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return true;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    return false;
  }
  
  function forceSkipAd() {
    const video = getVideo();
    if (!video) {
      log('No video element found');
      return false;
    }
    
    log('Attempting to force skip ad. Duration:', video.duration, 'Current time:', video.currentTime);
    
    // Skip to end of ad
    if (video.duration && isFinite(video.duration) && video.duration > 0 && video.duration < 300) {
      // Ads are usually under 5 minutes
      video.currentTime = video.duration - 0.01;
      log('Set currentTime to', video.currentTime);
      return true;
    }
    
    // If we can't skip, speed it up
    video.playbackRate = 16;
    video.muted = true;
    video.volume = 0;
    log('Speeding up ad to 16x');
    return true;
  }
  
  // Store original playback state
  let savedPlaybackRate = 1;
  let savedMuted = false;
  let savedVolume = 1;
  let wasPlayingAd = false;
  
  function handleAds() {
    const video = getVideo();
    const adPlaying = isAdPlaying();
    
    if (!adPlaying) {
      // Restore settings if we were playing an ad
      if (wasPlayingAd && video) {
        video.playbackRate = savedPlaybackRate;
        video.muted = savedMuted;
        video.volume = savedVolume;
        log('Ad ended, restored playback settings');
        wasPlayingAd = false;
      }
      return;
    }
    
    // Save current settings if starting ad
    if (!wasPlayingAd && video) {
      savedPlaybackRate = video.playbackRate;
      savedMuted = video.muted;
      savedVolume = video.volume;
      wasPlayingAd = true;
    }
    
    log('>>> AD PLAYING <<<');
    
    // Try clicking skip button first
    if (clickSkipButton()) {
      log('Skip button clicked successfully');
      return;
    }
    
    // Force skip the ad
    forceSkipAd();
  }
  
  // ==================== Method 3: Remove promoted content from page ====================
  
  function removePromotedContent() {
    let removed = 0;
    
    // All known ad container selectors - remove immediately
    const adSelectors = [
      'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-promoted-video-renderer',
      'ytd-display-ad-renderer',
      'ytd-compact-promoted-video-renderer',
      'ytd-action-companion-ad-renderer',
      'ytd-promoted-sparkles-text-search-renderer',
      'ytd-banner-promo-renderer',
      'ytd-statement-banner-renderer',
      'ytd-brand-video-shelf-renderer',
      'ytd-brand-video-singleton-renderer',
      'ytd-primetime-promo-renderer',
      'ytd-search-pyv-renderer',
      'ytd-masthead-ad-renderer',
      'ytd-mealbar-promo-renderer',
      '#masthead-ad',
      '#player-ads',
      '.ytp-ad-overlay-container',
      '.ytp-ad-overlay-slot',
      '.ytp-ad-text-overlay',
      '.ytp-ad-image-overlay',
      '.ytp-featured-product',
      '.iv-branding',
      'ytd-merch-shelf-renderer',
      'ytd-movie-offer-module-renderer',
      '#ticket-shelf',
      'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]'
    ];
    
    for (const selector of adSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el && el.parentNode) {
          // Find and remove the parent grid item if applicable
          const parentGridItem = el.closest('ytd-rich-item-renderer, ytd-rich-section-renderer');
          if (parentGridItem) {
            parentGridItem.classList.add('forge-ad-removed');
            parentGridItem.remove();
            log('Removed parent grid item for:', selector);
            removed++;
          } else {
            el.remove();
            log('Removed:', selector);
            removed++;
          }
        }
      });
    }
    
    // Remove containers that hold ads - check multiple ad indicators
    document.querySelectorAll('ytd-rich-item-renderer').forEach(item => {
      // Skip if already marked
      if (item.classList.contains('forge-ad-removed')) return;
      
      // Check for ad content inside
      const hasAd = item.querySelector(\`
        ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-display-ad-renderer,
        [data-ad-slot],
        [data-ad-context]
      \`);
      
      // Also check for "Ad" badge text
      const badges = item.querySelectorAll('ytd-badge-supported-renderer span, .badge-style-type-ad, [aria-label*="Ad"]');
      let hasAdBadge = false;
      badges.forEach(badge => {
        const text = (badge.textContent || badge.getAttribute('aria-label') || '').toLowerCase().trim();
        if (text === 'ad' || text === 'ads' || text === 'sponsored' || text.includes('promoted')) {
          hasAdBadge = true;
        }
      });
      
      if (hasAd || hasAdBadge) {
        item.classList.add('forge-ad-removed');
        item.remove();
        log('Removed ad-containing grid item');
        removed++;
      }
    });
    
    // Remove videos with "Ad" badge in search/sidebar
    document.querySelectorAll('ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer').forEach(item => {
      if (item.classList.contains('forge-ad-removed')) return;
      
      const badge = item.querySelector('ytd-badge-supported-renderer, .badge-style-type-ad');
      if (badge) {
        const text = badge.textContent?.toLowerCase() || '';
        const classes = badge.className?.toLowerCase() || '';
        if (text.includes('ad') || text.includes('sponsored') || classes.includes('ad')) {
          item.classList.add('forge-ad-removed');
          item.remove();
          log('Removed ad video from results');
          removed++;
        }
      }
    });
    
    // Remove section renderers that contain ads (shelf-style ads)
    document.querySelectorAll('ytd-rich-section-renderer').forEach(section => {
      if (section.classList.contains('forge-ad-removed')) return;
      
      if (section.querySelector('ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-statement-banner-renderer')) {
        section.classList.add('forge-ad-removed');
        section.remove();
        log('Removed ad section');
        removed++;
      }
    });
    
    if (removed > 0) {
      log('Removed', removed, 'ad elements');
    }
    
    return removed;
  }
  
  // ==================== Mutation Observer for dynamic content ====================
  
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsCheck = false;
      
      for (const mutation of mutations) {
        // Watch for class changes on video player (ad-showing class)
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList?.contains('html5-video-player')) {
            needsCheck = true;
            break;
          }
        }
        
        // Watch for new ad elements being added
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName?.toLowerCase() || '';
              const className = String(node.className || '');
              
              if (tagName.includes('ad') || 
                  tagName.includes('promoted') ||
                  className.includes('ad-') ||
                  className.includes('ytp-ad')) {
                needsCheck = true;
                break;
              }
            }
          }
        }
      }
      
      if (needsCheck) {
        handleAds();
        removePromotedContent();
      }
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    
    log('Mutation observer started');
  }
  
  // ==================== Initialization ====================
  
  function init() {
    log('Initializing YouTube AdBlock...');
    log('Current URL:', location.href);
    log('Page state:', document.readyState);
    
    // Patch player response
    patchPlayerResponse();
    
    // Setup observer
    setupObserver();
    
    // Run periodic checks
    setInterval(handleAds, CONFIG.checkInterval);
    setInterval(removePromotedContent, CONFIG.batchRemoveInterval);
    
    // Initial cleanup
    setTimeout(() => {
      log('Running initial cleanup...');
      removePromotedContent();
      handleAds();
    }, 500);
    
    // Also handle SPA navigation
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        log('Navigation detected, URL:', lastUrl);
        
        // Reset ad state
        window.__forgeAdBlockLoaded = true;
        wasPlayingAd = false;
        
        // Re-patch and cleanup
        patchPlayerResponse();
        setTimeout(removePromotedContent, 1000);
      }
    }, 500);
    
    log('YouTube AdBlock fully initialized');
  }
  
  // Start based on document state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    log('Waiting for DOMContentLoaded...');
  } else {
    init();
  }
  
  // Also run on load for late content
  window.addEventListener('load', () => {
    log('Window load event fired');
    setTimeout(removePromotedContent, 1500);
  });
})();
`;
  }

  /**
   * Load scripts from a directory
   * @param {string} dir - Directory path
   */
  loadScriptsFromDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(dir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Extract hostname from filename (e.g., "youtube.com.js" -> "youtube.com")
          const hostname = file.replace('.js', '');
          this.siteScripts.set(hostname, content);
          console.log(`[Script Injector] Loaded script for ${hostname}`);
        }
      }
    } catch (error) {
      console.error('[Script Injector] Error loading scripts:', error.message);
    }
  }

  /**
   * Check if hostname matches a pattern
   * @param {string} hostname - Page hostname
   * @param {string} pattern - Pattern to match
   * @returns {boolean}
   */
  hostnameMatches(hostname, pattern) {
    if (hostname === pattern) return true;
    if (hostname.endsWith('.' + pattern)) return true;
    return false;
  }

  /**
   * Get script to inject for a URL
   * @param {string} url - Page URL
   * @returns {string|null} Script content or null
   */
  getScriptForUrl(url) {
    if (!this.enabled) return null;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Find matching script
      for (const [pattern, script] of this.siteScripts) {
        if (this.hostnameMatches(hostname, pattern)) {
          return script;
        }
      }
    } catch (e) {
      // Invalid URL
    }
    
    return null;
  }

  /**
   * Track an injection
   */
  trackInjection() {
    this.stats.injectionCount++;
  }

  /**
   * Enable or disable script injection
   * @param {boolean} enabled 
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[Script Injector] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if script injection is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get stats
   * @returns {Object}
   */
  getStats() {
    return {
      enabled: this.enabled,
      sitesCovered: this.stats.sitesCovered,
      injectionCount: this.stats.injectionCount
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get the script injector singleton
 * @returns {ScriptInjector}
 */
function getScriptInjector() {
  if (!instance) {
    instance = new ScriptInjector();
  }
  return instance;
}

module.exports = { ScriptInjector, getScriptInjector };
