/**
 * DETERMINISTIC EXECUTION ORACLE SYSTEM (DEOS) - PROJECTION INTEGRATION
 *
 * Real integration with the projection state machine for mathematically
 * enforceable verification of deterministic runtime behavior.
 */

import { DeterministicExecutionOracleSystem } from './deterministic-execution-oracle-system'
import { requestTransition } from '../state-machine/projection-machine'
import type { ProjectionStateMachineState } from '../state-machine/projection-state'
import type { ProjectionTransitionRequest } from '../state-machine/projection-events'

// ============================================================================
// PROJECTION-SPECIFIC DEOS ADAPTER
// ============================================================================

interface DEOS_Event {
  type: string
  payload?: any
}

interface DEOS_Effect {
  type: string
  payload: any
  timestamp: number
}

interface DEOS_TransitionResult {
  snapshot: ProjectionStateMachineState
  effects: DEOS_Effect[]
}

/**
 * Adapter to convert projection state machine to DEOS interface
 */
class ProjectionDEOS_Adapter {
  private initialSnapshot: ProjectionStateMachineState

  constructor(initialSnapshot: ProjectionStateMachineState) {
    this.initialSnapshot = structuredClone(initialSnapshot)
  }

  /**
   * Convert projection effects to DEOS effect format
   */
  private convertToDEOSEffects(effects: any[]): DEOS_Effect[] {
    return effects.map((effect) => ({
      type: effect.type,
      payload: effect.payload || {},
      timestamp: Date.now()
    }))
  }

  /**
   * Execute transition using real projection state machine
   */
  executeTransition(
    snapshot: ProjectionStateMachineState,
    event: DEOS_Event
  ): DEOS_TransitionResult {
    // Convert DEOS event back to projection transition request
    const transitionRequest: ProjectionTransitionRequest = {
      type: event.type as any,
      payload: event.payload || {}
    }

    // Execute real transition
    const result = requestTransition(snapshot, transitionRequest)

    // Convert to DEOS format
    return {
      snapshot: result.nextState,
      effects: this.convertToDEOSEffects(result.effects)
    }
  }

  getInitialSnapshot(): ProjectionStateMachineState {
    return structuredClone(this.initialSnapshot)
  }
}

// ============================================================================
// PROJECTION DEOS RUNNER
// ============================================================================

export class ProjectionDeterministicExecutionOracle {
  private oracle: DeterministicExecutionOracleSystem
  private adapter: ProjectionDEOS_Adapter

  constructor(initialSnapshot: ProjectionStateMachineState) {
    this.adapter = new ProjectionDEOS_Adapter(initialSnapshot)

    // Create DEOS reducer that uses real projection state machine
    const projectionReducer = (snapshot: any, event: any): any => {
      return this.adapter.executeTransition(snapshot, event)
    }

    this.oracle = new DeterministicExecutionOracleSystem(
      projectionReducer,
      this.adapter.getInitialSnapshot()
    )
  }

  /**
   * Run comprehensive deterministic verification on projection system
   */
  verifyProjectionSystem(eventSequence: ProjectionTransitionRequest[]): {
    passed: boolean
    violations: string[]
    metrics: any
    authorityReport: any
  } {
    console.log('🎭 PROJECTION DETERMINISTIC EXECUTION ORACLE')
    console.log('='.repeat(80))
    console.log('Testing real projection state machine with mathematical enforcement')

    // Convert projection transitions to DEOS events
    const deosEvents: DEOS_Event[] = eventSequence.map((transition) => ({
      type: transition.type,
      payload: transition.payload
    }))

    // Run DEOS verification
    const result = this.oracle.verify(deosEvents)

    // Generate authority report
    const authorityReport = {
      systemType: 'PROJECTION STATE MACHINE',
      verificationType: 'MATHEMATICAL DETERMINISM',
      authorityBoundaries: [
        'Pure reducer functions',
        'Isolated effect execution',
        'Immutable state snapshots',
        'Deterministic transitions'
      ],
      enforcementLevel: result.passed ? 'HARD FAIL ACTIVE' : 'VIOLATIONS DETECTED',
      runtimeFirewall: 'ACTIVE (Proxy-based mutation detection)',
      effectSerialization: 'ENFORCED (Ledger-based comparison)',
      hashOracle: 'ACTIVE (SHA-256 state hashing)',
      replayVerification: result.passed ? 'PASSED' : 'FAILED'
    }

    return {
      ...result,
      authorityReport
    }
  }
}

// ============================================================================
// PROJECTION TEST SCENARIOS
// ============================================================================

export function createProjectionTestScenarios(): {
  name: string
  description: string
  initialState: ProjectionStateMachineState
  eventSequence: ProjectionTransitionRequest[]
}[] {
  return [
    {
      name: 'Basic Live Projection Flow',
      description: 'Test basic take-cue → go-live → navigation flow',
      initialState: {
        slides: [
          { songId: 1, slideIndex: 0, text: 'Slide 1', sectionLabel: 'verse' },
          { songId: 1, slideIndex: 1, text: 'Slide 2', sectionLabel: 'chorus' },
          { songId: 1, slideIndex: 2, text: 'Slide 3', sectionLabel: 'verse' }
        ],
        currentSlideIndex: 0,
        programSlides: [],
        programSlideIndex: -1,
        programSlide: null,
        projectionState: 'CLEAR',
        programLockState: 'UNLOCKED',
        pendingChanges: [],
        hasPendingLiveChanges: false,
        sectionMap: {},
        cuedSongMeta: null,
        cuedSongBackgroundConfig: '',
        programSongMeta: null,
        programSongBackgroundConfig: ''
      },
      eventSequence: [
        { type: 'projection:take-cue', payload: {} },
        { type: 'projection:go-live', payload: {} },
        { type: 'projection:next-slide', payload: {} },
        { type: 'projection:prev-slide', payload: {} },
        { type: 'projection:black', payload: {} },
        { type: 'projection:clear', payload: {} }
      ]
    },
    {
      name: 'Complex Navigation Scenario',
      description: 'Test go-to-slide, go-to-section, and address navigation',
      initialState: {
        slides: [
          { songId: 2, slideIndex: 0, text: 'Verse 1', sectionLabel: 'verse' },
          { songId: 2, slideIndex: 1, text: 'Chorus', sectionLabel: 'chorus' },
          { songId: 2, slideIndex: 2, text: 'Verse 2', sectionLabel: 'verse' },
          { songId: 2, slideIndex: 3, text: 'Bridge', sectionLabel: 'bridge' }
        ],
        currentSlideIndex: 0,
        programSlides: [
          { songId: 2, slideIndex: 0, text: 'Verse 1', sectionLabel: 'verse' },
          { songId: 2, slideIndex: 1, text: 'Chorus', sectionLabel: 'chorus' },
          { songId: 2, slideIndex: 2, text: 'Verse 2', sectionLabel: 'verse' },
          { songId: 2, slideIndex: 3, text: 'Bridge', sectionLabel: 'bridge' }
        ],
        programSlideIndex: 0,
        programSlide: { songId: 2, slideIndex: 0, text: 'Verse 1', sectionLabel: 'verse' },
        projectionState: 'LIVE',
        programLockState: 'LIVE_LOCK',
        pendingChanges: [],
        hasPendingLiveChanges: false,
        sectionMap: {
          verse: [0, 2],
          chorus: [1],
          bridge: [3]
        },
        cuedSongMeta: null,
        cuedSongBackgroundConfig: '',
        programSongMeta: null,
        programSongBackgroundConfig: ''
      },
      eventSequence: [
        { type: 'projection:go-to-slide', payload: { slideIndex: 2 } },
        { type: 'projection:go-to-section', payload: { section: 'chorus' } },
        {
          type: 'projection:go-to-address',
          payload: { address: { type: 'NUMERIC', value: 1 } }
        },
        { type: 'projection:freeze', payload: {} },
        { type: 'projection:freeze', payload: {} } // Toggle back
      ]
    },
    {
      name: 'Dirty State Management',
      description: 'Test mark-dirty, update-live, and discard-changes flow',
      initialState: {
        slides: [
          { songId: 3, slideIndex: 0, text: 'Original Slide 1', sectionLabel: 'verse' },
          { songId: 3, slideIndex: 1, text: 'Original Slide 2', sectionLabel: 'chorus' }
        ],
        currentSlideIndex: 0,
        programSlides: [
          { songId: 3, slideIndex: 0, text: 'Original Slide 1', sectionLabel: 'verse' },
          { songId: 3, slideIndex: 1, text: 'Original Slide 2', sectionLabel: 'chorus' }
        ],
        programSlideIndex: 0,
        programSlide: { songId: 3, slideIndex: 0, text: 'Original Slide 1', sectionLabel: 'verse' },
        projectionState: 'LIVE',
        programLockState: 'LIVE_LOCK',
        pendingChanges: [],
        hasPendingLiveChanges: false,
        sectionMap: {},
        cuedSongMeta: null,
        cuedSongBackgroundConfig: '',
        programSongMeta: null,
        programSongBackgroundConfig: ''
      },
      eventSequence: [
        {
          type: 'projection:mark-dirty',
          payload: {
            change: {
              type: 'slide_content',
              timestamp: Date.now(),
              description: 'Modified Slide 1'
            }
          }
        },
        { type: 'projection:update-live', payload: {} },
        {
          type: 'projection:mark-dirty',
          payload: {
            change: {
              type: 'slide_content',
              timestamp: Date.now(),
              description: 'Modified Slide 2'
            }
          }
        },
        { type: 'projection:discard-changes', payload: {} }
      ]
    }
  ]
}

// ============================================================================
// MAIN EXECUTION ORACLE
// ============================================================================

export async function runProjectionAuthorityVerification(): Promise<{
  passed: boolean
  violations: string[]
  metrics: any
  scenarioResults: any[]
}> {
  console.log('🚀 PROJECTION AUTHORITY VERIFICATION SUITE (DEOS)')
  console.log('==================================================')

  const scenarios = createProjectionTestScenarios()
  const scenarioResults: any[] = []
  let totalPassed = 0
  let totalViolations: string[] = []

  for (const scenario of scenarios) {
    console.log(`\\n🎬 Running Scenario: ${scenario.name}`)
    console.log(`   ${scenario.description}`)

    const oracle = new ProjectionDeterministicExecutionOracle(scenario.initialState)
    const result = oracle.verifyProjectionSystem(scenario.eventSequence)

    scenarioResults.push({
      scenario: scenario.name,
      passed: result.passed,
      violations: result.violations,
      metrics: result.metrics
    })

    if (result.passed) {
      totalPassed++
      console.log(`✅ PASSED`)
    } else {
      console.log(`❌ FAILED`)
      console.log(`   Violations: ${result.violations.join(', ')}`)
      totalViolations.push(...result.violations)
    }
  }

  const overallPassed = totalPassed === scenarios.length

  const finalMetrics = {
    totalScenarios: scenarios.length,
    passedScenarios: totalPassed,
    failedScenarios: scenarios.length - totalPassed,
    totalViolations: totalViolations.length,
    authorityScore: overallPassed ? 100 : Math.round((totalPassed / scenarios.length) * 100),
    verificationType: 'MATHEMATICAL DETERMINISM',
    enforcementLevel: 'HARD FAIL',
    systemStatus: overallPassed ? 'DETERMINISTIC' : 'NON-DETERMINISTIC'
  }

  console.log('\\n' + '='.repeat(80))
  console.log('🎯 FINAL AUTHORITY REPORT')
  console.log('='.repeat(80))
  console.log(`Scenarios Tested: ${finalMetrics.totalScenarios}`)
  console.log(`Passed: ${finalMetrics.passedScenarios}`)
  console.log(`Failed: ${finalMetrics.failedScenarios}`)
  console.log(`Authority Score: ${finalMetrics.authorityScore}%`)
  console.log(`System Status: ${finalMetrics.systemStatus}`)

  if (overallPassed) {
    console.log('\\n✅ AUTHORITY VERIFICATION COMPLETE')
    console.log('🎯 The projection system is MATHEMATICALLY DETERMINISTIC')
    console.log('🔒 All authority boundaries are properly enforced')
    console.log('🧠 Runtime verification with HARD FAILS is active')
  } else {
    console.log('\\n❌ AUTHORITY VIOLATIONS DETECTED')
    console.log('🚨 System is NOT mathematically deterministic')
    console.log('🔍 Violations must be resolved before deployment')
    console.log(
      `\\nViolations: ${totalViolations.slice(0, 5).join(', ')}${totalViolations.length > 5 ? '...' : ''}`
    )
  }

  return {
    passed: overallPassed,
    violations: totalViolations,
    metrics: finalMetrics,
    scenarioResults
  }
}
