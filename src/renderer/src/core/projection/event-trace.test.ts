/**
 * Event Trace System Tests
 *
 * Tests the observability layer for FSM transitions and debugging.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  eventLogger,
  logCommand,
  logTransition,
  logEffect,
  logError,
  queryTraces,
  getTraceStats
} from './event-trace'

describe('EventTrace System', () => {
  beforeEach(() => {
    eventLogger.clear()
  })

  describe('Trace Logging', () => {
    it('should log commands with correlation ID', () => {
      const traceId = logCommand('TEST_COMMAND', { param: 'value' }, 'UI')

      const traces = queryTraces()
      expect(traces).toHaveLength(1)
      expect(traces[0].id).toBe(traceId)
      expect(traces[0].type).toBe('COMMAND')
      expect(traces[0].source).toBe('UI')
      expect(traces[0].command).toEqual({
        type: 'TEST_COMMAND',
        payload: { param: 'value' }
      })
    })

    it('should log transitions with timing', () => {
      logTransition('IDLE', 'ACTIVE', 'START', { slideIndex: 1 }, 15.5)

      const traces = queryTraces()
      expect(traces).toHaveLength(1)
      expect(traces[0].type).toBe('TRANSITION')
      expect(traces[0].source).toBe('FSM')
      expect(traces[0].transition).toEqual({
        fromState: 'IDLE',
        toState: 'ACTIVE',
        event: 'START',
        payload: { slideIndex: 1 }
      })
      expect(traces[0].duration).toBe(15.5)
    })

    it('should log effects', () => {
      logEffect('SLIDE_CHANGED', { fromIndex: 0, toIndex: 1 })

      const traces = queryTraces()
      expect(traces).toHaveLength(1)
      expect(traces[0].type).toBe('EFFECT')
      expect(traces[0].source).toBe('FSM')
      expect(traces[0].metadata).toEqual({
        effectType: 'SLIDE_CHANGED',
        payload: { fromIndex: 0, toIndex: 1 }
      })
    })

    it('should log errors with context', () => {
      const error = new Error('Test error')
      logError(error, { component: 'FSM', operation: 'transition' })

      const traces = queryTraces()
      expect(traces).toHaveLength(1)
      expect(traces[0].type).toBe('ERROR')
      expect(traces[0].source).toBe('SYSTEM')
      expect(traces[0].error?.message).toBe('Test error')
      expect(traces[0].metadata).toEqual({
        component: 'FSM',
        operation: 'transition'
      })
    })
  })

  describe('Trace Querying', () => {
    beforeEach(() => {
      logCommand('CMD1', undefined, 'UI')
      logTransition('IDLE', 'ACTIVE', 'START')
      logEffect('EFFECT1')
      logError('Error message')
      logCommand('CMD2', undefined, 'FSM')
    })

    it('should query all traces', () => {
      const traces = queryTraces()
      expect(traces).toHaveLength(5)
    })

    it('should filter by type', () => {
      const commands = queryTraces({ type: 'COMMAND' })
      expect(commands).toHaveLength(2)

      const transitions = queryTraces({ type: 'TRANSITION' })
      expect(transitions).toHaveLength(1)

      const errors = queryTraces({ type: 'ERROR' })
      expect(errors).toHaveLength(1)
    })

    it('should filter by source', () => {
      const uiTraces = queryTraces({ source: 'UI' })
      expect(uiTraces).toHaveLength(1)

      const fsmTraces = queryTraces({ source: 'FSM' })
      expect(fsmTraces).toHaveLength(3) // transition + effect + command
    })

    it('should limit results', () => {
      const limited = queryTraces({ limit: 2 })
      expect(limited).toHaveLength(2)
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      // Add some traces with timing
      logTransition('IDLE', 'ACTIVE', 'START', undefined, 10)
      logTransition('ACTIVE', 'PAUSED', 'PAUSE', undefined, 20)
      logCommand('TEST_CMD')
      logError('Test error')
    })

    it('should calculate statistics correctly', () => {
      const stats = getTraceStats()

      expect(stats.totalTraces).toBe(4)
      expect(stats.errorCount).toBe(1)
      expect(stats.averageDuration).toBe(15) // (10 + 20) / 2
      expect(stats.tracesByType.COMMAND).toBe(1)
      expect(stats.tracesByType.TRANSITION).toBe(2)
      expect(stats.tracesByType.ERROR).toBe(1)
    })
  })

  describe('Storage Management', () => {
    it('should maintain circular buffer', () => {
      eventLogger.setMaxTraces(3)

      logCommand('CMD1')
      logCommand('CMD2')
      logCommand('CMD3')
      logCommand('CMD4') // Should evict CMD1

      const traces = queryTraces()
      expect(traces).toHaveLength(3)
      const commandTypes = traces.map((t) => t.command?.type).sort()
      expect(commandTypes).toEqual(['CMD2', 'CMD3', 'CMD4'])
    })

    it('should clear all traces', () => {
      logCommand('TEST')
      expect(queryTraces()).toHaveLength(1)

      eventLogger.clear()
      expect(queryTraces()).toHaveLength(0)
    })

    it('should export and import traces', () => {
      logCommand('TEST_CMD', { data: 'value' })
      const exported = eventLogger.export()

      eventLogger.clear()
      expect(queryTraces()).toHaveLength(0)

      eventLogger.import(exported)
      const imported = queryTraces()
      expect(imported).toHaveLength(1)
      expect(imported[0].command?.type).toBe('TEST_CMD')
    })
  })
})
