import { describe, expect, it } from 'vitest'
import { buildBibleSlidesFromPlaylistItem } from '../buildBibleSlides'
import type { PlaylistItem } from '@renderer/types'

const makeItem = (verses: Array<{ verse: number; text: string }>): PlaylistItem => ({
  id: 9,
  playlist_id: 2,
  song_id: null,
  sort_order: 0,
  section_label: '',
  item_type: 'bible',
  title: 'Kejadian 1:1-3',
  bible_book_name: 'Kejadian',
  bible_chapter: 1,
  bible_reference: 'Kejadian 1:1-3',
  bible_version_code: 'tb',
  bible_version_short_name: 'TB',
  bible_copyright: '© LAI 1974',
  bible_text_json: JSON.stringify(
    verses.map((verse) => ({
      book_code: 'GEN',
      book_name: 'Kejadian',
      chapter: 1,
      ...verse
    }))
  )
})

describe('buildBibleSlidesFromPlaylistItem', () => {
  it('creates exactly one slide for every selected verse', () => {
    const slides = buildBibleSlidesFromPlaylistItem(
      makeItem([
        { verse: 1, text: 'Pada mulanya Allah menciptakan langit dan bumi.' },
        { verse: 2, text: 'Bumi belum berbentuk dan kosong.' },
        { verse: 3, text: 'Berfirmanlah Allah: Jadilah terang.' }
      ])
    )

    expect(slides).toHaveLength(3)
    expect(slides.map((slide) => slide.bibleReference)).toEqual([
      'Kejadian 1:1 · TB',
      'Kejadian 1:2 · TB',
      'Kejadian 1:3 · TB'
    ])
    expect(slides.every((slide) => slide.contentType === 'bible')).toBe(true)
  })

  it('keeps one long verse intact for smart fitting instead of splitting it', () => {
    const longText = Array.from({ length: 55 }, () => 'firman').join(' ')
    const slides = buildBibleSlidesFromPlaylistItem(makeItem([{ verse: 28, text: longText }]))

    expect(slides).toHaveLength(1)
    expect(slides[0].text).toBe(`[28] ${longText}`)
    expect(slides[0].bibleReference).toBe('Kejadian 1:28 · TB')
  })
})
