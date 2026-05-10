/**
 * IPC Channel Constants
 *
 * Centralized channel names for type-safe IPC communication.
 * Import this in both main and preload/renderer contexts.
 */

// ============================================================================
// Window Controls
// ============================================================================

export const IPC_WINDOW = {
  MINIMIZE: 'window:minimize',
  MAXIMIZE: 'window:maximize',
  CLOSE: 'window:close',
  IS_MAXIMIZED: 'window:is-maximized',
  MAXIMIZED_CHANGED: 'window:maximized-changed'
} as const

// ============================================================================
// System Operations
// ============================================================================

export const IPC_SYSTEM = {
  GET_MEMORY: 'system:get-memory',
  SET_MODE: 'system:set-mode',
  CREATE_BACKUP: 'db:create-backup',
  RESTORE_BACKUP: 'db:restore-backup',
  RESEED: 'db:reseed',
  GET_RECENT_SONGS: 'db:get-recent-songs',
  LOG_HISTORY: 'db:log-history'
} as const

// ============================================================================
// Projection Controls
// ============================================================================

export const IPC_PROJECTION = {
  SLIDE_UPDATE: 'projection:slide-update',
  STATE_CHANGE: 'projection:state-change',
  THEME_UPDATE: 'projection:theme-update',
  SHOW: 'projection:show',
  HIDE: 'projection:hide'
} as const

// ============================================================================
// Stage Display Controls
// ============================================================================

export const IPC_STAGE = {
  SHOW: 'stage:show',
  HIDE: 'stage:hide'
} as const

// ============================================================================
// Confidence Monitor Controls
// ============================================================================

export const IPC_CONFIDENCE = {
  UPDATE: 'confidence:update',
  TIMER_START: 'confidence:timer-start',
  TIMER_STOP: 'confidence:timer-stop',
  TIMER_RESET: 'confidence:timer-reset'
} as const

// ============================================================================
// Display Info
// ============================================================================

export const IPC_DISPLAY = {
  GET_ALL: 'display_get-all',
  IS_PROJECTION_VISIBLE: 'display:is-projection-visible',
  CHANGED: 'display:changed'
} as const

// ============================================================================
// Database - Hymnals
// ============================================================================

export const IPC_HYMNALS = {
  GET_ALL: 'db:get-hymnals',
  ADD: 'db:add-hymnal',
  UPDATE: 'db:update-hymnal',
  DELETE: 'db:delete-hymnal'
} as const

// ============================================================================
// Database - Songs
// ============================================================================

export const IPC_SONGS = {
  GET_ALL: 'db:get-songs',
  SEARCH: 'db:search-songs',
  ADD: 'db:add-song',
  UPDATE: 'db:update-song',
  DELETE: 'db:delete-song',
  TOGGLE_FAVORITE: 'db:toggle-favorite',
  GET_RELATIONS: 'db:get-song-relations',
  ADD_RELATION: 'db:add-song-relation',
  DELETE_RELATION: 'db:delete-song-relation'
} as const

// ============================================================================
// Database - Playlists
// ============================================================================

export const IPC_PLAYLISTS = {
  GET_ALL: 'db:get-playlists',
  ADD: 'db:add-playlist',
  UPDATE: 'db:update-playlist',
  DELETE: 'db:delete-playlist',
  GET_ITEMS: 'db:get-playlist-items',
  ADD_ITEM: 'db:add-playlist-item',
  UPDATE_ITEM: 'db:update-playlist-item',
  DELETE_ITEM: 'db:delete-playlist-item',
  REORDER_ITEMS: 'db:reorder-playlist-items'
} as const

// ============================================================================
// Database - Settings
// ============================================================================

export const IPC_SETTINGS = {
  GET_ALL: 'db:get-settings',
  UPDATE: 'db:update-setting'
} as const

// ============================================================================
// Crash Recovery
// ============================================================================

export const IPC_RECOVERY = {
  SAVE_SESSION: 'db:save-session',
  GET_RECOVERY_STATE: 'db:get-recovery-state',
  MARK_CLEAN_EXIT: 'db:mark-clean-exit'
} as const

// ============================================================================
// File Operations
// ============================================================================

export const IPC_FILE = {
  PARSE_EXCEL: 'file:parse-excel'
} as const

// ============================================================================
// Database - Bible
// ============================================================================

export const IPC_BIBLE = {
  GET_TRANSLATIONS: 'db:get-bible-translations',
  ADD_TRANSLATION: 'db:add-bible-translation',
  DELETE_TRANSLATION: 'db:delete-bible-translation',
  GET_BOOKS: 'db:get-bible-books',
  ADD_BOOK: 'db:add-bible-book',
  GET_VERSES: 'db:get-bible-verses',
  GET_VERSE_RANGE: 'db:get-bible-verse-range',
  ADD_VERSE: 'db:add-bible-verse',
  ADD_VERSES_BATCH: 'db:add-bible-verses-batch',
  SEARCH_VERSES: 'db:search-bible-verses'
} as const

// ============================================================================
// Database - Custom Slides
// ============================================================================

export const IPC_SLIDES = {
  GET_ALL: 'db:get-custom-slides',
  GET_BY_TYPE: 'db:get-slides-by-type',
  ADD: 'db:add-custom-slide',
  UPDATE: 'db:update-custom-slide',
  DELETE: 'db:delete-custom-slide',
  GET_GROUPS: 'db:get-slide-groups',
  ADD_GROUP: 'db:add-slide-group',
  UPDATE_GROUP: 'db:update-slide-group',
  DELETE_GROUP: 'db:delete-slide-group',
  GET_GROUP_SLIDES: 'db:get-group-slides',
  ADD_SLIDE_TO_GROUP: 'db:add-slide-to-group',
  REMOVE_SLIDE_FROM_GROUP: 'db:remove-slide-from-group',
  REORDER_GROUP_SLIDES: 'db:reorder-group-slides'
} as const
