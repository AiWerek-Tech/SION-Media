/**
 * Projection Snapshot Sync Helpers
 *
 * These helpers normalize store state into the state-machine snapshot format
 * and keep the runtime sync boundary explicit and isolated.
 */

import { useProjectionStore } from '@renderer/store/useProjectionStore'
import {
  createProjectionSnapshot,
  type ProjectionSnapshot
} from '../state-machine/projection-snapshot'

export function extractProjectionSnapshotFromStore(): ProjectionSnapshot {
  const store = useProjectionStore.getState()
  // Cast untuk mengakses previousProjectionState yang disimpan di store
  const storeWithPrev = store as typeof store & {
    previousProjectionState?: import('@renderer/types').ProjectionState
  }

  return createProjectionSnapshot({
    projectionState: store.projectionState,
    slides: store.slides,
    currentSlideIndex: store.currentSlideIndex,
    programSlides: store.programSlides,
    programSlideIndex: store.programSlideIndex,
    programSlide: store.programSlide,
    cuedSongMeta: store.cuedSongMeta,
    programSongMeta: store.programSongMeta,
    cuedSongBackgroundConfig: store.cuedSongBackgroundConfig,
    programSongBackgroundConfig: store.programSongBackgroundConfig,
    programLockState: store.programLockState,
    pendingChanges: store.pendingChanges,
    hasPendingLiveChanges: store.hasPendingLiveChanges,
    sectionMap: store.sectionMap,
    previousProjectionState: storeWithPrev.previousProjectionState
  })
}

export function applyProjectionSnapshotToStore(snapshot: ProjectionSnapshot): void {
  useProjectionStore.setState({
    projectionState: snapshot.projectionState,
    slides: snapshot.slides,
    currentSlideIndex: snapshot.currentSlideIndex,
    programSlides: snapshot.programSlides,
    programSlideIndex: snapshot.programSlideIndex,
    programSlide: snapshot.programSlide,
    cuedSongMeta: snapshot.cuedSongMeta,
    programSongMeta: snapshot.programSongMeta,
    cuedSongBackgroundConfig: snapshot.cuedSongBackgroundConfig,
    programSongBackgroundConfig: snapshot.programSongBackgroundConfig,
    programLockState: snapshot.programLockState,
    pendingChanges: snapshot.pendingChanges,
    hasPendingLiveChanges: snapshot.hasPendingLiveChanges,
    sectionMap: snapshot.sectionMap,
    // Teruskan previousProjectionState agar restore dari BLACK bekerja
    ...(snapshot.previousProjectionState !== undefined
      ? { previousProjectionState: snapshot.previousProjectionState }
      : { previousProjectionState: undefined })
  })
}
