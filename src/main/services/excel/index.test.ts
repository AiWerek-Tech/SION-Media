import { describe, expect, test } from 'vitest'
import { mapExcelRows } from './index'

describe('Excel song import', () => {
  test('maps Indonesian and legacy English headers without evaluating formulas', () => {
    expect(
      mapExcelRows([
        ['Nomor', 'Judul', 'Lirik', 'Bahasa', 'key_note'],
        [1, 'Kasih Setia-Mu', 'Bait 1', null, 'D'],
        [null, null, null, null, null]
      ])
    ).toEqual([
      expect.objectContaining({
        number: '1',
        title: 'Kasih Setia-Mu',
        lyrics_raw: 'Bait 1',
        language: 'Indonesia',
        key_note: 'D'
      })
    ])
  })

  test('rejects spreadsheets exceeding the production row limit', () => {
    const rows = [['Judul'], ...Array.from({ length: 5001 }, () => ['Lagu'])]
    expect(() => mapExcelRows(rows)).toThrow('Maximum is 5000 rows')
  })
})
