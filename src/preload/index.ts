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
    getAll: (): Promise<unknown[]> => ipcRenderer.invoke('display:get-all'),
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
    search: (query: string, hymnalId?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('db:search-songs', query, hymnalId),
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
    getMemory: (): Promise<unknown> => ipcRenderer.invoke('system:get-memory'),
    setMode: (mode: string): Promise<void> => ipcRenderer.invoke('system:set-mode', mode)
  },

  // File System
  file: {
    parseExcel: (filePath: string): Promise<unknown[]> =>
      ipcRenderer.invoke('file:parse-excel', filePath)
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
