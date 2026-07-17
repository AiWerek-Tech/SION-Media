import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Playlist, PlaylistItem, Song } from '@renderer/types'
import { logger } from '@renderer/utils/logger'
import { showToast } from '@renderer/services/toast-service'
import { getPdfPageCount } from '@renderer/utils/pdfUtils'

const PDF_PAGE_COUNT_RETRY_DELAY_MS = 10_000
const pendingPdfPageCounts = new Map<string, Promise<number>>()
const failedPdfPageCountRetryAt = new Map<string, number>()

interface PlaylistStore {
  playlists: Playlist[]
  setPlaylists: (playlists: Playlist[]) => void
  activePlaylist: Playlist | null
  setActivePlaylist: (playlist: Playlist | null) => void
  playlistItems: PlaylistItem[]
  setPlaylistItems: (items: PlaylistItem[]) => void
  activeItemIndex: number
  setActiveItemIndex: (index: number) => void

  // Phase 1 — Persisted active playlist ID for session continuity
  _persistedActivePlaylistId: number | null

  // Actions
  loadPlaylists: () => Promise<void>
  createPlaylist: (name: string, serviceDate: string) => Promise<void>
  loadPlaylistItems: (playlistId: number) => Promise<void>
  addSongToPlaylist: (song: Song) => Promise<void>
  addBibleToPlaylist: (bible: {
    bible_version_code: string
    bible_version_short_name: string
    bible_book_code: string
    bible_book_name: string
    bible_chapter: number
    bible_verse_start: number
    bible_verse_end: number
    bible_reference: string
    bible_text_json: string
    bible_copyright?: string
    notes?: string
  }) => Promise<void>
  addInfoToPlaylist: (info: { title: string; body: string }) => Promise<void>
  updateInfoItem: (itemId: number, info: { title: string; body: string }) => Promise<void>
  replaceSongItem: (itemId: number, song: Song) => Promise<void>
  addMediaToPlaylist: (media: {
    title: string
    path: string
    presentation?: {
      slides: Array<{ index: number; title: string; notes: string; imagePath?: string }>
    }
  }) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clearPlaylist: () => Promise<void>
  reorderItems: (startIndex: number, endIndex: number) => Promise<void>
  updateItemLabel: (itemId: number, label: string) => Promise<void>

  // PDF Presentation properties
  pdfPageCounts: Record<string, number>
  fetchPdfPageCount: (path: string) => Promise<number>
}

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      playlists: [],
      setPlaylists: (playlists) => set({ playlists }),
      activePlaylist: null,
      setActivePlaylist: (playlist) =>
        set({
          activePlaylist: playlist,
          _persistedActivePlaylistId: playlist?.id ?? null,
          activeItemIndex: -1
        }),
      playlistItems: [],
      setPlaylistItems: (items) => set({ playlistItems: items }),
      activeItemIndex: -1,
      setActiveItemIndex: (index) => {
        const { playlistItems } = get()
        const nextIndex = index >= 0 && index < playlistItems.length ? index : -1
        set({ activeItemIndex: nextIndex })
      },

      // Phase 1 — Persisted active playlist ID
      _persistedActivePlaylistId: null,

      // PDF Presentation properties
      pdfPageCounts: {},
      fetchPdfPageCount: async (path: string) => {
        const { pdfPageCounts } = get()
        if (pdfPageCounts[path] !== undefined) {
          return pdfPageCounts[path]
        }

        const retryAt = failedPdfPageCountRetryAt.get(path) ?? 0
        if (retryAt > Date.now()) {
          return 1
        }

        const pendingRequest = pendingPdfPageCounts.get(path)
        if (pendingRequest) return pendingRequest

        const request = getPdfPageCount(path)
          .then((count) => {
            failedPdfPageCountRetryAt.delete(path)
            set((state) => ({
              pdfPageCounts: { ...state.pdfPageCounts, [path]: count }
            }))
            return count
          })
          .catch((err: unknown) => {
            failedPdfPageCountRetryAt.set(path, Date.now() + PDF_PAGE_COUNT_RETRY_DELAY_MS)
            logger.error('Failed to load page count for PDF:', path, err)
            return 1 // fallback while allowing a later retry
          })
          .finally(() => {
            pendingPdfPageCounts.delete(path)
          })

        pendingPdfPageCounts.set(path, request)
        return request
      },

      loadPlaylists: async () => {
        try {
          const playlists = (await window.api.playlists.getAll()) as Playlist[]
          set({ playlists })
        } catch (err) {
          logger.error('Failed to load playlists:', err)
          showToast('Gagal memuat rundown', 'error')
        }
      },

      createPlaylist: async (name: string, serviceDate: string) => {
        try {
          const playlist = (await window.api.playlists.add({
            name: name.trim(),
            service_date: serviceDate.trim()
          })) as Playlist
          const playlists = (await window.api.playlists.getAll()) as Playlist[]
          set({
            playlists,
            activePlaylist: { ...playlist, description: '', created_at: '', updated_at: '' },
            _persistedActivePlaylistId: Number(playlist.id),
            playlistItems: [],
            activeItemIndex: -1
          })
        } catch (err) {
          logger.error('Failed to create playlist:', err)
          showToast('Gagal membuat rundown', 'error')
          throw err
        }
      },

      loadPlaylistItems: async (playlistId: number) => {
        try {
          const items = (await window.api.playlists.getItems(playlistId)) as PlaylistItem[]
          const activeItemIndex = get().activeItemIndex
          set({
            playlistItems: items,
            activeItemIndex:
              activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : -1
          })
        } catch (err) {
          logger.error('Failed to load playlist items:', err)
          showToast('Gagal memuat item rundown', 'error')
        }
      },

      addSongToPlaylist: async (song: Song) => {
        const { activePlaylist } = get()
        if (!activePlaylist) return
        try {
          await window.api.playlists.addItem({ playlist_id: activePlaylist.id, song_id: song.id })
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
        } catch (err) {
          logger.error('Failed to add song to playlist:', err)
          showToast('Gagal menambahkan lagu ke rundown', 'error')
          throw err
        }
      },

      addBibleToPlaylist: async (bible) => {
        const { activePlaylist } = get()
        if (!activePlaylist) {
          showToast('Pilih Rundown Worship terlebih dahulu', 'error')
          return
        }
        try {
          await window.api.playlists.addBible(activePlaylist.id, bible)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
          showToast('Ayat ditambahkan ke rundown', 'success')
        } catch (err) {
          logger.error('Failed to add bible to playlist:', err)
          showToast('Gagal menambahkan ayat ke rundown', 'error')
        }
      },

      addInfoToPlaylist: async (info) => {
        const { activePlaylist } = get()
        if (!activePlaylist) {
          showToast('Pilih Rundown Worship terlebih dahulu', 'error')
          return
        }
        try {
          await window.api.playlists.addInfo(activePlaylist.id, info)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
          showToast('Info ditambahkan ke rundown', 'success')
        } catch (err) {
          logger.error('Failed to add info to playlist:', err)
          showToast('Gagal menambahkan Info ke rundown', 'error')
        }
      },

      updateInfoItem: async (itemId, info) => {
        const { playlistItems } = get()
        const title = info.title.trim() || 'Info'
        const notes = info.body.trim()
        const prevItems = playlistItems

        set({
          playlistItems: playlistItems.map((item) =>
            item.id === itemId ? { ...item, title, notes } : item
          )
        })

        try {
          await window.api.playlists.updateItem(itemId, { title, notes })
          showToast('Info rundown diperbarui', 'success')
        } catch (err) {
          logger.error('Failed to update info playlist item:', err)
          set({ playlistItems: prevItems })
          showToast('Gagal memperbarui Info rundown', 'error')
          throw err
        }
      },

      replaceSongItem: async (itemId, song) => {
        const { activePlaylist, playlistItems, activeItemIndex } = get()
        if (!activePlaylist) return
        const previousItems = playlistItems
        try {
          await window.api.playlists.updateItem(itemId, { song_id: song.id })
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({ playlistItems: items, activeItemIndex })
          showToast(
            `Lagu diganti menjadi ${song.number ? `${song.number} · ` : ''}${song.title}`,
            'success'
          )
        } catch (err) {
          logger.error('Failed to replace playlist song:', err)
          set({ playlistItems: previousItems })
          showToast('Gagal mengganti lagu rundown', 'error')
          throw err
        }
      },

      addMediaToPlaylist: async (media) => {
        const { activePlaylist } = get()
        if (!activePlaylist) {
          showToast('Pilih Rundown Worship terlebih dahulu', 'error')
          return
        }
        try {
          await window.api.playlists.addMedia(activePlaylist.id, media)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
          showToast('Media ditambahkan ke rundown', 'success')
        } catch (err) {
          logger.error('Failed to add media to playlist:', err)
          showToast('Gagal menambahkan Media ke rundown', 'error')
        }
      },

      removeItem: async (itemId: number) => {
        const { activePlaylist } = get()
        if (!activePlaylist) return
        try {
          await window.api.playlists.deleteItem(itemId)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          const previousIndex = get().activeItemIndex
          const removedIndex = get().playlistItems.findIndex((item) => item.id === itemId)
          const nextIndex =
            items.length === 0
              ? -1
              : removedIndex < 0
                ? Math.min(previousIndex, items.length - 1)
                : previousIndex === removedIndex
                  ? Math.min(removedIndex, items.length - 1)
                  : previousIndex > removedIndex
                    ? previousIndex - 1
                    : previousIndex
          set({ playlistItems: items, activeItemIndex: nextIndex })
        } catch (err) {
          logger.error('Failed to remove playlist item:', err)
          showToast('Gagal menghapus item rundown', 'error')
        }
      },

      clearPlaylist: async () => {
        const { activePlaylist } = get()
        if (!activePlaylist) return
        try {
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          // Optimistic UI clear
          set({ playlistItems: [], activeItemIndex: -1 })
          for (const item of items) {
            await window.api.playlists.deleteItem(item.id)
          }
        } catch (err) {
          logger.error('Failed to clear playlist:', err)
          showToast('Gagal mengosongkan rundown', 'error')
        }
      },

      reorderItems: async (startIndex: number, endIndex: number) => {
        const { activePlaylist, playlistItems } = get()
        if (!activePlaylist) return
        if (
          startIndex < 0 ||
          endIndex < 0 ||
          startIndex >= playlistItems.length ||
          endIndex >= playlistItems.length
        ) {
          logger.warn('Ignoring playlist reorder with invalid indices:', { startIndex, endIndex })
          return
        }

        const prevItems = playlistItems

        const newItems = Array.from(playlistItems)
        const [removed] = newItems.splice(startIndex, 1)
        newItems.splice(endIndex, 0, removed)

        // Update sort_order locally
        const reordered = newItems.map((item, index) => ({
          ...item,
          sort_order: index
        }))

        // Optimistic update
        set({ playlistItems: reordered })

        // Update DB
        try {
          await window.api.playlists.reorderItems(
            reordered.map((item) => ({ id: item.id, sort_order: item.sort_order }))
          )
        } catch (err) {
          logger.error('Failed to reorder playlist items:', err)
          set({ playlistItems: prevItems })
          showToast('Gagal mengurutkan rundown', 'error')
        }
      },

      updateItemLabel: async (itemId: number, label: string) => {
        const { activePlaylist, playlistItems } = get()
        if (!activePlaylist) return

        const prevItems = playlistItems

        // Optimistic update
        set({
          playlistItems: playlistItems.map((item) =>
            item.id === itemId ? { ...item, section_label: label } : item
          )
        })

        // Update DB
        if (window.api.playlists.updateItem) {
          try {
            await window.api.playlists.updateItem(itemId, { section_label: label })
          } catch (err) {
            logger.error('Failed to update playlist item label:', err)
            set({ playlistItems: prevItems })
            showToast('Gagal memperbarui label item', 'error')
          }
        }
      }
    }),
    {
      name: 'sion-playlist-storage',
      partialize: (state) => ({
        _persistedActivePlaylistId: state._persistedActivePlaylistId
      })
    }
  )
)

