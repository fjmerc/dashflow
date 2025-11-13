/**
 * Lightweight Event Bus for Component Communication
 * Enables publish-subscribe pattern to decouple components
 *
 * @example
 * // Subscribe to events
 * eventBus.on('task:created', (data) => {
 *     console.log('New task:', data.task);
 * });
 *
 * // Emit events
 * eventBus.emit('task:created', { task: newTask });
 *
 * // One-time subscription
 * eventBus.once('app:ready', () => {
 *     console.log('App initialized');
 * });
 */

/**
 * @typedef {Object} EventListener
 * @property {string} event - Event name
 * @property {Function} callback - Event handler function
 */

class EventBus {
    constructor() {
        /** @type {Map<string, Function[]>} */
        this.listeners = new Map();

        /** @type {boolean} */
        this.debug = false;

        Logger.debug('EventBus initialized');
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'task:created', 'project:updated')
     * @param {Function} callback - Event handler function
     * @returns {Function} Unsubscribe function
     * @example
     * const unsubscribe = eventBus.on('task:created', handleTaskCreated);
     * // Later: unsubscribe();
     */
    on(event, callback) {
        if (typeof event !== 'string') {
            Logger.error('EventBus: Event name must be a string');
            return () => {};
        }

        if (typeof callback !== 'function') {
            Logger.error('EventBus: Callback must be a function');
            return () => {};
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event).push(callback);

        if (this.debug) {
            Logger.debug(`EventBus: Subscribed to '${event}' (${this.listeners.get(event).length} listeners)`);
        }

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler to remove
     */
    off(event, callback) {
        if (!this.listeners.has(event)) {
            return;
        }

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
            callbacks.splice(index, 1);

            if (this.debug) {
                Logger.debug(`EventBus: Unsubscribed from '${event}' (${callbacks.length} listeners remaining)`);
            }

            // Clean up empty listener arrays
            if (callbacks.length === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} [data] - Event payload
     * @example
     * eventBus.emit('task:updated', { taskId: '123', field: 'completed' });
     */
    emit(event, data) {
        if (!this.listeners.has(event)) {
            if (this.debug) {
                Logger.debug(`EventBus: No listeners for '${event}'`);
            }
            return;
        }

        const callbacks = this.listeners.get(event);

        if (this.debug) {
            Logger.debug(`EventBus: Emitting '${event}' to ${callbacks.length} listeners`, data);
        }

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                Logger.error(`EventBus: Error in '${event}' handler:`, error);

                // Report to global error handler if available
                if (window.errorHandler) {
                    window.errorHandler.handleError(error, 'event-bus', {
                        event,
                        data
                    });
                }
            }
        });
    }

    /**
     * Subscribe to an event (one-time only)
     * Automatically unsubscribes after first emission
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @returns {Function} Unsubscribe function
     * @example
     * eventBus.once('app:ready', () => {
     *     console.log('App is ready!');
     * });
     */
    once(event, callback) {
        const unsubscribe = this.on(event, (data) => {
            unsubscribe();
            callback(data);
        });

        return unsubscribe;
    }

    /**
     * Remove all listeners for a specific event
     * @param {string} event - Event name
     */
    clear(event) {
        if (this.listeners.has(event)) {
            this.listeners.delete(event);

            if (this.debug) {
                Logger.debug(`EventBus: Cleared all listeners for '${event}'`);
            }
        }
    }

    /**
     * Remove all event listeners
     */
    clearAll() {
        const eventCount = this.listeners.size;
        this.listeners.clear();

        Logger.debug(`EventBus: Cleared all listeners (${eventCount} events)`);
    }

    /**
     * Get list of all registered events
     * @returns {string[]} Array of event names
     */
    getEvents() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Get number of listeners for an event
     * @param {string} event - Event name
     * @returns {number} Listener count
     */
    getListenerCount(event) {
        return this.listeners.has(event) ? this.listeners.get(event).length : 0;
    }

    /**
     * Enable debug logging
     */
    enableDebug() {
        this.debug = true;
        Logger.info('EventBus: Debug logging enabled');
    }

    /**
     * Disable debug logging
     */
    disableDebug() {
        this.debug = false;
        Logger.info('EventBus: Debug logging disabled');
    }
}

// Create global singleton instance
window.eventBus = new EventBus();

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}

Logger.debug('event-bus.js loaded');
