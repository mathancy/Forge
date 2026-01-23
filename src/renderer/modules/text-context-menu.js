/**
 * Text Context Menu Module
 * Provides themed context menus for text inputs with standard editing operations
 */

const TextContextMenuMixin = {
  /**
   * Initialize text context menu functionality
   */
  initTextContextMenu() {
    // Get context menu element
    this.textContextMenu = document.getElementById('text-context-menu');
    
    if (!this.textContextMenu) {
      console.warn('[TextContextMenu] Context menu element not found');
      return;
    }
    
    // Track current target input
    this.textContextTarget = null;
    
    // Bind context menu to URL input
    if (this.urlInput) {
      this.urlInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showTextContextMenu(e, this.urlInput);
      });
    }
    
    // Bind context menu to home search input
    if (this.homeSearch) {
      this.homeSearch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showTextContextMenu(e, this.homeSearch);
      });
    }
    
    // Set up context menu item click handlers
    this.textContextMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        this.handleTextContextAction(action);
      });
    });
    
    console.log('[TextContextMenu] Initialized');
  },

  /**
   * Show text context menu at cursor position
   */
  showTextContextMenu(e, inputElement) {
    this.textContextTarget = inputElement;
    
    // Update menu items based on input state
    this.updateTextContextMenuState(inputElement);
    
    // Hide other context menus first
    this.hideAllContextMenus();
    
    // Position the menu
    const menu = this.textContextMenu;
    menu.classList.remove('hidden', 'closing');
    
    // Calculate position
    let x = e.clientX;
    let y = e.clientY;
    
    // Ensure menu doesn't go off screen
    const menuRect = menu.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    if (x + menuRect.width > windowWidth) {
      x = windowWidth - menuRect.width - 10;
    }
    if (y + menuRect.height > windowHeight) {
      y = windowHeight - menuRect.height - 10;
    }
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Show overlay
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.classList.remove('hidden');
    }
  },

  /**
   * Update context menu item states based on input
   */
  updateTextContextMenuState(inputElement) {
    const hasSelection = inputElement.selectionStart !== inputElement.selectionEnd;
    const hasText = inputElement.value.length > 0;
    const canPaste = true; // We'll always enable paste, clipboard API will handle it
    
    // Get menu items
    const cutItem = this.textContextMenu.querySelector('[data-action="cut"]');
    const copyItem = this.textContextMenu.querySelector('[data-action="copy"]');
    const pasteItem = this.textContextMenu.querySelector('[data-action="paste"]');
    const deleteItem = this.textContextMenu.querySelector('[data-action="delete"]');
    const selectAllItem = this.textContextMenu.querySelector('[data-action="select-all"]');
    
    // Update disabled states
    if (cutItem) cutItem.classList.toggle('disabled', !hasSelection);
    if (copyItem) copyItem.classList.toggle('disabled', !hasSelection);
    if (deleteItem) deleteItem.classList.toggle('disabled', !hasSelection);
    if (selectAllItem) selectAllItem.classList.toggle('disabled', !hasText);
  },

  /**
   * Hide text context menu with animation
   */
  hideTextContextMenu() {
    if (!this.textContextMenu || this.textContextMenu.classList.contains('hidden')) return;
    
    this.textContextMenu.classList.add('closing');
    
    setTimeout(() => {
      this.textContextMenu.classList.add('hidden');
      this.textContextMenu.classList.remove('closing');
    }, 150);
    
    this.textContextTarget = null;
  },

  /**
   * Hide all context menus (extend existing functionality)
   */
  hideAllContextMenus() {
    this.hideTextContextMenu();
    if (this.hideWebviewContextMenu) this.hideWebviewContextMenu();
    if (this.hideBookmarkContextMenu) this.hideBookmarkContextMenu();
    if (this.hideBookmarksBarContextMenu) this.hideBookmarksBarContextMenu();
    if (this.hideFolderContextMenu) this.hideFolderContextMenu();
    
    // Hide overlay
    if (this.contextMenuOverlay) {
      this.contextMenuOverlay.classList.add('hidden');
    }
  },

  /**
   * Handle text context menu actions
   */
  async handleTextContextAction(action) {
    const input = this.textContextTarget;
    if (!input) {
      this.hideTextContextMenu();
      return;
    }
    
    // Focus the input to ensure operations work
    input.focus();
    
    switch (action) {
      case 'undo':
        document.execCommand('undo');
        break;
        
      case 'redo':
        document.execCommand('redo');
        break;
        
      case 'cut':
        if (input.selectionStart !== input.selectionEnd) {
          const selectedText = input.value.substring(input.selectionStart, input.selectionEnd);
          await navigator.clipboard.writeText(selectedText);
          document.execCommand('delete');
        }
        break;
        
      case 'copy':
        if (input.selectionStart !== input.selectionEnd) {
          const selectedText = input.value.substring(input.selectionStart, input.selectionEnd);
          await navigator.clipboard.writeText(selectedText);
        }
        break;
        
      case 'paste':
        try {
          const text = await navigator.clipboard.readText();
          document.execCommand('insertText', false, text);
        } catch (err) {
          console.error('[TextContextMenu] Paste failed:', err);
        }
        break;
        
      case 'delete':
        if (input.selectionStart !== input.selectionEnd) {
          document.execCommand('delete');
        }
        break;
        
      case 'select-all':
        input.select();
        break;
    }
    
    this.hideTextContextMenu();
  }
};

export default TextContextMenuMixin;
