/**
 * Enhanced Keyboard Navigation System
 *
 * Provides comprehensive keyboard shortcuts and navigation for the dashboard
 */

class KeyboardNavigationManager {
    constructor() {
        this.shortcuts = new Map();
        this.globalSearchVisible = false;
        this.init();
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
        this.shortcuts.set('ctrl+k', () => this.openCommandPalette());
        this.shortcuts.set('cmd+k', () => this.openCommandPalette()); // Mac
        this.shortcuts.set('ctrl+f', () => this.toggleGlobalSearch());
        this.shortcuts.set('cmd+f', () => this.toggleGlobalSearch()); // Mac
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

    toggleGlobalSearch() {
        // Always show global search modal for consistent cross-page search
        this.showGlobalSearchModal();
    }

    showGlobalSearchModal() {
        // Create and show global search modal
        const modal = this.createGlobalSearchModal();
        document.body.appendChild(modal);

        const searchInput = modal.querySelector('#globalSearchInput');
        setTimeout(() => searchInput.focus(), 100);
    }

    createGlobalSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'modal global-search-modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Global Search</h3>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body">
                    <input type="text" id="globalSearchInput" placeholder="Search across links, tasks, and notes..." class="global-search-input">
                    <div id="globalSearchResults" class="global-search-results"></div>
                </div>
                <div class="modal-footer">
                    <small>Press Escape to close • Use ↑↓ arrow keys to navigate results</small>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('.close');
        const searchInput = modal.querySelector('#globalSearchInput');

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Global search functionality (simplified for now)
        searchInput.addEventListener('input', (e) => {
            this.performGlobalSearch(e.target.value, modal.querySelector('#globalSearchResults'));
        });

        // Handle escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
            }
        });

        return modal;
    }

    performGlobalSearch(query, resultsContainer) {
        if (!query.trim()) {
            resultsContainer.innerHTML = '';
            return;
        }

        const results = [];
        const lowerQuery = query.toLowerCase();

        // Search links
        try {
            const links = JSON.parse(localStorage.getItem('links') || '{}');
            for (const [section, sectionLinks] of Object.entries(links)) {
                sectionLinks.forEach(link => {
                    if (link.name.toLowerCase().includes(lowerQuery) ||
                        link.url.toLowerCase().includes(lowerQuery) ||
                        section.toLowerCase().includes(lowerQuery)) {
                        results.push({
                            type: 'link',
                            title: link.name,
                            subtitle: `${section} • ${link.url}`,
                            url: link.url,
                            section: section
                        });
                    }
                });
            }
        } catch (e) {
            Logger.error('Error searching links:', e);
        }

        // Search tasks
        try {
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            const projects = JSON.parse(localStorage.getItem('projects') || '[]');

            tasks.forEach(task => {
                // Search in task text, description, tags, and subtasks
                const matchesText = task.text.toLowerCase().includes(lowerQuery);
                const matchesDescription = task.description && task.description.toLowerCase().includes(lowerQuery);
                const matchesTags = task.tags && task.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
                const matchesSubtasks = task.subtasks && task.subtasks.some(subtask =>
                    subtask.text.toLowerCase().includes(lowerQuery)
                );

                if (matchesText || matchesDescription || matchesTags || matchesSubtasks) {
                    // Get project name
                    const project = projects.find(p => p.id === task.projectId);
                    const projectName = project ? project.name : 'Inbox';

                    // Build subtitle with relevant info
                    const statusInfo = task.completed ? 'Completed' : task.status || 'todo';
                    const priorityInfo = task.priority ? `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority` : '';
                    const parts = [projectName, statusInfo, priorityInfo].filter(p => p);

                    results.push({
                        type: 'task',
                        title: task.text,
                        subtitle: `Task • ${parts.join(' • ')}`,
                        taskId: task.id
                    });
                }
            });
        } catch (e) {
            Logger.error('Error searching tasks:', e);
        }

        // Search notes
        try {
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');

            notes.forEach(note => {
                // Search in note title, content, and tags
                const matchesTitle = note.title && note.title.toLowerCase().includes(lowerQuery);
                const matchesContent = note.content && note.content.toLowerCase().includes(lowerQuery);
                const matchesTags = note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

                if (matchesTitle || matchesContent || matchesTags) {
                    // Build subtitle with tags or content preview
                    let subtitle = 'Note';
                    if (note.tags && note.tags.length > 0) {
                        subtitle += ` • ${note.tags.join(', ')}`;
                    } else if (note.content) {
                        // Show content preview (first 50 chars)
                        const preview = note.content.substring(0, 50).replace(/\n/g, ' ');
                        subtitle += ` • ${preview}${note.content.length > 50 ? '...' : ''}`;
                    }

                    results.push({
                        type: 'note',
                        title: note.title || 'Untitled Note',
                        subtitle: subtitle,
                        noteId: note.id
                    });
                }
            });
        } catch (e) {
            Logger.error('Error searching notes:', e);
        }

        // Display results
        this.displayGlobalSearchResults(results, resultsContainer);
    }

    displayGlobalSearchResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="no-results">No results found</div>';
            return;
        }

        container.innerHTML = results.map(result => `
            <div class="search-result" data-type="${result.type}" data-url="${result.url || ''}" data-task-id="${result.taskId || ''}" data-note-id="${result.noteId || ''}">
                <div class="result-title">${this.highlightMatch(result.title)}</div>
                <div class="result-subtitle">${result.subtitle}</div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.search-result').forEach(resultEl => {
            resultEl.addEventListener('click', () => {
                this.handleSearchResultClick(resultEl);
                // Close modal
                const modal = document.querySelector('.global-search-modal');
                if (modal) {
                    document.body.removeChild(modal);
                }
            });
        });
    }

    highlightMatch(text) {
        // Simple highlight implementation - could be enhanced
        return text; // For now, return as-is
    }

    handleSearchResultClick(resultEl) {
        const type = resultEl.dataset.type;

        if (type === 'link') {
            const url = resultEl.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        } else if (type === 'task' || type === 'todo') {
            // Navigate to todo page with task ID
            const taskId = resultEl.dataset.taskId;
            if (taskId) {
                window.location.href = `todo.html?taskId=${taskId}`;
            } else {
                window.location.href = 'todo.html';
            }
        } else if (type === 'note') {
            // Open notes modal and load specific note
            const noteId = resultEl.dataset.noteId;
            if (noteId && window.openNotesModal) {
                window.openNotesModal();
                // Wait for modal to open, then load the note
                setTimeout(() => {
                    if (window.notesUIManager) {
                        window.notesUIManager.loadNote(noteId);
                    }
                }, 150);
            }
        }
    }

    openCommandPalette() {
        // Check if we're on the todo page (which has its own command palette)
        if (window.location.pathname.includes('todo.html')) {
            // The todo page handles its own command palette
            // This event will be caught by todo.js
            return;
        }

        // For dashboard page, navigate to todo.html command palette
        // Or show a simple dashboard command palette
        window.location.href = 'todo.html';
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
                                <span class="shortcut-desc">Command Palette</span>
                            </div>
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    <kbd>Ctrl</kbd><span class="key-plus">+</span><kbd>F</kbd>
                                </div>
                                <span class="shortcut-desc">Global Search</span>
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
                    <button class="modal-btn primary" onclick="this.closest('.modal').remove()">Got it!</button>
                </div>
            </div>
        `;

        // Add close functionality
        const closeBtn = helpModal.querySelector('.close');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(helpModal);
        });

        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                document.body.removeChild(helpModal);
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
            if (modal.classList.contains('global-search-modal') ||
                modal.classList.contains('keyboard-help-modal')) {
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