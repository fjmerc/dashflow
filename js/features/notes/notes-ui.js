/**
 * Notes UI Manager
 * Handles UI rendering and user interactions for the quick notes feature
 */

class NotesUIManager {
    constructor() {
        this.notesDataManager = null;
        this.currentNote = null;
        this.searchQuery = '';
        this.filterTag = null;
        this.saveTimeout = null;
        this.isModalOpen = false;
    }

    /**
     * Initialize the notes UI manager
     */
    init() {
        Logger.debug('NotesUIManager: Initializing');

        // Initialize data manager
        this.notesDataManager = new NotesDataManager();

        Logger.debug('NotesUIManager: Initialized');
    }

    /**
     * Open the notes modal
     */
    openNotesModal() {
        if (this.isModalOpen) {
            return;
        }

        Logger.debug('NotesUIManager: Opening notes modal');

        // Create modal
        const modal = this.createNotesModal();
        document.body.appendChild(modal);
        this.isModalOpen = true;

        // Render notes list
        this.renderNotesList();

        // Focus search input
        setTimeout(() => {
            const searchInput = document.getElementById('notesSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);

        // Set up event listeners
        this.setupModalEventListeners();
    }

    /**
     * Close the notes modal
     */
    closeNotesModal() {
        const modal = document.getElementById('notesModal');
        if (modal) {
            // Save current note before closing
            if (this.currentNote) {
                this.saveCurrentNote();
            }

            document.body.removeChild(modal);
            this.isModalOpen = false;
            this.currentNote = null;
            this.searchQuery = '';
            this.filterTag = null;

            Logger.debug('NotesUIManager: Closed notes modal');
        }
    }

    /**
     * Create the notes modal HTML
     */
    createNotesModal() {
        const modal = document.createElement('div');
        modal.id = 'notesModal';
        modal.className = 'modal notes-modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content notes-modal-content">
                <div class="notes-container">
                    <!-- Notes Sidebar -->
                    <div class="notes-sidebar">
                        <div class="notes-sidebar-header">
                            <h3><i class="fas fa-sticky-note"></i> Quick Notes</h3>
                            <button class="notes-close-btn" title="Close (Esc)" aria-label="Close notes">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <div class="notes-sidebar-controls">
                            <div class="notes-search-wrapper">
                                <input type="text"
                                       id="notesSearchInput"
                                       class="notes-search-input"
                                       placeholder="Search notes..."
                                       aria-label="Search notes">
                                <button id="notesClearSearchBtn"
                                        class="notes-clear-search-btn"
                                        title="Clear search"
                                        aria-label="Clear search"
                                        style="display: none;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <button id="notesNewBtn"
                                    class="notes-new-btn"
                                    title="New Note (Ctrl+N)"
                                    aria-label="Create new note">
                                <i class="fas fa-plus"></i> New
                            </button>
                        </div>

                        <div class="notes-tags-filter" id="notesTagsFilter"></div>

                        <div class="notes-list" id="notesList">
                            <div class="notes-loading">Loading notes...</div>
                        </div>

                        <div class="notes-sidebar-footer">
                            <span id="notesCount">0 notes</span>
                        </div>
                    </div>

                    <!-- Notes Editor -->
                    <div class="notes-editor" id="notesEditor">
                        <div class="notes-editor-empty" id="notesEditorEmpty">
                            <i class="fas fa-sticky-note"></i>
                            <p>Select a note or create a new one</p>
                            <button id="notesNewBtnAlt" class="notes-new-btn-alt">
                                <i class="fas fa-plus"></i> Create Note
                            </button>
                        </div>

                        <div class="notes-editor-content" id="notesEditorContent" style="display: none;">
                            <div class="notes-editor-header">
                                <input type="text"
                                       id="noteTitle"
                                       class="note-title-input"
                                       placeholder="Untitled Note"
                                       aria-label="Note title">
                                <div class="notes-editor-actions">
                                    <button id="notesDeleteBtn"
                                            class="notes-action-btn notes-delete-btn"
                                            title="Delete Note"
                                            aria-label="Delete note">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="note-tags-container">
                                <input type="text"
                                       id="noteTagsInput"
                                       class="note-tags-input"
                                       placeholder="Add tags (comma-separated)"
                                       aria-label="Note tags">
                            </div>

                            <textarea id="noteContent"
                                      class="note-content-textarea"
                                      placeholder="Start typing your note...&#10;&#10;Supports markdown:&#10;**bold**, *italic*, [link](url), # heading"
                                      aria-label="Note content"></textarea>

                            <div class="notes-editor-footer">
                                <div class="note-metadata">
                                    <span id="noteModified">Modified: Just now</span>
                                </div>
                                <div class="note-save-status">
                                    <span id="noteSaveStatus"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Set up event listeners for the modal
     */
    setupModalEventListeners() {
        // Close button
        const closeBtn = document.querySelector('.notes-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeNotesModal());
        }

        // Close on backdrop click
        const modal = document.getElementById('notesModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeNotesModal();
                }
            });
        }

        // Escape key to close
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Search input
        const searchInput = document.getElementById('notesSearchInput');
        const clearSearchBtn = document.getElementById('notesClearSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.renderNotesList();

                // Show/hide clear button
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
                }
            });
        }

        // Clear search button
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.searchQuery = '';
                    this.renderNotesList();
                    clearSearchBtn.style.display = 'none';
                    searchInput.focus();
                }
            });
        }

        // New note buttons
        const newBtn = document.getElementById('notesNewBtn');
        const newBtnAlt = document.getElementById('notesNewBtnAlt');

        if (newBtn) {
            newBtn.addEventListener('click', () => this.createNewNote());
        }
        if (newBtnAlt) {
            newBtnAlt.addEventListener('click', () => this.createNewNote());
        }

        // Delete button
        const deleteBtn = document.getElementById('notesDeleteBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentNote());
        }

        // Note title input
        const titleInput = document.getElementById('noteTitle');
        if (titleInput) {
            titleInput.addEventListener('input', () => this.scheduleAutoSave());
        }

        // Note content textarea
        const contentTextarea = document.getElementById('noteContent');
        if (contentTextarea) {
            contentTextarea.addEventListener('input', () => this.scheduleAutoSave());
        }

        // Note tags input
        const tagsInput = document.getElementById('noteTagsInput');
        if (tagsInput) {
            tagsInput.addEventListener('input', () => this.scheduleAutoSave());
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyDown(e) {
        if (!this.isModalOpen) return;

        // Escape - close modal
        if (e.key === 'Escape') {
            e.preventDefault();
            this.closeNotesModal();
        }

        // Ctrl/Cmd + N - new note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewNote();
        }

        // Ctrl/Cmd + S - save (already auto-saves, but provide feedback)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveCurrentNote();
            this.showSaveStatus('Saved');
        }
    }

    /**
     * Render the notes list
     */
    renderNotesList() {
        const notesList = document.getElementById('notesList');
        const notesCount = document.getElementById('notesCount');

        if (!notesList) return;

        // Get notes (filtered by search and tag)
        let notes = this.filterTag
            ? this.notesDataManager.getNotesByTag(this.filterTag)
            : this.notesDataManager.searchNotes(this.searchQuery);

        // Update count
        if (notesCount) {
            const count = notes.length;
            notesCount.textContent = `${count} note${count !== 1 ? 's' : ''}`;
        }

        // Render notes
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="notes-empty">
                    <i class="fas fa-sticky-note"></i>
                    <p>${this.searchQuery ? 'No notes found' : 'No notes yet'}</p>
                </div>
            `;
            return;
        }

        notesList.innerHTML = notes.map(note => {
            const isActive = this.currentNote && this.currentNote.id === note.id;
            const preview = this.getContentPreview(note.content);
            const formattedDate = this.formatDate(note.modifiedAt);

            return `
                <div class="note-item ${isActive ? 'active' : ''}" data-note-id="${note.id}">
                    <div class="note-item-title">${this.escapeHtml(note.title || 'Untitled Note')}</div>
                    <div class="note-item-preview">${this.escapeHtml(preview)}</div>
                    <div class="note-item-meta">
                        <span class="note-item-date">${formattedDate}</span>
                        ${note.tags.length > 0 ? `
                            <span class="note-item-tags">
                                ${note.tags.slice(0, 2).map(tag =>
                                    `<span class="note-tag-badge">${this.escapeHtml(tag)}</span>`
                                ).join('')}
                                ${note.tags.length > 2 ? `<span class="note-tag-badge">+${note.tags.length - 2}</span>` : ''}
                            </span>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners to note items
        notesList.querySelectorAll('.note-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.noteId;
                this.loadNote(noteId);
            });
        });

        // Render tags filter
        this.renderTagsFilter();
    }

    /**
     * Render tags filter
     */
    renderTagsFilter() {
        const tagsFilter = document.getElementById('notesTagsFilter');
        if (!tagsFilter) return;

        const tags = this.notesDataManager.getAllTags();

        if (tags.length === 0) {
            tagsFilter.innerHTML = '';
            return;
        }

        tagsFilter.innerHTML = `
            <div class="notes-tags-title">Tags:</div>
            <div class="notes-tags-list">
                ${tags.map(({ tag, count }) => {
                    const isActive = this.filterTag === tag;
                    return `
                        <button class="notes-tag-filter ${isActive ? 'active' : ''}"
                                data-tag="${this.escapeHtml(tag)}">
                            ${this.escapeHtml(tag)} <span class="tag-count">${count}</span>
                        </button>
                    `;
                }).join('')}
                ${this.filterTag ? `<button class="notes-tag-clear">Clear filter</button>` : ''}
            </div>
        `;

        // Add click listeners to tag filters
        tagsFilter.querySelectorAll('.notes-tag-filter').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                this.filterTag = this.filterTag === tag ? null : tag;
                this.renderNotesList();
            });
        });

        // Clear filter button
        const clearBtn = tagsFilter.querySelector('.notes-tag-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.filterTag = null;
                this.renderNotesList();
            });
        }
    }

    /**
     * Create a new note
     */
    createNewNote() {
        // Save current note first
        if (this.currentNote) {
            this.saveCurrentNote();
        }

        // Create new note
        const newNote = this.notesDataManager.addNote({
            title: '',
            content: '',
            tags: []
        });

        // Load the new note
        this.loadNote(newNote.id);

        // Refresh list
        this.renderNotesList();

        // Focus title input
        setTimeout(() => {
            const titleInput = document.getElementById('noteTitle');
            if (titleInput) {
                titleInput.focus();
            }
        }, 100);

        Logger.debug('NotesUIManager: Created new note');
    }

    /**
     * Load a note into the editor
     */
    loadNote(noteId) {
        // Save current note first
        if (this.currentNote && this.currentNote.id !== noteId) {
            this.saveCurrentNote();
        }

        const note = this.notesDataManager.getNoteById(noteId);
        if (!note) {
            Logger.error('NotesUIManager: Note not found:', noteId);
            return;
        }

        this.currentNote = note;

        // Show editor content, hide empty state
        const editorEmpty = document.getElementById('notesEditorEmpty');
        const editorContent = document.getElementById('notesEditorContent');

        if (editorEmpty) editorEmpty.style.display = 'none';
        if (editorContent) editorContent.style.display = 'flex';

        // Populate editor fields
        const titleInput = document.getElementById('noteTitle');
        const contentTextarea = document.getElementById('noteContent');
        const tagsInput = document.getElementById('noteTagsInput');
        const modifiedSpan = document.getElementById('noteModified');

        if (titleInput) titleInput.value = note.title;
        if (contentTextarea) contentTextarea.value = note.content;
        if (tagsInput) tagsInput.value = note.tags.join(', ');
        if (modifiedSpan) modifiedSpan.textContent = `Modified: ${this.formatDate(note.modifiedAt)}`;

        // Update active state in list
        this.renderNotesList();

        Logger.debug('NotesUIManager: Loaded note', noteId);
    }

    /**
     * Schedule auto-save (debounced)
     */
    scheduleAutoSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.showSaveStatus('Saving...');

        this.saveTimeout = setTimeout(() => {
            this.saveCurrentNote();
            this.showSaveStatus('Saved');
            setTimeout(() => this.showSaveStatus(''), 2000);
        }, 500);
    }

    /**
     * Save the current note
     */
    saveCurrentNote() {
        if (!this.currentNote) return;

        const titleInput = document.getElementById('noteTitle');
        const contentTextarea = document.getElementById('noteContent');
        const tagsInput = document.getElementById('noteTagsInput');

        if (!titleInput || !contentTextarea || !tagsInput) return;

        // Parse tags (comma-separated)
        const tags = tagsInput.value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        // Update note
        this.notesDataManager.updateNote(this.currentNote.id, {
            title: titleInput.value.trim(),
            content: contentTextarea.value,
            tags: tags
        });

        // Refresh current note object
        this.currentNote = this.notesDataManager.getNoteById(this.currentNote.id);

        // Update modified timestamp display
        const modifiedSpan = document.getElementById('noteModified');
        if (modifiedSpan && this.currentNote) {
            modifiedSpan.textContent = `Modified: ${this.formatDate(this.currentNote.modifiedAt)}`;
        }

        // Refresh list to show updated preview
        this.renderNotesList();

        Logger.debug('NotesUIManager: Saved note', this.currentNote.id);
    }

    /**
     * Delete the current note
     */
    deleteCurrentNote() {
        if (!this.currentNote) return;

        const noteTitle = this.currentNote.title || 'Untitled Note';

        if (window.showModal) {
            showModal(
                'Delete Note',
                `Are you sure you want to delete "${noteTitle}"?`,
                () => {
                    const noteId = this.currentNote.id;
                    this.notesDataManager.deleteNote(noteId);

                    // Clear editor
                    this.currentNote = null;
                    const editorEmpty = document.getElementById('notesEditorEmpty');
                    const editorContent = document.getElementById('notesEditorContent');
                    if (editorEmpty) editorEmpty.style.display = 'flex';
                    if (editorContent) editorContent.style.display = 'none';

                    // Refresh list
                    this.renderNotesList();

                    Logger.debug('NotesUIManager: Deleted note', noteId);
                },
                () => {
                    // Cancelled
                }
            );
        } else {
            if (confirm(`Are you sure you want to delete "${noteTitle}"?`)) {
                const noteId = this.currentNote.id;
                this.notesDataManager.deleteNote(noteId);

                this.currentNote = null;
                const editorEmpty = document.getElementById('notesEditorEmpty');
                const editorContent = document.getElementById('notesEditorContent');
                if (editorEmpty) editorEmpty.style.display = 'flex';
                if (editorContent) editorContent.style.display = 'none';

                this.renderNotesList();
            }
        }
    }

    /**
     * Show save status message
     */
    showSaveStatus(message) {
        const statusEl = document.getElementById('noteSaveStatus');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Get content preview (first 100 chars)
     */
    getContentPreview(content) {
        if (!content) return 'No content';
        const stripped = content.replace(/[#*\[\]()]/g, '').trim();
        return stripped.substring(0, 100) + (stripped.length > 100 ? '...' : '');
    }

    /**
     * Format date for display
     */
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (window.inputValidator && typeof window.inputValidator.sanitizeHtml === 'function') {
            return window.inputValidator.sanitizeHtml(text);
        }

        // Fallback sanitization
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
window.notesUIManager = new NotesUIManager();

// Global function to open notes modal
window.openNotesModal = () => {
    if (!window.notesUIManager.notesDataManager) {
        window.notesUIManager.init();
    }
    window.notesUIManager.openNotesModal();
};

Logger.debug('notes-ui.js loaded');
