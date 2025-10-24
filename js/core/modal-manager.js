/**
 * Shared Modal Manager
 *
 * Centralized modal functionality used by both dashboard and todo pages
 * Consolidates duplicate modal code from script.js and todo.js
 */

class ModalManager {
    constructor() {
        // Store cleanup handlers for memory management
        this.modalKeyHandlers = null;
    }

    /**
     * Show a modal dialog with custom title, message, and callbacks
     * @param {string} title - Modal title
     * @param {string} message - Modal message (supports newlines)
     * @param {Function} yesCallback - Callback for Yes/OK button
     * @param {Function} noCallback - Optional callback for No/Cancel button
     * @param {string} yesLabel - Optional custom label for Yes button
     * @param {string} noLabel - Optional custom label for No button
     */
    showModal(title, message, yesCallback, noCallback = null, yesLabel = null, noLabel = null) {
        const modal = document.getElementById('customModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalYes = document.getElementById('modalYes');
        const modalNo = document.getElementById('modalNo');

        if (!modal || !modalTitle || !modalMessage || !modalYes || !modalNo) {
            Logger.error('Modal elements not found in DOM');
            return;
        }

        // Clean up any existing modal handlers before creating new ones
        this.hideModal();

        modalTitle.textContent = title;

        // Sanitize the message - use input validator if available, fallback to manual sanitization
        let sanitized;
        if (window.inputValidator && typeof window.inputValidator.sanitizeHtml === 'function') {
            sanitized = window.inputValidator.sanitizeHtml(message);
        } else {
            // Fallback sanitization method
            const div = document.createElement('div');
            div.textContent = message;
            sanitized = div.innerHTML;
        }
        // Replace newlines with <br> and support [center] markup for centered text
        sanitized = sanitized.replace(/\n/g, '<br>')
            .replace(/\[center\](.*?)\[\/center\]/g, '<div style="text-align: center;">$1</div>');
        modalMessage.innerHTML = sanitized;

        // Remove any existing event listeners by cloning nodes
        const newYesBtn = modalYes.cloneNode(true);
        const newNoBtn = modalNo.cloneNode(true);
        modalYes.parentNode.replaceChild(newYesBtn, modalYes);
        modalNo.parentNode.replaceChild(newNoBtn, modalNo);

        // Get fresh references after replacement
        const freshYesBtn = document.getElementById('modalYes');
        const freshNoBtn = document.getElementById('modalNo');

        // Create cleanup function
        const cleanup = () => {
            if (this.modalKeyHandlers) {
                document.removeEventListener('keydown', this.modalKeyHandlers.escape);
                document.removeEventListener('keydown', this.modalKeyHandlers.enter);
                this.modalKeyHandlers = null;
            }
        };

        // Set up button handlers
        if (yesCallback) {
            freshYesBtn.onclick = () => {
                cleanup();
                this.hideModal();
                yesCallback();
            };
            // Use custom label if provided, otherwise use default
            freshYesBtn.textContent = yesLabel || (noCallback ? 'Yes' : 'OK');
        }

        if (noCallback) {
            freshNoBtn.onclick = () => {
                cleanup();
                this.hideModal();
                noCallback();
            };
            freshNoBtn.style.display = 'block';
            // Use custom label if provided, otherwise use default
            freshNoBtn.textContent = noLabel || 'No';
        } else {
            freshNoBtn.style.display = 'none';
        }

        // Set up keyboard handlers
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cleanup();
                this.hideModal();
                if (noCallback) {
                    noCallback();
                }
            }
        };

        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                cleanup();
                this.hideModal();
                if (yesCallback) {
                    yesCallback();
                }
            }
        };

        // Store handlers for cleanup
        this.modalKeyHandlers = {
            escape: handleEscape,
            enter: handleEnter
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleEnter);

        // Show modal
        modal.style.display = 'block';

        // Focus management for accessibility
        if (noCallback) {
            freshNoBtn.focus();
        } else {
            freshYesBtn.focus();
        }

        // Set up backdrop click to close (like Cancel)
        modal.onclick = (e) => {
            if (e.target === modal) {
                cleanup();
                this.hideModal();
                if (noCallback) {
                    noCallback();
                }
            }
        };

        Logger.debug('Modal shown:', title);
    }

    /**
     * Hide the modal dialog and clean up event handlers
     */
    hideModal() {
        const modal = document.getElementById('customModal');
        if (modal) {
            modal.style.display = 'none';

            // Clean up event handlers
            if (this.modalKeyHandlers) {
                document.removeEventListener('keydown', this.modalKeyHandlers.escape);
                document.removeEventListener('keydown', this.modalKeyHandlers.enter);
                this.modalKeyHandlers = null;
            }

            // Clean up onclick handlers
            modal.onclick = null;

            const modalYes = document.getElementById('modalYes');
            const modalNo = document.getElementById('modalNo');
            if (modalYes) modalYes.onclick = null;
            if (modalNo) modalNo.onclick = null;

            Logger.debug('Modal hidden and cleaned up');
        }
    }

    /**
     * Show a simple confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Function} callback - Callback with boolean result
     */
    confirm(message, callback) {
        this.showModal(
            'Confirm',
            message,
            () => callback(true),
            () => callback(false)
        );
    }

    /**
     * Show a simple alert dialog
     * @param {string} message - Alert message
     * @param {Function} callback - Optional callback when dismissed
     */
    alert(message, callback = null) {
        this.showModal(
            'Alert',
            message,
            callback
        );
    }
}

// Create global instance
window.modalManager = new ModalManager();

// Create global convenience functions for backward compatibility
window.showModal = (title, message, yesCallback, noCallback, yesLabel, noLabel) =>
    window.modalManager.showModal(title, message, yesCallback, noCallback, yesLabel, noLabel);

window.hideModal = () =>
    window.modalManager.hideModal();

Logger.debug('ModalManager initialized');