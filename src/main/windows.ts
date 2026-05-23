/**
 * Windows Management Module
 * Handles creation and lifecycle of all application windows
 */

import { BrowserWindow, shell, screen, type Display } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getLatestProjectionTheme, mergeProjectionTheme } from './theme-manager'
import { getSettings } from './database'

type EffectiveTheme = 'dark' | 'light'
// Sandbox is desirable, but this app currently relies on preload behaviors that
// may not be compatible with sandboxed renderers in all environments.
// Opt-in via ELECTRON_ENABLE_SANDBOX=1.
const isSandboxEnabled = process.env['ELECTRON_ENABLE_SANDBOX'] === '1'

// Window references
let mainWindow: BrowserWindow | null = null
let splashWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null
let stageDisplayWindow: BrowserWindow | null = null

// Projection state tracking
let latestSlideData: unknown = null
let latestProjectionState = 'CLEAR'

function getProjectionWindowOptions(): {
  targetDisplay: Display
  fullscreen: boolean
} {
  const displays = screen.getAllDisplays()
  const settings = getSettings()
  const selectedDisplayId = Number(settings['projection_monitor_id'] || 0)
  const configuredDisplay = Number.isFinite(selectedDisplayId)
    ? displays.find((display) => display.id === selectedDisplayId)
    : undefined
  const externalDisplay = displays.find((display) => display.id !== screen.getPrimaryDisplay().id)
  return {
    targetDisplay: configuredDisplay || externalDisplay || screen.getPrimaryDisplay(),
    fullscreen: (settings['display_fullscreen'] ?? '1') === '1'
  }
}

export function repositionProjectionWindowFromSettings(): void {
  if (!projectionWindow || projectionWindow.isDestroyed()) return
  const { targetDisplay, fullscreen } = getProjectionWindowOptions()
  projectionWindow.setFullScreen(false)
  projectionWindow.setBounds(targetDisplay.bounds)
  projectionWindow.setFullScreen(fullscreen)
}

export function createNativeSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 400,
    resizable: false,
    frame: false,
    transparent: true,
    title: 'SION Media',
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: isSandboxEnabled,
      webSecurity: true,
      webviewTag: false
    }
  })

  const splashPath =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? `${process.env['ELECTRON_RENDERER_URL']}/splash.html`
      : join(__dirname, '../renderer/splash.html')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(splashPath)
  } else {
    splashWindow.loadFile(splashPath)
  }

  splashWindow.on('closed', () => {
    splashWindow = null
  })
}

export function closeNativeSplashWindow(): void {
  if (!splashWindow || splashWindow.isDestroyed()) return
  splashWindow.close()
  splashWindow = null
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }
  mainWindow.focus()
}

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

export function broadcastAppTheme(payload: { mode: string; effective: EffectiveTheme }): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app:theme-updated', payload)
  }
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    projectionWindow.webContents.send('app:theme-updated', payload)
  }
  if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
    stageDisplayWindow.webContents.send('app:theme-updated', payload)
  }
}

export function updateTitleBarOverlayForTheme(theme: EffectiveTheme): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (process.platform !== 'win32') return
  const overlay =
    theme === 'light'
      ? { color: '#f8fafc', symbolColor: '#0f172a', height: 40 }
      : { color: '#0b0f17', symbolColor: '#cbd5e1', height: 40 }
  try {
    mainWindow.setTitleBarOverlay(overlay)
  } catch {
    // ignore
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
    titleBarOverlay:
      process.platform === 'win32'
        ? {
            color: '#0b0f17',
            symbolColor: '#cbd5e1',
            height: 40
          }
        : false,
    autoHideMenuBar: true,
    title: 'SION Media',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: isSandboxEnabled,
      webviewTag: false
    }
  })

  if (is.dev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  if (is.dev) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      const lvl = level === 0 ? 'LOG' : level === 1 ? 'WARN' : level === 2 ? 'ERROR' : 'INFO'
      console.error('[renderer console]', { lvl, message, line, sourceId })
    })
  }

  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error('[mainWindow] did-fail-load', { errorCode, errorDescription, validatedURL })
  })

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[mainWindow] render-process-gone', details)
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

  // Block navigations away from the app shell.
  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
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
  const { targetDisplay, fullscreen } = getProjectionWindowOptions()

  projectionWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: isSandboxEnabled,
      webviewTag: false
    }
  })

  projectionWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  projectionWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
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
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: isSandboxEnabled,
      webviewTag: false
    }
  })

  stageDisplayWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  stageDisplayWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
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
  if (!projectionWindow || projectionWindow.isDestroyed()) {
    createProjectionWindow()
  }
  if (projectionWindow && !projectionWindow.isDestroyed()) {
    repositionProjectionWindowFromSettings()
    projectionWindow.show()
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
