/**
 * Phase 9 — useSongStore
 *
 * Extracted from useAppStore. Owns all song-related state and actions.
 * useAppStore re-exports these via compatibility layer.
 *
 * Rules:
 *   - No reads from any other store inside actions
 *   - Consumers can import from either useSongStore or useAppStore (compat)
 *
 * @see implementation-master-order-v1.md §2.7 Phase 9
 */

import { create } from 'zustand'
import type { Song, FilterTab } from '@renderer/types'
import { logger } from '@renderer/utils/logger'

interface SongState {
  songs: Song[]
  setSongs: (songs: Song[]) => void
  selectedSong: Song | null
  setSelectedSong: (song: Song | null) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FilterTab
  setActiveFilter: (filter: FilterTab) => void
  editingSong: Song | null
  setEditingSong: (song: Song | null) => void

  // Pagination
  searchOffset: number
  hasMoreResults: boolean
  isLoadingMore: boolean
  isSearching: boolean
  searchError: string | null
  searchHymnalId: number | undefined

  // Actions
  loadSongs: (hymnalId?: number) => Promise<void>
  searchSongs: (query: string, append?: boolean, hymnalId?: number) => Promise<void>
  loadMoreSongs: () => Promise<void>
}

let latestSearchRequestId = 0

export const useSongStore = create<SongState>((set, get) => ({
  songs: [],
  setSongs: (songs) => set({ songs }),
  selectedSong: null,
  setSelectedSong: (song) => {
    set({ selectedSong: song })
    if (song && window.api?.system?.logHistory) {
      window.api.system.logHistory(song.id).catch(logger.error)
    }
  },
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  activeFilter: 'all',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  editingSong: null,
  setEditingSong: (song) => set({ editingSong: song }),

  // Pagination
  searchOffset: 0,
  hasMoreResults: false,
  isLoadingMore: false,
  isSearching: false,
  searchError: null,
  searchHymnalId: undefined,

  loadSongs: async (hymnalId?: number) => {
    const requestId = ++latestSearchRequestId
    set({
      isSearching: true,
      isLoadingMore: false,
      searchError: null,
      searchHymnalId: hymnalId
    })
    try {
      const songs = (await window.api.songs.getAll(hymnalId || undefined)) as Song[]
      if (requestId !== latestSearchRequestId) return
      set({
        songs,
        searchQuery: '',
        searchOffset: 0,
        hasMoreResults: false,
        isSearching: false,
        isLoadingMore: false,
        searchError: null,
        searchHymnalId: hymnalId
      })
    } catch (err) {
      logger.error('Failed to load songs:', err)
      if (requestId === latestSearchRequestId) {
        set({
          isSearching: false,
          isLoadingMore: false,
          searchError: 'Daftar lagu gagal dimuat. Silakan coba lagi.'
        })
      }
    }
  },

  searchSongs: async (query: string, append = false, hymnalId?: number) => {
    const requestId = ++latestSearchRequestId
    const normalizedQuery = query.trim()
    set({
      searchError: null,
      isSearching: !append,
      isLoadingMore: append,
      ...(append ? {} : { searchQuery: query, searchHymnalId: hymnalId })
    })
    try {
      const SEARCH_LIMIT = 120
      const offset = append ? get().searchOffset : 0

      if (!normalizedQuery) {
        const songs = (await window.api.songs.getAll(hymnalId)) as Song[]
        if (requestId !== latestSearchRequestId) return
        set({
          songs,
          searchQuery: query,
          searchOffset: 0,
          hasMoreResults: false,
          isSearching: false,
          isLoadingMore: false,
          searchHymnalId: hymnalId
        })
      } else {
        const newSongs = (await window.api.songs.search(query, hymnalId, {
          offset,
          limit: SEARCH_LIMIT
        })) as Song[]

        if (requestId !== latestSearchRequestId) return

        const existingSongs = append ? get().songs : []
        const songs = [...existingSongs, ...newSongs]

        set({
          songs,
          searchQuery: query,
          searchOffset: offset + newSongs.length,
          hasMoreResults: newSongs.length === SEARCH_LIMIT,
          isLoadingMore: false,
          isSearching: false,
          searchError: null,
          searchHymnalId: hymnalId
        })
      }
    } catch (err) {
      logger.error('Failed to search songs:', err)
      if (requestId === latestSearchRequestId) {
        set({
          isLoadingMore: false,
          isSearching: false,
          searchError: 'Pencarian lagu gagal. Silakan coba lagi.'
        })
      }
    }
  },

  loadMoreSongs: async () => {
    const { searchQuery, hasMoreResults, isLoadingMore, searchHymnalId } = get()
    if (!searchQuery.trim() || !hasMoreResults || isLoadingMore) return
    await get().searchSongs(searchQuery, true, searchHymnalId)
  }
}))
