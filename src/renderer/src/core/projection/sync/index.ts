/**
 * Projection Sync Boundary
 *
 * This module exposes helpers for state-machine / Zustand synchronization.
 */

export {
  extractProjectionSnapshotFromStore,
  applyProjectionSnapshotToStore
} from './sync-projection-snapshot'
export { syncProjectionSnapshotToStore } from './store-sync-adapter'
