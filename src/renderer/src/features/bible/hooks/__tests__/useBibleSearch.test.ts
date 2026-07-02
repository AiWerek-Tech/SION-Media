import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBibleSearch } from '../useBibleSearch'

describe('useBibleSearch', () => {
  const parseReference = vi.fn()
  const search = vi.fn()
  const getVerseRange = vi.fn()

  beforeEach(() => {
    ;(window.api as unknown as Record<string, unknown>).biblePack = {
      parseReference,
      search,
      getVerseRange
    }
  })

  it('resolves a valid scripture reference directly instead of sending it to FTS', async () => {
    parseReference.mockResolvedValue({
      valid: true,
      bookCode: 'yoh',
      bookName: 'Yohanes',
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      error: null
    })
    getVerseRange.mockResolvedValue([
      {
        book_code: 'yoh',
        book_name: 'Yohanes',
        chapter: 3,
        verse: 16,
        text: 'Karena begitu besar kasih Allah.'
      },
      {
        book_code: 'yoh',
        book_name: 'Yohanes',
        chapter: 3,
        verse: 17,
        text: 'Allah mengutus Anak-Nya.'
      }
    ])

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('Yohanes 3:16-17'))
    await act(() => result.current.search('TB'))

    await waitFor(() => expect(result.current.results).toHaveLength(2))
    expect(getVerseRange).toHaveBeenCalledWith('TB', 'yoh', 3, 16, 17)
    expect(search).not.toHaveBeenCalled()
  })

  it('uses keyword search when the input is not a reference', async () => {
    parseReference.mockResolvedValue({ valid: false, error: 'not a reference' })
    search.mockResolvedValue([
      {
        book_code: 'mzm',
        book_name: 'Mazmur',
        chapter: 23,
        verse: 1,
        text: 'TUHAN adalah gembalaku.',
        snippet: 'TUHAN adalah gembalaku.'
      }
    ])

    const { result } = renderHook(() => useBibleSearch())
    act(() => result.current.setQuery('gembalaku'))
    await act(() => result.current.search('TB'))

    await waitFor(() => expect(result.current.results).toHaveLength(1))
    expect(search).toHaveBeenCalledWith('TB', 'gembalaku', 50)
    expect(getVerseRange).not.toHaveBeenCalled()
  })

  it('accepts the current UI query explicitly so debounced search never uses stale state', async () => {
    parseReference.mockResolvedValue({ valid: false, error: 'not a reference' })
    search.mockResolvedValue([
      {
        book_code: 'mzm',
        book_name: 'Mazmur',
        chapter: 23,
        verse: 1,
        text: 'TUHAN adalah gembalaku.',
        snippet: 'TUHAN adalah gembalaku.'
      }
    ])

    const { result } = renderHook(() => useBibleSearch())
    await act(() => result.current.search('TB', 'gembalaku'))

    expect(search).toHaveBeenCalledWith('TB', 'gembalaku', 50)
  })
})
