import { describe, expect, it } from 'vitest'
import { formatBibleError } from '../bibleErrors'

describe('formatBibleError', () => {
  it.each([
    [
      'Bible pack SQLite file not found',
      'Paket Alkitab tidak ditemukan. Instal ulang melalui Pengaturan > Paket Alkitab.'
    ],
    [
      'no such table: bible_verses',
      'Database paket Alkitab rusak atau tidak sesuai format SION Media.'
    ],
    ['no such table: bible_verses_fts', 'Indeks pencarian paket Alkitab belum tersedia.'],
    [
      'database disk image is malformed',
      'Database paket Alkitab rusak atau tidak sesuai format SION Media.'
    ]
  ])('maps %s to a recovery-oriented message', (raw, expected) => {
    expect(formatBibleError(raw)).toBe(expected)
  })

  it('does not expose internal paths or SQL details for unknown errors', () => {
    expect(formatBibleError('SQLITE_IOERR at C:\\Users\\name\\secret.sqlite')).toBe(
      'Modul Alkitab mengalami kendala. Coba lagi atau periksa paket Alkitab di Pengaturan.'
    )
  })
})
