/**
 * Slide Address Resolver
 *
 * Universal addressing system for slide navigation.
 * Supports: numeric, section, relative, and special addressing.
 *
 * @module slideAddressResolver
 */

import type { SlideData, SlideAddress, ResolvedSlideTarget, SectionIndexMap } from '@renderer/types'

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
        if (slides.length > 0) {
          return {
            slideIndex: 0,
            found: true,
            description: 'First slide',
            address
          }
        }
      }

      if (specialValue === 'last') {
        if (slides.length > 0) {
          const lastIndex = slides.length - 1
          return {
            slideIndex: lastIndex,
            found: true,
            description: `Last slide (${lastIndex + 1})`,
            address
          }
        }
      }

      if (specialValue === 'next-section') {
        for (let i = currentIndex + 1; i < slides.length; i++) {
          if (slides[i].sectionLabel !== slides[currentIndex]?.sectionLabel) {
            return {
              slideIndex: i,
              found: true,
              description: `Next section: ${slides[i].sectionLabel} (Slide ${i + 1})`,
              address
            }
          }
        }
      }

      if (specialValue === 'prev-section') {
        for (let i = currentIndex - 1; i >= 0; i--) {
          if (slides[i].sectionLabel !== slides[currentIndex]?.sectionLabel) {
            return {
              slideIndex: i,
              found: true,
              description: `Previous section: ${slides[i].sectionLabel} (Slide ${i + 1})`,
              address
            }
          }
        }
      }

      return {
        slideIndex: null,
        found: false,
        description: `Special address "${specialValue}" not found`,
        address,
        error: 'SPECIAL_NOT_FOUND'
      }
    }

    default:
      return {
        slideIndex: null,
        found: false,
        description: 'Unknown address type',
        address,
        error: 'UNKNOWN_TYPE'
      }
  }
}

/**
 * Build a section index map from slides
 */
export function buildSectionIndexMap(slides: SlideData[]): SectionIndexMap {
  const map: SectionIndexMap = {}

  for (let i = 0; i < slides.length; i++) {
    const section = (slides[i].sectionLabel || 'untitled').toLowerCase()
    if (!map[section]) {
      map[section] = []
    }
    map[section].push(i)
  }

  return map
}

/**
 * Helper: capitalize a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Fuzzy section matching for typos/variations
 */
function findFuzzySection(input: string, map: SectionIndexMap): string | null {
  const sections = Object.keys(map)

  // Levenshtein distance for fuzzy matching
  const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  // Find closest match
  let best: string | null = null
  let bestDistance = 3 // Threshold

  for (const section of sections) {
    const distance = levenshtein(input, section)
    if (distance < bestDistance) {
      best = section
      bestDistance = distance
    }
  }

  return best
}
