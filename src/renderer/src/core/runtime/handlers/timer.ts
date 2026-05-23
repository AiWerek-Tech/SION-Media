/**
 * Timer Handlers
 *
 * Confidence monitor timer orchestration.
 * Controls countdown for worship timing coordination.
 *
 * Commands:
 * - timer:start
 * - timer:pause
 * - timer:reset
 * - timer:tick
 *
 * Important: Timer is currently component-owned via interval.
 * Future migration: Runtime-owned centralized timing (Phase 3+)
 *
 * Current scope: Centralize command entry points for timer mutations
 * Future scope: Timer persistence, automation replay, distributed sync
 *
 * @module handlers/timer
 */

import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { logger } from '@renderer/utils/logger'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

const store = useProjectionStore.getState

// ============================================================================
// Store Adapter - Isolation Seam for Phase 3 Transition
// ============================================================================
/**
 * Adapter boundary for timer state mutations.
 * This seam will be replaced by runtime-owned timing in Phase 3.
 * Currently forwards directly to store.
 */
function timerStoreAdapter(): {
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
} {
  return {
    start: () => store().timerStart(),
    pause: () => store().timerStop(),
    reset: () => store().timerReset(),
    tick: () => store().timerTick()
  }
}

// ============================================================================
// Timer Handler Implementations
// ============================================================================

/**
 * timer:start - Begin countdown timer
 *
 * Used when: Operator activates confidence monitor during worship
 * Effect: Sets timerRunning = true, starts accumulating elapsed time
 * Safety: Idempotent - calling while running is safe (no-op)
 */
export async function handleTimerStart(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    timerStoreAdapter().start()
    logger.info('[TimerHandler] timer:start executed', { source: cmd.source })

    return {
      id: `timer_start_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `timer_start_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}

/**
 * timer:pause - Pause countdown timer (stop accumulating)
 *
 * Used when: Operator pauses worship temporarily
 * Effect: Sets timerRunning = false, preserves elapsed time
 * Safety: Idempotent - calling while paused is safe (no-op)
 * Note: Does NOT reset - call timer:reset to return to 0
 */
export async function handleTimerPause(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    timerStoreAdapter().pause()
    logger.info('[TimerHandler] timer:pause executed', { source: cmd.source })

    return {
      id: `timer_pause_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `timer_pause_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}

/**
 * timer:reset - Reset countdown timer to 0
 *
 * Used when: Operator starts new worship segment or ends current one
 * Effect: Sets timerElapsed = 0, timerRunning = false
 * Safety: Always safe - no state preconditions
 */
export async function handleTimerReset(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    timerStoreAdapter().reset()
    logger.info('[TimerHandler] timer:reset executed', { source: cmd.source })

    return {
      id: `timer_reset_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `timer_reset_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}

/**
 * timer:tick - Advance timer by 1 second interval
 *
 * Used when: Called by external interval (currently component-based)
 * Effect: If timerRunning, increments timerElapsed by 1
 * Safety: Safe to call regardless of running state (checks guard)
 *
 * Future: Will be owned by runtime clock, not component interval
 */
export async function handleTimerTick(): Promise<RuntimeCommandResult> {
  try {
    timerStoreAdapter().tick()

    return {
      id: `timer_tick_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `timer_tick_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
