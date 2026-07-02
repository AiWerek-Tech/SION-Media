/**
 * Deterministic Transition Logging
 *
 * Append-only immutable record of all projection state transitions.
 * Designed for: replay, audit, deterministic verification, time-travel debugging.
 *
 * Invariant: Snapshots are canonical; transitions are immutable history.
 *
 * @module history/transition-log
 */

import type {
  ProjectionTransitionType,
  ProjectionTransitionRequest
} from '../state-machine/projection-events'

/**
 * Immutable record of a single projection transition
 *
 * Designed for:
 * - Deterministic replay from recorded history
 * - Audit trail of all projection state changes
 * - Event sourcing foundation
 * - Time-travel debugging
 *
 * NO runtime side effects; purely historical record
 */
export interface ProjectionTransitionRecord {
  readonly sequenceNumber: number
  readonly timestamp: number
  readonly transitionType: ProjectionTransitionType
  readonly previousSnapshotId: string
  readonly nextSnapshotId: string
  readonly payloadDigest: string
  readonly requestSummary: string
}

/**
 * Immutable append-only projection transition log
 *
 * Thread-safe for recording during transitions.
 * Thread-safe for reading for replay/audit.
 */
export class ProjectionTransitionLog {
  private readonly records: readonly ProjectionTransitionRecord[]

  constructor(records: readonly ProjectionTransitionRecord[] = []) {
    this.records = Object.freeze([...records])
  }

  /**
   * Record a new transition (returns new immutable log)
   */
  append(record: Omit<ProjectionTransitionRecord, 'sequenceNumber'>): ProjectionTransitionLog {
    const newRecord: ProjectionTransitionRecord = {
      ...record,
      sequenceNumber: this.records.length
    }
    return new ProjectionTransitionLog([...this.records, newRecord])
  }

  /**
   * Get all recorded transitions (immutable view)
   */
  getAll(): readonly ProjectionTransitionRecord[] {
    return this.records
  }

  /**
   * Get transitions after sequence number (inclusive)
   */
  getFrom(sequenceNumber: number): readonly ProjectionTransitionRecord[] {
    return this.records.slice(sequenceNumber)
  }

  /**
   * Get most recent transition
   */
  getLatest(): ProjectionTransitionRecord | undefined {
    return this.records[this.records.length - 1]
  }

  /**
   * Number of recorded transitions
   */
  length(): number {
    return this.records.length
  }

  /**
   * Export as JSON for storage/transmission
   */
  toJSON(): readonly ProjectionTransitionRecord[] {
    return [...this.records]
  }

  /**
   * Import from JSON
   */
  static fromJSON(records: readonly ProjectionTransitionRecord[]): ProjectionTransitionLog {
    return new ProjectionTransitionLog(records)
  }
}

/**
 * Create a digest of transition request for comparison/verification
 *
 * Used to: verify deterministic replay, detect corrupted records
 * Pure function suitable for state machine layer
 *
 * @param request - The transition request
 * @returns Stable digest of request payload
 */
export function createRequestDigest(request: ProjectionTransitionRequest): string {
  const summary = {
    type: request.type,
    payloadKeys: Object.keys(request.payload).sort()
  }
  return Buffer.from(JSON.stringify(summary)).toString('base64')
}

/**
 * Summarize a transition request for logging
 *
 * @param request - The transition request
 * @returns Human-readable summary
 */
export function summarizeRequest(request: ProjectionTransitionRequest): string {
  switch (request.type) {
    case 'projection:take-cue':
      return 'take-cue'
    case 'projection:go-live':
      return `go-live${request.payload.slideIndex !== undefined ? ` [${request.payload.slideIndex}]` : ''}`
    case 'projection:next-slide':
      return 'next-slide'
    case 'projection:prev-slide':
      return 'prev-slide'
    case 'projection:go-to-slide':
      return `go-to-slide [${request.payload.slideIndex}]`
    case 'projection:go-to-section':
      return `go-to-section [${request.payload.section}]`
    case 'projection:go-to-address':
      return `go-to-address [${JSON.stringify(request.payload.address)}]`
    case 'projection:black':
      return 'black'
    case 'projection:freeze':
      return 'freeze'
    case 'projection:clear':
      return 'clear'
    default:
      return 'unknown'
  }
}

/**
 * Create a transition record from result metadata
 *
 * Called by transition runner post-computation
 * Captures immutable historical record
 *
 * @param timestamp - When transition occurred
 * @param transitionType - Type of transition
 * @param previousSnapshotId - Id of previous state
 * @param nextSnapshotId - Id of next state
 * @param request - Original transition request
 * @returns Record ready to append to log
 */
export function createTransitionRecord(
  timestamp: number,
  transitionType: ProjectionTransitionType,
  previousSnapshotId: string,
  nextSnapshotId: string,
  request: ProjectionTransitionRequest
): Omit<ProjectionTransitionRecord, 'sequenceNumber'> {
  return {
    timestamp,
    transitionType,
    previousSnapshotId,
    nextSnapshotId,
    payloadDigest: createRequestDigest(request),
    requestSummary: summarizeRequest(request)
  }
}

/**
 * Validate transition log integrity
 *
 * Checks: sequence continuity, snapshot ID chains, valid types
 * Returns: { valid: boolean, errors: string[] }
 *
 * @param records - Records to validate
 * @returns Validation result with any detected errors
 */
export function validateTransitionLog(records: readonly ProjectionTransitionRecord[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (let i = 0; i < records.length; i++) {
    const record = records[i]

    // Check sequence continuity
    if (record.sequenceNumber !== i) {
      errors.push(
        `Record ${i}: sequenceNumber mismatch (expected ${i}, got ${record.sequenceNumber})`
      )
    }

    // Check snapshot IDs are present
    if (!record.previousSnapshotId || record.previousSnapshotId.length === 0) {
      errors.push(`Record ${i}: missing previousSnapshotId`)
    }
    if (!record.nextSnapshotId || record.nextSnapshotId.length === 0) {
      errors.push(`Record ${i}: missing nextSnapshotId`)
    }

    // Check transition type is valid
    const validTypes = [
      'projection:take-cue',
      'projection:go-live',
      'projection:next-slide',
      'projection:prev-slide',
      'projection:black',
      'projection:freeze',
      'projection:clear',
      'projection:go-to-slide',
      'projection:go-to-section',
      'projection:go-to-address'
    ]
    if (!validTypes.includes(record.transitionType)) {
      errors.push(`Record ${i}: invalid transitionType: ${record.transitionType}`)
    }

    // Check chain continuity with next record
    if (i < records.length - 1) {
      const nextRecord = records[i + 1]
      if (record.nextSnapshotId !== nextRecord.previousSnapshotId) {
        errors.push(
          `Record ${i}: snapshot chain broken (nextSnapshotId ${record.nextSnapshotId} != next.previousSnapshotId ${nextRecord.previousSnapshotId})`
        )
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
