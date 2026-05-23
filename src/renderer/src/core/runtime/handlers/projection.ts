/**
 * Projection Handlers
 *
 * Command handlers for projection state control.
 * Routes: projection:take-cue, projection:black, projection:freeze, projection:clear
 *
 * Critical: These handlers control live output state.
 * All state changes must be deterministic and auditable.
 *
 * @module handlers/projection
 */

import { logger } from '@renderer/utils/logger'
import { requestTransition } from '@core/projection/state-machine/projection-machine'
import {
  extractProjectionSnapshotFromStore,
  syncProjectionSnapshotToStore
} from '@core/projection/sync'
import { executeProjectionEffects } from '@core/projection/state-machine/effects'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

// ============================================================================
// Projection Handler Implementations
// ============================================================================

/**
 * projection:take-cue - Send current preview cue to live output
 *
 * This is the most critical operation in the projection system.
 * It transitions the program output to the preview state.
 */
export async function handleProjTakeCue(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, { type: 'projection:take-cue', payload: {} })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[ProjHandler] projection:take-cue executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId,
      slideIndex: result.nextState.programSlideIndex
    })

    return {
      id: `proj_take_cue_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `proj_take_cue_err_${Date.now()}`,
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
 * projection:black - Toggle black screen on live output
 *
 * When active: displays black screen
 * When inactive: resumes normal program output
 */
export async function handleProjBlack(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, { type: 'projection:black', payload: {} })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[ProjHandler] projection:black executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `proj_black_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `proj_black_err_${Date.now()}`,
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
 * projection:freeze - Toggle freeze on live output
 *
 * When active: holds current slide, ignores navigation
 * When inactive: responds to navigation commands normally
 */
export async function handleProjFreeze(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, { type: 'projection:freeze', payload: {} })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[ProjHandler] projection:freeze executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `proj_freeze_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `proj_freeze_err_${Date.now()}`,
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
 * projection:clear - Clear all content from live output
 *
 * Blanks the projection screen completely.
 * Used before/after service, or for emergency screen management.
 */
export async function handleProjClear(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, { type: 'projection:clear', payload: {} })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[ProjHandler] projection:clear executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `proj_clear_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `proj_clear_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
