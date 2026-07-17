import { describe, expect, it } from 'vitest'
import {
  classifyLocalMediaPath,
  getMediaKindCapability,
  getMediaKindLabel,
  getProjectionMediaMode,
  isPagedMediaKind,
  resolveMediaKind
} from './media-kind'

describe('local media kind classification', () => {
  it('distinguishes image, video, pdf, and presentation paths', () => {
    expect(classifyLocalMediaPath('D:/media/slide.PNG')).toBe('image')
    expect(classifyLocalMediaPath('D:/media/clip.mp4?cache=1')).toBe('video')
    expect(classifyLocalMediaPath('D:/media/deck.pdf')).toBe('pdf')
    expect(classifyLocalMediaPath('D:/media/deck.pptx')).toBe('presentation')
  })

  it('treats imported PPT packages as presentation even when their display path is pdf', () => {
    expect(resolveMediaKind({ path: 'D:/cache/deck.pdf', hasPresentationPackage: true })).toBe(
      'presentation'
    )
    expect(getProjectionMediaMode('presentation')).toBe('pdf')
    expect(isPagedMediaKind('presentation')).toBe(true)
  })

  it('provides operator-friendly labels and capability copy', () => {
    expect(getMediaKindLabel('video')).toBe('Video')
    expect(getMediaKindCapability('presentation')).toBe('Slide + catatan')
  })
})
