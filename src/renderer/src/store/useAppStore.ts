import { create } from 'zustand'
import type { Song, Hymnal, FilterTab, AppScreen } from '../types'
import { logger } from '../utils/logger'

let toastTimeout: ReturnType<typeof setTimeout> | null = null

interface AppState {
  // Navigation
  currentScreen: AppScreen
  setScreen: (screen: AppScreen) => void

  // Hymnals
  hymnals: Hymnal[]
  setHymnals: (hymnals: Hymnal[]) => void
  selectedHymnalId: number | null
  setSelectedHymnalId: (id: number | null) => void
  loadHymnals: () => Promise<void>

  // Songs
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

  // Display
  displayCount: number
  setDisplayCount: (count: number) => void
  isProjectionVisible: boolean
  setProjectionVisible: (visible: boolean) => void
  isStageDisplayVisible: boolean
  setStageDisplayVisible: (visible: boolean) => void
  isMaximized: boolean
  setMaximized: (maximized: boolean) => void
  isFocusMode: boolean
  toggleFocusMode: () => void

  // Workspace
  workspaceName: string
  setWorkspaceName: (name: string) => void

  // Service Timer
  serviceTimerStartTime: number | null
  startServiceTimer: () => void
  stopServiceTimer: () => void
  resetServiceTimer: () => void

  // Loading
  isLoading: boolean
  setLoading: (loading: boolean) => void
  loadingMessage: string
  setLoadingMessage: (message: string) => void

  // Toast
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void

  // Actions
  loadSongs: (hymnalId?: number) => Promise<void>
  searchSongs: (query: string, append?: boolean) => Promise<void>
  loadMoreSongs: () => Promise<void>

  // Pagination state
  searchOffset: number
  hasMoreResults: boolean
  isLoadingMore: boolean
}

export const useAppStore = create<AppState>((set, get) => ({
  currentScreen: 'dashboard',
  setScreen: (screen) => set({ currentScreen: screen }),

  hymnals: [],
  setHymnals: (hymnals) => set({ hymnals }),
  selectedHymnalId: null,
  setSelectedHymnalId: (id) => {
    set({ selectedHymnalId: id })
    get().loadSongs(id || undefined)
  },
  loadHymnals: async () => {
    try {
      const hymnals = (await window.api.hymnals.getAll()) as Hymnal[]
      set({ hymnals })
    } catch (err) {
      logger.error('Failed to load hymnals:', err)
      get().showToast('Gagal memuat buku lagu', 'error')
    }
  },

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

  // Pagination state
  searchOffset: 0,
  hasMoreResults: false,
  isLoadingMore: false,

  displayCount: 1,
  setDisplayCount: (count) => set({ displayCount: count }),
  isProjectionVisible: false,
  setProjectionVisible: (visible) => set({ isProjectionVisible: visible }),
  isStageDisplayVisible: false,
  setStageDisplayVisible: (visible) => set({ isStageDisplayVisible: visible }),
  isMaximized: false,
  setMaximized: (maximized) => set({ isMaximized: maximized }),
  isFocusMode: false,
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

  workspaceName: '',
  setWorkspaceName: (name) => {
    set({ workspaceName: name })
    window.api?.settings?.update('workspace_name', name).catch(() => {})
  },

  serviceTimerStartTime: null,
  startServiceTimer: () =>
    set((s) => ({ serviceTimerStartTime: s.serviceTimerStartTime ?? Date.now() })),
  stopServiceTimer: () => set({ serviceTimerStartTime: null }),
  resetServiceTimer: () => set({ serviceTimerStartTime: Date.now() }),

  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),
  loadingMessage: 'Memuat database...',
  setLoadingMessage: (message) => set({ loadingMessage: message }),

  loadSongs: async (hymnalId?: number) => {
    try {
      const id = hymnalId !== undefined ? hymnalId : get().selectedHymnalId
      const songs = (await window.api.songs.getAll(id || undefined)) as Song[]
      set({ songs })
    } catch (err) {
      logger.error('Failed to load songs:', err)
      get().showToast('Gagal memuat lagu', 'error')
    }
  },

  searchSongs: async (query: string, append = false) => {
    try {
      const hymnalId = get().selectedHymnalId || undefined
      const SEARCH_LIMIT = 120
      const offset = append ? get().searchOffset : 0

      if (!query.trim()) {
        const songs = (await window.api.songs.getAll(hymnalId)) as Song[]
        set({ songs, searchQuery: query, searchOffset: 0, hasMoreResults: false })
      } else {
        if (!append) set({ isLoadingMore: true })

        const newSongs = (await window.api.songs.search(query, hymnalId, {
          offset,
          limit: SEARCH_LIMIT
        })) as Song[]

        const existingSongs = append ? get().songs : []
        const songs = [...existingSongs, ...newSongs]

        set({
          songs,
          searchQuery: query,
          searchOffset: offset + newSongs.length,
          hasMoreResults: newSongs.length === SEARCH_LIMIT,
          isLoadingMore: false
        })
      }
    } catch (err) {
      logger.error('Failed to search songs:', err)
      get().showToast('Gagal mencari lagu', 'error')
      set({ isLoadingMore: false })
    }
  },

  loadMoreSongs: async () => {
    const { searchQuery, hasMoreResults, isLoadingMore } = get()
    if (!searchQuery.trim() || !hasMoreResults || isLoadingMore) return
    await get().searchSongs(searchQuery, true)
  },

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })

    if (toastTimeout) {
      clearTimeout(toastTimeout)
      toastTimeout = null
    }

    toastTimeout = setTimeout(() => {
      set((state) => (state.toast?.message === message ? { toast: null } : state))
    }, 3000)
  }
}))
