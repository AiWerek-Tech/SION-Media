/**
 * Shared Types for SION Media
 *
 * This file contains type definitions shared between main and renderer processes.
 * Import this in both contexts for type-safe IPC communication.
 */

// ============================================================================
// Core Data Models
// ============================================================================

export interface Hymnal {
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

export interface Song {
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
  // Joined from hymnals
  hymnal_code?: string
  hymnal_name?: string
  // From history
  last_played?: string
  last_used?: string
}

export interface Playlist {
  id: number
  name: string
  service_date: string
  description: string
  created_at: string
  updated_at: string
}

export interface PlaylistItem {
  id: number
  playlist_id: number
  song_id: number | null
  sort_order: number
  section_label: string
  item_type?: 'song' | 'bible' | 'info' | 'media'
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

export interface SongRelation {
  id: number
  source_song_id: number
  target_song_id: number
  relation_type: 'translation' | 'same_tune' | 'same_text' | 'medley' | 'response'
  created_at: string
}

// ============================================================================
// Bible Types
// ============================================================================

export interface BibleTranslation {
  id: number
  code: string
  name: string
  language: string
  source: string
  is_default: number
  created_at: string
}

export interface BibleBook {
  id: number
  translation_id: number
  book_number: number
  short_name: string
  long_name: string
  testament: 'OT' | 'NT'
  chapter_count: number
}

export interface BibleVerse {
  id: number
  translation_id: number
  book_id: number
  chapter: number
  verse: number
  text: string
}

// ============================================================================
// Projection Types
// ============================================================================

export type ProjectionState = 'LIVE' | 'BLACK' | 'FREEZE' | 'CLEAR' | 'LOGO'

export interface SlideData {
  contentType?: 'song' | 'bible' | 'reading' | 'custom' | 'media'
  mediaKind?: 'image' | 'video' | 'pdf' | 'presentation' | 'unknown'
  songId?: number | null
  playlistItemId?: number | null
  slideIndex: number
  text: string
  sectionLabel: string
  nextSlideText?: string
  bibleReference?: string
  bibleCopyright?: string
}

export interface ProjectionTheme {
  projection_font_family?: string
  projection_text_color?: string
  projection_bg_color?: string
  projection_bg_image?: string
  projection_logo_image?: string
  projection_text_align?: 'left' | 'center' | 'right'
  projection_text_shadow?: boolean
  projection_text_size?: number
  projection_line_spacing?: number
  transition_duration?: number
  workspace_name?: string
}

// ============================================================================
// Display Types
// ============================================================================

export interface DisplayInfo {
  id: number
  label: string
  width: number
  height: number
  isPrimary: boolean
}

// ============================================================================
// Recovery & Session Types
// ============================================================================

export interface RecoveryState {
  needsRecovery: boolean
  playlistId?: number
  songId?: number
  slideIndex?: number
  projectionState?: ProjectionState
}

export interface SessionState {
  playlistId?: number
  songId?: number
  slideIndex?: number
  projectionState?: ProjectionState
}

// ============================================================================
// IPC Request/Response Types
// ============================================================================

export interface AddHymnalRequest {
  code: string
  name: string
  language: string
  region?: string
  version?: string
  publisher?: string
  is_official?: number
}

export interface UpdateHymnalRequest extends Partial<Hymnal> {
  id: number
}

export interface AddSongRequest {
  hymnal_id: number
  number: string
  title: string
  alternate_title?: string
  lyrics_raw: string
  category?: string
  language?: string
  author?: string
  composer?: string
  key_note?: string
  time_signature?: string
  tempo?: string
  tags?: string
  theme?: string
  scripture_reference?: string
}

export interface UpdateSongRequest extends Partial<Song> {
  id: number
}

export interface AddPlaylistRequest {
  name: string
  service_date: string
  description?: string
}

export interface AddPlaylistItemRequest {
  playlist_id: number
  song_id: number
  sort_order: number
  section_label?: string
}

export interface ReorderPlaylistItemsRequest {
  id: number
  sort_order: number
}

export interface UpdatePlaylistItemRequest {
  section_label?: string
  sort_order?: number
}

// ============================================================================
// App State Types (Renderer-only)
// ============================================================================

export type FilterTab = 'all' | 'favorites' | 'recent' | 'category'

export type AppScreen = 'dashboard' | 'song-editor' | 'import-export' | 'settings'

export type AppMode = 'LIBRARY' | 'PROJECTION' | 'BROADCAST' | 'MANAGEMENT'

// ============================================================================
// Bible Module Types
// ============================================================================

export interface BibleTranslation {
  id: number
  code: string
  name: string
  language: string
  source: string
  is_default: number
  created_at: string
}

export interface BibleBook {
  id: number
  translation_id: number
  book_number: number
  short_name: string
  long_name: string
  testament: 'OT' | 'NT'
  chapter_count: number
}

export interface BibleVerse {
  id: number
  translation_id: number
  book_id: number
  chapter: number
  verse: number
  text: string
}

export interface BibleVerseReference {
  translation_id: number
  book: string
  chapter: number
  verseStart: number
  verseEnd?: number
}

// ============================================================================
// Custom Slides (Announcements) Types
// ============================================================================

export type SlideType = 'announcement' | 'liturgy' | 'welcome' | 'offering' | 'custom'

export interface CustomSlide {
  id: number
  title: string
  content: string
  slide_type: SlideType
  background_color: string
  background_image: string
  text_color: string
  font_size: number
  display_duration: number
  is_active: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface SlideGroup {
  id: number
  name: string
  description: string
  loop_interval: number
  is_active: number
  created_at: string
}

export interface SlideGroupItem {
  id: number
  group_id: number
  slide_id: number
  sort_order: number
}

// ============================================================================
// IPC Request Types for Bible & Slides
// ============================================================================

export interface AddBibleTranslationRequest {
  code: string
  name: string
  language: string
  source?: string
  is_default?: number
}

export interface AddBibleBookRequest {
  translation_id: number
  book_number: number
  short_name: string
  long_name: string
  testament: 'OT' | 'NT'
  chapter_count: number
}

export interface AddBibleVerseRequest {
  translation_id: number
  book_id: number
  chapter: number
  verse: number
  text: string
}

export interface AddCustomSlideRequest {
  title: string
  content: string
  slide_type?: SlideType
  background_color?: string
  background_image?: string
  text_color?: string
  font_size?: number
  display_duration?: number
  is_active?: number
  sort_order?: number
}

export interface UpdateCustomSlideRequest extends Partial<CustomSlide> {
  id: number
}

export interface AddSlideGroupRequest {
  name: string
  description?: string
  loop_interval?: number
  is_active?: number
}

export interface AddSlideToGroupRequest {
  group_id: number
  slide_id: number
  sort_order?: number
}

// ============================================================================
// Content Pack Types (External SQLite Content Pack System)
// ============================================================================

export type ContentPackType = 'bible' | 'hymnal' | 'reading' | 'media'

export interface ContentPackRecord {
  id: number
  pack_id: string
  pack_type: ContentPackType
  version_code: string
  name: string
  short_name: string
  language: string
  publisher: string
  copyright: string
  license_status: string
  source_type: string
  source_base_url: string
  installed_path: string
  sqlite_filename: string
  manifest_filename: string
  books_filename: string
  import_report_filename: string
  is_active: number
  is_default: number
  is_offline_available: number
  validation_ok: number
  fts5_created: number
  books_count: number
  chapters_count: number
  verses_count: number
  created_at: string
  updated_at: string
}

export interface BiblePackManifest {
  pack_type: string
  format_version: number
  generated_at: string
  version_code: string
  version_name: string
  short_name: string
  language: string
  publisher: string
  copyright: string
  license_status: string
  source_type: string
  source_base_url: string
  books: number
  chapters: number
  verses: number
  validation_ok: boolean
  fts5_created: boolean
  fts5_error: string | null
  files: Array<{
    filename: string
    size_bytes: number
    sha256: string
  }>
}

export interface BiblePackImportReport {
  ok: boolean
  generated_at: string
  version_code: string
  book_count: number
  chapter_count: number
  verse_count: number
  expected: {
    books: number
    chapters: number
    verses: number
  }
  warnings: string[]
  failed_chapters: string[]
  missing_chapters: string[]
  empty_verses: string[]
  non_sequential: string[]
}

export interface BiblePackBookEntry {
  code: string
  osis_id: string
  name: string
  url_name: string
  testament: 'OT' | 'NT'
  order: number
  chapters: number
}

export interface BiblePackPreview {
  valid: boolean
  errors: string[]
  manifest: BiblePackManifest | null
  importReport: BiblePackImportReport | null
  books: BiblePackBookEntry[]
  packId: string
}

// ============================================================================
// Bible External Query Types
// ============================================================================

export interface BibleExternalBook {
  code: string
  osis_id: string
  name: string
  testament: 'OT' | 'NT'
  order: number
  chapters: number
}

export interface BibleExternalVerse {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

export interface BibleSearchResult {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
  snippet: string
}

export interface BibleParsedReference {
  valid: boolean
  bookCode: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number | null
  error: string | null
}

export interface BibleVersionInfo {
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

// ============================================================================
// Bible Projection Type
// ============================================================================

export interface BibleProjectionItem {
  id: string
  type: 'bible'
  versionCode: string
  versionShortName: string
  reference: string
  copyright: string
  verses: Array<{
    bookCode: string
    bookName: string
    chapter: number
    verse: number
    text: string
  }>
  displayOptions: {
    showReference: boolean
    showVersion: boolean
    showCopyright: boolean
    fontScale: number
    splitMode: 'auto' | 'verse' | 'paragraph'
  }
}
