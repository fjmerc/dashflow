/**
 * Tag Colors Manager
 * Manages custom colors for tags
 */

class TagColorsManager {
    constructor() {
        this.tagColors = new Map();
        this.init();
    }

    init() {
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('tagColors');
            if (data) {
                const parsed = JSON.parse(data);
                this.tagColors = new Map(Object.entries(parsed));
                Logger.debug('TagColorsManager: Loaded', this.tagColors.size, 'tag colors');
            }
        } catch (error) {
            Logger.error('TagColorsManager: Error loading from storage', error);
        }
    }

    saveToStorage() {
        try {
            const obj = Object.fromEntries(this.tagColors);
            localStorage.setItem('tagColors', JSON.stringify(obj));
            Logger.debug('TagColorsManager: Saved tag colors');
        } catch (error) {
            Logger.error('TagColorsManager: Error saving to storage', error);
        }
    }

    /**
     * Set color for a tag
     * @param {string} tag - The tag name
     * @param {string} color - Hex color code
     */
    setColor(tag, color) {
        this.tagColors.set(tag, color);
        this.saveToStorage();
    }

    /**
     * Get color for a tag
     * @param {string} tag - The tag name
     * @returns {string|null} - Hex color code or null
     */
    getColor(tag) {
        return this.tagColors.get(tag) || null;
    }

    /**
     * Remove color for a tag
     * @param {string} tag - The tag name
     */
    removeColor(tag) {
        this.tagColors.delete(tag);
        this.saveToStorage();
    }

    /**
     * Get all tag colors
     * @returns {Map} - Map of tag to color
     */
    getAllColors() {
        return new Map(this.tagColors);
    }

    /**
     * Generate a random color for a tag
     * @returns {string} - Hex color code
     */
    generateRandomColor() {
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
            '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
            '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
            '#ec4899', '#f43f5e'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Auto-assign color to a tag if it doesn't have one
     * @param {string} tag - The tag name
     * @returns {string} - The color (existing or newly assigned)
     */
    ensureColor(tag) {
        let color = this.getColor(tag);
        if (!color) {
            color = this.generateRandomColor();
            this.setColor(tag, color);
        }
        return color;
    }
}

// Export to global scope
window.TagColorsManager = TagColorsManager;

Logger.debug('tag-colors.js loaded');
