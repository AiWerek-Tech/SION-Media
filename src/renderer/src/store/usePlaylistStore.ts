import { create } from 'zustand'
import type { Playlist, PlaylistItem, Song } from '../types'
import { logger } from '../utils/logger'
import { showToast } from '../services/toast-service'

interface PlaylistStore {
  playlists: Playlist[]
  setPlaylists: (playlists: Playlist[]) => void
  activePlaylist: Playlist | null
  setActivePlaylist: (playlist: Playlist | null) => void
  playlistItems: PlaylistItem[]
  setPlaylistItems: (items: PlaylistItem[]) => void
  activeItemIndex: number
  setActiveItemIndex: (index: number) => void

  // Actions
  loadPlaylists: () => Promise<void>
  createPlaylist: (name: string, serviceDate: string) => Promise<void>
  loadPlaylistItems: (playlistId: number) => Promise<void>
  addSongToPlaylist: (song: Song) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clearPlaylist: () => Promise<void>
  reorderItems: (startIndex: number, endIndex: number) => Promise<void>
  updateItemLabel: (itemId: number, label: string) => Promise<void>
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],
  setPlaylists: (playlists) => set({ playlists }),
  activePlaylist: null,
  setActivePlaylist: (playlist) => set({ activePlaylist: playlist }),
  playlistItems: [],
  setPlaylistItems: (items) => set({ playlistItems: items }),
  activeItemIndex: -1,
  setActiveItemIndex: (index) => set({ activeItemIndex: index }),

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
        name,
        service_date: serviceDate
      })) as Playlist
      const playlists = (await window.api.playlists.getAll()) as Playlist[]
      set({
        playlists,
        activePlaylist: { ...playlist, description: '', created_at: '', updated_at: '' }
      })
    } catch (err) {
      logger.error('Failed to create playlist:', err)
      showToast('Gagal membuat playlist', 'error')
    }
  },

  loadPlaylistItems: async (playlistId: number) => {
    try {
      const items = (await window.api.playlists.getItems(playlistId)) as PlaylistItem[]
      set({ playlistItems: items })
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
      set({ playlistItems: items })
    } catch (err) {
      logger.error('Failed to add song to playlist:', err)
      showToast('Gagal menambahkan lagu ke playlist', 'error')
    }
  },

  removeItem: async (itemId: number) => {
    const { activePlaylist } = get()
    if (!activePlaylist) return
    try {
      await window.api.playlists.deleteItem(itemId)
      const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
      set({ playlistItems: items })
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
      set({ playlistItems: [] })
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
}))
