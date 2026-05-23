/**
 * Projection Session Aggregate
 *
 * Comprehensive state model unifying FSM state + UI state + media state + operator context.
 * Single source of truth for projection session state.
 */

import type { ProjectionState, ProjectionStateMachineState } from './projection-events'
import type { SlideData, ProjectionState as UIProjectionState, Song } from '@renderer/types'

// ============================================================================
// SESSION AGGREGATE TYPES
// ============================================================================

/**
 * Media State - Current presentation content
 */
export interface ProjectionMediaState {
  /** All slides in current presentation */
  slides: SlideData[]

  /** Currently displayed slide index */
  currentSlideIndex: number

  /** Program slides (live content) */
  programSlides: SlideData[]

  /** Program slide index */
  programSlideIndex: number

  /** Current program slide data */
  programSlide: SlideData | null

  /** Song metadata for cued content */
  cuedSongMeta: { hymnalCode: string; hymnalName: string } | null

  /** Background config for cued song */
  cuedSongBackgroundConfig: string

  /** Song metadata for program content */
  programSongMeta: { hymnalCode: string; hymnalName: string } | null

  /** Background config for program song */
  programSongBackgroundConfig: string
}

/**
 * Operator Context - Operator workflow state
 */
export interface ProjectionOperatorContext {
  /** Runtime protection state */
  programLockState: 'LOCKED' | 'UNLOCKED'

  /** Pending changes waiting for live update */
  pendingChanges: Array<{
    type: string
    description: string
    timestamp: number
  }>

  /** Whether there are pending live changes */
  hasPendingLiveChanges: boolean

  /** Next slide data (preview) */
  nextSlideData: SlideData | null

  /** Next slide index */
  nextSlideIndex: number | null

  /** Whether next slide is available */
  hasNextSlide: boolean

  /** Next song data */
  nextSong: Song | null

  /** Next song index */
  nextSongIndex: number | null

  /** Whether next song is available */
  hasNextSong: boolean

  /** Queued slides for next content */
  queuedSlides: SlideData[]

  /** Next ready state */
  nextReadyState: 'EMPTY' | 'SLIDE_READY' | 'SONG_READY' | 'FULL'

  /** Section index map for quick navigation */
  sectionMap: Record<string, number[]>

  /** Confidence monitor timer */
  timerElapsed: number

  /** Whether timer is running */
  timerRunning: boolean
}

/**
 * Output Configuration - Display and transition settings
 */
export interface ProjectionOutputConfig {
  /** UI projection state (LIVE, CLEAR, FREEZE, BLACK, LOGO) */
  uiState: UIProjectionState

  /** Fade transition speed */
  fadeSpeed: number

  /** Output mode (single screen, dual screen, etc.) */
  outputMode: 'SINGLE' | 'DUAL' | 'EXTENDED'

  /** Active media type being displayed */
  activeMedia: 'SLIDES' | 'VIDEO' | 'IMAGE' | 'BLACK' | 'LOGO'

  /** Transition state during slide changes */
  transitionState: 'IDLE' | 'TRANSITIONING' | 'COMPLETE'
}

/**
 * Synchronization State - Multi-device coordination
 */
export interface ProjectionSyncState {
  /** Session sync status */
  syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT' | 'OFFLINE'

  /** Last sync timestamp */
  lastSyncTimestamp: number

  /** Sync version for conflict resolution */
  syncVersion: number

  /** Remote session ID for multi-device sync */
  remoteSessionId?: string
}

/**
 * Projection Session Aggregate
 *
 * Unified state model for complete projection session.
 * Single source of truth combining all projection aspects.
 */
export interface ProjectionSession {
  /** Unique session identifier */
  sessionId: string

  /** Session creation timestamp */
  createdAt: number

  /** Last modification timestamp */
  updatedAt: number

  /** FSM state machine state */
  fsmState: ProjectionStateMachineState

  /** Media content state */
  mediaState: ProjectionMediaState

  /** Operator workflow context */
  operatorContext: ProjectionOperatorContext

  /** Output configuration */
  outputConfig: ProjectionOutputConfig

  /** Synchronization state */
  syncState: ProjectionSyncState
}

// ============================================================================
// SESSION AGGREGATE CONSTRUCTORS
// ============================================================================

/**
 * Create initial projection session
 */
export function createInitialProjectionSession(
  sessionId: string = generateSessionId()
): ProjectionSession {
  const now = Date.now()

  return {
    sessionId,
    createdAt: now,
    updatedAt: now,

    fsmState: {
      state: 'IDLE',
      context: {
        currentSlideIndex: 0
      },
      timestamp: now
    },

    mediaState: {
      slides: [],
      currentSlideIndex: 0,
      programSlides: [],
      programSlideIndex: -1,
      programSlide: null,
      cuedSongMeta: null,
      cuedSongBackgroundConfig: '',
      programSongMeta: null,
      programSongBackgroundConfig: ''
    },

    operatorContext: {
      programLockState: 'UNLOCKED',
      pendingChanges: [],
      hasPendingLiveChanges: false,
      nextSlideData: null,
      nextSlideIndex: null,
      hasNextSlide: false,
      nextSong: null,
      nextSongIndex: null,
      hasNextSong: false,
      queuedSlides: [],
      nextReadyState: 'EMPTY',
      sectionMap: {},
      timerElapsed: 0,
      timerRunning: false
    },

    outputConfig: {
      uiState: 'CLEAR',
      fadeSpeed: 0.4,
      outputMode: 'SINGLE',
      activeMedia: 'SLIDES',
      transitionState: 'IDLE'
    },

    syncState: {
      syncStatus: 'SYNCED',
      lastSyncTimestamp: now,
      syncVersion: 1
    }
  }
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// SESSION AGGREGATE OPERATIONS
// ============================================================================

/**
 * Update FSM state in session
 */
export function updateSessionFSMState(
  session: ProjectionSession,
  newFSMState: ProjectionStateMachineState
): ProjectionSession {
  const now = Date.now()
  return {
    ...session,
    updatedAt: Math.max(now, session.updatedAt + 1), // Ensure timestamp always advances
    fsmState: newFSMState,
    // Sync UI state with FSM state
    outputConfig: {
      ...session.outputConfig,
      uiState: mapFSMStateToUIState(newFSMState.state)
    }
  }
}

/**
 * Update media state in session
 */
export function updateSessionMediaState(
  session: ProjectionSession,
  updates: Partial<ProjectionMediaState>
): ProjectionSession {
  const now = Date.now()
  return {
    ...session,
    updatedAt: Math.max(now, session.updatedAt + 1), // Ensure timestamp always advances
    mediaState: {
      ...session.mediaState,
      ...updates
    }
  }
}

/**
 * Update operator context in session
 */
export function updateSessionOperatorContext(
  session: ProjectionSession,
  updates: Partial<ProjectionOperatorContext>
): ProjectionSession {
  const now = Date.now()
  return {
    ...session,
    updatedAt: Math.max(now, session.updatedAt + 1), // Ensure timestamp always advances
    operatorContext: {
      ...session.operatorContext,
      ...updates
    }
  }
}

/**
 * Update output configuration in session
 */
export function updateSessionOutputConfig(
  session: ProjectionSession,
  updates: Partial<ProjectionOutputConfig>
): ProjectionSession {
  const now = Date.now()
  return {
    ...session,
    updatedAt: Math.max(now, session.updatedAt + 1), // Ensure timestamp always advances
    outputConfig: {
      ...session.outputConfig,
      ...updates
    }
  }
}

/**
 * Update sync state in session
 */
export function updateSessionSyncState(
  session: ProjectionSession,
  updates: Partial<ProjectionSyncState>
): ProjectionSession {
  const now = Date.now()
  return {
    ...session,
    updatedAt: Math.max(now, session.updatedAt + 1), // Ensure timestamp always advances
    syncState: {
      ...session.syncState,
      ...updates,
      lastSyncTimestamp: Math.max(now, session.syncState.lastSyncTimestamp + 1)
    }
  }
}

// ============================================================================
// SESSION STATE MAPPINGS
// ============================================================================

/**
 * Map FSM state to UI projection state
 */
function mapFSMStateToUIState(fsmState: ProjectionState): UIProjectionState {
  switch (fsmState) {
    case 'STOPPED':
      return 'CLEAR'
    case 'ACTIVE':
      return 'LIVE'
    case 'PAUSED':
      return 'FREEZE'
    case 'IDLE':
      return 'CLEAR'
    default:
      return 'CLEAR'
  }
}

/**
 * Map UI state to FSM state
 */
export function mapUIStateToFSMState(uiState: UIProjectionState): ProjectionState {
  switch (uiState) {
    case 'CLEAR':
      return 'STOPPED'
    case 'LIVE':
      return 'ACTIVE'
    case 'FREEZE':
      return 'PAUSED'
    case 'BLACK':
      return 'PAUSED'
    case 'LOGO':
      return 'PAUSED'
    default:
      return 'STOPPED'
  }
}

// ============================================================================
// SESSION VALIDATION
// ============================================================================

/**
 * Validate session state consistency
 */
export function validateSessionState(session: ProjectionSession): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // FSM state consistency
  if (!session.fsmState.state) {
    errors.push('FSM state is missing')
  }

  // Media state consistency
  if (session.mediaState.currentSlideIndex < 0) {
    errors.push('Current slide index cannot be negative')
  }

  if (
    session.mediaState.slides.length > 0 &&
    session.mediaState.currentSlideIndex >= session.mediaState.slides.length
  ) {
    errors.push('Current slide index exceeds slides array length')
  }

  // Operator context consistency
  if (
    session.operatorContext.programLockState !== 'LOCKED' &&
    session.operatorContext.programLockState !== 'UNLOCKED'
  ) {
    errors.push('Invalid program lock state')
  }

  // Output config consistency
  const validOutputModes = ['SINGLE', 'DUAL', 'EXTENDED']
  if (!validOutputModes.includes(session.outputConfig.outputMode)) {
    errors.push('Invalid output mode')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// ============================================================================
// SESSION SERIALIZATION
// ============================================================================

/**
 * Serialize session for storage/persistence
 */
export function serializeSession(session: ProjectionSession): string {
  return JSON.stringify(session, null, 2)
}

/**
 * Deserialize session from storage
 */
export function deserializeSession(json: string): ProjectionSession {
  const parsed = JSON.parse(json)

  // Validate structure
  if (!parsed.sessionId || !parsed.fsmState || !parsed.mediaState) {
    throw new Error('Invalid session data structure')
  }

  return parsed as ProjectionSession
}
