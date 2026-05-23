/**
 * Projection Store Sync Adapter
 *
 * Applies canonical projection snapshots to the existing Zustand store and
 * preserves compatibility with derived UI state.
 */

import type { ProjectionSnapshot } from '../state-machine/projection-snapshot'
import { applyProjectionSnapshotToStore } from './sync-projection-snapshot'
import { useProjectionStore } from '@renderer/store/useProjectionStore'

export function syncProjectionSnapshotToStore(snapshot: ProjectionSnapshot): void {
  applyProjectionSnapshotToStore(snapshot)
  useProjectionStore.getState().computeNextState()
}
