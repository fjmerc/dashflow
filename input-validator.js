/**
 * Enhanced Input Validation and XSS Protection
 *
 * Provides comprehensive input sanitization and validation
 */

class InputValidator {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalValidation();
        Logger.debug('Input validator initialized');
    }

    // Enhanced HTML sanitization
    sanitizeHtml(str) {
        if (typeof str !== 'string') return '';

        // Create a temporary element to safely escape HTML
        const temp = document.createElement('div');
        temp.textContent = str;

        // Additional cleaning for common XSS patterns
        let clean = temp.innerHTML
            .replace(/javascript:/gi, 'javascript-blocked:')
            .replace(/data:/gi, 'data-blocked:')
            .replace(/vbscript:/gi, 'vbscript-blocked:')
            .replace(/on\w+\s*=/gi, 'on-event-blocked=')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[script-blocked]')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '[iframe-blocked]')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '[object-blocked]')
            .replace(/<embed\b[^<]*>/gi, '[embed-blocked]')
            .replace(/<link\b[^<]*>/gi, '[link-blocked]')
            .replace(/<meta\b[^<]*>/gi, '[meta-blocked]');

        return clean.trim();
    }

    // Enhanced URL validation
    validateUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const urlObj = new URL(url);

            // Block dangerous protocols
            const dangerousProtocols = [
                'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'
            ];

            const protocol = urlObj.protocol.toLowerCase();
            if (dangerousProtocols.some(dangerous => protocol.startsWith(dangerous))) {
                Logger.warn('Blocked dangerous URL protocol:', protocol);
                return false;
            }

            // Only allow http and https
            if (!['http:', 'https:'].includes(protocol)) {
                return false;
            }

            // Block localhost and private IP ranges (optional security measure)
            const hostname = urlObj.hostname.toLowerCase();
            const privateIPs = [
                /^127\./, // 127.x.x.x
                /^10\./, // 10.x.x.x
                /^192\.168\./, // 192.168.x.x
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x
                /^localhost$/,
                /^::1$/, // IPv6 localhost
                /^fe80::/i // IPv6 link-local
            ];

            // Allow localhost in development
            const isDevelopment = window.location.hostname === 'localhost' ||
                                window.location.hostname === '127.0.0.1';

            if (!isDevelopment && privateIPs.some(pattern => pattern.test(hostname))) {
                Logger.warn('Blocked private/localhost URL:', hostname);
                return false;
            }

            return true;
        } catch (e) {
            Logger.warn('Invalid URL format:', url);
            return false;
        }
    }

    // Enhanced text validation
    validateText(text, options = {}) {
        const {
            maxLength = 500,
            minLength = 1,
            allowedChars = /^[\w\s\-_.,!?@#$%^&*()+=\[\]{};:'"\|<>\/\\`~]*$/,
            required = true
        } = options;

        if (!text || typeof text !== 'string') {
            return { valid: !required, error: required ? 'Text is required' : null };
        }

        const sanitized = this.sanitizeHtml(text);

        if (sanitized.length < minLength) {
            return { valid: false, error: `Text must be at least ${minLength} characters` };
        }

        if (sanitized.length > maxLength) {
            return { valid: false, error: `Text must be no more than ${maxLength} characters` };
        }

        if (!allowedChars.test(sanitized)) {
            return { valid: false, error: 'Text contains invalid characters' };
        }

        return { valid: true, sanitized };
    }

    // Section name validation
    validateSectionName(name) {
        return this.validateText(name, {
            maxLength: 50,
            minLength: 1,
            allowedChars: /^[\w\s\-_.]+$/,
            required: true
        });
    }

    // Link name validation
    validateLinkName(name) {
        return this.validateText(name, {
            maxLength: 100,
            minLength: 1,
            allowedChars: /^[\w\s\-_.,!?@#$%^&*()+=\[\]{};:'"\|<>\/\\`~]+$/,
            required: true
        });
    }

    // Todo text validation
    validateTodoText(text) {
        return this.validateText(text, {
            maxLength: 200,
            minLength: 1,
            allowedChars: /^[\w\s\-_.,!?@#$%^&*()+=\[\]{};:'"\|<>\/\\`~]+$/,
            required: true
        });
    }

    // Todo notes validation
    validateTodoNotes(notes) {
        return this.validateText(notes, {
            maxLength: 1000,
            minLength: 0,
            required: false
        });
    }

    // Username validation
    validateUsername(username) {
        return this.validateText(username, {
            maxLength: 30,
            minLength: 1,
            allowedChars: /^[\w\s\-_.]+$/,
            required: true
        });
    }

    // Search query validation
    validateSearchQuery(query) {
        return this.validateText(query, {
            maxLength: 100,
            minLength: 0,
            required: false
        });
    }

    // JSON validation for imports
    validateJsonImport(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validate structure
            if (typeof data !== 'object' || data === null) {
                return { valid: false, error: 'Invalid JSON structure' };
            }

            // Recursively sanitize all string values in the JSON
            const sanitized = this.deepSanitizeObject(data);

            return { valid: true, sanitized };
        } catch (e) {
            return { valid: false, error: 'Invalid JSON format' };
        }
    }

    // Deep sanitize object recursively
    deepSanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizeHtml(obj);
        } else if (Array.isArray(obj)) {
            return obj.map(item => this.deepSanitizeObject(item));
        } else if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                const cleanKey = this.sanitizeHtml(key);
                sanitized[cleanKey] = this.deepSanitizeObject(value);
            }
            return sanitized;
        }
        return obj;
    }

    // Setup global validation for form inputs
    setupGlobalValidation() {
        // Add input validation to existing forms
        this.addValidationToForm('addSectionForm');
        this.addValidationToForm('addLinkForm');

        // Add real-time validation feedback
        this.addRealTimeValidation();
    }

    addValidationToForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const inputs = form.querySelectorAll('input, textarea, select');
            let isValid = true;
            const errors = [];

            inputs.forEach(input => {
                // Use stricter validation for form submission
                const validation = this.validateInputForSubmit(input);
                if (!validation.valid) {
                    isValid = false;
                    errors.push(`${input.placeholder || input.name}: ${validation.error}`);
                    this.showInputError(input, validation.error);
                } else {
                    this.clearInputError(input);
                    if (validation.sanitized !== undefined) {
                        input.value = validation.sanitized;
                    }
                }
            });

            if (isValid) {
                // Proceed with original form submission
                const originalHandler = this.getOriginalSubmitHandler(formId);
                if (originalHandler) {
                    originalHandler(e);
                }
            } else {
                this.showValidationSummary(errors);
            }
        });
    }

    validateInput(input) {
        const type = input.type || input.tagName.toLowerCase();
        const value = input.value;

        switch (input.id) {
            case 'newSectionName':
                // Section name is required only on submit, not on blur
                if (!value.trim()) return { valid: true }; // Allow empty during typing
                return this.validateSectionName(value);
            case 'existingSections':
                // Select dropdown - don't show "required" validation during typing
                return { valid: true }; // Let HTML5 required attribute handle this
            case 'linkName':
                return this.validateLinkName(value);
            case 'linkUrl':
                if (!value) return { valid: true }; // Allow empty during typing, HTML5 handles required
                // Auto-add protocol if missing
                let url = value;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                    input.value = url; // Update the input
                }
                return this.validateUrl(url) ?
                    { valid: true, sanitized: url } :
                    { valid: false, error: 'Invalid URL format' };
            case 'todoInput':
                return this.validateTodoText(value);
            case 'todoNotes':
                return this.validateTodoNotes(value);
            case 'searchInput':
            case 'searchTodo':
                return this.validateSearchQuery(value);
            default:
                // For unknown inputs, only validate if they have content
                if (!value.trim()) return { valid: true };
                return this.validateText(value, { required: false });
        }
    }

    validateInputForSubmit(input) {
        const type = input.type || input.tagName.toLowerCase();
        const value = input.value;

        // Enforce required fields on form submission
        switch (input.id) {
            case 'newSectionName':
                return this.validateSectionName(value);
            case 'existingSections':
                if (!value) return { valid: false, error: 'Please select a section' };
                return { valid: true };
            case 'linkName':
                return this.validateLinkName(value);
            case 'linkUrl':
                if (!value) return { valid: false, error: 'URL is required' };
                // Auto-add protocol if missing
                let url = value;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                    input.value = url; // Update the input
                }
                return this.validateUrl(url) ?
                    { valid: true, sanitized: url } :
                    { valid: false, error: 'Invalid URL format' };
            case 'todoInput':
                return this.validateTodoText(value);
            case 'todoNotes':
                return this.validateTodoNotes(value);
            case 'searchInput':
            case 'searchTodo':
                return this.validateSearchQuery(value);
            default:
                // Check if field is marked as required
                if (input.hasAttribute('required') && !value.trim()) {
                    return { valid: false, error: `${input.placeholder || 'This field'} is required` };
                }
                if (value.trim()) {
                    return this.validateText(value, { required: false });
                }
                return { valid: true };
        }
    }

    addRealTimeValidation() {
        // Add validation feedback on input blur
        document.addEventListener('blur', (e) => {
            if (e.target.matches('input, textarea, select')) {
                const validation = this.validateInput(e.target);
                if (!validation.valid) {
                    this.showInputError(e.target, validation.error);
                } else {
                    this.clearInputError(e.target);
                    if (validation.sanitized !== undefined) {
                        e.target.value = validation.sanitized;
                    }
                }
            }
        }, true);
    }

    showInputError(input, error) {
        // Remove existing error
        this.clearInputError(input);

        // Add error class
        input.classList.add('input-error');

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error-message';
        errorDiv.textContent = error;

        // Insert after input
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }

    clearInputError(input) {
        input.classList.remove('input-error');

        // Remove error message
        const errorMsg = input.parentNode.querySelector('.input-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    showValidationSummary(errors) {
        if (errors.length === 0) return;

        const summary = `Please fix the following errors:\n\n${errors.join('\n')}`;

        if (typeof showModal === 'function') {
            showModal('Validation Error', summary, null, () => {});
        } else {
            alert(summary);
        }
    }

    // Store original submit handlers to call after validation
    getOriginalSubmitHandler(formId) {
        // This is a simplified approach - in reality, you'd need to integrate
        // this more carefully with existing form handlers
        switch (formId) {
            case 'addSectionForm':
                return (e) => addSection && addSection(e);
            case 'addLinkForm':
                return (e) => addLink && addLink(e);
            default:
                return null;
        }
    }

    // Content Security Policy helper
    generateCSPNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Check if current page has CSP
    checkCSP() {
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        return metaTags.length > 0;
    }
}

// Create global instance
window.inputValidator = new InputValidator();

// Export validation functions for use by other modules
window.validateAndSanitize = {
    html: (str) => window.inputValidator.sanitizeHtml(str),
    url: (url) => window.inputValidator.validateUrl(url),
    text: (text, options) => window.inputValidator.validateText(text, options),
    sectionName: (name) => window.inputValidator.validateSectionName(name),
    linkName: (name) => window.inputValidator.validateLinkName(name),
    todoText: (text) => window.inputValidator.validateTodoText(text),
    username: (username) => window.inputValidator.validateUsername(username),
    json: (jsonString) => window.inputValidator.validateJsonImport(jsonString)
};