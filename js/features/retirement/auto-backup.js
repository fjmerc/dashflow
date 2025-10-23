/**
 * Automatic Backup Scheduling System
 *
 * Provides configurable automatic backups of dashboard data
 */

class AutoBackupManager {
    constructor() {
        this.settings = this.loadBackupSettings();
        this.intervalId = null;
        this.init();
    }

    init() {
        this.setupAutoBackup();
        this.setupBackupReminders();
        Logger.debug('Auto backup manager initialized');
    }

    loadBackupSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('autoBackupSettings') || '{}');
            return {
                enabled: settings.enabled || false,
                frequency: settings.frequency || 'daily', // daily, weekly, monthly
                lastBackup: settings.lastBackup || null,
                maxBackups: settings.maxBackups || 10,
                backupLocation: settings.backupLocation || 'downloads',
                reminderEnabled: settings.reminderEnabled !== false,
                reminderFrequency: settings.reminderFrequency || 'weekly'
            };
        } catch (e) {
            Logger.error('Error loading backup settings:', e);
            return {
                enabled: false,
                frequency: 'daily',
                lastBackup: null,
                maxBackups: 10,
                backupLocation: 'downloads',
                reminderEnabled: true,
                reminderFrequency: 'weekly'
            };
        }
    }

    saveBackupSettings() {
        try {
            localStorage.setItem('autoBackupSettings', JSON.stringify(this.settings));
        } catch (e) {
            Logger.error('Error saving backup settings:', e);
        }
    }

    setupAutoBackup() {
        // Clear existing interval
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        if (!this.settings.enabled) {
            return;
        }

        // Set up interval based on frequency
        const intervals = {
            'hourly': 60 * 60 * 1000,
            'daily': 24 * 60 * 60 * 1000,
            'weekly': 7 * 24 * 60 * 60 * 1000,
            'monthly': 30 * 24 * 60 * 60 * 1000
        };

        const interval = intervals[this.settings.frequency] || intervals.daily;

        this.intervalId = setInterval(() => {
            this.performAutoBackup();
        }, interval);

        // Check if backup is due now
        this.checkBackupDue();
    }

    checkBackupDue() {
        if (!this.settings.enabled) return;

        const now = new Date();
        const lastBackup = this.settings.lastBackup ? new Date(this.settings.lastBackup) : null;

        if (!lastBackup) {
            // First backup
            this.performAutoBackup();
            return;
        }

        const timeSinceLastBackup = now - lastBackup;
        const intervals = {
            'hourly': 60 * 60 * 1000,
            'daily': 24 * 60 * 60 * 1000,
            'weekly': 7 * 24 * 60 * 60 * 1000,
            'monthly': 30 * 24 * 60 * 60 * 1000
        };

        const requiredInterval = intervals[this.settings.frequency] || intervals.daily;

        if (timeSinceLastBackup >= requiredInterval) {
            this.performAutoBackup();
        }
    }

    async performAutoBackup() {
        try {
            Logger.debug('Performing automatic backup');

            // Use existing exportAllData function
            if (typeof exportAllData === 'function') {
                await exportAllData(true); // Silent export

                this.settings.lastBackup = new Date().toISOString();
                this.saveBackupSettings();

                // Show subtle notification
                this.showBackupNotification('Automatic backup completed successfully');

                Logger.debug('Automatic backup completed');
            } else {
                Logger.error('exportAllData function not available');
            }
        } catch (e) {
            Logger.error('Automatic backup failed:', e);
            this.showBackupNotification('Automatic backup failed - please check your storage', 'error');
        }
    }

    setupBackupReminders() {
        if (!this.settings.reminderEnabled) return;

        // Check for backup reminders on app load
        this.checkBackupReminder();

        // Set up periodic reminder checks
        setInterval(() => {
            this.checkBackupReminder();
        }, 60 * 60 * 1000); // Check every hour
    }

    checkBackupReminder() {
        if (!this.settings.reminderEnabled) return;

        const now = new Date();
        const lastReminder = localStorage.getItem('lastBackupReminder');
        const lastReminderDate = lastReminder ? new Date(lastReminder) : null;

        // Don't show reminder more than once per day
        if (lastReminderDate && (now - lastReminderDate) < 24 * 60 * 60 * 1000) {
            return;
        }

        const lastBackup = this.settings.lastBackup ? new Date(this.settings.lastBackup) : null;
        const timeSinceLastBackup = lastBackup ? (now - lastBackup) : Infinity;

        const reminderIntervals = {
            'daily': 2 * 24 * 60 * 60 * 1000, // Remind after 2 days
            'weekly': 10 * 24 * 60 * 60 * 1000, // Remind after 10 days
            'monthly': 40 * 24 * 60 * 60 * 1000 // Remind after 40 days
        };

        const reminderThreshold = reminderIntervals[this.settings.reminderFrequency] || reminderIntervals.weekly;

        if (timeSinceLastBackup >= reminderThreshold) {
            this.showBackupReminder();
            localStorage.setItem('lastBackupReminder', now.toISOString());
        }
    }

    showBackupReminder() {
        if (typeof showModal === 'function') {
            showModal(
                'Backup Reminder',
                'It\'s been a while since your last backup. Would you like to create a backup now to protect your data?',
                () => {
                    // Yes - create backup
                    this.performAutoBackup();
                },
                () => {
                    // No - do nothing
                }
            );
        }
    }

    showBackupNotification(message, type = 'success') {
        // Create a subtle toast notification
        const notification = document.createElement('div');
        notification.className = `backup-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showBackupSettings() {
        const settingsModal = document.createElement('div');
        settingsModal.className = 'modal backup-settings-modal';
        settingsModal.style.display = 'block';
        settingsModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <div class="header-content">
                        <div class="header-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <h3>Backup Settings</h3>
                            <p class="header-subtitle">Protect your data with automatic backups</p>
                        </div>
                    </div>
                    <span class="close" aria-label="Close">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="backupSettingsForm">
                        <!-- Backup Status Card -->
                        <div class="status-card">
                            <div class="status-header">
                                <i class="fas fa-info-circle"></i>
                                <span>Current Status</span>
                            </div>
                            <div class="status-content">
                                <div class="status-item">
                                    <span class="status-label">Last backup:</span>
                                    <span class="status-value">${this.settings.lastBackup ? new Date(this.settings.lastBackup).toLocaleString() : 'Never'}</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Auto-backup:</span>
                                    <span class="status-badge ${this.settings.enabled ? 'status-active' : 'status-inactive'}">
                                        <i class="fas fa-${this.settings.enabled ? 'check-circle' : 'times-circle'}"></i>
                                        ${this.settings.enabled ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Settings Sections -->
                        <div class="settings-section">
                            <div class="section-header">
                                <i class="fas fa-cog"></i>
                                <span>Automatic Backup</span>
                            </div>
                            <div class="setting-item">
                                <div class="setting-content">
                                    <label class="setting-label">
                                        <span class="label-text">Enable automatic backups</span>
                                        <span class="label-desc">Automatically save your data at regular intervals</span>
                                    </label>
                                </div>
                                <div class="setting-control">
                                    <label class="switch">
                                        <input type="checkbox" id="enableAutoBackup" ${this.settings.enabled ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="setting-item ${!this.settings.enabled ? 'disabled' : ''}">
                                <div class="setting-content">
                                    <label for="backupFrequency" class="setting-label">
                                        <span class="label-text">Backup frequency</span>
                                        <span class="label-desc">How often to create automatic backups</span>
                                    </label>
                                </div>
                                <div class="setting-control">
                                    <select id="backupFrequency" ${!this.settings.enabled ? 'disabled' : ''}>
                                        <option value="hourly" ${this.settings.frequency === 'hourly' ? 'selected' : ''}>Every hour</option>
                                        <option value="daily" ${this.settings.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                                        <option value="weekly" ${this.settings.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                        <option value="monthly" ${this.settings.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="settings-section">
                            <div class="section-header">
                                <i class="fas fa-bell"></i>
                                <span>Reminders</span>
                            </div>
                            <div class="setting-item">
                                <div class="setting-content">
                                    <label class="setting-label">
                                        <span class="label-text">Show backup reminders</span>
                                        <span class="label-desc">Get notified when it's time to backup</span>
                                    </label>
                                </div>
                                <div class="setting-control">
                                    <label class="switch">
                                        <input type="checkbox" id="enableReminders" ${this.settings.reminderEnabled ? 'checked' : ''}>
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="setting-item ${!this.settings.reminderEnabled ? 'disabled' : ''}">
                                <div class="setting-content">
                                    <label for="reminderFrequency" class="setting-label">
                                        <span class="label-text">Reminder frequency</span>
                                        <span class="label-desc">How often to show backup reminders</span>
                                    </label>
                                </div>
                                <div class="setting-control">
                                    <select id="reminderFrequency" ${!this.settings.reminderEnabled ? 'disabled' : ''}>
                                        <option value="daily" ${this.settings.reminderFrequency === 'daily' ? 'selected' : ''}>Daily check</option>
                                        <option value="weekly" ${this.settings.reminderFrequency === 'weekly' ? 'selected' : ''}>Weekly check</option>
                                        <option value="monthly" ${this.settings.reminderFrequency === 'monthly' ? 'selected' : ''}>Monthly check</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" id="testBackup" class="modal-btn secondary">
                        <i class="fas fa-play"></i>
                        Test Backup Now
                    </button>
                    <button type="button" id="saveBackupSettings" class="modal-btn primary">
                        <i class="fas fa-save"></i>
                        Save Settings
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = settingsModal.querySelector('.close');
        const enableCheckbox = settingsModal.querySelector('#enableAutoBackup');
        const frequencySelect = settingsModal.querySelector('#backupFrequency');
        const remindersCheckbox = settingsModal.querySelector('#enableReminders');
        const reminderFrequencySelect = settingsModal.querySelector('#reminderFrequency');
        const testBackupBtn = settingsModal.querySelector('#testBackup');
        const saveBtn = settingsModal.querySelector('#saveBackupSettings');

        closeBtn.addEventListener('click', () => {
            document.body.removeChild(settingsModal);
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                document.body.removeChild(settingsModal);
            }
        });

        // Enable/disable controls based on checkboxes
        enableCheckbox.addEventListener('change', () => {
            frequencySelect.disabled = !enableCheckbox.checked;
            const frequencyItem = frequencySelect.closest('.setting-item');
            if (enableCheckbox.checked) {
                frequencyItem.classList.remove('disabled');
            } else {
                frequencyItem.classList.add('disabled');
            }
        });

        remindersCheckbox.addEventListener('change', () => {
            reminderFrequencySelect.disabled = !remindersCheckbox.checked;
            const reminderItem = reminderFrequencySelect.closest('.setting-item');
            if (remindersCheckbox.checked) {
                reminderItem.classList.remove('disabled');
            } else {
                reminderItem.classList.add('disabled');
            }
        });

        testBackupBtn.addEventListener('click', () => {
            this.performAutoBackup();
        });

        saveBtn.addEventListener('click', () => {
            // Save settings
            this.settings.enabled = enableCheckbox.checked;
            this.settings.frequency = frequencySelect.value;
            this.settings.reminderEnabled = remindersCheckbox.checked;
            this.settings.reminderFrequency = reminderFrequencySelect.value;

            this.saveBackupSettings();
            this.setupAutoBackup(); // Restart with new settings
            this.setupBackupReminders();

            this.showBackupNotification('Backup settings saved successfully');
            document.body.removeChild(settingsModal);
        });

        document.body.appendChild(settingsModal);
    }

    // Method to be called from external code
    enableAutoBackup(frequency = 'daily') {
        this.settings.enabled = true;
        this.settings.frequency = frequency;
        this.saveBackupSettings();
        this.setupAutoBackup();
        Logger.debug('Auto backup enabled with frequency:', frequency);
    }

    disableAutoBackup() {
        this.settings.enabled = false;
        this.saveBackupSettings();
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        Logger.debug('Auto backup disabled');
    }

    // Cleanup method
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}

// Create global instance
window.autoBackupManager = new AutoBackupManager();

// Expose settings function globally
window.showBackupSettings = () => {
    window.autoBackupManager.showBackupSettings();
};