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

export interface SlideData {
  songId: number
  slideIndex: number
  text: string
  sectionLabel: string
  nextSlideText?: string
  // Bible projection support
  bibleId?: number
  bibleReference?: string
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

export type ProjectionState = 'LIVE' | 'BLACK' | 'FREEZE' | 'CLEAR' | 'LOGO'

export interface RecoveryState {
  needsRecovery: boolean
  playlistId?: number
  songId?: number
  slideIndex?: number
  projectionState?: ProjectionState
}

export type FilterTab = 'all' | 'favorites' | 'recent' | 'category'

export type AppScreen = 'dashboard' | 'song-editor' | 'import-export' | 'settings' | 'bible'

// ============================================================================
// Bible Module Types (re-exported from shared)
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
// Custom Slides Types (re-exported from shared)
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
