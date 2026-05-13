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
  song_background_config?: string
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
  // Musical metadata for projection overlay
  keyNote?: string
  timeSignature?: string
  tempo?: string
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
  time_signature?: string
  tempo?: string
  hymnal_code?: string
  hymnal_name?: string
}

export type ProjectionState = 'LIVE' | 'BLACK' | 'FREEZE' | 'CLEAR' | 'LOGO'

// ============================================================================
// Runtime Protection Types
// ============================================================================

/**
 * Program Lock State - Controls edit access to live content
 *
 * UNLOCKED: Program can be modified (output is CLEAR/BLACK)
 * LIVE_LOCK: Program is immutable while live (output is LIVE/FREEZE)
 * LIVE_DIRTY: Program has pending changes that require confirmation
 */
export type ProgramLockState = 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'

/**
 * Preview Sync State - Relationship between preview and program
 *
 * SYNCED: Preview matches program exactly
 * AHEAD: Preview is ahead of program (ready to TAKE)
 * INDEPENDENT: Preview has different content (different song)
 */
export type PreviewSyncState = 'SYNCED' | 'AHEAD' | 'INDEPENDENT'

/**
 * Pending Change Record - Tracks what changed in dirty state
 */
export interface PendingChange {
  type: 'slide_content' | 'slide_order' | 'song_metadata'
  timestamp: number
  description?: string
}

// ============================================================================
// NEXT State Types - Upcoming content management
// ============================================================================

/**
 * Next Ready State - Availability state of next content
 *
 * EMPTY: No next content at all
 * SLIDE_READY: Next slide exists in current song
 * SONG_QUEUED: Next song is pre-loaded
 * BOTH_READY: Both next slide and next song available
 */
export type NextReadyState = 'EMPTY' | 'SLIDE_READY' | 'SONG_QUEUED' | 'BOTH_READY'

/**
 * Next State - Manages upcoming content for operator awareness
 *
 * The NEXT state is a first-class runtime entity that represents
 * what comes immediately after the current program content.
 *
 * Mental model: NOW (PROGRAM) → NEXT → LATER (PREVIEW/CUE)
 */
export interface NextState {
  /** The slide after current program slide */
  nextSlide: SlideData | null
  /** Index of next slide in programSlides */
  nextSlideIndex: number | null
  /** Whether next slide exists */
  hasNextSlide: boolean

  /** Next song in playlist (for pre-loading) */
  nextSong: Song | null
  /** Index of next song in playlist */
  nextSongIndex: number | null
  /** Whether next song exists in playlist */
  hasNextSong: boolean

  /** Pre-loaded slides for next song */
  queuedSlides: SlideData[]

  /** Overall readiness state */
  readyState: NextReadyState
}

// ============================================================================
// Quick Jump Architecture - Slide Addressing System
// ============================================================================

/**
 * Slide Address Type - How to identify a slide target
 *
 * NUMERIC: Direct slide index (e.g., "slide:5" → index 4)
 * SECTION: Section label match (e.g., "section:chorus" → first chorus slide)
 * RELATIVE: Relative navigation (e.g., "+1", "-2", "next", "prev")
 * SPECIAL: Special targets (e.g., "first", "last", "next-section")
 */
export type SlideAddressType = 'NUMERIC' | 'SECTION' | 'RELATIVE' | 'SPECIAL'

/**
 * Slide Address - Universal addressing format for navigation
 *
 * Examples:
 * - { type: 'NUMERIC', value: 5 } → Go to slide 5 (1-indexed input)
 * - { type: 'SECTION', value: 'chorus' } → Go to first chorus slide
 * - { type: 'RELATIVE', value: '+1' } → Next slide
 * - { type: 'RELATIVE', value: '-2' } → Two slides back
 * - { type: 'SPECIAL', value: 'last' } → Last slide in song
 */
export interface SlideAddress {
  type: SlideAddressType
  value: string | number
}

/**
 * Resolved Slide Target - Result of address resolution
 */
export interface ResolvedSlideTarget {
  /** Target slide index (0-indexed), null if not found */
  slideIndex: number | null
  /** Whether the target was found */
  found: boolean
  /** Human-readable description of the target */
  description: string
  /** Original address that was resolved */
  address: SlideAddress
  /** Error message if resolution failed */
  error?: string
}

/**
 * Section Index Map - Maps section labels to slide indices
 *
 * Built from slide metadata during song load.
 * Used for semantic navigation (e.g., "go to chorus").
 *
 * Example:
 * {
 *   'verse': [0, 4, 9],      // Verses at slides 0, 4, 9
 *   'chorus': [2, 7],        // Choruses at slides 2, 7
 *   'bridge': [11],          // Bridge at slide 11
 *   'intro': [0],            // Intro at slide 0
 * }
 */
export type SectionIndexMap = Record<string, number[]>

/**
 * Quick Jump Target - A navigable target for the quick jump overlay
 */
export interface QuickJumpTarget {
  /** Display label for the target */
  label: string
  /** Slide index (0-indexed) */
  slideIndex: number
  /** Section label if applicable */
  section?: string
  /** Target type for categorization */
  type: 'slide' | 'section' | 'special'
  /** Keyboard shortcut hint */
  shortcut?: string
}

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
// Confidence Monitor Types - Stage-facing display system
// ============================================================================

/**
 * Display Role - Different output contexts
 *
 * PROGRAM: Audience-facing projection output
 * STAGE: Stage display for musicians/singers
 * CONFIDENCE: Confidence monitor for worship leaders
 * PREVIEW: Operator preview monitor
 */
export type DisplayRole = 'PROGRAM' | 'STAGE' | 'CONFIDENCE' | 'PREVIEW'

/**
 * Confidence Payload - Normalized runtime data for confidence display
 *
 * Built from current runtime state and broadcast to confidence monitors.
 * Used by: stage display, external monitors, websocket remote, mobile apps
 */
export interface ConfidencePayload {
  // Current content
  currentSlide: {
    text: string
    sectionLabel: string
    slideIndex: number
    totalSlides: number
  } | null

  // Next content
  nextSlide: {
    text: string
    sectionLabel: string
  } | null

  // Section context
  currentSection: string | null
  nextSection: string | null

  // Song metadata
  song: {
    title: string
    hymnalCode: string
    hymnalName: string
    keyNote?: string
    composer?: string
    author?: string
  } | null

  // Timing
  clock: string
  timer: {
    elapsed: number // seconds
    running: boolean
  }

  // Runtime status
  status: {
    isLive: boolean
    isFrozen: boolean
    isBlack: boolean
    projectionState: ProjectionState
  }
}

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
