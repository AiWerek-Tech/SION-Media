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

import { app, BrowserWindow, protocol } from 'electron'
import { join, extname } from 'path'
import { existsSync, statSync, createReadStream } from 'fs'
import { Readable } from 'stream'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, markCleanExit } from './database'
import { setupIPC } from './ipc-handlers'
import { setupIPCHealth } from './ipc-health'
import { createMainWindow, createProjectionWindow } from './windows'
import { setupDisplayMonitor } from './display-monitor'
import { checkSafeMode, markStableStartup, isSafeMode } from './safe-mode'
import { ensureContentPackDirectories } from './services/content-packs/contentPackPaths'
import { closeAllBibleConnections } from './services/bible/bibleExternalSqliteRepository'
import { resolveLocalMediaPath } from './local-media-url'
import { parseSingleByteRange } from './media-security'
import { stopObsSrtOutput } from './obs-srt-output'
import { startObsSrtIngestIfConfigured, stopObsSrtIngest } from './obs-srt-ingest'

// MIME type lookup for media files
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/x-m4a'
}

// Register local-media protocol as privileged to allow loading local files and support streaming videos
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      standard: true,
      stream: true,
      secure: true,
      corsEnabled: true,
      supportFetchAPI: true
    }
  }
])

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

app.whenReady().then(() => {
  protocol.handle('local-media', (request) => {
    try {
      const filePath = resolveLocalMediaPath(request.url)

      if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        console.warn('[Protocol] File not found:', filePath)
        return new Response('Not Found', { status: 404 })
      }

      const stat = statSync(filePath)
      const fileSize = stat.size
      const ext = extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'

      // Handle Range requests (required for video streaming/seeking)
      const rangeHeader = request.headers.get('range')
      if (rangeHeader) {
        const range = parseSingleByteRange(rangeHeader, fileSize)
        if (!range) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` }
          })
        }
        const { start, end } = range
        const chunkSize = end - start + 1

        const stream = createReadStream(filePath, { start, end })
        const webStream = Readable.toWeb(stream) as ReadableStream

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': String(chunkSize),
            'Accept-Ranges': 'bytes'
          }
        })
      }

      // Full file response (for images and initial probes)
      const stream = createReadStream(filePath)
      const webStream = Readable.toWeb(stream) as ReadableStream
      return new Response(webStream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch (e) {
      console.error('[Protocol] Failed to serve local media:', e)
      return new Response('Internal Server Error', { status: 500 })
    }
  })

  electronApp.setAppUserModelId('com.aiwerek.sion-media')

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

  // Setup IPC handlers
  setupIPC()
  setupIPCHealth()

  // Setup display change monitoring
  setupDisplayMonitor()

  void startObsSrtIngestIfConfigured().catch((error) => {
    console.error('[OBS Live Input] Auto-start failed:', error)
  })

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
  void stopObsSrtOutput()
  void stopObsSrtIngest()
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
