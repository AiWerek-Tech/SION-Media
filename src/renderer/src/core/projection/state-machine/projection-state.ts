/**
 * Projection State Contract
 *
 * This contract describes the projection runtime snapshot that the state machine
 * consumes and evolves. It is deliberately headless and free of UI or Electron APIs.
 */

import type {
  ProjectionState,
  SlideData,
  ProgramLockState,
  PendingChange,
  SectionIndexMap
} from '@renderer/types'

export interface ProjectionStateMachineState {
  readonly projectionState: ProjectionState
  readonly slides: SlideData[]
  readonly currentSlideIndex: number
  readonly programSlides: SlideData[]
  readonly programSlideIndex: number
  readonly programSlide: SlideData | null
  readonly cuedSongMeta: { hymnalCode: string; hymnalName: string } | null
  readonly programSongMeta: { hymnalCode: string; hymnalName: string } | null
  readonly cuedSongBackgroundConfig: string
  readonly programSongBackgroundConfig: string
  readonly programLockState: ProgramLockState
  readonly pendingChanges: PendingChange[]
  readonly hasPendingLiveChanges: boolean
  readonly sectionMap: SectionIndexMap
  /** State sebelum BLACK — digunakan untuk restore saat keluar dari BLACK */
  readonly previousProjectionState?: ProjectionState
}

export const initialProjectionState: ProjectionStateMachineState = {
  projectionState: 'CLEAR',
  slides: [],
  currentSlideIndex: 0,
  programSlides: [],
  programSlideIndex: -1,
  programSlide: null,
  cuedSongMeta: null,
  programSongMeta: null,
  cuedSongBackgroundConfig: '',
  programSongBackgroundConfig: '',
  programLockState: 'UNLOCKED',
  pendingChanges: [],
  hasPendingLiveChanges: false,
  sectionMap: {}
}
