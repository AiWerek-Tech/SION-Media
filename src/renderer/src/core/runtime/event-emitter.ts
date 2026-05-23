/**
 * Runtime Event Emitter
 *
 * Domain-specific event publishers using contract types.
 * Provides typed event emission for each domain.
 *
 * @module event-emitter
 */

import type {
  ProjectionSlideChangedEvent,
  ProjectionSectionReachedEvent,
  ProjectionStateChangedEvent,
  ProjectionFrozenEvent,
  ProjectionBlackedEvent,
  ProjectionClearedEvent,
  ProjectionLiveTakenEvent,
  ProjectionCueTakenEvent,
  ProjectionDesyncDetectedEvent,
  PlaylistItemLoadedEvent,
  PlaylistItemCuedEvent,
  PlaylistPlaybackStartedEvent,
  PlaylistPlaybackStoppedEvent,
  SystemAppStartedEvent,
  SystemAppReadyEvent,
  SystemDbInitializedEvent,
  SystemCrashDetectedEvent,
  OperatorSettingsChangedEvent,
  OperatorProfileSwitchedEvent,
  CorrelationId
} from './contracts'
import { createEvent } from './contracts'

// ============================================================================
// Domain Event Emitters
// ============================================================================

/**
 * Projection Event Emitter
 *
 * Emits projection-related events with proper typing and correlation.
 */
export class ProjectionEventEmitter {
  private listeners: Set<
    (
      event:
        | ProjectionSlideChangedEvent
        | ProjectionSectionReachedEvent
        | ProjectionStateChangedEvent
        | ProjectionFrozenEvent
        | ProjectionBlackedEvent
        | ProjectionClearedEvent
        | ProjectionLiveTakenEvent
        | ProjectionCueTakenEvent
        | ProjectionDesyncDetectedEvent
    ) => void
  > = new Set()

  subscribe(
    listener: (
      event:
        | ProjectionSlideChangedEvent
        | ProjectionSectionReachedEvent
        | ProjectionStateChangedEvent
        | ProjectionFrozenEvent
        | ProjectionBlackedEvent
        | ProjectionClearedEvent
        | ProjectionLiveTakenEvent
        | ProjectionCueTakenEvent
        | ProjectionDesyncDetectedEvent
    ) => void
  ): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emitSlideChanged(
    slideIndex: number,
    totalSlides: number,
    sectionLabel?: string,
    text?: string,
    correlationId?: CorrelationId
  ): void {
    const event = createEvent(
      'projection:slide-changed',
      {
        slideIndex,
        totalSlides,
        sectionLabel,
        text
      },
      'SYSTEM',
      correlationId
    ) as ProjectionSlideChangedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitSectionReached(sectionName: string, slideIndex: number, correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:section-reached',
      {
        sectionName,
        slideIndex
      },
      'SYSTEM',
      correlationId
    ) as ProjectionSectionReachedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitStateChanged(
    state: 'LIVE' | 'CUE' | 'BLACK' | 'FROZEN' | 'CLEARED',
    correlationId?: CorrelationId
  ): void {
    const event = createEvent(
      'projection:state-changed',
      {
        state
      },
      'SYSTEM',
      correlationId
    ) as ProjectionStateChangedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitFrozen(frozen: boolean, correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:frozen',
      {
        frozen
      },
      'SYSTEM',
      correlationId
    ) as ProjectionFrozenEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitBlacked(blacked: boolean, correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:blacked',
      {
        blacked
      },
      'SYSTEM',
      correlationId
    ) as ProjectionBlackedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitCleared(correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:cleared',
      {},
      'SYSTEM',
      correlationId
    ) as ProjectionClearedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitLiveTaken(correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:live-taken',
      {},
      'SYSTEM',
      correlationId
    ) as ProjectionLiveTakenEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitCueTaken(correlationId?: CorrelationId): void {
    const event = createEvent(
      'projection:cue-taken',
      {},
      'SYSTEM',
      correlationId
    ) as ProjectionCueTakenEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }

  emitDesyncDetected(
    reason: string,
    liveIndex: number,
    cueIndex: number,
    correlationId?: CorrelationId
  ): void {
    const event = createEvent(
      'projection:desync-detected',
      {
        reason,
        liveIndex,
        cueIndex
      },
      'SYSTEM',
      correlationId
    ) as ProjectionDesyncDetectedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[ProjectionEventEmitter] Listener error:', err)
      }
    })
  }
}

/**
 * Playlist Event Emitter
 */
export class PlaylistEventEmitter {
  private listeners: Set<
    (
      event:
        | PlaylistItemLoadedEvent
        | PlaylistItemCuedEvent
        | PlaylistPlaybackStartedEvent
        | PlaylistPlaybackStoppedEvent
    ) => void
  > = new Set()

  subscribe(
    listener: (
      event:
        | PlaylistItemLoadedEvent
        | PlaylistItemCuedEvent
        | PlaylistPlaybackStartedEvent
        | PlaylistPlaybackStoppedEvent
    ) => void
  ): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emitItemLoaded(itemId: string, title: string, correlationId?: CorrelationId): void {
    const event = createEvent(
      'playlist:item-loaded',
      {
        itemId,
        title
      },
      'SYSTEM',
      correlationId
    ) as PlaylistItemLoadedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[PlaylistEventEmitter] Listener error:', err)
      }
    })
  }

  emitItemCued(itemId: string, position: number, correlationId?: CorrelationId): void {
    const event = createEvent(
      'playlist:item-cued',
      {
        itemId,
        position
      },
      'SYSTEM',
      correlationId
    ) as PlaylistItemCuedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[PlaylistEventEmitter] Listener error:', err)
      }
    })
  }

  emitPlaybackStarted(itemId: string, correlationId?: CorrelationId): void {
    const event = createEvent(
      'playlist:playback-started',
      {
        itemId
      },
      'SYSTEM',
      correlationId
    ) as PlaylistPlaybackStartedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[PlaylistEventEmitter] Listener error:', err)
      }
    })
  }

  emitPlaybackStopped(itemId: string, correlationId?: CorrelationId): void {
    const event = createEvent(
      'playlist:playback-stopped',
      {
        itemId
      },
      'SYSTEM',
      correlationId
    ) as PlaylistPlaybackStoppedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[PlaylistEventEmitter] Listener error:', err)
      }
    })
  }
}

/**
 * System Event Emitter
 */
export class SystemEventEmitter {
  private listeners: Set<
    (
      event:
        | SystemAppStartedEvent
        | SystemAppReadyEvent
        | SystemDbInitializedEvent
        | SystemCrashDetectedEvent
    ) => void
  > = new Set()

  subscribe(
    listener: (
      event:
        | SystemAppStartedEvent
        | SystemAppReadyEvent
        | SystemDbInitializedEvent
        | SystemCrashDetectedEvent
    ) => void
  ): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emitAppStarted(version: string): void {
    const event = createEvent(
      'system:app-started',
      {
        version,
        timestamp: Date.now()
      },
      'SYSTEM'
    ) as SystemAppStartedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[SystemEventEmitter] Listener error:', err)
      }
    })
  }

  emitAppReady(initTimeMs: number): void {
    const event = createEvent(
      'system:app-ready',
      {
        initTimeMs
      },
      'SYSTEM'
    ) as SystemAppReadyEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[SystemEventEmitter] Listener error:', err)
      }
    })
  }

  emitDbInitialized(schemaVersion: number, songCount: number): void {
    const event = createEvent(
      'system:db-initialized',
      {
        schema_version: schemaVersion,
        song_count: songCount
      },
      'SYSTEM'
    ) as SystemDbInitializedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[SystemEventEmitter] Listener error:', err)
      }
    })
  }

  emitCrashDetected(error: string, stack?: string): void {
    const event = createEvent(
      'system:crash-detected',
      {
        error,
        stack
      },
      'SYSTEM'
    ) as SystemCrashDetectedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[SystemEventEmitter] Listener error:', err)
      }
    })
  }
}

/**
 * Operator Event Emitter
 */
export class OperatorEventEmitter {
  private listeners: Set<
    (event: OperatorSettingsChangedEvent | OperatorProfileSwitchedEvent) => void
  > = new Set()

  subscribe(
    listener: (event: OperatorSettingsChangedEvent | OperatorProfileSwitchedEvent) => void
  ): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emitSettingsChanged(
    setting: string,
    previousValue: unknown,
    newValue: unknown,
    correlationId?: CorrelationId
  ): void {
    const event = createEvent(
      'operator:settings-changed',
      {
        setting,
        previousValue,
        newValue
      },
      'OPERATOR',
      correlationId
    ) as OperatorSettingsChangedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[OperatorEventEmitter] Listener error:', err)
      }
    })
  }

  emitProfileSwitched(profileId: string, profileName: string, correlationId?: CorrelationId): void {
    const event = createEvent(
      'operator:profile-switched',
      {
        profileId,
        profileName
      },
      'OPERATOR',
      correlationId
    ) as OperatorProfileSwitchedEvent

    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[OperatorEventEmitter] Listener error:', err)
      }
    })
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const projectionEvents = new ProjectionEventEmitter()
export const playlistEvents = new PlaylistEventEmitter()
export const systemEvents = new SystemEventEmitter()
export const operatorEvents = new OperatorEventEmitter()
