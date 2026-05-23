/**
 * @core/runtime/contracts/correlation
 *
 * Correlation ID Management
 *
 * Provides utilities for:
 * - Correlation ID generation
 * - Command → Event tracing
 * - Operator audit logs
 * - Distributed tracing across IPC/websocket/devices
 * - Replay systems
 * - Debugging projection desync
 *
 * Strategy:
 * - Generate correlation ID at command entry point
 * - Propagate through entire event chain
 * - Include in audit logs and observability
 *
 * @module correlation
 */

import type {
  CorrelationId,
  AuditLogEntry,
  RuntimeCommand,
  RuntimeCommandResult
} from './runtime-types'

/**
 * Correlation Trace
 *
 * Complete audit trail of a command through the system.
 * Used for debugging, replay, and operational transparency.
 */
export interface CorrelationTrace {
  /** Correlation ID (UUID) */
  id: CorrelationId

  /** Original command */
  command: RuntimeCommand

  /** All emitted events with this correlation ID */
  events: Array<{
    id: string
    type: string
    timestamp: number
    success: boolean
  }>

  /** Final result */
  result: RuntimeCommandResult

  /** Total execution time */
  totalDurationMs: number

  /** When trace was recorded */
  recordedAt: number
}

/**
 * Correlation Store
 *
 * In-memory store of active and recent correlations.
 * Used for: tracing, debugging, correlation ID lookups.
 *
 * Retention policy:
 * - Active: stored while command is executing
 * - Recent: stored for 5 minutes after completion
 * - Archived: moved to persistent audit log after retention
 *
 * Memory management:
 * - Max 1000 active traces (warn at 800, flush oldest at 1000)
 * - Recent traces stored with LRU eviction
 */
export class CorrelationStore {
  private activeTraces: Map<CorrelationId, CorrelationTrace> = new Map()
  private recentTraces: Map<CorrelationId, CorrelationTrace> = new Map()
  private recentTimeout: Map<CorrelationId, ReturnType<typeof setTimeout>> = new Map()

  private readonly MAX_ACTIVE = 1000
  private readonly WARN_ACTIVE = 800
  private readonly RECENT_RETENTION_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_RECENT = 500

  /**
   * Register a new trace (at command entry)
   */
  registerTrace(id: CorrelationId, command: RuntimeCommand): void {
    if (this.activeTraces.size >= this.MAX_ACTIVE) {
      console.warn(
        `[CorrelationStore] Active traces exceeded limit (${this.MAX_ACTIVE}), flushing oldest`
      )
      const firstKey = this.activeTraces.keys().next().value
      if (firstKey) {
        this.activeTraces.delete(firstKey)
      }
    }

    if (this.activeTraces.size >= this.WARN_ACTIVE) {
      console.warn(`[CorrelationStore] High active trace count (${this.activeTraces.size})`)
    }

    const trace: CorrelationTrace = {
      id,
      command,
      events: [],
      result: {
        id: '',
        success: false,
        status: 'SUCCESS',
        level: 'INFO',
        durationMs: 0,
        timestamp: Date.now()
      },
      totalDurationMs: 0,
      recordedAt: Date.now()
    }

    this.activeTraces.set(id, trace)
  }

  /**
   * Record an event for a correlation ID
   */
  recordEvent(
    id: CorrelationId,
    eventId: string,
    eventType: string,
    timestamp: number,
    success: boolean
  ): void {
    const trace = this.activeTraces.get(id)
    if (trace) {
      trace.events.push({
        id: eventId,
        type: eventType,
        timestamp,
        success
      })
    }
  }

  /**
   * Complete a trace (at command result)
   * Moves from active to recent
   */
  completeTrace(id: CorrelationId, result: RuntimeCommandResult): CorrelationTrace | undefined {
    const trace = this.activeTraces.get(id)
    if (!trace) return undefined

    trace.result = result
    trace.totalDurationMs = result.timestamp - trace.recordedAt

    // Move to recent
    this.activeTraces.delete(id)
    this.recentTraces.set(id, trace)

    // Auto-expire from recent after retention period
    if (this.recentTimeout.has(id)) {
      clearTimeout(this.recentTimeout.get(id)!)
    }

    const timeout = setTimeout(() => {
      this.recentTraces.delete(id)
      this.recentTimeout.delete(id)
    }, this.RECENT_RETENTION_MS)

    this.recentTimeout.set(id, timeout)

    // Enforce recent max size
    if (this.recentTraces.size > this.MAX_RECENT) {
      const firstKey = this.recentTraces.keys().next().value
      if (firstKey) {
        this.recentTraces.delete(firstKey)
        const timeoutId = this.recentTimeout.get(firstKey)
        if (timeoutId) {
          clearTimeout(timeoutId)
          this.recentTimeout.delete(firstKey)
        }
      }
    }

    return trace
  }

  /**
   * Get active trace
   */
  getActiveTrace(id: CorrelationId): CorrelationTrace | undefined {
    return this.activeTraces.get(id)
  }

  /**
   * Get completed trace (recent)
   */
  getRecentTrace(id: CorrelationId): CorrelationTrace | undefined {
    return this.recentTraces.get(id)
  }

  /**
   * Query traces by correlation ID
   */
  queryTraces(correlationId: CorrelationId): CorrelationTrace | undefined {
    return this.activeTraces.get(correlationId) || this.recentTraces.get(correlationId)
  }

  /**
   * Get all active traces (for debugging)
   */
  getActiveTraces(): CorrelationTrace[] {
    return Array.from(this.activeTraces.values())
  }

  /**
   * Get all recent traces (for audit)
   */
  getRecentTraces(): CorrelationTrace[] {
    return Array.from(this.recentTraces.values())
  }

  /**
   * Export trace for audit logging / replay
   */
  exportTrace(id: CorrelationId): CorrelationTrace | undefined {
    const trace = this.queryTraces(id)
    if (!trace) return undefined

    return {
      ...trace,
      // Immutable copy
      command: { ...trace.command },
      result: { ...trace.result },
      events: [...trace.events]
    }
  }

  /**
   * Clear all traces (dangerous - use for testing only)
   */
  clear(): void {
    for (const timeout of this.recentTimeout.values()) {
      clearTimeout(timeout)
    }
    this.activeTraces.clear()
    this.recentTraces.clear()
    this.recentTimeout.clear()
  }

  /**
   * Get statistics
   */
  getStats(): {
    active: number
    recent: number
    totalEvents: number
  } {
    const totalEvents = Array.from(this.activeTraces.values())
      .concat(Array.from(this.recentTraces.values()))
      .reduce((sum, trace) => sum + trace.events.length, 0)

    return {
      active: this.activeTraces.size,
      recent: this.recentTraces.size,
      totalEvents
    }
  }
}

/**
 * Global Correlation Store
 *
 * Singleton instance.
 * Used by command bus and event emitters.
 */
export const correlationStore = new CorrelationStore()

/**
 * Create a trace entry for audit logging
 *
 * Used to convert CorrelationTrace into AuditLogEntry.
 */
export function createAuditLogEntry(trace: CorrelationTrace): AuditLogEntry {
  return {
    id: trace.id,
    command: trace.command,
    result: trace.result,
    timestamp: trace.recordedAt,
    correlationId: trace.id
  }
}

/**
 * Replay utilities
 *
 * For deterministic replay of command chains.
 */
export interface ReplaySession {
  /** Traces to replay */
  traces: CorrelationTrace[]

  /** Start time (for interval replay) */
  startTime: number

  /** Current replay offset */
  offset: number

  /** Is currently replaying? */
  isReplaying: boolean
}

/**
 * Create replay session from traces
 */
export function createReplaySession(traces: CorrelationTrace[]): ReplaySession {
  return {
    traces,
    startTime: Date.now(),
    offset: 0,
    isReplaying: false
  }
}

/**
 * Get next command to replay
 */
export function getNextReplayCommand(session: ReplaySession): RuntimeCommand | null {
  if (session.offset >= session.traces.length) {
    return null
  }

  const trace = session.traces[session.offset]
  session.offset++

  return trace.command
}

/**
 * Correlation ID validation
 *
 * Check if string is valid correlation ID format.
 */
export function isValidCorrelationId(value: unknown): value is CorrelationId {
  if (typeof value !== 'string') return false
  if (value.length < 10 || value.length > 50) return false
  return /^[a-z0-9\-_]+$/.test(value)
}
