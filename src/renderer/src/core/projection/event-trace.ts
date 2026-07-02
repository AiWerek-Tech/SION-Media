/**
 * Event Trace System
 *
 * Lightweight observability layer for FSM transitions.
 * Provides debugging, audit trails, and performance monitoring.
 *
 * Features:
 * - Automatic transition logging
 * - Circular buffer storage
 * - Query/filter API
 * - Export/import for debugging
 * - Performance metrics
 */

// ============================================================================
// TRACE TYPES
// ============================================================================

export interface EventTrace {
  id: string
  timestamp: number
  type: 'COMMAND' | 'TRANSITION' | 'EFFECT' | 'ERROR'
  source: 'UI' | 'FSM' | 'ADAPTER' | 'STORE' | 'SYSTEM'
  correlationId?: string

  // Command context
  command?: {
    type: string
    payload?: unknown
  }

  // Transition context
  transition?: {
    fromState: string
    toState: string
    event: string
    payload?: unknown
  }

  // Performance
  duration?: number

  // Error context
  error?: {
    message: string
    stack?: string
  }

  // Metadata
  metadata?: Record<string, unknown>
}

export interface TraceQuery {
  type?: EventTrace['type']
  source?: EventTrace['source']
  correlationId?: string
  since?: number
  until?: number
  limit?: number
}

export interface TraceStats {
  totalTraces: number
  tracesByType: Record<string, number>
  tracesBySource: Record<string, number>
  averageDuration: number
  errorCount: number
  timeRange: {
    oldest: number
    newest: number
  }
}

// ============================================================================
// TRACE STORAGE
// ============================================================================

/**
 * Circular buffer for efficient trace storage
 */
class TraceStorage {
  private traces: EventTrace[] = []
  private maxSize: number
  private nextId = 1

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  /**
   * Add trace to storage
   */
  add(trace: Omit<EventTrace, 'id' | 'timestamp'>): EventTrace {
    const fullTrace: EventTrace = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...trace
    }

    this.traces.push(fullTrace)

    // Maintain circular buffer
    if (this.traces.length > this.maxSize) {
      this.traces.shift()
    }

    return fullTrace
  }

  /**
   * Query traces with filters
   */
  query(query: TraceQuery = {}): EventTrace[] {
    let results = [...this.traces]

    if (query.type) {
      results = results.filter((t) => t.type === query.type)
    }

    if (query.source) {
      results = results.filter((t) => t.source === query.source)
    }

    if (query.correlationId) {
      results = results.filter((t) => t.correlationId === query.correlationId)
    }

    const since = query.since
    if (typeof since === 'number') {
      results = results.filter((t) => t.timestamp >= since)
    }

    const until = query.until
    if (typeof until === 'number') {
      results = results.filter((t) => t.timestamp <= until)
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => b.timestamp - a.timestamp)

    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Get trace statistics
   */
  getStats(): TraceStats {
    if (this.traces.length === 0) {
      return {
        totalTraces: 0,
        tracesByType: {},
        tracesBySource: {},
        averageDuration: 0,
        errorCount: 0,
        timeRange: { oldest: 0, newest: 0 }
      }
    }

    const tracesByType: Record<string, number> = {}
    const tracesBySource: Record<string, number> = {}
    let totalDuration = 0
    let durationCount = 0
    let errorCount = 0

    this.traces.forEach((trace) => {
      tracesByType[trace.type] = (tracesByType[trace.type] || 0) + 1
      tracesBySource[trace.source] = (tracesBySource[trace.source] || 0) + 1

      if (trace.duration !== undefined) {
        totalDuration += trace.duration
        durationCount++
      }

      if (trace.type === 'ERROR') {
        errorCount++
      }
    })

    const timestamps = this.traces.map((t) => t.timestamp)

    return {
      totalTraces: this.traces.length,
      tracesByType,
      tracesBySource,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errorCount,
      timeRange: {
        oldest: Math.min(...timestamps),
        newest: Math.max(...timestamps)
      }
    }
  }

  /**
   * Export traces for debugging
   */
  export(): EventTrace[] {
    return [...this.traces]
  }

  /**
   * Import traces (for replay/debugging)
   */
  import(traces: EventTrace[]): void {
    this.traces = [...traces]
    this.nextId = Math.max(...traces.map((t) => parseInt(t.id.split('_')[1]))) + 1
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.traces = []
    this.nextId = 1
  }

  /**
   * Set max storage size
   */
  setMaxSize(maxSize: number): void {
    this.maxSize = maxSize
    // Trim if needed
    if (this.traces.length > maxSize) {
      this.traces = this.traces.slice(-maxSize)
    }
  }

  private generateId(): string {
    return `trace_${this.nextId++}_${Date.now()}`
  }
}

// ============================================================================
// EVENT LOGGER
// ============================================================================

/**
 * Main event logger for the projection system
 */
export class EventLogger {
  private storage: TraceStorage
  private enabled: boolean = true
  private logToConsole: boolean = false

  constructor(maxTraces = 1000) {
    this.storage = new TraceStorage(maxTraces)
  }

  /**
   * Log UI command
   */
  logCommand(
    commandType: string,
    payload?: unknown,
    source: EventTrace['source'] = 'UI',
    correlationId?: string
  ): string {
    const trace = this.storage.add({
      type: 'COMMAND',
      source,
      correlationId,
      command: { type: commandType, payload }
    })

    this.logToConsoleIfEnabled('📝 COMMAND', trace)
    return trace.id
  }

  /**
   * Log FSM transition
   */
  logTransition(
    fromState: string,
    toState: string,
    event: string,
    payload?: unknown,
    duration?: number,
    correlationId?: string
  ): string {
    const trace = this.storage.add({
      type: 'TRANSITION',
      source: 'FSM',
      correlationId,
      transition: { fromState, toState, event, payload },
      duration
    })

    this.logToConsoleIfEnabled('🔄 TRANSITION', trace)
    return trace.id
  }

  /**
   * Log side effect execution
   */
  logEffect(effectType: string, payload?: unknown, correlationId?: string): string {
    const trace = this.storage.add({
      type: 'EFFECT',
      source: 'FSM',
      correlationId,
      metadata: { effectType, payload }
    })

    this.logToConsoleIfEnabled('⚡ EFFECT', trace)
    return trace.id
  }

  /**
   * Log error
   */
  logError(
    error: Error | string,
    context?: Record<string, unknown>,
    correlationId?: string
  ): string {
    const errorInfo =
      typeof error === 'string'
        ? { message: error }
        : { message: error.message, stack: error.stack }

    const trace = this.storage.add({
      type: 'ERROR',
      source: 'SYSTEM',
      correlationId,
      error: errorInfo,
      metadata: context
    })

    this.logToConsoleIfEnabled('❌ ERROR', trace)
    return trace.id
  }

  /**
   * Query traces
   */
  query(query: TraceQuery = {}): EventTrace[] {
    return this.storage.query(query)
  }

  /**
   * Get statistics
   */
  getStats(): TraceStats {
    return this.storage.getStats()
  }

  /**
   * Export traces
   */
  export(): EventTrace[] {
    return this.storage.export()
  }

  /**
   * Import traces
   */
  import(traces: EventTrace[]): void {
    this.storage.import(traces)
  }

  /**
   * Clear all traces
   */
  clear(): void {
    this.storage.clear()
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled: boolean): void {
    this.logToConsole = enabled
  }

  /**
   * Set max trace storage
   */
  setMaxTraces(maxTraces: number): void {
    this.storage.setMaxSize(maxTraces)
  }

  private logToConsoleIfEnabled(label: string, trace: EventTrace): void {
    if (!this.logToConsole || !this.enabled) return

    const time = new Date(trace.timestamp).toLocaleTimeString()
    console.log(`[${time}] ${label}:`, {
      id: trace.id,
      type: trace.type,
      source: trace.source,
      correlationId: trace.correlationId,
      details: trace.command || trace.transition || trace.error || trace.metadata
    })
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

export const eventLogger = new EventLogger()

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Log command with correlation tracking
 */
export function logCommand(
  commandType: string,
  payload?: unknown,
  source: EventTrace['source'] = 'UI'
): string {
  return eventLogger.logCommand(commandType, payload, source)
}

/**
 * Log transition with timing
 */
export function logTransition(
  fromState: string,
  toState: string,
  event: string,
  payload?: unknown,
  duration?: number
): string {
  return eventLogger.logTransition(fromState, toState, event, payload, duration)
}

/**
 * Log effect
 */
export function logEffect(effectType: string, payload?: unknown): string {
  return eventLogger.logEffect(effectType, payload)
}

/**
 * Log error
 */
export function logError(error: Error | string, context?: Record<string, unknown>): string {
  return eventLogger.logError(error, context)
}

/**
 * Query traces
 */
export function queryTraces(query: TraceQuery = {}): EventTrace[] {
  return eventLogger.query(query)
}

/**
 * Get trace statistics
 */
export function getTraceStats(): TraceStats {
  return eventLogger.getStats()
}

// ============================================================================
// FSM INTEGRATION HOOKS
// ============================================================================

/**
 * Hook to automatically log FSM transitions
 */
export function withTransitionLogging<T extends unknown[], R>(
  fn: (...args: T) => R,
  eventName: string
): (...args: T) => R {
  return (...args: T): R => {
    const start = performance.now()
    try {
      const result = fn(...args)
      const duration = performance.now() - start

      // Log successful transition
      if (result && typeof result === 'object' && 'newState' in result) {
        type TransitionResult = { newState?: { state?: string } }
        const transition = result as TransitionResult
        logTransition(
          transition.newState?.state || 'unknown',
          transition.newState?.state || 'unknown',
          eventName,
          args[0],
          duration
        )
      }

      return result
    } catch (error) {
      // Log failed transition
      logError(error as Error, { event: eventName, args })
      throw error
    }
  }
}
