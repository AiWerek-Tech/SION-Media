/**
 * Transition Validator — Validates state transitions against formal rules.
 * Behavioral correctness: Only valid transitions are allowed.
 */

import type {
  ProjectionState,
  ProjectionEvent,
  ProjectionStateMachineState,
  ProjectionTransitionRequest
} from './projection-events'

// ============================================================================
// FORMAL TRANSITION VALIDATION RULES
// ============================================================================

/**
 * Validates if a transition is allowed from current state
 */
export function validateTransition(
  currentState: ProjectionStateMachineState,
  transition: ProjectionTransitionRequest
): void {
  const { state } = currentState
  const { type: event } = transition

  // Check if transition is valid
  if (!isValidTransition(state, event)) {
    throw new Error(
      `Invalid transition: ${state} + ${event}. ` +
        `See projection state machine contract for allowed transitions.`
    )
  }
}

/**
 * Core validation logic - pure function implementing transition rules
 */
function isValidTransition(state: ProjectionState, event: ProjectionEvent): boolean {
  switch (state) {
    case 'IDLE':
      return event === 'START'

    case 'ACTIVE':
      return (
        event === 'PAUSE' || event === 'STOP' || event === 'NEXT_SLIDE' || event === 'PREV_SLIDE'
      )

    case 'PAUSED':
      return (
        event === 'RESUME' || event === 'STOP' || event === 'NEXT_SLIDE' || event === 'PREV_SLIDE'
      )

    case 'STOPPED':
      return event === 'START'

    default:
      return false
  }
}

// ============================================================================
// TRANSITION CONTRACT DOCUMENTATION
// ============================================================================

/**
 * FORMAL STATE TRANSITION TABLE (DOMAIN CONTRACT)
 *
 * | Current State | Event      | Next State | Allowed               |
 * | ------------- | ---------- | ---------- | --------------------- |
 * | IDLE          | START      | ACTIVE     | ✅                     |
 * | ACTIVE        | PAUSE      | PAUSED     | ✅                     |
 * | ACTIVE        | STOP       | STOPPED    | ✅                     |
 * | PAUSED        | RESUME     | ACTIVE     | ✅                     |
 * | PAUSED        | STOP       | STOPPED    | ✅                     |
 * | STOPPED       | START      | ACTIVE     | ✅                     |
 * | ANY           | NEXT_SLIDE | SAME       | ⚠️ (side effect only) |
 * | ANY           | PREV_SLIDE | SAME       | ⚠️ (side effect only) |
 *
 * INVALID TRANSITIONS (REJECTED):
 * - IDLE → PAUSE ❌
 * - STOPPED → PAUSE ❌
 * - STOPPED → RESUME ❌
 * - ACTIVE → RESUME ❌
 *
 * INVARIANT: State only changes through valid transition rules.
 */
