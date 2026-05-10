import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Panel layout sizes for different workspace modes
 * Values are percentages (0-100)
 */
export interface PanelLayoutSizes {
  /** ProjectionMode: [SongLibrary width%, Playlist width%] */
  projectionBottom: [number, number]
  /** Dashboard: [SongLibrary width%, Playlist width%] */
  dashboardBottom: [number, number]
  /** ManagementMode: [SongList width%, DetailPanel width%] */
  managementMain: [number, number]
  /** LibraryMode: [LibraryPanel width%, PreviewPanel width%] */
  libraryMain: [number, number]
  /** LivePreviewPanel: [Preview width%, Program width%] */
  livePreview: [number, number]
}

interface PanelLayoutState {
  sizes: PanelLayoutSizes
  setSizes: (mode: keyof PanelLayoutSizes, sizes: [number, number]) => void
  getSizes: (mode: keyof PanelLayoutSizes) => [number, number]
  resetToDefaults: () => void
}

const DEFAULT_SIZES: PanelLayoutSizes = {
  // ProjectionMode bottom section: 45% library, 55% playlist
  projectionBottom: [45, 55],
  // Dashboard bottom section: 45% library, 55% playlist
  dashboardBottom: [45, 55],
  // ManagementMode main section: 65% list, 35% detail
  managementMain: [65, 35],
  // LibraryMode main section: 60% library, 40% preview
  libraryMain: [60, 40],
  // LivePreviewPanel: 50% preview, 50% program
  livePreview: [50, 50]
}

/**
 * Panel Layout Store
 *
 * Persists resizable panel sizes across sessions.
 * Uses localStorage via zustand persist middleware.
 *
 * Features:
 * - Per-workspace layout sizes
 * - Automatic persistence
 * - Default fallbacks
 * - Reset capability
 */
export const usePanelLayoutStore = create<PanelLayoutState>()(
  persist(
    (set, get) => ({
      sizes: { ...DEFAULT_SIZES },

      setSizes: (mode, sizes) => {
        set((state) => ({
          sizes: {
            ...state.sizes,
            [mode]: sizes
          }
        }))
      },

      getSizes: (mode) => {
        return get().sizes[mode] ?? DEFAULT_SIZES[mode]
      },

      resetToDefaults: () => {
        set({ sizes: { ...DEFAULT_SIZES } })
      }
    }),
    {
      name: 'sion-panel-layout'
    }
  )
)

/**
 * Panel size constraints
 * Ensures panels don't collapse too small or get too large
 */
export const PANEL_CONSTRAINTS = {
  projectionBottom: {
    minSizes: [30, 35], // Library min 30%, Playlist min 35%
    maxSizes: [60, 65] // Library max 60%, Playlist max 65%
  },
  dashboardBottom: {
    minSizes: [30, 35],
    maxSizes: [60, 65]
  },
  managementMain: {
    minSizes: [40, 25], // SongList min 40%, Detail min 25%
    maxSizes: [75, 50]
  },
  libraryMain: {
    minSizes: [35, 25],
    maxSizes: [70, 45]
  },
  livePreview: {
    minSizes: [25, 25], // Preview min 25%, Program min 25%
    maxSizes: [70, 70]
  }
} as const
