/**
 * IPC Handlers Module
 * Centralizes all IPC communication between renderer and main process
 */

import { ipcMain } from 'electron'
import * as xlsx from 'xlsx'
import { ZodError } from 'zod'
import { IPC_SCRAPER } from '../shared/ipc-channels'
import { ScraperStartPayloadSchema } from '../shared/contracts/scraper'
import {
  ScraperDryRunResultSchema,
  ScraperImportFromDryRunSchema,
  ScraperSavedDryRunStateSchema,
  ScraperSavedRunningTaskStateSchema
} from '../shared/contracts/scraper'
import {
  ScraperError,
  formatScraperErrorMessage,
  isScraperError,
  type ScraperErrorCode
} from '../shared/errors/scraperErrors'
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
  importSongsFromJson,
  createBackup,
  restoreBackup,
  saveSessionState,
  markCleanExit,
  getRecoveryState,
  reseedDatabase,
  checkMultiHymnalIntegrity,
  saveAppState,
  getAppState,
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
  updateTheme,
  broadcastAppTheme,
  updateTitleBarOverlayForTheme
} from './windows'
import { getAllDisplays } from './display-monitor'
import { ScraperTaskManager } from './scraper/task/ScraperTaskManager'
import type { PerSongResolutionDecision, ScrapedSong, ScraperStartRequest } from './scraper/types'

let lastScraperStartRequest: ScraperStartRequest | null = null

const scraperTaskManager = new ScraperTaskManager(
  () => getMainWindow()?.webContents ?? null,
  undefined,
  (snapshot) => {
    try {
      const req = lastScraperStartRequest
      if (!req) return

      const state = ScraperSavedRunningTaskStateSchema.parse({
        savedAt: new Date().toISOString(),
        taskId: snapshot.taskId,
        request: req,
        failedNumbers: snapshot.failedNumbers,
        processed: snapshot.processed,
        total: snapshot.total,
        success: snapshot.success,
        failed: snapshot.failed,
        skipped: snapshot.skipped,
        retries: snapshot.retries,
        state: snapshot.state
      })

      saveAppState('scraper_saved_running_task_state', JSON.stringify(state))

      if (snapshot.state !== 'RUNNING') {
        saveAppState('scraper_saved_running_task_state', '')
        lastScraperStartRequest = null
      }
    } catch {
      // ignore
    }
  }
)
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
    return `[${channel}] ${formatScraperErrorMessage('INVALID_PAYLOAD', first)}`
  }
  if (isScraperError(err)) {
    return `[${channel}] ${formatScraperErrorMessage(err.code, err.message)}`
  }
  const raw = err instanceof Error ? err.message : 'Internal error'
  const cleaned = raw.replace(/\s+/g, ' ').trim().slice(0, 240)
  return `[${channel}] ${cleaned || formatScraperErrorMessage('INTERNAL', 'Internal error')}`
}

function wrapScraperError(
  code: ScraperErrorCode,
  message: string,
  opts?: { retryable?: boolean }
): never {
  throw new ScraperError(code, message, opts)
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

function parseScraperStartPayload(payload: unknown): ScraperStartRequest {
  try {
    return ScraperStartPayloadSchema.parse(payload)
  } catch (err) {
    if (err instanceof ZodError) {
      wrapScraperError(
        'INVALID_PAYLOAD',
        err.issues[0]?.message ?? 'Invalid scraper start payload.'
      )
    }
    throw err
  }
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

  // Performance monitoring
  ipcMain.handle('system:get-memory', async () => {
    const mem = await process.getProcessMemoryInfo?.()
    return mem ? { private: mem.private, shared: mem.shared } : null
  })

  ipcMain.handle(IPC_SCRAPER.GET_PROVIDERS, async () => {
    return scraperTaskManager.getProviders()
  })

  ipcMain.handle(IPC_SCRAPER.GET_PROVIDER_DEFINITIONS, async () => {
    const { getAllProviderDefinitions } = await import('./scraper/providerRegistry')
    return getAllProviderDefinitions()
  })

  ipcMain.handle(
    IPC_SCRAPER.VALIDATE_PROVIDER,
    async (_event, payload: { providerId: string; baseUrl?: string }) => {
      const { validateProvider } = await import('./scraper/providerRegistry')
      return validateProvider(payload.providerId, payload.baseUrl)
    }
  )

  ipcMain.handle(
    IPC_SCRAPER.GET_PROVIDER_HEALTH,
    async (_event, payload: { providerId: string }) => {
      const { getProviderHealth } = await import('./scraper/providerRegistry')
      return getProviderHealth(payload.providerId)
    }
  )

  ipcMain.handle(
    IPC_SCRAPER.PREVIEW,
    async (_event, payload: { providerId: string; input: string; baseUrl?: string }) => {
      return scraperTaskManager.preview(payload.providerId, payload.input, payload.baseUrl)
    }
  )

  safeIpcHandle(IPC_SCRAPER.DRY_RUN, async (payload: unknown) => {
    const request = parseScraperStartPayload(payload)
    const res = await scraperTaskManager.dryRun(request)
    const parsed = ScraperDryRunResultSchema.parse(res)

    // Persist last dry-run state for crash recovery / resume.
    try {
      saveAppState(
        'scraper_saved_dry_run_state',
        JSON.stringify(
          ScraperSavedDryRunStateSchema.parse({
            savedAt: new Date().toISOString(),
            taskId: parsed.taskId,
            request,
            items: parsed.items,
            conflicts: parsed.conflicts
          })
        )
      )
    } catch (err) {
      console.warn('[scraper] failed to persist dry-run state:', err)
    }

    return parsed
  })

  safeIpcHandle(IPC_SCRAPER.IMPORT, async (payload: unknown) => {
    const parsed = ScraperImportFromDryRunSchema.parse(payload)

    const summary = await scraperTaskManager.importFromDryRun({
      taskId: parsed.taskId,
      request: parsed.request,
      items: parsed.items as ScrapedSong[],
      decisions: parsed.decisions as Record<string, PerSongResolutionDecision>,
      defaultAction: parsed.defaultAction
    })

    // Clear persisted dry-run state on successful import.
    try {
      saveAppState('scraper_saved_dry_run_state', '')
    } catch {
      // ignore
    }

    return summary
  })

  safeIpcHandle(IPC_SCRAPER.GET_SAVED_DRY_RUN_STATE, async () => {
    const raw = getAppState('scraper_saved_dry_run_state')
    if (!raw) return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      return ScraperSavedDryRunStateSchema.parse(JSON.parse(trimmed))
    } catch {
      // Corrupted state, clear it.
      try {
        saveAppState('scraper_saved_dry_run_state', '')
      } catch {
        // ignore
      }
      wrapScraperError('INVALID_PAYLOAD', 'Saved dry-run state is invalid or corrupted.')
    }
  })

  safeIpcHandle(IPC_SCRAPER.CLEAR_SAVED_DRY_RUN_STATE, async () => {
    saveAppState('scraper_saved_dry_run_state', '')
    return true
  })

  safeIpcHandle(IPC_SCRAPER.START, async (payload: unknown) => {
    const request = parseScraperStartPayload(payload)
    lastScraperStartRequest = request
    const res = scraperTaskManager.start(request)
    try {
      saveAppState('scraper_saved_running_task_state', '')
    } catch {
      // ignore
    }
    return res
  })

  safeIpcHandle(
    IPC_SCRAPER.RESUME_FAILED,
    async (payload: { request: unknown; failedNumbers: unknown }) => {
      const raw = ensureObject(payload, 'Invalid resume payload.')
      const request = parseScraperStartPayload(raw.request)
      lastScraperStartRequest = request
      if (!Array.isArray(raw.failedNumbers)) {
        wrapScraperError('INVALID_PAYLOAD', 'Invalid failedNumbers payload.')
      }
      const nums = (raw.failedNumbers as unknown[]).map((n) => String(n))
      const res = scraperTaskManager.startForNumbers(request, nums)
      try {
        saveAppState('scraper_saved_running_task_state', '')
      } catch {
        // ignore
      }
      return res
    }
  )

  safeIpcHandle(IPC_SCRAPER.GET_SAVED_RUNNING_TASK_STATE, async () => {
    const raw = getAppState('scraper_saved_running_task_state')
    if (!raw) return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    try {
      return ScraperSavedRunningTaskStateSchema.parse(JSON.parse(trimmed))
    } catch {
      try {
        saveAppState('scraper_saved_running_task_state', '')
      } catch {
        // ignore
      }
      return null
    }
  })

  safeIpcHandle(IPC_SCRAPER.CLEAR_SAVED_RUNNING_TASK_STATE, async () => {
    saveAppState('scraper_saved_running_task_state', '')
    return true
  })

  ipcMain.handle(IPC_SCRAPER.ABORT, async () => {
    return scraperTaskManager.abort()
  })

  ipcMain.handle(IPC_SCRAPER.RETRY_FAILED, async () => {
    return scraperTaskManager.retryFailed()
  })

  ipcMain.handle(
    IPC_SCRAPER.GET_AUDIT_HISTORY,
    async (_event, payload: { hymnalId?: number; limit?: number }) => {
      const { getRecentScraperAudits, getScraperAuditsByHymnal } = await import('./database')
      if (payload.hymnalId) {
        return getScraperAuditsByHymnal(payload.hymnalId, payload.limit)
      }
      return getRecentScraperAudits(payload.limit)
    }
  )

  ipcMain.handle(IPC_SCRAPER.GET_AUDIT_DETAIL, async (_event, taskId: string) => {
    const { getScraperAuditByTaskId, getScraperAuditItems } = await import('./database')
    const audit = getScraperAuditByTaskId(taskId)
    if (!audit) return null
    const items = getScraperAuditItems(audit.id)
    return { audit, items }
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
  ipcMain.handle('db:import-json', (_e, payload) => importSongsFromJson(payload))
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
    // Security constants
    const MAX_FILE_SIZE_MB = 10
    const MAX_ROWS = 5000
    const MAX_COLS = 50
    const PARSE_TIMEOUT_MS = 30000
    const ALLOWED_EXTENSIONS = ['.xlsx']

    try {
      if (typeof filePath !== 'string' || filePath.trim().length === 0) {
        throw new Error('Invalid file path.')
      }
      const sanitizedPath = filePath.trim()
      const { isAbsolute, extname } = await import('path')
      const { statSync, existsSync } = await import('fs')

      if (!isAbsolute(sanitizedPath)) {
        throw new Error('Excel path must be absolute.')
      }
      if (!existsSync(sanitizedPath)) {
        throw new Error('Excel file does not exist.')
      }

      // 1. Validate file extension
      const ext = extname(sanitizedPath).toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(
          `File type not allowed. Only ${ALLOWED_EXTENSIONS.join(', ')} are supported.`
        )
      }

      // 2. Validate file size
      const stats = statSync(sanitizedPath)
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
        xlsx.readFile(sanitizedPath, {
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

  // File export - save dialog
  ipcMain.handle('file:show-save-dialog', async (_e, options: Electron.SaveDialogOptions) => {
    const { dialog, BrowserWindow } = await import('electron')
    const mainWindow = BrowserWindow.getFocusedWindow()
    return dialog.showSaveDialog(mainWindow!, options)
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
}
