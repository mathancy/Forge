// This script is injected into webviews to detect and autofill password fields

(function() {
    'use strict';
    
    let passwordFields = [];
    let autofillSuggestions = [];
    let suggestionBox = null;
    
    // Detect password fields on the page
    function detectPasswordFields() {
        passwordFields = [];
        
        // Find all password input fields
        const inputs = document.querySelectorAll('input[type="password"], input[type="text"][autocomplete*="password"]');
        
        console.log('[Forge Password] Scanning page for password fields...');
        console.log('[Forge Password] Found', inputs.length, 'password input fields');
        
        inputs.forEach(field => {
            if (!passwordFields.includes(field)) {
                passwordFields.push(field);
                setupFieldListeners(field);
                console.log('[Forge Password] Added password field:', field.name || field.id || 'unnamed');
            }
        });
        
        // Also look for username fields near password fields
        passwordFields.forEach(pwField => {
            const usernameField = findUsernameField(pwField);
            if (usernameField && !passwordFields.includes(usernameField)) {
                passwordFields.push(usernameField);
                setupFieldListeners(usernameField);
                console.log('[Forge Password] Added username field:', usernameField.name || usernameField.id || 'unnamed');
            }
        });
        
        if (passwordFields.length > 0) {
            console.log('[Forge Password] Total fields detected:', passwordFields.length);
            console.log('[Forge Password] Requesting passwords for URL:', window.location.href);
            requestPasswordsForSite();
        } else {
            console.log('[Forge Password] No password fields detected on this page');
        }
    }
    
    // Find username field near a password field
    function findUsernameField(passwordField) {
        // Look for common username field patterns
        const form = passwordField.closest('form');
        if (!form) return null;
        
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        
        for (let input of inputs) {
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const autocomplete = (input.autocomplete || '').toLowerCase();
            
            if (name.includes('user') || name.includes('email') || name.includes('login') ||
                id.includes('user') || id.includes('email') || id.includes('login') ||
                placeholder.includes('user') || placeholder.includes('email') ||
                autocomplete.includes('username') || autocomplete.includes('email')) {
                return input;
            }
        }
        
        return null;
    }
    
    // Setup listeners for password fields
    function setupFieldListeners(field) {
        field.addEventListener('focus', () => {
            console.log('[Forge Password] Field focused:', field.name || field.id || 'unnamed');
            console.log('[Forge Password] Current suggestions count:', autofillSuggestions.length);
            
            // Request passwords if we don't have them yet
            if (autofillSuggestions.length === 0) {
                console.log('[Forge Password] No cached suggestions, requesting...');
                requestPasswordsForSite();
                // Show a loading indicator or wait a bit
                setTimeout(() => {
                    console.log('[Forge Password] After delay, suggestions count:', autofillSuggestions.length);
                    if (autofillSuggestions.length > 0) {
                        showAutofillSuggestions(field);
                    } else {
                        console.log('[Forge Password] Still no suggestions available');
                    }
                }, 100);
            } else {
                console.log('[Forge Password] Using cached suggestions');
                showAutofillSuggestions(field);
            }
        });
        
        field.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => hideSuggestions(), 300);
        });
    }
    
    // Request saved passwords for this site
    function requestPasswordsForSite() {
        const url = window.location.href;
        
        // Send message to host using console
        console.log('[FORGE_REQUEST_PASSWORDS]', url);
    }
    
    // Show autofill suggestions
    function showAutofillSuggestions(field) {
        console.log('[Forge Password] showAutofillSuggestions called');
        console.log('[Forge Password] Suggestions to display:', autofillSuggestions.length);
        
        if (!suggestionBox) {
            console.log('[Forge Password] Creating suggestion box');
            createSuggestionBox();
        }
        
        const rect = field.getBoundingClientRect();
        suggestionBox.style.top = (rect.bottom + window.scrollY + 2) + 'px';
        suggestionBox.style.left = (rect.left + window.scrollX) + 'px';
        suggestionBox.style.width = rect.width + 'px';
        suggestionBox.style.display = 'block';
        
        console.log('[Forge Password] Suggestion box displayed at:', {
            top: suggestionBox.style.top,
            left: suggestionBox.style.left,
            width: suggestionBox.style.width
        });
        
        // Populate suggestions
        suggestionBox.innerHTML = autofillSuggestions.map((cred, index) => `
            <div class="forge-autofill-item" data-index="${index}">
                <div class="forge-autofill-username">${escapeHtml(cred.username)}</div>
                <div class="forge-autofill-url">${escapeHtml(new URL(cred.url).hostname)}</div>
            </div>
        `).join('');
        
        // Add click handlers
        suggestionBox.querySelectorAll('.forge-autofill-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                fillCredentials(autofillSuggestions[index]);
                hideSuggestions();
            });
        });
    }
    
    // Create suggestion box element
    function createSuggestionBox() {
        suggestionBox = document.createElement('div');
        suggestionBox.id = 'forge-password-suggestions';
        suggestionBox.style.cssText = `
            position: absolute;
            background: #2a2a2a;
            border: 1px solid #3a3a3a;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            display: none;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        // Add styles for suggestion items
        const style = document.createElement('style');
        style.textContent = `
            .forge-autofill-item {
                padding: 10px 12px;
                cursor: pointer;
                border-bottom: 1px solid #3a3a3a;
                transition: background 0.2s;
            }
            .forge-autofill-item:last-child {
                border-bottom: none;
            }
            .forge-autofill-item:hover {
                background: #3a3a3a;
            }
            .forge-autofill-username {
                color: #e0e0e0;
                font-weight: 500;
                font-size: 14px;
                margin-bottom: 2px;
            }
            .forge-autofill-url {
                color: #999;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(suggestionBox);
    }
    
    // Hide suggestions
    function hideSuggestions() {
        if (suggestionBox) {
            suggestionBox.style.display = 'none';
        }
    }
    
    // Fill credentials into form
    function fillCredentials(credentials) {
        const form = passwordFields[0].closest('form');
        if (!form) return;
        
        // Find username field
        const usernameField = findUsernameField(passwordFields[0]);
        if (usernameField) {
            usernameField.value = credentials.username;
            usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            usernameField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Find password field
        const passwordField = form.querySelector('input[type="password"]');
        if (passwordField) {
            passwordField.value = credentials.password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        console.log('[Forge Password] Autofilled credentials for', credentials.username);
    }
    
    // Listen for password data from host
    window.addEventListener('message', (event) => {
        console.log('[Forge Password] Message received:', event.data ? event.data.type : 'no data');
        
        if (event.data && event.data.type === 'FORGE_PASSWORDS') {
            autofillSuggestions = event.data.passwords;
            console.log('[Forge Password] ✓ Received', autofillSuggestions.length, 'saved credentials');
            console.log('[Forge Password] Credentials:', autofillSuggestions.map(c => ({
                url: c.url,
                username: c.username
            })));
            
            // If a field is focused, show suggestions immediately
            const focusedElement = document.activeElement;
            console.log('[Forge Password] Currently focused element:', focusedElement ? focusedElement.tagName : 'none');
            
            if (focusedElement && passwordFields.includes(focusedElement)) {
                console.log('[Forge Password] Focused element is a password field, showing suggestions');
                showAutofillSuggestions(focusedElement);
            } else {
                console.log('[Forge Password] No password field focused, suggestions cached for later');
            }
        }
    });
    
    // Utility function
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Initialize detection
    detectPasswordFields();
    
    // Re-detect on DOM changes (for SPAs)
    const observer = new MutationObserver(() => {
        detectPasswordFields();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('[Forge Password] Autofill script loaded');
})();
