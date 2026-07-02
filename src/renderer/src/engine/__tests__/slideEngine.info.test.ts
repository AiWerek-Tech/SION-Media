import { describe, expect, it } from 'vitest'
import { generateSlidesForPlaylistItem } from '../slideEngine'
import type { PlaylistItem } from '@renderer/types'

describe('generateSlidesForPlaylistItem Info content', () => {
  it('keeps the title separate from the dominant body text', () => {
    const item: PlaylistItem = {
      id: 14,
      playlist_id: 2,
      song_id: null,
      sort_order: 3,
      section_label: '',
      item_type: 'info' as PlaylistItem['item_type'],
      title: 'Pengkhotbah:',
      notes: 'Pdt. Frengky Lokobal'
    }

    expect(generateSlidesForPlaylistItem(item)).toEqual([
      expect.objectContaining({
        contentType: 'custom',
        playlistItemId: 14,
        text: 'Pdt. Frengky Lokobal',
        sectionLabel: 'Pengkhotbah:'
      })
    ])
  })
})
