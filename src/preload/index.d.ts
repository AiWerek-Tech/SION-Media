import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void
}

interface ProjectionAPI {
  slideUpdate: (slideData: unknown) => void
  stateChange: (state: string) => void
  themeUpdate: (theme: unknown) => void
  show: () => void
  hide: () => void
  onSlideUpdate: (callback: (data: unknown) => void) => () => void
  onStateChange: (callback: (state: string) => void) => () => void
  onThemeUpdate: (callback: (theme: unknown) => void) => () => void
}

interface StageAPI {
  show: () => void
  hide: () => void
}

interface DisplayAPI {
  getAll: () => Promise<unknown[]>
  isProjectionVisible: () => Promise<boolean>
  onDisplayChanged: (callback: (count: number) => void) => () => void
}

interface SongsAPI {
  getAll: () => Promise<unknown[]>
  search: (query: string) => Promise<unknown[]>
  add: (song: unknown) => Promise<unknown>
  update: (id: number, song: unknown) => Promise<unknown>
  delete: (id: number) => Promise<boolean>
  toggleFavorite: (id: number) => Promise<unknown>
}

interface PlaylistsAPI {
  getAll: () => Promise<unknown[]>
  add: (playlist: unknown) => Promise<unknown>
  update: (id: number, playlist: unknown) => Promise<unknown>
  delete: (id: number) => Promise<boolean>
  getItems: (playlistId: number) => Promise<unknown[]>
  addItem: (item: unknown) => Promise<unknown>
  updateItem: (id: number, data: unknown) => Promise<void>
  deleteItem: (id: number) => Promise<boolean>
  reorderItems: (items: unknown[]) => Promise<void>
}

interface SettingsAPI {
  getAll: () => Promise<Record<string, string>>
  update: (key: string, value: string) => Promise<void>
}

interface SystemAPI {
  logHistory: (songId: number) => Promise<void>
  getRecentSongs: (limit?: number) => Promise<unknown[]>
  createBackup: (customPath?: string) => Promise<string>
  restoreBackup: (backupPath: string) => Promise<boolean>
  saveSession: (state: unknown) => Promise<void>
  getRecoveryState: () => Promise<unknown>
  markCleanExit: () => Promise<void>
  reseed: () => Promise<void>
  getMemory: () => Promise<unknown>
}

interface FileAPI {
  parseExcel: (filePath: string) => Promise<unknown[]>
}

interface API {
  window: WindowAPI
  projection: ProjectionAPI
  stage: StageAPI
  display: DisplayAPI
  songs: SongsAPI
  playlists: PlaylistsAPI
  settings: SettingsAPI
  system: SystemAPI
  file: FileAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
