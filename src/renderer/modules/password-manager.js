// Forge Browser - Password Manager Module
// Handles password autofill and Password Anvil panel

import { escapeHtml, isInternalUrl } from './utils.js';

/**
 * Password Manager Mixin
 * Adds password autofill functionality to ForgeBrowser
 */
export const PasswordManagerMixin = {
  // Store passwords for filtering
  _passwords: [],
  
  /**
   * Initialize password manager
   */
  initPasswordManager() {
    console.log('[PasswordManager] Initialized');
  },

  /**
   * Show Password Anvil panel
   */
  async showPasswordAnvil() {
    this.passwordAnvilPanel?.classList.remove('hidden');
    await this.loadPasswords();
  },

  /**
   * Hide Password Anvil panel
   */
  hidePasswordAnvilPanel() {
    this.passwordAnvilPanel?.classList.add('hidden');
  },

  /**
   * Load all passwords and render
   */
  async loadPasswords() {
    try {
      this._passwords = await window.electronAPI.passwords.getAll();
      this.renderPasswords(this._passwords);
    } catch (err) {
      console.error('[PasswordManager] Failed to load passwords:', err);
      this._passwords = [];
      this.renderPasswords([]);
    }
  },

  /**
   * Render passwords list
   */
  renderPasswords(passwords) {
    if (!this.passwordList) return;
    
    if (!passwords || passwords.length === 0) {
      this.passwordList.innerHTML = `
        <div class="password-empty">
          <div class="password-empty-icon">🔐</div>
          <div class="password-empty-text">No passwords saved yet</div>
          <div class="password-empty-subtext">Add your first password or import from CSV</div>
        </div>
      `;
      return;
    }
    
    const html = passwords.map(pwd => {
      let hostname = pwd.url;
      try {
        hostname = new URL(pwd.url).hostname;
      } catch (e) {}
      
      const favicon = this.getCachedFavicon ? this.getCachedFavicon(pwd.url) : null;
      const faviconSrc = favicon || 'forge-asset://ui-icons/globe.svg';
      
      return `
        <div class="password-item" data-id="${pwd.id}">
          <img class="password-favicon" src="${escapeHtml(faviconSrc)}" 
               onerror="this.src='forge-asset://ui-icons/globe.svg'">
          <div class="password-item-content">
            <div class="password-url">${escapeHtml(hostname)}</div>
            <div class="password-username">${escapeHtml(pwd.username)}</div>
          </div>
          <div class="password-actions">
            <button class="password-action-btn copy" data-id="${pwd.id}" title="Copy password">
              <img src="forge-asset://ui-icons/copy.svg" alt="Copy">
            </button>
            <button class="password-action-btn edit" data-id="${pwd.id}" title="Edit">
              <img src="forge-asset://ui-icons/edit.svg" alt="Edit">
            </button>
            <button class="password-action-btn delete" data-id="${pwd.id}" title="Delete">
              <img src="forge-asset://ui-icons/delete.svg" alt="Delete">
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.passwordList.innerHTML = html;
    
    // Add event listeners
    this.passwordList.querySelectorAll('.password-action-btn.copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyPassword(parseInt(btn.dataset.id));
      });
    });
    
    this.passwordList.querySelectorAll('.password-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editPassword(parseInt(btn.dataset.id));
      });
    });
    
    this.passwordList.querySelectorAll('.password-action-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePassword(parseInt(btn.dataset.id));
      });
    });
    
    // Click on row opens URL
    this.passwordList.querySelectorAll('.password-item').forEach(item => {
      item.addEventListener('click', () => {
        const pwd = this._passwords.find(p => p.id === parseInt(item.dataset.id));
        if (pwd) {
          this.createTab(pwd.url);
          this.hidePasswordAnvilPanel();
        }
      });
    });
  },

  /**
   * Filter passwords by search query
   */
  filterPasswords() {
    const query = this.passwordSearch?.value?.toLowerCase() || '';
    const filtered = this._passwords.filter(pwd => 
      pwd.url.toLowerCase().includes(query)
    );
    this.renderPasswords(filtered);
  },

  /**
   * Show password modal for add/edit
   */
  showPasswordModal(password = null) {
    if (!this.passwordModal) return;
    
    if (password) {
      this.passwordModalTitle.textContent = 'Edit Password';
      this.passwordEditId.value = password.id;
      this.passwordUrlInput.value = password.url;
      this.passwordUsernameInput.value = password.username;
      this.passwordPasswordInput.value = password.password;
    } else {
      this.passwordModalTitle.textContent = 'Add Password';
      this.passwordEditId.value = '';
      this.passwordUrlInput.value = '';
      this.passwordUsernameInput.value = '';
      this.passwordPasswordInput.value = '';
    }
    
    this.passwordModal.classList.remove('hidden');
    this.passwordUrlInput.focus();
  },

  /**
   * Hide password modal
   */
  hidePasswordModal() {
    this.passwordModal?.classList.add('hidden');
  },

  /**
   * Save password (add or update)
   */
  async savePassword() {
    const url = this.passwordUrlInput?.value?.trim();
    const username = this.passwordUsernameInput?.value?.trim();
    const password = this.passwordPasswordInput?.value;
    const editId = this.passwordEditId?.value;
    
    if (!url || !username || !password) {
      alert('Please fill in all fields');
      return;
    }
    
    try {
      if (editId) {
        await window.electronAPI.passwords.update(parseInt(editId), url, username, password);
      } else {
        await window.electronAPI.passwords.add(url, username, password);
      }
      
      this.hidePasswordModal();
      await this.loadPasswords();
    } catch (err) {
      console.error('[PasswordManager] Failed to save password:', err);
      alert('Failed to save password');
    }
  },

  /**
   * Edit existing password
   */
  editPassword(id) {
    const password = this._passwords.find(p => p.id === id);
    if (password) {
      this.showPasswordModal(password);
    }
  },

  /**
   * Delete password
   */
  async deletePassword(id) {
    if (confirm('Are you sure you want to delete this password?')) {
      try {
        await window.electronAPI.passwords.delete(id);
        await this.loadPasswords();
      } catch (err) {
        console.error('[PasswordManager] Failed to delete password:', err);
      }
    }
  },

  /**
   * Copy password to clipboard
   */
  async copyPassword(id) {
    const password = this._passwords.find(p => p.id === id);
    if (password) {
      try {
        await navigator.clipboard.writeText(password.password);
        
        // Show feedback
        const btn = this.passwordList.querySelector(`.password-action-btn.copy[data-id="${id}"]`);
        if (btn) {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 2000);
        }
      } catch (err) {
        console.error('[PasswordManager] Failed to copy password:', err);
      }
    }
  },

  /**
   * Import passwords from CSV
   */
  async importPasswordsCSV(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target.result;
        const result = await window.electronAPI.passwords.importCSV(csvData);
        
        if (result.success) {
          alert(`Successfully imported ${result.count} passwords`);
          await this.loadPasswords();
        } else {
          alert('Failed to import passwords: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('[PasswordManager] Failed to import CSV:', err);
        alert('Failed to import passwords');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (this.passwordFileInput) {
      this.passwordFileInput.value = '';
    }
  },

  /**
   * Inject password autofill script into webview
   * @param {HTMLWebViewElement} webview - The webview element
   * @param {string} url - The URL of the page
   */
  async injectPasswordAutofill(webview, url) {
    console.log('[Password] injectPasswordAutofill called for:', url);
    
    // Skip internal pages
    if (isInternalUrl(url)) {
      console.log('[Password] Skipping internal page');
      return;
    }
    
    try {
      // Set up listener BEFORE injecting script
      this.setupPasswordRequestListener(webview);
      
      // Build script using array join to avoid template literal issues
      const script = [
        '(function() {',
        '  "use strict";',
        '  ',
        '  // Prevent multiple injections',
        '  if (window.__forgePasswordInjected) {',
        '    console.log("[Forge Password] Already injected, skipping");',
        '    return;',
        '  }',
        '  window.__forgePasswordInjected = true;',
        '  ',
        '  var passwordFields = [];',
        '  var autofillSuggestions = [];',
        '  var suggestionBox = null;',
        '  ',
        '  function detectPasswordFields() {',
        '    var newFields = [];',
        '    ',
        '    // Find password inputs',
        '    var inputs = document.querySelectorAll("input[type=password], input[type=text][autocomplete*=password]");',
        '    ',
        '    console.log("[Forge Password] Scanning page, found " + inputs.length + " potential fields");',
        '    ',
        '    inputs.forEach(function(field) {',
        '      if (passwordFields.indexOf(field) === -1) {',
        '        passwordFields.push(field);',
        '        newFields.push(field);',
        '        setupFieldListeners(field);',
        '        console.log("[Forge Password] Added password field: " + (field.name || field.id || "unnamed"));',
        '      }',
        '    });',
        '    ',
        '    // Find username fields near password fields',
        '    passwordFields.slice().forEach(function(pwField) {',
        '      var usernameField = findUsernameField(pwField);',
        '      if (usernameField && passwordFields.indexOf(usernameField) === -1) {',
        '        passwordFields.push(usernameField);',
        '        newFields.push(usernameField);',
        '        setupFieldListeners(usernameField);',
        '        console.log("[Forge Password] Added username field: " + (usernameField.name || usernameField.id || "unnamed"));',
        '      }',
        '    });',
        '    ',
        '    if (newFields.length > 0) {',
        '      console.log("[Forge Password] Total fields: " + passwordFields.length);',
        '      requestPasswordsForSite();',
        '    }',
        '  }',
        '  ',
        '  function findUsernameField(passwordField) {',
        '    var form = passwordField.closest("form");',
        '    if (!form) return null;',
        '    ',
        '    var inputs = form.querySelectorAll("input[type=text], input[type=email], input[type=tel]");',
        '    ',
        '    for (var i = 0; i < inputs.length; i++) {',
        '      var input = inputs[i];',
        '      var name = (input.name || "").toLowerCase();',
        '      var id = (input.id || "").toLowerCase();',
        '      var placeholder = (input.placeholder || "").toLowerCase();',
        '      var autocomplete = (input.autocomplete || "").toLowerCase();',
        '      ',
        '      if (name.indexOf("user") !== -1 || name.indexOf("email") !== -1 || name.indexOf("login") !== -1 ||',
        '          id.indexOf("user") !== -1 || id.indexOf("email") !== -1 || id.indexOf("login") !== -1 ||',
        '          placeholder.indexOf("user") !== -1 || placeholder.indexOf("email") !== -1 ||',
        '          autocomplete.indexOf("username") !== -1 || autocomplete.indexOf("email") !== -1) {',
        '        return input;',
        '      }',
        '    }',
        '    ',
        '    return null;',
        '  }',
        '  ',
        '  function setupFieldListeners(field) {',
        '    field.addEventListener("focus", function() {',
        '      console.log("[Forge Password] Field focused: " + (field.name || field.id || "unnamed"));',
        '      ',
        '      if (autofillSuggestions.length === 0) {',
        '        requestPasswordsForSite();',
        '        setTimeout(function() {',
        '          if (autofillSuggestions.length > 0) {',
        '            showAutofillSuggestions(field);',
        '          }',
        '        }, 150);',
        '      } else {',
        '        showAutofillSuggestions(field);',
        '      }',
        '    });',
        '    ',
        '    field.addEventListener("blur", function() {',
        '      setTimeout(function() { hideSuggestions(); }, 300);',
        '    });',
        '  }',
        '  ',
        '  function requestPasswordsForSite() {',
        '    console.log("[FORGE_REQUEST_PASSWORDS] " + window.location.href);',
        '  }',
        '  ',
        '  function showAutofillSuggestions(field) {',
        '    if (autofillSuggestions.length === 0) return;',
        '    ',
        '    if (!suggestionBox) {',
        '      createSuggestionBox();',
        '    }',
        '    ',
        '    var rect = field.getBoundingClientRect();',
        '    suggestionBox.style.top = (rect.bottom + window.scrollY + 2) + "px";',
        '    suggestionBox.style.left = (rect.left + window.scrollX) + "px";',
        '    suggestionBox.style.width = Math.max(rect.width, 250) + "px";',
        '    suggestionBox.style.display = "block";',
        '    ',
        '    var html = "";',
        '    for (var i = 0; i < autofillSuggestions.length; i++) {',
        '      var cred = autofillSuggestions[i];',
        '      var hostname = "";',
        '      try { hostname = new URL(cred.url).hostname; } catch(e) { hostname = cred.url; }',
        '      html += "<div class=\\"forge-autofill-item\\" data-index=\\"" + i + "\\">";',
        '      html += "<div class=\\"forge-autofill-username\\">" + escapeHtml(cred.username) + "</div>";',
        '      html += "<div class=\\"forge-autofill-url\\">" + escapeHtml(hostname) + "</div>";',
        '      html += "</div>";',
        '    }',
        '    suggestionBox.innerHTML = html;',
        '    ',
        '    var items = suggestionBox.querySelectorAll(".forge-autofill-item");',
        '    items.forEach(function(item) {',
        '      item.addEventListener("mousedown", function(e) {',
        '        e.preventDefault();',
        '        var index = parseInt(item.getAttribute("data-index"));',
        '        fillCredentials(autofillSuggestions[index]);',
        '        hideSuggestions();',
        '      });',
        '    });',
        '  }',
        '  ',
        '  function createSuggestionBox() {',
        '    suggestionBox = document.createElement("div");',
        '    suggestionBox.id = "forge-password-suggestions";',
        '    suggestionBox.style.cssText = "position:absolute;background:#2a2a2a;border:1px solid #3a3a3a;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:999999;display:none;max-height:200px;overflow-y:auto;";',
        '    ',
        '    var style = document.createElement("style");',
        '    style.textContent = ".forge-autofill-item{padding:10px 12px;cursor:pointer;border-bottom:1px solid #3a3a3a;transition:background 0.2s;}.forge-autofill-item:last-child{border-bottom:none;}.forge-autofill-item:hover{background:#3a3a3a;}.forge-autofill-username{color:#e0e0e0;font-weight:500;font-size:14px;margin-bottom:2px;}.forge-autofill-url{color:#999;font-size:12px;}";',
        '    ',
        '    document.head.appendChild(style);',
        '    document.body.appendChild(suggestionBox);',
        '  }',
        '  ',
        '  function hideSuggestions() {',
        '    if (suggestionBox) {',
        '      suggestionBox.style.display = "none";',
        '    }',
        '  }',
        '  ',
        '  function fillCredentials(credentials) {',
        '    var form = passwordFields[0] ? passwordFields[0].closest("form") : null;',
        '    if (!form) return;',
        '    ',
        '    var usernameField = findUsernameField(passwordFields[0]);',
        '    if (usernameField) {',
        '      usernameField.value = credentials.username;',
        '      usernameField.dispatchEvent(new Event("input", { bubbles: true }));',
        '      usernameField.dispatchEvent(new Event("change", { bubbles: true }));',
        '    }',
        '    ',
        '    var passwordField = form.querySelector("input[type=password]");',
        '    if (passwordField) {',
        '      passwordField.value = credentials.password;',
        '      passwordField.dispatchEvent(new Event("input", { bubbles: true }));',
        '      passwordField.dispatchEvent(new Event("change", { bubbles: true }));',
        '    }',
        '    ',
        '    console.log("[Forge Password] Filled credentials for " + credentials.username);',
        '  }',
        '  ',
        '  function escapeHtml(text) {',
        '    var div = document.createElement("div");',
        '    div.textContent = text;',
        '    return div.innerHTML;',
        '  }',
        '  ',
        '  window.addEventListener("message", function(event) {',
        '    if (event.data && event.data.type === "FORGE_PASSWORDS") {',
        '      autofillSuggestions = event.data.passwords;',
        '      console.log("[Forge Password] Received " + autofillSuggestions.length + " credentials");',
        '      ',
        '      var focusedElement = document.activeElement;',
        '      if (focusedElement && passwordFields.indexOf(focusedElement) !== -1) {',
        '        showAutofillSuggestions(focusedElement);',
        '      }',
        '    }',
        '  });',
        '  ',
        '  // Initialize',
        '  if (document.body) {',
        '    detectPasswordFields();',
        '  } else {',
        '    document.addEventListener("DOMContentLoaded", detectPasswordFields);',
        '  }',
        '  ',
        '  // Watch for DOM changes',
        '  var observer = new MutationObserver(function() {',
        '    detectPasswordFields();',
        '  });',
        '  ',
        '  if (document.body) {',
        '    observer.observe(document.body, { childList: true, subtree: true });',
        '  }',
        '  ',
        '  console.log("[Forge Password] Script loaded");',
        '})();'
      ].join('\n');
      
      await webview.executeJavaScript(script, true);
      console.log('[Password] Script injected successfully');
    } catch (e) {
      console.error('[Password] Failed to inject script:', e.message);
    }
  },

  /**
   * Set up listener for password requests from webview
   * @param {HTMLWebViewElement} webview - The webview element
   */
  setupPasswordRequestListener(webview) {
    if (webview._forgePasswordListener) {
      return;
    }
    webview._forgePasswordListener = true;
    
    webview.addEventListener('console-message', async (e) => {
      if (e.message && e.message.startsWith('[FORGE_REQUEST_PASSWORDS]')) {
        const url = e.message.replace('[FORGE_REQUEST_PASSWORDS]', '').trim();
        console.log('[Password] Request received for:', url);
        
        try {
          const passwords = await window.electronAPI.passwords.getForUrl(url);
          console.log('[Password] Found', passwords ? passwords.length : 0, 'matching credentials');
          
          if (passwords && passwords.length > 0) {
            const code = '(function() { window.postMessage({ type: "FORGE_PASSWORDS", passwords: ' + JSON.stringify(passwords) + ' }, "*"); })();';
            await webview.executeJavaScript(code);
            console.log('[Password] Sent credentials to page');
          }
        } catch (err) {
          console.error('[Password] Failed to get passwords:', err);
        }
      }
    });
  }
};

export default PasswordManagerMixin;
