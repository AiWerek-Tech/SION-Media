import { describe, expect, it } from 'vitest'
import { buildRundownTimingSummary, formatRundownDuration } from '../rundownDuration'
import type { PlaylistItem } from '@renderer/types'

function item(partial: Partial<PlaylistItem>): PlaylistItem {
  return {
    id: partial.id ?? 1,
    playlist_id: 1,
    song_id: partial.song_id ?? null,
    sort_order: partial.sort_order ?? 0,
    section_label: partial.section_label ?? '',
    item_type: partial.item_type ?? 'info',
    title: partial.title ?? '',
    notes: partial.notes ?? '',
    ...partial
  } as PlaylistItem
}

describe('rundown duration summary', () => {
  it('estimates total and remaining duration for the active worship rundown', () => {
    const summary = buildRundownTimingSummary({
      items: [
        item({ id: 1, item_type: 'info', title: 'Pembukaan', notes: 'Selamat datang' }),
        item({ id: 2, item_type: 'media', title: 'PPT Khotbah', notes: 'D:/deck.pdf' }),
        item({ id: 3, item_type: 'bible', bible_reference: 'Mazmur 23:1-3' })
      ],
      currentPlaylistItemId: 2,
      currentSlideIndex: 0,
      timerElapsedSeconds: 120
    })

    expect(summary.rundownItemCount).toBe(3)
    expect(summary.rundownTotalSeconds).toBeGreaterThan(0)
    expect(summary.rundownRemainingSeconds).toBe(summary.rundownTotalSeconds - 120)
    expect(summary.currentRundownItemIndex).toBe(1)
    expect(summary.currentRundownItemTitle).toBe('PPT Khotbah')
  })

  it('formats duration for SION Link and stage displays', () => {
    expect(formatRundownDuration(65)).toBe('01:05')
    expect(formatRundownDuration(3665)).toBe('1:01:05')
  })
})
