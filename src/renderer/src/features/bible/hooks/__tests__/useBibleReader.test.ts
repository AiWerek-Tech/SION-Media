import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBibleReader } from '../useBibleReader'

describe('useBibleReader', () => {
  const getVersions = vi.fn()
  const getBooks = vi.fn()
  const getChapter = vi.fn()

  beforeEach(() => {
    vi.mocked(window.api.settings.getAll).mockResolvedValue({})
    getVersions.mockResolvedValue([
      {
        versionCode: 'TB',
        name: 'Terjemahan Baru',
        shortName: 'TB',
        language: 'id',
        isDefault: true
      }
    ])
    getBooks.mockResolvedValue([
      { code: 'kej', osis_id: 'Gen', name: 'Kejadian', testament: 'OT', order: 1, chapters: 50 },
      { code: 'yoh', osis_id: 'John', name: 'Yohanes', testament: 'NT', order: 43, chapters: 21 }
    ])
    getChapter.mockImplementation(async (_version: string, bookCode: string, chapter: number) =>
      bookCode === 'yoh'
        ? [
            {
              book_code: 'yoh',
              book_name: 'Yohanes',
              chapter,
              verse: 16,
              text: 'Karena begitu besar kasih Allah.'
            },
            {
              book_code: 'yoh',
              book_name: 'Yohanes',
              chapter,
              verse: 17,
              text: 'Allah mengutus Anak-Nya.'
            }
          ]
        : [
            {
              book_code: 'kej',
              book_name: 'Kejadian',
              chapter,
              verse: 1,
              text: 'Pada mulanya Allah.'
            }
          ]
    )
    ;(window.api as unknown as Record<string, unknown>).biblePack = {
      getVersions,
      getBooks,
      getChapter
    }
  })

  it('opens the first book and chapter when the default pack is ready', async () => {
    const { result } = renderHook(() => useBibleReader())

    await waitFor(() => expect(result.current.selectedBook?.code).toBe('kej'))
    await waitFor(() => expect(result.current.verses).toHaveLength(1))
    expect(getChapter).toHaveBeenCalledWith('TB', 'kej', 1)
    expect(result.current.error).toBeNull()
  })

  it('clears a previous load error after another version loads successfully', async () => {
    getVersions.mockResolvedValue([
      {
        versionCode: 'TB',
        name: 'Terjemahan Baru',
        shortName: 'TB',
        language: 'id',
        isDefault: true
      },
      {
        versionCode: 'BIS',
        name: 'Bahasa Indonesia Sehari-hari',
        shortName: 'BIS',
        language: 'id',
        isDefault: false
      }
    ])
    getBooks
      .mockRejectedValueOnce(new Error('pack unavailable'))
      .mockResolvedValueOnce([
        { code: 'kej', osis_id: 'Gen', name: 'Kejadian', testament: 'OT', order: 1, chapters: 50 }
      ])

    const { result } = renderHook(() => useBibleReader())
    await waitFor(() => expect(result.current.error).toContain('Modul Alkitab mengalami kendala'))

    act(() => result.current.selectVersion('BIS'))
    await waitFor(() => expect(result.current.error).toBeNull())
  })

  it('opens a searched reference and selects its requested verse range', async () => {
    const { result } = renderHook(() => useBibleReader())
    await waitFor(() => expect(result.current.selectedBook?.code).toBe('kej'))

    act(() => result.current.openReference('yoh', 3, 16, 17))

    await waitFor(() => expect(result.current.selectedBook?.code).toBe('yoh'))
    await waitFor(() => expect(result.current.selectedRange?.verseStart).toBe(16))
    expect(result.current.selectedChapter).toBe(3)
    expect(result.current.selectedRange?.verseEnd).toBe(17)
    expect(result.current.selectedRange?.verses).toHaveLength(2)
  })

  it('continues chapter navigation across book boundaries', async () => {
    const { result } = renderHook(() => useBibleReader())
    await waitFor(() => expect(result.current.selectedBook?.code).toBe('kej'))

    act(() => result.current.selectChapter(50))
    act(() => result.current.nextChapter())
    await waitFor(() => expect(result.current.selectedBook?.code).toBe('yoh'))
    expect(result.current.selectedChapter).toBe(1)

    act(() => result.current.previousChapter())
    await waitFor(() => expect(result.current.selectedBook?.code).toBe('kej'))
    expect(result.current.selectedChapter).toBe(50)
  })

  it('restores the last valid reading position from backend settings', async () => {
    vi.mocked(window.api.settings.getAll).mockResolvedValue({
      bible_reader_last_position: JSON.stringify({
        versionCode: 'TB',
        bookCode: 'yoh',
        chapter: 3
      })
    })

    const { result } = renderHook(() => useBibleReader())

    await waitFor(() => expect(result.current.selectedBook?.code).toBe('yoh'))
    expect(result.current.selectedChapter).toBe(3)
    expect(getChapter).toHaveBeenCalledWith('TB', 'yoh', 3)
  })
})
