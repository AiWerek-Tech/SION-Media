/**
 * useAppStore — Compatibility Facade (Phase 9)
 *
 * This store NOW DELEGATES song, hymnal, and display state to their
 * respective decomposed stores (useSongStore, useHymnalStore, useDisplayStore).
 *
 * All 50+ existing consumers can continue importing from useAppStore
 * without any changes. New code SHOULD import from the decomposed stores directly.
 *
 * Architecture:
 *   useSongStore    ─┐
 *   useHymnalStore  ─┼─→ useAppStore (facade, keeps own: navigation/workspace/timer/loading/toast)
 *   useDisplayStore ─┘
 *
 * Flow:
 *   1. Setters delegate to the source store
 *   2. Source store state changes trigger subscribe() callbacks
 *   3. Subscribe callbacks update useAppStore's state → consumers re-render
 *
 * Cross-store side-effects (e.g. hymnal change → reload songs) are handled
 * here in the compatibility layer, NOT in the individual stores.
 *
 * @see implementation-master-order-v1.md §1.3 — Compatibility Layers
 */

import { create } from 'zustand'
import type { Song, Hymnal, FilterTab, AppScreen } from '@renderer/types'
import { logger } from '@renderer/utils/logger'
import { useSongStore } from './useSongStore'
import { useHymnalStore } from './useHymnalStore'
import { useDisplayStore } from './useDisplayStore'

let toastTimeout: ReturnType<typeof setTimeout> | null = null

interface AppState {
  // Navigation
  currentScreen: AppScreen
  setScreen: (screen: AppScreen) => void

  // Hymnals (delegated → useHymnalStore)
  hymnals: Hymnal[]
  setHymnals: (hymnals: Hymnal[]) => void
  selectedHymnalId: number | null
  setSelectedHymnalId: (id: number | null) => void
  loadHymnals: () => Promise<void>

  // Songs (delegated → useSongStore)
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

  // Display (delegated → useDisplayStore)
  displayCount: number
  setDisplayCount: (count: number) => void
  isProjectionVisible: boolean
  setProjectionVisible: (visible: boolean) => void
  isStageDisplayVisible: boolean
  setStageDisplayVisible: (visible: boolean) => void
  isMaximized: boolean
  setMaximized: (maximized: boolean) => void
  isLyricsFullscreen: boolean
  setLyricsFullscreen: (isFullscreen: boolean) => void
  isFocusMode: boolean
  toggleFocusMode: () => void

  // Workspace (own state)
  workspaceName: string
  setWorkspaceName: (name: string) => void

  // Service Timer (own state)
  serviceTimerStartTime: number | null
  startServiceTimer: () => void
  stopServiceTimer: () => void
  resetServiceTimer: () => void

  // Loading (own state)
  isLoading: boolean
  setLoading: (loading: boolean) => void
  loadingMessage: string
  setLoadingMessage: (message: string) => void

  // Toast (own state)
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void

  // Actions (delegated → useSongStore with cross-store glue)
  loadSongs: (hymnalId?: number) => Promise<void>
  searchSongs: (query: string, append?: boolean) => Promise<void>
  loadMoreSongs: () => Promise<void>

  // Pagination state (delegated → useSongStore)
  searchOffset: number
  hasMoreResults: boolean
  isLoadingMore: boolean
}

export const useAppStore = create<AppState>((set, get) => {
  // ─── Subscribe to decomposed stores ─────────────────────────────────
  // When the source store changes, mirror state into useAppStore so that
  // existing consumers (useAppStore selectors) re-render correctly.

  useSongStore.subscribe((s) => {
    set({
      songs: s.songs,
      selectedSong: s.selectedSong,
      searchQuery: s.searchQuery,
      activeFilter: s.activeFilter,
      editingSong: s.editingSong,
      searchOffset: s.searchOffset,
      hasMoreResults: s.hasMoreResults,
      isLoadingMore: s.isLoadingMore
    })
  })

  useHymnalStore.subscribe((s) => {
    set({
      hymnals: s.hymnals,
      selectedHymnalId: s.selectedHymnalId
    })
  })

  useDisplayStore.subscribe((s) => {
    set({
      displayCount: s.displayCount,
      isProjectionVisible: s.isProjectionVisible,
      isStageDisplayVisible: s.isStageDisplayVisible,
      isMaximized: s.isMaximized,
      isLyricsFullscreen: s.isLyricsFullscreen,
      isFocusMode: s.isFocusMode
    })
  })

  // ─── Initial state + delegating setters ─────────────────────────────
  const songInit = useSongStore.getState()
  const hymnalInit = useHymnalStore.getState()
  const displayInit = useDisplayStore.getState()

  return {
    // ── Navigation (own state) ──────────────────────────────────────────
    currentScreen: 'dashboard',
    setScreen: (screen) => set({ currentScreen: screen }),

    // ── Hymnals (delegated → useHymnalStore) ────────────────────────────
    hymnals: hymnalInit.hymnals,
    setHymnals: (hymnals) => useHymnalStore.getState().setHymnals(hymnals),
    selectedHymnalId: hymnalInit.selectedHymnalId,
    setSelectedHymnalId: (id) => {
      useHymnalStore.getState().setSelectedHymnalId(id)
      // Cross-store side-effect: reload songs for the new hymnal
      useSongStore.getState().loadSongs(id || undefined)
    },
    loadHymnals: async () => {
      try {
        await useHymnalStore.getState().loadHymnals()
      } catch (err) {
        logger.error('Failed to load hymnals:', err)
        get().showToast('Gagal memuat buku lagu', 'error')
      }
    },

    // ── Songs (delegated → useSongStore) ────────────────────────────────
    songs: songInit.songs,
    setSongs: (songs) => useSongStore.getState().setSongs(songs),
    selectedSong: songInit.selectedSong,
    setSelectedSong: (song) => useSongStore.getState().setSelectedSong(song),
    searchQuery: songInit.searchQuery,
    setSearchQuery: (query) => useSongStore.getState().setSearchQuery(query),
    activeFilter: songInit.activeFilter,
    setActiveFilter: (filter) => useSongStore.getState().setActiveFilter(filter),
    editingSong: songInit.editingSong,
    setEditingSong: (song) => useSongStore.getState().setEditingSong(song),

    // ── Pagination (delegated → useSongStore) ───────────────────────────
    searchOffset: songInit.searchOffset,
    hasMoreResults: songInit.hasMoreResults,
    isLoadingMore: songInit.isLoadingMore,

    // ── Song actions (delegated with cross-store glue) ──────────────────
    loadSongs: async (hymnalId?: number) => {
      try {
        const id = hymnalId !== undefined ? hymnalId : useHymnalStore.getState().selectedHymnalId
        await useSongStore.getState().loadSongs(id || undefined)
      } catch (err) {
        logger.error('Failed to load songs:', err)
        get().showToast('Gagal memuat lagu', 'error')
      }
    },

    searchSongs: async (query: string, append = false) => {
      try {
        const hymnalId = useHymnalStore.getState().selectedHymnalId || undefined
        await useSongStore.getState().searchSongs(query, append, hymnalId)
      } catch (err) {
        logger.error('Failed to search songs:', err)
        get().showToast('Gagal mencari lagu', 'error')
      }
    },

    loadMoreSongs: async () => {
      await useSongStore.getState().loadMoreSongs()
    },

    // ── Display (delegated → useDisplayStore) ───────────────────────────
    displayCount: displayInit.displayCount,
    setDisplayCount: (count) => useDisplayStore.getState().setDisplayCount(count),
    isProjectionVisible: displayInit.isProjectionVisible,
    setProjectionVisible: (visible) => useDisplayStore.getState().setProjectionVisible(visible),
    isStageDisplayVisible: displayInit.isStageDisplayVisible,
    setStageDisplayVisible: (visible) => useDisplayStore.getState().setStageDisplayVisible(visible),
    isMaximized: displayInit.isMaximized,
    setMaximized: (maximized) => useDisplayStore.getState().setMaximized(maximized),
    isLyricsFullscreen: displayInit.isLyricsFullscreen,
    setLyricsFullscreen: (isFullscreen) =>
      useDisplayStore.getState().setLyricsFullscreen(isFullscreen),
    isFocusMode: displayInit.isFocusMode,
    toggleFocusMode: () => useDisplayStore.getState().toggleFocusMode(),

    // ── Workspace (own state) ───────────────────────────────────────────
    workspaceName: '',
    setWorkspaceName: (name) => {
      set({ workspaceName: name })
      window.api?.settings?.update('workspace_name', name).catch(() => {})
    },

    // ── Service Timer (own state) ───────────────────────────────────────
    serviceTimerStartTime: null,
    startServiceTimer: () =>
      set((s) => ({ serviceTimerStartTime: s.serviceTimerStartTime ?? Date.now() })),
    stopServiceTimer: () => set({ serviceTimerStartTime: null }),
    resetServiceTimer: () => set({ serviceTimerStartTime: Date.now() }),

    // ── Loading (own state) ─────────────────────────────────────────────
    isLoading: true,
    setLoading: (loading) => set({ isLoading: loading }),
    loadingMessage: 'Memuat database...',
    setLoadingMessage: (message) => set({ loadingMessage: message }),

    // ── Toast (own state) ───────────────────────────────────────────────
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
  }
})
