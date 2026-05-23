/**
 * Projection Session Aggregate Tests
 *
 * Tests for the comprehensive session state model.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialProjectionSession,
  updateSessionFSMState,
  updateSessionMediaState,
  updateSessionOperatorContext,
  updateSessionOutputConfig,
  updateSessionSyncState,
  validateSessionState,
  serializeSession,
  deserializeSession,
  mapUIStateToFSMState,
  type ProjectionSession
} from './projection-session'
import type { SlideData } from '@renderer/types'

// ============================================================================
// SESSION CREATION TESTS
// ============================================================================

describe('ProjectionSession Creation', () => {
  it('should create initial session with correct structure', () => {
    const session = createInitialProjectionSession('test-session-123')

    expect(session.sessionId).toBe('test-session-123')
    expect(session.createdAt).toBeGreaterThan(0)
    expect(session.updatedAt).toBe(session.createdAt)

    // FSM state
    expect(session.fsmState.state).toBe('IDLE')
    expect(session.fsmState.context.currentSlideIndex).toBe(0)

    // Media state
    expect(session.mediaState.slides).toEqual([])
    expect(session.mediaState.currentSlideIndex).toBe(0)

    // Operator context
    expect(session.operatorContext.programLockState).toBe('UNLOCKED')
    expect(session.operatorContext.pendingChanges).toEqual([])

    // Output config
    expect(session.outputConfig.uiState).toBe('CLEAR')
    expect(session.outputConfig.fadeSpeed).toBe(0.4)

    // Sync state
    expect(session.syncState.syncStatus).toBe('SYNCED')
    expect(session.syncState.syncVersion).toBe(1)
  })

  it('should generate unique session ID when not provided', () => {
    const session1 = createInitialProjectionSession()
    const session2 = createInitialProjectionSession()

    expect(session1.sessionId).not.toBe(session2.sessionId)
    expect(session1.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/)
  })
})

// ============================================================================
// SESSION UPDATE TESTS
// ============================================================================

describe('ProjectionSession Updates', () => {
  let session: ProjectionSession

  beforeEach(() => {
    session = createInitialProjectionSession('test-session')
  })

  it('should update FSM state and sync UI state', () => {
    const newFSMState = {
      state: 'ACTIVE' as const,
      context: { currentSlideIndex: 5 },
      timestamp: Date.now()
    }

    const updated = updateSessionFSMState(session, newFSMState)

    expect(updated.fsmState).toEqual(newFSMState)
    expect(updated.outputConfig.uiState).toBe('LIVE') // FSM ACTIVE -> UI LIVE
    expect(updated.updatedAt).toBeGreaterThan(session.updatedAt)
  })

  it('should update media state', () => {
    const mediaUpdates = {
      slides: [{ text: 'Test slide' }] as unknown as SlideData[],
      currentSlideIndex: 1
    }

    const updated = updateSessionMediaState(session, mediaUpdates)

    expect(updated.mediaState.slides).toEqual(mediaUpdates.slides)
    expect(updated.mediaState.currentSlideIndex).toBe(1)
    expect(updated.updatedAt).toBeGreaterThan(session.updatedAt)
  })

  it('should update operator context', () => {
    const contextUpdates = {
      programLockState: 'LOCKED' as const,
      hasPendingLiveChanges: true,
      timerRunning: true
    }

    const updated = updateSessionOperatorContext(session, contextUpdates)

    expect(updated.operatorContext.programLockState).toBe('LOCKED')
    expect(updated.operatorContext.hasPendingLiveChanges).toBe(true)
    expect(updated.operatorContext.timerRunning).toBe(true)
    expect(updated.updatedAt).toBeGreaterThan(session.updatedAt)
  })

  it('should update output configuration', () => {
    const configUpdates = {
      fadeSpeed: 0.8,
      outputMode: 'DUAL' as const,
      activeMedia: 'VIDEO' as const
    }

    const updated = updateSessionOutputConfig(session, configUpdates)

    expect(updated.outputConfig.fadeSpeed).toBe(0.8)
    expect(updated.outputConfig.outputMode).toBe('DUAL')
    expect(updated.outputConfig.activeMedia).toBe('VIDEO')
    expect(updated.updatedAt).toBeGreaterThan(session.updatedAt)
  })

  it('should update sync state', () => {
    const syncUpdates = {
      syncStatus: 'PENDING' as const,
      syncVersion: 5
    }

    const updated = updateSessionSyncState(session, syncUpdates)

    expect(updated.syncState.syncStatus).toBe('PENDING')
    expect(updated.syncState.syncVersion).toBe(5)
    expect(updated.syncState.lastSyncTimestamp).toBeGreaterThan(session.syncState.lastSyncTimestamp)
    expect(updated.updatedAt).toBeGreaterThan(session.updatedAt)
  })
})

// ============================================================================
// STATE MAPPING TESTS
// ============================================================================

describe('State Mappings', () => {
  it('should map UI states to FSM states correctly', () => {
    expect(mapUIStateToFSMState('CLEAR')).toBe('STOPPED')
    expect(mapUIStateToFSMState('LIVE')).toBe('ACTIVE')
    expect(mapUIStateToFSMState('FREEZE')).toBe('PAUSED')
    expect(mapUIStateToFSMState('BLACK')).toBe('PAUSED')
    expect(mapUIStateToFSMState('LOGO')).toBe('PAUSED')
  })
})

// ============================================================================
// SESSION VALIDATION TESTS
// ============================================================================

describe('Session Validation', () => {
  it('should validate correct session', () => {
    const session = createInitialProjectionSession()
    const validation = validateSessionState(session)

    expect(validation.isValid).toBe(true)
    expect(validation.errors).toEqual([])
  })

  it('should detect invalid FSM state', () => {
    const session = createInitialProjectionSession()
    const invalidSession = {
      ...(session as unknown as ProjectionSession),
      fsmState: {
        ...session.fsmState,
        state: undefined as unknown as ProjectionSession['fsmState']['state']
      }
    }

    const validation = validateSessionState(invalidSession)

    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContain('FSM state is missing')
  })

  it('should detect invalid slide index', () => {
    const session = createInitialProjectionSession()
    const invalidSession = {
      ...session,
      mediaState: {
        ...session.mediaState,
        slides: [{ text: 'slide 1' }] as unknown as SlideData[],
        currentSlideIndex: 5 // Index beyond array length
      }
    }

    const validation = validateSessionState(invalidSession)

    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContain('Current slide index exceeds slides array length')
  })

  it('should detect invalid program lock state', () => {
    const session = createInitialProjectionSession()
    const invalidSession = {
      ...session,
      operatorContext: {
        ...session.operatorContext,
        programLockState:
          'INVALID' as unknown as ProjectionSession['operatorContext']['programLockState']
      }
    }

    const validation = validateSessionState(invalidSession)

    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContain('Invalid program lock state')
  })

  it('should detect invalid output mode', () => {
    const session = createInitialProjectionSession()
    const invalidSession = {
      ...session,
      outputConfig: {
        ...session.outputConfig,
        outputMode: 'INVALID' as unknown as ProjectionSession['outputConfig']['outputMode']
      }
    }

    const validation = validateSessionState(invalidSession)

    expect(validation.isValid).toBe(false)
    expect(validation.errors).toContain('Invalid output mode')
  })
})

// ============================================================================
// SESSION SERIALIZATION TESTS
// ============================================================================

describe('Session Serialization', () => {
  it('should serialize and deserialize session correctly', () => {
    const original = createInitialProjectionSession('test-session')

    // Add some data to make it more realistic
    const modified = updateSessionMediaState(original, {
      slides: [{ text: 'Test slide' }] as unknown as SlideData[],
      currentSlideIndex: 0
    })

    const serialized = serializeSession(modified)
    const deserialized = deserializeSession(serialized)

    expect(deserialized.sessionId).toBe(modified.sessionId)
    expect(deserialized.fsmState.state).toBe(modified.fsmState.state)
    expect(deserialized.mediaState.slides).toEqual(modified.mediaState.slides)
    expect(deserialized.mediaState.currentSlideIndex).toBe(modified.mediaState.currentSlideIndex)
  })

  it('should throw on invalid JSON structure', () => {
    expect(() => deserializeSession('{"invalid": "structure"}')).toThrow(
      'Invalid session data structure'
    )
  })

  it('should handle malformed JSON', () => {
    expect(() => deserializeSession('not json')).toThrow()
  })
})
