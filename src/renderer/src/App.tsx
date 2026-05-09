import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { usePlaylistStore } from './store/usePlaylistStore'
import { useProjectionStore } from './store/useProjectionStore'
import { SplashScreen } from './screens/SplashScreen'
import { SongEditorScreen } from './screens/SongEditorScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ImportExportScreen } from './screens/ImportExportScreen'
import { BibleScreen } from './screens/BibleScreen'
import { ProjectionMode } from './screens/modes/ProjectionMode'
import { LibraryMode } from './screens/modes/LibraryModeRedesigned'
import { ManagementMode } from './screens/modes/ManagementMode'
import { BroadcastMode } from './screens/modes/BroadcastMode'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { useModeStore } from './store/useModeStore'
import { Toast } from './components/Toast'
import { CommandPalette } from './components/CommandPalette'
import { KeyboardCheatSheet } from './components/KeyboardCheatSheet'
import { TitleBar } from './components/titlebar/TitleBar'
import { logger } from './utils/logger'
import { generateSlides } from './engine/slideEngine'
import type { RecoveryState, Playlist } from './types'

function App(): React.JSX.Element {
  const { isLoading, setLoading, currentScreen, setScreen, loadSongs, setDisplayCount, showToast } =
    useAppStore()
  const isLyricsFullscreen = useAppStore((s) => s.isLyricsFullscreen)
  const { loadPlaylists, playlistItems, activePlaylist } = usePlaylistStore()
  const { currentMode, isFirstInstall } = useModeStore()
  const [splashDone, setSplashDone] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    let isMounted = true
    let unsubscribeDisplay: (() => void) | undefined

    async function init(): Promise<void> {
      try {
        await loadSongs()
        await loadPlaylists()
        if (!isMounted) return
        const displays = await window.api.display.getAll()
        if (!isMounted) return
        setDisplayCount(displays.length)
        unsubscribeDisplay = window.api.display.onDisplayChanged((count: number) => {
          const prevCount = useAppStore.getState().displayCount
          setDisplayCount(count)
          if (count > prevCount) showToast('Monitor terhubung', 'success')
          else if (count < prevCount) showToast('Monitor terputus', 'error')
        })
        // Check for Crash Recovery
        const recoveryState = (await window.api.system.getRecoveryState()) as RecoveryState
        if (!isMounted) return
        if (recoveryState && recoveryState.needsRecovery) {
          showToast('Memulihkan sesi sebelumnya...', 'info')

          if (recoveryState.playlistId) {
            const playlists = (await window.api.playlists.getAll()) as Playlist[]
            const pl = playlists.find((p) => p.id === recoveryState.playlistId)
            if (pl) {
              const plStore = usePlaylistStore.getState()
              plStore.setActivePlaylist(pl)
              await plStore.loadPlaylistItems(pl.id)
            }
          }

          if (recoveryState.songId) {
            const songs = useAppStore.getState().songs
            const song = songs.find((s) => s.id === recoveryState.songId)
            if (song) {
              useAppStore.getState().setSelectedSong(song)
              useProjectionStore.getState().setSlides(generateSlides(song.id, song.lyrics_raw))

              // Restore slide index
              if (recoveryState.slideIndex !== undefined) {
                setTimeout(() => {
                  useProjectionStore.getState().setCurrentSlideIndex(recoveryState.slideIndex ?? 0)
                }, 100)
              }
            }
          }

          if (recoveryState.projectionState && recoveryState.projectionState !== 'CLEAR') {
            const ps = useProjectionStore.getState()
            if (recoveryState.projectionState === 'LIVE') ps.setProjectionState('LIVE')
            else if (recoveryState.projectionState === 'BLACK') ps.toggleBlack()
            else if (recoveryState.projectionState === 'FREEZE') ps.toggleFreeze()
          }
        }
      } catch (err) {
        logger.error('Init error:', err)
      } finally {
        setLoading(false)
      }
    }
    init()

    // Setup auto-save listener for crash recovery
    const saveSession = (): void => {
      const appState = useAppStore.getState()
      const plState = usePlaylistStore.getState()
      const projState = useProjectionStore.getState()

      window.api.system
        .saveSession({
          playlistId: plState.activePlaylist?.id,
          songId: appState.selectedSong?.id,
          slideIndex: projState.currentSlideIndex,
          projectionState: projState.projectionState
        })
        .catch(logger.error)
    }

    const unsubApp = useAppStore.subscribe((state, prevState) => {
      if (state.selectedSong?.id !== prevState.selectedSong?.id) saveSession()
    })

    const unsubPl = usePlaylistStore.subscribe((state, prevState) => {
      if (state.activePlaylist?.id !== prevState.activePlaylist?.id) saveSession()
    })

    const unsubProj = useProjectionStore.subscribe((state, prevState) => {
      if (
        state.currentSlideIndex !== prevState.currentSlideIndex ||
        state.projectionState !== prevState.projectionState
      ) {
        saveSession()
      }
    })

    return () => {
      isMounted = false
      unsubscribeDisplay?.()
      unsubApp()
      unsubPl()
      unsubProj()
    }
  }, [loadPlaylists, loadSongs, setDisplayCount, setLoading, showToast])

  useEffect(() => {
    if (isFirstInstall) {
      // Onboarding handles its own splash in Phase 1 (IntroPhase)
      setSplashDone(true)
      return undefined
    }
    if (!isLoading) {
      const timer = setTimeout(() => setSplashDone(true), 800)
      return (): void => {
        clearTimeout(timer)
      }
    }
    return undefined
  }, [isLoading, setScreen, isFirstInstall])

  // Listen for shortcut show event from CommandPalette
  useEffect(() => {
    const handler = (): void => {
      setShowShortcuts(true)
    }
    const paletteHandler = (): void => {
      setShowCommandPalette((v) => !v)
    }
    document.addEventListener('sion:show-shortcuts', handler)
    document.addEventListener('sion:toggle-command-palette', paletteHandler)
    return () => {
      document.removeEventListener('sion:show-shortcuts', handler)
      document.removeEventListener('sion:toggle-command-palette', paletteHandler)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      if (isTyping) {
        if (e.ctrlKey && e.code === 'KeyS' && currentScreen === 'song-editor') {
          e.preventDefault()
          document.dispatchEvent(new CustomEvent('sion:save-song'))
        }
        return
      }

      // Global shortcuts (work everywhere)
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

      // ? for shortcuts (only when not typing)
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
        return
      }

      // Dashboard-only shortcuts
      if (
        useModeStore.getState().currentMode !== 'PROJECTION' &&
        useModeStore.getState().currentMode !== 'BROADCAST'
      )
        return

      const store = useProjectionStore.getState()

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          store.takeCue()
          break
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault()
          store.nextSlide()
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          store.prevSlide()
          break
        case 'KeyB':
          e.preventDefault()
          store.toggleBlack()
          break
        case 'KeyC':
        case 'Escape':
          e.preventDefault()
          store.clearScreen()
          break
        case 'KeyF':
          if (e.ctrlKey) {
            e.preventDefault()
            document.getElementById('song-search-input')?.focus()
          } else {
            e.preventDefault()
            store.toggleFreeze()
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
          if (activePlaylist && playlistItems.length > 0 && !e.ctrlKey && !e.altKey) {
            const index = parseInt(e.code.replace('Digit', '')) - 1
            if (index >= 0 && index < playlistItems.length) {
              e.preventDefault()
              const plStore = usePlaylistStore.getState()
              plStore.setActiveItemIndex(index)
              const item = plStore.playlistItems[index]
              const song = useAppStore.getState().songs.find((s) => s.id === item.song_id)
              if (song) {
                useAppStore.getState().setSelectedSong(song)
                useProjectionStore.getState().setSlides(generateSlides(song.id, song.lyrics_raw))
              }
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentScreen, activePlaylist, playlistItems.length, setScreen])

  if (!splashDone) {
    return <SplashScreen isLoading={isLoading} />
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-base overflow-hidden">
      {!isLyricsFullscreen && <TitleBar />}
      <div className="flex-1 relative min-h-0">
        <Toast />
        <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
        <KeyboardCheatSheet isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
        <AnimatePresence mode="wait">
          {currentScreen === 'song-editor' ? (
            <motion.div
              key="song-editor"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <SongEditorScreen />
            </motion.div>
          ) : currentScreen === 'settings' ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <SettingsScreen />
            </motion.div>
          ) : currentScreen === 'import-export' ? (
            <motion.div
              key="import-export"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-bg-base z-50"
            >
              <ImportExportScreen />
            </motion.div>
          ) : currentScreen === 'bible' ? (
            <motion.div
              key="bible"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50"
            >
              <BibleScreen />
            </motion.div>
          ) : isFirstInstall ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-50 bg-bg-base"
            >
              <WelcomeScreen />
            </motion.div>
          ) : currentMode === 'PROJECTION' ? (
            <motion.div
              key="projection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ProjectionMode />
            </motion.div>
          ) : currentMode === 'LIBRARY' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <LibraryMode />
            </motion.div>
          ) : currentMode === 'MANAGEMENT' ? (
            <motion.div
              key="management"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ManagementMode />
            </motion.div>
          ) : currentMode === 'BROADCAST' ? (
            <motion.div
              key="broadcast"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <BroadcastMode />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
