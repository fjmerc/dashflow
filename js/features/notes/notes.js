/**
 * Notes Data Manager
 * Handles data models and localStorage persistence for the quick notes system
 */

/**
 * Note Data Model
 */
class Note {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.title = data.title || '';
        this.content = data.content || '';
        this.tags = data.tags || [];
        this.createdAt = data.createdAt || new Date().toISOString();
        this.modifiedAt = data.modifiedAt || this.createdAt;
    }

    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Convert to plain object for storage
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
     * Get all notes (sorted by modified date, most recent first)
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
     */
    getNoteById(noteId) {
        return this.notes.find(n => n.id === noteId);
    }

    /**
     * Search notes by query (searches title, content, and tags)
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
     */
    getNotesByTag(tag) {
        return this.notes.filter(n => n.tags.includes(tag)).sort((a, b) => {
            const dateA = new Date(a.modifiedAt);
            const dateB = new Date(b.modifiedAt);
            return dateB - dateA;
        });
    }

    /**
     * Get all unique tags with counts
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
     * Add note
     */
    addNote(noteData) {
        const note = new Note(noteData);
        this.notes.unshift(note); // Add to beginning
        this.saveToStorage();
        Logger.debug('NotesDataManager: Added note', note.id);
        return note;
    }

    /**
     * Update note
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
     * Delete note
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
