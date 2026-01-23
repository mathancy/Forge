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
  
  // Store import preview data
  _importPreviewData: [],
  
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
      await this.showError('Please fill in all fields', 'Validation Error');
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
      await this.showError('Failed to save password: ' + err.message);
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
    const confirmed = await this.showConfirmation(
      'Delete Password',
      'Are you sure you want to delete this password?',
      { danger: true, confirmText: 'Delete' }
    );
    
    if (confirmed) {
      try {
        await window.electronAPI.passwords.delete(id);
        await this.loadPasswords();
      } catch (err) {
        console.error('[PasswordManager] Failed to delete password:', err);
        await this.showError('Failed to delete password: ' + err.message);
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
   * Delete all passwords
   */
  async deleteAllPasswords() {
    const confirmed = await this.showConfirmation(
      'Delete All Passwords',
      'Are you sure you want to delete ALL passwords?\n\n' +
      'This will permanently delete:\n' +
      '• All saved passwords\n' +
      '• The encryption key\n\n' +
      'This action cannot be undone!',
      { danger: true, confirmText: 'Delete All' }
    );
    
    if (!confirmed) return;
    
    try {
      const result = await window.electronAPI.passwords.deleteAll();
      
      if (result.success) {
        await this.showSuccess('All passwords have been deleted.');
        await this.loadPasswords();
      } else {
        await this.showError('Failed to delete passwords: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('[PasswordManager] Failed to delete all passwords:', err);
      await this.showError('Failed to delete passwords: ' + err.message);
    }
  },

  /**
   * Import passwords from CSV
   */
  async importPasswordsCSV(file) {
    // This method is now replaced by showPasswordImportModal
    // Kept for backward compatibility
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target.result;
        const result = await this.parseCSVForPreview(csvData);
        this._importPreviewData = result.entries;
        this._duplicateCount = result.duplicateCount;
        
        // Check if all passwords are duplicates (nothing to import)
        if (this._importPreviewData.length === 0 && this._duplicateCount > 0) {
          this.showAllDuplicatesError();
          return;
        }
        
        this.renderImportPreview();
        this.showPasswordImportModal(true);
        
        // Show duplicate notification if any
        if (this._duplicateCount > 0) {
          this.showDuplicateNotification();
        }
      } catch (err) {
        console.error('[PasswordManager] Failed to parse CSV:', err);
        await this.showError('Failed to read CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  },

  /**
   * Show password import modal
   */
  showPasswordImportModal(showPreview = false) {
    const modal = document.getElementById('password-import-modal');
    const instructions = document.getElementById('import-instructions');
    const preview = document.getElementById('import-preview');
    
    if (!modal) return;
    
    if (showPreview) {
      instructions?.classList.add('hidden');
      preview?.classList.remove('hidden');
    } else {
      instructions?.classList.remove('hidden');
      preview?.classList.add('hidden');
      this._importPreviewData = [];
    }
    
    modal.classList.remove('hidden');
  },

  /**
   * Hide password import modal
   */
  hidePasswordImportModal() {
    const modal = document.getElementById('password-import-modal');
    modal?.classList.add('hidden');
    this._importPreviewData = [];
    
    // Reset file input
    if (this.passwordFileInput) {
      this.passwordFileInput.value = '';
    }
  },

  /**
   * Parse CSV and validate entries for preview
   */
  async parseCSVForPreview(csvData) {
    const lines = csvData.split('\n');
    const entries = [];
    let duplicateCount = 0;
    
    // Get existing passwords to check for duplicates
    const existingPasswords = await window.electronAPI.passwords.getAll();
    const existingSet = new Set(
      existingPasswords.map(p => `${p.url}|${p.username}`)
    );
    
    // Skip header row (name,url,username,password)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const lineNum = i + 1;
      
      try {
        const fields = this.parseCSVLine(line);
        
        if (fields.length < 4) {
          entries.push({
            lineNum,
            name: fields[0] || '',
            url: fields[1] || '',
            username: fields[2] || '',
            password: fields[3] || '',
            selected: false,
            error: `Incomplete data - expected 4 fields, got ${fields.length}`,
            valid: false
          });
          continue;
        }
        
        const [name, url, username, password] = fields;
        let error = null;
        let valid = true;
        
        // Check for duplicate
        const key = `${url.trim()}|${username.trim()}`;
        if (existingSet.has(key)) {
          duplicateCount++;
          continue; // Skip duplicates entirely
        }
        
        // Validate required fields
        if (!url || !url.trim()) {
          error = 'Missing website URL';
          valid = false;
        } else if (!username || !username.trim()) {
          error = 'Missing username/email';
          valid = false;
        } else if (!password || !password.trim()) {
          error = 'Missing password';
          valid = false;
        } else if (!url.includes('.') && !url.includes('://')) {
          error = 'Invalid URL format';
          valid = false;
        }
        
        entries.push({
          lineNum,
          name: name || '',
          url: url || '',
          username: username || '',
          password: password || '',
          selected: valid, // Auto-select valid entries
          error,
          valid
        });
        
      } catch (e) {
        entries.push({
          lineNum,
          name: '',
          url: '',
          username: '',
          password: '',
          selected: false,
          error: `Parse error: ${e.message}`,
          valid: false
        });
      }
    }
    
    return { entries, duplicateCount };
  },

  /**
   * Parse CSV line (handle quoted fields)
   */
  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current);
    return fields;
  },

  /**
   * Render import preview list
   */
  renderImportPreview() {
    const list = document.getElementById('import-preview-list');
    const countSpan = document.getElementById('import-selection-count');
    const importBtn = document.getElementById('btn-import-selected');
    
    if (!list) return;
    
    const selectedCount = this._importPreviewData.filter(e => e.selected).length;
    const totalCount = this._importPreviewData.length;
    
    if (countSpan) {
      countSpan.textContent = `${selectedCount} of ${totalCount} selected`;
    }
    
    if (importBtn) {
      importBtn.disabled = selectedCount === 0;
    }
    
    const html = this._importPreviewData.map((entry, idx) => {
      let hostname = entry.url;
      try {
        hostname = new URL(entry.url).hostname;
      } catch (e) {}
      
      const itemClass = entry.valid ? 'import-preview-item' : 'import-preview-item import-preview-item-error';
      const errorHtml = entry.error ? `<div class="import-preview-item-error-text">${escapeHtml(entry.error)}</div>` : '';
      
      return `
        <div class="${itemClass}">
          <input type="checkbox" 
                 data-index="${idx}" 
                 ${entry.selected ? 'checked' : ''} 
                 ${!entry.valid ? 'disabled' : ''}>
          <div class="import-preview-item-content">
            <div class="import-preview-item-url">${escapeHtml(hostname || entry.url || '(no URL)')}</div>
            <div class="import-preview-item-username">${escapeHtml(entry.username || '(no username)')}</div>
          </div>
          ${errorHtml}
        </div>
      `;
    }).join('');
    
    list.innerHTML = html;
    
    // Add checkbox event listeners
    list.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index);
        this._importPreviewData[idx].selected = e.target.checked;
        this.updateImportSelectionCount();
      });
    });
  },

  /**
   * Update selection count and button state
   */
  updateImportSelectionCount() {
    const countSpan = document.getElementById('import-selection-count');
    const importBtn = document.getElementById('btn-import-selected');
    
    const selectedCount = this._importPreviewData.filter(e => e.selected).length;
    const totalCount = this._importPreviewData.length;
    
    if (countSpan) {
      countSpan.textContent = `${selectedCount} of ${totalCount} selected`;
    }
    
    if (importBtn) {
      importBtn.disabled = selectedCount === 0;
    }
  },

  /**
   * Show duplicate notification
   */
  showDuplicateNotification() {
    const countSpan = document.getElementById('import-selection-count');
    if (!countSpan) return;
    
    const originalText = countSpan.textContent;
    countSpan.textContent = `Removed ${this._duplicateCount} duplicate${this._duplicateCount !== 1 ? 's' : ''}. These already exist.`;
    countSpan.classList.add('import-duplicate-notification');
    
    setTimeout(() => {
      countSpan.classList.add('fade-out');
      
      setTimeout(() => {
        countSpan.textContent = originalText;
        countSpan.classList.remove('import-duplicate-notification', 'fade-out');
        countSpan.classList.add('fade-in');
        
        setTimeout(() => {
          countSpan.classList.remove('fade-in');
        }, 500);
      }, 500);
    }, 3000);
  },

  /**
   * Show error when all passwords are duplicates
   */
  showAllDuplicatesError() {
    // Show modal with instructions still visible
    this.showPasswordImportModal(false);
    
    // Show error in the instructions section
    const instructionsSection = document.getElementById('import-instructions');
    if (!instructionsSection) return;
    
    // Create or get error message element
    let errorMsg = instructionsSection.querySelector('.import-all-duplicates-error');
    if (!errorMsg) {
      errorMsg = document.createElement('div');
      errorMsg.className = 'import-all-duplicates-error';
      instructionsSection.insertBefore(errorMsg, instructionsSection.firstChild);
    }
    
    errorMsg.textContent = 'All imported passwords already exist in Password Anvil.';
    errorMsg.style.display = 'block';
    errorMsg.classList.remove('fade-out');
    
    // Fade out after 3 seconds
    setTimeout(() => {
      errorMsg.classList.add('fade-out');
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 500);
    }, 3000);
    
    // Reset file input
    if (this.passwordFileInput) {
      this.passwordFileInput.value = '';
    }
  },

  /**
   * Select all valid entries
   */
  selectAllImportEntries() {
    this._importPreviewData.forEach(entry => {
      if (entry.valid) {
        entry.selected = true;
      }
    });
    this.renderImportPreview();
  },

  /**
   * Deselect all entries
   */
  deselectAllImportEntries() {
    this._importPreviewData.forEach(entry => {
      entry.selected = false;
    });
    this.renderImportPreview();
  },

  /**
   * Import selected passwords
   */
  async importSelectedPasswords() {
    const selected = this._importPreviewData.filter(e => e.selected && e.valid);
    
    if (selected.length === 0) {
      await this.showError('No passwords selected for import', 'Import Error');
      return;
    }
    
    try {
      const result = await window.electronAPI.passwords.importSelected(selected);
      
      let message = '';
      
      if (result.count > 0) {
        message += `Successfully imported: ${result.count} password${result.count !== 1 ? 's' : ''}`;
      }
      
      if (result.failed > 0) {
        if (message) message += '\\n\\n';
        message += `Failed to import: ${result.failed} password${result.failed !== 1 ? 's' : ''}`;
      }
      
      // Show success or error based on result
      if (result.count > 0 && result.failed === 0) {
        await this.showSuccess(message, 'Import Successful');
      } else if (result.count === 0 && result.failed > 0) {
        await this.showError(message, 'Import Failed');
      } else {
        await this.showNotification('Import Complete', message, 'info');
      }
      
      this.hidePasswordImportModal();
      
      // Reload passwords if any were imported
      if (result.count > 0) {
        await this.loadPasswords();
      }
    } catch (err) {
      console.error('[PasswordManager] Failed to import selected passwords:', err);
      await this.showError('Failed to import passwords: ' + err.message, 'Import Error');
    }
  },

  /**
   * OLD: Import passwords from CSV (kept for reference, now unused)
   */
  async _oldImportPasswordsCSV(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvData = e.target.result;
        const result = await window.electronAPI.passwords.importCSV(csvData);
        
        // Build result message
        let message = '';
        
        if (result.count > 0) {
          message += `✓ Successfully imported: ${result.count} password${result.count !== 1 ? 's' : ''}`;
        }
        
        if (result.failed > 0) {
          if (message) message += '\n';
          message += `✗ Failed to import: ${result.failed} password${result.failed !== 1 ? 's' : ''}`;
          
          // Add detailed error information
          if (result.failedEntries && result.failedEntries.length > 0) {
            message += '\n\nError Details:';
            
            // Show first 10 errors, or all if less than 10
            const errorsToShow = result.failedEntries.slice(0, 10);
            errorsToShow.forEach((entry, idx) => {
              message += `\n${idx + 1}. Line ${entry.line}: ${entry.username} (${entry.url})`;
              message += `\n   Reason: ${entry.reason}`;
            });
            
            if (result.failedEntries.length > 10) {
              message += `\n... and ${result.failedEntries.length - 10} more errors`;
            }
          }
        }
        
        if (!result.count && !result.failed) {
          message = 'No passwords found in file. Please check your CSV format.\n\nExpected format: name,url,username,password';
        }
        
        alert(message);
        
        // Reload passwords if any were imported
        if (result.count > 0) {
          await this.loadPasswords();
        }
      } catch (err) {
        console.error('[PasswordManager] Failed to import CSV:', err);
        alert('Failed to import passwords: ' + err.message);
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
      
      // Build script that communicates with browser UI layer for popup rendering
      // This avoids CSS conflicts and iframe clipping issues
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
        '  var currentFocusedField = null;',
        '  var hasRequestedPasswords = false;',
        '  var hasFilled = false;',
        '  var detectTimeout = null;',
        '  var popupVisible = false;',
        '  ',
        '  // Throttled detect function to prevent spam',
        '  function scheduleDetect() {',
        '    if (detectTimeout) return;',
        '    detectTimeout = setTimeout(function() {',
        '      detectTimeout = null;',
        '      detectPasswordFields();',
        '    }, 500);',
        '  }',
        '  ',
        '  function detectPasswordFields() {',
        '    var inputs = document.querySelectorAll("input[type=password], input[type=text][autocomplete*=password]");',
        '    var foundNew = false;',
        '    ',
        '    inputs.forEach(function(field) {',
        '      if (passwordFields.indexOf(field) === -1) {',
        '        passwordFields.push(field);',
        '        setupFieldListeners(field);',
        '        foundNew = true;',
        '        ',
        '        // Check if this field is already focused (page loaded with focus)',
        '        if (document.activeElement === field && !hasFilled) {',
        '          currentFocusedField = field;',
        '        }',
        '      }',
        '    });',
        '    ',
        '    // Find username fields near password fields',
        '    passwordFields.slice().forEach(function(pwField) {',
        '      var usernameField = findUsernameField(pwField);',
        '      if (usernameField && passwordFields.indexOf(usernameField) === -1) {',
        '        passwordFields.push(usernameField);',
        '        setupFieldListeners(usernameField);',
        '        foundNew = true;',
        '        ',
        '        // Check if this field is already focused',
        '        if (document.activeElement === usernameField && !hasFilled) {',
        '          currentFocusedField = usernameField;',
        '        }',
        '      }',
        '    });',
        '    ',
        '    // Only request passwords once per page',
        '    if (passwordFields.length > 0 && !hasRequestedPasswords) {',
        '      hasRequestedPasswords = true;',
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
        '  function getFieldPosition(field) {',
        '    var rect = field.getBoundingClientRect();',
        '    return {',
        '      top: rect.top,',
        '      left: rect.left,',
        '      bottom: rect.bottom,',
        '      right: rect.right,',
        '      width: rect.width,',
        '      height: rect.height',
        '    };',
        '  }',
        '  ',
        '  function isFieldActuallyFocused(field) {',
        '    return document.activeElement === field;',
        '  }',
        '  ',
        '  function setupFieldListeners(field) {',
        '    field.addEventListener("focus", function() {',
        '      // If we already filled, do not show popup again',
        '      if (hasFilled) return;',
        '      ',
        '      currentFocusedField = field;',
        '      ',
        '      if (autofillSuggestions.length === 0) {',
        '        // Wait for suggestions to arrive',
        '        setTimeout(function() {',
        '          if (autofillSuggestions.length > 0 && isFieldActuallyFocused(field) && !hasFilled) {',
        '            requestShowPopup(field);',
        '          }',
        '        }, 200);',
        '      } else if (!hasFilled) {',
        '        requestShowPopup(field);',
        '      }',
        '    });',
        '    ',
        '    field.addEventListener("blur", function() {',
        '      setTimeout(function() {',
        '        // Only hide if no password field is focused',
        '        var anyFieldFocused = passwordFields.some(function(f) {',
        '          return document.activeElement === f;',
        '        });',
        '        ',
        '        if (!anyFieldFocused) {',
        '          requestHidePopup();',
        '          currentFocusedField = null;',
        '        }',
        '      }, 250);',
        '    });',
        '  }',
        '  ',
        '  function requestPasswordsForSite() {',
        '    console.log("[FORGE_REQUEST_PASSWORDS] " + window.location.href);',
        '  }',
        '  ',
        '  // Request browser UI to show popup',
        '  function requestShowPopup(field) {',
        '    if (autofillSuggestions.length === 0 || hasFilled) return;',
        '    if (!isFieldActuallyFocused(field)) return;',
        '    ',
        '    popupVisible = true;',
        '    var position = getFieldPosition(field);',
        '    console.log("[FORGE_SHOW_AUTOFILL] " + JSON.stringify({',
        '      position: position,',
        '      suggestions: autofillSuggestions',
        '    }));',
        '  }',
        '  ',
        '  // Request browser UI to hide popup',
        '  function requestHidePopup() {',
        '    if (popupVisible) {',
        '      popupVisible = false;',
        '      console.log("[FORGE_HIDE_AUTOFILL]");',
        '    }',
        '  }',
        '  ',
        '  function fillCredentials(credentials) {',
        '    // Mark as filled to prevent popup from reappearing',
        '    hasFilled = true;',
        '    requestHidePopup();',
        '    ',
        '    var form = passwordFields[0] ? passwordFields[0].closest("form") : null;',
        '    var usernameField = form ? findUsernameField(passwordFields[0]) : null;',
        '    ',
        '    if (!usernameField) {',
        '      var inputs = document.querySelectorAll("input[type=text], input[type=email]");',
        '      for (var i = 0; i < inputs.length; i++) {',
        '        var input = inputs[i];',
        '        var name = (input.name || "").toLowerCase();',
        '        var id = (input.id || "").toLowerCase();',
        '        if (name.indexOf("user") !== -1 || name.indexOf("email") !== -1 ||',
        '            id.indexOf("user") !== -1 || id.indexOf("email") !== -1) {',
        '          usernameField = input;',
        '          break;',
        '        }',
        '      }',
        '    }',
        '    ',
        '    var passwordField = form ? form.querySelector("input[type=password]") : document.querySelector("input[type=password]");',
        '    ',
        '    if (usernameField) {',
        '      setNativeValue(usernameField, credentials.username);',
        '    }',
        '    if (passwordField) {',
        '      setNativeValue(passwordField, credentials.password);',
        '    }',
        '  }',
        '  ',
        '  function setNativeValue(element, value) {',
        '    var valueSetter = Object.getOwnPropertyDescriptor(element.constructor.prototype, "value");',
        '    if (valueSetter && valueSetter.set) {',
        '      valueSetter.set.call(element, value);',
        '    } else {',
        '      element.value = value;',
        '    }',
        '    element.dispatchEvent(new Event("input", { bubbles: true }));',
        '    element.dispatchEvent(new Event("change", { bubbles: true }));',
        '  }',
        '  ',
        '  window.addEventListener("message", function(event) {',
        '    if (event.data && event.data.type === "FORGE_PASSWORDS") {',
        '      autofillSuggestions = event.data.passwords;',
        '      ',
        '      // Check if any password field is currently focused',
        '      var focusedField = null;',
        '      for (var i = 0; i < passwordFields.length; i++) {',
        '        if (document.activeElement === passwordFields[i]) {',
        '          focusedField = passwordFields[i];',
        '          break;',
        '        }',
        '      }',
        '      ',
        '      // Update currentFocusedField if we found one',
        '      if (focusedField) {',
        '        currentFocusedField = focusedField;',
        '      }',
        '      ',
        '      // Show popup if a field is focused and we have not filled yet',
        '      if (!hasFilled && focusedField) {',
        '        requestShowPopup(focusedField);',
        '      }',
        '    }',
        '    ',
        '    if (event.data && event.data.type === "FORGE_FILL_CREDENTIALS") {',
        '      fillCredentials(event.data.credentials);',
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
        '  // Watch for DOM changes with throttling',
        '  var observer = new MutationObserver(function() {',
        '    scheduleDetect();',
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
    
    // Cache reference to the autofill popup
    if (!this._autofillPopup) {
      this._autofillPopup = document.getElementById('password-autofill-popup');
    }
    
    webview.addEventListener('console-message', async (e) => {
      // Handle password request
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
      
      // Handle show autofill popup request
      if (e.message && e.message.startsWith('[FORGE_SHOW_AUTOFILL]')) {
        try {
          const jsonStr = e.message.replace('[FORGE_SHOW_AUTOFILL]', '').trim();
          const data = JSON.parse(jsonStr);
          this.showAutofillPopup(webview, data.position, data.suggestions);
        } catch (err) {
          console.error('[Password] Failed to parse autofill request:', err);
        }
      }
      
      // Handle hide autofill popup request
      if (e.message && e.message.startsWith('[FORGE_HIDE_AUTOFILL]')) {
        this.hideAutofillPopup();
      }
    });
  },
  
  /**
   * Show the autofill popup in the browser UI layer
   * @param {HTMLWebViewElement} webview - The webview element
   * @param {Object} fieldPosition - Position of the input field in webview coordinates
   * @param {Array} suggestions - Array of credential suggestions
   */
  showAutofillPopup(webview, fieldPosition, suggestions) {
    if (!this._autofillPopup || !suggestions || suggestions.length === 0) {
      return;
    }
    
    // Store reference to current webview for filling
    this._autofillWebview = webview;
    
    // Get webview position relative to the browser window
    const webviewRect = webview.getBoundingClientRect();
    
    // Calculate popup position (field position is relative to webview)
    const top = webviewRect.top + fieldPosition.bottom + 4;
    const left = webviewRect.left + fieldPosition.left;
    const width = Math.max(fieldPosition.width, 280);
    
    // Build popup content
    this._autofillPopup.innerHTML = suggestions.map((cred, index) => {
      let hostname = cred.url;
      try {
        hostname = new URL(cred.url).hostname;
      } catch (e) {}
      
      return `
        <div class="password-autofill-item" data-index="${index}">
          <div class="password-autofill-username">${escapeHtml(cred.username)}</div>
          <div class="password-autofill-url">${escapeHtml(hostname)}</div>
        </div>
      `;
    }).join('');
    
    // Store suggestions for click handler
    this._autofillSuggestions = suggestions;
    
    // Add click handlers
    this._autofillPopup.querySelectorAll('.password-autofill-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const index = parseInt(item.dataset.index);
        const credential = this._autofillSuggestions[index];
        
        if (credential && this._autofillWebview) {
          // Send fill command to webview
          const code = `(function() { window.postMessage({ type: "FORGE_FILL_CREDENTIALS", credentials: ${JSON.stringify(credential)} }, "*"); })();`;
          this._autofillWebview.executeJavaScript(code);
          console.log('[Password] Sent fill command for:', credential.username);
        }
        
        this.hideAutofillPopup();
      });
    });
    
    // Position and show the popup
    this._autofillPopup.style.top = `${top}px`;
    this._autofillPopup.style.left = `${left}px`;
    this._autofillPopup.style.width = `${width}px`;
    this._autofillPopup.classList.remove('hidden');
    
    console.log('[Password] Showing autofill popup at:', { top, left, width, count: suggestions.length });
  },
  
  /**
   * Hide the autofill popup
   */
  hideAutofillPopup() {
    if (this._autofillPopup) {
      this._autofillPopup.classList.add('hidden');
      this._autofillPopup.innerHTML = '';
    }
    this._autofillWebview = null;
    this._autofillSuggestions = null;
  }
};

export default PasswordManagerMixin;
