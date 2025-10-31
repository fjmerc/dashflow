/**
 * Pomodoro Timer
 * Manages focused work sessions with breaks
 */

// Session Type Constants
const SessionType = {
    WORK: 'work',
    SHORT_BREAK: 'short-break',
    LONG_BREAK: 'long-break'
};

// Default durations (in seconds)
const DEFAULT_DURATIONS = {
    work: 25 * 60,        // 25 minutes
    shortBreak: 5 * 60,   // 5 minutes
    longBreak: 15 * 60,   // 15 minutes
    pomodorosUntilLongBreak: 4
};

/**
 * Pomodoro Timer Class
 */
class PomodoroTimer {
    constructor() {
        this.state = {
            isRunning: false,
            isPaused: false,
            taskId: null,
            taskText: '',
            sessionType: SessionType.WORK,
            timeRemaining: DEFAULT_DURATIONS.work,
            pomodoroCount: 0,        // Current pomodoro in cycle (1-4)
            totalPomodoros: 0,       // Total completed today
            cycleCount: 0            // Number of complete cycles
        };

        this.durations = { ...DEFAULT_DURATIONS };
        this.interval = null;
        this.callbacks = {
            onTick: null,
            onSessionComplete: null,
            onPomodoroComplete: null
        };

        // Load saved state from localStorage
        this.loadState();
    }

    /**
     * Start a pomodoro for a specific task
     */
    start(taskId, taskText) {
        if (this.state.isRunning && !this.state.isPaused) {
            this.stop(); // Stop current timer if running
        }

        this.state.taskId = taskId;
        this.state.taskText = taskText;
        this.state.sessionType = SessionType.WORK;
        this.state.timeRemaining = this.durations.work;
        this.state.isRunning = true;
        this.state.isPaused = false;

        this.saveState();
        this.startInterval();
    }

    /**
     * Pause the current timer
     */
    pause() {
        if (!this.state.isRunning) return;

        this.state.isPaused = true;
        this.stopInterval();
        this.saveState();
    }

    /**
     * Resume the paused timer
     */
    resume() {
        if (!this.state.isRunning || !this.state.isPaused) return;

        this.state.isPaused = false;
        this.saveState();
        this.startInterval();
    }

    /**
     * Stop the timer completely
     */
    stop() {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.stopInterval();
        this.saveState();
    }

    /**
     * Skip to next session
     */
    skip() {
        if (!this.state.isRunning) return;

        this.handleSessionComplete();
    }

    /**
     * Start the countdown interval
     */
    startInterval() {
        this.stopInterval(); // Clear any existing interval

        this.interval = setInterval(() => {
            if (this.state.isPaused) return;

            this.state.timeRemaining--;

            if (this.callbacks.onTick) {
                this.callbacks.onTick(this.state);
            }

            if (this.state.timeRemaining <= 0) {
                this.handleSessionComplete();
            }

            this.saveState();
        }, 1000);
    }

    /**
     * Stop the countdown interval
     */
    stopInterval() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Handle session completion
     */
    handleSessionComplete() {
        const completedSession = this.state.sessionType;

        // If work session completed, increment pomodoro count
        if (completedSession === SessionType.WORK) {
            this.state.pomodoroCount++;
            this.state.totalPomodoros++;

            // Callback for pomodoro completion (update task count)
            if (this.callbacks.onPomodoroComplete) {
                this.callbacks.onPomodoroComplete(this.state.taskId);
            }
        }

        // Determine next session type
        if (completedSession === SessionType.WORK) {
            // Decide between short and long break
            if (this.state.pomodoroCount >= this.durations.pomodorosUntilLongBreak) {
                this.state.sessionType = SessionType.LONG_BREAK;
                this.state.timeRemaining = this.durations.longBreak;
                this.state.pomodoroCount = 0; // Reset cycle
                this.state.cycleCount++;
            } else {
                this.state.sessionType = SessionType.SHORT_BREAK;
                this.state.timeRemaining = this.durations.shortBreak;
            }
        } else {
            // Break completed, back to work
            this.state.sessionType = SessionType.WORK;
            this.state.timeRemaining = this.durations.work;
        }

        // Notify UI of session completion
        if (this.callbacks.onSessionComplete) {
            this.callbacks.onSessionComplete(completedSession, this.state.sessionType);
        }

        this.saveState();
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get session display name
     */
    getSessionName(sessionType) {
        switch (sessionType) {
            case SessionType.WORK:
                return 'Focus Time';
            case SessionType.SHORT_BREAK:
                return 'Short Break';
            case SessionType.LONG_BREAK:
                return 'Long Break';
            default:
                return 'Pomodoro';
        }
    }

    /**
     * Register callback functions
     */
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + event.charAt(0).toUpperCase() + event.slice(1))) {
            this.callbacks['on' + event.charAt(0).toUpperCase() + event.slice(1)] = callback;
        }
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        localStorage.setItem('pomodoroState', JSON.stringify({
            ...this.state,
            savedAt: new Date().toISOString()
        }));
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        const saved = localStorage.getItem('pomodoroState');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            const savedAt = new Date(data.savedAt);
            const now = new Date();

            // If saved more than 30 minutes ago, don't restore (session likely expired)
            if (now - savedAt > 30 * 60 * 1000) {
                return;
            }

            // Restore state
            this.state = {
                isRunning: data.isRunning || false,
                isPaused: data.isPaused || false,
                taskId: data.taskId || null,
                taskText: data.taskText || '',
                sessionType: data.sessionType || SessionType.WORK,
                timeRemaining: data.timeRemaining || this.durations.work,
                pomodoroCount: data.pomodoroCount || 0,
                totalPomodoros: data.totalPomodoros || 0,
                cycleCount: data.cycleCount || 0
            };

            // If it was running, restart the interval
            if (this.state.isRunning && !this.state.isPaused) {
                this.startInterval();
            }
        } catch (e) {
            console.error('Failed to load pomodoro state:', e);
        }
    }

    /**
     * Reset daily stats (call at midnight or on demand)
     */
    resetDailyStats() {
        this.state.totalPomodoros = 0;
        this.saveState();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PomodoroTimer, SessionType };
}
