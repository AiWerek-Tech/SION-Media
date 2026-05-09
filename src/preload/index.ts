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
    }
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
    }
  },

  // Stage Display
  stage: {
    show: (): void => ipcRenderer.send('stage:show'),
    hide: (): void => ipcRenderer.send('stage:hide')
  },

  // Display
  display: {
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('display_get-all'),
    isProjectionVisible: (): Promise<boolean> =>
      ipcRenderer.invoke('display:is-projection-visible'),
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
    update: (id: number, song: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:update-song', id, song),
    delete: (id: number): Promise<boolean> => ipcRenderer.invoke('db:delete-song', id),
    toggleFavorite: (id: number): Promise<unknown> => ipcRenderer.invoke('db:toggle-favorite', id),
    getRelations: (songId: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-song-relations', songId),
    addRelation: (relation: unknown): Promise<unknown> =>
      ipcRenderer.invoke('db:add-song-relation', relation),
    deleteRelation: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('db:delete-song-relation', id)
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
    getRecentSongs: (limit: number = 20): Promise<unknown[]> =>
      ipcRenderer.invoke('db:get-recent-songs', limit),
    createBackup: (customPath?: string): Promise<string> =>
      ipcRenderer.invoke('db:create-backup', customPath),
    restoreBackup: (backupPath: string): Promise<boolean> =>
      ipcRenderer.invoke('db:restore-backup', backupPath),
    saveSession: (state: unknown): Promise<void> => ipcRenderer.invoke('db:save-session', state),
    getRecoveryState: (): Promise<unknown> => ipcRenderer.invoke('db:get-recovery-state'),
    markCleanExit: (): Promise<void> => ipcRenderer.invoke('db:mark-clean-exit'),
    reseed: (): Promise<void> => ipcRenderer.invoke('db:reseed'),
    checkMultiHymnalIntegrity: (hymnalId?: number): Promise<unknown> =>
      ipcRenderer.invoke('db:check-multi-hymnal-integrity', hymnalId),
    getMemory: (): Promise<unknown> => ipcRenderer.invoke('system:get-memory'),
    setMode: (mode: string): Promise<void> => ipcRenderer.invoke('system:set-mode', mode)
  },

  // File System
  file: {
    parseExcel: (filePath: string): Promise<unknown[]> =>
      ipcRenderer.invoke('file:parse-excel', filePath)
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
