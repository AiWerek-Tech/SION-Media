import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useModeStore } from '../store/useModeStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlidesForSong } from '../engine/slideEngine'
import { executeRuntimeCommand } from '../utils/runtimeCommandBus'
import type { AppScreen } from '../types'

interface UseGlobalShortcutsOptions {
  currentScreen: AppScreen
  activePlaylistId: number | null
  playlistLength: number
  setScreen: (screen: AppScreen) => void
  setShowCommandPalette: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowShortcuts: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowQuickJump: (value: boolean | ((prev: boolean) => boolean)) => void
  setShowRuntimeInspector: (value: boolean | ((prev: boolean) => boolean)) => void
}

export function useGlobalShortcuts({
  currentScreen,
  activePlaylistId,
  playlistLength,
  setScreen,
  setShowCommandPalette,
  setShowShortcuts,
  setShowQuickJump,
  setShowRuntimeInspector
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

      if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
        e.preventDefault()
        setShowRuntimeInspector((v) => !v)
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
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
                useProjectionStore.getState().setSlides(generateSlidesForSong(song))
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
    setShowShortcuts
  ])
}
