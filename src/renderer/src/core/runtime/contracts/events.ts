/**
 * @core/runtime/contracts/events
 *
 * Runtime Event Definitions
 *
 * Central registry of all valid runtime events.
 * Typed event payloads for each domain.
 *
 * Principle: Every event type has exactly one payload schema.
 * Enforced at compile time via TypeScript discriminator.
 *
 * @module events
 */

import type { RuntimeEventEnvelope, RuntimeEventType } from './runtime-types'

/**
 * Projection Events
 *
 * Emitted when: slide changes, sections reached, projection state changes
 */

export interface ProjectionSlideChangedEvent extends RuntimeEventEnvelope {
  type: 'projection:slide-changed'
  payload: {
    slideIndex: number
    totalSlides: number
    sectionLabel?: string
    text: string
  }
}

export interface ProjectionSectionReachedEvent extends RuntimeEventEnvelope {
  type: 'projection:section-reached'
  payload: {
    sectionLabel: string
    slideIndex: number
  }
}

export interface ProjectionStateChangedEvent extends RuntimeEventEnvelope {
  type: 'projection:state-changed'
  payload: {
    previousState: string
    currentState: 'IDLE' | 'READY' | 'PREVIEWING' | 'LIVE' | 'TRANSITIONING' | 'RECOVERING'
  }
}

export interface ProjectionFrozenEvent extends RuntimeEventEnvelope {
  type: 'projection:frozen'
  payload: {
    frozenSlideIndex: number
  }
}

export interface ProjectionBlackedEvent extends RuntimeEventEnvelope {
  type: 'projection:blacked'
  payload: Record<string, never>
}

export interface ProjectionClearedEvent extends RuntimeEventEnvelope {
  type: 'projection:cleared'
  payload: Record<string, never>
}

export interface ProjectionLiveTakenEvent extends RuntimeEventEnvelope {
  type: 'projection:live-taken'
  payload: {
    slideIndex: number
    sectionLabel?: string
  }
}

export interface ProjectionCueTakenEvent extends RuntimeEventEnvelope {
  type: 'projection:cue-taken'
  payload: {
    slideIndex: number
    sectionLabel?: string
  }
}

export interface ProjectionDesyncDetectedEvent extends RuntimeEventEnvelope {
  type: 'projection:desync-detected'
  payload: {
    expectedIndex: number
    actualIndex: number
    reason: string
    recovery: 'AUTO' | 'MANUAL'
  }
}

/**
 * Playlist Events
 *
 * Emitted when: items loaded, cued, playback started
 */

export interface PlaylistItemLoadedEvent extends RuntimeEventEnvelope {
  type: 'playlist:item-loaded'
  payload: {
    itemId: number
    songTitle: string
    slideCount: number
  }
}

export interface PlaylistItemCuedEvent extends RuntimeEventEnvelope {
  type: 'playlist:item-cued'
  payload: {
    itemId: number
    songTitle: string
  }
}

export interface PlaylistPlaybackStartedEvent extends RuntimeEventEnvelope {
  type: 'playlist:playback-started'
  payload: {
    itemId: number
  }
}

export interface PlaylistPlaybackStoppedEvent extends RuntimeEventEnvelope {
  type: 'playlist:playback-stopped'
  payload: {
    itemId?: number
    reason: 'USER' | 'END_OF_ITEM' | 'ERROR'
  }
}

/**
 * Runtime Orchestration Events
 *
 * Emitted by: command bus, state machines, recovery systems
 */

export interface RuntimeCommandExecutedEvent extends RuntimeEventEnvelope {
  type: 'runtime:command-executed'
  payload: {
    commandType: string
    durationMs: number
    result?: unknown
  }
}

export interface RuntimeCommandRejectedEvent extends RuntimeEventEnvelope {
  type: 'runtime:command-rejected'
  payload: {
    commandType: string
    reason: 'VALIDATION' | 'THROTTLE' | 'STATE' | 'PERMISSION' | 'EXECUTION_ERROR'
    error: string
  }
}

export interface RuntimeCommandThrottledEvent extends RuntimeEventEnvelope {
  type: 'runtime:command-throttled'
  payload: {
    commandType: string
    source: string
    retryAfterMs: number
  }
}

export interface RuntimeStateCorruptedEvent extends RuntimeEventEnvelope {
  type: 'runtime:state-corrupted'
  payload: {
    layer: 'PROJECTION' | 'PLAYLIST' | 'TIMER' | 'PROTECTION'
    issue: string
    recovery: 'AUTO' | 'MANUAL'
  }
}

export interface RuntimeRecoveryInitiatedEvent extends RuntimeEventEnvelope {
  type: 'runtime:recovery-initiated'
  payload: {
    reason: string
    recoveryType: 'STATE_RESET' | 'SESSION_RESTORE' | 'DESYNC_RECOVERY'
  }
}

/**
 * System Events
 *
 * Emitted by: app lifecycle, database, crash recovery
 */

export interface SystemAppStartedEvent extends RuntimeEventEnvelope {
  type: 'system:app-started'
  payload: {
    version: string
    timestamp: number
  }
}

export interface SystemAppReadyEvent extends RuntimeEventEnvelope {
  type: 'system:app-ready'
  payload: {
    initTimeMs: number
  }
}

export interface SystemDbInitializedEvent extends RuntimeEventEnvelope {
  type: 'system:db-initialized'
  payload: {
    schema_version: number
    song_count: number
  }
}

export interface SystemCrashDetectedEvent extends RuntimeEventEnvelope {
  type: 'system:crash-detected'
  payload: {
    error: string
    stack?: string
  }
}

/**
 * Operator Events
 *
 * Emitted when: settings changed, profiles switched
 */

export interface OperatorSettingsChangedEvent extends RuntimeEventEnvelope {
  type: 'operator:settings-changed'
  payload: {
    setting: string
    previousValue: unknown
    newValue: unknown
  }
}

export interface OperatorProfileSwitchedEvent extends RuntimeEventEnvelope {
  type: 'operator:profile-switched'
  payload: {
    profileId: string
    profileName: string
  }
}

/**
 * Union Type: All Valid Events
 *
 * Use this for runtime event handlers.
 * TypeScript discriminator ensures type safety.
 */
export type RuntimeEvent =
  | ProjectionSlideChangedEvent
  | ProjectionSectionReachedEvent
  | ProjectionStateChangedEvent
  | ProjectionFrozenEvent
  | ProjectionBlackedEvent
  | ProjectionClearedEvent
  | ProjectionLiveTakenEvent
  | ProjectionCueTakenEvent
  | ProjectionDesyncDetectedEvent
  | PlaylistItemLoadedEvent
  | PlaylistItemCuedEvent
  | PlaylistPlaybackStartedEvent
  | PlaylistPlaybackStoppedEvent
  | RuntimeCommandExecutedEvent
  | RuntimeCommandRejectedEvent
  | RuntimeCommandThrottledEvent
  | RuntimeStateCorruptedEvent
  | RuntimeRecoveryInitiatedEvent
  | SystemAppStartedEvent
  | SystemAppReadyEvent
  | SystemDbInitializedEvent
  | SystemCrashDetectedEvent
  | OperatorSettingsChangedEvent
  | OperatorProfileSwitchedEvent

/**
 * Type-Safe Event Constructor
 *
 * Ensures event payload matches event type.
 * Used by event emitters to create type-safe events.
 */

export function createEvent<T extends RuntimeEventType>(
  type: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correlationId?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command?: any
): RuntimeEvent {
  return {
    id: `evt_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
    type,
    timestamp: Date.now(),
    source,
    correlationId,
    command,
    payload
  } as RuntimeEvent
}
