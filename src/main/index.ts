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
import { checkSafeMode, markStableStartup, isSafeMode } from './safe-mode'
import { ensureContentPackDirectories } from './services/content-packs/contentPackPaths'
import { closeAllBibleConnections } from './services/bible/bibleExternalSqliteRepository'

process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection:', reason)
})

process.on('exit', (code) => {
  console.info('[main] process exit cleanly', { code })
})

app.on('before-quit', () => {
  console.info('[main] preparing to quit')
})

app.on('will-quit', () => {
  console.info('[main] application will quit')
})

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
  electronApp.setAppUserModelId('com.aiwerek.sion-media')
  clearDevChromiumCache()

  // Phase 4: Safe-mode crash-loop detection
  const safeMode = checkSafeMode()
  if (safeMode) {
    console.warn('[main] ⚠️ Safe mode active — projection window disabled')
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  initDatabase()

  // Ensure content pack directories exist
  ensureContentPackDirectories()

  // Note: Auto-backup feature is tracked under issue #SION-104 for future release

  // Setup IPC handlers
  setupIPC()
  setupIPCHealth()

  // Setup display change monitoring
  setupDisplayMonitor()

  // Create hidden main shell
  createMainWindow()
  if (!isSafeMode()) {
    createProjectionWindow()
  }

  // Phase 4: Mark stable startup after 10s of no crashes
  setTimeout(() => {
    markStableStartup()
  }, 10_000)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
      if (!isSafeMode()) {
        createProjectionWindow()
      }
    }
  })
})

app.on('window-all-closed', () => {
  // Close all external Bible SQLite connections
  try {
    closeAllBibleConnections()
  } catch (error) {
    console.error('Error closing Bible connections:', error)
  }
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
