/**
 * Replay Verifier
 *
 * Ensures deterministic replay: same input sequence always produces
 * identical output snapshots, proving the system is truly deterministic.
 *
 * This validates that the state machine produces mathematically predictable results.
 */

import { runTransition } from '../state-machine/transition-runner'
import type { ProjectionSnapshot } from '../state-machine/projection-snapshot'

export type ReplayResult = {
  ok: boolean
  finalSnapshot: ProjectionSnapshot | null
  violations: string[]
  transitionCount: number
  executionTime: number
  snapshotHashes: string[]
}

export type TransitionRecord = {
  type: string
  payload: any
  timestamp: number
  expectedSnapshotHash?: string
}

/**
 * Replay a sequence of transitions from initial snapshot
 * Validates deterministic evolution of state
 */
export function verifyReplay(
  initialSnapshot: ProjectionSnapshot,
  transitions: TransitionRecord[]
): ReplayResult {
  const startTime = performance.now()
  const violations: string[] = []
  const snapshotHashes: string[] = []

  let currentSnapshot = initialSnapshot
  snapshotHashes.push(hashSnapshot(currentSnapshot))

  for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i]

    try {
      const result = runTransition(currentSnapshot, {
        type: transition.type as any,
        payload: transition.payload
      })

      if (!result.nextState) {
        violations.push(`TRANSITION_${i}_FAILED_NULL_SNAPSHOT`)
        break
      }

      currentSnapshot = result.nextState
      const snapshotHash = hashSnapshot(currentSnapshot)
      snapshotHashes.push(snapshotHash)

      // Check against expected hash if provided
      if (transition.expectedSnapshotHash && snapshotHash !== transition.expectedSnapshotHash) {
        violations.push(
          `TRANSITION_${i}_HASH_MISMATCH: expected ${transition.expectedSnapshotHash}, got ${snapshotHash}`
        )
      }
    } catch (error) {
      violations.push(`TRANSITION_${i}_THREW_EXCEPTION: ${error}`)
      break
    }
  }

  const executionTime = performance.now() - startTime

  return {
    ok: violations.length === 0,
    finalSnapshot: currentSnapshot,
    violations,
    transitionCount: transitions.length,
    executionTime,
    snapshotHashes
  }
}

/**
 * Compare two replay results for equivalence
 * Used to validate replay consistency across different runs
 */
export function compareReplayResults(
  result1: ReplayResult,
  result2: ReplayResult
): {
  ok: boolean
  violations: string[]
} {
  const violations: string[] = []

  if (result1.ok !== result2.ok) {
    violations.push('REPLAY_SUCCESS_MISMATCH')
  }

  if (result1.transitionCount !== result2.transitionCount) {
    violations.push('TRANSITION_COUNT_MISMATCH')
  }

  if (result1.snapshotHashes.length !== result2.snapshotHashes.length) {
    violations.push('SNAPSHOT_COUNT_MISMATCH')
  } else {
    // Compare all snapshot hashes
    for (let i = 0; i < result1.snapshotHashes.length; i++) {
      if (result1.snapshotHashes[i] !== result2.snapshotHashes[i]) {
        violations.push(`SNAPSHOT_HASH_MISMATCH_AT_STEP_${i}`)
      }
    }
  }

  // Deep compare final snapshots
  if (!deepEqualSnapshots(result1.finalSnapshot, result2.finalSnapshot)) {
    violations.push('FINAL_SNAPSHOT_INEQUALITY')
  }

  return {
    ok: violations.length === 0,
    violations
  }
}

/**
 * Generate expected hashes for a transition sequence
 * Useful for creating test fixtures
 */
export function generateExpectedHashes(
  initialSnapshot: ProjectionSnapshot,
  transitions: TransitionRecord[]
): string[] {
  const result = verifyReplay(initialSnapshot, transitions)
  return result.snapshotHashes
}

/**
 * Create a deterministic hash of a snapshot
 * Used for replay verification and test fixtures
 */
function hashSnapshot(snapshot: ProjectionSnapshot): string {
  // Create deterministic string representation
  const snapshotString = JSON.stringify(snapshot, Object.keys(snapshot).sort())

  // Simple hash function (in production, use crypto.subtle.digest)
  let hash = 0
  for (let i = 0; i < snapshotString.length; i++) {
    const char = snapshotString.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return hash.toString(16)
}

/**
 * Deep equality check for snapshots
 */
function deepEqualSnapshots(a: ProjectionSnapshot | null, b: ProjectionSnapshot | null): boolean {
  if (a === b) return true
  if (!a || !b) return false

  return JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort())
}

/**
 * Performance benchmark for replay operations
 * Useful for detecting performance regressions
 */
export function benchmarkReplay(
  initialSnapshot: ProjectionSnapshot,
  transitions: TransitionRecord[],
  iterations: number = 100
): {
  averageTime: number
  minTime: number
  maxTime: number
  times: number[]
} {
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now()
    verifyReplay(initialSnapshot, transitions)
    const endTime = performance.now()
    times.push(endTime - startTime)
  }

  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    times
  }
}
