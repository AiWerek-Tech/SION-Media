/**
 * Runtime Command Handlers (COMPATIBILITY LAYER)
 *
 * DEPRECATED: This file is now a compatibility shim.
 *
 * Handlers have been extracted to @core/runtime/handlers for architectural clarity.
 * This file maintains backward compatibility during migration.
 *
 * New code should use:
 * ```ts
 * import { registerAllHandlers } from '@core/runtime'
 * ```
 *
 * Old handler registrations have been moved to:
 * - @core/runtime/handlers/navigation.ts (6 handlers)
 * - @core/runtime/handlers/projection.ts (4 handlers)
 * - @core/runtime/handlers/protection.ts (3 handlers)
 * - @core/runtime/handlers/timer.ts (4 handlers)
 *
 * This file will be removed in Phase 2B.3.3 (Consumer Migration).
 *
 * @deprecated - Use @core/runtime/handlers instead
 * @module runtimeCommandHandlers
 */

import { registerAllHandlers } from '@core/runtime/handlers'

export { handlerRegistry } from '@core/runtime/registry/handler-registry'
export type {
  RegisteredHandler,
  HandlerRegistryStats
} from '@core/runtime/registry/handler-registry'

let handlersRegistered = false

/**
 * Register all command handlers
 * Called once during app initialization
 *
 * @deprecated - Use registerAllHandlers from @core/runtime instead
 */
export function registerCommandHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  // Forward to new registry-based handler system
  registerAllHandlers()
}

/**
 * Register command validators (deprecated shim)
 *
 * @deprecated - Validators are now handled by the registry system
 */
export function registerCommandValidators(): void {
  // No-op: validators are now part of the registry validation
}
