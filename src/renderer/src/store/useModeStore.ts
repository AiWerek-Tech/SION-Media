import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'LIBRARY' | 'PROJECTION' | 'BROADCAST' | 'MANAGEMENT'

interface ModeState {
  currentMode: AppMode
  isFirstInstall: boolean
  setMode: (mode: AppMode) => void
  completeFirstInstall: (initialMode: AppMode) => void
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      currentMode: 'PROJECTION',
      isFirstInstall: true,
      setMode: (mode: AppMode) => {
        set({ currentMode: mode })
        if (window.api && window.api.system) {
          window.api.system.setMode?.(mode).catch(() => {})
        }
      },
      completeFirstInstall: (initialMode: AppMode) => {
        set({ isFirstInstall: false, currentMode: initialMode })
        if (window.api && window.api.system) {
          window.api.system.setMode?.(initialMode).catch(() => {})
        }
      }
    }),
    {
      name: 'sion-mode-storage', // key in localStorage
      partialize: (state) => ({
        currentMode: state.currentMode,
        isFirstInstall: state.isFirstInstall
      })
    }
  )
)
