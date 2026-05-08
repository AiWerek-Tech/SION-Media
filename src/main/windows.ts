/**
 * Windows Management Module
 * Handles creation and lifecycle of all application windows
 */

import { BrowserWindow, shell, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getLatestProjectionTheme, mergeProjectionTheme } from './theme-manager'

// Window references
let mainWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null
let stageDisplayWindow: BrowserWindow | null = null

// Projection state tracking
let latestSlideData: unknown = null
let latestProjectionState = 'CLEAR'

/**
 * Send current projection state snapshot to a window
 */
export function sendProjectionSnapshot(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  window.webContents.send('projection:state-change', latestProjectionState)
  if (latestSlideData) window.webContents.send('projection:slide-update', latestSlideData)
  const theme = getLatestProjectionTheme()
  if (theme) window.webContents.send('projection:theme-update', theme)
}

/**
 * Get the main window reference
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * Get the projection window reference
 */
export function getProjectionWindow(): BrowserWindow | null {
  return projectionWindow
}

/**
 * Get the stage display window reference
 */
export function getStageDisplayWindow(): BrowserWindow | null {
  return stageDisplayWindow
}

/**
 * Update projection state and broadcast to windows
 */
export function updateProjectionState(state: string): void {
  latestProjectionState = state
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.webContents.send('projection:state-change', state)
  }
  if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
    stageDisplayWindow.webContents.send('projection:state-change', state)
  }
}

/**
 * Update slide data and broadcast to windows
 */
export function updateSlideData(slideData: unknown): void {
  latestSlideData = slideData
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.webContents.send('projection:slide-update', slideData)
  }
  if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
    stageDisplayWindow.webContents.send('projection:slide-update', slideData)
  }
}

/**
 * Update theme and broadcast to windows
 */
export function updateTheme(theme: unknown): void {
  mergeProjectionTheme(theme)
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.webContents.send('projection:theme-update', theme)
  }
  if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
    stageDisplayWindow.webContents.send('projection:theme-update', theme)
  }
}

/**
 * Create the main application window
 */
export function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    autoHideMenuBar: true,
    title: 'SION Media',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Notify renderer on maximize state changes
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.close()
    }
    if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
      stageDisplayWindow.close()
    }
  })
}

/**
 * Create the projection window for external display
 */
export function createProjectionWindow(): void {
  const displays = screen.getAllDisplays()
  const externalDisplay = displays.find((d) => d.id !== screen.getPrimaryDisplay().id)
  const targetDisplay = externalDisplay || screen.getPrimaryDisplay()

  projectionWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    projectionWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/projection.html')
  } else {
    projectionWindow.loadFile(join(__dirname, '../renderer/projection.html'))
  }

  projectionWindow.on('ready-to-show', () => {
    // Don't auto-show; controlled by operator
  })

  projectionWindow.webContents.once('did-finish-load', () => {
    sendProjectionSnapshot(projectionWindow)
  })

  projectionWindow.on('closed', () => {
    projectionWindow = null
  })
}

/**
 * Create the stage display window for musicians
 */
export function createStageDisplayWindow(): void {
  const displays = screen.getAllDisplays()
  // Try to find a third monitor, otherwise fallback to primary
  const stageDisplay = displays.length > 2 ? displays[2] : screen.getPrimaryDisplay()

  stageDisplayWindow = new BrowserWindow({
    x: stageDisplay.bounds.x,
    y: stageDisplay.bounds.y,
    width: stageDisplay.bounds.width,
    height: stageDisplay.bounds.height,
    fullscreen: false, // Start windowed for musisi/singer to move if needed
    frame: true,
    title: 'SION Stage Display',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    stageDisplayWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/stageDisplay.html')
  } else {
    stageDisplayWindow.loadFile(join(__dirname, '../renderer/stageDisplay.html'))
  }

  stageDisplayWindow.on('closed', () => {
    stageDisplayWindow = null
  })

  stageDisplayWindow.webContents.once('did-finish-load', () => {
    sendProjectionSnapshot(stageDisplayWindow)
  })
}

/**
 * Show the projection window
 */
export function showProjectionWindow(): void {
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.show()
    projectionWindow.setFullScreen(true)
  }
}

/**
 * Hide the projection window
 */
export function hideProjectionWindow(): void {
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.hide()
  }
}

/**
 * Show the stage display window
 */
export function showStageDisplayWindow(): void {
  if (!stageDisplayWindow) createStageDisplayWindow()
  stageDisplayWindow?.show()
  sendProjectionSnapshot(stageDisplayWindow)
}

/**
 * Hide the stage display window
 */
export function hideStageDisplayWindow(): void {
  stageDisplayWindow?.hide()
}

/**
 * Check if projection window is visible
 */
export function isProjectionVisible(): boolean {
  return projectionWindow ? projectionWindow.isVisible() : false
}
