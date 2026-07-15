import { describe, expect, it } from 'vitest'
import { parseMediaPlaylistDescriptor, serializeMediaPlaylistDescriptor } from './media-playlist'

describe('media playlist descriptor', () => {
  it('keeps legacy raw paths backward compatible', () => {
    expect(parseMediaPlaylistDescriptor('C:\\media\\deck.pdf').path).toBe('C:\\media\\deck.pdf')
  })

  it('round-trips presentation notes', () => {
    const raw = serializeMediaPlaylistDescriptor({
      path: 'C:\\media\\deck.pdf',
      presentation: { slides: [{ index: 0, title: 'Pembukaan', notes: 'Sapa jemaat.' }] }
    })
    expect(parseMediaPlaylistDescriptor(raw)).toMatchObject({
      path: 'C:\\media\\deck.pdf',
      presentation: { slides: [{ index: 0, title: 'Pembukaan', notes: 'Sapa jemaat.' }] }
    })
  })

  it('does not interpret unrelated JSON as a descriptor', () => {
    const raw = '{"path":"spoof.pdf"}'
    expect(parseMediaPlaylistDescriptor(raw).path).toBe(raw)
  })
})
