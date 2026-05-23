/**
 * PROJECTION INSTRUMENTATION LAYER
 *
 * Development/debugging tools.
 * Mutation detection, state inspection, effect logging.
 * NEVER runs in production.
 */

import type { ProjectionStateMachineState } from './state-machine/projection-state'
import type {
  ProjectionTransitionRequest,
  ProjectionTransitionResult
} from './state-machine/projection-events'

const monitor = {
  start: (): void => undefined,
  stop: (): void => undefined
}

// ============================================================================
// MUTATION DETECTOR (DEV MODE ONLY)
// ============================================================================

class MutationDetector {
  private static active = false
  private static violations: string[] = []

  static enable(): void {
    this.active = true
    this.violations = []

    // Start architecture monitoring (instrumentation-only)
    monitor.start()
  }

  static disable(): void {
    this.active = false

    // Stop architecture monitoring
    monitor.stop()
  }

  static createProtectedState(state: ProjectionStateMachineState): ProjectionStateMachineState {
    if (!this.active) return state

    return new Proxy(state, {
      set(
        _target: ProjectionStateMachineState,
        property: string | symbol,
        value: unknown
      ): boolean {
        const violation = `[MUTATION] Attempted to set ${String(property)} = ${JSON.stringify(value)}`
        console.warn(`🚨 ${violation}`)
        MutationDetector.addViolation(violation)
        throw new Error(violation)
      },

      deleteProperty(_target: ProjectionStateMachineState, property: string | symbol): boolean {
        const violation = `[MUTATION] Attempted to delete ${String(property)}`
        console.warn(`🚨 ${violation}`)
        MutationDetector.addViolation(violation)
        throw new Error(violation)
      }
    })
  }

  // Utility to allow proxy handlers to record violations
  static addViolation(message: string): void {
    // push into private storage
    MutationDetector.violations.push(message)
  }

  static getViolations(): string[] {
    return [...this.violations]
  }

  static hasViolations(): boolean {
    return this.violations.length > 0
  }
}

// ============================================================================
// STATE INSPECTOR (DEV MODE ONLY)
// ============================================================================

class StateInspector {
  private static snapshots: Array<{ timestamp: number; state: ProjectionStateMachineState }> = []

  static enable(): void {
    this.snapshots = []
  }

  static capture(state: ProjectionStateMachineState): void {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)) // Deep clone
    })
  }

  static getSnapshots(): Array<{ timestamp: number; state: ProjectionStateMachineState }> {
    return [...this.snapshots]
  }

  static getSnapshotAt(index: number): ProjectionStateMachineState | null {
    return this.snapshots[index]?.state || null
  }
}

// ============================================================================
// EFFECT LOGGER (DEV MODE ONLY)
// ============================================================================

class EffectLogger {
  private static effects: Array<Record<string, unknown>> = []

  static enable(): void {
    this.effects = []
  }

  static log(effect: Record<string, unknown>): void {
    this.effects.push({
      ...effect,
      loggedAt: Date.now()
    })
  }

  static getEffects(): Array<Record<string, unknown>> {
    return [...this.effects]
  }
}

// ============================================================================
// INSTRUMENTED TRANSITION RUNNER (DEV MODE ONLY)
// ============================================================================

export function requestInstrumentedTransition(
  currentState: ProjectionStateMachineState,
  transition: ProjectionTransitionRequest
): ProjectionTransitionResult {
  console.log(`🔍 [INSTRUMENTATION] Processing transition: ${transition.type}`)

  // Capture pre-state
  StateInspector.capture(currentState)

  // Enable mutation detection
  MutationDetector.enable()

  try {
    // Import the pure runtime (this would be dynamic in real implementation)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requestTransition } = require('../runtime')

    // Create protected state
    const protectedState = MutationDetector.createProtectedState(currentState)

    // Execute transition
    const result = requestTransition(protectedState, transition)

    // Log effects
    result.effects.forEach((effect) => EffectLogger.log(effect))

    // Capture post-state
    StateInspector.capture(result.nextState)

    console.log(`✅ [INSTRUMENTATION] Transition completed: ${result.transitionType}`)

    return result
  } catch (error) {
    console.error(`❌ [INSTRUMENTATION] Transition failed:`, error)
    throw error
  } finally {
    MutationDetector.disable()
  }
}

// ============================================================================
// DEBUG API (DEV MODE ONLY)
// ============================================================================

export const DebugAPI = {
  // Mutation detection
  getMutationViolations: () => MutationDetector.getViolations(),
  hasMutationViolations: () => MutationDetector.hasViolations(),

  // State inspection
  getStateSnapshots: () => StateInspector.getSnapshots(),
  getStateAt: (index: number) => StateInspector.getSnapshotAt(index),

  // Effect logging
  getLoggedEffects: () => EffectLogger.getEffects(),

  // Control
  enableInstrumentation: () => {
    MutationDetector.enable()
    StateInspector.enable()
    EffectLogger.enable()
    console.log('🔧 Instrumentation enabled')
  },

  disableInstrumentation: () => {
    MutationDetector.disable()
    console.log('🔧 Instrumentation disabled')
  }
}

// ============================================================================
// DEVELOPMENT MODE DETECTION
// ============================================================================

export const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER === 'true'

export const isInstrumentationEnabled = isDevelopment
