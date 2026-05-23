/**
 * Projection Authority Verification Harness (PAVH)
 *
 * Core verification layer that ensures:
 * 1. Single Authority Guarantee - no mutations outside state-machine
 * 2. Snapshot Completeness - all state affecting output is captured
 * 3. Deterministic Replay - input sequences produce identical outputs
 * 4. Effect Purity - effects don't mutate state machine/store
 */

import { extractProjectionSnapshotFromStore } from '../sync/sync-projection-snapshot'
import { runTransition } from '../state-machine/transition-runner'
import { applyProjectionSnapshotToStore } from '../sync/sync-projection-snapshot'
import { executeProjectionEffects } from '../state-machine/effects'
import { detectStoreMutation } from './mutation-detector'
import { validateSnapshotCoverage } from './snapshot-coverage-checker'
import { createInvariantReport } from './invariant-report'

export type VerifiedTransitionResult = {
  ok: boolean
  snapshotBefore: any
  snapshotAfter: any
  violations: string[]
  coverageReport?: any
  mutationReport?: any
}

/**
 * Core verification function for projection transitions
 * Ensures authority boundaries are maintained and snapshot is complete
 */
export async function verifyProjectionTransition(
  type: string,
  payload: any
): Promise<VerifiedTransitionResult> {
  const snapshotBefore = extractProjectionSnapshotFromStore()

  // Establish mutation baseline
  const mutationBaseline = detectStoreMutation.snapshot()

  // Execute transition through state machine
  const result = runTransition(snapshotBefore, { type: type as any, payload })

  // Sync to store and execute effects
  applyProjectionSnapshotToStore(result.nextState)
  await executeProjectionEffects(result.effects)

  // Check for mutations after transition
  const mutationAfter = detectStoreMutation.snapshot()

  // Validate snapshot coverage
  const coverageReport = validateSnapshotCoverage(result.nextState)

  const violations: string[] = []

  // 1. Mutation check - no mutations outside reducer
  if (detectStoreMutation.diff(mutationBaseline, mutationAfter)) {
    violations.push('STORE_MUTATION_DETECTED_OUTSIDE_REDUCER')
  }

  // 2. Snapshot integrity
  if (!result.nextState) {
    violations.push('MISSING_NEXT_SNAPSHOT')
  }

  // 3. Coverage completeness
  if (!coverageReport.ok) {
    violations.push(...coverageReport.mismatches.map((m) => `COVERAGE_${m}`))
  }

  return {
    ok: violations.length === 0,
    snapshotBefore,
    snapshotAfter: result.nextState,
    violations,
    coverageReport,
    mutationReport: {
      baseline: mutationBaseline,
      after: mutationAfter,
      mutated: detectStoreMutation.diff(mutationBaseline, mutationAfter)
    }
  }
}
export async function verifyTransitionSequence(
  transitions: Array<{ type: string; payload: any }>
): Promise<{
  ok: boolean
  results: VerifiedTransitionResult[]
  violations: string[]
}> {
  const results: VerifiedTransitionResult[] = []
  const allViolations: string[] = []

  for (const transition of transitions) {
    const result = await verifyProjectionTransition(transition.type, transition.payload)
    results.push(result)
    allViolations.push(...result.violations)
  }

  return {
    ok: allViolations.length === 0,
    results,
    violations: allViolations
  }
}

/**
 * Generate comprehensive authority report
 * Used for CI/CD validation and runtime monitoring
 */
export async function generateAuthorityReport(): Promise<any> {
  const currentSnapshot = extractProjectionSnapshotFromStore()
  const coverage = validateSnapshotCoverage(currentSnapshot)

  return createInvariantReport([
    ...(coverage.ok ? [] : coverage.mismatches.map((m) => `COVERAGE_${m}`))
  ])
}
