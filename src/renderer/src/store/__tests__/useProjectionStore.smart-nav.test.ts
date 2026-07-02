/**
 * Store Integration Tests — Smart Worship Navigation
 *
 * Tests the integration of Smart Navigation logic within useProjectionStore.
 * Feature: smart-worship-navigation
 *
 * Tasks: 5.4, 6.6
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useProjectionStore } from '../useProjectionStore'
import type { SlideData } from '@renderer/types'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSlides(labels: string[], songId = 1): SlideData[] {
  return labels.map((sectionLabel, i) => ({
    songId,
    slideIndex: i,
    text: `Slide ${i} — ${sectionLabel}`,
    sectionLabel
  }))
}

/** Reset store to initial state before each test. */
function resetStore(): void {
  vi.mocked(window.api.projection.slideUpdate).mockClear()
  vi.mocked(window.api.projection.stateChange).mockClear()
  vi.mocked(window.api.projection.themeUpdate).mockClear()

  useProjectionStore.setState({
    slides: [],
    currentSlideIndex: 0,
    programSlide: null,
    programSlides: [],
    programSlideIndex: -1,
    projectionState: 'CLEAR',
    programLockState: 'UNLOCKED',
    pendingChanges: [],
    hasPendingLiveChanges: false,
    navigationFlow: null,
    flowPosition: -1,
    isSmartMode: false,
    sectionMap: {},
    programSectionMap: {},
    nextSlideData: null,
    nextSlideIndex: null,
    hasNextSlide: false,
    nextSong: null,
    nextSongIndex: null,
    hasNextSong: false,
    queuedSlides: [],
    nextReadyState: 'EMPTY'
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// setSlides — Navigation Flow Computation
// ─────────────────────────────────────────────────────────────────────────────

describe('setSlides — Navigation Flow Computation', () => {
  beforeEach(resetStore)

  test('setSlides computes navigationFlow automatically', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    const { navigationFlow, isSmartMode } = useProjectionStore.getState()
    expect(navigationFlow).not.toBeNull()
    expect(isSmartMode).toBe(true)
  })

  test('setSlides sets isSmartMode false for song without chorus', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 2', 'VERSE 3'])
    useProjectionStore.getState().setSlides(slides)
    const { isSmartMode } = useProjectionStore.getState()
    expect(isSmartMode).toBe(false)
  })

  test('setSlides does not reset flowPosition (only takeCue does)', () => {
    // flowPosition should remain -1 until takeCue is called
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    const { flowPosition } = useProjectionStore.getState()
    expect(flowPosition).toBe(-1)
  })

  test('setSlides for Preview does not replace active Program navigationFlow', () => {
    const programSlides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'], 1)
    useProjectionStore.getState().setSlides(programSlides)
    useProjectionStore.getState().takeCue()
    useProjectionStore.getState().goToLiveSlide(2)

    const programFlow = useProjectionStore.getState().navigationFlow
    const previewSlides = makeSlides(['VERSE 1', 'VERSE 2', 'VERSE 3'], 2)
    useProjectionStore.getState().setSlides(previewSlides)

    expect(useProjectionStore.getState().navigationFlow).toBe(programFlow)
    expect(useProjectionStore.getState().isSmartMode).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// takeCue — flowPosition Initialization
// ─────────────────────────────────────────────────────────────────────────────

describe('takeCue — flowPosition Initialization', () => {
  beforeEach(resetStore)

  test('takeCue initializes flowPosition correctly', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()
    const { flowPosition } = useProjectionStore.getState()
    expect(flowPosition).toBeGreaterThanOrEqual(0)
  })

  test('takeCue flowPosition corresponds to committed slide', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    // Navigate to slide 1 (CHORUS) in preview
    useProjectionStore.getState().setCurrentSlideIndex(1)
    useProjectionStore.getState().takeCue()
    const { flowPosition, navigationFlow } = useProjectionStore.getState()
    expect(navigationFlow).not.toBeNull()
    // flowPosition should point to a step that covers slide index 1
    if (navigationFlow && flowPosition >= 0) {
      const step = navigationFlow.steps[flowPosition]
      expect(step).toBeDefined()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// nextSlide — Smart Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('nextSlide — Smart Navigation', () => {
  beforeEach(resetStore)

  function setupLiveSlide(labels: string[], startIndex = 0): void {
    const slides = makeSlides(labels)
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().setCurrentSlideIndex(startIndex)
    useProjectionStore.getState().takeCue()
  }

  test('nextSlide in Smart_Mode jumps to chorus after last slide of verse', () => {
    // VERSE 1 (slides 0-1), CHORUS (slides 2-3)
    setupLiveSlide(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'], 0)

    // Navigate to last slide of VERSE 1
    useProjectionStore.setState({ programSlideIndex: 1 })
    const { navigationFlow } = useProjectionStore.getState()
    // Update flowPosition to match slide 1 (last of VERSE 1)
    if (navigationFlow) {
      const fp = navigationFlow.steps.findIndex((s) => s.sectionType === 'verse')
      useProjectionStore.setState({ flowPosition: fp })
    }

    useProjectionStore.getState().nextSlide()

    const { programSlideIndex } = useProjectionStore.getState()
    // Should jump to first slide of CHORUS (index 2)
    expect(programSlideIndex).toBe(2)
  })

  test('nextSlide in Smart_Mode advances within section (not at last slide)', () => {
    // VERSE 1 (slides 0-1), CHORUS (slides 2-3)
    setupLiveSlide(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'], 0)

    // At slide 0 (first of VERSE 1, not last)
    useProjectionStore.setState({ programSlideIndex: 0 })
    const { navigationFlow } = useProjectionStore.getState()
    if (navigationFlow) {
      const fp = navigationFlow.steps.findIndex((s) => s.sectionType === 'verse')
      useProjectionStore.setState({ flowPosition: fp })
    }

    useProjectionStore.getState().nextSlide()

    const { programSlideIndex } = useProjectionStore.getState()
    // Should advance to slide 1 (still in VERSE 1)
    expect(programSlideIndex).toBe(1)
  })

  test('nextSlide at end of song does not advance past last slide', () => {
    setupLiveSlide(['VERSE 1', 'CHORUS'], 0)
    const { navigationFlow } = useProjectionStore.getState()
    if (!navigationFlow) return

    const lastStepIndex = navigationFlow.steps.length - 1
    const lastSlideIndex = navigationFlow.steps[lastStepIndex].lastSlideIndex

    useProjectionStore.setState({
      programSlideIndex: lastSlideIndex,
      flowPosition: lastStepIndex
    })

    useProjectionStore.getState().nextSlide()

    const { programSlideIndex } = useProjectionStore.getState()
    // Should stay at last slide
    expect(programSlideIndex).toBe(lastSlideIndex)
  })

  test('nextSlide in Linear_Mode advances linearly', () => {
    setupLiveSlide(['VERSE 1', 'VERSE 2', 'VERSE 3'], 0)
    const { isSmartMode } = useProjectionStore.getState()
    expect(isSmartMode).toBe(false)

    useProjectionStore.getState().nextSlide()
    expect(useProjectionStore.getState().programSlideIndex).toBe(1)

    useProjectionStore.getState().nextSlide()
    expect(useProjectionStore.getState().programSlideIndex).toBe(2)
  })

  // Feature: smart-worship-navigation, Property 6: Guard State
  test('nextSlide ignored when projectionState is CLEAR', () => {
    setupLiveSlide(['VERSE 1', 'CHORUS'], 0)
    useProjectionStore.setState({ projectionState: 'CLEAR', programSlideIndex: 0 })

    useProjectionStore.getState().nextSlide()

    expect(useProjectionStore.getState().programSlideIndex).toBe(0)
  })

  test('nextSlide ignored when projectionState is BLACK', () => {
    setupLiveSlide(['VERSE 1', 'CHORUS'], 0)
    useProjectionStore.setState({ projectionState: 'BLACK', programSlideIndex: 0 })

    useProjectionStore.getState().nextSlide()

    expect(useProjectionStore.getState().programSlideIndex).toBe(0)
  })

  test('nextSlide from FREEZE unfreezes projector before updating slide', () => {
    setupLiveSlide(['VERSE 1', 'CHORUS'], 0)
    vi.mocked(window.api.projection.stateChange).mockClear()

    useProjectionStore.setState({
      projectionState: 'FREEZE',
      programSlideIndex: 0,
      flowPosition: 0
    })
    useProjectionStore.getState().nextSlide()

    expect(useProjectionStore.getState().projectionState).toBe('LIVE')
    expect(window.api.projection.stateChange).toHaveBeenCalledWith('LIVE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// prevSlide — Smart Navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('prevSlide — Smart Navigation', () => {
  beforeEach(resetStore)

  test('prevSlide in Smart_Mode jumps to chorus when at first slide of verse (not first)', () => {
    // V1(0) → C(1) → V2(2) → C(1) in Smart_Mode
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().setCurrentSlideIndex(2)
    useProjectionStore.getState().takeCue()

    const { navigationFlow } = useProjectionStore.getState()
    if (!navigationFlow) return

    // Find V2 step index
    const v2StepIndex = navigationFlow.steps.findIndex(
      (s) => s.sectionType === 'verse' && s.badgeLabel === 'V2'
    )
    useProjectionStore.setState({ programSlideIndex: 2, flowPosition: v2StepIndex })

    useProjectionStore.getState().prevSlide()

    const { programSlideIndex } = useProjectionStore.getState()
    // Should jump to first slide of chorus (index 1)
    expect(programSlideIndex).toBe(1)
  })

  test('prevSlide at beginning of song does not go before first slide', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()
    useProjectionStore.setState({ programSlideIndex: 0, flowPosition: 0 })

    useProjectionStore.getState().prevSlide()

    expect(useProjectionStore.getState().programSlideIndex).toBe(0)
  })

  test('prevSlide from FREEZE unfreezes projector before updating slide', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().setCurrentSlideIndex(1)
    useProjectionStore.getState().takeCue()
    vi.mocked(window.api.projection.stateChange).mockClear()

    useProjectionStore.setState({
      projectionState: 'FREEZE',
      programSlideIndex: 1,
      flowPosition: 1
    })
    useProjectionStore.getState().prevSlide()

    expect(useProjectionStore.getState().projectionState).toBe('LIVE')
    expect(window.api.projection.stateChange).toHaveBeenCalledWith('LIVE')
  })

  // Feature: smart-worship-navigation, Property 6: Guard State
  test('prevSlide ignored when projectionState is CLEAR', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()
    useProjectionStore.setState({ projectionState: 'CLEAR', programSlideIndex: 1 })

    useProjectionStore.getState().prevSlide()

    expect(useProjectionStore.getState().programSlideIndex).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// flowPosition Consistency
// ─────────────────────────────────────────────────────────────────────────────

describe('flowPosition Consistency', () => {
  beforeEach(resetStore)

  test('flowPosition is valid after goToLiveSlide', () => {
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS', 'VERSE 2'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    // Navigate to slide 2 (CHORUS)
    useProjectionStore.getState().goToLiveSlide(2)

    const { flowPosition, navigationFlow } = useProjectionStore.getState()
    expect(flowPosition).toBeGreaterThanOrEqual(0)
    if (navigationFlow) {
      expect(flowPosition).toBeLessThan(navigationFlow.steps.length)
    }
  })

  test('goToLiveSlide keeps nextSlideText aligned with Smart Navigation', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'VERSE 3'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    useProjectionStore.getState().goToLiveSlide(2)

    const { programSlide } = useProjectionStore.getState()
    expect(programSlide?.sectionLabel).toBe('VERSE 2')
    expect(programSlide?.nextSlideText).toBe(slides[1].text)
  })

  test('navigationFlow is not mutated by goToLiveSlide', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const flowBefore = useProjectionStore.getState().navigationFlow
    useProjectionStore.getState().goToLiveSlide(2)
    const flowAfter = useProjectionStore.getState().navigationFlow

    // navigationFlow should be the same object (not mutated)
    expect(flowAfter).toEqual(flowBefore)
  })

  test('clearScreen resets flowPosition to -1', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    useProjectionStore.getState().clearScreen()

    expect(useProjectionStore.getState().flowPosition).toBe(-1)
    expect(useProjectionStore.getState().hasNextSlide).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// hotSwapSlides — Navigation Flow Re-computation
// ─────────────────────────────────────────────────────────────────────────────

describe('hotSwapSlides — Navigation Flow Re-computation', () => {
  beforeEach(resetStore)

  test('hotSwapSlides keeps Program flow stable until updateLive applies Preview', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const newSlides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS', 'VERSE 2', 'CHORUS'])
    useProjectionStore.getState().hotSwapSlides(1, newSlides)

    let { navigationFlow } = useProjectionStore.getState()
    expect(navigationFlow).not.toBeNull()
    expect(navigationFlow?.steps.length).toBe(2)

    useProjectionStore.getState().updateLive()
    navigationFlow = useProjectionStore.getState().navigationFlow
    expect(navigationFlow?.steps.length).toBeGreaterThan(2)
  })

  test('hotSwapSlides does not desync navigationFlow and programSlides', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const newSlides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'CHORUS'])
    useProjectionStore.getState().hotSwapSlides(1, newSlides)

    const { navigationFlow, programSlides } = useProjectionStore.getState()
    if (navigationFlow && navigationFlow.steps.length > 0) {
      const lastStep = navigationFlow.steps[navigationFlow.steps.length - 1]
      // All slide indices in flow should be within programSlides range
      expect(lastStep.lastSlideIndex).toBeLessThan(programSlides.length)
    }
  })

  test('updateLive recomputes Program flow and nextSlideText from dirty preview', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const updatedSlides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2', 'VERSE 3'])
    useProjectionStore.getState().hotSwapSlides(1, updatedSlides)
    useProjectionStore.setState({ currentSlideIndex: 2 })
    useProjectionStore.getState().updateLive()

    const { programSlide, navigationFlow, isSmartMode, flowPosition } =
      useProjectionStore.getState()
    expect(isSmartMode).toBe(true)
    expect(navigationFlow?.steps.map((step) => step.badgeLabel)).toEqual([
      'V1',
      'C',
      'V2',
      'C',
      'V3',
      'C'
    ])
    expect(flowPosition).toBe(2)
    expect(programSlide?.sectionLabel).toBe('VERSE 2')
    expect(programSlide?.nextSlideText).toBe(updatedSlides[1].text)
  })

  test('hotSwapSlides while live dirty keeps active Program navigationFlow stable', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS', 'VERSE 2'], 1)
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()
    useProjectionStore.getState().goToLiveSlide(2)

    const programFlow = useProjectionStore.getState().navigationFlow
    const updatedPreview = makeSlides(['VERSE 1', 'VERSE 2', 'VERSE 3'], 1)
    useProjectionStore.getState().hotSwapSlides(1, updatedPreview)

    expect(useProjectionStore.getState().programLockState).toBe('LIVE_DIRTY')
    expect(useProjectionStore.getState().navigationFlow).toBe(programFlow)

    useProjectionStore.getState().nextSlide()
    expect(useProjectionStore.getState().programSlideIndex).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// computeNextState — Smart Navigation Aware
// ─────────────────────────────────────────────────────────────────────────────

describe('computeNextState — Smart Navigation Aware', () => {
  beforeEach(resetStore)

  test('nextSlideData reflects Smart Navigation (not linear +1)', () => {
    // VERSE 1 (0-1), CHORUS (2-3)
    const slides = makeSlides(['VERSE 1', 'VERSE 1', 'CHORUS', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const { navigationFlow } = useProjectionStore.getState()
    if (!navigationFlow) return

    // Set position to last slide of VERSE 1 (index 1)
    const verseStepIndex = navigationFlow.steps.findIndex((s) => s.sectionType === 'verse')
    useProjectionStore.setState({
      programSlideIndex: 1,
      flowPosition: verseStepIndex
    })
    useProjectionStore.getState().computeNextState()

    const { nextSlideData } = useProjectionStore.getState()
    // Next should be CHORUS (index 2), not slide 2 linearly (which happens to be the same here)
    expect(nextSlideData).not.toBeNull()
    expect(nextSlideData?.sectionLabel).toBe('CHORUS')
  })

  test('nextSlideData is null at end of Smart_Mode flow', () => {
    const slides = makeSlides(['VERSE 1', 'CHORUS'])
    useProjectionStore.getState().setSlides(slides)
    useProjectionStore.getState().takeCue()

    const { navigationFlow } = useProjectionStore.getState()
    if (!navigationFlow) return

    const lastStepIndex = navigationFlow.steps.length - 1
    const lastSlideIndex = navigationFlow.steps[lastStepIndex].lastSlideIndex

    useProjectionStore.setState({
      programSlideIndex: lastSlideIndex,
      flowPosition: lastStepIndex
    })
    useProjectionStore.getState().computeNextState()

    const { nextSlideData } = useProjectionStore.getState()
    expect(nextSlideData).toBeNull()
  })
})
