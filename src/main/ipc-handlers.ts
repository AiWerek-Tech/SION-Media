/**
 * IPC Handlers Module
 * Centralizes all IPC communication between renderer and main process
 */

import { ipcMain } from 'electron'
import * as xlsx from 'xlsx'
import {
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
  reseedDatabase,
  checkMultiHymnalIntegrity,
  // Bible operations
  getBibleTranslations,
  addBibleTranslation,
  deleteBibleTranslation,
  getBibleBooks,
  addBibleBook,
  getBibleVerses,
  getBibleVerseRange,
  addBibleVerse,
  addBibleVersesBatch,
  searchBibleVerses,
  // Custom Slides operations
  getCustomSlides,
  getSlidesByType,
  addCustomSlide,
  updateCustomSlide,
  deleteCustomSlide,
  getSlideGroups,
  addSlideGroup,
  updateSlideGroup,
  deleteSlideGroup,
  getGroupSlides,
  addSlideToGroup,
  removeSlideFromGroup,
  reorderGroupSlides
} from './database'
import {
  getMainWindow,
  getProjectionWindow,
  createProjectionWindow,
  showProjectionWindow,
  hideProjectionWindow,
  showStageDisplayWindow,
  hideStageDisplayWindow,
  isProjectionVisible,
  updateSlideData,
  updateProjectionState,
  updateTheme
} from './windows'
import { getAllDisplays } from './display-monitor'

/**
 * Setup all IPC handlers
 */
export function setupIPC(): void {
  // Window controls
  ipcMain.on('window:minimize', () => getMainWindow()?.minimize())
  ipcMain.on('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:close', () => getMainWindow()?.close())
  ipcMain.handle('window:is-maximized', () => getMainWindow()?.isMaximized() ?? false)

  // Performance monitoring
  ipcMain.handle('system:get-memory', async () => {
    const mem = await process.getProcessMemoryInfo?.()
    return mem ? { private: mem.private, shared: mem.shared } : null
  })

  // Mode change handler
  ipcMain.handle('system:set-mode', async (_event, mode: string) => {
    if (mode === 'LIBRARY' || mode === 'MANAGEMENT') {
      // Hide or destroy projection window to save memory
      const projectionWindow = getProjectionWindow()
      if (projectionWindow && !projectionWindow.isDestroyed()) {
        projectionWindow.hide()
      }
    } else if (mode === 'PROJECTION' || mode === 'BROADCAST') {
      // Re-initialize or show projection window if needed
      if (!getProjectionWindow() || getProjectionWindow()?.isDestroyed()) {
        createProjectionWindow()
      }
    }
  })

  // Projection control
  ipcMain.on('projection:slide-update', (_event, slideData) => {
    updateSlideData(slideData)
  })

  ipcMain.on('projection:state-change', (_event, state) => {
    updateProjectionState(state)
  })

  ipcMain.on('projection:theme-update', (_event, theme) => {
    updateTheme(theme)
  })

  ipcMain.on('projection:show', () => {
    showProjectionWindow()
  })

  ipcMain.on('projection:hide', () => {
    hideProjectionWindow()
  })

  // Stage Display controls
  ipcMain.on('stage:show', () => {
    showStageDisplayWindow()
  })

  ipcMain.on('stage:hide', () => {
    hideStageDisplayWindow()
  })

  // Display info
  ipcMain.handle('display_get-all', () => getAllDisplays())

  ipcMain.handle('display:is-projection-visible', () => isProjectionVisible())

  // Database operations — Hymnals
  ipcMain.handle('db:get-hymnals', () => getHymnals())
  ipcMain.handle('db:add-hymnal', (_e, hymnal) => addHymnal(hymnal))
  ipcMain.handle('db:update-hymnal', (_e, id, hymnal) => updateHymnal(id, hymnal))
  ipcMain.handle('db:delete-hymnal', (_e, id) => deleteHymnal(id))

  // Database operations — Songs
  ipcMain.handle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))
  ipcMain.handle('db:search-songs', (_e, query, hymnalId?, options?) =>
    searchSongs(query, hymnalId, options)
  )
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

  // Database / Backup / Crash Recovery
  ipcMain.handle('db:create-backup', (_e, customPath) => createBackup(customPath))
  ipcMain.handle('db:restore-backup', (_e, backupPath) => restoreBackup(backupPath))
  ipcMain.handle('db:save-session', (_e, state) => saveSessionState(state))
  ipcMain.handle('db:get-recovery-state', () => getRecoveryState())
  ipcMain.handle('db:mark-clean-exit', () => markCleanExit())
  ipcMain.handle('db:reseed', () => reseedDatabase())
  ipcMain.handle('db:check-multi-hymnal-integrity', (_e, hymnalId?) =>
    checkMultiHymnalIntegrity(hymnalId)
  )

  // ========== Bible IPC Handlers ==========
  ipcMain.handle('db:get-bible-translations', () => getBibleTranslations())
  ipcMain.handle('db:add-bible-translation', (_e, translation) => addBibleTranslation(translation))
  ipcMain.handle('db:delete-bible-translation', (_e, id) => deleteBibleTranslation(id))
  ipcMain.handle('db:get-bible-books', (_e, translationId) => getBibleBooks(translationId))
  ipcMain.handle('db:add-bible-book', (_e, book) => addBibleBook(book))
  ipcMain.handle('db:get-bible-verses', (_e, translationId, bookId, chapter) =>
    getBibleVerses(translationId, bookId, chapter)
  )
  ipcMain.handle('db:get-bible-verse-range', (_e, translationId, bookId, chapter, start, end) =>
    getBibleVerseRange(translationId, bookId, chapter, start, end)
  )
  ipcMain.handle('db:add-bible-verse', (_e, verse) => addBibleVerse(verse))
  ipcMain.handle('db:add-bible-verses-batch', (_e, verses) => addBibleVersesBatch(verses))
  ipcMain.handle('db:search-bible-verses', (_e, query, translationId?) =>
    searchBibleVerses(query, translationId)
  )

  // Custom Slides operations
  ipcMain.handle('db:get-custom-slides', () => getCustomSlides())
  ipcMain.handle('db:get-slides-by-type', (_e, slideType) => getSlidesByType(slideType))
  ipcMain.handle('db:add-custom-slide', (_e, slide) => addCustomSlide(slide))
  ipcMain.handle('db:update-custom-slide', (_e, id, updates) => updateCustomSlide(id, updates))
  ipcMain.handle('db:delete-custom-slide', (_e, id) => deleteCustomSlide(id))
  ipcMain.handle('db:get-slide-groups', () => getSlideGroups())
  ipcMain.handle('db:add-slide-group', (_e, group) => addSlideGroup(group))
  ipcMain.handle('db:update-slide-group', (_e, id, updates) => updateSlideGroup(id, updates))
  ipcMain.handle('db:delete-slide-group', (_e, id) => deleteSlideGroup(id))
  ipcMain.handle('db:get-group-slides', (_e, groupId) => getGroupSlides(groupId))
  ipcMain.handle('db:add-slide-to-group', (_e, groupId, slideId, sortOrder?) =>
    addSlideToGroup(groupId, slideId, sortOrder)
  )
  ipcMain.handle('db:remove-slide-from-group', (_e, groupId, slideId) =>
    removeSlideFromGroup(groupId, slideId)
  )
  ipcMain.handle('db:reorder-group-slides', (_e, groupId, items) =>
    reorderGroupSlides(groupId, items)
  )

  // File parsing (hardened for xlsx vulnerability mitigation)
  ipcMain.handle('file:parse-excel', async (_e, filePath: string) => {
    // Security constants
    const MAX_FILE_SIZE_MB = 10
    const MAX_ROWS = 5000
    const MAX_COLS = 50
    const PARSE_TIMEOUT_MS = 30000
    const ALLOWED_EXTENSIONS = ['.xlsx']

    try {
      // 1. Validate file extension
      const ext = filePath.toLowerCase().slice(filePath.lastIndexOf('.'))
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(
          `File type not allowed. Only ${ALLOWED_EXTENSIONS.join(', ')} are supported.`
        )
      }

      // 2. Validate file size
      const { statSync } = await import('fs')
      const stats = statSync(filePath)
      const fileSizeMB = stats.size / (1024 * 1024)
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
      }

      // 3. Parse with timeout wrapper
      const parseWithTimeout = <T>(fn: () => T): Promise<T> => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Parse timeout')), PARSE_TIMEOUT_MS)
          try {
            const result = fn()
            clearTimeout(timeout)
            resolve(result)
          } catch (err) {
            clearTimeout(timeout)
            reject(err)
          }
        })
      }

      // Read with safety options: no formula evaluation, no dense mode
      const workbook = await parseWithTimeout(() =>
        xlsx.readFile(filePath, {
          type: 'buffer',
          cellFormula: false,
          cellHTML: false,
          cellNF: false,
          cellStyles: false,
          sheetStubs: false
        })
      )

      // 4. Limit to first sheet only
      if (workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in the Excel file.')
      }
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // 5. Check worksheet dimensions and enforce limits
      const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1')
      const rowCount = range.e.r - range.s.r + 1
      const colCount = range.e.c - range.s.c + 1

      if (rowCount > MAX_ROWS) {
        throw new Error(`Too many rows. Maximum is ${MAX_ROWS} rows.`)
      }
      if (colCount > MAX_COLS) {
        throw new Error(`Too many columns. Maximum is ${MAX_COLS} columns.`)
      }

      // 6. Convert to JSON with defval to avoid undefined issues
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false
      }) as Record<string, string | number>[]

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
}
