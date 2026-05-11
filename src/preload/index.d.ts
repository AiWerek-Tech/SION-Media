import { ElectronAPI } from '@electron-toolkit/preload'

type EndpointId =
  | 'MAIN_DASHBOARD'
  | 'PROJECTION_WINDOW'
  | 'STAGE_DISPLAY'
  | 'MIDI_BRIDGE'
  | 'STREAM_DECK'
  | 'REMOTE_APP'

interface EndpointHealth {
  id: EndpointId
  connected: boolean
  lastSeen: number
  reconnectCount: number
  latencyMs?: number
  lastError?: string
  lastDisconnect?: number
}

type ScraperProviderHealth = 'OK' | 'DEGRADED' | 'BROKEN' | 'UNKNOWN'
type ScraperConflictPolicy = 'skip' | 'overwrite' | 'ask'
type ScraperImportAction = 'skip' | 'overwrite' | 'rename' | 'merge_metadata'

interface ScraperSong {
  providerId: string
  sourceUrl: string
  sourceHymnalCode: string
  sourceSongNumber: string
  title: string
  lyrics_raw: string
  key_note?: string
  time_signature?: string
  author?: string
  composer?: string
  category?: string
  tags?: string
}

interface ScraperStartPayload {
  providerId: string
  baseUrl?: string
  targetHymnalId: number
  startNumber: number
  endNumber: number
  concurrency: number
  retryCount: number
  delayMs: number
  conflictPolicy: ScraperConflictPolicy
  perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
}

interface ScraperProviderInfo {
  id: string
  label: string
  defaultBaseUrl: string
  capabilities: {
    supportsNumericRange: boolean
    supportsSlug: boolean
    requiresBrowser: boolean
    supportsMetadata: boolean
    supportsPreview: boolean
  }
}

interface ScraperConflictItem {
  key: string
  type: 'NUMBER_DUPLICATE' | 'TITLE_SIMILAR' | 'LYRICS_IDENTICAL'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reason: string
  scraped: ScraperSong
  existing: {
    id: number
    hymnal_id: number
    number: string
    title: string
    lyrics_raw: string
  }
  lyricsHashMatch: boolean
  titleSimilarity: number
  confidenceScore?: number
}

interface ScraperDryRunResult {
  taskId: string
  items: ScraperSong[]
  conflicts: ScraperConflictItem[]
}

interface ScraperImportSummary {
  taskId: string
  imported: number
  skipped: number
  overwritten: number
  renamed: number
  merged: number
  failed: number
  duplicates: number
  durationMs: number
  generatedAt: string
}

interface ScraperProgressPayload {
  taskId: string
  providerId: string
  state: 'RUNNING' | 'ABORTED' | 'COMPLETED' | 'IDLE'
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  retries: number
  songsPerSec: number
  etaSec: number | null
  recentLogs: Array<{
    ts: number
    level: 'INFO' | 'WARN' | 'ERROR'
    phase?: 'FETCH' | 'PARSE' | 'NORMALIZE' | 'DB' | 'FTS'
    message: string
    providerId?: string
    songNumber?: string
  }>
  recentSongUpdates: Array<{
    number: string
    status: 'PENDING' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
    attempts: number
    error?: string
    sourceUrl?: string
    title?: string
  }>
  failedNumbers: string[]
}

interface HymnalDto {
  id: number
  code: string
  name: string
  language: string
  region: string
  version: string
  publisher: string
  is_official: number
  created_at: string
  updated_at: string
}

interface SongDto {
  id: number
  hymnal_id: number
  number: string
  title: string
  alternate_title: string
  title_en?: string
  lyrics_raw: string
  category: string
  language: string
  author: string
  composer: string
  key_note: string
  time_signature: string
  tempo: string
  tags: string
  theme: string
  scripture_reference: string
  is_favorite: number
  created_at: string
  updated_at: string
  hymnal_code?: string
  hymnal_name?: string
  last_played?: string
  last_used?: string
}

interface SongMutationPayload {
  hymnal_id?: number
  number?: string
  title?: string
  alternate_title?: string
  lyrics_raw?: string
  category?: string
  language?: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  tempo?: string | number
  tags?: string
  title_en?: string
  theme?: string
  scripture_reference?: string
}

interface SongRelationDto {
  id: number
  song_id?: number
  related_song_id?: number
  relation_type?: string
  notes?: string
  number: string
  title: string
  hymnal_code: string
  created_at?: string
}

interface SongRelationCreatePayload {
  song_id: number
  related_song_id: number
  relation_type: string
  notes?: string
}

interface PlaylistDto {
  id: number
  name: string
  service_date: string
  description: string
  created_at: string
  updated_at: string
}

interface PlaylistItemDto {
  id: number
  playlist_id: number
  song_id: number
  sort_order: number
  section_label: string
  number: string
  title: string
  alternate_title: string
  lyrics_raw: string
  category: string
  key_note?: string
  time_signature?: string
  tempo?: string
  hymnal_code?: string
  hymnal_name?: string
}

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
  getAll: () => Promise<HymnalDto[]>
  add: (hymnal: unknown) => Promise<HymnalDto>
  update: (id: number, hymnal: unknown) => Promise<HymnalDto>
  delete: (id: number) => Promise<boolean>
}

interface SongsAPI {
  getAll: (hymnalId?: number) => Promise<SongDto[]>
  search: (
    query: string,
    hymnalId?: number,
    options?: { offset?: number; limit?: number }
  ) => Promise<SongDto[]>
  add: (song: SongMutationPayload) => Promise<number | SongDto>
  importJson: (payload: {
    items: SongMutationPayload[]
    defaultHymnalId?: number | null
    hymnalIdRemap?: Record<number, number>
    conflictPolicy?: 'skip' | 'overwrite' | 'append'
    perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
    dryRun?: boolean
  }) => Promise<{
    total: number
    validated: number
    conflicts: number
    inserted: number
    skipped: number
    updated_overwrite: number
    updated_append: number
    failed: number
    unknownHymnalIds: number[]
    errors: Array<{ index: number; message: string }>
    dryRun?: boolean
  }>
  update: (id: number, song: SongMutationPayload) => Promise<SongDto | boolean | void>
  delete: (id: number) => Promise<boolean>
  toggleFavorite: (id: number) => Promise<SongDto | boolean | void>
  getRelations: (songId: number) => Promise<SongRelationDto[]>
  addRelation: (relation: SongRelationCreatePayload) => Promise<SongRelationDto>
  deleteRelation: (id: number) => Promise<boolean>
}

interface PlaylistsAPI {
  getAll: () => Promise<PlaylistDto[]>
  add: (playlist: {
    name: string
    service_date: string
    description?: string
  }) => Promise<number | PlaylistDto>
  update: (
    id: number,
    playlist: { name?: string; service_date?: string; description?: string }
  ) => Promise<PlaylistDto>
  delete: (id: number) => Promise<boolean>
  getItems: (playlistId: number) => Promise<PlaylistItemDto[]>
  addItem: (item: {
    playlist_id: number
    song_id: number
    section_label?: string
    sort_order?: number
  }) => Promise<number | { id: number }>
  updateItem: (id: number, data: { section_label?: string; sort_order?: number }) => Promise<void>
  deleteItem: (id: number) => Promise<boolean>
  reorderItems: (items: Array<{ id: number; sort_order: number }>) => Promise<void>
}

interface SettingsAPI {
  getAll: () => Promise<Record<string, string>>
  update: (key: string, value: string) => Promise<void>
}

interface SystemAPI {
  logHistory: (songId: number) => Promise<void>
  getRecentSongs: (limit?: number) => Promise<SongDto[]>
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
  parseExcel: (filePath: string) => Promise<
    Array<{
      hymnal_id: number | string
      number: string
      title: string
      lyrics_raw: string
      category: string
      language: string
      author: string
      composer: string
      key_note: string
      tempo: string
      tags: string
    }>
  >
  showSaveDialog: (options: unknown) => Promise<{ canceled: boolean; filePath?: string }>
  writeJson: (filePath: string, data: unknown) => Promise<unknown>
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

interface HealthAPI {
  getStatus: () => Promise<EndpointHealth[]>
  onStatusUpdate: (callback: (status: EndpointHealth[]) => void) => () => void
  sendHeartbeat: (endpointId: EndpointId) => void
  onHeartbeatAck: (callback: (data: { id: EndpointId; timestamp: number }) => void) => () => void
}

interface ScraperAPI {
  getProviders: () => Promise<ScraperProviderInfo[]>
  getProviderDefinitions: () => Promise<unknown[]>
  validateProvider: (payload: { providerId: string; baseUrl?: string }) => Promise<unknown>
  getProviderHealth: (payload: { providerId: string }) => Promise<ScraperProviderHealth>
  preview: (payload: {
    providerId: string
    input: string
    baseUrl?: string
  }) => Promise<ScraperSong>
  dryRun: (payload: ScraperStartPayload) => Promise<ScraperDryRunResult>
  importFromDryRun: (payload: {
    taskId: string
    request: ScraperStartPayload
    items: ScraperSong[]
    decisions: Record<string, { action: ScraperImportAction; renameTitle?: string }>
    defaultAction: ScraperImportAction
  }) => Promise<ScraperImportSummary>
  start: (payload: ScraperStartPayload) => Promise<{ taskId: string }>
  abort: () => Promise<boolean>
  retryFailed: () => Promise<{ restarted: boolean; taskId?: string }>
  onProgress: (callback: (payload: ScraperProgressPayload) => void) => () => void
  getAuditHistory: (payload: { hymnalId?: number; limit?: number }) => Promise<unknown[]>
  getAuditDetail: (taskId: string) => Promise<unknown>
  getSavedDryRunState: () => Promise<unknown>
  clearSavedDryRunState: () => Promise<boolean>
  getSavedRunningTaskState: () => Promise<unknown>
  clearSavedRunningTaskState: () => Promise<boolean>
  resumeFailed: (payload: { request: ScraperStartPayload; failedNumbers: string[] }) => Promise<{
    taskId: string
  }>
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
  health: HealthAPI
  scraper: ScraperAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
