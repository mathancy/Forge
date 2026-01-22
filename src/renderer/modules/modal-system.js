// Forge Browser - Modal System Module
// Unified modal system for confirmations, notifications, and error handling

/**
 * Modal System Mixin
 * Provides themed in-browser modals for confirmations and notifications
 */
export const ModalSystemMixin = {
  /**
   * Initialize modal system
   */
  initModalSystem() {
    // Confirmation modal elements
    this.confirmationModal = document.getElementById('confirmation-modal');
    this.confirmationModalTitle = document.getElementById('confirmation-modal-title');
    this.confirmationModalMessage = document.getElementById('confirmation-modal-message');
    this.confirmationModalCancel = document.getElementById('confirmation-modal-cancel');
    this.confirmationModalConfirm = document.getElementById('confirmation-modal-confirm');
    
    // Notification modal elements
    this.notificationModal = document.getElementById('notification-modal');
    this.notificationModalTitle = document.getElementById('notification-modal-title');
    this.notificationModalMessage = document.getElementById('notification-modal-message');
    this.notificationModalOk = document.getElementById('notification-modal-ok');
    
    // Store current modal promise resolver
    this._modalResolver = null;
    
    console.log('[ModalSystem] Initialized');
  },

  /**
   * Show confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Dialog message (supports multi-line with \n)
   * @param {Object} options - Optional configuration
   * @param {string} options.confirmText - Confirm button text (default: "Confirm")
   * @param {string} options.cancelText - Cancel button text (default: "Cancel")
   * @param {boolean} options.danger - Use danger styling for confirm button (default: false)
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  showConfirmation(title, message, options = {}) {
    return new Promise((resolve) => {
      const {
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        danger = false
      } = options;
      
      // Set content
      this.confirmationModalTitle.textContent = title;
      this.confirmationModalMessage.textContent = message;
      this.confirmationModalConfirm.textContent = confirmText;
      this.confirmationModalCancel.textContent = cancelText;
      
      // Apply danger styling if needed
      if (danger) {
        this.confirmationModalConfirm.classList.remove('modal-btn-primary');
        this.confirmationModalConfirm.classList.add('modal-btn-danger');
      } else {
        this.confirmationModalConfirm.classList.remove('modal-btn-danger');
        this.confirmationModalConfirm.classList.add('modal-btn-primary');
      }
      
      // Store resolver
      this._modalResolver = resolve;
      
      // Set up event handlers
      const handleConfirm = () => {
        this.closeConfirmation();
        resolve(true);
      };
      
      const handleCancel = () => {
        this.closeConfirmation();
        resolve(false);
      };
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
        }
      };
      
      // Remove old listeners and add new ones
      this.confirmationModalConfirm.onclick = handleConfirm;
      this.confirmationModalCancel.onclick = handleCancel;
      this.confirmationModal.onclick = (e) => {
        if (e.target === this.confirmationModal) handleCancel();
      };
      
      // Add keyboard listener
      document.addEventListener('keydown', handleEscape, { once: true });
      
      // Show modal
      this.confirmationModal.classList.remove('hidden');
      this.confirmationModalConfirm.focus();
    });
  },

  /**
   * Close confirmation modal
   */
  closeConfirmation() {
    this.confirmationModal?.classList.add('hidden');
    this._modalResolver = null;
  },

  /**
   * Show notification dialog
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type: 'success', 'error', 'info' (default: 'info')
   * @returns {Promise<void>} - Resolves when user clicks OK
   */
  showNotification(title, message, type = 'info') {
    return new Promise((resolve) => {
      // Set content
      this.notificationModalTitle.textContent = title;
      this.notificationModalMessage.textContent = message;
      
      // Apply styling based on type
      this.notificationModalOk.className = 'modal-btn';
      if (type === 'success') {
        this.notificationModalOk.classList.add('modal-btn-primary');
      } else if (type === 'error') {
        this.notificationModalOk.classList.add('modal-btn-danger');
      } else {
        this.notificationModalOk.classList.add('modal-btn-primary');
      }
      
      // Set up event handlers
      const handleClose = () => {
        this.closeNotification();
        resolve();
      };
      
      const handleEscape = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          handleClose();
        }
      };
      
      // Remove old listeners and add new ones
      this.notificationModalOk.onclick = handleClose;
      this.notificationModal.onclick = (e) => {
        if (e.target === this.notificationModal) handleClose();
      };
      
      // Add keyboard listener
      document.addEventListener('keydown', handleEscape, { once: true });
      
      // Show modal
      this.notificationModal.classList.remove('hidden');
      this.notificationModalOk.focus();
    });
  },

  /**
   * Close notification modal
   */
  closeNotification() {
    this.notificationModal?.classList.add('hidden');
  },

  /**
   * Show error notification (convenience method)
   * @param {string} message - Error message
   * @param {string} title - Error title (default: "Error")
   */
  showError(message, title = 'Error') {
    return this.showNotification(title, message, 'error');
  },

  /**
   * Show success notification (convenience method)
   * @param {string} message - Success message
   * @param {string} title - Success title (default: "Success")
   */
  showSuccess(message, title = 'Success') {
    return this.showNotification(title, message, 'success');
  }
};

export default ModalSystemMixin;
