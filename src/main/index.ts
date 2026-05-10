/**
 * SION Media - Main Process Entry Point
 *
 * This file serves as the orchestrator for all main process modules.
 * Specific functionality is delegated to dedicated modules:
 * - windows.ts: Window creation and lifecycle
 * - ipc-handlers.ts: IPC communication
 * - display-monitor.ts: Display change detection
 * - theme-manager.ts: Theme state management
 */

import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { rmSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, markCleanExit } from './database'
import { setupIPC } from './ipc-handlers'
import { setupIPCHealth } from './ipc-health'
import { createMainWindow, createProjectionWindow } from './windows'
import { setupDisplayMonitor } from './display-monitor'

if (is.dev) {
  app.commandLine.appendSwitch(
    'disk-cache-dir',
    join(app.getPath('temp'), `sion-media-dev-cache-${process.pid}`)
  )
  app.commandLine.appendSwitch('disable-http-cache')
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
  app.commandLine.appendSwitch('disk-cache-size', '1')
}

function clearDevChromiumCache(): void {
  if (!is.dev) return

  const userDataPath = app.getPath('userData')
  for (const cacheFolder of ['Cache', 'Code Cache', 'GPUCache']) {
    try {
      rmSync(join(userDataPath, cacheFolder), { recursive: true, force: true })
    } catch (error) {
      console.warn(`Unable to clear ${cacheFolder}:`, error)
    }
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sion.media')
  clearDevChromiumCache()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  initDatabase()

  // Setup IPC handlers
  setupIPC()
  setupIPCHealth()

  // Setup display change monitoring
  setupDisplayMonitor()

  // Create windows
  createMainWindow()
  createProjectionWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      createProjectionWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Mark clean exit for crash recovery
  try {
    markCleanExit()
  } catch (error) {
    console.error('Error marking clean exit:', error)
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
