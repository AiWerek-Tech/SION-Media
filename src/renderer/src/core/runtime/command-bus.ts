/**
 * Runtime Command Bus
 *
 * Transport-agnostic command execution and event emission.
 * Provides: delivery, subscription, routing, correlation propagation.
 *
 * Architecture:
 *   Commands → Validation → Execution → Events → Correlation
 *
 * @module command-bus
 */

import type {
  RuntimeCommand,
  RuntimeEvent,
  RuntimeCommandType,
  RuntimeEventType,
  RuntimeEventSource,
  CommandSource,
  RuntimeEventFilter,
  RuntimeEventHandler,
  RuntimeCommandHandler,
  CorrelationId
} from './contracts'
import { createEvent, createCommand } from './contracts'

// ============================================================================
// Command Bus Implementation
// ============================================================================

/**
 * Runtime Command Bus
 *
 * Central routing for all runtime commands.
 * Dumb transport: delivery, subscription, routing, correlation only.
 *
 * Business logic must NOT reside here - handlers are registered externally.
 */
class RuntimeCommandBus {
  private handlers: Map<RuntimeCommandType, RuntimeCommandHandler> = new Map()
  private validators: Map<RuntimeCommandType, (cmd: RuntimeCommand) => boolean> = new Map()
  private eventListeners: Set<RuntimeEventHandler> = new Set()
  private filteredListeners: Map<RuntimeEventHandler, RuntimeEventFilter> = new Map()

  // Throttling & Locking
  private isExecuting: boolean = false
  private lastExecutionTimes: Map<string, number> = new Map()
  private globalCooldownMs = 50 // Minimum time between any commands
  private perCommandCooldownMs = 150 // Minimum time between same command from same source

  /**
   * Register a command handler
   */
  registerHandler(type: RuntimeCommandType, handler: RuntimeCommandHandler): void {
    this.handlers.set(type, handler)
  }

  /**
   * Register a command validator
   */
  registerValidator(type: RuntimeCommandType, validator: (cmd: RuntimeCommand) => boolean): void {
    this.validators.set(type, validator)
  }

  /**
   * Subscribe to runtime events (unfiltered)
   */
  subscribe(listener: RuntimeEventHandler): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Subscribe with a filter — only matching events are delivered
   */
  subscribeFiltered(listener: RuntimeEventHandler, filter: RuntimeEventFilter): () => void {
    this.filteredListeners.set(listener, filter)
    return () => this.filteredListeners.delete(listener)
  }

  /**
   * Execute a runtime command
   *
   * Flow: throttle/lock → validate → execute → emit event → correlate
   */
  execute(command: RuntimeCommand): RuntimeEvent {
    const start = performance.now()
    const now = Date.now()
    const throttleKey = `${command.type}:${command.source}`

    // 1. Reentrancy Lock (Atomicity)
    if (this.isExecuting) {
      return this.createRejectedEvent(
        command,
        'Command bus is currently executing another command (reentrancy blocked)',
        start
      )
    }

    // 2. Throttling / Cooldown (Double trigger protection)
    const lastExecution = this.lastExecutionTimes.get(throttleKey) || 0
    if (now - lastExecution < this.perCommandCooldownMs) {
      return this.createRejectedEvent(
        command,
        `Command ${command.type} throttled (cooldown ${this.perCommandCooldownMs}ms)`,
        start
      )
    }

    // 3. Global Cooldown (Flood protection)
    const lastAnyExecution = this.lastExecutionTimes.get('__GLOBAL__') || 0
    if (now - lastAnyExecution < this.globalCooldownMs) {
      return this.createRejectedEvent(
        command,
        `Command bus throttled (global cooldown ${this.globalCooldownMs}ms)`,
        start
      )
    }

    // Lock the bus
    this.isExecuting = true
    this.lastExecutionTimes.set(throttleKey, now)
    this.lastExecutionTimes.set('__GLOBAL__', now)

    // Register correlation trace
    // Note: Correlation is handled at higher level, bus remains dumb transport

    try {
      // Validate
      const validator = this.validators.get(command.type)
      if (validator && !validator(command)) {
        return this.createRejectedEvent(command, 'Command validation failed', start)
      }

      // Execute
      const handler = this.handlers.get(command.type)
      if (!handler) {
        return this.createRejectedEvent(
          command,
          `No handler registered for command: ${command.type}`,
          start
        )
      }

      // Execute handler (synchronous)
      const result = handler(command)
      const durationMs = Math.round((performance.now() - start) * 1000) / 1000

      // Create success event
      const event = createEvent(
        'runtime:command-executed',
        {
          commandType: command.type,
          source: command.source,
          durationMs,
          result
        },
        'SYSTEM',
        command.correlationId,
        {
          type: command.type,
          source: command.source,
          correlationId: command.correlationId
        }
      )

      // Emit event
      this.emitEvent(event)

      return event
    } catch (err) {
      return this.createRejectedEvent(command, `Handler execution failed: ${String(err)}`, start)
    } finally {
      // Unlock the bus
      this.isExecuting = false
    }
  }

  private createRejectedEvent(command: RuntimeCommand, error: string, start: number): RuntimeEvent {
    const durationMs = Math.round((performance.now() - start) * 1000) / 1000
    const event = createEvent(
      'runtime:command-rejected',
      {
        commandType: command.type,
        source: command.source,
        durationMs,
        error
      },
      'SYSTEM',
      command.correlationId,
      {
        type: command.type,
        source: command.source,
        correlationId: command.correlationId
      }
    )

    this.emitEvent(event)
    return event
  }

  /**
   * Create a command with auto-generated correlation ID
   */
  createCommand(
    type: RuntimeCommandType,
    payload?: Record<string, unknown>,
    source: CommandSource = 'UI_BUTTON'
  ): RuntimeCommand {
    return createCommand(type, source, payload, this.generateCorrelationId())
  }

  /**
   * Check if a handler is registered for a command type
   */
  hasHandler(type: RuntimeCommandType): boolean {
    return this.handlers.has(type)
  }

  // Private methods

  private emitEvent(event: RuntimeEvent): void {
    // Emit to unfiltered listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event)
      } catch (err) {
        console.error('[CommandBus] Event listener error:', err)
      }
    })

    // Emit to filtered listeners
    this.filteredListeners.forEach((filter, listener) => {
      if (this.matchesFilter(event, filter)) {
        try {
          listener(event)
        } catch (err) {
          console.error('[CommandBus] Filtered listener error:', err)
        }
      }
    })
  }

  private matchesFilter(event: RuntimeEvent, filter: RuntimeEventFilter): boolean {
    if (
      filter.success !== undefined &&
      event.type !== (filter.success ? 'runtime:command-executed' : 'runtime:command-rejected')
    )
      return false
    if (filter.types && filter.types.length > 0) {
      // For command events, check the embedded command type
      const commandType = (event.payload as { commandType?: string })?.commandType
      if (!commandType || !filter.types.includes(commandType as RuntimeEventType)) return false
    }
    if (filter.sources && filter.sources.length > 0) {
      const source = (event.payload as { source?: string })?.source
      if (!source || !filter.sources.includes(source as RuntimeEventSource)) return false
    }
    return true
  }

  private generateCorrelationId(): CorrelationId {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as CorrelationId
  }
}

// Singleton instance
export const commandBus = new RuntimeCommandBus()

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Execute a command with auto-generated structure
 */
export function executeRuntimeCommand(
  type: RuntimeCommandType,
  payload?: Record<string, unknown>,
  source: CommandSource = 'UI_BUTTON'
): RuntimeEvent {
  const command = commandBus.createCommand(type, payload, source)
  return commandBus.execute(command)
}

/**
 * Create a command without executing
 */
export function createRuntimeCommand(
  type: RuntimeCommandType,
  payload?: Record<string, unknown>,
  source: CommandSource = 'UI_BUTTON'
): RuntimeCommand {
  return commandBus.createCommand(type, payload, source)
}

/**
 * Subscribe to all runtime events
 */
export function subscribeToRuntimeEvents(listener: RuntimeEventHandler): () => void {
  return commandBus.subscribe(listener)
}

/**
 * Subscribe only to successfully executed commands
 */
export function onRuntimeCommandExecuted(listener: RuntimeEventHandler): () => void {
  return commandBus.subscribeFiltered(listener, { success: true })
}

/**
 * Subscribe only to rejected/failed commands
 */
export function onRuntimeCommandRejected(listener: RuntimeEventHandler): () => void {
  return commandBus.subscribeFiltered(listener, { success: false })
}

/**
 * Subscribe to specific command type events
 */
export function onRuntimeCommand(
  types: RuntimeCommandType | RuntimeCommandType[],
  listener: RuntimeEventHandler
): () => void {
  const typeArray = Array.isArray(types) ? types : [types]
  return commandBus.subscribeFiltered(listener, {
    types: typeArray as unknown as RuntimeEventType[]
  })
}
