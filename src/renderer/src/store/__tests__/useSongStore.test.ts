import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Song } from '@renderer/types'
import { useSongStore } from '@renderer/store/useSongStore'

function song(id: number, title: string): Song {
  return {
    id,
    hymnal_id: 2,
    number: String(id),
    title,
    lyrics_raw: '[VERSE 1]\nLirik',
    is_favorite: 0
  } as Song
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.mocked(window.api.songs.search).mockReset()
  vi.mocked(window.api.songs.getAll).mockReset()
  useSongStore.setState({
    songs: [],
    searchQuery: '',
    searchOffset: 0,
    hasMoreResults: false,
    isLoadingMore: false,
    isSearching: false,
    searchError: null,
    searchHymnalId: undefined
  })
})

describe('useSongStore search reliability', () => {
  test('loadMoreSongs preserves the hymnal used by the initial search', async () => {
    const firstPage = Array.from({ length: 120 }, (_, index) =>
      song(index + 1, `Lagu ${index + 1}`)
    )
    vi.mocked(window.api.songs.search)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([song(121, 'Lagu 121')])

    await useSongStore.getState().searchSongs('kasih', false, 2)
    await useSongStore.getState().loadMoreSongs()

    expect(window.api.songs.search).toHaveBeenLastCalledWith('kasih', 2, {
      offset: 120,
      limit: 120
    })
    expect(useSongStore.getState().songs).toHaveLength(121)
  })

  test('a stale response cannot replace a newer search result', async () => {
    const oldRequest = deferred<Song[]>()
    const newRequest = deferred<Song[]>()
    vi.mocked(window.api.songs.search)
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise)

    const oldSearch = useSongStore.getState().searchSongs('lama', false, 2)
    const newSearch = useSongStore.getState().searchSongs('baru', false, 2)

    newRequest.resolve([song(2, 'Hasil Baru')])
    await newSearch
    oldRequest.resolve([song(1, 'Hasil Lama')])
    await oldSearch

    expect(useSongStore.getState().searchQuery).toBe('baru')
    expect(useSongStore.getState().songs.map((item) => item.title)).toEqual(['Hasil Baru'])
  })

  test('exposes a recoverable error when search fails', async () => {
    vi.mocked(window.api.songs.search).mockRejectedValueOnce(new Error('database unavailable'))

    await useSongStore.getState().searchSongs('gagal', false, 2)

    expect(useSongStore.getState().isSearching).toBe(false)
    expect(useSongStore.getState().searchError).toBe('Pencarian lagu gagal. Silakan coba lagi.')
  })
})
