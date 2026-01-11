// Settings Page - Desktop Todo Widget
class SettingsPage {
    constructor() {
        this.settings = {
            opacity: 80,
            theme: 'dark',
            alwaysOnTop: true,
            startWithSystem: false,
            minimizeToTray: false
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.applyTheme();
    }
    
    async loadSettings() {
        try {
            this.settings.opacity = await window.electronAPI.getStoreValue('opacity', 80);
            this.settings.theme = await window.electronAPI.getStoreValue('theme', 'dark');
            this.settings.alwaysOnTop = await window.electronAPI.getStoreValue('alwaysOnTop', true);
            this.settings.startWithSystem = await window.electronAPI.getStoreValue('startWithSystem', false);
            this.settings.minimizeToTray = await window.electronAPI.getStoreValue('minimizeToTray', false);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            await window.electronAPI.setStoreValue('opacity', this.settings.opacity);
            await window.electronAPI.setStoreValue('theme', this.settings.theme);
            await window.electronAPI.setStoreValue('alwaysOnTop', this.settings.alwaysOnTop);
            await window.electronAPI.setStoreValue('startWithSystem', this.settings.startWithSystem);
            await window.electronAPI.setStoreValue('minimizeToTray', this.settings.minimizeToTray);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.electronAPI.navigateToMain();
        });
        
        // Opacity setting
        const opacitySlider = document.getElementById('opacitySlider');
        opacitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            this.settings.opacity = parseInt(value);
            this.updateOpacityDisplay();
            this.applyOpacity();
        });
        
        opacitySlider.addEventListener('change', () => {
            this.saveSettings();
            // Notify main window about opacity change
            window.electronAPI.notifyOpacityChange(this.settings.opacity);
        });
        
        // Behavior settings
        document.getElementById('alwaysOnTopToggle').addEventListener('change', (e) => {
            this.settings.alwaysOnTop = e.target.checked;
            this.saveSettings();
            window.electronAPI.setAlwaysOnTop(e.target.checked);
        });
        
        document.getElementById('startWithSystemToggle').addEventListener('change', (e) => {
            this.settings.startWithSystem = e.target.checked;
            this.saveSettings();
            window.electronAPI.setStartWithSystem(e.target.checked);
        });
        
        document.getElementById('minimizeToTrayToggle').addEventListener('change', (e) => {
            this.settings.minimizeToTray = e.target.checked;
            this.saveSettings();
            window.electronAPI.setMinimizeToTray(e.target.checked);
        });
        
        // Clear data
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                this.clearAllData();
            }
        });
    }
    
    updateUI() {
        this.updateOpacityDisplay();
        this.updateToggleSwitches();
        this.applyOpacity();
    }
    
    updateOpacityDisplay() {
        document.getElementById('opacityValue').textContent = `${this.settings.opacity}%`;
        document.getElementById('opacitySlider').value = this.settings.opacity;
    }
    
    updateToggleSwitches() {
        document.getElementById('alwaysOnTopToggle').checked = this.settings.alwaysOnTop;
        document.getElementById('startWithSystemToggle').checked = this.settings.startWithSystem;
        document.getElementById('minimizeToTrayToggle').checked = this.settings.minimizeToTray;
    }
    
    applyOpacity() {
        const app = document.getElementById('app');
        const opacity = this.settings.opacity / 100;
        
        if (this.settings.theme === 'light') {
            app.style.background = `rgba(255, 255, 255, ${opacity * 0.9})`;
        } else {
            app.style.background = `rgba(0, 0, 0, ${opacity * 0.9})`;
        }
    }
    
    applyTheme() {
        const html = document.documentElement;
        const app = document.getElementById('app');
        
        if (this.settings.theme === 'dark') {
            html.classList.add('dark');
            app.classList.remove('glass-light');
            app.classList.add('glass-dark');
        } else {
            html.classList.remove('dark');
            app.classList.remove('glass-dark');
            app.classList.add('glass-light');
        }
    }
    
    async clearAllData() {
        try {
            await window.electronAPI.clearAllData();
            alert('All data has been cleared. The app will now restart.');
            window.electronAPI.restartApp();
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Failed to clear data. Please try again.');
        }
    }
}

// Initialize the settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsPage = new SettingsPage();
});