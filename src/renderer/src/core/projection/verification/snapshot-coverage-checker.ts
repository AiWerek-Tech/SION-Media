/**
 * Snapshot Coverage Checker
 *
 * Validates that the projection snapshot captures 100% of state
 * that affects rendering, behavior, and runtime decisions.
 *
 * This prevents "snapshot complete but visually different" issues.
 */

import type { ProjectionSnapshot } from '../state-machine/projection-snapshot'
import { useProjectionStore } from '../../../store/useProjectionStore'

export type CoverageReport = {
  ok: boolean
  mismatches: string[]
  missingFields: string[]
  storeVsSnapshotDiffs: Array<{
    field: string
    storeValue: any
    snapshotValue: any
  }>
}

/**
 * Critical fields that must be present in snapshot
 * These are fields that directly affect UI rendering or behavior
 */
const CRITICAL_FIELDS: (keyof ProjectionSnapshot)[] = [
  'projectionState',
  'slides',
  'currentSlideIndex',
  'programSlides',
  'programSlideIndex',
  'programSlide',
  'cuedSongMeta',
  'programSongMeta',
  'cuedSongBackgroundConfig',
  'programSongBackgroundConfig',
  'programLockState',
  'pendingChanges',
  'hasPendingLiveChanges',
  'sectionMap'
]

/**
 * Fields that affect derived UI state
 * These might not be in snapshot but should be derivable
 */

/**
 * Validate snapshot captures all state affecting output
 */
export function validateSnapshotCoverage(snapshot: ProjectionSnapshot): CoverageReport {
  const store = useProjectionStore.getState()
  const mismatches: string[] = []
  const missingFields: string[] = []
  const storeVsSnapshotDiffs: CoverageReport['storeVsSnapshotDiffs'] = []

  // 1. Check critical fields are present
  for (const field of CRITICAL_FIELDS) {
    if (snapshot[field] === undefined) {
      missingFields.push(field)
      mismatches.push(`MISSING_CRITICAL_FIELD: ${field}`)
    }
  }

  // 2. Check store vs snapshot consistency for critical fields
  // Note: This assumes snapshot fields map 1:1 with store fields
  const storeFieldMapping: Partial<Record<keyof ProjectionSnapshot, keyof typeof store>> = {
    projectionState: 'projectionState',
    slides: 'slides',
    currentSlideIndex: 'currentSlideIndex',
    programSlides: 'programSlides',
    programSlideIndex: 'programSlideIndex',
    programSlide: 'programSlide',
    cuedSongMeta: 'cuedSongMeta',
    programSongMeta: 'programSongMeta',
    cuedSongBackgroundConfig: 'cuedSongBackgroundConfig',
    programSongBackgroundConfig: 'programSongBackgroundConfig',
    programLockState: 'programLockState',
    pendingChanges: 'pendingChanges',
    hasPendingLiveChanges: 'hasPendingLiveChanges',
    sectionMap: 'sectionMap'
  }

  for (const [snapshotField, storeField] of Object.entries(storeFieldMapping)) {
    const snapshotValue = snapshot[snapshotField as keyof ProjectionSnapshot]
    const storeValue = store[storeField as keyof typeof store]

    // Deep equality check for objects/arrays
    if (!deepEqual(snapshotValue, storeValue)) {
      storeVsSnapshotDiffs.push({
        field: snapshotField,
        storeValue,
        snapshotValue
      })
      mismatches.push(`STORE_SNAPSHOT_MISMATCH: ${snapshotField}`)
    }
  }

  // 3. Check derived state consistency (simplified - just check program slide derivation)
  const derivedStateChecks = [
    {
      name: 'programSlideDerivation',
      expected: snapshot.programSlides[snapshot.programSlideIndex] || null,
      actual: snapshot.programSlide
    }
  ]

  for (const check of derivedStateChecks) {
    if (!deepEqual(check.expected, check.actual)) {
      mismatches.push(`DERIVED_STATE_INCONSISTENT: ${check.name}`)
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    missingFields,
    storeVsSnapshotDiffs
  }
}

/**
 * Deep equality check for objects and arrays
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
 * Check if snapshot is sufficient for complete UI reconstruction
 * This is stricter than basic coverage - ensures no store reads needed for rendering
 */
export function validateSnapshotSufficiency(snapshot: ProjectionSnapshot): {
  ok: boolean
  missingForUI: string[]
  recommendations: string[]
} {
  const missingForUI: string[] = []
  const recommendations: string[] = []

  // Check if all data needed for slide rendering is present
  if (!snapshot.slides || snapshot.slides.length === 0) {
    missingForUI.push('slides for rendering')
  }

  if (snapshot.currentSlideIndex === undefined) {
    missingForUI.push('currentSlideIndex for navigation state')
  }

  // Check program state completeness
  if (!snapshot.programSlides) {
    missingForUI.push('programSlides for live output')
  }

  if (snapshot.programSlideIndex === undefined) {
    missingForUI.push('programSlideIndex for program position')
  }

  // Recommendations for improvement
  if (snapshot.sectionMap && Object.keys(snapshot.sectionMap).length === 0) {
    recommendations.push('Consider pre-computing sectionMap if frequently accessed')
  }

  return {
    ok: missingForUI.length === 0,
    missingForUI,
    recommendations
  }
}
