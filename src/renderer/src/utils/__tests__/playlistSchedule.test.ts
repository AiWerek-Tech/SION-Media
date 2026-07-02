import { describe, expect, test } from 'vitest'
import {
  formatPlaylistSchedule,
  normalizePlaylistServiceDate
} from '@renderer/utils/playlistSchedule'

describe('playlist schedule', () => {
  test.each(['', '   ', 'not-a-date', undefined])(
    'renders %p as a reusable playlist',
    (serviceDate) => {
      expect(formatPlaylistSchedule(serviceDate)).toBe('Kapan saja')
    }
  )

  test('formats an ISO service date in Indonesian without shifting the calendar day', () => {
    expect(formatPlaylistSchedule('2026-07-05')).toContain('5 Jul 2026')
  })

  test('normalizes reusable and dated schedule values', () => {
    expect(normalizePlaylistServiceDate('anytime', '2026-07-05')).toBe('')
    expect(normalizePlaylistServiceDate('dated', ' 2026-07-05 ')).toBe('2026-07-05')
    expect(normalizePlaylistServiceDate('dated', '')).toBe('')
  })
})
