/**
 * IPC Handlers Module
 * Centralizes all IPC communication between renderer and main process
 */

import {
  ipcMain,
  app,
  shell,
  BrowserWindow,
  type IpcMainEvent,
  type IpcMainInvokeEvent
} from 'electron'
import { ZodError } from 'zod'
import { dirname, join } from 'path'
import { parseExcelFile } from './services/excel'
import { scanInstrumentFolder } from './services/instruments/scanInstruments'
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
  addLocalExternalMedia,
  registerPresentationPackageAsset,
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
  addMediaToPlaylist,
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
  updateConfidencePayload,
  isProjectionVisible,
  updateSlideData,
  updateProjectionState,
  updateTheme,
  broadcastAppTheme,
  updateTitleBarOverlayForTheme,
  repositionProjectionWindowFromSettings,
  repositionStageDisplayWindowFromSettings,
  hasExternalDisplay
} from './windows'
import { getAllDisplays } from './display-monitor'
import { resolveModeChangeProjectionAction } from './mode-policy'
import { normalizeSafeExternalUrl } from './safe-external-url'
import {
  requireBoundedString,
  requireSerializableSize,
  sanitizeOpenDialogOptions,
  sanitizeSaveDialogOptions,
  validateReorderPayload,
  validateSettingPayload
} from './ipc-payload-validation'
import {
  bibleBookSchema,
  bibleTranslationSchema,
  bibleVerseSchema,
  bibleVersesBatchSchema,
  customSlideCreateSchema,
  customSlideUpdateSchema,
  hymnalCreateSchema,
  hymnalUpdateSchema,
  mediaAssetUpdateSchema,
  mediaBulkUpdateSchema,
  mediaCollectionCreateSchema,
  mediaCollectionUpdateSchema,
  mediaFiltersSchema,
  mediaIdSchema,
  mediaIdsSchema,
  mediaImportSchema,
  parsePositiveId,
  songJsonImportSchema,
  songSearchSchema,
  playlistCreateSchema,
  playlistBibleSchema,
  playlistInfoSchema,
  playlistItemCreateSchema,
  playlistItemUpdateSchema,
  playlistUpdateSchema,
  presentationImportSchema,
  slideGroupCreateSchema,
  slideGroupUpdateSchema,
  songCreateSchema,
  songRelationSchema,
  songUpdateSchema
} from './ipc-domain-schemas'
import {
  getPresenterRemoteStatus,
  clearPresenterRemoteCommandLog,
  disconnectPresenterRemoteClient,
  disconnectPresenterRemoteClients,
  getPowerPointBridgeStatus,
  approvePowerPointBridgeRequest,
  rejectPowerPointBridgeRequest,
  disconnectPowerPointBridgeDevice,
  sendPowerPointBridgeCommand,
  regeneratePresenterRemoteCode,
  regeneratePresenterRemoteCodes,
  type SionLinkRole,
  startPresenterRemoteServer,
  stopPresenterRemoteServer,
  updatePresenterRemoteSecurityPolicy,
  updatePresenterRemoteSnapshot,
  type PresenterRemoteSnapshot,
  type SionLinkSecurityPolicy
} from './presenter-remote-server'
import { createPresentationPackage } from './services/presentations/pptx-package'
import {
  getObsSrtStatus,
  startObsSrtOutput,
  stopObsSrtOutput,
  updateObsSrtConfig,
  type ObsSrtConfig
} from './obs-srt-output'
import {
  getObsSrtIngestStatus,
  setObsSrtIngestAutoStart,
  startObsSrtIngest,
  stopObsSrtIngest,
  updateObsSrtIngestConfig,
  type ObsSrtIngestConfig
} from './obs-srt-ingest'
const RESEED_CONFIRM_TOKEN = 'RESEED_DATABASE'
let activeMediaImportController: AbortController | null = null

type IpcSenderPolicy = 'main' | 'projection' | 'stage' | 'any-app-window'

function isAllowedIpcSender(senderId: number, policy: IpcSenderPolicy): boolean {
  const windowIds = {
    main: getMainWindow()?.webContents.id,
    projection: getProjectionWindow()?.webContents.id,
    stage: getStageDisplayWindow()?.webContents.id
  }
  if (policy === 'any-app-window') return Object.values(windowIds).includes(senderId)
  return windowIds[policy] === senderId
}

function assertIpcSender(
  event: IpcMainEvent | IpcMainInvokeEvent,
  channel: string,
  policy: IpcSenderPolicy
): void {
  if (isAllowedIpcSender(event.sender.id, policy)) return
  console.warn('[IPC] Rejected unauthorized sender', { channel, senderId: event.sender.id, policy })
  throw new Error(`[${channel}] Unauthorized IPC sender`)
}

function policyHandle(
  policy: IpcSenderPolicy,
  channel: string,
  handler: Parameters<typeof ipcMain.handle>[1]
): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      assertIpcSender(event, channel, policy)
      return await handler(event, ...args)
    } catch (error) {
      console.error(`[IPC] ${channel} failed:`, error)
      throw new Error(toSafeIpcErrorMessage(channel, error))
    }
  })
}

function mainOnlyHandle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]): void {
  policyHandle('main', channel, handler)
}

function appWindowHandle(channel: string, handler: Parameters<typeof ipcMain.handle>[1]): void {
  policyHandle('any-app-window', channel, handler)
}

function policyOn(
  policy: IpcSenderPolicy,
  channel: string,
  listener: Parameters<typeof ipcMain.on>[1]
): void {
  ipcMain.on(channel, (event, ...args) => {
    try {
      assertIpcSender(event, channel, policy)
      listener(event, ...args)
    } catch (error) {
      console.error(`[IPC] ${channel} rejected:`, error)
    }
  })
}

function mainOnlyOn(channel: string, listener: Parameters<typeof ipcMain.on>[1]): void {
  policyOn('main', channel, listener)
}

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

function ensurePositiveInteger(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw new Error(message)
  return value
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
      assertIpcSender(_event, channel, 'main')
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
  mainOnlyOn('window:minimize', () => getMainWindow()?.minimize())
  mainOnlyOn('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  mainOnlyOn('window:close', () => getMainWindow()?.close())
  mainOnlyHandle('window:is-maximized', () => getMainWindow()?.isMaximized() ?? false)

  // App version
  mainOnlyHandle('app:get-version', () => app.getVersion())

  // Runtime mode
  mainOnlyHandle('app:get-safe-mode', () => isSafeMode())

  // Performance monitoring
  mainOnlyHandle('system:get-memory', async () => {
    const mem = await process.getProcessMemoryInfo?.()
    return mem ? { private: mem.private, shared: mem.shared } : null
  })

  // Open external links
  mainOnlyHandle('system:open-external', async (_event, url: string) => {
    const safeUrl = normalizeSafeExternalUrl(url)
    if (!safeUrl) throw new Error('Invalid or unsafe external URL')
    return await shell.openExternal(safeUrl)
  })

  // App theme sync
  policyOn(
    'any-app-window',
    'app:theme-mode-set',
    (_event, payload: { mode: string; effective: 'dark' | 'light' }) => {
      updateTitleBarOverlayForTheme(payload.effective)
      broadcastAppTheme(payload)
    }
  )

  // Mode change handler
  mainOnlyHandle('system:set-mode', async (_event, mode: string) => {
    // Workspace navigation must never affect the audience output. Visibility
    // remains exclusively controlled by projection:show / projection:hide.
    return resolveModeChangeProjectionAction(mode)
  })

  // Projection control
  mainOnlyOn('projection:slide-update', (_event, slideData) => {
    requireSerializableSize(slideData, 'Projection slide', 2 * 1024 * 1024)
    updateSlideData(slideData)
  })

  mainOnlyOn('projection:state-change', (_event, state) => {
    updateProjectionState(requireBoundedString(state, 'Projection state', 32))
  })

  mainOnlyOn('projection:theme-update', (_event, theme) => {
    requireSerializableSize(theme, 'Projection theme', 256 * 1024)
    updateTheme(theme)
  })

  safeIpcHandle('presenter-remote:start', () => startPresenterRemoteServer())
  safeIpcHandle('presenter-remote:stop', () => stopPresenterRemoteServer())
  safeIpcHandle('presenter-remote:status', () => getPresenterRemoteStatus())
  safeIpcHandle('presenter-remote:regenerate-codes', () => regeneratePresenterRemoteCodes())
  safeIpcHandle('presenter-remote:regenerate-code', (role: SionLinkRole) =>
    regeneratePresenterRemoteCode(role)
  )
  safeIpcHandle('presenter-remote:disconnect-clients', () => disconnectPresenterRemoteClients())
  safeIpcHandle('presenter-remote:disconnect-client', (clientId: string) =>
    disconnectPresenterRemoteClient(clientId)
  )
  safeIpcHandle('presenter-remote:update-security-policy', (policy: SionLinkSecurityPolicy) =>
    updatePresenterRemoteSecurityPolicy(policy)
  )
  safeIpcHandle('presenter-remote:clear-command-log', () => clearPresenterRemoteCommandLog())
  safeIpcHandle('presenter-remote:powerpoint-status', () => getPowerPointBridgeStatus())
  safeIpcHandle('presenter-remote:powerpoint-approve', (requestId: string) =>
    approvePowerPointBridgeRequest(requireBoundedString(requestId, 'PowerPoint request ID', 64))
  )
  safeIpcHandle('presenter-remote:powerpoint-reject', (requestId: string) =>
    rejectPowerPointBridgeRequest(requireBoundedString(requestId, 'PowerPoint request ID', 64))
  )
  safeIpcHandle('presenter-remote:powerpoint-disconnect', (deviceId: string) =>
    disconnectPowerPointBridgeDevice(requireBoundedString(deviceId, 'PowerPoint device ID', 96))
  )
  safeIpcHandle(
    'presenter-remote:powerpoint-command',
    (deviceId: string, command: 'NEXT' | 'PREV') => {
      if (command !== 'NEXT' && command !== 'PREV')
        throw new Error('Perintah PowerPoint tidak valid.')
      return sendPowerPointBridgeCommand(
        requireBoundedString(deviceId, 'PowerPoint device ID', 96),
        command
      )
    }
  )
  safeIpcHandle('obs-srt:status', () => getObsSrtStatus())
  safeIpcHandle('obs-srt:start', () => startObsSrtOutput())
  safeIpcHandle('obs-srt:stop', () => stopObsSrtOutput())
  safeIpcHandle('obs-srt:update-config', (config: Partial<ObsSrtConfig>) => {
    requireSerializableSize(config, 'OBS SRT config', 16 * 1024)
    return updateObsSrtConfig(config)
  })
  safeIpcHandle('obs-srt-ingest:status', () => getObsSrtIngestStatus())
  safeIpcHandle('obs-srt-ingest:start', () => startObsSrtIngest())
  safeIpcHandle('obs-srt-ingest:stop', () => stopObsSrtIngest())
  safeIpcHandle('obs-srt-ingest:set-auto-start', (autoStart: boolean) => {
    if (typeof autoStart !== 'boolean') throw new Error('Nilai mulai otomatis tidak valid.')
    return setObsSrtIngestAutoStart(autoStart)
  })
  safeIpcHandle(
    'obs-srt-ingest:update-config',
    (config: Partial<ObsSrtIngestConfig> & { resetStreamKey?: boolean }) => {
      requireSerializableSize(config, 'OBS SRT ingest config', 16 * 1024)
      return updateObsSrtIngestConfig(config)
    }
  )
  mainOnlyOn('presenter-remote:update-snapshot', (_event, snapshot: PresenterRemoteSnapshot) => {
    if (!snapshot || typeof snapshot !== 'object') return
    requireSerializableSize(snapshot, 'Presenter snapshot', 2 * 1024 * 1024)
    updatePresenterRemoteSnapshot(snapshot)
  })

  mainOnlyOn('projection:show', () => {
    showProjectionWindow()
  })

  mainOnlyOn('projection:hide', () => {
    hideProjectionWindow()
  })

  mainOnlyOn('projection:emergency', (_event, payload) => {
    requireSerializableSize(payload, 'Emergency payload', 16 * 1024)
    const projectionWindow = getProjectionWindow()
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:emergency', payload)
    }
  })

  const mediaControlCommands = new Set(['play', 'pause', 'stop', 'seek', 'volume', 'mute', 'load'])
  const normalizeMediaControlValue = (command: unknown, value: unknown): unknown => {
    if (typeof command !== 'string' || !mediaControlCommands.has(command)) return undefined
    if (command === 'seek') {
      return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : undefined
    }
    if (command === 'volume') {
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : undefined
    }
    if (command === 'mute') {
      return typeof value === 'boolean' ? value : undefined
    }
    if (command === 'load') {
      return typeof value === 'string'
        ? requireBoundedString(value, 'Media path', 32_767, true)
        : ''
    }
    return value
  }

  mainOnlyOn('projection:video-control', (_event, command, value) => {
    if (typeof command !== 'string' || !mediaControlCommands.has(command)) return
    const safeValue = normalizeMediaControlValue(command, value)
    const projectionWindow = getProjectionWindow()
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:video-control', command, safeValue)
    }
  })

  mainOnlyOn('projection:instrument-control', (_event, command, value) => {
    if (typeof command !== 'string' || !mediaControlCommands.has(command)) return
    const safeValue = normalizeMediaControlValue(command, value)
    const projectionWindow = getProjectionWindow()
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      projectionWindow.webContents.send('projection:instrument-control', command, safeValue)
    }
  })

  policyOn('projection', 'projection:instrument-timeupdate', (_event, currentTime, duration) => {
    if (
      typeof currentTime !== 'number' ||
      typeof duration !== 'number' ||
      !Number.isFinite(currentTime) ||
      !Number.isFinite(duration)
    ) {
      return
    }
    const windows = BrowserWindow.getAllWindows()
    const projWin = getProjectionWindow()
    for (const win of windows) {
      if (win !== projWin && !win.isDestroyed()) {
        win.webContents.send(
          'projection:instrument-timeupdate',
          Math.max(0, currentTime),
          Math.max(0, duration)
        )
      }
    }
  })

  // Stage Display controls
  mainOnlyOn('stage:show', () => {
    showStageDisplayWindow()
  })

  mainOnlyOn('stage:hide', () => {
    hideStageDisplayWindow()
  })

  // Display info
  // Legacy 'display_get-all' handler removed — use 'display:get-all' (line 610)

  mainOnlyHandle('display:is-projection-visible', () => isProjectionVisible())
  mainOnlyHandle('display:has-external', () => hasExternalDisplay())

  // Database operations — Hymnals
  mainOnlyHandle('db:get-hymnals', () => getHymnals())
  mainOnlyHandle('db:add-hymnal', (_e, hymnal) => addHymnal(hymnalCreateSchema.parse(hymnal)))
  mainOnlyHandle('db:update-hymnal', (_e, id, hymnal) =>
    updateHymnal(parsePositiveId(id, 'Hymnal id'), hymnalUpdateSchema.parse(hymnal))
  )
  mainOnlyHandle('db:delete-hymnal', (_e, id) => deleteHymnal(parsePositiveId(id, 'Hymnal id')))

  // Database operations — Songs
  mainOnlyHandle('db:get-songs', (_e, hymnalId?) => getSongs(hymnalId))
  mainOnlyHandle('db:search-songs', (_e, query, hymnalId?, options?) => {
    const search = songSearchSchema.parse({ query, hymnalId, options })
    return searchSongs(search.query, search.hymnalId, search.options)
  })
  mainOnlyHandle('db:add-song', (_e, song) => addSong(songCreateSchema.parse(song)))
  mainOnlyHandle('db:import-json', (_e, payload) =>
    importSongsFromJson(songJsonImportSchema.parse(payload))
  )
  mainOnlyHandle('db:update-song', (_e, id, song) =>
    updateSong(parsePositiveId(id, 'Song id'), songUpdateSchema.parse(song))
  )
  mainOnlyHandle('db:delete-song', (_e, id) => deleteSong(parsePositiveId(id, 'Song id')))
  mainOnlyHandle('db:clear-lyrics', (_e, hymnalId, songNumbers) =>
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
  mainOnlyHandle('db:toggle-favorite', (_e, id) => toggleFavorite(id))
  mainOnlyHandle('db:get-song-note', (_e, songId) => getSongNote(songId))
  mainOnlyHandle('db:update-song-note', (_e, songId, noteText) => updateSongNote(songId, noteText))

  // Media Library
  safeIpcHandle('db:get-media-assets', (filters: unknown) => {
    return getMediaAssets(mediaFiltersSchema.parse(filters ?? undefined))
  })
  safeIpcHandle('db:get-media-collections', () => getMediaCollections())
  safeIpcHandle('db:import-media-assets', async (payload: unknown) => {
    if (activeMediaImportController) throw new Error('Import media lain masih berjalan.')
    const controller = new AbortController()
    activeMediaImportController = controller
    try {
      return await importMediaAssets(mediaImportSchema.parse(payload), {
        signal: controller.signal,
        onProgress: (progress) => {
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media:import-progress', progress)
          }
        }
      })
    } finally {
      if (activeMediaImportController === controller) activeMediaImportController = null
    }
  })
  safeIpcHandle('db:cancel-media-import', () => {
    if (!activeMediaImportController) return false
    activeMediaImportController.abort()
    return true
  })
  safeIpcHandle('db:add-local-external-media', (payload: unknown) => {
    const parsed = mediaImportSchema.parse(payload)
    return addLocalExternalMedia({
      filePaths: parsed.filePaths,
      category: parsed.category
    })
  })
  mainOnlyHandle('presentation:import-pptx', async (_event, payload: unknown) => {
    const parsed = presentationImportSchema.parse(payload)
    const onProgress = (
      percent: number,
      step: 'parsing' | 'converting' | 'generating' | 'finishing' | 'done' | 'failed',
      errorMessage?: string
    ): void => {
      _event.sender.send('presentation:import-progress', {
        filePath: parsed.filePath,
        percent,
        step,
        errorMessage
      })
    }

    try {
      const manifest = await createPresentationPackage(
        parsed.filePath,
        parsed.outputMode,
        onProgress
      )
      const asset = await registerPresentationPackageAsset({
        id: manifest.id,
        title: manifest.title,
        sourcePath: manifest.sourcePath,
        sourceSha256: manifest.sourceSha256,
        pdfPath: manifest.pdfPath,
        manifestPath: join(dirname(manifest.pdfPath), 'manifest.json'),
        thumbnailPath: manifest.slides[0]?.imagePath ?? '',
        slideCount: manifest.slideCount,
        conversionProvider: manifest.conversionProvider,
        outputMode: manifest.outputMode,
        warnings: manifest.warnings,
        slides: manifest.slides.map(({ index, title, notes, imagePath }) => ({
          index,
          title,
          notes,
          imagePath
        })),
        category: parsed.category
      })
      onProgress(100, 'done')
      return asset
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      onProgress(100, 'failed', errMsg)
      throw error
    }
  })
  safeIpcHandle('db:update-media-asset', (id: unknown, updates: unknown) => {
    return updateMediaAsset(mediaIdSchema.parse(id), mediaAssetUpdateSchema.parse(updates))
  })
  safeIpcHandle('db:delete-media-asset', (id: unknown) => {
    const mediaId = mediaIdSchema.parse(id)
    auditDestructiveAction('db:delete-media-asset', { id: mediaId })
    return deleteMediaAsset(mediaId)
  })
  safeIpcHandle('db:increment-media-asset-usage', (id: unknown) => {
    const mediaId = mediaIdSchema.parse(id)
    incrementMediaAssetUsage(mediaId)
  })
  safeIpcHandle('db:add-media-collection', (payload: unknown) => {
    return addMediaCollection(mediaCollectionCreateSchema.parse(payload))
  })
  safeIpcHandle('db:update-media-collection', (id: unknown, updates: unknown) => {
    return updateMediaCollection(
      mediaIdSchema.parse(id),
      mediaCollectionUpdateSchema.parse(updates)
    )
  })
  safeIpcHandle('db:delete-media-collection', (id: unknown) => {
    const collectionId = mediaIdSchema.parse(id)
    auditDestructiveAction('db:delete-media-collection', { id: collectionId })
    return deleteMediaCollection(collectionId)
  })
  safeIpcHandle('db:add-assets-to-media-collection', (collectionId: unknown, assetIds: unknown) => {
    return addAssetsToMediaCollection(
      mediaIdSchema.parse(collectionId),
      mediaIdsSchema.parse(assetIds)
    )
  })
  safeIpcHandle(
    'db:remove-assets-from-media-collection',
    (collectionId: unknown, assetIds: unknown) => {
      return removeAssetsFromMediaCollection(
        mediaIdSchema.parse(collectionId),
        mediaIdsSchema.parse(assetIds)
      )
    }
  )
  safeIpcHandle('db:reorder-media-collection-items', (collectionId: unknown, assetIds: unknown) => {
    return reorderMediaCollectionItems(
      mediaIdSchema.parse(collectionId),
      mediaIdsSchema.parse(assetIds)
    )
  })
  safeIpcHandle('db:bulk-update-media-assets', (payload: unknown) => {
    const parsed = mediaBulkUpdateSchema.parse(payload)
    return bulkUpdateMediaAssets(parsed.ids, {
      category: parsed.category,
      tags: parsed.tags,
      isFavorite: parsed.isFavorite
    })
  })
  safeIpcHandle('db:bulk-delete-media-assets', (ids: unknown) => {
    const safeIds = mediaIdsSchema.parse(ids)
    auditDestructiveAction('db:bulk-delete-media-assets', { count: safeIds.length })
    return bulkDeleteMediaAssets(safeIds)
  })

  // Song Relations
  mainOnlyHandle('db:get-song-relations', (_e, songId) => getSongRelations(songId))
  mainOnlyHandle('db:add-song-relation', (_e, relation) =>
    addSongRelation(songRelationSchema.parse(relation))
  )
  mainOnlyHandle('db:delete-song-relation', (_e, id) =>
    deleteSongRelation(parsePositiveId(id, 'Relation id'))
  )

  mainOnlyHandle('db:get-playlists', () => getPlaylists())
  mainOnlyHandle('db:add-playlist', (_e, playlist) =>
    addPlaylist(playlistCreateSchema.parse(playlist))
  )
  mainOnlyHandle('db:update-playlist', (_e, id, playlist) =>
    updatePlaylist(parsePositiveId(id, 'Playlist id'), playlistUpdateSchema.parse(playlist))
  )
  mainOnlyHandle('db:delete-playlist', (_e, id) =>
    deletePlaylist(parsePositiveId(id, 'Playlist id'))
  )
  mainOnlyHandle('db:get-playlist-items', (_e, playlistId) =>
    getPlaylistItems(parsePositiveId(playlistId, 'Playlist id'))
  )
  mainOnlyHandle('db:add-playlist-item', (_e, item) =>
    addPlaylistItem(playlistItemCreateSchema.parse(item))
  )
  mainOnlyHandle('db:add-bible-to-playlist', (_e, playlistId, bible) =>
    addBibleToPlaylist(parsePositiveId(playlistId, 'Playlist id'), playlistBibleSchema.parse(bible))
  )
  mainOnlyHandle('db:add-info-to-playlist', (_e, playlistId, info) =>
    addInfoToPlaylist(parsePositiveId(playlistId, 'Playlist id'), playlistInfoSchema.parse(info))
  )
  safeIpcHandle('db:add-media-to-playlist', (playlistId: unknown, media: unknown) => {
    const id = ensurePositiveInteger(playlistId, 'Invalid playlist id.')
    const raw = ensureObject(media, 'Invalid media playlist payload.')
    const presentationRaw = raw.presentation
    let presentation:
      | { slides: Array<{ index: number; title: string; notes: string; imagePath?: string }> }
      | undefined
    if (presentationRaw !== undefined) {
      const presentationObject = ensureObject(presentationRaw, 'Invalid presentation metadata.')
      if (!Array.isArray(presentationObject.slides) || presentationObject.slides.length > 2_000) {
        throw new Error('Invalid presentation slide metadata.')
      }
      presentation = {
        slides: presentationObject.slides.map((value, index) => {
          const slide = ensureObject(value, 'Invalid presentation slide.')
          const slideIndex = Number(slide.index)
          if (!Number.isInteger(slideIndex) || slideIndex < 0)
            throw new Error('Invalid presentation slide index.')
          return {
            index: slideIndex,
            title: String(slide.title ?? `Slide ${index + 1}`).slice(0, 300),
            notes: String(slide.notes ?? '').slice(0, 100_000),
            ...(typeof slide.imagePath === 'string' && slide.imagePath.trim()
              ? { imagePath: slide.imagePath.trim().slice(0, 2_000) }
              : {})
          }
        })
      }
    }
    return addMediaToPlaylist(id, {
      title: ensureNonEmptyString(raw.title, 'Media title is required.'),
      path: ensureNonEmptyString(raw.path, 'Media path is required.'),
      presentation
    })
  })
  mainOnlyHandle('db:update-playlist-item', (_e, id, data) =>
    updatePlaylistItem(
      parsePositiveId(id, 'Playlist item id'),
      playlistItemUpdateSchema.parse(data)
    )
  )
  mainOnlyHandle('db:delete-playlist-item', (_e, id) =>
    deletePlaylistItem(parsePositiveId(id, 'Playlist item id'))
  )
  mainOnlyHandle('db:reorder-playlist-items', (_e, items) =>
    reorderPlaylistItems(validateReorderPayload(items))
  )

  appWindowHandle('db:get-settings', () => getSettings())
  mainOnlyHandle('db:update-setting', (_e, key, value) => {
    const setting = validateSettingPayload(key, value)
    updateSetting(setting.key, setting.value)
    if (setting.key === 'projection_monitor_id' || setting.key === 'display_fullscreen') {
      repositionProjectionWindowFromSettings()
    }
    if (setting.key === 'stage_monitor_id' || setting.key === 'stage_display_fullscreen') {
      repositionStageDisplayWindowFromSettings()
    }
  })

  // History operations
  mainOnlyHandle('db:log-history', (_e, songId) => logSongHistory(songId))
  mainOnlyHandle('db:get-recent-songs', (_e, limit, hymnalId) => getRecentSongs(limit, hymnalId))

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
  mainOnlyHandle('db:save-session', (_e, state) => {
    requireSerializableSize(state, 'Recovery session', 2 * 1024 * 1024)
    return saveSessionState(state)
  })
  mainOnlyHandle('db:get-recovery-state', () => getRecoveryState())
  mainOnlyHandle('db:mark-clean-exit', () => markCleanExit())
  safeIpcHandle('db:reseed', (payload: unknown) => {
    const raw = ensureObject(payload, 'Invalid reseed payload.')
    if (raw.confirmToken !== RESEED_CONFIRM_TOKEN) {
      throw new Error('Reseed requires explicit confirmation token.')
    }
    auditDestructiveAction('db:reseed', { confirmed: true })
    return reseedDatabase()
  })
  mainOnlyHandle('db:check-multi-hymnal-integrity', (_e, hymnalId?) =>
    checkMultiHymnalIntegrity(hymnalId)
  )

  // ========== Bible IPC Handlers ==========
  mainOnlyHandle('db:get-bible-translations', () => getBibleTranslations())
  mainOnlyHandle('db:add-bible-translation', (_e, translation) =>
    addBibleTranslation(bibleTranslationSchema.parse(translation))
  )
  mainOnlyHandle('db:delete-bible-translation', (_e, id) =>
    deleteBibleTranslation(parsePositiveId(id, 'Bible translation id'))
  )
  mainOnlyHandle('db:get-bible-books', (_e, translationId) => getBibleBooks(translationId))
  mainOnlyHandle('db:add-bible-book', (_e, book) => addBibleBook(bibleBookSchema.parse(book)))
  mainOnlyHandle('db:get-bible-verses', (_e, translationId, bookId, chapter) =>
    getBibleVerses(translationId, bookId, chapter)
  )
  mainOnlyHandle('db:get-bible-verse-range', (_e, translationId, bookId, chapter, start, end) =>
    getBibleVerseRange(translationId, bookId, chapter, start, end)
  )
  mainOnlyHandle('db:add-bible-verse', (_e, verse) => addBibleVerse(bibleVerseSchema.parse(verse)))
  mainOnlyHandle('db:add-bible-verses-batch', (_e, verses) =>
    addBibleVersesBatch(bibleVersesBatchSchema.parse(verses))
  )
  mainOnlyHandle('db:search-bible-verses', (_e, query, translationId?) =>
    searchBibleVerses(query, translationId)
  )

  // Custom Slides operations
  mainOnlyHandle('db:get-custom-slides', () => getCustomSlides())
  mainOnlyHandle('db:get-slides-by-type', (_e, slideType) => getSlidesByType(slideType))
  mainOnlyHandle('db:add-custom-slide', (_e, slide) =>
    addCustomSlide(customSlideCreateSchema.parse(slide))
  )
  mainOnlyHandle('db:update-custom-slide', (_e, id, updates) =>
    updateCustomSlide(
      parsePositiveId(id, 'Custom slide id'),
      customSlideUpdateSchema.parse(updates)
    )
  )
  mainOnlyHandle('db:delete-custom-slide', (_e, id) =>
    deleteCustomSlide(parsePositiveId(id, 'Custom slide id'))
  )
  mainOnlyHandle('db:get-slide-groups', () => getSlideGroups())
  mainOnlyHandle('db:add-slide-group', (_e, group) =>
    addSlideGroup(slideGroupCreateSchema.parse(group))
  )
  mainOnlyHandle('db:update-slide-group', (_e, id, updates) =>
    updateSlideGroup(parsePositiveId(id, 'Slide group id'), slideGroupUpdateSchema.parse(updates))
  )
  mainOnlyHandle('db:delete-slide-group', (_e, id) =>
    deleteSlideGroup(parsePositiveId(id, 'Slide group id'))
  )
  mainOnlyHandle('db:get-group-slides', (_e, groupId) => getGroupSlides(groupId))
  mainOnlyHandle('db:add-slide-to-group', (_e, groupId, slideId, sortOrder?) =>
    addSlideToGroup(groupId, slideId, sortOrder)
  )
  mainOnlyHandle('db:remove-slide-from-group', (_e, groupId, slideId) =>
    removeSlideFromGroup(groupId, slideId)
  )
  mainOnlyHandle('db:reorder-group-slides', (_e, groupId, items) =>
    reorderGroupSlides(groupId, items)
  )

  // File parsing (hardened for xlsx vulnerability mitigation)
  safeIpcHandle('file:parse-excel', async (filePath: string) => {
    return parseExcelFile(filePath)
  })

  // File export - save dialog
  mainOnlyHandle('file:show-save-dialog', async (_e, options: unknown) => {
    const { dialog, BrowserWindow } = await import('electron')
    const mainWindow = BrowserWindow.getFocusedWindow()
    return dialog.showSaveDialog(mainWindow!, sanitizeSaveDialogOptions(options))
  })

  // File import - open dialog
  mainOnlyHandle('file:show-open-dialog', async (_e, options: unknown) => {
    const { dialog, BrowserWindow } = await import('electron')
    const mainWindow = BrowserWindow.getFocusedWindow()
    return dialog.showOpenDialog(mainWindow!, sanitizeOpenDialogOptions(options))
  })

  // File import - read JSON
  mainOnlyHandle('file:read-json', async (_e, filePath: string) => {
    const { readFile, stat } = await import('fs/promises')
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
      if ((await stat(filePath)).size > 25 * 1024 * 1024) {
        throw new Error('JSON file exceeds 25 MB.')
      }
      const raw = await readFile(filePath, 'utf8')
      return JSON.parse(raw)
    } catch (error) {
      console.error('Read JSON error:', error)
      throw error
    }
  })

  // File import - stream instrument folder without blocking the Electron event loop
  mainOnlyHandle('file:scan-instruments', async (_e, folderPath: string) => {
    const safeFolderPath = requireBoundedString(folderPath, 'Instrument folder path', 32_767)
    return scanInstrumentFolder(safeFolderPath)
  })
  // LRC support - read LRC file
  mainOnlyHandle('file:read-lrc', async (_e, audioFilePath: string) => {
    const { readFile, stat } = await import('fs/promises')
    const { dirname, basename, extname, isAbsolute, join } = await import('path')
    try {
      const safeAudioPath = requireBoundedString(audioFilePath, 'Audio file path', 32_767)
      if (!isAbsolute(safeAudioPath)) throw new Error('Audio file path must be absolute.')
      const dir = dirname(safeAudioPath)
      const ext = extname(safeAudioPath)
      const nameWithoutExt = basename(safeAudioPath, ext)
      const lrcPath = join(dir, nameWithoutExt + '.lrc')
      const lrcStats = await stat(lrcPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null
        throw error
      })
      if (!lrcStats) return null
      if (!lrcStats.isFile() || lrcStats.size > 2 * 1024 * 1024) {
        throw new Error('LRC file must be a regular file no larger than 2 MB.')
      }
      return await readFile(lrcPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null
        throw error
      })
    } catch (error) {
      console.error('Read LRC file error:', error)
      return null
    }
  })

  // LRC support - write LRC file
  mainOnlyHandle('file:write-lrc', async (_e, audioFilePath: string, content: string) => {
    const { writeFile } = await import('fs/promises')
    const { dirname, basename, extname, isAbsolute, join } = await import('path')
    try {
      const safeAudioPath = requireBoundedString(audioFilePath, 'Audio file path', 32_767)
      if (!isAbsolute(safeAudioPath)) throw new Error('Audio file path must be absolute.')
      requireBoundedString(content, 'LRC content', 2 * 1024 * 1024, true)
      const dir = dirname(safeAudioPath)
      const ext = extname(safeAudioPath)
      const nameWithoutExt = basename(safeAudioPath, ext)
      const lrcPath = join(dir, nameWithoutExt + '.lrc')
      await writeFile(lrcPath, content || '', 'utf8')
      return true
    } catch (error) {
      console.error('Write LRC file error:', error)
      return false
    }
  })

  // File export - write JSON
  mainOnlyHandle('file:write-json', async (_e, filePath: string, data: unknown) => {
    const { mkdir, writeFile } = await import('fs/promises')
    const { dirname, isAbsolute, extname } = await import('path')

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
      requireSerializableSize(data, 'JSON export', 25 * 1024 * 1024)

      // Ensure parent directory exists
      const parentDir = dirname(filePath)
      await mkdir(parentDir, { recursive: true })

      // Write JSON with pretty formatting
      const jsonStr = JSON.stringify(data, null, 2)
      await writeFile(filePath, jsonStr, 'utf8')
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
  mainOnlyOn('confidence:update', (_event, payload) => {
    requireSerializableSize(payload, 'Confidence payload', 512 * 1024)
    updateConfidencePayload(payload)
  })

  // Display:get-all alias (normalized channel name)
  mainOnlyHandle('display:get-all', () => getAllDisplays())

  // Debug report export for beta testers
  mainOnlyHandle('system:export-debug-report', async () => {
    return await exportDebugReport()
  })

  // ========== Bible Notes & Highlights ==========
  mainOnlyHandle('db:get-bible-note', (_e, bookCode: string, chapter: number, verse: number) =>
    getBibleNote(bookCode, chapter, verse)
  )
  mainOnlyHandle(
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
  mainOnlyHandle('db:get-bible-notes-for-chapter', (_e, bookCode: string, chapter: number) =>
    getBibleNotesForChapter(bookCode, chapter)
  )

  // ========== Content Pack & Bible Pack IPC ==========
  setupContentPackIPC()
  setupBiblePackIPC()
}
