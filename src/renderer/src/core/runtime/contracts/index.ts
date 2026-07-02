/**
 * @core/runtime/contracts
 *
 * Runtime Event & Command Contracts
 *
 * Central definition point for all runtime orchestration.
 * Establishes strict event/command vocabulary to prevent spaghetti as system grows.
 *
 * Principles:
 * 1. Transport-agnostic (works over IPC, websocket, REST, local)
 * 2. Deterministic (replay-safe, audit-friendly)
 * 3. Typed (compile-time enforcement via discriminator unions)
 * 4. Namespaced (domain:action convention)
 * 5. Immutable (after emission)
 * 6. Correlated (trace command → events)
 *
 * Organized by domain:
 * - projection:* → slide, state, effects
 * - playlist:* → items, playback
 * - runtime:* → orchestration, system
 * - system:* → app lifecycle
 * - operator:* → user actions
 *
 * Usage:
 *
 * ```ts
 * import { RuntimeEvent, createEvent, CorrelationId } from '@core/runtime/contracts'
 *
 * // Emit a typed event
 * const event: RuntimeEvent = createEvent(
 *   'projection:slide-changed',
 *   { slideIndex: 5, totalSlides: 42, text: '...' },
 *   'OPERATOR',
 *   correlationId
 * )
 *
 * // Subscribe with type safety
 * const handler: RuntimeEventHandler = (event: RuntimeEvent) => {
 *   if (event.type === 'projection:slide-changed') {
 *     console.log(event.payload.slideIndex) // Type-safe ✓
 *   }
 * }
 * ```
 *
 * @module contracts
 */

// Core runtime types
export type {
  RuntimeEventSource,
  CommandSource,
  CorrelationId,
  RuntimeEventEnvelope,
  RuntimeCommand,
  RuntimeCommandResult,
  RuntimeEventType,
  RuntimeCommandType,
  RuntimeEventFilter,
  RuntimeEventHandler,
  RuntimeCommandHandler,
  AuditLogEntry
} from './runtime-types'

export {
  createCorrelationId,
  // Exported for type checking only
  type RuntimeEventType as RuntimeEventTypeUnion,
  type RuntimeCommandType as RuntimeCommandTypeUnion
} from './runtime-types'

// Event definitions
export type {
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
  RuntimeCommandExecutedEvent,
  RuntimeCommandRejectedEvent,
  RuntimeCommandThrottledEvent,
  RuntimeStateCorruptedEvent,
  RuntimeRecoveryInitiatedEvent,
  SystemAppStartedEvent,
  SystemAppReadyEvent,
  SystemDbInitializedEvent,
  SystemCrashDetectedEvent,
  OperatorSettingsChangedEvent,
  OperatorProfileSwitchedEvent,
  RuntimeEvent
} from './events'

export { createEvent } from './events'

// Command definitions
export type {
  ProjectionGoToSlideCommand,
  ProjectionGoToSectionCommand,
  ProjectionGoToAddressCommand,
  ProjectionNextSlideCommand,
  ProjectionPrevSlideCommand,
  ProjectionGoLiveCommand,
  ProjectionTakeCueCommand,
  ProjectionBlackCommand,
  ProjectionFreezeCommand,
  ProjectionClearCommand,
  PlaylistLoadItemCommand,
  PlaylistQueueNextCommand,
  PlaylistCueNextCommand,
  RuntimeStartTimerCommand,
  RuntimeStopTimerCommand,
  RuntimeResetTimerCommand,
  OperatorUpdateSettingsCommand,
  RuntimeCommandUnion
} from './commands'

export { createCommand } from './commands'

// Correlation & tracing
export type { CorrelationTrace, ReplaySession } from './correlation'

export {
  CorrelationStore,
  correlationStore,
  createAuditLogEntry,
  createReplaySession,
  getNextReplayCommand,
  isValidCorrelationId
} from './correlation'
