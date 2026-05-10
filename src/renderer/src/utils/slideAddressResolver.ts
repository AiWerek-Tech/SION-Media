/**
 * Slide Address Resolver
 *
 * Universal addressing system for slide navigation.
 * Supports: numeric, section, relative, and special addressing.
 *
 * @module slideAddressResolver
 */

import type {
  SlideData,
  SlideAddress,
  ResolvedSlideTarget,
  SectionIndexMap,
  QuickJumpTarget
} from '../types'

/**
 * Parse a raw input string into a SlideAddress
 *
 * @param input - Raw input (e.g., "5", "chorus", "+1", "last")
 * @returns Parsed SlideAddress
 */
export function parseSlideAddress(input: string): SlideAddress {
  const trimmed = input.trim().toLowerCase()

  // Special keywords
  if (trimmed === 'first' || trimmed === 'start' || trimmed === 'beginning') {
    return { type: 'SPECIAL', value: 'first' }
  }
  if (trimmed === 'last' || trimmed === 'end') {
    return { type: 'SPECIAL', value: 'last' }
  }
  if (trimmed === 'next-section' || trimmed === 'next section') {
    return { type: 'SPECIAL', value: 'next-section' }
  }
  if (trimmed === 'prev-section' || trimmed === 'previous-section' || trimmed === 'prev section') {
    return { type: 'SPECIAL', value: 'prev-section' }
  }

  // Relative navigation (+N, -N, next, prev)
  if (trimmed === 'next' || trimmed === '+1') {
    return { type: 'RELATIVE', value: '+1' }
  }
  if (trimmed === 'prev' || trimmed === 'previous' || trimmed === '-1') {
    return { type: 'RELATIVE', value: '-1' }
  }
  const relativeMatch = trimmed.match(/^([+-])(\d+)$/)
  if (relativeMatch) {
    return { type: 'RELATIVE', value: trimmed }
  }

  // Numeric (slide number, 1-indexed)
  const numericMatch = trimmed.match(/^(\d+)$/)
  if (numericMatch) {
    return { type: 'NUMERIC', value: parseInt(numericMatch[1], 10) }
  }

  // Prefixed formats (slide:5, section:chorus)
  if (trimmed.startsWith('slide:')) {
    const num = parseInt(trimmed.slice(6), 10)
    if (!isNaN(num)) {
      return { type: 'NUMERIC', value: num }
    }
  }
  if (trimmed.startsWith('section:') || trimmed.startsWith('s:')) {
    const section = trimmed.startsWith('s:') ? trimmed.slice(2) : trimmed.slice(8)
    return { type: 'SECTION', value: section }
  }

  // Default: treat as section name
  return { type: 'SECTION', value: trimmed }
}

/**
 * Resolve a SlideAddress to a concrete slide index
 *
 * @param address - The slide address to resolve
 * @param slides - Current slide array
 * @param sectionMap - Section to index mapping
 * @param currentIndex - Current position (for relative navigation)
 * @returns Resolved target with slide index and metadata
 */
export function resolveSlideAddress(
  address: SlideAddress,
  slides: SlideData[],
  sectionMap: SectionIndexMap,
  currentIndex: number
): ResolvedSlideTarget {
  const totalSlides = slides.length

  if (totalSlides === 0) {
    return {
      slideIndex: null,
      found: false,
      description: 'No slides loaded',
      address,
      error: 'NO_SLIDES'
    }
  }

  switch (address.type) {
    case 'NUMERIC': {
      // Convert 1-indexed to 0-indexed
      const targetIndex = (address.value as number) - 1
      if (targetIndex >= 0 && targetIndex < totalSlides) {
        const slide = slides[targetIndex]
        return {
          slideIndex: targetIndex,
          found: true,
          description: `Slide ${targetIndex + 1}${slide.sectionLabel ? ` (${slide.sectionLabel})` : ''}`,
          address
        }
      }
      return {
        slideIndex: null,
        found: false,
        description: `Slide ${address.value} not found`,
        address,
        error: 'OUT_OF_RANGE'
      }
    }

    case 'SECTION': {
      const sectionName = (address.value as string).toLowerCase()
      const indices = sectionMap[sectionName]

      if (indices && indices.length > 0) {
        // Find the next occurrence from current position, or first if none ahead
        let targetIndex = indices.find((i) => i > currentIndex)
        if (targetIndex === undefined) {
          // Wrap around to first occurrence
          targetIndex = indices[0]
        }

        return {
          slideIndex: targetIndex,
          found: true,
          description: `${capitalize(sectionName)} (Slide ${targetIndex + 1})`,
          address
        }
      }

      // Try fuzzy matching
      const fuzzyMatch = findFuzzySection(sectionName, sectionMap)
      if (fuzzyMatch) {
        const targetIndex = sectionMap[fuzzyMatch][0]
        return {
          slideIndex: targetIndex,
          found: true,
          description: `${capitalize(fuzzyMatch)} (Slide ${targetIndex + 1}) — fuzzy match`,
          address
        }
      }

      return {
        slideIndex: null,
        found: false,
        description: `Section "${sectionName}" not found`,
        address,
        error: 'SECTION_NOT_FOUND'
      }
    }

    case 'RELATIVE': {
      const relativeValue = address.value as string
      let offset = 0

      if (relativeValue === '+1' || relativeValue === 'next') {
        offset = 1
      } else if (relativeValue === '-1' || relativeValue === 'prev') {
        offset = -1
      } else {
        const match = relativeValue.match(/^([+-])(\d+)$/)
        if (match) {
          offset = parseInt(match[1] + match[2], 10)
        }
      }

      const targetIndex = currentIndex + offset

      if (targetIndex >= 0 && targetIndex < totalSlides) {
        const slide = slides[targetIndex]
        const direction = offset > 0 ? 'Forward' : 'Back'
        return {
          slideIndex: targetIndex,
          found: true,
          description: `${direction} ${Math.abs(offset)} → Slide ${targetIndex + 1}${slide.sectionLabel ? ` (${slide.sectionLabel})` : ''}`,
          address
        }
      }

      return {
        slideIndex: null,
        found: false,
        description: `Cannot navigate ${offset > 0 ? 'forward' : 'backward'} ${Math.abs(offset)} slides`,
        address,
        error: 'OUT_OF_RANGE'
      }
    }

    case 'SPECIAL': {
      const specialValue = address.value as string

      if (specialValue === 'first') {
        const firstSlide = slides[0]
        return {
          slideIndex: 0,
          found: true,
          description: `First slide${firstSlide.sectionLabel ? ` (${firstSlide.sectionLabel})` : ''}`,
          address
        }
      }

      if (specialValue === 'last') {
        const lastIndex = totalSlides - 1
        const lastSlide = slides[lastIndex]
        return {
          slideIndex: lastIndex,
          found: true,
          description: `Last slide${lastSlide.sectionLabel ? ` (${lastSlide.sectionLabel})` : ''}`,
          address
        }
      }

      if (specialValue === 'next-section') {
        // Find next section different from current
        const currentSection = slides[currentIndex]?.sectionLabel?.toLowerCase()
        for (let i = currentIndex + 1; i < totalSlides; i++) {
          const nextSection = slides[i].sectionLabel?.toLowerCase()
          if (nextSection && nextSection !== currentSection) {
            return {
              slideIndex: i,
              found: true,
              description: `Next section: ${capitalize(nextSection)} (Slide ${i + 1})`,
              address
            }
          }
        }
        return {
          slideIndex: null,
          found: false,
          description: 'No next section found',
          address,
          error: 'NO_NEXT_SECTION'
        }
      }

      if (specialValue === 'prev-section') {
        // Find previous section different from current
        const currentSection = slides[currentIndex]?.sectionLabel?.toLowerCase()
        for (let i = currentIndex - 1; i >= 0; i--) {
          const prevSection = slides[i].sectionLabel?.toLowerCase()
          if (prevSection && prevSection !== currentSection) {
            return {
              slideIndex: i,
              found: true,
              description: `Previous section: ${capitalize(prevSection)} (Slide ${i + 1})`,
              address
            }
          }
        }
        return {
          slideIndex: null,
          found: false,
          description: 'No previous section found',
          address,
          error: 'NO_PREV_SECTION'
        }
      }

      return {
        slideIndex: null,
        found: false,
        description: `Unknown special target: ${specialValue}`,
        address,
        error: 'UNKNOWN_SPECIAL'
      }
    }

    default:
      return {
        slideIndex: null,
        found: false,
        description: 'Invalid address type',
        address,
        error: 'INVALID_TYPE'
      }
  }
}

/**
 * Build a section index map from slide data
 *
 * @param slides - Array of slides
 * @returns Map of section labels to slide indices
 */
export function buildSectionIndexMap(slides: SlideData[]): SectionIndexMap {
  const map: SectionIndexMap = {}

  for (let i = 0; i < slides.length; i++) {
    const section = slides[i].sectionLabel?.toLowerCase().trim()
    if (section && section !== '') {
      if (!map[section]) {
        map[section] = []
      }
      map[section].push(i)
    }
  }

  return map
}

/**
 * Generate quick jump targets from slides
 *
 * @param slides - Array of slides
 * @param sectionMap - Section to index mapping
 * @returns Array of QuickJumpTarget for UI
 */
export function generateQuickJumpTargets(
  slides: SlideData[],
  sectionMap: SectionIndexMap
): QuickJumpTarget[] {
  const targets: QuickJumpTarget[] = []

  // Add special targets
  targets.push({
    label: 'First Slide',
    slideIndex: 0,
    type: 'special',
    shortcut: 'G 1'
  })
  targets.push({
    label: 'Last Slide',
    slideIndex: slides.length - 1,
    type: 'special',
    shortcut: 'G L'
  })

  // Add section targets (unique sections only, first occurrence)
  const seenSections = new Set<string>()
  for (const [section, indices] of Object.entries(sectionMap)) {
    if (!seenSections.has(section) && indices.length > 0) {
      seenSections.add(section)
      targets.push({
        label: capitalize(section),
        slideIndex: indices[0],
        section,
        type: 'section',
        shortcut: `S ${section.charAt(0).toUpperCase()}`
      })
    }
  }

  // Add slide targets
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    targets.push({
      label: `Slide ${i + 1}${slide.sectionLabel ? ` — ${slide.sectionLabel}` : ''}`,
      slideIndex: i,
      section: slide.sectionLabel,
      type: 'slide',
      shortcut: `G ${i + 1}`
    })
  }

  return targets
}

/**
 * Filter quick jump targets by search query
 *
 * @param targets - All available targets
 * @param query - Search query
 * @returns Filtered targets
 */
export function filterQuickJumpTargets(
  targets: QuickJumpTarget[],
  query: string
): QuickJumpTarget[] {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    // Return special and section targets first, then slides
    return [
      ...targets.filter((t) => t.type === 'special'),
      ...targets.filter((t) => t.type === 'section'),
      ...targets.filter((t) => t.type === 'slide').slice(0, 5)
    ]
  }

  return targets.filter((target) => {
    const label = target.label.toLowerCase()
    const section = target.section?.toLowerCase() || ''

    // Exact prefix match gets priority
    if (label.startsWith(lowerQuery) || section.startsWith(lowerQuery)) {
      return true
    }

    // Contains match
    if (label.includes(lowerQuery) || section.includes(lowerQuery)) {
      return true
    }

    // Numeric match for slide numbers
    const numericMatch = lowerQuery.match(/^(\d+)$/)
    if (numericMatch && target.type === 'slide') {
      const slideNum = (target.slideIndex + 1).toString()
      if (slideNum === numericMatch[1]) {
        return true
      }
    }

    return false
  })
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Find a section using fuzzy matching
 */
function findFuzzySection(input: string, sectionMap: SectionIndexMap): string | null {
  const sections = Object.keys(sectionMap)

  // Exact match (already handled, but just in case)
  if (sections.includes(input)) {
    return input
  }

  // Prefix match
  const prefixMatch = sections.find((s) => s.startsWith(input))
  if (prefixMatch) {
    return prefixMatch
  }

  // Contains match
  const containsMatch = sections.find((s) => s.includes(input))
  if (containsMatch) {
    return containsMatch
  }

  // Common abbreviations
  const abbreviations: Record<string, string> = {
    v: 'verse',
    c: 'chorus',
    b: 'bridge',
    i: 'intro',
    o: 'outro',
    p: 'pre-chorus',
    pc: 'pre-chorus'
  }

  if (abbreviations[input]) {
    const expanded = abbreviations[input]
    if (sections.includes(expanded)) {
      return expanded
    }
  }

  return null
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
