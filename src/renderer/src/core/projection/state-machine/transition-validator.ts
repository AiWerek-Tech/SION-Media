/**
 * Transition Validator
 *
 * Ensures that every requested projection transition is legal before it is applied.
 */

import type { ProjectionTransitionRequest } from './projection-events'
import type { ProjectionStateMachineState } from './projection-state'
import type { SlideAddress } from '@renderer/types'
import {
  canAdvanceSlide,
  canGoToSlide,
  canGoToSection,
  canGoToAddress,
  canTakeCue,
  canToggleState,
  canClearScreen,
  canMarkDirty,
  canUpdateLive,
  canDiscardChanges
} from './guards'

export function validateTransition(
  state: ProjectionStateMachineState,
  request: ProjectionTransitionRequest
): void {
  switch (request.type) {
    case 'projection:take-cue':
      if (!canTakeCue(state)) {
        throw new Error('Cannot take cue when there is no preview slide available')
      }
      return

    case 'projection:go-live':
      if (
        request.payload.slideIndex !== undefined &&
        !canGoToSlide(state, request.payload.slideIndex)
      ) {
        throw new Error('Requested live slide index is invalid')
      }
      return

    case 'projection:next-slide':
    case 'projection:prev-slide':
      if (!canAdvanceSlide(state)) {
        throw new Error('Slide navigation is not permitted in the current projection state')
      }
      return

    case 'projection:go-to-slide':
      if (!canGoToSlide(state, request.payload.slideIndex as number)) {
        throw new Error('Requested slide index is out of range or navigation is locked')
      }
      return

    case 'projection:go-to-section':
      if (!canGoToSection(state, request.payload.section as string)) {
        throw new Error('Requested section is unavailable or navigation is locked')
      }
      return

    case 'projection:go-to-address':
      if (!canGoToAddress(state, request.payload.address as SlideAddress)) {
        throw new Error('Requested address is unavailable or navigation is locked')
      }
      return

    case 'projection:black':
    case 'projection:freeze':
      if (!canToggleState()) {
        throw new Error('Cannot toggle projection state from the current state')
      }
      return

    case 'projection:clear':
      if (!canClearScreen(state)) {
        throw new Error('Cannot clear the projection when it is already clear')
      }
      return

    case 'projection:mark-dirty':
      if (!canMarkDirty(state)) {
        throw new Error('Cannot mark dirty when program is not locked')
      }
      return

    case 'projection:update-live':
      if (!canUpdateLive(state)) {
        throw new Error('Cannot update live unless there are pending live changes')
      }
      return

    case 'projection:discard-changes':
      if (!canDiscardChanges(state)) {
        throw new Error('Cannot discard changes unless pending changes exist')
      }
      return

    default:
      throw new Error('Unhandled projection transition type')
  }
}
