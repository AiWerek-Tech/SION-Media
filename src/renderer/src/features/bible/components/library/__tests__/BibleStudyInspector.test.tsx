import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BibleStudyInspector } from '../BibleStudyInspector'

describe('BibleStudyInspector', () => {
  const getNote = vi.fn()
  const getVerseRange = vi.fn()

  beforeEach(() => {
    getNote.mockResolvedValue({ note_text: '', highlight_color: '' })
    getVerseRange.mockResolvedValue([
      { book_code: 'yoh', book_name: 'Yohanes', chapter: 3, verse: 16, text: 'Versi pembanding.' }
    ])
    ;(window.api as unknown as Record<string, unknown>).biblePack = {
      getNote,
      getVerseRange
    }
  })

  it('shows only other installed translations in the comparison list', async () => {
    render(
      <BibleStudyInspector
        inspectedVerse={{
          book_code: 'yoh',
          book_name: 'Yohanes',
          chapter: 3,
          verse: 16,
          text: 'Versi aktif.'
        }}
        selectedRange={null}
        selectedVersion={{
          versionCode: 'TB',
          name: 'Terjemahan Baru',
          shortName: 'TB',
          language: 'id',
          publisher: '',
          copyright: '',
          booksCount: 66,
          chaptersCount: 1189,
          versesCount: 31102,
          fts5Created: true,
          isDefault: true,
          packId: 'tb'
        }}
        versions={[
          {
            versionCode: 'TB',
            name: 'Terjemahan Baru',
            shortName: 'TB',
            language: 'id',
            publisher: '',
            copyright: '',
            booksCount: 66,
            chaptersCount: 1189,
            versesCount: 31102,
            fts5Created: true,
            isDefault: true,
            packId: 'tb'
          },
          {
            versionCode: 'BIS',
            name: 'Bahasa Indonesia Sehari-hari',
            shortName: 'BIS',
            language: 'id',
            publisher: '',
            copyright: '',
            booksCount: 66,
            chaptersCount: 1189,
            versesCount: 31102,
            fts5Created: true,
            isDefault: false,
            packId: 'bis'
          }
        ]}
      />
    )

    await waitFor(() => expect(screen.getByText('Versi pembanding.')).toBeInTheDocument())
    expect(getVerseRange).toHaveBeenCalledTimes(1)
    expect(getVerseRange).toHaveBeenCalledWith('BIS', 'yoh', 3, 16, 16)
    expect(screen.queryAllByText('TB')).toHaveLength(0)
  })
})
