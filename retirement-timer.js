/**
 * Retirement Countdown Timer
 * 
 * A configurable timer that counts down to a target retirement date.
 * Features:
 * - Enable/disable functionality
 * - Configurable retirement date
 * - Visual countdown display (years, months, days, hours, minutes, seconds)
 * - Persistent storage in localStorage
 * - Customizable display format
 */

class RetirementTimer {
    constructor() {
        // Initialize state from localStorage or use defaults
        this.loadState();
        
        // DOM elements (will be set in init)
        this.timerElement = null;
        this.settingsBtn = null;
        this.toggleBtn = null;
        this.timerContainer = null;
        
        // Interval for countdown
        this.countdownInterval = null;
        
        // Bind methods
        this.toggleTimer = this.toggleTimer.bind(this);
        this.showSettings = this.showSettings.bind(this);
        this.saveSettings = this.saveSettings.bind(this);
        this.updateCountdown = this.updateCountdown.bind(this);
    }
    
    /**
     * Load timer state from localStorage
     */
    loadState() {
        try {
            const timerState = JSON.parse(localStorage.getItem('retirementTimer')) || {};
            
            this.enabled = timerState.enabled === true;
            
            // Default to a date 10 years from now if not set
            const defaultDate = new Date();
            defaultDate.setFullYear(defaultDate.getFullYear() + 10);
            
            this.targetDate = timerState.targetDate ? new Date(timerState.targetDate) : defaultDate;
            
            // Validate the target date is in the future
            if (this.targetDate <= new Date()) {
                this.targetDate = defaultDate;
            }
            
            // Display format options
            this.showYears = timerState.showYears !== false;
            this.showMonths = timerState.showMonths !== false;
            this.showDays = timerState.showDays !== false;
            this.showHours = timerState.showHours !== false;
            this.showMinutes = timerState.showMinutes !== false;
            this.showSeconds = timerState.showSeconds !== false;
            
            Logger.debug('Retirement timer state loaded:', {
                enabled: this.enabled,
                targetDate: this.targetDate,
                displayOptions: {
                    years: this.showYears,
                    months: this.showMonths,
                    days: this.showDays,
                    hours: this.showHours,
                    minutes: this.showMinutes,
                    seconds: this.showSeconds
                }
            });
        } catch (e) {
            Logger.error('Error loading retirement timer state:', e);
            // Set defaults
            this.enabled = false;
            
            const defaultDate = new Date();
            defaultDate.setFullYear(defaultDate.getFullYear() + 10);
            this.targetDate = defaultDate;
            
            this.showYears = true;
            this.showMonths = true;
            this.showDays = true;
            this.showHours = true;
            this.showMinutes = true;
            this.showSeconds = true;
            
            // Save the default state
            this.saveState();
        }
    }
    
    /**
     * Save timer state to localStorage
     */
    saveState() {
        try {
            const timerState = {
                enabled: this.enabled,
                targetDate: this.targetDate.toISOString(),
                showYears: this.showYears,
                showMonths: this.showMonths,
                showDays: this.showDays,
                showHours: this.showHours,
                showMinutes: this.showMinutes,
                showSeconds: this.showSeconds
            };
            
            localStorage.setItem('retirementTimer', JSON.stringify(timerState));
            Logger.debug('Retirement timer state saved');
        } catch (e) {
            Logger.error('Error saving retirement timer state:', e);
        }
    }
    
    /**
     * Initialize the timer with DOM elements
     */
    init() {
        // Initialize DOM elements
        this.timerContainer = document.getElementById('retirementTimerContainer');
        this.timerElement = document.getElementById('retirementTimer');
        this.settingsBtn = document.getElementById('retirementSettingsBtn');
        this.toggleBtn = document.getElementById('retirementToggleBtn');
        
        if (!this.timerContainer || !this.timerElement || !this.settingsBtn || !this.toggleBtn) {
            Logger.error('Required retirement timer elements not found in DOM');
            return;
        }
        
        // Set up event listeners
        this.toggleBtn.addEventListener('click', this.toggleTimer);
        this.settingsBtn.addEventListener('click', this.showSettings);
        
        // Update UI based on state
        this.updateUI();
        
        // Start countdown if enabled
        if (this.enabled) {
            this.startCountdown();
        }
    }
    
    /**
     * Toggle timer enabled/disabled state
     */
    toggleTimer() {
        this.enabled = !this.enabled;
        this.saveState();
        this.updateUI();
        
        if (this.enabled) {
            this.startCountdown();
        } else {
            this.stopCountdown();
        }
    }
    
    /**
     * Update UI based on current state
     */
    updateUI() {
        // Update toggle button icon and title
        if (this.enabled) {
            this.toggleBtn.innerHTML = '<i class="fas fa-toggle-on"></i>';
            this.toggleBtn.title = 'Disable Retirement Timer';
            this.timerContainer.classList.remove('disabled');
            this.updateCountdown();
        } else {
            this.toggleBtn.innerHTML = '<i class="fas fa-toggle-off"></i>';
            this.toggleBtn.title = 'Enable Retirement Timer';
            this.timerContainer.classList.add('disabled');
            this.timerElement.textContent = 'Timer disabled';
        }
    }
    
    /**
     * Start the countdown interval
     */
    startCountdown() {
        // Clear any existing interval
        this.stopCountdown();
        
        // Update immediately
        this.updateCountdown();
        
        // Set interval for regular updates (update every second if seconds are shown, otherwise every minute)
        const intervalTime = this.showSeconds ? 1000 : 60000;
        this.countdownInterval = setInterval(this.updateCountdown, intervalTime);
    }
    
    /**
     * Stop the countdown interval
     */
    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    /**
     * Update the countdown display
     */
    updateCountdown() {
        if (!this.enabled) return;
        
        const now = new Date();
        const retirement = new Date(this.targetDate);
        
        // If retirement date is in the past, show message
        if (retirement <= now) {
            this.timerElement.textContent = 'Congratulations! You\'ve reached your retirement date!';
            this.timerElement.classList.add('complete');
            this.stopCountdown();
            return;
        }
        
        // Calculate time difference
        let timeDiff = Math.abs(retirement - now) / 1000; // in seconds
        
        // Calculate different units
        const secondsInMinute = 60;
        const secondsInHour = 60 * 60;
        const secondsInDay = 24 * 60 * 60;
        const secondsInMonth = 30 * secondsInDay; // Approximation
        const secondsInYear = 365 * secondsInDay; // Approximation
        
        // Calculate each time unit
        const years = Math.floor(timeDiff / secondsInYear);
        timeDiff -= years * secondsInYear;
        
        const months = Math.floor(timeDiff / secondsInMonth);
        timeDiff -= months * secondsInMonth;
        
        const days = Math.floor(timeDiff / secondsInDay);
        timeDiff -= days * secondsInDay;
        
        const hours = Math.floor(timeDiff / secondsInHour);
        timeDiff -= hours * secondsInHour;
        
        const minutes = Math.floor(timeDiff / secondsInMinute);
        timeDiff -= minutes * secondsInMinute;
        
        const seconds = Math.floor(timeDiff);
        
        // Build the display string based on settings
        let displayParts = [];
        
        if (this.showYears && years > 0) {
            displayParts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
        }
        
        if (this.showMonths && (months > 0 || displayParts.length > 0)) {
            displayParts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
        }
        
        if (this.showDays && (days > 0 || displayParts.length > 0)) {
            displayParts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
        }
        
        if (this.showHours && (hours > 0 || displayParts.length > 0)) {
            displayParts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
        }
        
        if (this.showMinutes && (minutes > 0 || displayParts.length > 0)) {
            displayParts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
        }
        
        if (this.showSeconds) {
            displayParts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
        }
        
        this.timerElement.textContent = displayParts.join(', ');
        this.timerElement.classList.remove('complete');
    }
    
    /**
     * Show settings modal for the timer
     */
    showSettings() {
        // Use the existing showModal function from the main app, but with minimal content
        window.showModal(
            'Retirement Timer Settings',
            'Loading settings form...',
            // Yes callback
            () => {
                this.saveSettings();
            },
            // No callback
            () => {
                // Do nothing
            }
        );
        
        // After modal is shown, replace its content with our form
        setTimeout(() => this.buildSettingsForm(), 50);
    }
    
    /**
     * Build the settings form in the modal
     */
    buildSettingsForm() {
        // Format date for input
        const year = this.targetDate.getFullYear();
        const month = String(this.targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(this.targetDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        const modalMessage = document.getElementById('modalMessage');
        if (!modalMessage) return;
        
        // Clear existing content
        modalMessage.innerHTML = '';
        
        // Create form element
        const form = document.createElement('form');
        form.id = 'retirementSettingsForm';
        
        // Create date input group
        const dateGroup = document.createElement('div');
        dateGroup.className = 'form-group';
        
        const dateLabel = document.createElement('label');
        dateLabel.htmlFor = 'retirementDate';
        dateLabel.textContent = 'Retirement Date:';
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'retirementDate';
        dateInput.value = formattedDate;
        dateInput.required = true;
        
        dateGroup.appendChild(dateLabel);
        dateGroup.appendChild(dateInput);
        form.appendChild(dateGroup);
        
        // Create display options group
        const optionsGroup = document.createElement('div');
        optionsGroup.className = 'form-group';
        
        const optionsLabel = document.createElement('label');
        optionsLabel.textContent = 'Display Options:';
        optionsGroup.appendChild(optionsLabel);
        
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        
        // Create checkbox options
        const options = [
            { id: 'showYears', label: 'Show Years', checked: this.showYears },
            { id: 'showMonths', label: 'Show Months', checked: this.showMonths },
            { id: 'showDays', label: 'Show Days', checked: this.showDays },
            { id: 'showHours', label: 'Show Hours', checked: this.showHours },
            { id: 'showMinutes', label: 'Show Minutes', checked: this.showMinutes },
            { id: 'showSeconds', label: 'Show Seconds', checked: this.showSeconds }
        ];
        
        options.forEach(option => {
            const wrapper = document.createElement('label');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = option.id;
            checkbox.checked = option.checked;
            
            wrapper.appendChild(checkbox);
            wrapper.appendChild(document.createTextNode(' ' + option.label));
            
            checkboxGroup.appendChild(wrapper);
        });
        
        optionsGroup.appendChild(checkboxGroup);
        form.appendChild(optionsGroup);
        
        // Add the form to the modal
        modalMessage.appendChild(form);
    }
    
    /**
     * Save settings from the modal
     */
    saveSettings() {
        const dateInput = document.getElementById('retirementDate');
        const showYearsInput = document.getElementById('showYears');
        const showMonthsInput = document.getElementById('showMonths');
        const showDaysInput = document.getElementById('showDays');
        const showHoursInput = document.getElementById('showHours');
        const showMinutesInput = document.getElementById('showMinutes');
        const showSecondsInput = document.getElementById('showSeconds');
        
        if (!dateInput) {
            Logger.error('Retirement date input not found');
            return;
        }
        
        // Parse the date input
        const newDate = new Date(dateInput.value);
        
        // Validate date
        if (isNaN(newDate.getTime())) {
            alert('Please enter a valid retirement date');
            return;
        }
        
        // Update settings
        this.targetDate = newDate;
        this.showYears = showYearsInput ? showYearsInput.checked : true;
        this.showMonths = showMonthsInput ? showMonthsInput.checked : true;
        this.showDays = showDaysInput ? showDaysInput.checked : true;
        this.showHours = showHoursInput ? showHoursInput.checked : true;
        this.showMinutes = showMinutesInput ? showMinutesInput.checked : true;
        this.showSeconds = showSecondsInput ? showSecondsInput.checked : true;
        
        // Validate that at least one unit is shown
        if (!this.showYears && !this.showMonths && !this.showDays && !this.showHours && !this.showMinutes && !this.showSeconds) {
            alert('Please enable at least one display option');
            this.showSettings();
            return;
        }
        
        // Save state and update UI
        this.saveState();
        this.updateCountdown();
        
        // Restart countdown with new settings if enabled
        if (this.enabled) {
            this.startCountdown();
        }
    }
}

// Global instance
const retirementTimer = new RetirementTimer();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    retirementTimer.init();
        
        // Add logic to position the timer container properly
        const timerContainer = document.getElementById('retirementTimerContainer');
        if (timerContainer && timerContainer.style.display === 'block') {
            // Ensure the container's position in the DOM is correct for proper section styling
            const linkList = document.getElementById('linkList');
            if (linkList) {
                // Move the timer container to be before the first regular section if it exists
                const firstSection = linkList.querySelector('.section');
                if (firstSection) {
                    linkList.insertBefore(timerContainer, firstSection);
                } else {
                    // If no sections exist, just append it to the link list
                    linkList.appendChild(timerContainer);
                }
            }
        }
    });
