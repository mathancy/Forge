/**
 * Forge Browser Ad-Blocker Request Handler
 * Integrates with Electron's webRequest API to block ads
 */

const { session } = require('electron');
const { RuleLoader } = require('./rule-loader');
const { RuleEngine } = require('./rule-engine');

class RequestHandler {
  constructor() {
    this.ruleLoader = new RuleLoader();
    this.ruleEngine = new RuleEngine();
    this.initialized = false;
    this.enabledRulesets = ['default'];
  }

  /**
   * Initialize the ad-blocker
   * @param {string} rulesDir - Path to directory containing ruleset files
   * @param {Object} options - Configuration options
   */
  async init(rulesDir, options = {}) {
    console.log('[AdBlocker] Initializing...');
    
    // Set enabled rulesets from options
    if (options.enabledRulesets) {
      this.enabledRulesets = options.enabledRulesets;
    }

    // Initialize rule loader
    this.ruleLoader.init(rulesDir);
    
    // Load rules
    try {
      const rules = await this.ruleLoader.loadRulesets(this.enabledRulesets);
      const optimizedRules = this.ruleLoader.optimizeRules(rules);
      this.ruleEngine.loadRules(optimizedRules);
      
      // Print stats
      const stats = this.ruleLoader.getRuleStats(optimizedRules);
      console.log('[AdBlocker] Rule statistics:', stats);
    } catch (error) {
      console.error('[AdBlocker] Failed to load rules:', error);
    }

    // Set up request interception
    this.setupRequestInterception();
    
    this.initialized = true;
    console.log('[AdBlocker] Initialization complete');
  }

  /**
   * Set up Electron's webRequest API to intercept and filter requests
   */
  setupRequestInterception() {
    const ses = session.defaultSession;

    // Intercept all requests before they're sent
    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      // Skip internal Electron requests
      if (details.url.startsWith('chrome-extension://') || 
          details.url.startsWith('devtools://') ||
          details.url.startsWith('file://')) {
        callback({});
        return;
      }

      const result = this.ruleEngine.shouldBlock({
        url: details.url,
        resourceType: details.resourceType,
        initiator: details.referrer || details.url
      });

      if (result.action === 'block') {
        // Log blocked request (in debug mode)
        if (process.env.FORGE_DEBUG === 'true') {
          console.log(`[AdBlocker] Blocked: ${details.url.substring(0, 80)}...`);
        }
        callback({ cancel: true });
      } else {
        callback({});
      }
    });

    console.log('[AdBlocker] Request interception enabled');
  }

  /**
   * Get current blocking statistics
   */
  getStats() {
    return this.ruleEngine.getStats();
  }

  /**
   * Reset blocking statistics
   */
  resetStats() {
    this.ruleEngine.resetStats();
  }

  /**
   * Enable or disable ad-blocking
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.ruleEngine.setEnabled(enabled);
    console.log(`[AdBlocker] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if ad-blocker is enabled
   */
  isEnabled() {
    return this.ruleEngine.enabled;
  }

  /**
   * Get available rulesets
   */
  getAvailableRulesets() {
    return this.ruleLoader.getAvailableRulesets();
  }

  /**
   * Update enabled rulesets and reload rules
   * @param {Array<string>} rulesetIds
   */
  async setEnabledRulesets(rulesetIds) {
    this.enabledRulesets = rulesetIds;
    
    try {
      const rules = await this.ruleLoader.loadRulesets(this.enabledRulesets);
      const optimizedRules = this.ruleLoader.optimizeRules(rules);
      this.ruleEngine.loadRules(optimizedRules);
      console.log(`[AdBlocker] Rulesets updated: ${rulesetIds.join(', ')}`);
    } catch (error) {
      console.error('[AdBlocker] Failed to update rulesets:', error);
    }
  }

  /**
   * Get currently enabled rulesets
   */
  getEnabledRulesets() {
    return [...this.enabledRulesets];
  }
}

// Singleton instance
let adBlockerInstance = null;

function getAdBlocker() {
  if (!adBlockerInstance) {
    adBlockerInstance = new RequestHandler();
  }
  return adBlockerInstance;
}

module.exports = { 
  RequestHandler, 
  getAdBlocker 
};
