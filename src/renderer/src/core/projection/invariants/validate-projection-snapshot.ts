/**
 * Projection Snapshot Invariants
 *
 * Validates projection state machine invariants and consistency rules.
 * Ensures: snapshot integrity, transition legality, runtime safety.
 *
 * @module invariants/validate-projection-snapshot
 */

import type { ProjectionStateMachineState } from '../state-machine/projection-state'
import type { ProjectionTransitionResult } from '../state-machine/projection-events'

/**
 * Validate projection snapshot structural integrity
 *
 * Checks: required fields, type safety, bounds, consistency
 * Returns: { valid: boolean, errors: string[] }
 *
 * @param snapshot - Snapshot to validate
 * @returns Validation result with detailed errors
 */
export function validateProjectionSnapshot(snapshot: ProjectionStateMachineState): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Required fields
  if (!snapshot.projectionState) {
    errors.push('Missing projectionState')
  }
  if (!Array.isArray(snapshot.slides)) {
    errors.push('slides must be array')
  }
  if (!Array.isArray(snapshot.programSlides)) {
    errors.push('programSlides must be array')
  }
  if (typeof snapshot.currentSlideIndex !== 'number') {
    errors.push('currentSlideIndex must be number')
  }
  if (typeof snapshot.programSlideIndex !== 'number') {
    errors.push('programSlideIndex must be number')
  }
  if (!snapshot.sectionMap || typeof snapshot.sectionMap !== 'object') {
    errors.push('sectionMap must be object')
  }

  // Bounds checking
  if (snapshot.currentSlideIndex < 0) {
    errors.push('currentSlideIndex cannot be negative')
  }
  if (snapshot.programSlideIndex < -1) {
    errors.push('programSlideIndex cannot be less than -1')
  }
  if (snapshot.currentSlideIndex >= snapshot.slides.length) {
    errors.push('currentSlideIndex out of slides bounds')
  }
  if (
    snapshot.programSlideIndex >= snapshot.programSlides.length &&
    snapshot.programSlideIndex !== -1
  ) {
    errors.push('programSlideIndex out of programSlides bounds')
  }

  // State consistency
  const validStates = ['CLEAR', 'LIVE', 'BLACK', 'FREEZE']
  if (!validStates.includes(snapshot.projectionState)) {
    errors.push(`Invalid projectionState: ${snapshot.projectionState}`)
  }

  const validLockStates = ['UNLOCKED', 'LIVE_LOCK', 'LIVE_DIRTY']
  if (!validLockStates.includes(snapshot.programLockState)) {
    errors.push(`Invalid programLockState: ${snapshot.programLockState}`)
  }

  // Lock state consistency
  if (snapshot.programLockState === 'LIVE_DIRTY' && !snapshot.hasPendingLiveChanges) {
    errors.push('LIVE_DIRTY state requires hasPendingLiveChanges=true')
  }
  if (snapshot.programLockState === 'LIVE_DIRTY' && snapshot.pendingChanges.length === 0) {
    errors.push('LIVE_DIRTY state requires non-empty pendingChanges')
  }
  if (snapshot.programLockState !== 'LIVE_DIRTY' && snapshot.hasPendingLiveChanges) {
    errors.push('hasPendingLiveChanges=true only allowed in LIVE_DIRTY state')
  }

  // Slide data consistency
  if (snapshot.programSlideIndex >= 0 && !snapshot.programSlide) {
    errors.push('programSlide must exist when programSlideIndex >= 0')
  }
  if (snapshot.programSlide && snapshot.programSlideIndex < 0) {
    errors.push('programSlideIndex must be >= 0 when programSlide exists')
  }

  // Section map consistency
  for (const [section, indices] of Object.entries(snapshot.sectionMap)) {
    if (!Array.isArray(indices)) {
      errors.push(`sectionMap[${section}] must be array`)
      continue
    }
    for (const index of indices) {
      if (typeof index !== 'number' || index < 0 || index >= snapshot.programSlides.length) {
        errors.push(`sectionMap[${section}] contains invalid index: ${index}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate transition result integrity
 *
 * Checks: snapshot evolution, effect consistency, metadata validity
 * Returns: { valid: boolean, errors: string[] }
 *
 * @param result - Transition result to validate
 * @returns Validation result with detailed errors
 */
export function validateTransitionResult(result: ProjectionTransitionResult): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Basic structure
  if (!result.transitionType) {
    errors.push('Missing transitionType')
  }
  if (!result.previousSnapshotId) {
    errors.push('Missing previousSnapshotId')
  }
  if (!result.nextSnapshotId) {
    errors.push('Missing nextSnapshotId')
  }
  if (!result.previousState) {
    errors.push('Missing previousState')
  }
  if (!result.nextState) {
    errors.push('Missing nextState')
  }
  if (!Array.isArray(result.effects)) {
    errors.push('effects must be array')
  }

  // Snapshot validation
  const prevValidation = validateProjectionSnapshot(result.previousState)
  if (!prevValidation.valid) {
    errors.push(...prevValidation.errors.map((err) => `Previous state: ${err}`))
  }

  const nextValidation = validateProjectionSnapshot(result.nextState)
  if (!nextValidation.valid) {
    errors.push(...nextValidation.errors.map((err) => `Next state: ${err}`))
  }

  // Snapshot ID consistency
  const expectedPrevId = result.previousSnapshotId
  const expectedNextId = result.nextSnapshotId
  if (expectedPrevId === expectedNextId) {
    errors.push('previousSnapshotId and nextSnapshotId cannot be identical')
  }

  // Effect consistency
  for (let i = 0; i < result.effects.length; i++) {
    const effect = result.effects[i]
    if (!effect.type) {
      errors.push(`Effect ${i}: missing type`)
    }
    // ProjectionClearEffect has no payload — only check payload for effects that have it
    if (effect.type !== 'projection:clear' && !('payload' in effect)) {
      errors.push(`Effect ${i}: missing payload`)
    }
  }

  // Transition-specific validations
  switch (result.transitionType) {
    case 'projection:take-cue':
      if (result.nextState.projectionState !== 'LIVE') {
        errors.push('take-cue must result in LIVE state')
      }
      if (result.nextState.programLockState !== 'LIVE_LOCK') {
        errors.push('take-cue must result in LIVE_LOCK state')
      }
      break

    case 'projection:go-live':
      if (result.nextState.projectionState !== 'LIVE') {
        errors.push('go-live must result in LIVE state')
      }
      break

    case 'projection:clear':
      if (result.nextState.projectionState !== 'CLEAR') {
        errors.push('clear must result in CLEAR state')
      }
      if (result.nextState.programLockState !== 'UNLOCKED') {
        errors.push('clear must result in UNLOCKED state')
      }
      break

    case 'projection:black':
      if (result.nextState.projectionState !== 'BLACK') {
        errors.push('black must result in BLACK state')
      }
      break

    case 'projection:freeze':
      if (
        result.nextState.projectionState !== 'FREEZE' &&
        result.previousState.projectionState !== 'FREEZE'
      ) {
        errors.push('freeze must toggle between FREEZE and previous state')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate state machine invariants across transition
 *
 * Checks: state evolution legality, invariant preservation
 * Returns: { valid: boolean, errors: string[] }
 *
 * @param previousState - State before transition
 * @param nextState - State after transition
 * @param transitionType - Type of transition performed
 * @returns Validation result with invariant violations
 */
export function validateStateEvolution(
  previousState: ProjectionStateMachineState,
  nextState: ProjectionStateMachineState,
  transitionType: string
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Immutability check (shallow)
  if (previousState === nextState) {
    errors.push('State objects must be different instances (immutability)')
  }

  // Slide data should not be mutated
  if (previousState.slides !== nextState.slides) {
    errors.push('slides array should not change across transitions')
  }
  if (previousState.programSlides !== nextState.programSlides) {
    errors.push('programSlides array should not change across transitions')
  }

  // Section map should not be mutated
  if (previousState.sectionMap !== nextState.sectionMap) {
    errors.push('sectionMap should not change across transitions')
  }

  // Transition-specific evolution rules
  switch (transitionType) {
    case 'projection:take-cue':
      if (nextState.programSlides !== previousState.slides) {
        errors.push('take-cue should set programSlides to slides')
      }
      if (nextState.programSlideIndex !== previousState.currentSlideIndex) {
        errors.push('take-cue should set programSlideIndex to currentSlideIndex')
      }
      break

    case 'projection:go-to-slide':
      if (nextState.programSlides !== previousState.slides) {
        errors.push('go-to-slide should set programSlides to slides')
      }
      break

    case 'projection:clear':
      if (nextState.programSlide !== null) {
        errors.push('clear should set programSlide to null')
      }
      if (nextState.programSlideIndex !== -1) {
        errors.push('clear should set programSlideIndex to -1')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
