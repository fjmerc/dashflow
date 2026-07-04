/**
 * Enhanced Keyboard Navigation System
 *
 * Provides comprehensive keyboard shortcuts and navigation for the dashboard
 */

class KeyboardNavigationManager {
    constructor() {
        this.shortcuts = new Map();
        this.init();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    init() {
        // Register keyboard shortcuts
        this.registerShortcuts();

        // Set up global event listener
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        Logger.debug('Keyboard navigation initialized');
    }

    registerShortcuts() {
        // Navigation shortcuts
        // Note: Ctrl+K / Ctrl+F (command palette) are handled by
        // js/core/command-palette.js so they work even while typing.
        this.shortcuts.set('ctrl+/', () => this.showKeyboardHelp());
        this.shortcuts.set('cmd+/', () => this.showKeyboardHelp()); // Mac

        // Quick actions
        this.shortcuts.set('ctrl+n', () => this.focusNewSection());
        this.shortcuts.set('cmd+n', () => this.focusNewSection()); // Mac
        this.shortcuts.set('ctrl+l', () => this.focusNewLink());
        this.shortcuts.set('cmd+l', () => this.focusNewLink()); // Mac
        this.shortcuts.set('ctrl+e', () => this.exportData());
        this.shortcuts.set('cmd+e', () => this.exportData()); // Mac
        this.shortcuts.set('ctrl+i', () => this.importData());
        this.shortcuts.set('cmd+i', () => this.importData()); // Mac

        // Theme shortcuts
        this.shortcuts.set('ctrl+shift+d', () => this.toggleDarkMode());
        this.shortcuts.set('cmd+shift+d', () => this.toggleDarkMode()); // Mac

        // Todo shortcuts (when on todo page)
        this.shortcuts.set('ctrl+t', () => this.goToTodos());
        this.shortcuts.set('cmd+t', () => this.goToTodos()); // Mac
        this.shortcuts.set('ctrl+h', () => this.goToHome());
        this.shortcuts.set('cmd+h', () => this.goToHome()); // Mac

        // Escape actions
        this.shortcuts.set('escape', () => this.handleEscape());

        // Notes shortcuts
        this.shortcuts.set('ctrl+shift+n', () => this.openNotes());
        this.shortcuts.set('cmd+shift+n', () => this.openNotes()); // Mac
        this.shortcuts.set('ctrl+`', () => this.openNotes());
        this.shortcuts.set('cmd+`', () => this.openNotes()); // Mac
    }

    handleKeyDown(event) {
        // Don't intercept if user is typing in an input, textarea, or contenteditable
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable ||
            activeElement.tagName === 'SELECT'
        );

        // Allow escape key even when typing (to close modals, clear search, etc.)
        if (event.key === 'Escape' && !isTyping) {
            this.handleEscape();
            return;
        }

        // Skip other shortcuts when typing
        if (isTyping && event.key !== 'Escape') {
            return;
        }

        // Build shortcut key
        const parts = [];
        if (event.ctrlKey && !event.metaKey) parts.push('ctrl');
        if (event.metaKey && !event.ctrlKey) parts.push('cmd'); // Mac Command key
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');

        // Add the main key
        const key = event.key.toLowerCase();
        parts.push(key);

        const shortcut = parts.join('+');

        // Execute shortcut if it exists
        if (this.shortcuts.has(shortcut)) {
            event.preventDefault();
            this.shortcuts.get(shortcut)();
            Logger.debug('Executed keyboard shortcut:', shortcut);
        }
    }

    showKeyboardHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'modal keyboard-help-modal';
        helpModal.style.display = 'block';

        // Check if we're on todo.html
        const isTodoPage = window.location.pathname.includes('todo.html');

        helpModal.innerHTML = `
            <div class="modal-content shortcuts-modal-content">
                <div class="modal-header">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body shortcuts-modal-body">
                    <div class="shortcuts-grid">
                        <div class="shortcut-section">
                            <h4>🧭 Navigation</h4>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>K</kbd>
                                </div>
                                <span class="shortcut-desc">Command Palette / Search</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>F</kbd>
                                </div>
                                <span class="shortcut-desc">Command Palette / Search</span>
                            </div>
                            ${isTodoPage ? `
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>/</kbd>
                                </div>
                                <span class="shortcut-desc">Task Search</span>
                            </div>` : ''}
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>T</kbd>
                                </div>
                                <span class="shortcut-desc">Go to Tasks</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>H</kbd>
                                </div>
                                <span class="shortcut-desc">Go to Dashboard</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>/</kbd>
                                </div>
                                <span class="shortcut-desc">Show This Help</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Escape</kbd>
                                </div>
                                <span class="shortcut-desc">Close/Cancel</span>
                            </div>
                        </div>

                        <div class="shortcut-section">
                            <h4>⚡ Quick Actions</h4>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>Shift</kbd><span class="key-plus">+</span><kbd>N</kbd>
                                </div>
                                <span class="shortcut-desc">Quick Notes</span>
                            </div>
                            ${!isTodoPage ? `
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>N</kbd>
                                </div>
                                <span class="shortcut-desc">New Section</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>L</kbd>
                                </div>
                                <span class="shortcut-desc">New Link</span>
                            </div>` : ''}
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>E</kbd>
                                </div>
                                <span class="shortcut-desc">Export Data</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>I</kbd>
                                </div>
                                <span class="shortcut-desc">Import Data</span>
                            </div>
                        </div>

                        <div class="shortcut-section">
                            <h4>🎨 Theme</h4>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>Shift</kbd><span class="key-plus">+</span><kbd>D</kbd>
                                </div>
                                <span class="shortcut-desc">Toggle Dark Mode</span>
                            </div>
                        </div>
                    </div>
                    <div class="help-note">
                        <span class="note-icon">💡</span>
                        <span>On Mac, use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd></span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn primary" data-action="close">Got it!</button>
                </div>
            </div>
        `;

        // Close on backdrop, .close button, or "Got it!" button
        const closeModal = () => {
            if (document.body.contains(helpModal)) document.body.removeChild(helpModal);
        };
        const closeBtn = helpModal.querySelector('.close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal || e.target.closest('[data-action="close"]')) {
                closeModal();
            }
        });

        document.body.appendChild(helpModal);
    }

    focusNewSection() {
        const newSectionInput = document.getElementById('newSectionName');
        if (newSectionInput) {
            newSectionInput.focus();
            newSectionInput.select();
        }
    }

    focusNewLink() {
        const existingSections = document.getElementById('existingSections');
        const linkNameInput = document.getElementById('linkName');

        if (existingSections && linkNameInput) {
            // If no section is selected, focus section dropdown first
            if (!existingSections.value) {
                existingSections.focus();
            } else {
                linkNameInput.focus();
                linkNameInput.select();
            }
        }
    }

    exportData() {
        const exportBtn = document.getElementById('exportAllBtn');
        if (exportBtn) {
            exportBtn.click();
        }
    }

    importData() {
        const importBtn = document.getElementById('importBtn') || document.getElementById('importTodosBtn');
        if (importBtn) {
            importBtn.click();
        }
    }

    toggleDarkMode() {
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.click();
        }
    }

    goToTodos() {
        if (!window.location.pathname.includes('todo.html')) {
            window.location.href = 'todo.html';
        }
    }

    goToHome() {
        if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }

    openNotes() {
        if (window.openNotesModal) {
            window.openNotesModal();
        } else {
            Logger.warn('Notes feature not available');
        }
    }

    handleEscape() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal[style*="display: block"]');
        modals.forEach(modal => {
            modal.style.display = 'none';
            // Clean up if it's a dynamically created modal
            if (modal.classList.contains('keyboard-help-modal')) {
                document.body.removeChild(modal);
            }
        });

        // Clear search if active
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput === document.activeElement && searchInput.value) {
            searchInput.value = '';
            const clearBtn = document.getElementById('clearSearchBtn');
            if (clearBtn) {
                clearBtn.classList.remove('visible');
            }
            // Re-render with empty search
            if (typeof renderLinks === 'function') {
                renderLinks('');
            }
        }

        // Clear todo search if active
        const todoSearch = document.getElementById('searchTodo');
        if (todoSearch && todoSearch === document.activeElement && todoSearch.value) {
            todoSearch.value = '';
            // Re-render todos with empty search
            if (typeof renderTodos === 'function') {
                renderTodos('', document.getElementById('priorityFilter')?.value || 'all');
            }
        }
    }
}

// Global instance
window.keyboardNav = new KeyboardNavigationManager();