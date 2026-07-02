import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Playlist, PlaylistItem, Song } from '@renderer/types'
import { logger } from '@renderer/utils/logger'
import { showToast } from '@renderer/services/toast-service'

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
  removeItem: (itemId: number) => Promise<void>
  clearPlaylist: () => Promise<void>
  reorderItems: (startIndex: number, endIndex: number) => Promise<void>
  updateItemLabel: (itemId: number, label: string) => Promise<void>
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

      loadPlaylists: async () => {
        try {
          const playlists = (await window.api.playlists.getAll()) as Playlist[]
          set({ playlists })
        } catch (err) {
          logger.error('Failed to load playlists:', err)
          showToast('Gagal memuat playlist', 'error')
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
          showToast('Gagal membuat playlist', 'error')
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
          showToast('Gagal memuat item playlist', 'error')
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
          showToast('Gagal menambahkan lagu ke playlist', 'error')
          throw err
        }
      },

      addBibleToPlaylist: async (bible) => {
        const { activePlaylist } = get()
        if (!activePlaylist) {
          showToast('Pilih rundown/playlist terlebih dahulu', 'error')
          return
        }
        try {
          await window.api.playlists.addBible(activePlaylist.id, bible)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
          showToast('Ayat ditambahkan ke playlist', 'success')
        } catch (err) {
          logger.error('Failed to add bible to playlist:', err)
          showToast('Gagal menambahkan ayat ke playlist', 'error')
        }
      },

      addInfoToPlaylist: async (info) => {
        const { activePlaylist } = get()
        if (!activePlaylist) {
          showToast('Pilih rundown/playlist terlebih dahulu', 'error')
          return
        }
        try {
          await window.api.playlists.addInfo(activePlaylist.id, info)
          const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
          set({
            playlistItems: items,
            activeItemIndex: get().activeItemIndex >= 0 ? get().activeItemIndex : items.length - 1
          })
          showToast('Info ditambahkan ke playlist', 'success')
        } catch (err) {
          logger.error('Failed to add info to playlist:', err)
          showToast('Gagal menambahkan Info ke playlist', 'error')
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
          showToast('Gagal menghapus item playlist', 'error')
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
          showToast('Gagal mengosongkan playlist', 'error')
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
          showToast('Gagal mengurutkan playlist', 'error')
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
