/**
 * Navigation Flow Engine
 *
 * Pure, stateless functions that compute worship-aware navigation for the
 * projection runtime. All functions are deterministic and side-effect-free.
 *
 * Core concept:
 *   - Smart_Mode  (song has chorus): V1 → C → V2 → C → V3 → C → ...
 *   - Linear_Mode (no chorus):       V1 → V2 → V3 → ... (existing behaviour)
 *
 * The engine operates on SlideData[] and NavigationFlow — it never touches
 * Zustand state directly. The store calls these functions and applies results.
 */

import type {
  SlideData,
  SectionType,
  SectionBoundary,
  NavigationFlow,
  NavigationFlowStep
} from '@renderer/types'

// ─────────────────────────────────────────────────────────────────────────────
// Section Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a raw sectionLabel string into a SectionType.
 *
 * Priority order (first match wins):
 *   verse → chorus → bridge → intro → ending → other
 *
 * Case-insensitive. Deterministic for identical inputs.
 */
export function classifySectionLabel(label: string): SectionType {
  if (!label) return 'other'
  const lower = label.toLowerCase()

  if (lower.includes('verse') || lower.includes('bait')) return 'verse'
  if (
    lower.includes('chorus') ||
    lower.includes('korus') ||
    lower.includes('reff') ||
    lower.includes('ref') ||
    lower.includes('refrain')
  )
    return 'chorus'
  if (lower.includes('bridge')) return 'bridge'
  if (lower.includes('intro')) return 'intro'
  if (lower.includes('ending') || lower.includes('outro') || lower.includes('tag')) return 'ending'

  return 'other'
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Boundary Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract contiguous section boundaries from a SlideData array.
 *
 * A new boundary starts whenever sectionLabel changes from the previous slide.
 * Slides with the same sectionLabel in sequence belong to the same boundary.
 *
 * @returns Array of SectionBoundary in original slide order.
 */
export function extractSectionBoundaries(slides: SlideData[]): SectionBoundary[] {
  if (!slides || slides.length === 0) return []

  const boundaries: SectionBoundary[] = []
  let currentLabel = slides[0].sectionLabel
  let currentSectionId = slides[0].sectionId
  let firstIndex = 0

  for (let i = 1; i <= slides.length; i++) {
    const label = i < slides.length ? slides[i].sectionLabel : null
    const sectionId = i < slides.length ? slides[i].sectionId : null
    const hasSectionIds = currentSectionId !== undefined && sectionId !== undefined
    const isSameSection = hasSectionIds ? sectionId === currentSectionId : label === currentLabel

    if (!isSameSection) {
      boundaries.push({
        sectionLabel: currentLabel,
        sectionType: classifySectionLabel(currentLabel),
        firstSlideIndex: firstIndex,
        lastSlideIndex: i - 1
      })
      if (i < slides.length) {
        currentLabel = label!
        currentSectionId = sectionId ?? undefined
        firstIndex = i
      }
    }
  }

  return boundaries
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge Label Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a short badge label for display in the Worship Flow Indicator.
 *
 * @param sectionType  Classified type
 * @param sectionLabel Original raw label
 * @param verseOccurrence 1-indexed occurrence counter (only meaningful for verse)
 */
export function generateBadgeLabel(
  sectionType: SectionType,
  sectionLabel: string,
  verseOccurrence: number
): string {
  switch (sectionType) {
    case 'verse':
      return `V${verseOccurrence}`
    case 'chorus':
      return 'C'
    case 'bridge':
      return 'B'
    case 'intro':
      return 'I'
    case 'ending':
      return 'E'
    case 'other':
      return sectionLabel.slice(0, 2).toUpperCase() || 'X'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation Flow Resolution
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a SectionBoundary to a NavigationFlowStep with a badge label. */
function toStep(boundary: SectionBoundary, verseOccurrence: number): NavigationFlowStep {
  return {
    sectionType: boundary.sectionType,
    sectionLabel: boundary.sectionLabel,
    firstSlideIndex: boundary.firstSlideIndex,
    lastSlideIndex: boundary.lastSlideIndex,
    badgeLabel: generateBadgeLabel(boundary.sectionType, boundary.sectionLabel, verseOccurrence)
  }
}

/** Build a Linear_Mode flow — steps mirror original section order. */
function resolveLinearFlow(boundaries: SectionBoundary[]): NavigationFlow {
  let verseCounter = 0
  const steps: NavigationFlowStep[] = boundaries.map((b) => {
    if (b.sectionType === 'verse') verseCounter++
    return toStep(b, verseCounter)
  })
  return { steps, isSmartMode: false }
}

/**
 * Build a Smart_Mode flow — worship pattern:
 *   [Intro?] → V1 → C → V2 → C → [Bridge?] → Vn → C → [Ending?]
 *
 * Rules (per design spec):
 * - Intro (if present) goes first.
 * - For each verse except the last: verse → canonicalChorus
 * - If bridge exists: insert bridge before the last verse
 * - Last verse → canonicalChorus
 * - Ending (if present) goes last.
 * - 'other' sections are appended before ending.
 *
 * The canonical chorus is the FIRST chorus boundary found in the song.
 * It is reused (same firstSlideIndex/lastSlideIndex) for every chorus step.
 */
function resolveSmartFlow(boundaries: SectionBoundary[]): NavigationFlow {
  // Partition boundaries by type
  const intros = boundaries.filter((b) => b.sectionType === 'intro')
  const verses = boundaries.filter((b) => b.sectionType === 'verse')
  const choruses = boundaries.filter((b) => b.sectionType === 'chorus')
  const bridges = boundaries.filter((b) => b.sectionType === 'bridge')
  const endings = boundaries.filter((b) => b.sectionType === 'ending')
  const others = boundaries.filter((b) => b.sectionType === 'other')

  const canonicalChorus = choruses[0] // reused for every chorus step
  const bridge = bridges[0] ?? null
  const ending = endings[0] ?? null

  const steps: NavigationFlowStep[] = []

  // 1. Intro
  if (intros.length > 0) {
    steps.push(toStep(intros[0], 0))
  }

  if (verses.length === 0) {
    // Edge case: song has chorus but no verses — play remaining sections linearly
    let verseCounter = 0
    for (const b of boundaries) {
      if (b.sectionType === 'verse') verseCounter++
      if (b.sectionType !== 'intro' && b.sectionType !== 'ending') {
        steps.push(toStep(b, verseCounter))
      }
    }
  } else {
    // 2. Build verse → chorus interleaved pattern
    for (let i = 0; i < verses.length; i++) {
      const verseOccurrence = i + 1
      const isLastVerse = i === verses.length - 1

      // Per design spec step (c): insert bridge before the last verse
      if (bridge && isLastVerse) {
        steps.push(toStep(bridge, 0))
      }

      // Verse
      steps.push(toStep(verses[i], verseOccurrence))

      // Chorus after every verse (including last) — per design spec steps (b) and (e)
      steps.push(toStep(canonicalChorus, 0))
    }
  }

  // 3. 'other' sections — append before ending (simple placement)
  for (const other of others) {
    steps.push(toStep(other, 0))
  }

  // 4. Ending
  if (ending) {
    steps.push(toStep(ending, 0))
  }

  return { steps, isSmartMode: true }
}

/**
 * Compute the NavigationFlow for a given SlideData array.
 *
 * - Returns empty flow for null/empty input (no exceptions thrown).
 * - Activates Smart_Mode when the song has at least one chorus section.
 * - Idempotent: same input always produces same output.
 */
export function resolveNavigationFlow(slides: SlideData[] | null | undefined): NavigationFlow {
  if (!slides || slides.length === 0) {
    return { steps: [], isSmartMode: false }
  }

  const boundaries = extractSectionBoundaries(slides)
  if (boundaries.length === 0) {
    return { steps: [], isSmartMode: false }
  }

  const hasChorus = boundaries.some((b) => b.sectionType === 'chorus')
  return hasChorus ? resolveSmartFlow(boundaries) : resolveLinearFlow(boundaries)
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow Position Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the flowPosition (index into flow.steps) that corresponds to a
 * given slideIndex.
 *
 * For sections that appear only once (verse, bridge, intro, ending), there is
 * exactly one matching step — straightforward.
 *
 * For chorus (which appears multiple times in Smart_Mode with the same
 * firstSlideIndex/lastSlideIndex), we use `currentFlowPosition` as a hint:
 * - If provided and the current step already covers slideIndex, keep it.
 * - Otherwise find the FIRST matching step at or after currentFlowPosition.
 * - Fall back to the first matching step if nothing found forward.
 *
 * This prevents the "stuck at chorus" bug where resolveFlowPosition always
 * returned the last chorus occurrence, causing computeSmartNext to loop back.
 *
 * @param slideIndex         Target slide index to resolve
 * @param flow               The NavigationFlow
 * @param currentFlowPosition Optional hint — current position in flow (default -1)
 * @returns Step index (≥0), or 0 as fallback.
 */
export function resolveFlowPosition(
  slideIndex: number,
  flow: NavigationFlow,
  currentFlowPosition = -1
): number {
  if (!flow || flow.steps.length === 0 || slideIndex < 0) return -1

  // First: check if the current step already covers this slideIndex (no-op move)
  if (currentFlowPosition >= 0 && currentFlowPosition < flow.steps.length) {
    const currentStep = flow.steps[currentFlowPosition]
    if (slideIndex >= currentStep.firstSlideIndex && slideIndex <= currentStep.lastSlideIndex) {
      return currentFlowPosition
    }
  }

  // Second: find the first matching step at or after currentFlowPosition
  const searchFrom = Math.max(0, currentFlowPosition)
  for (let i = searchFrom; i < flow.steps.length; i++) {
    const step = flow.steps[i]
    if (slideIndex >= step.firstSlideIndex && slideIndex <= step.lastSlideIndex) {
      return i
    }
  }

  // Third: search from the beginning (for prev navigation going backwards)
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i]
    if (slideIndex >= step.firstSlideIndex && slideIndex <= step.lastSlideIndex) {
      return i
    }
  }

  // Fallback to step 0
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Navigation Resolvers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the target slideIndex for a "Next" action in Smart_Mode.
 *
 * Within a section: advance one slide (linear).
 * At the last slide of a section: jump to firstSlideIndex of the next flow step.
 * At the last slide of the last step: return null (end of song).
 *
 * Falls back to linear (currentSlideIndex + 1) when not in Smart_Mode.
 *
 * @returns Target slideIndex, or null if already at end of song.
 */
export function computeSmartNext(
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): number | null {
  if (!flow.isSmartMode || flow.steps.length === 0) {
    // Linear fallback — caller must clamp to slides.length - 1
    return currentSlideIndex + 1
  }

  const currentStep = flow.steps[flowPosition]
  if (!currentStep) return null

  // Still inside the current section — advance one slide
  if (currentSlideIndex < currentStep.lastSlideIndex) {
    return currentSlideIndex + 1
  }

  // At the last slide of the current section — jump to next flow step
  const nextFlowPos = flowPosition + 1
  if (nextFlowPos >= flow.steps.length) {
    return null // end of song
  }

  return flow.steps[nextFlowPos].firstSlideIndex
}

/**
 * Compute the target slideIndex for a "Previous" action in Smart_Mode.
 *
 * Within a section (not at first slide): go back one slide (linear).
 * At the first slide of a section: jump to firstSlideIndex of the previous flow step.
 * At the first slide of the first step: return null (beginning of song).
 *
 * Falls back to linear (currentSlideIndex - 1) when not in Smart_Mode.
 *
 * @returns Target slideIndex, or null if already at beginning of song.
 */
export function computeSmartPrev(
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): number | null {
  if (!flow.isSmartMode || flow.steps.length === 0) {
    // Linear fallback — caller must clamp to 0
    return currentSlideIndex - 1
  }

  const currentStep = flow.steps[flowPosition]
  if (!currentStep) return null

  // Still inside the current section — go back one slide
  if (currentSlideIndex > currentStep.firstSlideIndex) {
    return currentSlideIndex - 1
  }

  // At the first slide of the current section — jump to previous flow step
  const prevFlowPos = flowPosition - 1
  if (prevFlowPos < 0) {
    return null // beginning of song
  }

  // Jump to the LAST slide of the previous section, not the first.
  // This matches natural backward navigation: pressing Prev from the first
  // slide of Verse 2 should land on the last slide of the Chorus, so the
  // operator can review the ending lines before going further back.
  return flow.steps[prevFlowPos].lastSlideIndex
}

/**
 * Compute the SlideData that will be shown after the next "Next" action.
 * Used to populate the nextSlideData preview in the store.
 *
 * @returns The next SlideData, or null if at end of song.
 */
export function computeSmartNextSlideData(
  slides: SlideData[],
  currentSlideIndex: number,
  flow: NavigationFlow,
  flowPosition: number
): SlideData | null {
  const nextIndex = computeSmartNext(currentSlideIndex, flow, flowPosition)
  if (nextIndex === null || nextIndex >= slides.length) return null
  return slides[nextIndex] ?? null
}
