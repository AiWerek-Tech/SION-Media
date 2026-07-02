/**
 * Navigation Handlers
 *
 * Command handlers for slide navigation.
 * Routes: projection:next-slide, projection:prev-slide, projection:go-to-*
 *
 * Critical: These handlers are determinism-sensitive.
 * All navigation transitions must be explicit and reversible.
 *
 * @module handlers/navigation
 */

import { logger } from '@renderer/utils/logger'
import { parseSlideAddress } from '@core/projection'
import { requestTransition } from '@core/projection/state-machine/projection-machine'
import {
  extractProjectionSnapshotFromStore,
  syncProjectionSnapshotToStore
} from '@core/projection/sync'
import { executeProjectionEffects } from '@core/projection/state-machine/effects'
import type { ProjectionEffect } from '@core/projection/state-machine/effects'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

// ============================================================================
// Navigation Handler Implementations
// ============================================================================

/**
 * projection:next-slide - Advance to next slide on live output
 */
export async function handleNavNextSlide(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:next-slide',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)

    result.effects.forEach((effect: ProjectionEffect) => {
      switch (effect.type) {
        case 'projection:state-change':
          window.api.projection.stateChange(effect.payload.nextState)
          break
        case 'projection:slide-update':
          if (effect.payload.slide) {
            window.api.projection.slideUpdate(effect.payload.slide)
          }
          break
      }
    })

    logger.info('[NavHandler] projection:next-slide executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `nav_next_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_next_err_${Date.now()}`,
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
 * projection:prev-slide - Go back to previous slide on live output
 */
export async function handleNavPrevSlide(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:prev-slide',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[NavHandler] projection:prev-slide executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `nav_prev_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_prev_err_${Date.now()}`,
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
 * projection:go-to-slide - Jump live output to specific slide number
 */
export async function handleNavGotoSlide(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const index = cmd.payload?.slideIndex
    if (typeof index !== 'number') {
      return {
        id: `nav_goto_slide_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing or invalid slideIndex',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-slide',
      payload: { slideIndex: index }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[NavHandler] projection:go-to-slide executed', {
      index,
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `nav_goto_slide_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      result: { index },
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_goto_slide_err_${Date.now()}`,
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
 * projection:go-to-section - Jump live output to named section
 */
export async function handleNavGotoSection(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const section = cmd.payload?.section as string | undefined
    if (!section) {
      return {
        id: `nav_goto_section_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing section name',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-section',
      payload: { section }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[NavHandler] projection:go-to-section executed', {
      section,
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `nav_goto_section_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      result: { section },
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_goto_section_err_${Date.now()}`,
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
 * projection:go-to-address - Jump live output to slide address
 */
export async function handleNavGotoAddress(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const address = cmd.payload?.address as string | undefined
    if (!address) {
      return {
        id: `nav_goto_addr_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing slide address',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-address',
      payload: { address: parseSlideAddress(address) }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[NavHandler] projection:go-to-address executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId,
      slideIndex: result.nextState.programSlideIndex
    })

    return {
      id: `nav_goto_addr_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,

      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_goto_addr_err_${Date.now()}`,
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
 * projection:go-live - Resume live output with current program slide
 *
 * Transitions projection from any state (black, frozen, cue) back to live program output.
 * This is the recovery/resume command.
 */
export async function handleNavGoLive(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const slideIndex =
      typeof cmd.payload?.slideIndex === 'number' ? cmd.payload.slideIndex : undefined
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const request = {
      type: 'projection:go-live' as const,
      payload: { slideIndex }
    }
    const result = requestTransition(currentSnapshot, request)

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[NavHandler] projection:go-live executed', {
      source: cmd.source,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })

    return {
      id: `nav_live_ok_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `nav_live_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
