/**
 * Enhanced Error Handling System
 *
 * Provides comprehensive error handling with user-friendly messages
 */

class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupUnhandledPromiseRejection();
        Logger.debug('Error handler initialized');
    }

    setupGlobalErrorHandling() {
        // Override console.error to catch and handle errors better
        const originalError = console.error;
        console.error = (...args) => {
            // Call original console.error
            originalError.apply(console, args);

            // Handle the error with our system
            if (args.length > 0) {
                const error = args[0];
                if (error instanceof Error) {
                    this.handleError(error, 'global');
                } else if (typeof error === 'string') {
                    this.handleError(new Error(error), 'global');
                }
            }
        };

        // Global error event listener
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), 'javascript', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
    }

    setupUnhandledPromiseRejection() {
        window.addEventListener('unhandledrejection', (event) => {
            event.preventDefault(); // Prevent console spam

            const reason = event.reason;
            const error = reason instanceof Error ? reason : new Error(String(reason));

            this.handleError(error, 'promise');
        });
    }

    handleError(error, type = 'unknown', context = {}) {
        // Create error entry
        const errorEntry = {
            id: this.generateErrorId(),
            error: error,
            type: type,
            context: context,
            timestamp: new Date().toISOString(),
            userMessage: this.generateUserFriendlyMessage(error, type),
            technicalMessage: error.message || 'Unknown error',
            stack: error.stack,
            severity: this.determineSeverity(error, type)
        };

        // Log to console for debugging
        Logger.error('Error handled:', errorEntry);

        // Add to queue
        this.errorQueue.push(errorEntry);

        // Process queue
        this.processErrorQueue();

        return errorEntry.id;
    }

    generateErrorId() {
        return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateUserFriendlyMessage(error, type) {
        const message = error.message || '';
        const lowerMessage = message.toLowerCase();

        // Network errors
        if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('cors')) {
            return {
                title: 'Connection Problem',
                description: 'There seems to be a network issue. Please check your internet connection and try again.',
                actions: ['Retry', 'Check Connection']
            };
        }

        // Storage errors
        if (lowerMessage.includes('localstorage') || lowerMessage.includes('quota') || lowerMessage.includes('storage')) {
            return {
                title: 'Storage Issue',
                description: 'Your browser is running low on storage space. Try clearing some data or freeing up space.',
                actions: ['Clear Storage', 'Export Data First']
            };
        }

        // Permission errors
        if (lowerMessage.includes('permission') || lowerMessage.includes('access') || lowerMessage.includes('denied')) {
            return {
                title: 'Permission Required',
                description: 'The app needs permission to perform this action. Please check your browser settings.',
                actions: ['Check Settings', 'Learn More']
            };
        }

        // File/Import errors
        if (lowerMessage.includes('file') || lowerMessage.includes('import') || lowerMessage.includes('json')) {
            return {
                title: 'File Problem',
                description: 'There was an issue with the file you selected. Please make sure it\'s a valid backup file.',
                actions: ['Try Different File', 'Check File Format']
            };
        }

        // Validation errors
        if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
            return {
                title: 'Input Error',
                description: 'Please check your input and make sure all required fields are filled correctly.',
                actions: ['Review Input', 'Get Help']
            };
        }

        // JavaScript errors
        if (type === 'javascript' || lowerMessage.includes('undefined') || lowerMessage.includes('null')) {
            return {
                title: 'Something Went Wrong',
                description: 'An unexpected error occurred. Refreshing the page might help.',
                actions: ['Refresh Page', 'Report Issue']
            };
        }

        // Promise/async errors
        if (type === 'promise') {
            return {
                title: 'Operation Failed',
                description: 'An operation couldn\'t complete successfully. Please try again.',
                actions: ['Try Again', 'Refresh Page']
            };
        }

        // Generic fallback
        return {
            title: 'Unexpected Error',
            description: 'Something unexpected happened. The app should continue working, but you might want to refresh if you encounter more issues.',
            actions: ['Continue', 'Refresh Page']
        };
    }

    determineSeverity(error, type) {
        const message = (error.message || '').toLowerCase();

        // Critical errors that break functionality
        if (message.includes('localstorage') ||
            message.includes('quota') ||
            type === 'javascript' && message.includes('cannot read property')) {
            return 'critical';
        }

        // High priority errors that affect user experience
        if (message.includes('network') ||
            message.includes('fetch') ||
            message.includes('permission') ||
            type === 'promise') {
            return 'high';
        }

        // Medium priority errors
        if (message.includes('validation') ||
            message.includes('invalid') ||
            message.includes('file')) {
            return 'medium';
        }

        // Low priority errors
        return 'low';
    }

    async processErrorQueue() {
        if (this.isProcessing || this.errorQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.errorQueue.length > 0) {
                const errorEntry = this.errorQueue.shift();
                await this.displayError(errorEntry);

                // Small delay to prevent overwhelming the user
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } finally {
            this.isProcessing = false;
        }
    }

    async displayError(errorEntry) {
        const { severity, userMessage } = errorEntry;

        // For critical and high severity, show modal
        if (severity === 'critical' || severity === 'high') {
            this.showErrorModal(errorEntry);
        }
        // For medium severity, show toast notification
        else if (severity === 'medium') {
            this.showErrorToast(errorEntry);
        }
        // For low severity, just log (already done)
        else {
            Logger.info('Low severity error logged:', userMessage.title);
        }
    }

    showErrorModal(errorEntry) {
        const { userMessage, technicalMessage, id } = errorEntry;

        if (typeof showModal === 'function') {
            const detailsButton = `<button onclick="window.errorHandler.showErrorDetails('${id}')" style="margin-top: 10px; padding: 5px 10px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">Show Details</button>`;

            showModal(
                userMessage.title,
                `${userMessage.description}\n\n${detailsButton}`,
                // Primary action
                () => {
                    this.executeErrorAction(errorEntry, userMessage.actions[0]);
                },
                // Secondary action or dismiss
                userMessage.actions[1] ? () => {
                    this.executeErrorAction(errorEntry, userMessage.actions[1]);
                } : null
            );
        } else {
            // Fallback to alert
            alert(`${userMessage.title}\n\n${userMessage.description}`);
        }
    }

    showErrorToast(errorEntry) {
        const { userMessage } = errorEntry;

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.innerHTML = `
            <div class="error-toast-content">
                <div class="error-toast-icon">⚠️</div>
                <div class="error-toast-text">
                    <div class="error-toast-title">${userMessage.title}</div>
                    <div class="error-toast-description">${userMessage.description}</div>
                </div>
                <button class="error-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 6 seconds
        setTimeout(() => {
            if (document.body.contains(toast)) {
                toast.classList.add('fade-out');
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }
        }, 6000);

        // Animate in
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
    }

    showErrorDetails(errorId) {
        const errorEntry = this.errorQueue.find(e => e.id === errorId) ||
                          this.getErrorFromHistory(errorId);

        if (!errorEntry) {
            alert('Error details not found');
            return;
        }

        const details = `
Error ID: ${errorEntry.id}
Type: ${errorEntry.type}
Timestamp: ${new Date(errorEntry.timestamp).toLocaleString()}
Severity: ${errorEntry.severity}

Technical Message:
${errorEntry.technicalMessage}

Stack Trace:
${errorEntry.stack || 'Not available'}

Context:
${JSON.stringify(errorEntry.context, null, 2)}
        `.trim();

        // Create details modal
        const modal = document.createElement('div');
        modal.className = 'modal error-details-modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Error Details</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <pre class="error-details-text">${details}</pre>
                </div>
                <div class="modal-footer">
                    <button onclick="window.errorHandler.copyErrorDetails('${errorId}')" class="modal-btn">Copy Details</button>
                    <button onclick="this.closest('.modal').remove()" class="modal-btn primary">Close</button>
                </div>
            </div>
        `;

        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    copyErrorDetails(errorId) {
        const errorEntry = this.errorQueue.find(e => e.id === errorId) ||
                          this.getErrorFromHistory(errorId);

        if (!errorEntry) return;

        const details = JSON.stringify(errorEntry, null, 2);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(details).then(() => {
                this.showSuccessToast('Error details copied to clipboard');
            }).catch(() => {
                // Fallback to alert
                alert('Error details:\n\n' + details);
            });
        } else {
            // Fallback for older browsers
            alert('Error details:\n\n' + details);
        }
    }

    showSuccessToast(message) {
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">✅</div>
                <div class="toast-text">${message}</div>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    executeErrorAction(errorEntry, action) {
        switch (action) {
            case 'Retry':
                // If we can determine the failed operation, retry it
                this.showSuccessToast('You can try the operation again');
                break;

            case 'Refresh Page':
                if (confirm('This will refresh the page and you may lose unsaved changes. Continue?')) {
                    window.location.reload();
                }
                break;

            case 'Clear Storage':
                if (confirm('This will clear all stored data. Make sure to export your data first! Continue?')) {
                    localStorage.clear();
                    window.location.reload();
                }
                break;

            case 'Export Data First':
                if (typeof exportAllData === 'function') {
                    exportAllData(false);
                } else {
                    alert('Export function not available. Please try manually.');
                }
                break;

            case 'Check Settings':
                this.showBrowserSettingsHelp();
                break;

            case 'Check Connection':
                this.showConnectionHelp();
                break;

            case 'Try Different File':
                this.showFileFormatHelp();
                break;

            case 'Report Issue':
                this.showReportIssueHelp();
                break;

            default:
                Logger.debug('Unknown error action:', action);
        }
    }

    showBrowserSettingsHelp() {
        const helpText = `
To check your browser settings:

1. Look for a lock or shield icon in your address bar
2. Click it and check if any permissions are blocked
3. Try reloading the page after adjusting settings
4. If using an incognito/private window, try a regular window

Common issues:
• Cookies/Local Storage disabled
• JavaScript disabled
• Third-party cookies blocked
        `.trim();

        alert(helpText);
    }

    showConnectionHelp() {
        const helpText = `
Connection troubleshooting:

1. Check if you're connected to the internet
2. Try refreshing the page
3. Check if other websites work
4. Try disabling VPN if you're using one
5. Clear your browser cache

If the problem persists, the issue might be temporary.
        `.trim();

        alert(helpText);
    }

    showFileFormatHelp() {
        const helpText = `
File format requirements:

• File must be a JSON file exported from this dashboard
• File should have a .json extension
• File must contain valid dashboard data structure
• Make sure the file isn't corrupted or modified

Try exporting a new backup file if needed.
        `.trim();

        alert(helpText);
    }

    showReportIssueHelp() {
        const helpText = `
To report an issue:

1. Note what you were doing when the error occurred
2. Copy the error details using the "Show Details" button
3. Include your browser type and version
4. Describe the steps to reproduce the problem

You can report issues via:
• Browser developer console (F12)
• Contact form if available
• GitHub issues if this is an open source project
        `.trim();

        alert(helpText);
    }

    getErrorFromHistory(errorId) {
        // In a more complex system, this would retrieve from persistent storage
        return null;
    }

    // Public API for manual error reporting
    reportError(message, context = {}) {
        const error = new Error(message);
        return this.handleError(error, 'manual', context);
    }

    // Graceful degradation helper
    withErrorBoundary(fn, fallback = null, context = {}) {
        return (...args) => {
            try {
                const result = fn.apply(this, args);

                // Handle promises
                if (result && typeof result.catch === 'function') {
                    return result.catch(error => {
                        this.handleError(error, 'promise', context);
                        return fallback;
                    });
                }

                return result;
            } catch (error) {
                this.handleError(error, 'sync', context);
                return fallback;
            }
        };
    }
}

// Create global instance
window.errorHandler = new ErrorHandler();

// Export utility functions
window.withErrorBoundary = (fn, fallback, context) =>
    window.errorHandler.withErrorBoundary(fn, fallback, context);

window.reportError = (message, context) =>
    window.errorHandler.reportError(message, context);