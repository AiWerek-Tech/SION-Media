/**
 * Confidence Payload Builder
 *
 * Normalizes runtime state into a structured payload for confidence displays.
 * Single source of truth for: stage display, external monitors, websocket, mobile apps.
 *
 * @module confidencePayloadBuilder
 */

import type { SlideData, ProjectionState, ConfidencePayload } from '@renderer/types'

/**
 * Build a confidence payload from current runtime state
 *
 * @param programSlide - Current live slide
 * @param programSlides - All slides in current song
 * @param programSlideIndex - Current slide index
 * @param nextSlideData - Next slide (from NEXT state)
 * @param programSongMeta - Song metadata
 * @param projectionState - Current projection state
 * @param timerElapsed - Elapsed time in seconds (optional)
 * @returns Normalized ConfidencePayload
 */
export function buildConfidencePayload(
  programSlide: SlideData | null,
  programSlides: SlideData[],
  programSlideIndex: number,
  nextSlideData: SlideData | null,
  programSongMeta: {
    hymnalCode: string
    hymnalName: string
    composer?: string
    author?: string
  } | null,
  projectionState: ProjectionState,
  timerElapsed: number = 0
): ConfidencePayload {
  // Current slide data
  const currentSlide = programSlide
    ? {
        text: programSlide.text,
        sectionLabel: programSlide.sectionLabel || '',
        slideIndex: programSlideIndex,
        totalSlides: programSlides.length
      }
    : null

  // Next slide data
  const nextSlide = nextSlideData
    ? {
        text: nextSlideData.text,
        sectionLabel: nextSlideData.sectionLabel || ''
      }
    : null

  // Section context
  const currentSection = programSlide?.sectionLabel || null
  const nextSection = nextSlideData?.sectionLabel || null

  // Song metadata - extract from programSlide or songMeta
  const song =
    programSlide || programSongMeta
      ? {
          title: programSongMeta?.hymnalName || 'Unknown',
          hymnalCode: programSongMeta?.hymnalCode || '',
          hymnalName: programSongMeta?.hymnalName || '',
          keyNote: programSlide?.keyNote,
          composer: programSongMeta?.composer,
          author: programSongMeta?.author
        }
      : null

  // Clock
  const clock = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // Runtime status
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isFrozen = projectionState === 'FREEZE'
  const isBlack = projectionState === 'BLACK'

  return {
    currentSlide,
    nextSlide,
    currentSection,
    nextSection,
    song,
    clock,
    timer: {
      elapsed: timerElapsed,
      running: isLive
    },
    status: {
      isLive,
      isFrozen,
      isBlack,
      projectionState
    },
    updatedAt: Date.now()
  }
}

/**
 * Format elapsed time as MM:SS or HH:MM:SS
 */
export function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get next section name different from current
 * Used for "upcoming section" awareness
 */
export function getNextSectionName(slides: SlideData[], currentIndex: number): string | null {
  const currentSection = slides[currentIndex]?.sectionLabel?.toLowerCase()

  for (let i = currentIndex + 1; i < slides.length; i++) {
    const nextSection = slides[i].sectionLabel?.toLowerCase()
    if (nextSection && nextSection !== currentSection) {
      return slides[i].sectionLabel || null
    }
  }

  return null
}

/**
 * Calculate slide progress percentage
 */
export function getSlideProgress(currentIndex: number, totalSlides: number): number {
  if (totalSlides === 0) return 0
  return Math.round(((currentIndex + 1) / totalSlides) * 100)
}
