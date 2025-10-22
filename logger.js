/**
 * Configurable Logger for Dashboard App
 *
 * Provides different log levels that can be controlled via configuration
 * In production, set LOG_LEVEL to 'error' or 'none' to reduce output
 */

// Log levels: none = 0, error = 1, warn = 2, info = 3, debug = 4
const LOG_LEVELS = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
};

// Set log level - change this to control what gets logged
// In production, set to LOG_LEVELS.ERROR or LOG_LEVELS.NONE
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

// Logger class
class Logger {
    static log(level, message, ...args) {
        if (level <= CURRENT_LOG_LEVEL) {
            switch (level) {
                case LOG_LEVELS.ERROR:
                    console.error(message, ...args);
                    break;
                case LOG_LEVELS.WARN:
                    console.warn(message, ...args);
                    break;
                case LOG_LEVELS.INFO:
                    console.info(message, ...args);
                    break;
                case LOG_LEVELS.DEBUG:
                    console.log(message, ...args);
                    break;
            }
        }
    }

    static error(message, ...args) {
        this.log(LOG_LEVELS.ERROR, message, ...args);
    }

    static warn(message, ...args) {
        this.log(LOG_LEVELS.WARN, message, ...args);
    }

    static info(message, ...args) {
        this.log(LOG_LEVELS.INFO, message, ...args);
    }

    static debug(message, ...args) {
        this.log(LOG_LEVELS.DEBUG, message, ...args);
    }
}

// Export for use in other modules
window.Logger = Logger;
window.LOG_LEVELS = LOG_LEVELS;