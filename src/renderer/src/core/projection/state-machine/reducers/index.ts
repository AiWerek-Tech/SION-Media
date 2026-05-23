/**
 * Projection Reducers
 *
 * Pure state transformers for the projection state machine.
 * These functions do not mutate external systems or stores.
 */

import type { PendingChange, SlideData, SlideAddress } from '@renderer/types'
import type { ProjectionStateMachineState } from '../projection-state'
import type { ProjectionSnapshot } from '../projection-snapshot'
import type { ProjectionTransitionRequest } from '../projection-events'
import { resolveSlideAddress } from '../../slideAddressResolver'

function selectSlide(slides: SlideData[], index: number): SlideData | null {
  return slides[index] ?? null
}

function withNextSlide(slides: SlideData[], index: number): SlideData | null {
  return slides[index]
    ? {
        ...slides[index],
        nextSlideText: slides[index + 1]?.text || ''
      }
    : null
}

export function reduceTakeCue(state: ProjectionStateMachineState): ProjectionSnapshot {
  const slide = withNextSlide(state.slides, state.currentSlideIndex)

  return Object.freeze({
    ...state,
    currentSlideIndex: state.currentSlideIndex,
    programSlides: state.slides,
    programSlideIndex: state.currentSlideIndex,
    programSlide: slide,
    programSongMeta: state.cuedSongMeta,
    programSongBackgroundConfig: state.cuedSongBackgroundConfig,
    projectionState: 'LIVE',
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })
}

export function reduceGoLive(
  state: ProjectionStateMachineState,
  request: Extract<ProjectionTransitionRequest, { type: 'projection:go-live' }>
): ProjectionSnapshot {
  const hasExplicitIndex = request.payload.slideIndex !== undefined

  if (!hasExplicitIndex && state.programSlide === null) {
    return state
  }

  const desiredIndex = hasExplicitIndex ? request.payload.slideIndex : state.currentSlideIndex

  if (desiredIndex === undefined) {
    return state
  }

  const slide = selectSlide(state.slides, desiredIndex)

  return Object.freeze({
    ...state,
    projectionState: 'LIVE',
    currentSlideIndex: hasExplicitIndex ? desiredIndex : state.currentSlideIndex,
    programSlides: state.slides,
    programSlideIndex: desiredIndex,
    programSlide: slide,
    programSongBackgroundConfig: hasExplicitIndex
      ? state.cuedSongBackgroundConfig
      : state.programSongBackgroundConfig,
    programLockState: hasExplicitIndex ? 'LIVE_LOCK' : state.programLockState,
    pendingChanges: hasExplicitIndex ? [] : state.pendingChanges,
    hasPendingLiveChanges: hasExplicitIndex ? false : state.hasPendingLiveChanges
  })
}

export function reduceNextSlide(state: ProjectionStateMachineState): ProjectionSnapshot {
  const nextIndex = Math.min(state.programSlideIndex + 1, state.programSlides.length - 1)
  const slide = withNextSlide(state.programSlides, nextIndex)

  return Object.freeze({
    ...state,
    projectionState: 'LIVE',
    programSlideIndex: nextIndex,
    programSlide: slide
  })
}

export function reducePrevSlide(state: ProjectionStateMachineState): ProjectionSnapshot {
  const nextIndex = Math.max(state.programSlideIndex - 1, 0)
  const slide = withNextSlide(state.programSlides, nextIndex)

  return Object.freeze({
    ...state,
    projectionState: 'LIVE',
    programSlideIndex: nextIndex,
    programSlide: slide
  })
}

export function reduceGoToSlide(
  state: ProjectionStateMachineState,
  request: Extract<ProjectionTransitionRequest, { type: 'projection:go-to-slide' }>
): ProjectionSnapshot {
  const desiredIndex = request.payload.slideIndex
  const slide = selectSlide(state.slides, desiredIndex)

  return Object.freeze({
    ...state,
    currentSlideIndex: desiredIndex,
    programSlides: state.slides,
    programSlideIndex: desiredIndex,
    programSlide: slide,
    projectionState: 'LIVE',
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })
}

export function reduceGoToSection(
  state: ProjectionStateMachineState,
  request: Extract<ProjectionTransitionRequest, { type: 'projection:go-to-section' }>
): ProjectionSnapshot {
  const section = ((request.payload.section as string) || '').toLowerCase()
  const indices = state.sectionMap[section]

  if (!indices || indices.length === 0) {
    return state
  }

  const desiredIndex = indices[0]
  const slide = withNextSlide(state.programSlides, desiredIndex)

  return Object.freeze({
    ...state,
    programSlideIndex: desiredIndex,
    programSlide: slide,
    projectionState: 'LIVE'
  })
}

export function reduceGoToAddress(
  state: ProjectionStateMachineState,
  request: Extract<ProjectionTransitionRequest, { type: 'projection:go-to-address' }>
): ProjectionSnapshot {
  const address = request.payload.address as SlideAddress
  const result = resolveSlideAddress(
    address,
    state.programSlides,
    state.sectionMap,
    state.programSlideIndex
  )

  if (!result.found || result.slideIndex === null) {
    return state
  }

  const desiredIndex = result.slideIndex
  const slide = withNextSlide(state.programSlides, desiredIndex)

  return Object.freeze({
    ...state,
    programSlideIndex: desiredIndex,
    programSlide: slide,
    projectionState: 'LIVE'
  })
}

export function reduceMarkDirty(
  state: ProjectionStateMachineState,
  request: Extract<ProjectionTransitionRequest, { type: 'projection:mark-dirty' }>
): ProjectionSnapshot {
  if (state.programLockState !== 'LIVE_LOCK') {
    return state
  }

  return Object.freeze({
    ...state,
    programLockState: 'LIVE_DIRTY',
    pendingChanges: [...state.pendingChanges, request.payload.change as PendingChange],
    hasPendingLiveChanges: true
  })
}

export function reduceUpdateLive(state: ProjectionStateMachineState): ProjectionSnapshot {
  if (state.programLockState !== 'LIVE_DIRTY') {
    return state
  }

  const slide = withNextSlide(state.slides, state.currentSlideIndex)

  return Object.freeze({
    ...state,
    programSlides: state.slides,
    programSlideIndex: state.currentSlideIndex,
    programSlide: slide,
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })
}

export function reduceDiscardChanges(state: ProjectionStateMachineState): ProjectionSnapshot {
  if (state.programLockState !== 'LIVE_DIRTY') {
    return state
  }

  return Object.freeze({
    ...state,
    slides: state.programSlides,
    currentSlideIndex: state.programSlideIndex,
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })
}

/**
 * FIX BUG-10 + BUG-BLACK-TOGGLE:
 * Toggle BLACK state — jika sudah BLACK, kembalikan ke state sebelumnya (LIVE/FREEZE/CLEAR).
 * Jika belum BLACK, masuk ke BLACK dan simpan state sebelumnya.
 */
export function reduceBlack(state: ProjectionStateMachineState): ProjectionSnapshot {
  if (state.projectionState === 'BLACK') {
    // Keluar dari BLACK — kembalikan ke state sebelumnya
    const restoreState: ProjectionStateMachineState['projectionState'] =
      state.previousProjectionState === 'FREEZE'
        ? 'FREEZE'
        : state.previousProjectionState === 'CLEAR'
          ? 'CLEAR'
          : state.previousProjectionState === 'LOGO'
            ? 'LOGO'
            : 'LIVE'

    return Object.freeze({
      ...state,
      projectionState: restoreState,
      previousProjectionState: undefined
    })
  }

  // Masuk ke BLACK — simpan state sebelumnya untuk restore
  return Object.freeze({
    ...state,
    previousProjectionState: state.projectionState,
    projectionState: 'BLACK'
  })
}

export function reduceFreeze(state: ProjectionStateMachineState): ProjectionSnapshot {
  const nextProjectionState = state.projectionState === 'FREEZE' ? 'LIVE' : 'FREEZE'

  return Object.freeze({
    ...state,
    projectionState: nextProjectionState
  })
}

export function reduceClear(state: ProjectionStateMachineState): ProjectionSnapshot {
  return Object.freeze({
    ...state,
    projectionState: 'CLEAR',
    programSlide: null,
    programSlideIndex: -1,
    programLockState: 'UNLOCKED',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })
}
