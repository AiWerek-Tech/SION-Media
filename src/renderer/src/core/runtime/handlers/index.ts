/**
 * Runtime Handlers
 *
 * Central registry and initialization for all command handlers.
 * Establishes one-handler-per-command rule at startup.
 *
 * @module handlers
 */

import {
  handlerRegistry,
  bindRegistryToCommandBus,
  validateHandlerRegistry
} from '../registry/handler-registry'
import { commandBus } from '../command-bus'

// Navigation handlers
import {
  handleNavNextSlide,
  handleNavPrevSlide,
  handleNavGotoSlide,
  handleNavGotoSection,
  handleNavGotoAddress,
  handleNavGoLive
} from './navigation'

// Projection handlers
import { handleProjTakeCue, handleProjBlack, handleProjFreeze, handleProjClear } from './projection'

// Protection handlers
import {
  handleProtectionMarkDirty,
  handleProtectionUpdateLive,
  handleProtectionDiscardChanges
} from './protection'

// Timer handlers
import { handleTimerStart, handleTimerPause, handleTimerReset, handleTimerTick } from './timer'
import { handlePlaylistLoadItem, handlePlaylistQueueNext, handlePlaylistCueNext } from './playlist'
import { handleOperatorUpdateSettings } from './operator'

// ============================================================================
// Handler Registration
// ============================================================================

/**
 * Register all command handlers at app startup
 *
 * Flow:
 * 1. Register all handlers with registry (enforces one-per-command)
 * 2. Validate completeness
 * 3. Bind registry to command bus
 * 4. Log startup status
 *
 * This must be called once during app initialization, before any commands execute.
 */
export function registerAllHandlers(): void {
  // ─────────────────────────────────────────────────────────────
  // Projection Domain (Core operational commands)
  // ─────────────────────────────────────────────────────────────
  handlerRegistry.register('projection:next-slide', handleNavNextSlide, 'navigation')
  handlerRegistry.register('projection:prev-slide', handleNavPrevSlide, 'navigation')
  handlerRegistry.register('projection:go-to-slide', handleNavGotoSlide, 'navigation')
  handlerRegistry.register('projection:go-to-section', handleNavGotoSection, 'navigation')
  handlerRegistry.register('projection:go-to-address', handleNavGotoAddress, 'navigation')
  handlerRegistry.register('projection:take-cue', handleProjTakeCue, 'projection')
  handlerRegistry.register('projection:black', handleProjBlack, 'projection')
  handlerRegistry.register('projection:freeze', handleProjFreeze, 'projection')
  handlerRegistry.register('projection:clear', handleProjClear, 'projection')
  handlerRegistry.register('projection:go-live', handleNavGoLive, 'navigation')

  // ─────────────────────────────────────────────────────────────
  // Playlist Domain (loading, queueing, playback)
  // ─────────────────────────────────────────────────────────────
  handlerRegistry.register('playlist:load-item', handlePlaylistLoadItem, 'playlist')
  handlerRegistry.register('playlist:queue-next', handlePlaylistQueueNext, 'playlist')
  handlerRegistry.register('playlist:cue-next', handlePlaylistCueNext, 'playlist')

  // ─────────────────────────────────────────────────────────────
  // Runtime Protection Domain (lock state, pending changes)
  // ─────────────────────────────────────────────────────────────
  handlerRegistry.register('protection:mark-dirty', handleProtectionMarkDirty, 'protection')
  handlerRegistry.register('protection:update-live', handleProtectionUpdateLive, 'protection')
  handlerRegistry.register(
    'protection:discard-changes',
    handleProtectionDiscardChanges,
    'protection'
  )

  // ─────────────────────────────────────────────────────────────
  // Timer Domain (confidence monitor timing)
  // ─────────────────────────────────────────────────────────────
  handlerRegistry.register('timer:start', handleTimerStart, 'timer')
  handlerRegistry.register('timer:pause', handleTimerPause, 'timer')
  handlerRegistry.register('timer:reset', handleTimerReset, 'timer')
  handlerRegistry.register('timer:tick', handleTimerTick, 'timer')

  // Legacy compatibility aliases for runtime command naming
  handlerRegistry.register('runtime:start-timer', handleTimerStart, 'timer')
  handlerRegistry.register('runtime:stop-timer', handleTimerPause, 'timer')
  handlerRegistry.register('runtime:reset-timer', handleTimerReset, 'timer')

  // ─────────────────────────────────────────────────────────────
  // Operator Domain (settings, configuration)
  // ─────────────────────────────────────────────────────────────
  handlerRegistry.register('operator:update-settings', handleOperatorUpdateSettings, 'operator')

  // ─────────────────────────────────────────────────────────────
  // Validation & Binding
  // ─────────────────────────────────────────────────────────────

  // Validate registry completeness
  try {
    validateHandlerRegistry()
  } catch (error) {
    console.error('[Handlers] Registry validation failed:', error)
    throw error
  }

  // Bind all handlers to the command bus
  bindRegistryToCommandBus(commandBus)

  console.info('[Handlers] All command handlers registered and validated at startup')
}

// ============================================================================
// Handler Registry Exports
// ============================================================================

export { handlerRegistry } from '../registry/handler-registry'
export type { RegisteredHandler, HandlerRegistryStats } from '../registry/handler-registry'

// ============================================================================
// Individual Handler Exports (for testing/inspection)
// ============================================================================

export const navigationHandlers = {
  handleNavNextSlide,
  handleNavPrevSlide,
  handleNavGotoSlide,
  handleNavGotoSection,
  handleNavGotoAddress,
  handleNavGoLive
}

export const projectionHandlers = {
  handleProjTakeCue,
  handleProjBlack,
  handleProjFreeze,
  handleProjClear
}

export const playlistHandlers = {
  handlePlaylistLoadItem,
  handlePlaylistQueueNext,
  handlePlaylistCueNext
}

export const operatorHandlers = {
  handleOperatorUpdateSettings
}
