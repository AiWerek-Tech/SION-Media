import { useEffect } from 'react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModeStore } from '@renderer/store/useModeStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { generateSlidesForSong } from '@core/projection'
import { executeRuntimeCommand } from '@renderer/utils/runtimeCommandBus'
import type { AppScreen } from '@renderer/types'

interface UseGlobalShortcutsOptions {
  currentScreen: AppScreen
  activePlaylistId: number | null
  playlistLength: number
  setScreen: (screen: AppScreen) => void
  setShowCommandPalette: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowShortcuts: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowQuickJump: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowRuntimeInspector: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowEmergencyPanel: (value: boolean | ((prev: boolean) => boolean)) => void
}

export function useGlobalShortcuts({
  currentScreen,
  activePlaylistId,
  playlistLength,
  setScreen,
  setShowCommandPalette,
  setShowShortcuts,
  setShowQuickJump,
  setShowRuntimeInspector,
  setShowEmergencyPanel
}: UseGlobalShortcutsOptions): void {
  useEffect(() => {
    const handler = (): void => setShowShortcuts(true)
    const paletteHandler = (): void => setShowCommandPalette((v) => !v)
    document.addEventListener('sion:show-shortcuts', handler)
    document.addEventListener('sion:toggle-command-palette', paletteHandler)
    return () => {
      document.removeEventListener('sion:show-shortcuts', handler)
      document.removeEventListener('sion:toggle-command-palette', paletteHandler)
    }
  }, [setShowCommandPalette, setShowShortcuts])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const tag = target?.tagName
      const role = target?.getAttribute?.('role')
      const isTyping =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable ||
        role === 'textbox' ||
        role === 'searchbox'

      if (isTyping) {
        if (e.ctrlKey && e.code === 'KeyS' && currentScreen === 'song-editor') {
          e.preventDefault()
          document.dispatchEvent(new CustomEvent('sion:save-song'))
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
        return
      }

      if (e.ctrlKey && e.code === 'KeyP') {
        e.preventDefault()
        setShowCommandPalette((v) => !v)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault()
        useAppStore.getState().toggleFocusMode()
        return
      }

      // FIX UX-10: Ctrl+B conflict resolution.
      // In PROJECTION/BROADCAST mode, bare 'B' is Black Out — Ctrl+B opening
      // the Bible is confusing and dangerous (operator may hit Ctrl+B
      // thinking it's a modifier for Black Out).
      // Solution: Ctrl+B opens Bible only when NOT in Projection/Broadcast mode.
      // In Projection/Broadcast mode, use Ctrl+Shift+B instead.
      if (e.ctrlKey && e.code === 'KeyB') {
        const currentMode = useModeStore.getState().currentMode
        const isProjectionMode = currentMode === 'PROJECTION' || currentMode === 'BROADCAST'

        if (e.shiftKey || !isProjectionMode) {
          // Ctrl+Shift+B always works; Ctrl+B works only outside projection
          e.preventDefault()
          // Navigate to Library mode > Bible workspace
          setScreen('dashboard')
          useModeStore.getState().setMode('LIBRARY')
          useAppStore.getState().setActiveLibraryWorkspace('bible')
          return
        }
        // In projection mode without Shift: fall through to let 'B' handle Black Out
        // (Ctrl+B in projection mode is intentionally ignored here)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
        e.preventDefault()
        setShowRuntimeInspector((v) => !v)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault()
        setShowRuntimeInspector((v) => !v)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
        e.preventDefault()
        setShowEmergencyPanel((v) => !v)
        return
      }

      // Panic Recovery: resend current state to projection window (Ctrl+Alt+R)
      // NOTE: Ctrl+Shift+R is intercepted by Electron/Chromium for hard reload
      if (e.ctrlKey && e.altKey && e.code === 'KeyR') {
        e.preventDefault()
        // Resend current projection state to projection window
        const ps = useProjectionStore.getState()
        if (ps.programSlide) {
          window.api.projection.slideUpdate(ps.programSlide)
        }
        window.api.projection.stateChange(ps.projectionState)
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
        return
      }

      // §5.4.1: Ctrl+1/2/3/4 — Mode switch shortcuts
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const modeMap: Record<string, 'LIBRARY' | 'PROJECTION' | 'MANAGEMENT' | 'BROADCAST'> = {
          Digit1: 'LIBRARY',
          Digit2: 'PROJECTION',
          Digit3: 'MANAGEMENT'
          // Digit4: 'BROADCAST' // Hidden in beta — not yet production-ready
        }
        const targetMode = modeMap[e.code]
        if (targetMode) {
          e.preventDefault()
          useModeStore.getState().setMode(targetMode)
          return
        }
      }

      // §5.4.1: Ctrl+, — Open Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        setScreen('settings')
        return
      }

      // §5.4.1: Ctrl+I — Open Import/Export
      if (e.ctrlKey && !e.shiftKey && e.code === 'KeyI') {
        e.preventDefault()
        setScreen('import-export')
        return
      }

      if (
        useModeStore.getState().currentMode !== 'PROJECTION' &&
        useModeStore.getState().currentMode !== 'BROADCAST'
      ) {
        return
      }

      const store = useProjectionStore.getState()

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'KEYBOARD')
          break
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          if (e.shiftKey) executeRuntimeCommand('NAV_CUE_NEXT', undefined, 'KEYBOARD')
          else executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'KEYBOARD')
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          if (e.shiftKey) executeRuntimeCommand('NAV_CUE_PREV', undefined, 'KEYBOARD')
          else executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'KEYBOARD')
          break
        case 'KeyB':
          e.preventDefault()
          executeRuntimeCommand('PROJ_BLACK', undefined, 'KEYBOARD')
          break
        case 'KeyL':
          // FIX BUG-13: L key toggles LOGO standby mode
          if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault()
            {
              const ps = useProjectionStore.getState()
              if (ps.projectionState === 'LOGO') {
                // Toggle off — restore to CLEAR
                ps.setProjectionState('CLEAR')
                window.api.projection.stateChange('CLEAR')
              } else {
                // FIX: allow LOGO from ANY state including CLEAR
                // (operator may want logo standby before service starts)
                ps.setProjectionState('LOGO')
                window.api.projection.stateChange('LOGO')
              }
            }
          }
          break
        case 'KeyC':
        case 'Escape':
          if (e.ctrlKey && store.programLockState === 'LIVE_DIRTY') {
            e.preventDefault()
            executeRuntimeCommand('PROTECTION_DISCARD', undefined, 'KEYBOARD')
          } else if (!e.ctrlKey) {
            e.preventDefault()
            executeRuntimeCommand('PROJ_CLEAR', undefined, 'KEYBOARD')
          }
          break
        case 'KeyF':
          if (e.ctrlKey) {
            e.preventDefault()
            document.getElementById('song-search-input')?.focus()
          } else {
            e.preventDefault()
            executeRuntimeCommand('PROJ_FREEZE', undefined, 'KEYBOARD')
          }
          break
        case 'KeyN':
          if (e.ctrlKey) {
            e.preventDefault()
            useAppStore.getState().setEditingSong(null)
            setScreen('song-editor')
          }
          break
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9':
          if (activePlaylistId && playlistLength > 0 && !e.ctrlKey && !e.altKey) {
            const index = parseInt(e.code.replace('Digit', ''), 10) - 1
            if (index >= 0 && index < playlistLength) {
              e.preventDefault()
              const plStore = usePlaylistStore.getState()
              plStore.setActiveItemIndex(index)
              const item = plStore.playlistItems[index]
              const song = useAppStore.getState().songs.find((s) => s.id === item.song_id)
              if (song) {
                useAppStore.getState().setSelectedSong(song)
                useProjectionStore.getState().setSlides(generateSlidesForSong(song), {
                  hymnalCode: song.hymnal_code || 'LS',
                  hymnalName: song.hymnal_name || 'Lagu Sion',
                  songBackgroundConfig: song.song_background_config || ''
                })
              }
            }
          }
          break
        case 'Enter':
          if (e.ctrlKey && store.programLockState === 'LIVE_DIRTY') {
            e.preventDefault()
            executeRuntimeCommand('PROTECTION_UPDATE_LIVE', undefined, 'KEYBOARD')
          }
          break
        case 'KeyG':
          if (e.ctrlKey) {
            e.preventDefault()
            setShowQuickJump(true)
          } else if (!e.altKey && !e.shiftKey) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('sion:quickjump-waiting', { detail: 'slide' }))
          }
          break
        case 'KeyS':
          if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('sion:quickjump-waiting', { detail: 'section' }))
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    activePlaylistId,
    currentScreen,
    playlistLength,
    setScreen,
    setShowCommandPalette,
    setShowQuickJump,
    setShowRuntimeInspector,
    setShowEmergencyPanel,
    setShowShortcuts
  ])
}
