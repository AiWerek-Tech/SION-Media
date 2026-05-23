/**
 * Behavioral Invariants Testing
 *
 * Tests that verify FSM state correctness and prevent state drift.
 * These are the critical behavioral contracts that must always hold.
 */

import { describe, it, expect } from 'vitest'
import { requestTransition } from '@renderer/core/projection/runtime'
import type { ProjectionStateMachineState } from '@renderer/core/projection/projection-events'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestFSMState(
  state: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'STOPPED',
  currentSlideIndex: number = 0
): ProjectionStateMachineState {
  return {
    state,
    context: { currentSlideIndex },
    timestamp: Date.now()
  }
}

// ============================================================================
// BEHAVIORAL INVARIANTS
// ============================================================================

describe('Behavioral Invariants - FSM State Correctness', () => {
  describe('START Transition Invariants', () => {
    it('START from IDLE should result in ACTIVE state', () => {
      const initialState = createTestFSMState('IDLE')
      const result = requestTransition(initialState, { type: 'START' })

      expect(result.newState.state).toBe('ACTIVE')
      expect(result.newState.context.currentSlideIndex).toBe(0)
    })

    it('START from STOPPED should result in ACTIVE state', () => {
      const initialState = createTestFSMState('STOPPED')
      const result = requestTransition(initialState, { type: 'START' })

      expect(result.newState.state).toBe('ACTIVE')
    })

    it('START should preserve current slide index', () => {
      const initialState = createTestFSMState('IDLE', 5)
      const result = requestTransition(initialState, { type: 'START' })

      expect(result.newState.context.currentSlideIndex).toBe(5)
    })
  })

  describe('STOP Transition Invariants', () => {
    it('STOP from ACTIVE should result in STOPPED state', () => {
      const initialState = createTestFSMState('ACTIVE')
      const result = requestTransition(initialState, { type: 'STOP' })

      expect(result.newState.state).toBe('STOPPED')
    })

    it('STOP from PAUSED should result in STOPPED state', () => {
      const initialState = createTestFSMState('PAUSED')
      const result = requestTransition(initialState, { type: 'STOP' })

      expect(result.newState.state).toBe('STOPPED')
    })

    it('STOP should preserve slide index for resume capability', () => {
      const initialState = createTestFSMState('ACTIVE', 10)
      const result = requestTransition(initialState, { type: 'STOP' })

      expect(result.newState.context.currentSlideIndex).toBe(10)
    })
  })

  describe('PAUSE/RESUME Transition Invariants', () => {
    it('PAUSE from ACTIVE should result in PAUSED state', () => {
      const initialState = createTestFSMState('ACTIVE')
      const result = requestTransition(initialState, { type: 'PAUSE' })

      expect(result.newState.state).toBe('PAUSED')
    })

    it('RESUME from PAUSED should result in ACTIVE state', () => {
      const initialState = createTestFSMState('PAUSED')
      const result = requestTransition(initialState, { type: 'RESUME' })

      expect(result.newState.state).toBe('ACTIVE')
    })

    it('PAUSE/RESUME should preserve slide index', () => {
      const initialState = createTestFSMState('ACTIVE', 7)
      const paused = requestTransition(initialState, { type: 'PAUSE' })
      const resumed = requestTransition(paused.newState, { type: 'RESUME' })

      expect(paused.newState.context.currentSlideIndex).toBe(7)
      expect(resumed.newState.context.currentSlideIndex).toBe(7)
    })
  })

  describe('Navigation Transition Invariants', () => {
    it('NEXT_SLIDE should increment slide index when possible', () => {
      const initialState = createTestFSMState('ACTIVE', 0)
      const result = requestTransition(initialState, { type: 'NEXT_SLIDE' })

      expect(result.newState.context.currentSlideIndex).toBe(1)
      expect(result.newState.state).toBe('ACTIVE') // State unchanged
    })

    it('PREV_SLIDE should decrement slide index when possible', () => {
      const initialState = createTestFSMState('ACTIVE', 5)
      const result = requestTransition(initialState, { type: 'PREV_SLIDE' })

      expect(result.newState.context.currentSlideIndex).toBe(4)
      expect(result.newState.state).toBe('ACTIVE')
    })

    it('PREV_SLIDE at index 0 should stay at 0', () => {
      const initialState = createTestFSMState('ACTIVE', 0)
      const result = requestTransition(initialState, { type: 'PREV_SLIDE' })

      expect(result.newState.context.currentSlideIndex).toBe(0)
    })
  })

  describe('Invalid Transition Prevention', () => {
    it('should reject invalid transitions', () => {
      const initialState = createTestFSMState('IDLE')

      // These should throw or return error state
      expect(() => requestTransition(initialState, { type: 'PAUSE' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'RESUME' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'NEXT_SLIDE' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'PREV_SLIDE' })).toThrow()
    })

    it('should reject transitions from STOPPED except START', () => {
      const initialState = createTestFSMState('STOPPED')

      expect(() => requestTransition(initialState, { type: 'PAUSE' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'RESUME' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'NEXT_SLIDE' })).toThrow()
      expect(() => requestTransition(initialState, { type: 'PREV_SLIDE' })).toThrow()

      // START should work
      const result = requestTransition(initialState, { type: 'START' })
      expect(result.newState.state).toBe('ACTIVE')
    })
  })

  describe('State Drift Prevention', () => {
    it('should maintain consistent state transitions', () => {
      // Test full lifecycle: IDLE → ACTIVE → PAUSED → ACTIVE → STOPPED
      let state = createTestFSMState('IDLE')

      state = requestTransition(state, { type: 'START' }).newState
      expect(state.state).toBe('ACTIVE')

      state = requestTransition(state, { type: 'PAUSE' }).newState
      expect(state.state).toBe('PAUSED')

      state = requestTransition(state, { type: 'RESUME' }).newState
      expect(state.state).toBe('ACTIVE')

      state = requestTransition(state, { type: 'STOP' }).newState
      expect(state.state).toBe('STOPPED')
    })

    it('should prevent impossible state sequences', () => {
      // Cannot go IDLE → PAUSED
      expect(() => requestTransition(createTestFSMState('IDLE'), { type: 'PAUSE' })).toThrow()

      // Cannot go STOPPED → RESUME
      expect(() => requestTransition(createTestFSMState('STOPPED'), { type: 'RESUME' })).toThrow()

      // Cannot go PAUSED → START
      expect(() => requestTransition(createTestFSMState('PAUSED'), { type: 'START' })).toThrow()
    })
  })

  describe('Context Preservation Invariants', () => {
    it('should preserve slide index through valid state changes', () => {
      const initialIndex = 15
      let state = createTestFSMState('IDLE', initialIndex)

      // START preserves index
      state = requestTransition(state, { type: 'START' }).newState
      expect(state.context.currentSlideIndex).toBe(initialIndex)

      // PAUSE preserves index
      state = requestTransition(state, { type: 'PAUSE' }).newState
      expect(state.context.currentSlideIndex).toBe(initialIndex)

      // RESUME preserves index
      state = requestTransition(state, { type: 'RESUME' }).newState
      expect(state.context.currentSlideIndex).toBe(initialIndex)

      // STOP preserves index
      state = requestTransition(state, { type: 'STOP' }).newState
      expect(state.context.currentSlideIndex).toBe(initialIndex)
    })

    it('should update slide index only on navigation', () => {
      let state = createTestFSMState('ACTIVE', 10)

      // State changes don't affect index
      state = requestTransition(state, { type: 'PAUSE' }).newState
      expect(state.context.currentSlideIndex).toBe(10)

      // Only navigation changes index
      state = requestTransition(state, { type: 'NEXT_SLIDE' }).newState
      expect(state.context.currentSlideIndex).toBe(11)

      state = requestTransition(state, { type: 'PREV_SLIDE' }).newState
      expect(state.context.currentSlideIndex).toBe(10)
    })
  })
})
