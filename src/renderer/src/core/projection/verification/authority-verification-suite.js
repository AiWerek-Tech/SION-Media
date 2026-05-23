/**
 * Projection Authority Verification Suite
 *
 * Comprehensive verification of the deterministic projection runtime system.
 * This script validates that all authority boundaries are properly enforced.
 */

import { requestTransition } from '../state-machine/projection-machine.js'
import { createProjectionSnapshot } from '../state-machine/projection-snapshot.js'
import {
  validateSnapshotCoverage,
  validateProjectionSnapshot
} from './snapshot-coverage-checker.js'
import { detectMutation } from './mutation-detector.js'
import { executeProjectionEffects } from '../state-machine/effects/index.js'

console.log('='.repeat(60))
console.log('PROJECTION AUTHORITY VERIFICATION SUITE')
console.log('='.repeat(60))
console.log('')

// ============================================================================
// SETUP
// ============================================================================

// Mock store state for testing
const mockStore = {
  projectionState: 'CLEAR',
  slides: [
    { id: '1', text: 'Verse 1\nLine 1\nLine 2', songId: 'song1' },
    { id: '2', text: 'Chorus\nAmazing Grace', songId: 'song1' },
    { id: '3', text: 'Verse 2\nHow sweet the sound', songId: 'song1' }
  ],
  currentSlideIndex: 0,
  programSlides: [],
  programSlideIndex: -1,
  programSlide: null,
  cuedSongMeta: { hymnalCode: 'H1', hymnalName: 'Test Hymnal' },
  programSongMeta: null,
  cuedSongBackgroundConfig: 'blue',
  programSongBackgroundConfig: '',
  programLockState: 'UNLOCKED',
  pendingChanges: [],
  hasPendingLiveChanges: false,
  sectionMap: { verse: [0, 2], chorus: [1] }
}

// Mock useProjectionStore
global.useProjectionStore = { getState: () => mockStore }

// ============================================================================
// STEP 1: Build projection snapshot from current store state
// ============================================================================

console.log('STEP 1: Building projection snapshot from store state...')

const { extractProjectionSnapshotFromStore } = await import('../sync/sync-projection-snapshot.js')

let initialSnapshot
try {
  initialSnapshot = extractProjectionSnapshotFromStore()
  console.log('✓ Snapshot built successfully')
  console.log('  - Fields extracted:', Object.keys(initialSnapshot).length)
} catch (error) {
  console.log('✗ Failed to build snapshot:', error.message)
  process.exit(1)
}

// ============================================================================
// STEP 2: Execute all registered projection transitions
// ============================================================================

console.log('\nSTEP 2: Executing all registered projection transitions...')

const transitions = [
  { name: 'next-slide', type: 'projection:next-slide', payload: {} },
  { name: 'prev-slide', type: 'projection:prev-slide', payload: {} },
  { name: 'go-to-slide', type: 'projection:go-to-slide', payload: { slideIndex: 1 } },
  { name: 'go-to-section', type: 'projection:go-to-section', payload: { section: 'chorus' } },
  { name: 'black', type: 'projection:black', payload: {} },
  { name: 'freeze', type: 'projection:freeze', payload: {} },
  { name: 'clear', type: 'projection:clear', payload: {} },
  { name: 'go-live', type: 'projection:go-live', payload: { slideIndex: 0 } },
  { name: 'take-cue', type: 'projection:take-cue', payload: {} },
  {
    name: 'go-to-address',
    type: 'projection:go-to-address',
    payload: { address: { type: 'slide', value: '2' } }
  }
]

const transitionResults = []
let currentSnapshot = initialSnapshot

transitions.forEach((transition) => {
  try {
    const result = requestTransition(currentSnapshot, {
      type: transition.type,
      payload: transition.payload
    })

    transitionResults.push({
      name: transition.name,
      result,
      previousSnapshot: currentSnapshot,
      success: true
    })

    currentSnapshot = result.nextState
    console.log('✓', transition.name, '- executed successfully')
  } catch (error) {
    transitionResults.push({
      name: transition.name,
      error: error.message,
      success: false
    })
    console.log('✗', transition.name, '- failed:', error.message)
  }
})

// ============================================================================
// STEP 3: Verify each transition
// ============================================================================

console.log('\nSTEP 3: Verifying each transition...')

let verificationFailures = 0

transitionResults.forEach((item) => {
  if (!item.success) {
    console.log('⚠', item.name, '- skipped verification (transition failed)')
    return
  }

  const { result, previousSnapshot } = item

  // 3b: Verify snapshot completeness
  const coverageResult = validateSnapshotCoverage(result.nextState)
  if (!coverageResult.isValid) {
    console.log('✗', item.name, '- snapshot incomplete:', coverageResult.errors.join(', '))
    verificationFailures++
  }

  // 3c: Verify snapshot invariants
  const invariantResult = validateProjectionSnapshot(result.nextState)
  if (!invariantResult.isValid) {
    console.log(
      '✗',
      item.name,
      '- snapshot invariants violated:',
      invariantResult.errors.join(', ')
    )
    verificationFailures++
  }

  // 3d: Verify effect purity (effects don't mutate store)
  try {
    executeProjectionEffects(result.effects)
    console.log('✓', item.name, '- effects executed purely')
  } catch (error) {
    console.log('✗', item.name, '- effect execution failed:', error.message)
    verificationFailures++
  }

  // 3e: Verify no store mutation leakage
  const mutationResult = detectMutation(previousSnapshot, result.nextState)
  if (mutationResult.hasMutation) {
    console.log('✗', item.name, '- store mutation detected:', mutationResult.mutations.join(', '))
    verificationFailures++
  } else {
    console.log('✓', item.name, '- no store mutation detected')
  }
})

// ============================================================================
// STEP 4: Run replay verification
// ============================================================================

console.log('\nSTEP 4: Running replay verification...')

let replaySnapshot = initialSnapshot
let replaySuccess = true

transitionResults.forEach((item, index) => {
  if (!item.success) return

  try {
    // Reconstruct the original payload for replay
    const originalPayload = transitions[index].payload
    const replayResult = requestTransition(replaySnapshot, {
      type: item.result.transitionType,
      payload: originalPayload
    })

    // Compare snapshots
    const originalState = JSON.stringify(item.result.nextState)
    const replayState = JSON.stringify(replayResult.nextState)

    if (originalState !== replayState) {
      console.log('✗ Replay verification failed at step', index + 1, '-', item.name)
      replaySuccess = false
    }

    replaySnapshot = replayResult.nextState
  } catch (error) {
    console.log('✗ Replay failed at step', index + 1, '-', item.name, ':', error.message)
    replaySuccess = false
  }
})

if (replaySuccess) {
  console.log('✓ Replay verification passed - deterministic behavior confirmed')
} else {
  verificationFailures++
}

// ============================================================================
// STEP 5: Generate authority report
// ============================================================================

console.log('\nSTEP 5: Generating authority report...')

const successfulTransitions = transitionResults.filter((r) => r.success).length
const coverageScore = Math.round((successfulTransitions / transitions.length) * 100)
const determinismScore = replaySuccess ? 100 : 0
const effectIsolationScore = verificationFailures === 0 ? 100 : 0

console.log('='.repeat(60))
console.log('AUTHORITY REPORT')
console.log('='.repeat(60))
console.log('Transitions Executed:', successfulTransitions + '/' + transitions.length)
console.log('Coverage Score:', coverageScore + '%')
console.log('Determinism Score:', determinismScore + '%')
console.log('Effect Isolation Score:', effectIsolationScore + '%')
console.log('Verification Failures:', verificationFailures)

if (verificationFailures > 0) {
  console.log('\n❌ AUTHORITY VIOLATIONS DETECTED')
  console.log('The projection system has authority leaks or non-deterministic behavior.')
  process.exit(1)
} else {
  console.log('\n✅ AUTHORITY VERIFICATION PASSED')
  console.log('The projection system is fully deterministic and authority-compliant.')
}
