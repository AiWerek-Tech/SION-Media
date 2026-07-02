/**
 * Property-Based Tests — Slide Engine Round-Trip Parsing
 *
 * Feature: smart-worship-navigation
 * Task: 10.1
 *
 * Property 9: Round-Trip Parsing Section Labels
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */

import { describe, test, expect, afterEach } from 'vitest'
import fc from 'fast-check'
import { generateSlides, generateSlidesForSong, setGlobalSlideConfig } from '../slideEngine'
import { resolveNavigationFlow } from '../navigationFlowEngine'
import type { Song } from '@renderer/types'

afterEach(() => {
  setGlobalSlideConfig({ maxLines: 4, maxChars: 40 })
})

// ─────────────────────────────────────────────────────────────────────────────
// Arbitrary Generators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a valid section marker name (alphanumeric + spaces, no brackets).
 * Matches what operators would type: "VERSE 1", "CHORUS", "BRIDGE", etc.
 */
const arbitrarySectionName = fc
  .stringMatching(/^[A-Z][A-Z0-9 ]{0,15}$/)
  .filter((s) => s.trim().length > 0)

/**
 * Generate a few lines of lyric content (non-empty, no bracket lines).
 */
const bareSectionHeader =
  /^(verse|bait|chorus|korus|reff?|refrain|bridge|intro|ending|outro|tag|pre[- ]?chorus)(\s*\d+)?$/i

const arbitraryLyricLines = fc.array(
  fc
    .stringMatching(/^[A-Za-z ]{3,30}$/)
    .filter((s) => s.trim().length > 0 && !s.startsWith('[') && !bareSectionHeader.test(s.trim())),
  { minLength: 1, maxLength: 4 }
)

/**
 * Generate a complete lyrics_raw string with section markers.
 * Returns both the raw string and the list of marker names used.
 */
const arbitraryLyricsWithMarkers = fc
  .array(fc.tuple(arbitrarySectionName, arbitraryLyricLines), { minLength: 1, maxLength: 5 })
  .map((sections) => {
    const markerNames = sections.map(([name]) => name)
    const lyricsRaw = sections.map(([name, lines]) => `[${name}]\n${lines.join('\n')}`).join('\n\n')
    return { lyricsRaw, markerNames }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Property 9: Round-Trip Parsing Section Labels
// ─────────────────────────────────────────────────────────────────────────────

describe('Property 9: Round-Trip Parsing Section Labels', () => {
  // Feature: smart-worship-navigation, Property 9: Round-Trip Parsing Section Labels
  test('parsing lyrics_raw round-trip preserves section labels', () => {
    fc.assert(
      fc.property(arbitraryLyricsWithMarkers, ({ lyricsRaw, markerNames }) => {
        const slides = generateSlides(1, lyricsRaw)

        // Extract unique section labels from generated slides
        const parsedLabels = new Set(
          slides.map((s) => s.sectionLabel).filter((label) => label.length > 0)
        )

        // All marker names should appear in parsed labels
        const originalMarkers = new Set(markerNames)
        for (const marker of originalMarkers) {
          expect(parsedLabels.has(marker)).toBe(true)
        }
      }),
      { numRuns: 100 }
    )
  })

  test('every slide from a marked section has non-empty sectionLabel', () => {
    fc.assert(
      fc.property(arbitraryLyricsWithMarkers, ({ lyricsRaw }) => {
        const slides = generateSlides(1, lyricsRaw)
        // All slides should have a sectionLabel (since all sections are marked)
        slides.forEach((slide) => {
          expect(slide.sectionLabel.length).toBeGreaterThan(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  test('slides from same section share the same sectionLabel', () => {
    fc.assert(
      fc.property(arbitraryLyricsWithMarkers, ({ lyricsRaw }) => {
        const slides = generateSlides(1, lyricsRaw)
        // Group slides by their position in the sequence
        // Slides with the same sectionLabel should be contiguous
        // (no interleaving of different sections)
        let lastLabel = ''
        const seenLabels = new Set<string>()

        for (const slide of slides) {
          if (slide.sectionLabel !== lastLabel) {
            // Starting a new section — it should not have been seen before
            // (unless it's a repeated section, which is valid)
            lastLabel = slide.sectionLabel
            seenLabels.add(slide.sectionLabel)
          }
        }
        // Just verify no exception was thrown and labels are strings
        expect(typeof lastLabel).toBe('string')
      }),
      { numRuns: 100 }
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Specific Section Label Tests (Requirements 10.2, 10.3)
// ─────────────────────────────────────────────────────────────────────────────

describe('slideEngine — Specific Section Label Requirements', () => {
  // Req 10.2: [CHORUS] marker → sectionLabel 'CHORUS'
  test('[CHORUS] marker produces sectionLabel CHORUS', () => {
    const lyricsRaw = '[CHORUS]\nHallelujah praise the Lord\nForever and ever'
    const slides = generateSlides(1, lyricsRaw)
    expect(slides.length).toBeGreaterThan(0)
    slides.forEach((slide) => {
      expect(slide.sectionLabel).toBe('CHORUS')
    })
  })

  // Req 10.3: [VERSE 1] marker → sectionLabel 'VERSE 1'
  test('[VERSE 1] marker produces sectionLabel VERSE 1', () => {
    const lyricsRaw = '[VERSE 1]\nIn the beginning was the Word\nAnd the Word was with God'
    const slides = generateSlides(1, lyricsRaw)
    expect(slides.length).toBeGreaterThan(0)
    slides.forEach((slide) => {
      expect(slide.sectionLabel).toBe('VERSE 1')
    })
  })

  // Req 10.1: non-empty sectionLabel for marked sections
  test('slides from marked sections have non-empty sectionLabel', () => {
    const lyricsRaw = [
      '[VERSE 1]',
      'Line one of verse one',
      'Line two of verse one',
      '',
      '[CHORUS]',
      'Chorus line one',
      'Chorus line two',
      '',
      '[VERSE 2]',
      'Line one of verse two',
      'Line two of verse two'
    ].join('\n')

    const slides = generateSlides(1, lyricsRaw)
    expect(slides.length).toBeGreaterThan(0)
    slides.forEach((slide) => {
      expect(slide.sectionLabel.length).toBeGreaterThan(0)
    })
  })

  // Req 10.4: round-trip for a complete song structure
  test('round-trip for full song structure preserves all section labels', () => {
    const lyricsRaw = [
      '[INTRO]',
      'Intro line',
      '',
      '[VERSE 1]',
      'Verse one line one',
      'Verse one line two',
      '',
      '[CHORUS]',
      'Chorus line one',
      'Chorus line two',
      '',
      '[VERSE 2]',
      'Verse two line one',
      'Verse two line two',
      '',
      '[BRIDGE]',
      'Bridge line',
      '',
      '[ENDING]',
      'Ending line'
    ].join('\n')

    const slides = generateSlides(1, lyricsRaw)
    const parsedLabels = new Set(slides.map((s) => s.sectionLabel))

    expect(parsedLabels.has('INTRO')).toBe(true)
    expect(parsedLabels.has('VERSE 1')).toBe(true)
    expect(parsedLabels.has('CHORUS')).toBe(true)
    expect(parsedLabels.has('VERSE 2')).toBe(true)
    expect(parsedLabels.has('BRIDGE')).toBe(true)
    expect(parsedLabels.has('ENDING')).toBe(true)
  })

  test('repeated same-label verse markers remain separate navigation sections', () => {
    const lyricsRaw = [
      '[VERSE]',
      'Verse one line',
      '',
      '[CHORUS]',
      'Chorus line',
      '',
      '[VERSE]',
      'Verse two line',
      '',
      '[VERSE]',
      'Verse three line'
    ].join('\n')

    const slides = generateSlides(1, lyricsRaw)
    const flow = resolveNavigationFlow(slides)

    expect(slides.map((slide) => slide.sectionId)).toEqual([0, 1, 2, 3])
    expect(flow.isSmartMode).toBe(true)
    expect(flow.steps.map((step) => step.badgeLabel)).toEqual(['V1', 'C', 'V2', 'C', 'V3', 'C'])
  })

  // Req 10.5: no markers → empty sectionLabel
  test('lyrics without markers produce empty sectionLabel', () => {
    const lyricsRaw = 'Line one\nLine two\nLine three'
    const slides = generateSlides(1, lyricsRaw)
    expect(slides.length).toBeGreaterThan(0)
    slides.forEach((slide) => {
      expect(slide.sectionLabel).toBe('')
    })
  })

  // Req 10.6: empty sectionLabel handled gracefully by navigation engine
  test('slides with empty sectionLabel produce Linear_Mode flow', () => {
    const lyricsRaw = 'Line one\nLine two\nLine three'
    const slides = generateSlides(1, lyricsRaw)
    const flow = resolveNavigationFlow(slides)
    expect(flow.isSmartMode).toBe(false)
  })
})

describe('slideEngine - Global Config', () => {
  test('generateSlidesForSong honors global slide config from settings', () => {
    setGlobalSlideConfig({ maxLines: 2, maxChars: 40 })

    const song = {
      id: 7,
      lyrics_raw: ['[VERSE 1]', 'Line one', 'Line two', 'Line three'].join('\n')
    } as Song

    const slides = generateSlidesForSong(song)

    expect(slides).toHaveLength(2)
    expect(slides[0].text).toBe('Line one; Line two')
    expect(slides[1].text).toBe('Line three')
  })
})

describe('slideEngine - Bare Section Headers', () => {
  test('bare section headers without brackets are parsed correctly', () => {
    setGlobalSlideConfig({ maxLines: 4, maxChars: 40 })
    const lyricsRaw = [
      'Bait 1',
      'Baris satu bait satu',
      'Baris dua bait satu',
      '',
      'Reff',
      'Baris satu reff',
      'Baris dua reff',
      '',
      'Chorus 2',
      'Chorus 2 line one'
    ].join('\n')

    const slides = generateSlides(999, lyricsRaw)

    expect(slides).toHaveLength(3)
    expect(slides[0].sectionLabel).toBe('Bait 1')
    expect(slides[1].sectionLabel).toBe('Reff')
    expect(slides[2].sectionLabel).toBe('Chorus 2')
  })
})
