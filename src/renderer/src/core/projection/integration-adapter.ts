/**
 * Projection Integration Adapter
 *
 * Bridges UI commands (runtime command bus) to FSM core.
 * Translates high-level UI intents to formal state machine events.
 *
 * This adapter ensures:
 * - UI actions trigger proper FSM transitions
 * - State changes propagate back to UI via store updates
 * - Side effects are executed through effects system
 * - Clean separation between UI layer and FSM core
 *
 * FIXES:
 * - BUG-05: PROJ_FREEZE now has a proper handler
 * - BUG-06: PROTECTION_UPDATE_LIVE and PROTECTION_DISCARD now have handlers
 * - BUG-09: NAV_CUE_NEXT and NAV_CUE_PREV now have handlers
 * - ARCH-06: registerProjectionHandlers no longer executes commands at init time
 */

import { commandBus, type RuntimeCommandType } from '@renderer/utils/runtimeCommandBus'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import type { ProjectionEvent } from '@core/projection/projection-events'
import { logger } from '@renderer/utils/logger'
import { logCommand, logTransition, logError } from './event-trace'

// ============================================================================
// COMMAND TO EVENT MAPPING
// ============================================================================

/**
 * Maps runtime commands to FSM events.
 * null = handled directly via store actions in registerCommandHandlers().
 * All commands now route through store actions which handle FSM + IPC correctly.
 */
const COMMAND_TO_EVENT_MAP: Record<RuntimeCommandType, ProjectionEvent | null> = {
  // All navigation and projection commands are handled via store actions (null here)
  NAV_NEXT_SLIDE: null,
  NAV_PREV_SLIDE: null,
  NAV_GOTO_SLIDE: null,
  NAV_GOTO_SECTION: null,
  NAV_GOTO_ADDRESS: null,
  NAV_CUE_NEXT: null,
  NAV_CUE_PREV: null,
  NAV_CUE_GOTO: null,
  NAV_CUE_GOTO_ADDRESS: null,
  NAV_LIVE_GOTO: null,
  NAV_LIVE_GOTO_ADDRESS: null,
  NAV_QUICK_JUMP: null,
  PROJ_TAKE_CUE: null,
  PROJ_BLACK: null,
  PROJ_FREEZE: null,
  PROJ_CLEAR: null,
  PROJ_LIVE: null,
  TIMER_START: null,
  TIMER_STOP: null,
  TIMER_RESET: null,
  PROTECTION_UPDATE_LIVE: null,
  PROTECTION_DISCARD: null,
  NEXT_LOAD_SONG: null,
  NEXT_CLEAR: null
}

// ============================================================================
// INTEGRATION ADAPTER
// ============================================================================

export class ProjectionIntegrationAdapter {
  /**
   * Initialize adapter — register command handlers with the command bus.
   *
   * FIX ARCH-06: previously this called executeRuntimeCommand() which
   * accidentally fired commands at startup. Now it registers proper handlers.
   */
  initialize(): void {
    this.registerCommandHandlers()
    logger.info('[Projection Adapter] Initialized - UI ↔ FSM bridge active')
  }

  /**
   * Register all projection command handlers with the command bus.
   * Each handler is a function that executes the command and returns a result.
   */
  private registerCommandHandlers(): void {
    // ── Navigation: live slides ──────────────────────────────────────────────
    // Call store actions directly — they handle FSM + IPC internally.
    commandBus.registerHandler('NAV_NEXT_SLIDE', () => {
      useProjectionStore.getState().nextSlide()
      return { success: true }
    })

    commandBus.registerHandler('NAV_PREV_SLIDE', () => {
      useProjectionStore.getState().prevSlide()
      return { success: true }
    })

    commandBus.registerHandler('NAV_GOTO_SLIDE', (cmd) => {
      const slideIndex = (cmd.payload as { slideIndex?: number })?.slideIndex
      if (typeof slideIndex !== 'number') return { success: false, error: 'Missing slideIndex' }
      useProjectionStore.getState().goToLiveSlide(slideIndex)
      return { success: true }
    })

    commandBus.registerHandler('NAV_GOTO_SECTION', (cmd) => {
      const section = (cmd.payload as { section?: string })?.section
      if (!section) return { success: false, error: 'Missing section' }
      useProjectionStore.getState().goToLiveSection(section)
      return { success: true }
    })

    commandBus.registerHandler('NAV_GOTO_ADDRESS', (cmd) => {
      const address = (cmd.payload as { address?: unknown })?.address
      if (!address) return { success: false, error: 'Missing address' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useProjectionStore.getState().goToLiveAddress(address as any)
      return { success: true }
    })

    // ── Navigation: cue (preview) slides ────────────────────────────────────
    // FIX BUG-09: these were null in the map and had no handler
    commandBus.registerHandler('NAV_CUE_NEXT', () => {
      useProjectionStore.getState().cueNextSlide()
      return { success: true }
    })

    commandBus.registerHandler('NAV_CUE_PREV', () => {
      useProjectionStore.getState().cuePrevSlide()
      return { success: true }
    })

    commandBus.registerHandler('NAV_CUE_GOTO', (cmd) => {
      const slideIndex = (cmd.payload as { slideIndex?: number })?.slideIndex
      if (typeof slideIndex !== 'number') return { success: false, error: 'Missing slideIndex' }
      useProjectionStore.getState().cueGoToSlide(slideIndex)
      return { success: true }
    })

    commandBus.registerHandler('NAV_CUE_GOTO_ADDRESS', (cmd) => {
      const address = (cmd.payload as { address?: unknown })?.address
      if (!address) return { success: false, error: 'Missing address' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useProjectionStore.getState().cueGoToAddress(address as any)
      return { success: true }
    })

    commandBus.registerHandler('NAV_LIVE_GOTO', (cmd) => {
      const slideIndex = (cmd.payload as { slideIndex?: number })?.slideIndex
      if (typeof slideIndex !== 'number') return { success: false, error: 'Missing slideIndex' }
      useProjectionStore.getState().goToLiveSlide(slideIndex)
      return { success: true }
    })

    commandBus.registerHandler('NAV_LIVE_GOTO_ADDRESS', (cmd) => {
      const address = (cmd.payload as { address?: unknown })?.address
      if (!address) return { success: false, error: 'Missing address' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useProjectionStore.getState().goToLiveAddress(address as any)
      return { success: true }
    })

    commandBus.registerHandler('NAV_QUICK_JUMP', () => {
      window.dispatchEvent(new CustomEvent('sion:open-quick-jump'))
      return { success: true }
    })

    // ── Projection state ─────────────────────────────────────────────────────
    // Call store actions directly — they handle FSM + IPC internally.
    commandBus.registerHandler('PROJ_TAKE_CUE', () => {
      useProjectionStore.getState().takeCue()
      return { success: true }
    })

    // FIX BUG-05: PROJ_BLACK now properly toggles via store (which handles IPC)
    commandBus.registerHandler('PROJ_BLACK', () => {
      useProjectionStore.getState().toggleBlack()
      return { success: true }
    })

    // FIX BUG-05: PROJ_FREEZE now properly toggles via store (which handles IPC)
    commandBus.registerHandler('PROJ_FREEZE', () => {
      useProjectionStore.getState().toggleFreeze()
      return { success: true }
    })

    commandBus.registerHandler('PROJ_CLEAR', () => {
      useProjectionStore.getState().clearScreen()
      return { success: true }
    })

    commandBus.registerHandler('PROJ_LIVE', () => {
      const ok = this.handleGoLive()
      return { success: ok }
    })

    // ── Timer ────────────────────────────────────────────────────────────────
    commandBus.registerHandler('TIMER_START', () => {
      useProjectionStore.getState().timerStart()
      return { success: true }
    })

    commandBus.registerHandler('TIMER_STOP', () => {
      useProjectionStore.getState().timerStop()
      return { success: true }
    })

    commandBus.registerHandler('TIMER_RESET', () => {
      useProjectionStore.getState().timerReset()
      return { success: true }
    })

    // ── Runtime Protection ───────────────────────────────────────────────────
    // FIX BUG-06: these had no handler — "Update Live" and "Discard" buttons
    // were silently failing.
    commandBus.registerHandler('PROTECTION_UPDATE_LIVE', () => {
      useProjectionStore.getState().updateLive()
      return { success: true }
    })

    commandBus.registerHandler('PROTECTION_DISCARD', () => {
      useProjectionStore.getState().discardChanges()
      return { success: true }
    })

    // ── Next State ───────────────────────────────────────────────────────────
    commandBus.registerHandler('NEXT_LOAD_SONG', (cmd) => {
      const { song, slides } = (cmd.payload ?? {}) as { song?: unknown; slides?: unknown }
      if (!song || !Array.isArray(slides)) return { success: false, error: 'Missing song/slides' }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useProjectionStore.getState().loadNextSong(song as any, slides as any)
      return { success: true }
    })

    commandBus.registerHandler('NEXT_CLEAR', () => {
      useProjectionStore.getState().clearNextSong()
      return { success: true }
    })
  }

  /**
   * Execute FSM transition from UI command.
   * Kept for backward-compat with handleGoLive() and legacy callers.
   * New code should call store actions directly.
   */
  executeFSMTransition(event: ProjectionEvent, payload?: unknown): boolean {
    try {
      const store = useProjectionStore.getState()
      const fromState = store.projectionState

      this.executeStoreTransition(event)

      const toState = useProjectionStore.getState().projectionState
      logTransition(fromState, toState, event, payload)

      return true
    } catch (error) {
      logError(error as Error, { event, payload })
      return false
    }
  }

  /**
   * Execute transition through store actions.
   * Maps legacy event names to correct store actions.
   */
  private executeStoreTransition(event: string): void {
    const store = useProjectionStore.getState()

    switch (event) {
      // Legacy event names kept for backward-compat
      case 'START':
      case 'projection:take-cue':
        store.takeCue()
        break
      case 'STOP':
      case 'projection:clear':
        store.clearScreen()
        break
      case 'NEXT_SLIDE':
      case 'projection:next-slide':
        store.nextSlide()
        break
      case 'PREV_SLIDE':
      case 'projection:prev-slide':
        store.prevSlide()
        break
      case 'RESUME':
        // Resume from BLACK or FREEZE → go live
        if (store.projectionState === 'BLACK') store.toggleBlack()
        else if (store.projectionState === 'FREEZE') store.toggleFreeze()
        break
      default:
        logger.warn(`[Projection Adapter] Unhandled FSM event: ${event}`)
    }
  }

  /**
   * Handle runtime command by routing to appropriate handler.
   * This is the legacy entry point — new code should use the command bus directly.
   */
  handleRuntimeCommand(commandType: RuntimeCommandType, payload?: unknown): boolean {
    const traceId = logCommand(commandType, payload, 'ADAPTER')

    try {
      const result = this.routeCommand(commandType, payload)

      if (!result) {
        logError(`Unhandled command: ${String(commandType)}`, { commandType, payload, traceId })
      }

      return result
    } catch (error) {
      logError(error as Error, { commandType, payload, traceId })
      return false
    }
  }

  private routeCommand(commandType: RuntimeCommandType, payload?: unknown): boolean {
    const fsmEvent = COMMAND_TO_EVENT_MAP[commandType]

    if (fsmEvent) {
      return this.executeFSMTransition(fsmEvent, payload)
    }

    return this.handleSpecialCommand(commandType, payload)
  }

  /**
   * Handle commands that don't map directly to FSM events.
   * Kept for backward-compat with executeProjectionCommand() callers.
   * All commands now delegate to store actions directly.
   */
  private handleSpecialCommand(commandType: RuntimeCommandType, payload?: unknown): boolean {
    const store = useProjectionStore.getState()

    switch (commandType) {
      case 'NAV_NEXT_SLIDE':
        store.nextSlide()
        return true

      case 'NAV_PREV_SLIDE':
        store.prevSlide()
        return true

      case 'NAV_GOTO_SLIDE':
        if (typeof (payload as { slideIndex?: number })?.slideIndex === 'number') {
          store.goToLiveSlide((payload as { slideIndex: number }).slideIndex)
          return true
        }
        return false

      case 'NAV_CUE_NEXT':
        store.cueNextSlide()
        return true

      case 'NAV_CUE_PREV':
        store.cuePrevSlide()
        return true

      case 'PROJ_TAKE_CUE':
        store.takeCue()
        return true

      case 'PROJ_BLACK':
        store.toggleBlack()
        return true

      case 'PROJ_FREEZE':
        store.toggleFreeze()
        return true

      case 'PROJ_CLEAR':
        store.clearScreen()
        return true

      case 'PROJ_LIVE':
        return this.handleGoLive()

      case 'PROTECTION_UPDATE_LIVE':
        store.updateLive()
        return true

      case 'PROTECTION_DISCARD':
        store.discardChanges()
        return true

      case 'TIMER_START':
        store.timerStart()
        return true

      case 'TIMER_STOP':
        store.timerStop()
        return true

      case 'TIMER_RESET':
        store.timerReset()
        return true

      case 'NEXT_CLEAR':
        store.clearNextSong()
        return true

      default:
        logger.warn(`[Projection Adapter] Unhandled command: ${commandType}`)
        return false
    }
  }

  /**
   * Handle "go live" command — transition to LIVE state from any state
   */
  private handleGoLive(): boolean {
    const store = useProjectionStore.getState()
    const currentState = store.projectionState

    switch (currentState) {
      case 'CLEAR':
        store.takeCue()
        return true

      case 'BLACK':
        store.toggleBlack() // BLACK → LIVE
        return true

      case 'FREEZE':
        store.toggleFreeze() // FREEZE → LIVE
        return true

      case 'LIVE':
        return true // already live

      default:
        logger.warn(`[Projection Adapter] Cannot go live from state: ${currentState}`)
        return false
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const projectionAdapter = new ProjectionIntegrationAdapter()

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize projection integration adapter.
 * Call this once during app startup.
 */
export function initializeProjectionAdapter(): void {
  projectionAdapter.initialize()
}

/**
 * Execute projection command through adapter.
 * This is the main entry point for UI → FSM communication.
 */
export function executeProjectionCommand(
  commandType: RuntimeCommandType,
  payload?: unknown
): boolean {
  return projectionAdapter.handleRuntimeCommand(commandType, payload)
}
