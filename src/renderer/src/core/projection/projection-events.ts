/**
 * Projection State Types — Formal state machine contract.
 * Domain rules for projection behavior.
 */

// ============================================================================
// FORMAL STATE TRANSITION CONTRACT
// ============================================================================

export type ProjectionState = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'STOPPED'

export type ProjectionEvent = 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'NEXT_SLIDE' | 'PREV_SLIDE'

// ============================================================================
// STATE MACHINE INTERFACE
// ============================================================================

export interface ProjectionContext {
  currentSlideIndex: number
}

export interface ProjectionStateMachineState {
  state: ProjectionState
  context: ProjectionContext
  timestamp: number
}

export interface ProjectionTransitionRequest {
  type: ProjectionEvent
  payload?: unknown
}

export interface ProjectionTransitionResult {
  newState: ProjectionStateMachineState
  sideEffects: ProjectionSideEffect[]
}

// ============================================================================
// SIDE EFFECTS (ISOLATED FROM STATE)
// ============================================================================

export type ProjectionSideEffect =
  | { type: 'SLIDE_CHANGED'; fromIndex: number; toIndex: number }
  | { type: 'PROJECTION_STARTED' }
  | { type: 'PROJECTION_STOPPED' }
  | { type: 'PROJECTION_PAUSED' }
  | { type: 'PROJECTION_RESUMED' }
