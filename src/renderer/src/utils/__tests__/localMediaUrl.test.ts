import { describe, expect, test } from 'vitest'
import { toLocalMediaUrl } from '../localMediaUrl'

describe('toLocalMediaUrl', () => {
  test('encodes Windows image paths safely', () => {
    expect(toLocalMediaUrl('C:\\Media Gereja\\Kasih #1 (final) 100%.png')).toBe(
      'local-media:///C:/Media%20Gereja/Kasih%20%231%20(final)%20100%25.png'
    )
  })

  test('does not rewrite an existing protocol URL', () => {
    expect(toLocalMediaUrl('local-media:///C:/Media/image.png')).toBe(
      'local-media:///C:/Media/image.png'
    )
  })
})
