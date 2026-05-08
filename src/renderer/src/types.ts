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

export interface SlideData {
  songId: number
  slideIndex: number
  text: string
  sectionLabel: string
  nextSlideText?: string
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

export type AppScreen = 'dashboard' | 'song-editor' | 'import-export' | 'settings'
