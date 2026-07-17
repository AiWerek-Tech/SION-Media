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
  song_background_config?: string
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
  song_background_config?: string
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
  song_id: number | null
  sort_order: number
  section_label: string
  item_type: 'song' | 'bible' | 'info' | 'media'
  title: string
  notes?: string
  number?: string
  alternate_title?: string
  lyrics_raw?: string
  category?: string
  key_note?: string
  time_signature?: string
  tempo?: string
  hymnal_code?: string
  hymnal_name?: string
  bible_version_code?: string
  bible_version_short_name?: string
  bible_book_code?: string
  bible_book_name?: string
  bible_chapter?: number
  bible_verse_start?: number
  bible_verse_end?: number
  bible_reference?: string
  bible_text_json?: string
  bible_copyright?: string
}

interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void
  getVersion: () => Promise<string>
}

interface AppThemeAPI {
  setMode: (payload: { mode: string; effective: 'dark' | 'light' }) => void
  onUpdated: (callback: (payload: { mode: string; effective: string }) => void) => () => void
}

interface AppAPI {
  notifyShellReady: () => void
  isSafeMode: () => Promise<boolean>
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
  emergencyUpdate: (payload: { active: boolean; message?: string; subMessage?: string }) => void
  onEmergencyUpdate: (
    callback: (payload: { active: boolean; message?: string; subMessage?: string }) => void
  ) => () => void
  videoControl: (command: string, value?: unknown) => void
  onVideoControl: (callback: (command: string, value: unknown) => void) => () => void
  instrumentControl: (command: string, value?: unknown) => void
  onInstrumentControl: (callback: (command: string, value: unknown) => void) => () => void
  instrumentTimeUpdate: (currentTime: number, duration: number) => void
  onInstrumentTimeUpdate: (callback: (currentTime: number, duration: number) => void) => () => void
}

interface StageAPI {
  show: () => void
  hide: () => void
}

interface PresenterRemoteStatus {
  enabled: boolean
  port: number | null
  token: string | null
  urls: string[]
  roles: Array<{
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    code: string
    url: string | null
    clientCount: number
  }>
  clients: Array<{
    id: string
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    connectedAt: number
    lastSeenAt: number
    userAgent: string
    address: string
    displayName: string
    trusted: boolean
  }>
  security: {
    mode: 'rehearsal' | 'service' | 'private'
    exactOutputFps: number
    rolesEnabled: Record<'presenter' | 'operator' | 'viewer' | 'stage', boolean>
  }
  commandLog: Array<{
    id: string
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
    command: string
    timestamp: number
    clientId: string | null
    deviceName: string
    address: string
    ok: boolean
    detail?: string
  }>
  clientCount: number
  lastCommandAt: number | null
}

interface PresenterRemoteSlideSummary {
  text: string
  label?: string | null
  contentType?: 'song' | 'bible' | 'reading' | 'custom' | 'media'
  bibleReference?: string | null
  stageNotes?: string | null
  stageChord?: string | null
  keyNote?: string | null
  timeSignature?: string | null
  tempo?: string | null
  visualType?: 'image' | 'video' | 'pdf'
  visualPath?: string
  visualDataUrl?: string
  pageNumber?: number
  mediaKind?: 'image' | 'video' | 'pdf' | 'presentation' | 'unknown'
  mediaSourcePath?: string
  canPresenterNavigate?: boolean
}

interface PresenterRemoteSnapshot {
  projectionState: string
  currentSlide: PresenterRemoteSlideSummary | null
  nextSlide: PresenterRemoteSlideSummary | null
  currentIndex: number
  nextIndex: number | null
  totalSlides?: number
  hasNextSlide: boolean
  flowPosition: number
  isSmartMode: boolean
  timerElapsed?: number
  timerRunning?: boolean
  rundownName?: string
  rundownItemCount?: number
  rundownTotalSeconds?: number
  rundownElapsedSeconds?: number
  rundownRemainingSeconds?: number
  rundownProgressPercent?: number
  currentRundownItemIndex?: number
  currentRundownItemTitle?: string
  currentRundownItemEstimatedSeconds?: number
  currentRundownItemRemainingSeconds?: number
  updatedAt: number
}

interface PresenterRemoteAPI {
  start: () => Promise<PresenterRemoteStatus>
  stop: () => Promise<PresenterRemoteStatus>
  status: () => Promise<PresenterRemoteStatus>
  regenerateCodes: () => Promise<PresenterRemoteStatus>
  regenerateCode: (
    role: 'presenter' | 'operator' | 'viewer' | 'stage'
  ) => Promise<PresenterRemoteStatus>
  disconnectClients: () => Promise<PresenterRemoteStatus>
  disconnectClient: (clientId: string) => Promise<PresenterRemoteStatus>
  updateSecurityPolicy: (policy: unknown) => Promise<PresenterRemoteStatus>
  clearCommandLog: () => Promise<PresenterRemoteStatus>
  powerPointStatus: () => Promise<PowerPointBridgeStatus>
  approvePowerPointRequest: (requestId: string) => Promise<PowerPointBridgeStatus>
  rejectPowerPointRequest: (requestId: string) => Promise<PowerPointBridgeStatus>
  disconnectPowerPointDevice: (deviceId: string) => Promise<PowerPointBridgeStatus>
  sendPowerPointCommand: (
    deviceId: string,
    command: 'NEXT' | 'PREV'
  ) => Promise<PowerPointBridgeStatus>
  updateSnapshot: (snapshot: PresenterRemoteSnapshot) => void
  onCommand: (callback: (command: string, payload?: unknown) => void) => () => void
  onPowerPointStatus: (callback: (status: PowerPointBridgeStatus) => void) => () => void
}

interface PowerPointBridgeSource {
  deviceId: string
  deviceName: string
  deckName: string
  title: string
  notes: string
  imagePath: string
  nextImagePath: string | null
  nextTitle: string | null
  slideIndex: number
  totalSlides: number
  updatedAt: number
}

interface PowerPointBridgeStatus {
  requests: Array<{
    id: string
    deviceId: string
    deviceName: string
    deckName: string
    address: string
    status: 'pending' | 'approved' | 'rejected'
    requestedAt: number
    updatedAt: number
  }>
  connectedDevices: Array<{
    deviceId: string
    deviceName: string
    deckName: string
    connectedAt: number
    lastSeenAt: number
  }>
  source: PowerPointBridgeSource | null
}

interface ObsSrtStatus {
  state: 'stopped' | 'starting' | 'listening' | 'error'
  available: boolean
  config: {
    port: number
    width: 1280 | 1920
    height: 720 | 1080
    fps: 25 | 30
    bitrateMbps: number
    latencyMs: number
    ffmpegPath: string
    audioDevice: string
    audioBitrateKbps: 128 | 160 | 192
    audioDelayMs: number
  }
  encoderPath: string | null
  encoder: string | null
  audioDevices: string[]
  obsUrls: string[]
  framesSent: number
  framesDropped: number
  error: string | null
}

interface ObsSrtAPI {
  status: () => Promise<ObsSrtStatus>
  start: () => Promise<ObsSrtStatus>
  stop: () => Promise<ObsSrtStatus>
  updateConfig: (config: Partial<ObsSrtStatus['config']>) => Promise<ObsSrtStatus>
}

interface ObsSrtIngestStatus {
  state: 'stopped' | 'starting' | 'waiting' | 'live' | 'error'
  available: boolean
  binaryPath: string | null
  config: {
    autoStart: boolean
    srtPort: number
    hlsPort: number
    webrtcPort: number
    webrtcUdpPort: number
    apiPort: number
    streamPath: string
  }
  publisherConnected: boolean
  srtConnectionCount: number
  diagnostic: string | null
  startedAt: number | null
  obsUrls: string[]
  hlsUrls: string[]
  webrtcUrls: string[]
  error: string | null
  logTail: string[]
}

interface ObsSrtIngestAPI {
  status: () => Promise<ObsSrtIngestStatus>
  start: () => Promise<ObsSrtIngestStatus>
  stop: () => Promise<ObsSrtIngestStatus>
  setAutoStart: (autoStart: boolean) => Promise<ObsSrtIngestStatus>
  updateConfig: (
    config: Partial<ObsSrtIngestStatus['config']> & { resetStreamKey?: boolean }
  ) => Promise<ObsSrtIngestStatus>
}

interface DisplayAPI {
  getAll: () => Promise<unknown[]>
  isProjectionVisible: () => Promise<boolean>
  hasExternal: () => Promise<boolean>
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
  clearLyrics: (hymnalId: number, songNumbers: string[]) => Promise<number>
  bulkAssignBackground: (payload: {
    songIds: number[]
    songBackgroundConfig: string
    assetId?: string
  }) => Promise<number>
  toggleFavorite: (id: number) => Promise<SongDto | boolean | void>
  getRelations: (songId: number) => Promise<SongRelationDto[]>
  addRelation: (relation: SongRelationCreatePayload) => Promise<SongRelationDto>
  deleteRelation: (id: number) => Promise<boolean>
  // Phase 1 — Enterprise Refactor
  duplicate: (id: number) => Promise<{ id: number; number: string; title: string } | null>
  getSummary: (hymnalId?: number) => Promise<unknown[]>
  getNote: (songId: number) => Promise<string>
  updateNote: (songId: number, noteText: string) => Promise<string>
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
  addBible: (
    playlistId: number,
    bible: {
      bible_version_code: string
      bible_version_short_name: string
      bible_book_code: string
      bible_book_name: string
      bible_chapter: number
      bible_verse_start: number
      bible_verse_end: number
      bible_reference: string
      bible_text_json: string
      bible_copyright?: string
      notes?: string
    }
  ) => Promise<PlaylistItemDto>
  addInfo: (playlistId: number, info: { title: string; body: string }) => Promise<PlaylistItemDto>
  addMedia: (
    playlistId: number,
    media: {
      title: string
      path: string
      presentation?: { slides: Array<{ index: number; title: string; notes: string }> }
    }
  ) => Promise<PlaylistItemDto>
  updateItem: (
    id: number,
    data: {
      song_id?: number
      section_label?: string
      sort_order?: number
      title?: string
      notes?: string
    }
  ) => Promise<void>
  deleteItem: (id: number) => Promise<boolean>
  reorderItems: (items: Array<{ id: number; sort_order: number }>) => Promise<void>
}

interface SettingsAPI {
  getAll: () => Promise<Record<string, string>>
  update: (key: string, value: string) => Promise<void>
}

interface SystemAPI {
  logHistory: (songId: number) => Promise<void>
  getRecentSongs: (limit?: number, hymnalId?: number) => Promise<SongDto[]>
  createBackup: (customPath?: string) => Promise<string>
  restoreBackup: (backupPath: string) => Promise<boolean>
  saveSession: (state: unknown) => Promise<void>
  getRecoveryState: () => Promise<unknown>
  markCleanExit: () => Promise<void>
  reseed: () => Promise<void>
  checkMultiHymnalIntegrity: (hymnalId?: number) => Promise<unknown>
  getMemory: () => Promise<unknown>
  setMode: (mode: string) => Promise<void>
  openExternal: (url: string) => Promise<void>
  getStorageStats: () => Promise<unknown>
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
  showOpenDialog: (options: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>
  writeJson: (filePath: string, data: unknown) => Promise<unknown>
  readJson: (filePath: string) => Promise<unknown>
  scanInstruments: (
    folderPath: string
  ) => Promise<{ hymnalCode: string; number: number; filePath: string }[]>
  readLrc: (audioFilePath: string) => Promise<string | null>
  writeLrc: (audioFilePath: string, content: string) => Promise<boolean>
}

interface MediaAssetDto {
  id: string
  type: 'image' | 'video' | 'pdf'
  name: string
  originalPath: string
  localPath: string
  thumbnailPath?: string
  category?: string
  tags?: string[]
  isFavorite?: boolean
  usageCount?: number
  collectionIds?: string[]
  createdAt?: string
  updatedAt?: string
  metadata?: Record<string, unknown>
}

interface MediaCollectionDto {
  id: string
  name: string
  description?: string
  coverAssetId?: string
  coverThumbnailPath?: string
  assetCount: number
  assetIds: string[]
  createdAt?: string
  updatedAt?: string
}

interface MediaAPI {
  getAll: (filters?: {
    type?: 'image' | 'video' | 'pdf'
    search?: string
    favoriteOnly?: boolean
    category?: string
    collectionId?: string
  }) => Promise<MediaAssetDto[]>
  getCollections: () => Promise<MediaCollectionDto[]>
  importAssets: (payload: {
    filePaths: string[]
    category?: string
    tags?: string[]
  }) => Promise<MediaAssetDto[]>
  cancelImport: () => Promise<boolean>
  onImportProgress: (
    callback: (progress: {
      completed: number
      total: number
      phase: 'preparing' | 'thumbnail' | 'committing' | 'complete'
      fileName: string
    }) => void
  ) => () => void
  addLocalExternalMedia: (payload: {
    filePaths: string[]
    category?: string
  }) => Promise<MediaAssetDto[]>
  importPresentation: (payload: {
    filePath: string
    category?: string
    outputMode?: 'auto' | 'pdf' | 'images'
  }) => Promise<MediaAssetDto>
  onPresentationImportProgress: (
    callback: (progress: {
      filePath: string
      percent: number
      step: 'parsing' | 'converting' | 'generating' | 'finishing' | 'done' | 'failed'
      errorMessage?: string
    }) => void
  ) => () => void
  update: (
    id: string,
    updates: { name?: string; category?: string; tags?: string[]; isFavorite?: boolean }
  ) => Promise<MediaAssetDto | null>
  delete: (id: string) => Promise<boolean>
  incrementUsage: (id: string) => Promise<void>
  addCollection: (payload: {
    name: string
    description?: string
    assetIds?: string[]
  }) => Promise<MediaCollectionDto | null>
  updateCollection: (
    id: string,
    updates: { name?: string; description?: string; coverAssetId?: string }
  ) => Promise<MediaCollectionDto | null>
  deleteCollection: (id: string) => Promise<boolean>
  addAssetsToCollection: (
    collectionId: string,
    assetIds: string[]
  ) => Promise<MediaCollectionDto | null>
  removeAssetsFromCollection: (
    collectionId: string,
    assetIds: string[]
  ) => Promise<MediaCollectionDto | null>
  reorderCollectionItems: (
    collectionId: string,
    assetIds: string[]
  ) => Promise<MediaCollectionDto | null>
  bulkUpdate: (payload: {
    ids: string[]
    category?: string
    tags?: string[]
    isFavorite?: boolean
  }) => Promise<number>
  bulkDelete: (ids: string[]) => Promise<number>
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

// ============================================================================
// Content Pack API (External SQLite System)
// ============================================================================

interface ContentPackRecordDto {
  id: number
  pack_id: string
  pack_type: string
  version_code: string
  name: string
  short_name: string
  language: string
  publisher: string
  copyright: string
  installed_path: string
  sqlite_filename: string
  is_active: number
  is_default: number
  validation_ok: number
  fts5_created: number
  books_count: number
  chapters_count: number
  verses_count: number
  created_at: string
  updated_at: string
}

interface BiblePackPreviewDto {
  valid: boolean
  errors: string[]
  packId: string
  manifest: {
    version_code: string
    version_name: string
    short_name: string
    language: string
    publisher: string
    copyright: string
    books: number
    chapters: number
    verses: number
    validation_ok: boolean
    fts5_created: boolean
  } | null
  importReport: {
    ok: boolean
    book_count: number
    chapter_count: number
    verse_count: number
    warnings: string[]
  } | null
  books: Array<{
    code: string
    name: string
    testament: 'OT' | 'NT'
    order: number
    chapters: number
  }>
}

interface ContentPacksAPI {
  selectFolder: () => Promise<string | null>
  previewBiblePack: (folderPath: string) => Promise<BiblePackPreviewDto>
  installBiblePack: (folderPath: string) => Promise<ContentPackRecordDto>
  list: (packType?: string) => Promise<ContentPackRecordDto[]>
  remove: (packId: string) => Promise<boolean>
  setDefault: (packId: string) => Promise<{ success: boolean }>
}

interface BibleVersionDto {
  versionCode: string
  name: string
  shortName: string
  language: string
  publisher: string
  copyright: string
  booksCount: number
  chaptersCount: number
  versesCount: number
  fts5Created: boolean
  isDefault: boolean
  packId: string
}

interface BibleExternalBookDto {
  code: string
  osis_id: string
  name: string
  testament: 'OT' | 'NT'
  order: number
  chapters: number
}

interface BibleExternalVerseDto {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

interface BibleSearchResultDto {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
  snippet: string
}

interface BibleParsedReferenceDto {
  valid: boolean
  bookCode: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number | null
  error: string | null
}

interface BibleNoteDto {
  verse: number
  note_text: string
  highlight_color: string
}

interface BiblePackAPI {
  getVersions: () => Promise<BibleVersionDto[]>
  getBooks: (versionCode: string) => Promise<BibleExternalBookDto[]>
  getChapter: (
    versionCode: string,
    bookCode: string,
    chapter: number
  ) => Promise<BibleExternalVerseDto[]>
  getVerseRange: (
    versionCode: string,
    bookCode: string,
    chapter: number,
    verseStart: number,
    verseEnd: number
  ) => Promise<BibleExternalVerseDto[]>
  search: (versionCode: string, query: string, limit?: number) => Promise<BibleSearchResultDto[]>
  parseReference: (referenceStr: string) => Promise<BibleParsedReferenceDto>
  // Bible notes & highlights
  getNote: (
    bookCode: string,
    chapter: number,
    verse: number
  ) => Promise<{ note_text: string; highlight_color: string }>
  updateNote: (
    bookCode: string,
    chapter: number,
    verse: number,
    noteText: string,
    highlightColor: string
  ) => Promise<void>
  getNotesForChapter: (bookCode: string, chapter: number) => Promise<BibleNoteDto[]>
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

// Phase 1 — Enterprise Refactor
interface ConfidenceAPI {
  update: (payload: unknown) => void
  onUpdate: (callback: (data: unknown) => void) => () => void
}

interface API {
  window: WindowAPI
  appTheme: AppThemeAPI
  app: AppAPI
  projection: ProjectionAPI
  stage: StageAPI
  presenterRemote: PresenterRemoteAPI
  obsSrt: ObsSrtAPI
  obsSrtIngest: ObsSrtIngestAPI
  display: DisplayAPI
  hymnals: HymnalsAPI
  songs: SongsAPI
  playlists: PlaylistsAPI
  settings: SettingsAPI
  system: SystemAPI
  file: FileAPI
  media: MediaAPI
  bible: BibleAPI
  slides: SlidesAPI
  health: HealthAPI
  // Phase 1 — Enterprise Refactor
  confidence: ConfidenceAPI
  // External SQLite Content Pack System
  contentPacks: ContentPacksAPI
  biblePack: BiblePackAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
