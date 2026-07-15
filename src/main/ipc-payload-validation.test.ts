import { describe, expect, it } from 'vitest'
import {
  requireSerializableSize,
  sanitizeOpenDialogOptions,
  validateReorderPayload,
  validateSettingPayload
} from './ipc-payload-validation'

describe('IPC payload validation', () => {
  it('accepts normal settings and rejects unsafe or oversized values', () => {
    expect(validateSettingPayload('display.fullscreen', '1')).toEqual({
      key: 'display.fullscreen',
      value: '1'
    })
    expect(() => validateSettingPayload('../secret', '1')).toThrow(/invalid characters/i)
    expect(() => validateSettingPayload('valid_key', 'x'.repeat(65_537))).toThrow(/exceeds/i)
  })

  it('rejects duplicate and malformed reorder entries', () => {
    expect(validateReorderPayload([{ id: 1, sort_order: 0 }])).toEqual([{ id: 1, sort_order: 0 }])
    expect(() =>
      validateReorderPayload([
        { id: 1, sort_order: 0 },
        { id: 1, sort_order: 1 }
      ])
    ).toThrow(/duplicate/i)
  })

  it('enforces serialized payload size', () => {
    expect(() => requireSerializableSize({ text: 'ok' }, 'State', 100)).not.toThrow()
    expect(() => requireSerializableSize({ text: 'x'.repeat(100) }, 'State', 20)).toThrow(
      /exceeds/i
    )
  })

  it('drops unknown dialog fields and rejects unsafe properties/extensions', () => {
    expect(
      sanitizeOpenDialogOptions({
        title: 'Pilih media',
        properties: ['openFile', 'multiSelections'],
        unknownCapability: true
      })
    ).toEqual({
      title: 'Pilih media',
      properties: ['openFile', 'multiSelections'],
      defaultPath: undefined,
      buttonLabel: undefined,
      filters: undefined
    })
    expect(() => sanitizeOpenDialogOptions({ properties: ['openFile', 'evil'] })).toThrow()
    expect(() =>
      sanitizeOpenDialogOptions({ filters: [{ name: 'Bad', extensions: ['../exe'] }] })
    ).toThrow()
  })
})
