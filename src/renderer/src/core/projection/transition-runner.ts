/**
 * Transition Runner — Pure reducer implementing formal state machine.
 * Behavioral correctness: Deterministic state evolution with isolated side effects.
 */

import type {
  ProjectionState,
  ProjectionEvent,
  ProjectionStateMachineState,
  ProjectionTransitionRequest,
  ProjectionTransitionResult,
  ProjectionContext,
  ProjectionSideEffect
} from './projection-events'

// ============================================================================
// PURE REDUCER FUNCTION
// ============================================================================

export function runTransition(
  currentState: ProjectionStateMachineState,
  transition: ProjectionTransitionRequest
): ProjectionTransitionResult {
  const { state, context } = currentState
  const { type: event } = transition

  // Execute pure transition
  const transitionResult = executeTransition(state, context, event)

  // Return new state with updated timestamp
  return {
    newState: {
      state: transitionResult.state,
      context: transitionResult.context,
      timestamp: Date.now()
    },
    sideEffects: transitionResult.sideEffects
  }
}

// ============================================================================
// TRANSITION ENGINE (PURE FUNCTION)
// ============================================================================

interface TransitionResult {
  state: ProjectionState
  context: ProjectionContext
  sideEffects: ProjectionSideEffect[]
}

function executeTransition(
  state: ProjectionState,
  context: ProjectionContext,
  event: ProjectionEvent
): TransitionResult {
  switch (state) {
    case 'IDLE':
      if (event === 'START') {
        return {
          state: 'ACTIVE',
          context,
          sideEffects: [{ type: 'PROJECTION_STARTED' }]
        }
      }
      return invalidTransition(state, event)

    case 'ACTIVE':
      if (event === 'PAUSE') {
        return {
          state: 'PAUSED',
          context,
          sideEffects: [{ type: 'PROJECTION_PAUSED' }]
        }
      }
      if (event === 'STOP') {
        return {
          state: 'STOPPED',
          context,
          sideEffects: [{ type: 'PROJECTION_STOPPED' }]
        }
      }
      if (event === 'NEXT_SLIDE') {
        const newIndex = Math.min(context.currentSlideIndex + 1, 999) // arbitrary max
        return {
          state,
          context: { ...context, currentSlideIndex: newIndex },
          sideEffects: [
            {
              type: 'SLIDE_CHANGED',
              fromIndex: context.currentSlideIndex,
              toIndex: newIndex
            }
          ]
        }
      }
      if (event === 'PREV_SLIDE') {
        const newIndex = Math.max(context.currentSlideIndex - 1, 0)
        return {
          state,
          context: { ...context, currentSlideIndex: newIndex },
          sideEffects: [
            {
              type: 'SLIDE_CHANGED',
              fromIndex: context.currentSlideIndex,
              toIndex: newIndex
            }
          ]
        }
      }
      return invalidTransition(state, event)

    case 'PAUSED':
      if (event === 'RESUME') {
        return {
          state: 'ACTIVE',
          context,
          sideEffects: [{ type: 'PROJECTION_RESUMED' }]
        }
      }
      if (event === 'STOP') {
        return {
          state: 'STOPPED',
          context,
          sideEffects: [{ type: 'PROJECTION_STOPPED' }]
        }
      }
      if (event === 'NEXT_SLIDE') {
        const newIndex = Math.min(context.currentSlideIndex + 1, 999)
        return {
          state,
          context: { ...context, currentSlideIndex: newIndex },
          sideEffects: [
            {
              type: 'SLIDE_CHANGED',
              fromIndex: context.currentSlideIndex,
              toIndex: newIndex
            }
          ]
        }
      }
      if (event === 'PREV_SLIDE') {
        const newIndex = Math.max(context.currentSlideIndex - 1, 0)
        return {
          state,
          context: { ...context, currentSlideIndex: newIndex },
          sideEffects: [
            {
              type: 'SLIDE_CHANGED',
              fromIndex: context.currentSlideIndex,
              toIndex: newIndex
            }
          ]
        }
      }
      return invalidTransition(state, event)

    case 'STOPPED':
      if (event === 'START') {
        return {
          state: 'ACTIVE',
          context,
          sideEffects: [{ type: 'PROJECTION_STARTED' }]
        }
      }
      return invalidTransition(state, event)

    default:
      return invalidTransition(state, event)
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function invalidTransition(state: ProjectionState, event: ProjectionEvent): never {
  throw new Error(
    `Invalid transition: ${state} + ${event}. ` +
      `See projection state machine contract for allowed transitions.`
  )
}
