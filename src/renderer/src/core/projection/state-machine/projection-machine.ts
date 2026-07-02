/**
 * Projection State Machine
 *
 * This module is the runtime entrypoint for projection transition requests.
 * It owns orchestration, validation, and deterministic state evolution.
 *
 * Handlers should request transitions here instead of mutating stores directly.
 */

import type { ProjectionStateMachineState } from './projection-state'
import type { ProjectionTransitionRequest, ProjectionTransitionResult } from './projection-events'
import { validateTransition } from './transition-validator'
import { runTransition } from './transition-runner'

/**
 * Request a projection transition in a deterministic, headless runtime.
 *
 * This function is intentionally pure at the boundary:
 * - it validates the requested transition
 * - it computes the next state
 * - it returns any side-effect requests without executing them
 */
export function requestTransition(
  currentState: ProjectionStateMachineState,
  transition: ProjectionTransitionRequest
): ProjectionTransitionResult {
  validateTransition(currentState, transition)
  return runTransition(currentState, transition)
}

export type { ProjectionStateMachineState, ProjectionTransitionRequest, ProjectionTransitionResult }
