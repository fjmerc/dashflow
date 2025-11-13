/**
 * Notes Data Manager
 * Handles data models and localStorage persistence for the quick notes system
 */

/**
 * @typedef {Object} NoteData
 * @property {string} [id] - Unique note identifier
 * @property {string} [title] - Note title
 * @property {string} [content] - Note content (supports markdown)
 * @property {string[]} [tags] - Array of tag names
 * @property {string} [createdAt] - Creation timestamp (ISO string)
 * @property {string} [modifiedAt] - Last modification timestamp (ISO string)
 */

/**
 * @typedef {Object} TagInfo
 * @property {string} tag - Tag name
 * @property {number} count - Number of notes with this tag
 */

/**
 * @typedef {Object} NotesStats
 * @property {number} totalNotes - Total number of notes
 * @property {number} totalTags - Total number of unique tags
 * @property {number} recentNotes - Notes modified in last 7 days
 */

/**
 * Note Data Model
 * Represents a single note with title, content, and tags
 */
class Note {
    /**
     * Create a new Note
     * @param {NoteData} data - Note initialization data
     */
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.title = data.title || '';
        this.content = data.content || '';
        this.tags = data.tags || [];
        this.createdAt = data.createdAt || new Date().toISOString();
        this.modifiedAt = data.modifiedAt || this.createdAt;
    }

    /**
     * Generate a unique note ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Convert note to plain object for storage
     * @returns {NoteData} Plain object representation
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            tags: this.tags,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt
        };
    }
}

/**
 * Notes Data Manager
 * Handles all data operations and localStorage persistence
 */
class NotesDataManager {
    constructor() {
        this.notes = [];
        this.init();
    }

    init() {
        Logger.debug('NotesDataManager: Initializing');
        this.loadFromStorage();
        Logger.debug('NotesDataManager: Initialized with', this.notes.length, 'notes');
    }

    /**
     * Load notes from localStorage
     */
    loadFromStorage() {
        try {
            const notesData = localStorage.getItem('notes');
            if (notesData) {
                const parsed = JSON.parse(notesData);
                this.notes = parsed.map(n => new Note(n));
                Logger.debug('NotesDataManager: Loaded', this.notes.length, 'notes');
            }
        } catch (error) {
            Logger.error('NotesDataManager: Error loading from storage', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'storage', {
                    operation: 'load_notes_from_storage'
                });
            }
            this.notes = [];
        }
    }

    /**
     * Save notes to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('notes', JSON.stringify(this.notes.map(n => n.toJSON())));
            Logger.debug('NotesDataManager: Saved to storage');
        } catch (error) {
            Logger.error('NotesDataManager: Error saving to storage', error);
            if (window.errorHandler) {
                window.errorHandler.handleError(error, 'storage', {
                    operation: 'save_notes_to_storage'
                });
            }
        }
    }

    /**
     * Get all notes sorted by modified date
     * @returns {Note[]} Array of notes (most recent first)
     */
    getAllNotes() {
        return this.notes.sort((a, b) => {
            const dateA = new Date(a.modifiedAt);
            const dateB = new Date(b.modifiedAt);
            return dateB - dateA; // Most recent first
        });
    }

    /**
     * Get note by ID
     * @param {string} noteId - Note identifier
     * @returns {Note|undefined} The note or undefined if not found
     */
    getNoteById(noteId) {
        return this.notes.find(n => n.id === noteId);
    }

    /**
     * Search notes by query
     * Searches across title, content, and tags (case-insensitive)
     * @param {string} query - Search query
     * @returns {Note[]} Matching notes (most recent first)
     * @example
     * // Search for notes containing "meeting"
     * const results = manager.searchNotes("meeting");
     */
    searchNotes(query) {
        if (!query || !query.trim()) {
            return this.getAllNotes();
        }

        const lowerQuery = query.toLowerCase().trim();
        return this.notes.filter(note => {
            return note.title.toLowerCase().includes(lowerQuery) ||
                   note.content.toLowerCase().includes(lowerQuery) ||
                   note.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
        }).sort((a, b) => {
            const dateA = new Date(a.modifiedAt);
            const dateB = new Date(b.modifiedAt);
            return dateB - dateA;
        });
    }

    /**
     * Get notes by tag
     * @param {string} tag - Tag name to filter by
     * @returns {Note[]} Notes with the specified tag (most recent first)
     */
    getNotesByTag(tag) {
        return this.notes.filter(n => n.tags.includes(tag)).sort((a, b) => {
            const dateA = new Date(a.modifiedAt);
            const dateB = new Date(b.modifiedAt);
            return dateB - dateA;
        });
    }

    /**
     * Get all unique tags with usage counts
     * @returns {TagInfo[]} Array of tags with counts (sorted by count descending)
     */
    getAllTags() {
        const tagMap = new Map();

        // Count occurrences of each tag
        this.notes.forEach(note => {
            note.tags.forEach(tag => {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            });
        });

        // Convert to array and sort by count (descending)
        return Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Add a new note
     * @param {NoteData} noteData - Note data
     * @returns {Note} The newly created note
     */
    addNote(noteData) {
        const note = new Note(noteData);
        this.notes.unshift(note); // Add to beginning
        this.saveToStorage();
        Logger.debug('NotesDataManager: Added note', note.id);
        return note;
    }

    /**
     * Update an existing note
     * @param {string} noteId - Note identifier
     * @param {Partial<NoteData>} updates - Fields to update
     * @returns {Note|null} Updated note or null if not found
     */
    updateNote(noteId, updates) {
        const noteIndex = this.notes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            this.notes[noteIndex] = new Note({
                ...this.notes[noteIndex],
                ...updates,
                modifiedAt: new Date().toISOString()
            });
            this.saveToStorage();
            Logger.debug('NotesDataManager: Updated note', noteId);
            return this.notes[noteIndex];
        }
        return null;
    }

    /**
     * Delete a note
     * @param {string} noteId - Note identifier
     * @returns {boolean} True if note was deleted
     */
    deleteNote(noteId) {
        const initialLength = this.notes.length;
        this.notes = this.notes.filter(n => n.id !== noteId);

        if (this.notes.length < initialLength) {
            this.saveToStorage();
            Logger.debug('NotesDataManager: Deleted note', noteId);
            return true;
        }
        return false;
    }

    /**
     * Get notes statistics
     * @returns {NotesStats} Statistics about notes
     */
    getStats() {
        return {
            totalNotes: this.notes.length,
            totalTags: this.getAllTags().length,
            recentNotes: this.notes.filter(n => {
                const noteDate = new Date(n.modifiedAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return noteDate >= weekAgo;
            }).length
        };
    }
}

// Export to global scope
window.NotesDataManager = NotesDataManager;
window.Note = Note;

Logger.debug('notes.js loaded');
