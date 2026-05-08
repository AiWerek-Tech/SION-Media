import { create } from 'zustand'
import type { Playlist, PlaylistItem, Song } from '../types'

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
    const playlists = (await window.api.playlists.getAll()) as Playlist[]
    set({ playlists })
  },

  createPlaylist: async (name: string, serviceDate: string) => {
    const playlist = (await window.api.playlists.add({
      name,
      service_date: serviceDate
    })) as Playlist
    const playlists = (await window.api.playlists.getAll()) as Playlist[]
    set({
      playlists,
      activePlaylist: { ...playlist, description: '', created_at: '', updated_at: '' }
    })
  },

  loadPlaylistItems: async (playlistId: number) => {
    const items = (await window.api.playlists.getItems(playlistId)) as PlaylistItem[]
    set({ playlistItems: items })
  },

  addSongToPlaylist: async (song: Song) => {
    const { activePlaylist } = get()
    if (!activePlaylist) return
    await window.api.playlists.addItem({ playlist_id: activePlaylist.id, song_id: song.id })
    const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
    set({ playlistItems: items })
  },

  removeItem: async (itemId: number) => {
    const { activePlaylist } = get()
    if (!activePlaylist) return
    await window.api.playlists.deleteItem(itemId)
    const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
    set({ playlistItems: items })
  },

  clearPlaylist: async () => {
    const { activePlaylist } = get()
    if (!activePlaylist) return
    const items = (await window.api.playlists.getItems(activePlaylist.id)) as PlaylistItem[]
    // Optimistic UI clear
    set({ playlistItems: [] })
    for (const item of items) {
      await window.api.playlists.deleteItem(item.id)
    }
  },

  reorderItems: async (startIndex: number, endIndex: number) => {
    const { activePlaylist, playlistItems } = get()
    if (!activePlaylist) return

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
    await window.api.playlists.reorderItems(
      reordered.map((item) => ({ id: item.id, sort_order: item.sort_order }))
    )
  },

  updateItemLabel: async (itemId: number, label: string) => {
    const { activePlaylist, playlistItems } = get()
    if (!activePlaylist) return

    // Optimistic update
    set({
      playlistItems: playlistItems.map((item) =>
        item.id === itemId ? { ...item, section_label: label } : item
      )
    })

    // Update DB
    if (window.api.playlists.updateItem) {
      await window.api.playlists.updateItem(itemId, { section_label: label })
    }
  }
}))
