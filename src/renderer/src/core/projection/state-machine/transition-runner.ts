/**
 * Transition Runner
 *
 * Computes the next projection state and effect requests from a valid transition.
 * This module is intentionally pure and side-effect free.
 */

import type {
  ProjectionTransitionRequest,
  ProjectionTransitionResult,
  ProjectionStateEvent
} from './projection-events'
import type { ProjectionStateMachineState } from './projection-state'
import type { ProjectionEffect } from './effects'
import {
  createProgramSlideUpdateEffect,
  createProjectionClearEffect,
  createProjectionGoLiveEffect,
  createProjectionStateChangeEffect
} from './effects'
import { createProjectionSnapshotId } from './projection-snapshot'
import {
  reduceTakeCue,
  reduceGoLive,
  reduceNextSlide,
  reducePrevSlide,
  reduceGoToSlide,
  reduceGoToSection,
  reduceGoToAddress,
  reduceMarkDirty,
  reduceUpdateLive,
  reduceDiscardChanges,
  reduceBlack,
  reduceFreeze,
  reduceClear
} from './reducers'

function buildSlideUpdateEvent(
  previousState: ProjectionStateMachineState,
  nextState: ProjectionStateMachineState
): ProjectionStateEvent {
  return {
    type: 'projection:state-changed',
    payload: {
      previousState: previousState.projectionState,
      nextState: nextState.projectionState,
      slideIndex: nextState.programSlideIndex >= 0 ? nextState.programSlideIndex : null
    }
  }
}

function buildTransitionEffects(
  previousState: ProjectionStateMachineState,
  nextState: ProjectionStateMachineState,
  request: ProjectionTransitionRequest
): ProjectionEffect[] {
  const effects: ProjectionEffect[] = []

  if (previousState.projectionState !== nextState.projectionState) {
    effects.push(
      createProjectionStateChangeEffect(previousState.projectionState, nextState.projectionState)
    )
  }

  const shouldUpdateSlide = nextState.projectionState === 'LIVE' && nextState.programSlide !== null
  if (shouldUpdateSlide) {
    effects.push(
      createProgramSlideUpdateEffect(nextState.programSlide, nextState.programSlideIndex)
    )
  }

  if (nextState.projectionState === 'CLEAR') {
    effects.push(createProjectionClearEffect())
  }

  if (
    (request.type === 'projection:go-live' && request.payload.slideIndex !== undefined) ||
    request.type === 'projection:go-to-slide'
  ) {
    effects.push(
      createProjectionGoLiveEffect(
        request.type === 'projection:go-live'
          ? (request.payload.slideIndex as number)
          : request.payload.slideIndex,
        nextState.programSongBackgroundConfig,
        nextState.currentSlideIndex
      )
    )
  }

  if (request.type === 'projection:take-cue') {
    effects.push(
      createProjectionGoLiveEffect(
        nextState.programSlideIndex,
        nextState.programSongBackgroundConfig,
        nextState.currentSlideIndex
      )
    )
  }

  return effects
}

export function runTransition(
  previousState: ProjectionStateMachineState,
  request: ProjectionTransitionRequest
): ProjectionTransitionResult {
  let nextState: ProjectionStateMachineState = previousState

  switch (request.type) {
    case 'projection:take-cue': {
      nextState = reduceTakeCue(previousState)
      break
    }

    case 'projection:go-live': {
      nextState = reduceGoLive(previousState, request)
      break
    }

    case 'projection:next-slide': {
      nextState = reduceNextSlide(previousState)
      break
    }

    case 'projection:prev-slide': {
      nextState = reducePrevSlide(previousState)
      break
    }

    case 'projection:go-to-slide': {
      nextState = reduceGoToSlide(previousState, request)
      break
    }

    case 'projection:go-to-section': {
      nextState = reduceGoToSection(previousState, request)
      break
    }

    case 'projection:go-to-address': {
      nextState = reduceGoToAddress(previousState, request)
      break
    }

    case 'projection:mark-dirty': {
      nextState = reduceMarkDirty(previousState, request)
      break
    }

    case 'projection:update-live': {
      nextState = reduceUpdateLive(previousState)
      break
    }

    case 'projection:discard-changes': {
      nextState = reduceDiscardChanges(previousState)
      break
    }

    case 'projection:black': {
      nextState = reduceBlack(previousState)
      break
    }

    case 'projection:freeze': {
      nextState = reduceFreeze(previousState)
      break
    }

    case 'projection:clear': {
      nextState = reduceClear(previousState)
      break
    }

    default:
      throw new Error('Unhandled projection transition type')
  }

  const effects: ProjectionEffect[] = buildTransitionEffects(previousState, nextState, request)

  const emittedEvents = [buildSlideUpdateEvent(previousState, nextState)]
  const previousSnapshotId = createProjectionSnapshotId(previousState)
  const nextSnapshotId = createProjectionSnapshotId(nextState)

  return {
    transitionType: request.type,
    previousSnapshotId,
    previousState,
    nextSnapshotId,
    nextState,
    effects,
    emittedEvents
  }
}
