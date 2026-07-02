/**
 * IPC Handlers Module
 * Centralizes all IPC communication between renderer and main process
 */

import { ipcMain, app, shell } from 'electron'
import { ZodError } from 'zod'
import { parseExcelFile } from './services/excel'
import { isSafeMode } from './safe-mode'
import { exportDebugReport } from './debug-report'
import { setupContentPackIPC } from './services/content-packs/contentPackIpcHandlers'
import { setupBiblePackIPC } from './services/bible/biblePackIpcHandlers'
import {
  getHymnals,
  addHymnal,
  updateHymnal,
  deleteHymnal,
  getSongs,
  addSong,
  updateSong,
  deleteSong,
  clearLyrics,
  bulkAssignSongBackground,
  getSongRelations,
  addSongRelation,
  deleteSongRelation,
  getMediaAssets,
  getMediaCollections,
  importMediaAssets,
  updateMediaAsset,
  deleteMediaAsset,
  incrementMediaAssetUsage,
  addMediaCollection,
  updateMediaCollection,
  deleteMediaCollection,
  addAssetsToMediaCollection,
  removeAssetsFromMediaCollection,
  reorderMediaCollectionItems,
  bulkUpdateMediaAssets,
  bulkDeleteMediaAssets,
  getPlaylists,
  addPlaylist,
  updatePlaylist,
  deletePlaylist,
  getPlaylistItems,
  addPlaylistItem,
  addBibleToPlaylist,
  addInfoToPlaylist,
  updatePlaylistItem,
  deletePlaylistItem,
  reorderPlaylistItems,
  getSettings,
  updateSetting,
  searchSongs,
  toggleFavorite,
  logSongHistory,
  getRecentSongs,
  importSongsFromJson,
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
  reorderGroupSlides,
  // Phase 1 — Enterprise Refactor functions
  getStorageStats,
  duplicateSong,
  getSongsSummary,
  getSongNote,
  updateSongNote,
  getBibleNote,
  updateBibleNote,
  getBibleNotesForChapter
} from './database'
import {
  getMainWindow,
  getProjectionWindow,
  showProjectionWindow,
  hideProjectionWindow,
  showStageDisplayWindow,
  hideStageDisplayWindow,
  getStageDisplayWindow,
  isProjectionVisible,
  updateSlideData,
  updateProjectionState,
  updateTheme,
  broadcastAppTheme,
  updateTitleBarOverlayForTheme,
  repositionProjectionWindowFromSettings,
  hasExternalDisplay
} from './windows'
import { getAllDisplays } from './display-monitor'
import { resolveModeChangeProjectionAction } from './mode-policy'
import { normalizeSafeExternalUrl } from './safe-external-url'
const RESEED_CONFIRM_TOKEN = 'RESEED_DATABASE'

function auditDestructiveAction(action: string, detail: Record<string, unknown>): void {
  console.warn(
    `[AUDIT][${new Date().toISOString()}] ${action} ${JSON.stringify(detail, (_key, value) => {
      if (typeof value === 'string' && value.length > 260) return `${value.slice(0, 260)}...`
      return value
    })}`
  )
}

function ensureObject(payload: unknown, message: string): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(message)
  }
  return payload as Record<string, unknown>
}

function ensureNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(message)
  return value.trim()
}

function toSafeIpcErrorMessage(channel: string, err: unknown): string {
  if (err instanceof ZodError) {
    const first = err.issues[0]?.message ?? 'Invalid payload'
    return `[${channel}] ${first}`
  }
  const raw = err instanceof Error ? err.message : 'Internal error'
  const cleaned = raw.replace(/\s+/g, ' ').trim().slice(0, 240)
  return `[${channel}] ${cleaned || 'Internal error'}`
}

function safeIpcHandle<TArgs extends unknown[], TResult>(
  channel: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs) => {
    try {
      return await handler(...args)
    } catch (err) {
      console.error(`[IPC] ${channel} failed:`, err)
      throw new Error(toSafeIpcErrorMessage(channel, err))
    }
  })
}

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

  // App version
  ipcMain.handle('app:get-version', () => app.getVersion())

  // Runtime mode
  ipcMain.handle('app:get-safe-mode', () => isSafeMode())

  // Performance monitoring
  ipcMain.handle('system:get-memory', async () => {
    const mem = await process.getProcessMemoryInfo?.()
    return mem ? { private: mem.private, shared: mem.shared } : null
  })

  // Open external links
  ipcMain.handle('system:open-external', async (_event, url: string) => {
    const safeUrl = normalizeSafeExternalUrl(url)
    if (!safeUrl) throw new Error('Invalid or unsafe external URL')
    return await shell.openExternal(safeUrl)
  })

  // App theme sync
  ipcMain.on(
    'app:theme-mode-set',
    (_event, payload: { mode: string; effective: 'dark' | 'light' }) => {
      updateTitleBarOverlayForTheme(payload.effective)
      broadcastAppTheme(payload)
    }
  )

  // Mode change handler
  ipcMain.handle('system:set-mode', async (_event, mode: string) => {
    // Workspace navigation must never affect the audience output. Visibility
    // remains exclusively controlled by projection:show / projection:hide.
    return resolveModeChangeProjectionAction(mode)
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

  ipcMain.on('projection:emergency', (_event, payload) => {
    const projectionWindow = getProjectionWindow()
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:emergency', payload)
    }
  })

  // Stage Display controls
  ipcMain.on('stage:show', () => {
    showStageDisplayWindow()
  })

  ipcMain.on('stage:hide', () => {
    hideStageDisplayWindow()
  })

  // Display info
  // Legacy 'display_get-all' handler removed — use 'display:get-all' (line 610)

  ipcMain.handle('display:is-projection-visible', () => isProjectionVisible())
  ipcMain.handle('display:has-external', () => hasExternalDisplay())

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
  ipcMain.handle('db:import-json', (_e, payload) => importSongsFromJson(payload))
  ipcMain.handle('db:update-song', (_e, id, song) => updateSong(id, song))
  ipcMain.handle('db:delete-song', (_e, id) => deleteSong(id))
  ipcMain.handle('db:clear-lyrics', (_e, hymnalId, songNumbers) =>
    clearLyrics(hymnalId, songNumbers)
  )
  safeIpcHandle('db:bulk-assign-song-background', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid bulk song background payload.')
    if (!Array.isArray(raw.songIds)) throw new Error('songIds must be an array.')
    if (typeof raw.songBackgroundConfig !== 'string') {
      throw new Error('songBackgroundConfig must be a string.')
    }
    return bulkAssignSongBackground({
      songIds: raw.songIds.filter((item): item is number => Number.isInteger(item)),
      songBackgroundConfig: raw.songBackgroundConfig,
      assetId: typeof raw.assetId === 'string' ? raw.assetId : undefined
    })
  })
  ipcMain.handle('db:toggle-favorite', (_e, id) => toggleFavorite(id))
  ipcMain.handle('db:get-song-note', (_e, songId) => getSongNote(songId))
  ipcMain.handle('db:update-song-note', (_e, songId, noteText) => updateSongNote(songId, noteText))

  // Media Library
  safeIpcHandle('db:get-media-assets', (filters: unknown) => {
    if (filters === undefined || filters === null) return getMediaAssets()
    const raw = ensureObject(filters, 'Invalid media asset filters.')
    return getMediaAssets({
      type: raw.type as 'image' | 'video' | undefined,
      search: typeof raw.search === 'string' ? raw.search : undefined,
      favoriteOnly: raw.favoriteOnly === true,
      category: typeof raw.category === 'string' ? raw.category : undefined,
      collectionId: typeof raw.collectionId === 'string' ? raw.collectionId : undefined
    })
  })
  safeIpcHandle('db:get-media-collections', () => getMediaCollections())
  safeIpcHandle('db:import-media-assets', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid media import payload.')
    if (!Array.isArray(raw.filePaths)) throw new Error('filePaths must be an array.')
    return importMediaAssets({
      filePaths: raw.filePaths.filter((item): item is string => typeof item === 'string'),
      category: typeof raw.category === 'string' ? raw.category : undefined,
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((item): item is string => typeof item === 'string')
        : undefined
    })
  })
  safeIpcHandle('db:update-media-asset', (id: unknown, updates: unknown) => {
    const mediaId = ensureNonEmptyString(id, 'Invalid media asset id.')
    const raw = ensureObject(updates, 'Invalid media asset update payload.')
    return updateMediaAsset(mediaId, {
      name: typeof raw.name === 'string' ? raw.name : undefined,
      category: typeof raw.category === 'string' ? raw.category : undefined,
      tags: Array.isArray(raw.tags)
        ? raw.tags.filter((item): item is string => typeof item === 'string')
        : undefined,
      isFavorite: typeof raw.isFavorite === 'boolean' ? raw.isFavorite : undefined
    })
  })
  safeIpcHandle('db:delete-media-asset', (id: unknown) => {
    const mediaId = ensureNonEmptyString(id, 'Invalid media asset id.')
    auditDestructiveAction('db:delete-media-asset', { id: mediaId })
    return deleteMediaAsset(mediaId)
  })
  safeIpcHandle('db:increment-media-asset-usage', (id: unknown) => {
    const mediaId = ensureNonEmptyString(id, 'Invalid media asset id.')
    incrementMediaAssetUsage(mediaId)
  })
  safeIpcHandle('db:add-media-collection', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid media collection payload.')
    return addMediaCollection({
      name: ensureNonEmptyString(raw.name, 'Collection name is required.'),
      description: typeof raw.description === 'string' ? raw.description : undefined,
      assetIds: Array.isArray(raw.assetIds)
        ? raw.assetIds.filter((item): item is string => typeof item === 'string')
        : undefined
    })
  })
  safeIpcHandle('db:update-media-collection', (id: unknown, updates: unknown) => {
    const collectionId = ensureNonEmptyString(id, 'Invalid media collection id.')
    const raw = ensureObject(updates, 'Invalid media collection update payload.')
    return updateMediaCollection(collectionId, {
      name: typeof raw.name === 'string' ? raw.name : undefined,
      description: typeof raw.description === 'string' ? raw.description : undefined,
      coverAssetId: typeof raw.coverAssetId === 'string' ? raw.coverAssetId : undefined
    })
  })
  safeIpcHandle('db:delete-media-collection', (id: unknown) => {
    const collectionId = ensureNonEmptyString(id, 'Invalid media collection id.')
    auditDestructiveAction('db:delete-media-collection', { id: collectionId })
    return deleteMediaCollection(collectionId)
  })
  safeIpcHandle('db:add-assets-to-media-collection', (collectionId: unknown, assetIds: unknown) => {
    const safeCollectionId = ensureNonEmptyString(collectionId, 'Invalid media collection id.')
    if (!Array.isArray(assetIds)) throw new Error('assetIds must be an array.')
    return addAssetsToMediaCollection(
      safeCollectionId,
      assetIds.filter((item): item is string => typeof item === 'string')
    )
  })
  safeIpcHandle(
    'db:remove-assets-from-media-collection',
    (collectionId: unknown, assetIds: unknown) => {
      const safeCollectionId = ensureNonEmptyString(collectionId, 'Invalid media collection id.')
      if (!Array.isArray(assetIds)) throw new Error('assetIds must be an array.')
      return removeAssetsFromMediaCollection(
        safeCollectionId,
        assetIds.filter((item): item is string => typeof item === 'string')
      )
    }
  )
  safeIpcHandle('db:reorder-media-collection-items', (collectionId: unknown, assetIds: unknown) => {
    const safeCollectionId = ensureNonEmptyString(collectionId, 'Invalid media collection id.')
    if (!Array.isArray(assetIds)) throw new Error('assetIds must be an array.')
    return reorderMediaCollectionItems(
      safeCollectionId,
      assetIds.filter((item): item is string => typeof item === 'string')
    )
  })
  safeIpcHandle('db:bulk-update-media-assets', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid bulk media update payload.')
    if (!Array.isArray(raw.ids)) throw new Error('ids must be an array.')
    return bulkUpdateMediaAssets(
      raw.ids.filter((item): item is string => typeof item === 'string'),
      {
        category: typeof raw.category === 'string' ? raw.category : undefined,
        tags: Array.isArray(raw.tags)
          ? raw.tags.filter((item): item is string => typeof item === 'string')
          : undefined,
        isFavorite: typeof raw.isFavorite === 'boolean' ? raw.isFavorite : undefined
      }
    )
  })
  safeIpcHandle('db:bulk-delete-media-assets', (ids: unknown) => {
    if (!Array.isArray(ids)) throw new Error('ids must be an array.')
    const safeIds = ids.filter((item): item is string => typeof item === 'string')
    auditDestructiveAction('db:bulk-delete-media-assets', { count: safeIds.length })
    return bulkDeleteMediaAssets(safeIds)
  })

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
  ipcMain.handle('db:add-bible-to-playlist', (_e, playlistId, bible) =>
    addBibleToPlaylist(playlistId, bible)
  )
  ipcMain.handle('db:add-info-to-playlist', (_e, playlistId, info) =>
    addInfoToPlaylist(playlistId, info)
  )
  ipcMain.handle('db:update-playlist-item', (_e, id, data) => updatePlaylistItem(id, data))
  ipcMain.handle('db:delete-playlist-item', (_e, id) => deletePlaylistItem(id))
  ipcMain.handle('db:reorder-playlist-items', (_e, items) => reorderPlaylistItems(items))

  ipcMain.handle('db:get-settings', () => getSettings())
  ipcMain.handle('db:update-setting', (_e, key, value) => {
    updateSetting(key, value)
    if (key === 'projection_monitor_id' || key === 'display_fullscreen') {
      repositionProjectionWindowFromSettings()
    }
  })

  // History operations
  ipcMain.handle('db:log-history', (_e, songId) => logSongHistory(songId))
  ipcMain.handle('db:get-recent-songs', (_e, limit, hymnalId) => getRecentSongs(limit, hymnalId))

  // Database / Backup / Crash Recovery
  safeIpcHandle('db:create-backup', async (customPath: unknown) => {
    if (customPath === undefined || customPath === null || customPath === '') {
      return createBackup()
    }
    const path = ensureNonEmptyString(customPath, 'Invalid backup path.')
    const { isAbsolute, extname } = await import('path')
    if (!isAbsolute(path)) throw new Error('Backup path must be absolute.')
    if (extname(path).toLowerCase() !== '.db')
      throw new Error('Backup path must use .db extension.')
    auditDestructiveAction('db:create-backup', { customPath: path })
    return createBackup(path)
  })
  safeIpcHandle('db:restore-backup', async (payload: unknown) => {
    const { isAbsolute, extname } = await import('path')
    const { existsSync } = await import('fs')

    let backupPath = ''
    if (typeof payload === 'string') {
      backupPath = payload
    } else {
      const raw = ensureObject(payload, 'Invalid restore payload.')
      const confirmRestore = raw.confirmRestore === true
      if (!confirmRestore) throw new Error('Restore requires explicit confirmation.')
      backupPath = ensureNonEmptyString(raw.backupPath, 'Invalid restore backup path.')
    }

    if (!isAbsolute(backupPath)) throw new Error('Restore backup path must be absolute.')
    if (extname(backupPath).toLowerCase() !== '.db') {
      throw new Error('Restore backup file must use .db extension.')
    }
    if (!existsSync(backupPath)) throw new Error('Backup file does not exist.')
    auditDestructiveAction('db:restore-backup', { backupPath })
    return restoreBackup(backupPath)
  })
  ipcMain.handle('db:save-session', (_e, state) => saveSessionState(state))
  ipcMain.handle('db:get-recovery-state', () => getRecoveryState())
  ipcMain.handle('db:mark-clean-exit', () => markCleanExit())
  safeIpcHandle('db:reseed', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid reseed payload.')
    if (raw.confirmToken !== RESEED_CONFIRM_TOKEN) {
      throw new Error('Reseed requires explicit confirmation token.')
    }
    auditDestructiveAction('db:reseed', { confirmed: true })
    return reseedDatabase()
  })
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
  safeIpcHandle('file:parse-excel', async (filePath: string) => {
    return parseExcelFile(filePath)
  })

  // File export - save dialog
  ipcMain.handle('file:show-save-dialog', async (_e, options: Electron.SaveDialogOptions) => {
    const { dialog, BrowserWindow } = await import('electron')
    const mainWindow = BrowserWindow.getFocusedWindow()
    return dialog.showSaveDialog(mainWindow!, options)
  })

  // File import - open dialog
  ipcMain.handle('file:show-open-dialog', async (_e, options: Electron.OpenDialogOptions) => {
    const { dialog, BrowserWindow } = await import('electron')
    const mainWindow = BrowserWindow.getFocusedWindow()
    return dialog.showOpenDialog(mainWindow!, options)
  })

  // File import - read JSON
  ipcMain.handle('file:read-json', async (_e, filePath: string) => {
    const { readFileSync } = await import('fs')
    const { isAbsolute, extname } = await import('path')
    try {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new Error('Invalid file path.')
      }
      if (!isAbsolute(filePath)) {
        throw new Error('Path must be absolute.')
      }
      if (extname(filePath).toLowerCase() !== '.json') {
        throw new Error('Only .json file extension is allowed.')
      }
      const raw = readFileSync(filePath, 'utf8')
      return JSON.parse(raw)
    } catch (error) {
      console.error('Read JSON error:', error)
      throw error
    }
  })

  // File export - write JSON
  ipcMain.handle('file:write-json', async (_e, filePath: string, data: unknown) => {
    const { writeFileSync } = await import('fs')
    const { dirname, isAbsolute, extname } = await import('path')
    const { mkdirSync, existsSync } = await import('fs')

    try {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new Error('Invalid file path.')
      }
      if (!isAbsolute(filePath)) {
        throw new Error('Path must be absolute.')
      }
      if (extname(filePath).toLowerCase() !== '.json') {
        throw new Error('Only .json file extension is allowed.')
      }

      // Ensure parent directory exists
      const parentDir = dirname(filePath)
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }

      // Write JSON with pretty formatting
      const jsonStr = JSON.stringify(data, null, 2)
      writeFileSync(filePath, jsonStr, 'utf8')
      return { success: true, path: filePath }
    } catch (error) {
      console.error('Write JSON error:', error)
      throw error
    }
  })

  // ════════════════════════════════════════════════════════════════
  // Phase 1 — Enterprise Refactor IPC Handlers (additive only)
  // @see implementation-master-order-v1.md §3.2 Sequence 1.5
  // ════════════════════════════════════════════════════════════════

  // Storage stats — replaces hardcoded "28.4 GB" in Management Mode
  safeIpcHandle('system:get-storage-stats', () => {
    return getStorageStats()
  })

  // Duplicate song — creates a copy with modified number/title
  safeIpcHandle('db:duplicate-song', (songId: unknown) => {
    if (typeof songId !== 'number' || !Number.isInteger(songId)) {
      throw new Error('songId must be an integer.')
    }
    return duplicateSong(songId)
  })

  // Songs summary — lightweight query without lyrics_raw
  safeIpcHandle('db:get-songs-summary', (hymnalId: unknown) => {
    if (hymnalId !== undefined && hymnalId !== null) {
      if (typeof hymnalId !== 'number' || !Number.isInteger(hymnalId)) {
        throw new Error('hymnalId must be an integer.')
      }
      return getSongsSummary(hymnalId)
    }
    return getSongsSummary()
  })

  // Confidence monitor broadcast — forwards payload to stage display window
  // FIX ARCH-03: was incorrectly sending to projectionWindow (audience screen)
  ipcMain.on('confidence:update', (_event, payload) => {
    const stageWindow = getStageDisplayWindow()
    if (stageWindow && !stageWindow.isDestroyed()) {
      stageWindow.webContents.send('confidence:update', payload)
    }
  })

  // Display:get-all alias (normalized channel name)
  ipcMain.handle('display:get-all', () => getAllDisplays())

  // Debug report export for beta testers
  ipcMain.handle('system:export-debug-report', async () => {
    return await exportDebugReport()
  })

  // ========== Bible Notes & Highlights ==========
  ipcMain.handle('db:get-bible-note', (_e, bookCode: string, chapter: number, verse: number) =>
    getBibleNote(bookCode, chapter, verse)
  )
  ipcMain.handle(
    'db:update-bible-note',
    (
      _e,
      bookCode: string,
      chapter: number,
      verse: number,
      noteText: string,
      highlightColor: string
    ) => updateBibleNote(bookCode, chapter, verse, noteText, highlightColor)
  )
  ipcMain.handle('db:get-bible-notes-for-chapter', (_e, bookCode: string, chapter: number) =>
    getBibleNotesForChapter(bookCode, chapter)
  )

  // ========== Content Pack & Bible Pack IPC ==========
  setupContentPackIPC()
  setupBiblePackIPC()
}
