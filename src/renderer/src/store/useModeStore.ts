import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'LIBRARY' | 'PROJECTION' | 'BROADCAST' | 'MANAGEMENT'
export type AppTheme = 'dark' | 'light' | 'system'

interface ModeState {
  currentMode: AppMode
  isFirstInstall: boolean
  theme: AppTheme
  setMode: (mode: AppMode) => void
  setTheme: (theme: AppTheme) => void
  completeFirstInstall: (initialMode: AppMode) => void
  finishOnboarding: (opts: { theme: AppTheme; mode: AppMode }) => void
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      currentMode: 'PROJECTION',
      isFirstInstall: true,
      theme: 'dark' as AppTheme,
      setMode: (mode: AppMode) => {
        set({ currentMode: mode })
        if (window.api && window.api.system) {
          window.api.system.setMode?.(mode).catch(() => {})
        }
      },
      setTheme: (theme: AppTheme) => set({ theme }),
      completeFirstInstall: (initialMode: AppMode) => {
        set({ isFirstInstall: false, currentMode: initialMode })
        if (window.api && window.api.system) {
          window.api.system.setMode?.(initialMode).catch(() => {})
        }
      },
      finishOnboarding: (opts: { theme: AppTheme; mode: AppMode }) => {
        set({ isFirstInstall: false, theme: opts.theme, currentMode: opts.mode })
        if (window.api && window.api.system) {
          window.api.system.setMode?.(opts.mode).catch(() => {})
        }
      }
    }),
    {
      name: 'sion-mode-storage', // key in localStorage
      partialize: (state) => ({
        currentMode: state.currentMode,
        isFirstInstall: state.isFirstInstall,
        theme: state.theme
      })
    }
  )
)
