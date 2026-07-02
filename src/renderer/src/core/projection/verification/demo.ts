/**
 * Projection Authority Verification Demo
 *
 * Demonstrates the verification harness capabilities
 * Run this to see the system prove its authority boundaries
 */

import { verifyProjectionTransition } from './projection-authority-harness'
import { validateSnapshotCoverage } from './snapshot-coverage-checker'
import { verifyReplay } from './replay-verifier'
import { createInvariantReport, formatReportForConsole } from './invariant-report'
import { extractProjectionSnapshotFromStore } from '../sync/sync-projection-snapshot'

/**
 * Demo: Basic transition verification
 */
export async function demoBasicVerification() {
  console.log('🧪 Testing basic projection transition verification...')

  try {
    const result = await verifyProjectionTransition('projection:take-cue', {})

    console.log('✅ Transition verification result:', result.ok ? 'PASS' : 'FAIL')
    if (!result.ok) {
      console.log('❌ Violations:', result.violations)
    }

    return result
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return null
  }
}

/**
 * Demo: Snapshot coverage validation
 */
export function demoSnapshotCoverage() {
  console.log('🧪 Testing snapshot coverage validation...')

  try {
    const snapshot = extractProjectionSnapshotFromStore()
    const coverage = validateSnapshotCoverage(snapshot)

    console.log('✅ Coverage validation result:', coverage.ok ? 'PASS' : 'FAIL')
    if (!coverage.ok) {
      console.log('❌ Coverage issues:', coverage.mismatches)
    }

    return coverage
  } catch (error) {
    console.error('❌ Coverage validation failed:', error)
    return null
  }
}

/**
 * Demo: Replay verification
 */
export function demoReplayVerification() {
  console.log('🧪 Testing replay verification...')

  try {
    const initialSnapshot = extractProjectionSnapshotFromStore()

    // Simple transition sequence
    const transitions = [
      { type: 'projection:black', payload: {}, timestamp: Date.now() },
      { type: 'projection:clear', payload: {}, timestamp: Date.now() + 1 },
      { type: 'projection:take-cue', payload: {}, timestamp: Date.now() + 2 }
    ]

    const replayResult = verifyReplay(initialSnapshot, transitions)

    console.log('✅ Replay verification result:', replayResult.ok ? 'PASS' : 'FAIL')
    if (!replayResult.ok) {
      console.log('❌ Replay violations:', replayResult.violations)
    }

    return replayResult
  } catch (error) {
    console.error('❌ Replay verification failed:', error)
    return null
  }
}

/**
 * Demo: Comprehensive authority report
 */
export async function demoAuthorityReport() {
  console.log('🧪 Generating comprehensive authority report...')

  try {
    const startTime = performance.now()

    // Run multiple verifications
    const transitionResult = await verifyProjectionTransition('projection:clear', {})
    const coverageResult = validateSnapshotCoverage(extractProjectionSnapshotFromStore())

    const duration = performance.now() - startTime

    // Create comprehensive report
    const violations = [
      ...(transitionResult?.violations || []),
      ...(coverageResult?.ok ? [] : coverageResult?.mismatches.map((m) => `COVERAGE_${m}`) || [])
    ]

    const report = createInvariantReport(
      violations,
      {
        snapshotCoverage: coverageResult
      },
      duration
    )

    // Format and display
    console.log(formatReportForConsole(report))

    return report
  } catch (error) {
    console.error('❌ Report generation failed:', error)
    return null
  }
}

/**
 * Run all demos
 */
export async function runVerificationDemos() {
  console.log('🚀 Starting Projection Authority Verification Demos\n')

  await demoBasicVerification()
  console.log('')

  demoSnapshotCoverage()
  console.log('')

  demoReplayVerification()
  console.log('')

  await demoAuthorityReport()

  console.log('\n✨ Verification demos complete!')
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  // Small delay to ensure store is initialized
  setTimeout(() => {
    runVerificationDemos()
  }, 1000)
}
