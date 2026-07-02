import { describe, expect, test } from 'vitest'
import { normalizeSafeExternalUrl } from './safe-external-url'

describe('normalizeSafeExternalUrl', () => {
  test.each(['https://sion.example/help', 'http://localhost:4173/', 'mailto:support@example.com'])(
    'allows supported external URL %s',
    (url) => expect(normalizeSafeExternalUrl(url)).toBe(url)
  )

  test.each(['javascript:alert(1)', 'file:///C:/Windows/System32', 'data:text/html,test', ''])(
    'blocks unsafe external URL %s',
    (url) => expect(normalizeSafeExternalUrl(url)).toBeNull()
  )
})
