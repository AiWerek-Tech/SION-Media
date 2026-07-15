import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Window Controls
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChanged: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, val: boolean): void => callback(val)
      ipcRenderer.on('window:maximized-changed', listener)
      return () => ipcRenderer.removeListener('window:maximized-changed', listener)
    },
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version')
  },

  // App theme sync
  appTheme: {
    setMode: (payload: { mode: string; effective: 'dark' | 'light' }): void =>
      ipcRenderer.send('app:theme-mode-set', payload),
    onUpdated: (callback: (payload: { mode: string; effective: string }) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, payload: { mode: string; effective: string }): void =>
        callback(payload)
      ipcRenderer.on('app:theme-updated', listener)
      return () => ipcRenderer.removeListener('app:theme-updated', listener)
    }
  },
  app: {
    notifyShellReady: (): void => ipcRenderer.send('app:renderer-shell-ready'),
    isSafeMode: (): Promise<boolean> => ipcRenderer.invoke('app:get-safe-mode')
  },

  // Projection
  projection: {
    slideUpdate: (slideData: unknown): void =>
      ipcRenderer.send('projection:slide-update', slideData),
    stateChange: (state: string): void => ipcRenderer.send('projection:state-change', state),
    themeUpdate: (theme: unknown): void => ipcRenderer.send('projection:theme-update', theme),
    show: (): void => ipcRenderer.send('projection:show'),
    hide: (): void => ipcRenderer.send('projection:hide'),
    onSlideUpdate: (callback: (data: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on('projection:slide-update', listener)
      return () => ipcRenderer.removeListener('projection:slide-update', listener)
    },
    onStateChange: (callback: (state: string) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, state: string): void => callback(state)
      ipcRenderer.on('projection:state-change', listener)
      return () => ipcRenderer.removeListener('projection:state-change', listener)
    },
    onThemeUpdate: (callback: (theme: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, theme: unknown): void => callback(theme)
      ipcRenderer.on('projection:theme-update', listener)
      return () => ipcRenderer.removeListener('projection:theme-update', listener)
    },
    emergencyUpdate: (payload: { active: boolean; message?: string; subMessage?: string }): void =>
      ipcRenderer.send('projection:emergency', payload),
    onEmergencyUpdate: (
      callback: (payload: { active: boolean; message?: string; subMessage?: string }) => void
    ): (() => void) => {
      const listener = (
        _e: IpcRendererEvent,
        payload: { active: boolean; message?: string; subMessage?: string }
      ): void => callback(payload)
      ipcRenderer.on('projection:emergency', listener)
      return () => ipcRenderer.removeListener('projection:emergency', listener)
    },
    videoControl: (command: string, value?: unknown): void =>
      ipcRenderer.send('projection:video-control', command, value),
    onVideoControl: (callback: (command: string, value: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, command: string, value: unknown): void =>
        callback(command, value)
      ipcRenderer.on('projection:video-control', listener)
      return () => ipcRenderer.removeListener('projection:video-control', listener)
    },
    instrumentControl: (command: string, value?: unknown): void =>
      ipcRenderer.send('projection:instrument-control', command, value),
    onInstrumentControl: (callback: (command: string, value: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, command: string, value: unknown): void =>
        callback(command, value)
      ipcRenderer.on('projection:instrument-control', listener)
      return () => ipcRenderer.removeListener('projection:instrument-control', listener)
    },
    instrumentTimeUpdate: (currentTime: number, duration: number): void =>
      ipcRenderer.send('projection:instrument-timeupdate', currentTime, duration),
    onInstrumentTimeUpdate: (
      callback: (currentTime: number, duration: number) => void
    ): (() => void) => {
      const listener = (_e: IpcRendererEvent, currentTime: number, duration: number): void =>
        callback(currentTime, duration)
      ipcRenderer.on('projection:instrument-timeupdate', listener)
      return () => ipcRenderer.removeListener('projection:instrument-timeupdate', listener)
    }
  },

  // Stage Display
  stage: {
    show: (): void => ipcRenderer.send('stage:show'),
    hide: (): void => ipcRenderer.send('stage:hide')
  },

  presenterRemote: {
    start: (): Promise<unknown> => ipcRenderer.invoke('presenter-remote:start'),
    stop: (): Promise<unknown> => ipcRenderer.invoke('presenter-remote:stop'),
    status: (): Promise<unknown> => ipcRenderer.invoke('presenter-remote:status'),
    regenerateCodes: (): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:regenerate-codes'),
    regenerateCode: (role: string): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:regenerate-code', role),
    disconnectClients: (): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:disconnect-clients'),
    disconnectClient: (clientId: string): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:disconnect-client', clientId),
    updateSecurityPolicy: (policy: unknown): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:update-security-policy', policy),
    clearCommandLog: (): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:clear-command-log'),
    powerPointStatus: (): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:powerpoint-status'),
    approvePowerPointRequest: (requestId: string): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:powerpoint-approve', requestId),
    rejectPowerPointRequest: (requestId: string): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:powerpoint-reject', requestId),
    disconnectPowerPointDevice: (deviceId: string): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:powerpoint-disconnect', deviceId),
    sendPowerPointCommand: (deviceId: string, command: 'NEXT' | 'PREV'): Promise<unknown> =>
      ipcRenderer.invoke('presenter-remote:powerpoint-command', deviceId, command),
    updateSnapshot: (snapshot: unknown): void =>
      ipcRenderer.send('presenter-remote:update-snapshot', snapshot),
    onCommand: (callback: (command: string, payload?: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, command: string, payload?: unknown): void =>
        callback(command, payload)
      ipcRenderer.on('presenter-remote:command', listener)
      return () => ipcRenderer.removeListener('presenter-remote:command', listener)
    },
    onPowerPointStatus: (callback: (status: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, status: unknown): void => callback(status)
      ipcRenderer.on('powerpoint-bridge:status', listener)
      return () => ipcRenderer.removeListener('powerpoint-bridge:status', listener)
    }
  },

  obsSrt: {
    status: (): Promise<unknown> => ipcRenderer.invoke('obs-srt:status'),
    start: (): Promise<unknown> => ipcRenderer.invoke('obs-srt:start'),
    stop: (): Promise<unknown> => ipcRenderer.invoke('obs-srt:stop'),
    updateConfig: (config: unknown): Promise<unknown> =>
      ipcRenderer.invoke('obs-srt:update-config', config)
  },

  obsSrtIngest: {
    status: (): Promise<unknown> => ipcRenderer.invoke('obs-srt-ingest:status'),
    start: (): Promise<unknown> => ipcRenderer.invoke('obs-srt-ingest:start'),
    stop: (): Promise<unknown> => ipcRenderer.invoke('obs-srt-ingest:stop'),
    setAutoStart: (autoStart: boolean): Promise<unknown> =>
      ipcRenderer.invoke('obs-srt-ingest:set-auto-start', autoStart),
    updateConfig: (config: unknown): Promise<unknown> =>
      ipcRenderer.invoke('obs-srt-ingest:update-config', config)
  },

  // Display
  display: {
    // FIX ARCH-04: updated to use the standardised colon-separated channel name
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('display:get-all'),
    isProjectionVisible: (): Promise<boolean> =>
      ipcRenderer.invoke('display:is-projection-visible'),
    hasExternal: (): Promise<boolean> => ipcRenderer.invoke('display:has-external'),
    onDisplayChanged: (callback: (count: number) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, count: number): void => callback(count)
      ipcRenderer.on('display:changed', listener)
      return () => ipcRenderer.removeListener('display:changed', listener)
    }
  },

  // Hymnals (Multi-Hymnal)
  hymnals: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-hymnals'),
    add: (hymnal: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-hymnal', hymnal),
    update: (id: number, hymnal: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-hymnal', id, hymnal),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-hymnal', id)
  },

  // Songs
  songs: {
    getAll: (hymnalId?: number): Promise<unknown[]> => ipcRenderer.invoke('db:get-songs', hymnalId),
    search: (
      query: string,
      hymnalId?: number,
      options?: { offset?: number; limit?: number }
    ): Promise<unknown[]> => ipcRenderer.invoke('db:search-songs', query, hymnalId, options),
    add: (song: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-song', song),
    importJson: (payload: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:import-json', payload),
    update: (id: number, song: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-song', id, song),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-song', id),
    clearLyrics: (hymnalId: number, songNumbers: string[]): Promise<number> =>
      ipcRenderer.invoke('db:clear-lyrics', hymnalId, songNumbers),
    bulkAssignBackground: (payload: unknown): Promise<number> =>
      ipcRenderer.invoke('db:bulk-assign-song-background', payload),
    toggleFavorite: (id: number): Promise<unknown> => ipcRenderer.invoke('db:toggle-favorite', id),
    getRelations: (songId: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-song-relations', songId),
    addRelation: (relation: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-song-relation', relation),
    deleteRelation: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('db:delete-song-relation', id),
    // Phase 1 — Enterprise Refactor
    duplicate: (id: number): Promise<unknown> => ipcRenderer.invoke('db:duplicate-song', id),
    getSummary: (hymnalId?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-songs-summary', hymnalId),
    getNote: (songId: number): Promise<string> => ipcRenderer.invoke('db:get-song-note', songId),
    updateNote: (songId: number, noteText: string): Promise<string> =>
      ipcRenderer.invoke('db:update-song-note', songId, noteText)
  },

  // Playlists
  playlists: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-playlists'),
    add: (playlist: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-playlist', playlist),
    update: (id: number, playlist: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-playlist', id, playlist),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-playlist', id),
    getItems: (playlistId: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-playlist-items', playlistId),
    addItem: (item: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-playlist-item', item),
    addBible: (playlistId: number, bible: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-bible-to-playlist', playlistId, bible),
    addInfo: (playlistId: number, info: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-info-to-playlist', playlistId, info),
    addMedia: (playlistId: number, media: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-media-to-playlist', playlistId, media),
    updateItem: (id: number, data: unknown): Promise<void> =>
      ipcRenderer.invoke('db:update-playlist-item', id, data),
    deleteItem: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-playlist-item', id),
    reorderItems: (items: unknown[]): Promise<void> =>
      ipcRenderer.invoke('db:reorder-playlist-items', items)
  },

  // Settings
  settings: {
    getAll: (): Promise<Record<string, string>> => ipcRenderer.invoke('db:get-settings'),
    update: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('db:update-setting', key, value)
  },

  // Database / Backup / Crash Recovery
  system: {
    logHistory: (songId: number): Promise<void> => ipcRenderer.invoke('db:log-history', songId),
    getRecentSongs: (limit: number = 20, hymnalId?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-recent-songs', limit, hymnalId),
    createBackup: (customPath?: string): Promise<string> =>
      ipcRenderer.invoke('db:create-backup', customPath),
    restoreBackup: (backupPath: string): Promise<boolean> =>
      ipcRenderer.invoke('db:restore-backup', { backupPath, confirmRestore: true }),
    saveSession: (state: unknown): Promise<void> => ipcRenderer.invoke('db:save-session', state),
    getRecoveryState: (): Promise<unknown> => ipcRenderer.invoke('db:get-recovery-state'),
    markCleanExit: (): Promise<void> => ipcRenderer.invoke('db:mark-clean-exit'),
    reseed: (): Promise<void> =>
      ipcRenderer.invoke('db:reseed', { confirmToken: 'RESEED_DATABASE' }),
    checkMultiHymnalIntegrity: (hymnalId?: number): Promise<unknown> =>
      ipcRenderer.invoke('db:check-multi-hymnal-integrity', hymnalId),
    getMemory: (): Promise<unknown> => ipcRenderer.invoke('system:get-memory'),
    setMode: (mode: string): Promise<void> => ipcRenderer.invoke('system:set-mode', mode),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('system:open-external', url),
    // Phase 1 — Enterprise Refactor
    getStorageStats: (): Promise<unknown> => ipcRenderer.invoke('system:get-storage-stats'),
    // Beta debug report export
    exportDebugReport: (): Promise<unknown> => ipcRenderer.invoke('system:export-debug-report')
  },

  // File System
  file: {
    parseExcel: (filePath: string): Promise<unknown[]> =>
      ipcRenderer.invoke('file:parse-excel', filePath),
    showSaveDialog: (options: unknown): Promise<unknown> =>
      ipcRenderer.invoke('file:show-save-dialog', options),
    showOpenDialog: (options: unknown): Promise<unknown> =>
      ipcRenderer.invoke('file:show-open-dialog', options),
    writeJson: (filePath: string, data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('file:write-json', filePath, data),
    readJson: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('file:read-json', filePath),
    scanInstruments: (folderPath: string): Promise<unknown[]> =>
      ipcRenderer.invoke('file:scan-instruments', folderPath),
    readLrc: (audioFilePath: string): Promise<string | null> =>
      ipcRenderer.invoke('file:read-lrc', audioFilePath),
    writeLrc: (audioFilePath: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke('file:write-lrc', audioFilePath, content)
  },

  // Media Library
  media: {
    getAll: (filters?: unknown): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-media-assets', filters),
    getCollections: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-media-collections'),
    importAssets: (payload: unknown): Promise<unknown[]> =>
      ipcRenderer.invoke('db:import-media-assets', payload),
    cancelImport: (): Promise<boolean> => ipcRenderer.invoke('db:cancel-media-import'),
    onImportProgress: (
      callback: (progress: {
        completed: number
        total: number
        phase: 'preparing' | 'thumbnail' | 'committing' | 'complete'
        fileName: string
      }) => void
    ): (() => void) => {
      const listener = (_event: IpcRendererEvent, progress: Parameters<typeof callback>[0]): void =>
        callback(progress)
      ipcRenderer.on('media:import-progress', listener)
      return () => ipcRenderer.removeListener('media:import-progress', listener)
    },
    addLocalExternalMedia: (payload: unknown): Promise<unknown[]> =>
      ipcRenderer.invoke('db:add-local-external-media', payload),
    importPresentation: (payload: unknown): Promise<unknown> =>
      ipcRenderer.invoke('presentation:import-pptx', payload),
    update: (id: string, updates: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-media-asset', id, updates),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('db:delete-media-asset', id),
    incrementUsage: (id: string): Promise<void> =>
      ipcRenderer.invoke('db:increment-media-asset-usage', id),
    addCollection: (payload: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-media-collection', payload),
    updateCollection: (id: string, updates: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-media-collection', id, updates),
    deleteCollection: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('db:delete-media-collection', id),
    addAssetsToCollection: (collectionId: string, assetIds: string[]): Promise<unknown> =>
      ipcRenderer.invoke('db:add-assets-to-media-collection', collectionId, assetIds),
    removeAssetsFromCollection: (collectionId: string, assetIds: string[]): Promise<unknown> =>
      ipcRenderer.invoke('db:remove-assets-from-media-collection', collectionId, assetIds),
    reorderCollectionItems: (collectionId: string, assetIds: string[]): Promise<unknown> =>
      ipcRenderer.invoke('db:reorder-media-collection-items', collectionId, assetIds),
    bulkUpdate: (payload: unknown): Promise<number> =>
      ipcRenderer.invoke('db:bulk-update-media-assets', payload),
    bulkDelete: (ids: string[]): Promise<number> =>
      ipcRenderer.invoke('db:bulk-delete-media-assets', ids)
  },

  // Bible
  bible: {
    getTranslations: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-bible-translations'),
    addTranslation: (translation: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-bible-translation', translation),
    deleteTranslation: (id: number): Promise<unknown> =>
      ipcRenderer.invoke('db:delete-bible-translation', id),
    getBooks: (translationId: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-bible-books', translationId),
    addBook: (book: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-bible-book', book),
    getVerses: (translationId: number, bookId: number, chapter: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-bible-verses', translationId, bookId, chapter),
    getVerseRange: (
      translationId: number,
      bookId: number,
      chapter: number,
      verseStart: number,
      verseEnd: number
    ): Promise<unknown[]> =>
      ipcRenderer.invoke(
        'db:get-bible-verse-range',
        translationId,
        bookId,
        chapter,
        verseStart,
        verseEnd
      ),
    addVerse: (verse: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-bible-verse', verse),
    addVersesBatch: (verses: unknown[]): Promise<void> =>
      ipcRenderer.invoke('db:add-bible-verses-batch', verses),
    searchVerses: (query: string, translationId?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:search-bible-verses', query, translationId)
  },

  // Custom Slides
  slides: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-custom-slides'),
    getByType: (slideType: string): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-slides-by-type', slideType),
    add: (slide: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-custom-slide', slide),
    update: (id: number, updates: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-custom-slide', id, updates),
    delete: (id: number): Promise<unknown> => ipcRenderer.invoke('db:delete-custom-slide', id),
    getGroups: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-slide-groups'),
    addGroup: (group: unknown): Promise<unknown> => ipcRenderer.invoke('db:add-slide-group', group),
    updateGroup: (id: number, updates: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-slide-group', id, updates),
    deleteGroup: (id: number): Promise<unknown> => ipcRenderer.invoke('db:delete-slide-group', id),
    getGroupSlides: (groupId: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-group-slides', groupId),
    addSlideToGroup: (groupId: number, slideId: number, sortOrder?: number): Promise<unknown> =>
      ipcRenderer.invoke('db:add-slide-to-group', groupId, slideId, sortOrder),
    removeSlideFromGroup: (groupId: number, slideId: number): Promise<unknown> =>
      ipcRenderer.invoke('db:remove-slide-from-group', groupId, slideId),
    reorderGroupSlides: (
      groupId: number,
      items: Array<{ slide_id: number; sort_order: number }>
    ): Promise<void> => ipcRenderer.invoke('db:reorder-group-slides', groupId, items)
  },

  // IPC Health
  health: {
    sendHeartbeat: (endpointId: string): void => ipcRenderer.send('health:heartbeat', endpointId),
    getStatus: (): Promise<unknown[]> => ipcRenderer.invoke('health:get-status'),
    onStatusUpdate: (callback: (status: unknown[]) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, status: unknown[]): void => callback(status)
      ipcRenderer.on('health:status-update', listener)
      return () => ipcRenderer.removeListener('health:status-update', listener)
    },
    onHeartbeatAck: (callback: (data: { id: string; timestamp: number }) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, data: { id: string; timestamp: number }): void =>
        callback(data)
      ipcRenderer.on('health:heartbeat-ack', listener)
      return () => ipcRenderer.removeListener('health:heartbeat-ack', listener)
    }
  },

  // ════════════════════════════════════════════════════════════════
  // Phase 1 — Enterprise Refactor Bridge Entries (additive only)
  // @see implementation-master-order-v1.md §3.2 Sequence 1.6
  // ════════════════════════════════════════════════════════════════

  // Confidence Monitor
  confidence: {
    update: (payload: unknown): void => ipcRenderer.send('confidence:update', payload),
    onUpdate: (callback: (data: unknown) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, data: unknown): void => callback(data)
      ipcRenderer.on('confidence:update', listener)
      return () => ipcRenderer.removeListener('confidence:update', listener)
    }
  },

  // ════════════════════════════════════════════════════════════════
  // Content Pack Management & Bible Pack (External SQLite System)
  // ════════════════════════════════════════════════════════════════

  contentPacks: {
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke('contentPacks:selectFolder'),
    previewBiblePack: (folderPath: string): Promise<unknown> =>
      ipcRenderer.invoke('contentPacks:previewBiblePack', folderPath),
    installBiblePack: (folderPath: string): Promise<unknown> =>
      ipcRenderer.invoke('contentPacks:installBiblePack', folderPath),
    list: (packType?: string): Promise<unknown[]> =>
      ipcRenderer.invoke('contentPacks:list', packType),
    remove: (packId: string): Promise<boolean> => ipcRenderer.invoke('contentPacks:remove', packId),
    setDefault: (packId: string): Promise<unknown> =>
      ipcRenderer.invoke('contentPacks:setDefault', packId)
  },

  biblePack: {
    getVersions: (): Promise<unknown[]> => ipcRenderer.invoke('bible:versions:list'),
    getBooks: (versionCode: string): Promise<unknown[]> =>
      ipcRenderer.invoke('bible:books:list', versionCode),
    getChapter: (versionCode: string, bookCode: string, chapter: number): Promise<unknown[]> =>
      ipcRenderer.invoke('bible:chapter:get', versionCode, bookCode, chapter),
    getVerseRange: (
      versionCode: string,
      bookCode: string,
      chapter: number,
      verseStart: number,
      verseEnd: number
    ): Promise<unknown[]> =>
      ipcRenderer.invoke(
        'bible:verseRange:get',
        versionCode,
        bookCode,
        chapter,
        verseStart,
        verseEnd
      ),
    search: (versionCode: string, query: string, limit?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('bible:search', versionCode, query, limit),
    parseReference: (referenceStr: string): Promise<unknown> =>
      ipcRenderer.invoke('bible:reference:parse', referenceStr),
    // Bible notes & highlights
    getNote: (bookCode: string, chapter: number, verse: number): Promise<unknown> =>
      ipcRenderer.invoke('db:get-bible-note', bookCode, chapter, verse),
    updateNote: (
      bookCode: string,
      chapter: number,
      verse: number,
      noteText: string,
      highlightColor: string
    ): Promise<void> =>
      ipcRenderer.invoke(
        'db:update-bible-note',
        bookCode,
        chapter,
        verse,
        noteText,
        highlightColor
      ),
    getNotesForChapter: (bookCode: string, chapter: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-bible-notes-for-chapter', bookCode, chapter)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore: Exposing API to window object when context isolation is disabled
  window.electron = electronAPI
  // @ts-ignore: Exposing API to window object when context isolation is disabled
  window.api = api
}
