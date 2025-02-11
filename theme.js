// Shared theme management system
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.primaryColor = localStorage.getItem('primaryColor') || '#4f46e5';
        
        // Initialize theme and colors when created
        this.applyTheme();
        this.applyColors();
        
        // Listen for storage events to sync themes across pages
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
                this.currentTheme = e.newValue;
                this.applyTheme();
            } else if (e.key === 'primaryColor') {
                this.primaryColor = e.newValue;
                this.applyColors();
            }
        });
    }

    applyTheme() {
        document.documentElement.dataset.theme = this.currentTheme;
        const darkModeBtn = document.getElementById('darkModeBtn');
        if (darkModeBtn) {
            darkModeBtn.innerHTML = `<i class="fas fa-${this.currentTheme === 'dark' ? 'sun' : 'moon'}"></i>`;
            darkModeBtn.title = `Toggle ${this.currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`;
        }
    }

    applyColors() {
        document.documentElement.style.setProperty('--primary-color', this.primaryColor);
        document.documentElement.style.setProperty('--primary-hover', this.adjustColor(this.primaryColor, -10));
    }

    syncThemeSettings() {
        // Sync all theme settings from localStorage
        this.currentTheme = localStorage.getItem('theme') || this.currentTheme;
        this.primaryColor = localStorage.getItem('primaryColor') || this.primaryColor;
        this.applyTheme();
        this.applyColors();
    }

    toggleDarkMode() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', this.currentTheme);
        this.syncThemeSettings();
    }

    changeThemeColor() {
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this.primaryColor;
        
        colorPicker.addEventListener('change', (e) => {
            this.primaryColor = e.target.value;
            localStorage.setItem('primaryColor', this.primaryColor);
            this.syncThemeSettings();
        });
        
        colorPicker.click();
    }

    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

// Create and export a single instance to be shared across pages
const themeManager = new ThemeManager();
