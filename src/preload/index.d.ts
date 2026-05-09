import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void
}

interface AppThemeAPI {
  setMode: (payload: { mode: string; effective: 'dark' | 'light' }) => void
  onUpdated: (callback: (payload: { mode: string; effective: string }) => void) => () => void
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

interface HymnalsAPI {
  getAll: () => Promise<unknown[]>
  add: (hymnal: unknown) => Promise<unknown>
  update: (id: number, hymnal: unknown) => Promise<unknown>
  delete: (id: number) => Promise<boolean>
}

interface SongsAPI {
  getAll: (hymnalId?: number) => Promise<unknown[]>
  search: (
    query: string,
    hymnalId?: number,
    options?: { offset?: number; limit?: number }
  ) => Promise<unknown[]>
  add: (song: unknown) => Promise<unknown>
  update: (id: number, song: unknown) => Promise<unknown>
  delete: (id: number) => Promise<boolean>
  toggleFavorite: (id: number) => Promise<unknown>
  getRelations: (songId: number) => Promise<unknown[]>
  addRelation: (relation: unknown) => Promise<unknown>
  deleteRelation: (id: number) => Promise<boolean>
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
  checkMultiHymnalIntegrity: (hymnalId?: number) => Promise<unknown>
  getMemory: () => Promise<unknown>
  setMode: (mode: string) => Promise<void>
}

interface FileAPI {
  parseExcel: (filePath: string) => Promise<unknown[]>
}

interface BibleAPI {
  getTranslations: () => Promise<unknown[]>
  addTranslation: (translation: unknown) => Promise<unknown>
  deleteTranslation: (id: number) => Promise<unknown>
  getBooks: (translationId: number) => Promise<unknown[]>
  addBook: (book: unknown) => Promise<unknown>
  getVerses: (translationId: number, bookId: number, chapter: number) => Promise<unknown[]>
  getVerseRange: (
    translationId: number,
    bookId: number,
    chapter: number,
    verseStart: number,
    verseEnd: number
  ) => Promise<unknown[]>
  addVerse: (verse: unknown) => Promise<unknown>
  addVersesBatch: (verses: unknown[]) => Promise<void>
  searchVerses: (query: string, translationId?: number) => Promise<unknown[]>
}

interface SlidesAPI {
  getAll: () => Promise<unknown[]>
  getByType: (slideType: string) => Promise<unknown[]>
  add: (slide: unknown) => Promise<unknown>
  update: (id: number, updates: unknown) => Promise<unknown>
  delete: (id: number) => Promise<unknown>
  getGroups: () => Promise<unknown[]>
  addGroup: (group: unknown) => Promise<unknown>
  updateGroup: (id: number, updates: unknown) => Promise<unknown>
  deleteGroup: (id: number) => Promise<unknown>
  getGroupSlides: (groupId: number) => Promise<unknown[]>
  addSlideToGroup: (groupId: number, slideId: number, sortOrder?: number) => Promise<unknown>
  removeSlideFromGroup: (groupId: number, slideId: number) => Promise<unknown>
  reorderGroupSlides: (
    groupId: number,
    items: Array<{ slide_id: number; sort_order: number }>
  ) => Promise<void>
}

interface API {
  window: WindowAPI
  appTheme: AppThemeAPI
  projection: ProjectionAPI
  stage: StageAPI
  display: DisplayAPI
  hymnals: HymnalsAPI
  songs: SongsAPI
  playlists: PlaylistsAPI
  settings: SettingsAPI
  system: SystemAPI
  file: FileAPI
  bible: BibleAPI
  slides: SlidesAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
