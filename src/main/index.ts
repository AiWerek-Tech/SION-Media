import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { rmSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as xlsx from 'xlsx'
import {
  initDatabase,
  getHymnals,
  addHymnal,
  updateHymnal,
  deleteHymnal,
  getSongs,
  addSong,
  updateSong,
  deleteSong,
  getSongRelations,
  addSongRelation,
  deleteSongRelation,
  getPlaylists,
  addPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistItems,
  addPlaylistItem,
  updatePlaylistItem,
  deletePlaylistItem,
  reorderPlaylistItems,
  getSettings,
  updateSetting,
  searchSongs,
  toggleFavorite,
  logSongHistory,
  getRecentSongs,
  createBackup,
  restoreBackup,
  saveSessionState,
  markCleanExit,
  getRecoveryState,
  reseedDatabase
} from './database'

let mainWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null
let stageDisplayWindow: BrowserWindow | null = null
let latestSlideData: unknown = null
let latestProjectionState = 'CLEAR'
let latestProjectionTheme: unknown = null

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

function mergeProjectionTheme(theme: unknown): unknown {
  if (
    latestProjectionTheme &&
    typeof latestProjectionTheme === 'object' &&
    theme &&
    typeof theme === 'object'
  ) {
    return { ...latestProjectionTheme, ...theme }
  }
  return theme
}

function sendProjectionSnapshot(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  window.webContents.send('projection:state-change', latestProjectionState)
  if (latestSlideData) window.webContents.send('projection:slide-update', latestSlideData)
  if (latestProjectionTheme)
    window.webContents.send('projection:theme-update', latestProjectionTheme)
}

function createMainWindow(): void {
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

function createProjectionWindow(): void {
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

function createStageDisplayWindow(): void {
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

function setupIPC(): void {
  // Window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

  // Performance monitoring
  ipcMain.handle('system:get-memory', async () => {
    const mem = await process.getProcessMemoryInfo?.()
    return mem ? { private: mem.private, shared: mem.shared } : null
  })

  // Projection control
  ipcMain.on('projection:slide-update', (_event, slideData) => {
    latestSlideData = slideData
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:slide-update', slideData)
    }
    if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
      stageDisplayWindow.webContents.send('projection:slide-update', slideData)
    }
  })

  ipcMain.on('projection:state-change', (_event, state) => {
    latestProjectionState = state
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:state-change', state)
    }
    if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
      stageDisplayWindow.webContents.send('projection:state-change', state)
    }
  })

  ipcMain.on('projection:theme-update', (_event, theme) => {
    latestProjectionTheme = mergeProjectionTheme(theme)
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:theme-update', theme)
    }
    if (stageDisplayWindow && !stageDisplayWindow.isDestroyed()) {
      stageDisplayWindow.webContents.send('projection:theme-update', theme)
    }
  })

  ipcMain.on('projection:show', () => {
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.show()
      projectionWindow.setFullScreen(true)
    }
  })

  ipcMain.on('projection:hide', () => {
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.hide()
    }
  })

  // Stage Display controls
  ipcMain.on('stage:show', () => {
    if (!stageDisplayWindow) createStageDisplayWindow()
    stageDisplayWindow?.show()
    sendProjectionSnapshot(stageDisplayWindow)
  })

  ipcMain.on('stage:hide', () => {
    stageDisplayWindow?.hide()
  })

  // Display info
  ipcMain.handle('display:get-all', () => {
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: d.label,
      width: d.bounds.width,
      height: d.bounds.height,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }))
  })

  ipcMain.handle('display:is-projection-visible', () => {
    return projectionWindow ? projectionWindow.isVisible() : false
  })

  // Database operations — Hymnals
  ipcMain.handle('db:get-hymnals', () => getHymnals())
  ipcMain.handle('db:add-hymnal', (_e, hymnal) => addHymnal(hymnal))
  ipcMain.handle('db:update-hymnal', (_e, id, hymnal) => updateHymnal(id, hymnal))
  ipcMain.handle('db:delete-hymnal', (_e, id) => deleteHymnal(id))

  // Database operations — Songs
  ipcMain.handle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))
  ipcMain.handle('db:search-songs', (_e, query, hymnalId?) => searchSongs(query, hymnalId))
  ipcMain.handle('db:add-song', (_e, song) => addSong(song))
  ipcMain.handle('db:update-song', (_e, id, song) => updateSong(id, song))
  ipcMain.handle('db:delete-song', (_e, id) => deleteSong(id))
  ipcMain.handle('db:toggle-favorite', (_e, id) => toggleFavorite(id))

  // Song Relations
  ipcMain.handle('db:get-song-relations', (_e, songId) => getSongRelations(songId))
  ipcMain.handle('db:add-song-relation', (_e, relation) => addSongRelation(relation))
  ipcMain.handle('db:delete-song-relation', (_e, id) => deleteSongRelation(id))

  ipcMain.handle('db:get-playlists', () => getPlaylists())
  ipcMain.handle('db:add-playlist', (_e, playlist) => addPlaylist(playlist))
  ipcMain.handle('db:update-playlist', (_e, id, playlist) => updatePlaylist(id, playlist))
  ipcMain.handle('db:delete-playlist', (_e, id) => deletePlaylist(id))
  ipcMain.handle('db:get-playlist-items', (_e, playlistId) => getPlaylistItems(playlistId))
  ipcMain.handle('db:add-playlist-item', (_e, item) => addPlaylistItem(item))
  ipcMain.handle('db:update-playlist-item', (_e, id, data) => updatePlaylistItem(id, data))
  ipcMain.handle('db:delete-playlist-item', (_e, id) => deletePlaylistItem(id))
  ipcMain.handle('db:reorder-playlist-items', (_e, items) => reorderPlaylistItems(items))

  ipcMain.handle('db:get-settings', () => getSettings())
  ipcMain.handle('db:update-setting', (_e, key, value) => updateSetting(key, value))

  // History operations
  ipcMain.handle('db:log-history', (_e, songId) => logSongHistory(songId))
  ipcMain.handle('db:get-recent-songs', (_e, limit) => getRecentSongs(limit))

  // Backup & Restore
  ipcMain.handle('db:create-backup', (_e, customPath) => createBackup(customPath))
  ipcMain.handle('db:restore-backup', (_e, backupPath) => restoreBackup(backupPath))

  // Crash Recovery
  ipcMain.handle('db:save-session', (_e, state) => saveSessionState(state))
  ipcMain.handle('db:get-recovery-state', () => getRecoveryState())
  ipcMain.handle('db:mark-clean-exit', () => markCleanExit())
  ipcMain.handle('db:reseed', () => reseedDatabase())

  // File parsing
  ipcMain.handle('file:parse-excel', (_e, filePath) => {
    try {
      const workbook = xlsx.readFile(filePath)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = xlsx.utils.sheet_to_json(worksheet) as Record<string, string | number>[]

      // Map Excel columns to Song object properties
      // Expected columns: Nomor, Judul, Lirik, Kategori, Bahasa, Penulis, Nada Dasar, Tempo, Tags
      return jsonData.map((row) => ({
        hymnal_id: row['hymnal_id'] || 0,
        number: (row['Nomor'] || row['number'] || '').toString(),
        title: (row['Judul'] || row['title'] || '').toString(),
        lyrics_raw: (row['Lirik'] || row['lyrics_raw'] || '').toString(),
        category: (row['Kategori'] || row['category'] || '').toString(),
        language: (row['Bahasa'] || row['language'] || 'Indonesia').toString(),
        author: (row['Penulis'] || row['author'] || '').toString(),
        composer: (row['Komposer'] || row['composer'] || '').toString(),
        key_note: (row['Nada Dasar'] || row['key_note'] || '').toString(),
        tempo: (row['Tempo'] || row['tempo'] || '').toString(),
        tags: (row['Tags'] || row['tags'] || '').toString()
      }))
    } catch (error) {
      console.error('Excel parse error:', error)
      throw error
    }
  })

  // Display change monitoring
  screen.on('display-added', () => {
    mainWindow?.webContents.send('display:changed', screen.getAllDisplays().length)
  })
  screen.on('display-removed', () => {
    mainWindow?.webContents.send('display:changed', screen.getAllDisplays().length)
    // Auto-recovery: move projection to remaining display
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      const displays = screen.getAllDisplays()
      const target =
        displays.find((d) => d.id !== screen.getPrimaryDisplay().id) || screen.getPrimaryDisplay()
      projectionWindow.setBounds(target.bounds)
    }
  })
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
