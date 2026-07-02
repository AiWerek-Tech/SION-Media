/**
 * Unit Tests — Navigation Flow Engine
 *
 * Tests edge cases and specific behaviours that complement the property tests.
 * Feature: smart-worship-navigation
 */

import { describe, test, expect } from 'vitest'
import {
  classifySectionLabel,
  extractSectionBoundaries,
  resolveNavigationFlow,
  resolveFlowPosition,
  computeSmartNext,
  computeSmartPrev,
  computeSmartNextSlideData,
  generateBadgeLabel
} from '../navigationFlowEngine'
import type { SlideData, NavigationFlow } from '@renderer/types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal SlideData array from an array of sectionLabels. */
function makeSlides(labels: string[]): SlideData[] {
  return labels.map((sectionLabel, i) => ({
    songId: 1,
    slideIndex: i,
    text: `Slide ${i}`,
    sectionLabel
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// classifySectionLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('classifySectionLabel', () => {
  test('empty string → other', () => {
    expect(classifySectionLabel('')).toBe('other')
  })

  test('verse variants', () => {
    expect(classifySectionLabel('VERSE 1')).toBe('verse')
    expect(classifySectionLabel('Verse')).toBe('verse')
    expect(classifySectionLabel('verse')).toBe('verse')
    expect(classifySectionLabel('VERSE')).toBe('verse')
    expect(classifySectionLabel('Bait 1')).toBe('verse')
    expect(classifySectionLabel('BAIT')).toBe('verse')
  })

  test('chorus variants', () => {
    expect(classifySectionLabel('CHORUS')).toBe('chorus')
    expect(classifySectionLabel('Chorus')).toBe('chorus')
    expect(classifySectionLabel('Korus')).toBe('chorus')
    expect(classifySectionLabel('Ref')).toBe('chorus')
    expect(classifySectionLabel('Reff')).toBe('chorus')
    expect(classifySectionLabel('REFF')).toBe('chorus')
    expect(classifySectionLabel('Refrain')).toBe('chorus')
    expect(classifySectionLabel('REFRAIN')).toBe('chorus')
  })

  test('bridge variants', () => {
    expect(classifySectionLabel('Bridge')).toBe('bridge')
    expect(classifySectionLabel('BRIDGE')).toBe('bridge')
  })

  test('intro variants', () => {
    expect(classifySectionLabel('Intro')).toBe('intro')
    expect(classifySectionLabel('INTRO')).toBe('intro')
  })

  test('ending variants', () => {
    expect(classifySectionLabel('Ending')).toBe('ending')
    expect(classifySectionLabel('ENDING')).toBe('ending')
    expect(classifySectionLabel('Outro')).toBe('ending')
    expect(classifySectionLabel('OUTRO')).toBe('ending')
    expect(classifySectionLabel('TAG')).toBe('ending')
    expect(classifySectionLabel('Tag')).toBe('ending')
  })

  test('unrecognized labels → other', () => {
    // Note: 'Pre-Chorus' contains 'chorus' substring → classified as 'chorus' (correct per spec)
    expect(classifySectionLabel('Pre-Chorus')).toBe('chorus')
    expect(classifySectionLabel('Interlude')).toBe('other')
    expect(classifySectionLabel('Solo')).toBe('other')
    expect(classifySectionLabel('123')).toBe('other')
  })

  test('priority: verse wins over chorus', () => {
    expect(classifySectionLabel('verse chorus')).toBe('verse')
  })

  test('priority: chorus wins over bridge', () => {
    expect(classifySectionLabel('chorus bridge')).toBe('chorus')
  })

  test('priority: bridge wins over intro', () => {
    expect(classifySectionLabel('bridge intro')).toBe('bridge')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generateBadgeLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('generateBadgeLabel', () => {
  test('verse → V{n}', () => {
    expect(generateBadgeLabel('verse', 'VERSE 1', 1)).toBe('V1')
    expect(generateBadgeLabel('verse', 'VERSE 2', 2)).toBe('V2')
    expect(generateBadgeLabel('verse', 'VERSE 3', 3)).toBe('V3')
  })

  test('chorus → C', () => {
    expect(generateBadgeLabel('chorus', 'CHORUS', 0)).toBe('C')
    expect(generateBadgeLabel('chorus', 'Reff', 0)).toBe('C')
  })

  test('bridge → B', () => {
    expect(generateBadgeLabel('bridge', 'BRIDGE', 0)).toBe('B')
  })

  test('intro → I', () => {
    expect(generateBadgeLabel('intro', 'INTRO', 0)).toBe('I')
  })

  test('ending → E', () => {
    expect(generateBadgeLabel('ending', 'ENDING', 0)).toBe('E')
  })

  test('other → first 2 chars uppercase', () => {
    expect(generateBadgeLabel('other', 'Interlude', 0)).toBe('IN')
    expect(generateBadgeLabel('other', 'Solo', 0)).toBe('SO')
    expect(generateBadgeLabel('other', '', 0)).toBe('X')
    expect(generateBadgeLabel('other', 'A', 0)).toBe('A')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// extractSectionBoundaries
// ─────────────────────────────────────────────────────────────────────────────

describe('extractSectionBoundaries', () => {
  test('empty array → empty boundaries', () => {
    expect(extractSectionBoundaries([])).toEqual([])
  })

  test('single section', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'VERSE 1'])
    const boundaries = extractSectionBoundaries(slides)
    expect(boundaries).toHaveLength(1)
    expect(boundaries[0]).toMatchObject({
      sectionLabel: 'VERSE 1',
      sectionType: 'verse',
      firstSlideIndex: 0,
      lastSlideIndex: 2
    })
  })

  test('multiple sections', () => {
    const slides = makeSlides(['INTRO', 'VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    const boundaries = extractSectionBoundaries(slides)
    expect(boundaries).toHaveLength(3)
    expect(boundaries[0]).toMatchObject({
      sectionLabel: 'INTRO',
      firstSlideIndex: 0,
      lastSlideIndex: 0
    })
    expect(boundaries[1]).toMatchObject({
      sectionLabel: 'VERSE 1',
      firstSlideIndex: 1,
      lastSlideIndex: 2
    })
    expect(boundaries[2]).toMatchObject({
      sectionLabel: 'CHORUS',
      firstSlideIndex: 3,
      lastSlideIndex: 4
    })
  })

  test('sectionId preserves boundaries when adjacent labels repeat', () => {
    const slides = makeSlides(['VERSE', 'VERSE', 'VERSE']).map((slide, index) => ({
      ...slide,
      sectionId: index === 0 ? 0 : 1
    }))
    const boundaries = extractSectionBoundaries(slides)
    expect(boundaries).toHaveLength(2)
    expect(boundaries[0]).toMatchObject({ firstSlideIndex: 0, lastSlideIndex: 0 })
    expect(boundaries[1]).toMatchObject({ firstSlideIndex: 1, lastSlideIndex: 2 })
  })

  test('does not mutate input array', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const original = [...slides]
    extractSectionBoundaries(slides)
    expect(slides).toEqual(original)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveNavigationFlow — guard cases
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveNavigationFlow — guard cases', () => {
  test('null input → empty flow without exception', () => {
    expect(() => resolveNavigationFlow(null as unknown as SlideData[])).not.toThrow()
    expect(resolveNavigationFlow(null as unknown as SlideData[])).toEqual({
      steps: [],
      isSmartMode: false
    })
  })

  test('undefined input → empty flow without exception', () => {
    expect(() => resolveNavigationFlow(undefined)).not.toThrow()
    expect(resolveNavigationFlow(undefined)).toEqual({ steps: [], isSmartMode: false })
  })

  test('empty array → empty flow', () => {
    expect(resolveNavigationFlow([])).toEqual({ steps: [], isSmartMode: false })
  })

  test('slides with empty sectionLabel → Linear_Mode, no exception', () => {
    const slides = makeSlides(['', '', ''])
    expect(() => resolveNavigationFlow(slides)).not.toThrow()
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveNavigationFlow — Linear_Mode
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveNavigationFlow — Linear_Mode', () => {
  test('song without chorus → Linear_Mode', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'VERSE 2', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
    expect(flow.steps).toHaveLength(2) // 2 unique sections
  })

  test('Linear_Mode steps match original section order', () => {
    const slides = makeSlides(['INTRO', 'VERSE 1', 'VERSE 2', 'ENDING'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
    expect(flow.steps.map((s) => s.sectionType)).toEqual(['intro', 'verse', 'verse', 'ending'])
  })

  test('Linear_Mode verse badges are numbered', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 2', 'VERSE 3'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps.map((s) => s.badgeLabel)).toEqual(['V1', 'V2', 'V3'])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveNavigationFlow — Smart_Mode
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveNavigationFlow — Smart_Mode', () => {
  test('song with chorus → Smart_Mode', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(true)
  })

  test('V1 → C pattern for single verse', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps.map((s) => s.sectionType)).toEqual(['verse', 'chorus'])
  })

  test('V1 → C → V2 → C pattern for two verses', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps.map((s) => s.sectionType)).toEqual(['verse', 'chorus', 'verse', 'chorus'])
    expect(flow.steps.map((s) => s.badgeLabel)).toEqual(['V1', 'C', 'V2', 'C'])
  })

  test('Bait labels use Smart_Mode exactly like verse labels', () => {
    const slides = makeSlides(['Bait 1', 'Bait 1', 'Reff', 'Bait 2', 'Bait 2'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(true)
    expect(flow.steps.map((s) => s.sectionLabel)).toEqual(['Bait 1', 'Reff', 'Bait 2', 'Reff'])
    expect(flow.steps.map((s) => s.badgeLabel)).toEqual(['V1', 'C', 'V2', 'C'])
    expect(flow.steps[1].firstSlideIndex).toBe(2)
    expect(flow.steps[3].firstSlideIndex).toBe(2)
  })

  test('V1 → C → V2 → C → V3 → C pattern for three verses', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS', 'VERSE 3', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps.map((s) => s.sectionType)).toEqual([
      'verse',
      'chorus',
      'verse',
      'chorus',
      'verse',
      'chorus'
    ])
  })

  test('intro placed first in Smart_Mode', () => {
    const slides = makeSlides(['INTRO', 'VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps[0].sectionType).toBe('intro')
    expect(flow.steps.map((s) => s.sectionType)).toEqual(['intro', 'verse', 'chorus'])
  })

  test('ending placed last in Smart_Mode', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'ENDING'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps[flow.steps.length - 1].sectionType).toBe('ending')
  })

  test('bridge placed before last verse in Smart_Mode (≥2 verses)', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'BRIDGE', 'VERSE 2', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // Expected: V1 → C → B → V2 → C
    expect(flow.steps.map((s) => s.sectionType)).toEqual([
      'verse',
      'chorus',
      'bridge',
      'verse',
      'chorus'
    ])
  })

  test('canonical chorus reused — same firstSlideIndex for all chorus steps', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    const chorusSteps = flow.steps.filter((s) => s.sectionType === 'chorus')
    expect(chorusSteps.length).toBeGreaterThan(1)
    // All chorus steps should point to the same slides (canonical chorus)
    const firstChorusIndex = chorusSteps[0].firstSlideIndex
    chorusSteps.forEach((step) => {
      expect(step.firstSlideIndex).toBe(firstChorusIndex)
    })
  })

  test('full structure: I → V1 → C → V2 → C → B → V3 → C → E', () => {
    const slides = makeSlides([
      'INTRO',
      'VERSE 1',
      'VERSE 1',
      'CHORUS',
      'CHORUS',
      'VERSE 2',
      'VERSE 2',
      'BRIDGE',
      'VERSE 3',
      'VERSE 3',
      'ENDING'
    ])
    const flow = resolveNavigationFlow(slides)
    expect(flow.steps.map((s) => s.sectionType)).toEqual([
      'intro',
      'verse',
      'chorus',
      'verse',
      'chorus',
      'bridge',
      'verse',
      'chorus',
      'ending'
    ])
  })

  test('idempotent — same result on repeated calls', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    const flow1 = resolveNavigationFlow(slides)
    const flow2 = resolveNavigationFlow(slides)
    expect(flow1).toEqual(flow2)
  })

  test('does not mutate input slides', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const original = JSON.stringify(slides)
    resolveNavigationFlow(slides)
    expect(JSON.stringify(slides)).toBe(original)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resolveFlowPosition
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveFlowPosition', () => {
  test('empty flow → -1', () => {
    const flow: NavigationFlow = { steps: [], isSmartMode: false }
    expect(resolveFlowPosition(0, flow)).toBe(-1)
  })

  test('negative slideIndex → -1', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(resolveFlowPosition(-1, flow)).toBe(-1)
  })

  test('slideIndex within first step → 0', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(resolveFlowPosition(0, flow)).toBe(0)
    expect(resolveFlowPosition(1, flow)).toBe(0)
  })

  test('slideIndex within chorus step → correct position', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // flow: V1(0-0) → C(1-2)
    expect(resolveFlowPosition(1, flow)).toBe(1)
    expect(resolveFlowPosition(2, flow)).toBe(1)
  })

  test('chorus appears multiple times — returns FIRST matching step from search position', () => {
    // V1(0) → C(1) → V2(2) → C(1) — chorus reused
    // New behavior: resolveFlowPosition uses currentFlowPosition hint to find
    // the correct chorus occurrence, not always the last one.
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    // flow: V1(step 0) → C(step 1) → V2(step 2) → C(step 3)

    // When at chorus slide (index 1) with no hint (default -1),
    // should return the FIRST matching step (step 1)
    expect(resolveFlowPosition(1, flow)).toBe(1)

    // When at chorus slide (index 1) with hint at step 1 (already there),
    // should stay at step 1
    expect(resolveFlowPosition(1, flow, 1)).toBe(1)

    // When at chorus slide (index 1) with hint at step 2 (V2),
    // should find step 3 (next chorus after V2)
    expect(resolveFlowPosition(1, flow, 2)).toBe(3)

    // When at chorus slide (index 1) with hint at step 3 (already at 2nd chorus),
    // should stay at step 3
    expect(resolveFlowPosition(1, flow, 3)).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeSmartNext
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSmartNext', () => {
  test('within section — advance one slide', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // At slide 0 (first of VERSE 1, which spans 0-1)
    expect(computeSmartNext(0, flow, 0)).toBe(1)
  })

  test('at last slide of verse → jump to first slide of chorus', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // VERSE 1: slides 0-1, CHORUS: slides 2-3
    // At slide 1 (last of VERSE 1), flowPosition 0
    expect(computeSmartNext(1, flow, 0)).toBe(2)
  })

  test('at last slide of chorus → jump to first slide of next verse', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    // flow: V1(0) → C(1) → V2(2) → C(1)
    // At slide 1 (chorus), flowPosition 1
    const chorusFlowPos = flow.steps.findIndex((s) => s.sectionType === 'chorus')
    const nextResult = computeSmartNext(1, flow, chorusFlowPos)
    // Should jump to first slide of next step (V2 at index 2)
    expect(nextResult).toBe(2)
  })

  test('at last slide of last step → null (end of song)', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    const lastStepIndex = flow.steps.length - 1
    const lastSlideIndex = flow.steps[lastStepIndex].lastSlideIndex
    expect(computeSmartNext(lastSlideIndex, flow, lastStepIndex)).toBeNull()
  })

  test('Linear_Mode → returns currentIndex + 1', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
    expect(computeSmartNext(0, flow, 0)).toBe(1)
    expect(computeSmartNext(1, flow, 1)).toBe(2) // caller clamps
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeSmartPrev
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSmartPrev', () => {
  test('within section — go back one slide', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // At slide 1 (second of VERSE 1, which spans 0-1)
    expect(computeSmartPrev(1, flow, 0)).toBe(0)
  })

  test('at first slide of verse (not first step) → jump to first slide of previous chorus', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    // flow: V1(0) → C(1) → V2(2) → C(1)
    // At slide 2 (first of V2), flowPosition = step index of V2
    const v2StepIndex = flow.steps.findIndex(
      (s) => s.sectionType === 'verse' && s.badgeLabel === 'V2'
    )
    const prevResult = computeSmartPrev(2, flow, v2StepIndex)
    // Should jump to first slide of previous step (C at index 1)
    expect(prevResult).toBe(1)
  })

  test('at first slide of verse → jump to LAST slide of previous step (when it has multiple slides)', () => {
    const slides = [
      ...makeSlides(['VERSE 1']),
      ...makeSlides(['CHORUS', 'CHORUS']), // Chorus spans index 1 and 2
      ...makeSlides(['VERSE 2']) // Verse 2 starts at index 3
    ]
    const flow = resolveNavigationFlow(slides)
    // Find Verse 2 step index
    const v2StepIndex = flow.steps.findIndex(
      (s) => s.sectionType === 'verse' && s.badgeLabel === 'V2'
    )
    // At slide 3 (first slide of Verse 2), computeSmartPrev should land on slide 2 (last slide of Chorus)
    const prevResult = computeSmartPrev(3, flow, v2StepIndex)
    expect(prevResult).toBe(2)
  })

  test('at first slide of first step → null (beginning of song)', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    expect(computeSmartPrev(0, flow, 0)).toBeNull()
  })

  test('Linear_Mode → returns currentIndex - 1', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 2'])
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
    expect(computeSmartPrev(1, flow, 1)).toBe(0)
    expect(computeSmartPrev(0, flow, 0)).toBe(-1) // caller clamps
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeSmartNextSlideData
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSmartNextSlideData', () => {
  test('returns correct next slide data', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    // At slide 0 (VERSE 1), next should be slide 1 (CHORUS)
    const result = computeSmartNextSlideData(slides, 0, flow, 0)
    expect(result).not.toBeNull()
    expect(result?.sectionLabel).toBe('CHORUS')
  })

  test('returns null at end of song', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    const flow = resolveNavigationFlow(slides)
    const lastStepIndex = flow.steps.length - 1
    const lastSlideIndex = flow.steps[lastStepIndex].lastSlideIndex
    const result = computeSmartNextSlideData(slides, lastSlideIndex, flow, lastStepIndex)
    expect(result).toBeNull()
  })
})
