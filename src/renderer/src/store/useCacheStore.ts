import { create } from 'zustand'
import type { Song } from '@renderer/types'

interface CacheState {
  parsedItems: Partial<Song>[]
  playlistMeta: { name: string; service_date: string } | null
  setParsedItems: (
    items: Partial<Song>[],
    meta?: { name: string; service_date: string } | null
  ) => void
  clearCache: () => void
}

export const useCacheStore = create<CacheState>((set) => ({
  parsedItems: [],
  playlistMeta: null,
  setParsedItems: (items, meta = null) => set({ parsedItems: items, playlistMeta: meta }),
  clearCache: () => set({ parsedItems: [], playlistMeta: null })
}))
