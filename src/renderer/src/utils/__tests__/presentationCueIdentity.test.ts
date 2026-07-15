import { describe, expect, test } from 'vitest'
import type { SlideData } from '@renderer/types'
import { isSamePresentationCue } from '../presentationCueIdentity'

const emptyMediaSlide: SlideData = {
  contentType: 'custom',
  songId: null,
  playlistItemId: null,
  slideIndex: 0,
  text: '',
  sectionLabel: 'Media'
}

describe('presentation cue identity', () => {
  test('distinguishes two visual media files with otherwise empty slides', () => {
    const imageA = JSON.stringify({ mode: 'image', media: { path: 'C:\\media\\a.png' } })
    const imageB = JSON.stringify({ mode: 'image', media: { path: 'C:\\media\\b.png' } })

    expect(isSamePresentationCue(emptyMediaSlide, emptyMediaSlide, imageA, imageB)).toBe(false)
  })

  test('recognizes the exact same visual cue', () => {
    const image = JSON.stringify({ mode: 'image', media: { path: 'C:\\media\\a.png' } })
    expect(isSamePresentationCue(emptyMediaSlide, emptyMediaSlide, image, image)).toBe(true)
  })
})
