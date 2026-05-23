/**
 * Phase 9 — useDisplayStore
 *
 * Extracted from useAppStore. Owns all display/window-related state.
 * useAppStore re-exports these via compatibility layer.
 *
 * Rules:
 *   - No reads from any other store inside actions
 *   - Consumers can import from either useDisplayStore or useAppStore (compat)
 *
 * @see implementation-master-order-v1.md §2.7 Phase 9
 */

import { create } from 'zustand'

interface DisplayState {
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
}

export const useDisplayStore = create<DisplayState>((set) => ({
  displayCount: 1,
  setDisplayCount: (count) => set({ displayCount: count }),
  isProjectionVisible: false,
  setProjectionVisible: (visible) => set({ isProjectionVisible: visible }),
  isStageDisplayVisible: false,
  setStageDisplayVisible: (visible) => set({ isStageDisplayVisible: visible }),
  isMaximized: false,
  setMaximized: (maximized) => set({ isMaximized: maximized }),
  isLyricsFullscreen: false,
  setLyricsFullscreen: (isFullscreen) => set({ isLyricsFullscreen: isFullscreen }),
  isFocusMode: false,
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode }))
}))
