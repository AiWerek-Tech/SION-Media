/**
 * Projection Transition Taxonomy
 *
 * Defines the transition request contract and deterministic runtime output.
 */

import type { PendingChange, ProjectionState, SlideData, SlideAddress } from '@renderer/types'
import type { ProjectionEffect } from './effects'
import type { ProjectionStateMachineState } from './projection-state'

export type ProjectionTransitionType =
  | 'projection:take-cue'
  | 'projection:go-live'
  | 'projection:next-slide'
  | 'projection:prev-slide'
  | 'projection:black'
  | 'projection:freeze'
  | 'projection:clear'
  | 'projection:go-to-slide'
  | 'projection:go-to-section'
  | 'projection:go-to-address'
  | 'projection:mark-dirty'
  | 'projection:update-live'
  | 'projection:discard-changes'

export interface ProjectionTransitionRequestBase<T extends ProjectionTransitionType> {
  type: T
  payload: Record<string, unknown>
}

export type ProjectionTransitionRequest =
  | ProjectionTransitionRequestBase<'projection:take-cue'>
  | (ProjectionTransitionRequestBase<'projection:go-live'> & { payload: { slideIndex?: number } })
  | ProjectionTransitionRequestBase<'projection:next-slide'>
  | ProjectionTransitionRequestBase<'projection:prev-slide'>
  | ProjectionTransitionRequestBase<'projection:black'>
  | ProjectionTransitionRequestBase<'projection:freeze'>
  | ProjectionTransitionRequestBase<'projection:clear'>
  | (ProjectionTransitionRequestBase<'projection:go-to-slide'> & {
      payload: { slideIndex: number }
    })
  | (ProjectionTransitionRequestBase<'projection:go-to-section'> & {
      payload: { section: string }
    })
  | (ProjectionTransitionRequestBase<'projection:go-to-address'> & {
      payload: { address: SlideAddress }
    })
  | (ProjectionTransitionRequestBase<'projection:mark-dirty'> & {
      payload: { change: PendingChange }
    })
  | ProjectionTransitionRequestBase<'projection:update-live'>
  | ProjectionTransitionRequestBase<'projection:discard-changes'>

export interface ProjectionTransitionResult {
  readonly transitionType: ProjectionTransitionType
  readonly previousSnapshotId: string
  readonly previousState: ProjectionStateMachineState
  readonly nextSnapshotId: string
  readonly nextState: ProjectionStateMachineState
  readonly effects: ProjectionEffect[]
  readonly emittedEvents: ProjectionStateEvent[]
}

export interface ProjectionStateEvent {
  readonly type: 'projection:state-changed'
  readonly payload: {
    previousState: ProjectionState
    nextState: ProjectionState
    slideIndex: number | null
  }
}

export interface ProjectionSlideUpdateEvent {
  readonly type: 'projection:slide-updated'
  readonly payload: {
    slide: SlideData | null
    slideIndex: number | null
  }
}

export type ProjectionEvent = ProjectionStateEvent | ProjectionSlideUpdateEvent
