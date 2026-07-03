import { describe, expect, test } from 'vitest'
import { buildConfidencePayload } from './confidencePayloadBuilder'
import type { SlideData } from '@renderer/types'

describe('buildConfidencePayload', () => {
  test('preserves Bible identity without creating fake song metadata', () => {
    const bibleSlide: SlideData = {
      contentType: 'bible',
      slideIndex: 0,
      text: '[1] Pada mulanya Allah menciptakan langit dan bumi.',
      sectionLabel: 'Kejadian 1:1',
      bibleReference: 'Kejadian 1:1',
      bibleVersionCode: 'TB',
      bibleCopyright: '© LAI 1974'
    }

    const payload = buildConfidencePayload(bibleSlide, [bibleSlide], 0, null, null, 'LIVE', 12)

    expect(payload.currentSlide).toMatchObject({
      contentType: 'bible',
      bibleReference: 'Kejadian 1:1',
      bibleVersionCode: 'TB',
      bibleCopyright: '© LAI 1974'
    })
    expect(payload.song).toBeNull()
  })

  test('keeps song metadata and next-slide content type', () => {
    const current: SlideData = {
      contentType: 'song',
      slideIndex: 0,
      text: 'Bait pertama',
      sectionLabel: 'Verse 1',
      keyNote: 'D'
    }
    const next: SlideData = {
      contentType: 'song',
      slideIndex: 1,
      text: 'Refrain berikutnya',
      sectionLabel: 'Chorus'
    }

    const payload = buildConfidencePayload(
      current,
      [current, next],
      0,
      next,
      { hymnalCode: 'LS', hymnalName: 'Di Hadapan Hadirat-Mu' },
      'LIVE'
    )

    expect(payload.currentSlide?.contentType).toBe('song')
    expect(payload.nextSlide?.contentType).toBe('song')
    expect(payload.song).toMatchObject({
      title: 'Di Hadapan Hadirat-Mu',
      hymnalCode: 'LS',
      keyNote: 'D'
    })
  })
})
