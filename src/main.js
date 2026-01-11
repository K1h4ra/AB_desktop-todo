const { app, BrowserWindow, Menu, Tray, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize store for settings
const store = new Store({
  defaults: {
    windowBounds: { width: 320, height: 480, x: 100, y: 100 },
    alwaysOnTop: true,
    theme: 'dark',
    opacity: 80,
    startWithSystem: false,
    minimizeToTray: false
  }
});

let mainWindow;
let settingsWindow;
let tray;
// Track if Windows+D listener is enabled
let windowsDListenerEnabled = true;

function createWindow() {
  // Get stored window bounds or use defaults
  const bounds = store.get('windowBounds');
  const alwaysOnTop = store.get('alwaysOnTop', true);
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 280,
    minHeight: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: alwaysOnTop,
    resizable: true,
    skipTaskbar: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Handle window events
  mainWindow.on('close', (event) => {
    // Save window bounds before closing
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
    
    // Core requirement: Clicking close button should make taskbar icon disappear but keep window visible
    event.preventDefault();
    // Hide from taskbar but keep window visible
    mainWindow.setSkipTaskbar(true);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Handle window minimize event
  mainWindow.on('minimize', (event) => {
    // Core requirement: Hide interface when actively minimizing
    event.preventDefault();
    mainWindow.hide();
  });
  
  // Hide from taskbar when window is hidden
  mainWindow.on('hide', () => {
    mainWindow.setSkipTaskbar(true);
    // Save current bounds before hiding
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
    
    // Prevent window from staying hidden after Windows+D, but only if listener is enabled
    if (windowsDListenerEnabled) {
      setTimeout(() => {
        if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
          // Get the saved bounds
          const savedBounds = store.get('windowBounds');
          // Restore the bounds before showing
          mainWindow.setBounds(savedBounds);
          mainWindow.show();
        }
      }, 100);
    }
  });
  
  // Show in taskbar when window is shown
  mainWindow.on('show', () => {
    mainWindow.setSkipTaskbar(false);
    // Re-enable Windows+D listener when window is shown
    windowsDListenerEnabled = true;
  });
  
  // Handle minimize event to prevent hiding on Windows+D
  mainWindow.on('minimize', (event) => {
    // When minimize button is clicked, disable Windows+D listener
    // This allows the window to stay minimized
    windowsDListenerEnabled = false;
    
    // Simplified logic: Allow window to minimize normally
    // Remove any preventDefault to ensure window can minimize
    // No conditionals - just let the window minimize as expected
  });

  // Make window draggable from anywhere
  mainWindow.setMovable(true);

  // Development tools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createSettingsWindow() {
  // Create the settings browser window
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 400,
    minHeight: 600,
    maxWidth: 400,
    maxHeight: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    resizable: false,
    skipTaskbar: false,
    titleBarStyle: 'hidden',
    modal: true,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the settings page
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));

  // Handle settings window events
  settingsWindow.on('close', (event) => {
    // Core requirement: Same behavior as main window
    // Clicking close button makes taskbar icon disappear but keeps window visible
    event.preventDefault();
    settingsWindow.setSkipTaskbar(true);
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  // Make window draggable from anywhere
  settingsWindow.setMovable(true);

  // Development tools
  if (process.argv.includes('--dev')) {
    settingsWindow.webContents.openDevTools();
  }
}

function createTray() {
  // Create a simple tray icon using a base64-encoded icon
  // For production, you would use a proper icon file
  const trayIconPath = path.join(__dirname, '../assets', 'tray-icon.png');
  
  // Check if the icon file exists, otherwise use a default
  try {
    // Try to create tray with the icon
    tray = new Tray(trayIconPath);
  } catch (error) {
    // If icon file doesn't exist, create a simple tray
    tray = new Tray(path.join(__dirname, '../assets', 'screenshot.png'));
  }
  
  // Create a context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Todo Widget',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        // Ensure proper quit functionality
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.destroy();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
        // Quit the app forcefully if needed
        app.exit();
      }
    }
  ]);
  
  // Set the tray tooltip
  tray.setToolTip('Desktop Todo Widget');
  
  // Set the context menu
  tray.setContextMenu(contextMenu);
  
  // Show the window when the tray icon is clicked
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
  
  // Set double click behavior
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createTray(); // Create system tray
  
  // Set up auto-start if enabled
  const startWithSystem = store.get('startWithSystem', false);
  app.setLoginItemSettings({
    openAtLogin: startWithSystem,
    openAsHidden: false,
    path: process.execPath,
    args: [app.getAppPath()]
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', (event) => {
  // Prevent the app from quitting when all windows are closed
  // This allows the app to continue running in the system tray
  event.preventDefault();
  
  // Only quit if explicitly requested by the user via tray menu
});

// IPC handlers
ipcMain.handle('get-store-value', (event, key, defaultValue) => {
  return store.get(key, defaultValue);
});

ipcMain.handle('set-store-value', (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle('toggle-always-on-top', () => {
  const current = mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(!current);
  store.set('alwaysOnTop', !current);
  return !current;
});

ipcMain.handle('minimize-window', () => {
  // For transparent windows, hide() works better than minimize()
  // Disable Windows+D listener first
  windowsDListenerEnabled = false;
  // Then hide the window completely
  mainWindow.hide();
});

ipcMain.handle('close-window', () => {
  mainWindow.close();
});

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workAreaSize;
});

// Navigation handlers
ipcMain.handle('navigate-to-settings', () => {
  if (!settingsWindow) {
    createSettingsWindow();
  }
  settingsWindow.show();
  settingsWindow.focus();
});

ipcMain.handle('navigate-to-main', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
  }
  mainWindow.show();
  mainWindow.focus();
});

// Settings handlers
ipcMain.handle('set-always-on-top', (event, value) => {
  mainWindow.setAlwaysOnTop(value);
});

ipcMain.handle('set-start-with-system', (event, value) => {
  app.setLoginItemSettings({
    openAtLogin: value,
    openAsHidden: false,
    path: process.execPath,
    args: [app.getAppPath()]
  });
});

ipcMain.handle('set-minimize-to-tray', (event, value) => {
  store.set('minimizeToTray', value);
});

ipcMain.handle('clear-all-data', () => {
  store.clear();
  // Reset to defaults
  store.set({
    windowBounds: { width: 320, height: 480, x: 100, y: 100 },
    alwaysOnTop: true,
    theme: 'dark',
    opacity: 80,
    startWithSystem: false,
    minimizeToTray: false
  });
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

// Notify main window about opacity changes
ipcMain.handle('notify-opacity-change', (event, opacity) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('opacity-updated', opacity);
  }
});

// Notify main window about theme changes
ipcMain.handle('notify-theme-change', (event, theme) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-updated', theme);
  }
});
