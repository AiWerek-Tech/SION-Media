import { describe, expect, it } from 'vitest'
import { resolveLocalMediaPath } from './local-media-url'

describe('resolveLocalMediaPath', () => {
  it('preserves the Windows drive colon for host-parsed PNG URLs', () => {
    expect(resolveLocalMediaPath('local-media://c/Users/ADMIN/Music/KKR%20MAIMA/H3.png')).toBe(
      'c:/Users/ADMIN/Music/KKR MAIMA/H3.png'
    )
  })

  it('preserves the Windows drive colon for three-slash PNG URLs', () => {
    expect(resolveLocalMediaPath('local-media:///C:/Users/ADMIN/Music/KKR%20MAIMA/H3.png')).toBe(
      'C:/Users/ADMIN/Music/KKR MAIMA/H3.png'
    )
  })
})
