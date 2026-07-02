/**
 * Phase 9 — useHymnalStore
 *
 * Extracted from useAppStore. Owns all hymnal-related state and actions.
 * useAppStore re-exports these via compatibility layer.
 *
 * Rules:
 *   - No reads from any other store inside actions
 *   - Consumers can import from either useHymnalStore or useAppStore (compat)
 *
 * @see implementation-master-order-v1.md §2.7 Phase 9
 */

import { create } from 'zustand'
import type { Hymnal } from '@renderer/types'
import { logger } from '@renderer/utils/logger'

interface HymnalState {
  hymnals: Hymnal[]
  setHymnals: (hymnals: Hymnal[]) => void
  selectedHymnalId: number | null
  setSelectedHymnalId: (id: number | null) => void
  loadHymnals: () => Promise<void>
}

export const useHymnalStore = create<HymnalState>((set) => ({
  hymnals: [],
  setHymnals: (hymnals) => set({ hymnals }),
  selectedHymnalId: null,
  setSelectedHymnalId: (id) => {
    set({ selectedHymnalId: id })
    // NOTE: loadSongs side-effect is handled at the consumer level
    // (or via useAppStore compatibility layer).
    // This store does NOT import useSongStore to avoid cross-store reads.
  },
  loadHymnals: async () => {
    try {
      const hymnals = (await window.api.hymnals.getAll()) as Hymnal[]
      set({ hymnals })
    } catch (err) {
      logger.error('Failed to load hymnals:', err)
    }
  }
}))
