import { create } from 'zustand'
import type { Song, Hymnal, FilterTab, AppScreen } from '../types'
import { logger } from '../utils/logger'

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
  searchSongs: (query: string) => Promise<void>
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
    const hymnals = (await window.api.hymnals.getAll()) as Hymnal[]
    set({ hymnals })
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
    const id = hymnalId !== undefined ? hymnalId : get().selectedHymnalId
    const songs = (await window.api.songs.getAll(id || undefined)) as Song[]
    set({ songs })
  },

  searchSongs: async (query: string) => {
    const hymnalId = get().selectedHymnalId || undefined
    if (!query.trim()) {
      const songs = (await window.api.songs.getAll(hymnalId)) as Song[]
      set({ songs, searchQuery: query })
    } else {
      const songs = (await window.api.songs.search(query, hymnalId)) as Song[]
      set({ songs, searchQuery: query })
    }
  },

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } })
    setTimeout(() => {
      set((state) => (state.toast?.message === message ? { toast: null } : state))
    }, 3000)
  }
}))
