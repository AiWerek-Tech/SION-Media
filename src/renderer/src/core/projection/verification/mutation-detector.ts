/**
 * Mutation Detector
 *
 * Lightweight mutation detection system that tracks changes
 * to the projection store outside the normal state machine flow.
 *
 * This helps identify "authority leaks" where code modifies
 * the store directly instead of going through transitions.
 */

import { useProjectionStore } from '../../../store/useProjectionStore'

// Store snapshot for comparison
let baselineSnapshot: string | null = null

export const detectStoreMutation = {
  /**
   * Capture current store state as baseline
   */
  snapshot(): string {
    const store = useProjectionStore.getState()

    // Create deterministic snapshot of critical state
    const criticalState = {
      projectionState: store.projectionState,
      slides: store.slides,
      currentSlideIndex: store.currentSlideIndex,
      programSlides: store.programSlides,
      programSlideIndex: store.programSlideIndex,
      programSlide: store.programSlide,
      programLockState: store.programLockState,
      pendingChanges: store.pendingChanges,
      hasPendingLiveChanges: store.hasPendingLiveChanges,
      sectionMap: store.sectionMap
    }

    return JSON.stringify(criticalState, Object.keys(criticalState).sort())
  },

  /**
   * Compare two snapshots for differences
   */
  diff(snapshotA: string, snapshotB: string): boolean {
    return snapshotA !== snapshotB
  },

  /**
   * Set baseline for mutation detection
   */
  setBaseline(): void {
    baselineSnapshot = this.snapshot()
  },

  /**
   * Check if store has been mutated since baseline
   */
  hasMutated(): boolean {
    if (!baselineSnapshot) return false
    return this.diff(baselineSnapshot, this.snapshot())
  },

  /**
   * Get detailed diff between snapshots
   */
  getDetailedDiff(
    snapshotA: string,
    snapshotB: string
  ): {
    changed: boolean
    changes: Array<{
      field: string
      from: any
      to: any
    }>
  } {
    try {
      const objA = JSON.parse(snapshotA)
      const objB = JSON.parse(snapshotB)

      const changes: Array<{ field: string; from: any; to: any }> = []

      for (const key of Object.keys(objA)) {
        if (!deepEqual(objA[key], objB[key])) {
          changes.push({
            field: key,
            from: objA[key],
            to: objB[key]
          })
        }
      }

      return {
        changed: changes.length > 0,
        changes
      }
    } catch (error) {
      return {
        changed: true,
        changes: [{ field: 'parse_error', from: snapshotA, to: snapshotB }]
      }
    }
  },

  /**
   * Reset baseline
   */
  reset(): void {
    baselineSnapshot = null
  }
}

/**
 * Deep equality check for nested objects
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (a == null || b == null) return a === b

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!deepEqual(a[key], b[key])) return false
    }
    return true
  }

  return false
}

/**
 * Advanced mutation tracker with call stack analysis
 * Useful for debugging where mutations come from
 */
export class MutationTracker {
  private mutations: Array<{
    timestamp: number
    stack: string
    before: string
    after: string
  }> = []

  private isTracking = false

  startTracking() {
    this.isTracking = true
    detectStoreMutation.setBaseline()
  }

  stopTracking() {
    this.isTracking = false
  }

  checkForMutation() {
    if (!this.isTracking) return

    if (detectStoreMutation.hasMutated()) {
      const before = baselineSnapshot!
      const after = detectStoreMutation.snapshot()

      this.mutations.push({
        timestamp: Date.now(),
        stack: new Error().stack || 'No stack available',
        before,
        after
      })

      // Reset baseline for next check
      detectStoreMutation.setBaseline()
    }
  }

  getMutations() {
    return [...this.mutations]
  }

  reset() {
    this.mutations = []
  }
}

// Global tracker instance
export const mutationTracker = new MutationTracker()

/**
 * Development helper to wrap store methods with mutation tracking
 * This can be used to detect when store methods are called outside transitions
 */
export function createTrackedStoreProxy() {
  if (process.env.NODE_ENV !== 'development') {
    return useProjectionStore
  }

  const originalStore = useProjectionStore

  // Track calls to store actions that should only be called through state machine
  const trackedActions = [
    'goToSlide',
    'takeCue',
    'toggleFreeze',
    'toggleBlack',
    'clearScreen',
    'goToLiveSection',
    'goToLiveAddress'
  ]

  return new Proxy(originalStore, {
    get(target, property) {
      const value = target[property as keyof typeof target]

      if (typeof value === 'function' && trackedActions.includes(property as string)) {
        return (...args: any[]) => {
          console.warn(
            `[STORE TRACKING] Direct call to ${String(property)} detected outside state machine`,
            {
              stack: new Error().stack,
              args
            }
          )

          // Set global mutation flag
          globalThis.__PROJECTION_STORE_MUTATED__ = true

          return (value as Function).apply(target, args)
        }
      }

      return value
    }
  })
}
