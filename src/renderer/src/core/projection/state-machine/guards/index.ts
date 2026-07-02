/**
 * Guard Conditions
 *
 * These functions encode the legal transition graph for projection state.
 * They are pure predicates used by the transition validator.
 *
 * FIX BUG-02: canGoToSlide and canGoToSection now use programSlides for live
 * navigation and no longer block transitions when LIVE_LOCK is active —
 * navigating live slides is the primary use-case while the program is live.
 */

import type { SlideAddress } from '@renderer/types'
import type { ProjectionStateMachineState } from '../projection-state'
import { resolveSlideAddress } from '../../slideAddressResolver'

export function canTakeCue(state: ProjectionStateMachineState): boolean {
  return (
    state.slides.length > 0 &&
    state.currentSlideIndex >= 0 &&
    state.currentSlideIndex < state.slides.length
  )
}

/**
 * FIX BUG-02: use programSlides (not slides/CUE) for live navigation bounds,
 * and allow navigation even when LIVE_LOCK is active.
 */
export function canGoToSlide(state: ProjectionStateMachineState, slideIndex: number): boolean {
  // When live, validate against programSlides
  const isLive = state.projectionState === 'LIVE' || state.projectionState === 'FREEZE'
  const targetSlides = isLive ? state.programSlides : state.slides
  return slideIndex >= 0 && slideIndex < targetSlides.length
}

/**
 * FIX BUG-02: allow section navigation while LIVE_LOCK is active.
 */
export function canGoToSection(state: ProjectionStateMachineState, section: string): boolean {
  const indices = state.sectionMap[section.toLowerCase()]
  return Boolean(indices && indices.length > 0)
}

export function canGoToAddress(state: ProjectionStateMachineState, address: SlideAddress): boolean {
  const result = resolveSlideAddress(
    address,
    state.programSlides,
    state.sectionMap,
    state.programSlideIndex
  )
  return result.found && result.slideIndex !== null
}

export function canMarkDirty(state: ProjectionStateMachineState): boolean {
  return state.programLockState === 'LIVE_LOCK'
}

export function canUpdateLive(state: ProjectionStateMachineState): boolean {
  return state.programLockState === 'LIVE_DIRTY'
}

export function canDiscardChanges(state: ProjectionStateMachineState): boolean {
  return state.programLockState === 'LIVE_DIRTY'
}

export function canAdvanceSlide(state: ProjectionStateMachineState): boolean {
  const isLive = state.projectionState === 'LIVE' || state.projectionState === 'FREEZE'
  return isLive && state.programSlides.length > 0 && state.programSlideIndex >= 0
}

export function canToggleState(): boolean {
  // BLACK bisa diaktifkan dari state apapun (termasuk CLEAR) karena
  // operator mungkin ingin black screen sebelum ada konten.
  // FREEZE hanya bisa dari LIVE atau FREEZE (ditangani di store.toggleFreeze).
  return true
}

export function canClearScreen(state: ProjectionStateMachineState): boolean {
  return state.projectionState !== 'CLEAR'
}
