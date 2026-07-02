/**
 * Protection Handlers
 *
 * Runtime protection for live state.
 * Manages lock state transitions and pending change reconciliation.
 *
 * Commands:
 * - protection:mark-dirty
 * - protection:update-live
 * - protection:discard-changes
 *
 * Critical: These handlers must NOT be called during active program transition.
 * Lock state is per-operation and not persisted across sessions.
 *
 * @module handlers/protection
 */

import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { requestTransition } from '@core/projection/state-machine/projection-machine'
import {
  extractProjectionSnapshotFromStore,
  syncProjectionSnapshotToStore
} from '@core/projection/sync'
import { executeProjectionEffects } from '@core/projection/state-machine/effects'
import { logger } from '@renderer/utils/logger'
import type { PendingChange } from '@renderer/types'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

// ============================================================================
// Store Adapter - Isolation Seam for Phase 3 Transition
// ============================================================================
/**
 * Adapter boundary for protection state mutations.
 * This seam will be replaced by deterministic state machine in Phase 3.
 * Currently forwards directly to store.
 */
function protectionStoreAdapter(): {
  markDirty: (change: PendingChange) => void
  updateLive: () => void
  discardChanges: () => void
  isProgramLocked: () => boolean
} {
  return {
    markDirty: (change: PendingChange) => {
      const currentSnapshot = extractProjectionSnapshotFromStore()
      const result = requestTransition(currentSnapshot, {
        type: 'projection:mark-dirty',
        payload: { change }
      })
      syncProjectionSnapshotToStore(result.nextState)
      executeProjectionEffects(result.effects)
    },
    updateLive: () => {
      const currentSnapshot = extractProjectionSnapshotFromStore()
      const result = requestTransition(currentSnapshot, {
        type: 'projection:update-live',
        payload: {}
      })
      syncProjectionSnapshotToStore(result.nextState)
      executeProjectionEffects(result.effects)
    },
    discardChanges: () => {
      const currentSnapshot = extractProjectionSnapshotFromStore()
      const result = requestTransition(currentSnapshot, {
        type: 'projection:discard-changes',
        payload: {}
      })
      syncProjectionSnapshotToStore(result.nextState)
      executeProjectionEffects(result.effects)
    },
    isProgramLocked: () => useProjectionStore.getState().isProgramLocked()
  }
}

// ============================================================================
// Protection Handler Implementations
// ============================================================================

/**
 * protection:mark-dirty - Record pending change when program is locked
 *
 * Used when: Operator edits lyrics while LIVE_LOCK is active
 * Effect: Transitions to LIVE_DIRTY, marks pending reconciliation needed
 * Safety: Only works from LIVE_LOCK state, prevents accidental dirty marks
 */
export async function handleProtectionMarkDirty(
  cmd: RuntimeCommand
): Promise<RuntimeCommandResult> {
  try {
    const changeType = cmd.payload?.changeType as string | undefined
    const description = cmd.payload?.description as string | undefined

    if (!changeType) {
      return {
        id: `prot_dirty_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing changeType in payload',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const change: PendingChange = {
      type: changeType as 'slide_content' | 'slide_order' | 'song_metadata',
      timestamp: Date.now(),
      description
    }

    protectionStoreAdapter().markDirty(change)
    logger.info('[ProtectionHandler] protection:mark-dirty executed', {
      source: cmd.source,
      changeType
    })

    return {
      id: `prot_dirty_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `prot_dirty_err_${Date.now()}`,
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
 * protection:update-live - Commit pending changes to live output
 *
 * Used when: Operator approves dirty changes for live display
 * Effect: Applies all pending changes, returns to LIVE_LOCK
 * Safety: Only works from LIVE_DIRTY state, prevents orphaned commits
 * Requires: Explicit operator confirmation before calling
 */
export async function handleProtectionUpdateLive(
  cmd: RuntimeCommand
): Promise<RuntimeCommandResult> {
  try {
    protectionStoreAdapter().updateLive()
    logger.info('[ProtectionHandler] protection:update-live executed', { source: cmd.source })

    return {
      id: `prot_update_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `prot_update_err_${Date.now()}`,
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
 * protection:discard-changes - Revert pending changes, return to LIVE_LOCK
 *
 * Used when: Operator rejects dirty changes
 * Effect: Preview reverts to match program, returns to LIVE_LOCK, clears pending
 * Safety: Only works from LIVE_DIRTY state, prevents accidental discards
 * Reason: Operator changed their mind about dirty changes
 */
export async function handleProtectionDiscardChanges(
  cmd: RuntimeCommand
): Promise<RuntimeCommandResult> {
  try {
    protectionStoreAdapter().discardChanges()
    logger.info('[ProtectionHandler] protection:discard-changes executed', { source: cmd.source })

    return {
      id: `prot_discard_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `prot_discard_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
