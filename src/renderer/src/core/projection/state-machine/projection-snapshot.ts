/**
 * Projection Snapshot Contract
 *
 * Immutable canonical projection state for replay and synchronization.
 * This snapshot format is intentionally serializable and free of runtime adapters.
 */

import type { ProjectionStateMachineState } from './projection-state'

export type ProjectionSnapshot = Readonly<ProjectionStateMachineState>

export function createProjectionSnapshot(state: ProjectionStateMachineState): ProjectionSnapshot {
  return Object.freeze({ ...state })
}

export function serializeProjectionSnapshot(snapshot: ProjectionSnapshot): string {
  return JSON.stringify(snapshot)
}

export function deserializeProjectionSnapshot(json: string): ProjectionSnapshot {
  return JSON.parse(json) as ProjectionSnapshot
}

export function createProjectionSnapshotId(snapshot: ProjectionSnapshot): string {
  const serialized = serializeProjectionSnapshot(snapshot)
  let hash = 0
  for (let i = 0; i < serialized.length; i += 1) {
    hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0
  }
  return `snapshot-${hash.toString(16).padStart(8, '0')}-${serialized.length}`
}
