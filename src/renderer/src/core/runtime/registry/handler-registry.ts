/**
 * Handler Registry
 *
 * Central orchestration point for all command handlers.
 * Enforces: one command → one authoritative handler
 *
 * Critical rule:
 * No competing listeners for state mutations.
 * This prevents invisible side effects and maintains determinism.
 *
 * @module registry
 */

import type { RuntimeCommandType, RuntimeCommandHandler } from '../contracts'

// ============================================================================
// Handler Registry Types
// ============================================================================

export interface RegisteredHandler {
  commandType: RuntimeCommandType
  handler: RuntimeCommandHandler
  registeredAt: number
  domain: 'navigation' | 'projection' | 'playlist' | 'timer' | 'protection' | 'system' | 'operator'
}

export interface HandlerRegistryStats {
  totalHandlers: number
  handlersByDomain: Record<string, number>
  registrationOrder: Array<{ type: RuntimeCommandType; domain: string }>
}

// ============================================================================
// Handler Registry Implementation
// ============================================================================

/**
 * Handler Registry
 *
 * Enforces one-handler-per-command rule.
 * Prevents competing handlers for the same command type.
 * Maintains deterministic handler resolution order.
 */
class HandlerRegistry {
  private handlers: Map<RuntimeCommandType, RegisteredHandler> = new Map()
  private registrationOrder: Array<{ type: RuntimeCommandType; domain: string }> = []

  /**
   * Register a handler for a command type
   *
   * Will reject if handler already registered for this command.
   * This prevents silent side effect chains.
   */
  register(
    commandType: RuntimeCommandType,
    handler: RuntimeCommandHandler,
    domain:
      | 'navigation'
      | 'projection'
      | 'playlist'
      | 'timer'
      | 'protection'
      | 'system'
      | 'operator'
  ): void {
    if (this.handlers.has(commandType)) {
      const existing = this.handlers.get(commandType)!
      throw new Error(
        `Handler already registered for command '${commandType}' ` +
          `(domain: ${existing.domain}). ` +
          `Cannot register competing handler (domain: ${domain}). ` +
          `One command must have exactly one authoritative handler.`
      )
    }

    const registered: RegisteredHandler = {
      commandType,
      handler,
      registeredAt: Date.now(),
      domain
    }

    this.handlers.set(commandType, registered)
    this.registrationOrder.push({ type: commandType, domain })
  }

  /**
   * Get registered handler for a command type
   */
  get(commandType: RuntimeCommandType): RuntimeCommandHandler | undefined {
    return this.handlers.get(commandType)?.handler
  }

  /**
   * Check if handler is registered
   */
  has(commandType: RuntimeCommandType): boolean {
    return this.handlers.has(commandType)
  }

  /**
   * Get all registered handlers (for startup validation)
   */
  getAll(): RegisteredHandler[] {
    return Array.from(this.handlers.values())
  }

  /**
   * Get handlers by domain
   */
  getByDomain(domain: string): RegisteredHandler[] {
    return Array.from(this.handlers.values()).filter((h) => h.domain === domain)
  }

  /**
   * Validate complete handler registry at startup
   *
   * Ensures:
   * - All expected commands have handlers
   * - No duplicate registrations
   * - No orphaned handlers
   */
  validate(): {
    valid: boolean
    missingHandlers: RuntimeCommandType[]
    warnings: string[]
  } {
    const requiredCommands: RuntimeCommandType[] = [
      // Projection
      'projection:next-slide',
      'projection:prev-slide',
      'projection:go-to-slide',
      'projection:go-to-section',
      'projection:go-to-address',
      'projection:take-cue',
      'projection:black',
      'projection:freeze',
      'projection:clear',
      'projection:go-live',
      // Playlist
      'playlist:load-item',
      'playlist:queue-next',
      'playlist:cue-next',
      // Runtime
      'runtime:start-timer',
      'runtime:stop-timer',
      'runtime:reset-timer',
      // Timer subsystem
      'timer:start',
      'timer:pause',
      'timer:reset',
      'timer:tick',
      // Protection subsystem
      'protection:mark-dirty',
      'protection:update-live',
      'protection:discard-changes',
      // Operator
      'operator:update-settings'
    ]

    const missingHandlers = requiredCommands.filter((cmd) => !this.has(cmd))
    const warnings: string[] = []

    // Warn about handlers with no corresponding required command
    this.handlers.forEach((reg) => {
      if (!requiredCommands.includes(reg.commandType)) {
        warnings.push(
          `Handler registered for non-standard command: ${reg.commandType} (domain: ${reg.domain})`
        )
      }
    })

    return {
      valid: missingHandlers.length === 0,
      missingHandlers,
      warnings
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): HandlerRegistryStats {
    const statsByDomain: Record<string, number> = {}

    this.handlers.forEach((reg) => {
      statsByDomain[reg.domain] = (statsByDomain[reg.domain] || 0) + 1
    })

    return {
      totalHandlers: this.handlers.size,
      handlersByDomain: statsByDomain,
      registrationOrder: [...this.registrationOrder]
    }
  }

  /**
   * Clear registry (for testing only)
   */
  clear(): void {
    this.handlers.clear()
    this.registrationOrder = []
  }
}

// Singleton instance
export const handlerRegistry = new HandlerRegistry()

// ============================================================================
// Registry Integration Helper
// ============================================================================

/**
 * Bind handler registry to command bus
 *
 * Call this during app startup to activate all registered handlers.
 */
export function bindRegistryToCommandBus(commandBus: {
  registerHandler: (type: RuntimeCommandType, handler: RuntimeCommandHandler) => void
}): void {
  handlerRegistry.getAll().forEach((reg) => {
    commandBus.registerHandler(reg.commandType, reg.handler)
  })
}

/**
 * Validate handler registry at startup
 *
 * Fails fast if any required handlers are missing.
 * Logs warnings for non-standard handlers.
 */
export function validateHandlerRegistry(): void {
  const validation = handlerRegistry.validate()

  if (!validation.valid) {
    console.error('[HandlerRegistry] Missing required handlers:')
    validation.missingHandlers.forEach((cmd) => {
      console.error(`  - ${cmd}`)
    })
    throw new Error(
      `Handler registry incomplete: ${validation.missingHandlers.length} missing handlers`
    )
  }

  if (validation.warnings.length > 0) {
    console.warn('[HandlerRegistry] Registration warnings:')
    validation.warnings.forEach((w) => {
      console.warn(`  - ${w}`)
    })
  }

  const stats = handlerRegistry.getStats()
  console.info('[HandlerRegistry] Startup validation passed', {
    totalHandlers: stats.totalHandlers,
    byDomain: stats.handlersByDomain
  })
}
