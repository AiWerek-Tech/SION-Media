/**
 * PROJECTION STATE MACHINE - PURE RUNTIME
 *
 * Production-grade runtime system.
 * No verification, no instrumentation, no debugging.
 * Pure deterministic state transitions only.
 *
 * This is the ONLY code that runs in production.
 */

import type { ProjectionStateMachineState } from './projection-state'
import type { ProjectionTransitionRequest, ProjectionTransitionResult } from './projection-events'
import { validateTransition } from './transition-validator'
import { runTransition } from './transition-runner'
import { withTransitionLogging } from './event-trace'

/**
 * Production runtime entrypoint.
 * Pure function - no side effects, no logging, no verification.
 */
export function requestTransition(
  currentState: ProjectionStateMachineState,
  transition: ProjectionTransitionRequest
): ProjectionTransitionResult {
  validateTransition(currentState, transition)
  return runTransition(currentState, transition)
}

/**
 * Instrumented runtime entrypoint with logging.
 * Used in development and for debugging.
 */
export const requestTransitionWithLogging = withTransitionLogging(
  requestTransition,
  'FSM_TRANSITION'
)

// ============================================================================
// CLEAN ARCHITECTURE SEPARATION
// ============================================================================

/**
 * Runtime exports - only what's needed for production execution
 */
export type {
  ProjectionStateMachineState,
  ProjectionTransitionRequest,
  ProjectionTransitionResult
} from './projection-events'
