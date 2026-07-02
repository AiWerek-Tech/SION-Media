import { describe, expect, test } from 'vitest'
import { resolveModeChangeProjectionAction } from './mode-policy'

describe('mode change projection policy', () => {
  test.each(['LIBRARY', 'PROJECTION', 'BROADCAST', 'MANAGEMENT'] as const)(
    'preserves projection visibility when switching to %s',
    (mode) => {
      expect(resolveModeChangeProjectionAction(mode)).toBe('PRESERVE')
    }
  )

  test('rejects unknown application modes', () => {
    expect(() => resolveModeChangeProjectionAction('UNKNOWN')).toThrow('Unsupported app mode')
  })
})
