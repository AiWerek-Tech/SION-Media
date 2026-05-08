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
  lyrics_raw: string
  category: string
  language: string
  author: string
  composer: string
  key_note: string
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
  song_id: number
  sort_order: number
  section_label: string
  number: string
  title: string
  alternate_title: string
  lyrics_raw: string
  category: string
  key_note?: string
  tempo?: string
  hymnal_code?: string
  hymnal_name?: string
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
  songId: number
  slideIndex: number
  text: string
  sectionLabel: string
  nextSlideText?: string
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
