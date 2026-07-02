/**
 * TRANSITION LOGIC TESTS
 *
 * Behavioral tests for formal state machine transitions.
 * Focus: Logic correctness against domain contract.
 */

import { describe, it, expect } from 'vitest'
import { runTransition } from '@renderer/core/projection/transition-runner'
import { validateTransition } from '@renderer/core/projection/transition-validator'
import type {
  ProjectionStateMachineState,
  ProjectionTransitionRequest,
  ProjectionState,
  ProjectionEvent
} from '@renderer/core/projection/projection-events'

describe('Projection State Machine - Behavioral Tests', () => {
  // Helper to create test state
  function createState(state: ProjectionState, slideIndex = 0): ProjectionStateMachineState {
    return {
      state,
      context: { currentSlideIndex: slideIndex },
      timestamp: 1000
    }
  }

  describe('Formal Transition Rules', () => {
    describe('IDLE State', () => {
      it('should accept START → ACTIVE', () => {
        const initial = createState('IDLE')
        const transition: ProjectionTransitionRequest = { type: 'START' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('ACTIVE')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_STARTED' }])
      })

      it('should reject invalid transitions from IDLE', () => {
        const initial = createState('IDLE')
        const invalidTransitions: ProjectionEvent[] = [
          'PAUSE',
          'RESUME',
          'STOP',
          'NEXT_SLIDE',
          'PREV_SLIDE'
        ]

        invalidTransitions.forEach((event) => {
          const transition: ProjectionTransitionRequest = { type: event }
          expect(() => validateTransition(initial, transition)).toThrow(/Invalid transition/)
        })
      })
    })

    describe('ACTIVE State', () => {
      it('should accept PAUSE → PAUSED', () => {
        const initial = createState('ACTIVE')
        const transition: ProjectionTransitionRequest = { type: 'PAUSE' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('PAUSED')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_PAUSED' }])
      })

      it('should accept STOP → STOPPED', () => {
        const initial = createState('ACTIVE')
        const transition: ProjectionTransitionRequest = { type: 'STOP' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('STOPPED')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_STOPPED' }])
      })

      it('should handle NEXT_SLIDE (side effect only)', () => {
        const initial = createState('ACTIVE', 5)
        const transition: ProjectionTransitionRequest = { type: 'NEXT_SLIDE' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('ACTIVE') // state unchanged
        expect(result.newState.context.currentSlideIndex).toBe(6)
        expect(result.sideEffects).toEqual([
          {
            type: 'SLIDE_CHANGED',
            fromIndex: 5,
            toIndex: 6
          }
        ])
      })

      it('should handle PREV_SLIDE (side effect only)', () => {
        const initial = createState('ACTIVE', 5)
        const transition: ProjectionTransitionRequest = { type: 'PREV_SLIDE' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('ACTIVE') // state unchanged
        expect(result.newState.context.currentSlideIndex).toBe(4)
        expect(result.sideEffects).toEqual([
          {
            type: 'SLIDE_CHANGED',
            fromIndex: 5,
            toIndex: 4
          }
        ])
      })
    })

    describe('PAUSED State', () => {
      it('should accept RESUME → ACTIVE', () => {
        const initial = createState('PAUSED')
        const transition: ProjectionTransitionRequest = { type: 'RESUME' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('ACTIVE')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_RESUMED' }])
      })

      it('should accept STOP → STOPPED', () => {
        const initial = createState('PAUSED')
        const transition: ProjectionTransitionRequest = { type: 'STOP' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('STOPPED')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_STOPPED' }])
      })

      it('should handle slide navigation while paused', () => {
        const initial = createState('PAUSED', 3)
        const transition: ProjectionTransitionRequest = { type: 'NEXT_SLIDE' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('PAUSED') // remains paused
        expect(result.newState.context.currentSlideIndex).toBe(4)
      })
    })

    describe('STOPPED State', () => {
      it('should accept START → ACTIVE', () => {
        const initial = createState('STOPPED')
        const transition: ProjectionTransitionRequest = { type: 'START' }

        const result = runTransition(initial, transition)

        expect(result.newState.state).toBe('ACTIVE')
        expect(result.sideEffects).toEqual([{ type: 'PROJECTION_STARTED' }])
      })

      it('should reject invalid transitions from STOPPED', () => {
        const initial = createState('STOPPED')
        const invalidTransitions: ProjectionEvent[] = [
          'PAUSE',
          'RESUME',
          'STOP',
          'NEXT_SLIDE',
          'PREV_SLIDE'
        ]

        invalidTransitions.forEach((event) => {
          const transition: ProjectionTransitionRequest = { type: event }
          expect(() => validateTransition(initial, transition)).toThrow(/Invalid transition/)
        })
      })
    })
  })

  describe('Behavioral Correctness', () => {
    it('should maintain state immutability', () => {
      const original = createState('IDLE', 0)
      const transition: ProjectionTransitionRequest = { type: 'START' }

      const result = runTransition(original, transition)

      // Original should be unchanged
      expect(original.state).toBe('IDLE')
      expect(original.context.currentSlideIndex).toBe(0)

      // New state should be different object
      expect(result.newState).not.toBe(original)
      expect(result.newState.state).toBe('ACTIVE')
    })

    it('should update timestamp on every transition', () => {
      const now = Date.now()
      const initial = createState('IDLE')
      const transition: ProjectionTransitionRequest = { type: 'START' }

      const result = runTransition(initial, transition)

      expect(result.newState.timestamp).toBeGreaterThanOrEqual(now)
    })

    it('should prevent slide index from going below 0', () => {
      const initial = createState('ACTIVE', 0)
      const transition: ProjectionTransitionRequest = { type: 'PREV_SLIDE' }

      const result = runTransition(initial, transition)

      expect(result.newState.context.currentSlideIndex).toBe(0)
    })

    it('should handle slide bounds correctly', () => {
      // Test upper bound (arbitrary max 999)
      const initial = createState('ACTIVE', 999)
      const transition: ProjectionTransitionRequest = { type: 'NEXT_SLIDE' }

      const result = runTransition(initial, transition)

      expect(result.newState.context.currentSlideIndex).toBe(999)
    })
  })

  describe('Error Handling', () => {
    it('should throw descriptive errors for invalid transitions', () => {
      const initial = createState('IDLE')
      const transition: ProjectionTransitionRequest = { type: 'PAUSE' }

      expect(() => runTransition(initial, transition)).toThrow('Invalid transition: IDLE + PAUSE')
    })

    it('should validate transitions before execution', () => {
      const initial = createState('IDLE')
      const transition: ProjectionTransitionRequest = { type: 'PAUSE' }

      expect(() => validateTransition(initial, transition)).toThrow()
    })
  })
})
