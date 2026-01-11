const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  getStoreValue: (key, defaultValue) => ipcRenderer.invoke('get-store-value', key, defaultValue),
  setStoreValue: (key, value) => ipcRenderer.invoke('set-store-value', key, value),
  
  // Window controls
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  
  // Navigation
  navigateToSettings: () => ipcRenderer.invoke('navigate-to-settings'),
  navigateToMain: () => ipcRenderer.invoke('navigate-to-main'),
  
  // Settings
  setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', value),
  setStartWithSystem: (value) => ipcRenderer.invoke('set-start-with-system', value),
  setMinimizeToTray: (value) => ipcRenderer.invoke('set-minimize-to-tray', value),
  
  // Data management
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Notifications
  onOpacityUpdated: (callback) => ipcRenderer.on('opacity-updated', callback),
  onThemeUpdated: (callback) => ipcRenderer.on('theme-updated', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  notifyOpacityChange: (opacity) => ipcRenderer.invoke('notify-opacity-change', opacity),
  notifyThemeChange: (theme) => ipcRenderer.invoke('notify-theme-change', theme),
  
  // Platform info
  platform: process.platform
});
