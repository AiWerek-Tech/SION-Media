/**
 * @core/runtime/contracts/runtime-types
 *
 * Core runtime type definitions.
 * Foundation for all event envelopes, command structures, and correlation tracking.
 *
 * These types establish:
 * - Immutable event contracts
 * - Command intent structures
 * - Deterministic timestamp strategy
 * - Audit/replay foundations
 *
 * @module runtime-types
 */

/**
 * Runtime Event Source
 * Who/what emitted the event (for audit and replay)
 */
export type RuntimeEventSource =
  | 'OPERATOR' // Human operator (keyboard, UI, remote)
  | 'SYSTEM' // System-initiated (timer, automatic)
  | 'AUTOMATION' // Macro engine or scripted
  | 'EXTERNAL' // Remote device, websocket, mobile
  | 'INTERNAL' // System recovery, state sync

/**
 * Command Source
 * Where a command originated (for audit and replay)
 */
export type CommandSource =
  | 'KEYBOARD'
  | 'UI_BUTTON'
  | 'QUICK_JUMP'
  | 'COMMAND_PALETTE'
  | 'MIDI'
  | 'STREAM_DECK'
  | 'REMOTE_APP'
  | 'WEBSOCKET'
  | 'AUTOMATION'
  | 'MACRO'

/**
 * Correlation ID Strategy
 *
 * Used for:
 * - Command tracing (command → events → side effects)
 * - Operator audit logs
 * - Distributed tracing across main/renderer/devices
 * - Replay systems
 * - Automation chains
 * - Debugging projection desync
 *
 * Format: UUID v4 (128-bit, 36 chars with hyphens)
 * Generated at command entry point, propagated through event chain
 */
export type CorrelationId = string & { readonly __brand: 'CorrelationId' }

/**
 * Create a correlation ID (branded string)
 */
export function createCorrelationId(): CorrelationId {
  return `${Math.random().toString(36).substr(2, 9)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` as CorrelationId
}

/**
 * Runtime Event Envelope
 *
 * Every runtime event must conform to this structure.
 * Immutable after emission.
 *
 * Supports:
 * - Deterministic replay (id + timestamp)
 * - Audit logging (source + correlationId)
 * - Distributed tracing (correlationId)
 * - Event sourcing (type + payload)
 * - Observability (latency between emitted/handled)
 */
export interface RuntimeEventEnvelope<T = Record<string, unknown>> {
  /**
   * Unique event identifier (UUID)
   * Immutable, globally unique within runtime session
   * Used for: deduplication, replay identification, audit trails
   */
  id: string

  /**
   * Event type (namespaced)
   * Format: domain:action (e.g., projection:slide-changed, playlist:item-loaded)
   * MUST use RuntimeEventType discriminator
   */
  type: RuntimeEventType

  /**
   * When event was emitted (milliseconds since epoch)
   * Server time, not client time
   * Used for: replay ordering, latency measurement, correlation
   */
  timestamp: number

  /**
   * Who/what emitted the event (for audit)
   * Used for: replay, audit logging, permissions
   */
  source: RuntimeEventSource

  /**
   * Correlation ID linking command → events
   * Traces the full chain: operator command → execution → side effects
   * Optional (some system events have no command origin)
   * CRITICAL for: debugging, automation, distributed tracing
   */
  correlationId?: CorrelationId

  /**
   * Event payload (typed by discriminator)
   * Immutable after emission
   * Schema enforcement via RuntimeEventType
   */
  payload: T

  /**
   * Optional: The command that triggered this event
   * Not always present (some events are system-originated)
   */
  command?: {
    type: string
    source: CommandSource
    correlationId?: CorrelationId
  }
}

/**
 * Runtime Command Intent
 *
 * Represents a request for action.
 * Can be validated, throttled, or blocked.
 * Mutable during routing, immutable after execution begins.
 */
export interface RuntimeCommand<T = Record<string, unknown>> {
  /**
   * Command type (namespaced)
   * Format: domain:action (e.g., projection:go-to-slide, playlist:load-item)
   * MUST use RuntimeCommandType discriminator
   */
  type: RuntimeCommandType

  /**
   * Command payload (typed by discriminator)
   * Configuration for the command execution
   */
  payload?: T

  /**
   * Where the command originated (for audit)
   */
  source: CommandSource

  /**
   * When command was issued (milliseconds since epoch)
   */
  timestamp: number

  /**
   * Correlation ID for tracing command → events
   * If not provided, a new one is generated
   * Propagated to all resulting events
   */
  correlationId?: CorrelationId
}

/**
 * Command Execution Result
 *
 * Outcome of a command execution.
 * Immutable after completion.
 */
export interface RuntimeCommandResult {
  /** Unique execution ID (uuid) */
  id: string

  /** Was command execution successful? */
  success: boolean

  /** Execution status code */
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR' | 'THROTTLED'

  /** Execution level (for severity) */
  level: 'INFO' | 'WARN' | 'ERROR'

  /** Error message (if failed) */
  error?: string

  /** Result data (if any) */
  result?: unknown

  /** Execution duration in milliseconds */
  durationMs: number

  /** When result was recorded */
  timestamp: number
}

/**
 * Event Type Discriminator
 *
 * Central registry of all valid runtime events.
 * Organized by domain (namespace).
 *
 * Naming convention: domain:action
 * - projection:* → slide changes, state transitions
 * - playlist:* → item loaded, playback control
 * - runtime:* → command execution, orchestration
 * - system:* → app lifecycle, recovery
 * - operator:* → user actions, settings
 *
 * NO string literals scattered across codebase.
 * All events routed through this enum.
 */
export type RuntimeEventType =
  // Projection Domain
  | 'projection:slide-changed'
  | 'projection:section-reached'
  | 'projection:state-changed'
  | 'projection:frozen'
  | 'projection:blacked'
  | 'projection:cleared'
  | 'projection:live-taken'
  | 'projection:cue-taken'
  | 'projection:desync-detected'

  // Playlist Domain
  | 'playlist:item-loaded'
  | 'playlist:item-cued'
  | 'playlist:playback-started'
  | 'playlist:playback-stopped'

  // Runtime Orchestration
  | 'runtime:command-executed'
  | 'runtime:command-rejected'
  | 'runtime:command-throttled'
  | 'runtime:state-corrupted'
  | 'runtime:recovery-initiated'

  // System Domain
  | 'system:app-started'
  | 'system:app-ready'
  | 'system:db-initialized'
  | 'system:crash-detected'

  // Operator Domain (User Actions)
  | 'operator:settings-changed'
  | 'operator:profile-switched'

/**
 * Command Type Discriminator
 *
 * Central registry of all valid runtime commands.
 * Organized by domain (namespace).
 *
 * Naming convention: domain:action
 * - projection:* → slide navigation, state control
 * - playlist:* → load, queue, playback
 * - runtime:* → system-level orchestration
 * - operator:* → settings, configuration
 */
export type RuntimeCommandType =
  // Projection Commands
  | 'projection:go-to-slide'
  | 'projection:go-to-section'
  | 'projection:go-to-address'
  | 'projection:next-slide'
  | 'projection:prev-slide'
  | 'projection:go-live'
  | 'projection:take-cue'
  | 'projection:black'
  | 'projection:freeze'
  | 'projection:clear'

  // Playlist Commands
  | 'playlist:load-item'
  | 'playlist:queue-next'
  | 'playlist:cue-next'

  // Protection Commands (Runtime Protection State)
  | 'protection:mark-dirty'
  | 'protection:update-live'
  | 'protection:discard-changes'

  // Timer Commands (Confidence Monitor)
  | 'timer:start'
  | 'timer:pause'
  | 'timer:reset'
  | 'timer:tick'

  // Runtime Commands
  | 'runtime:start-timer'
  | 'runtime:stop-timer'
  | 'runtime:reset-timer'

  // Operator Commands
  | 'operator:update-settings'

/**
 * Event Filtering Strategy
 *
 * Used for:
 * - Selective event subscriptions
 * - Audit log querying
 * - Replay systems
 */
export interface RuntimeEventFilter {
  /** Match by event type(s) */
  types?: RuntimeEventType[]

  /** Match by source(s) */
  sources?: RuntimeEventSource[]

  /** Match by correlation ID (trace a chain) */
  correlationId?: CorrelationId

  /** Match by success/failure */
  success?: boolean

  /** Time range filter */
  after?: number
  before?: number
}

/**
 * Event Handler
 *
 * Typed listener for runtime events.
 * Synchronous or asynchronous.
 */
export type RuntimeEventHandler = (event: RuntimeEventEnvelope) => void | Promise<void>

/**
 * Command Handler
 *
 * Typed executor for a runtime command.
 * Returns execution result.
 */
export type RuntimeCommandHandler = (command: RuntimeCommand) => Promise<RuntimeCommandResult>

/**
 * Audit Log Entry
 *
 * Immutable record of command + outcome.
 * Retention policy: 7 days or 10,000 entries (whichever first)
 * Used for: debugging, audit trails, replay
 */
export interface AuditLogEntry {
  /** Event ID */
  id: string

  /** Command that was executed */
  command: RuntimeCommand

  /** Outcome */
  result: RuntimeCommandResult

  /** When recorded */
  timestamp: number

  /** Correlation ID for tracing */
  correlationId?: CorrelationId
}
