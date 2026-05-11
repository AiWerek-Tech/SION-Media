import { useEffect, useRef } from 'react'
import { generateSlidesForSong } from '../engine/slideEngine'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import type { Playlist, RecoveryState } from '../types'
import { logger } from '../utils/logger'

export function useCrashRecovery(): void {
  const songs = useAppStore((s) => s.songs)
  const showToast = useAppStore((s) => s.showToast)
  const hasRecoveredRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function recoverSession(): Promise<void> {
      try {
        if (hasRecoveredRef.current) return
        const recoveryState = (await window.api.system.getRecoveryState()) as RecoveryState
        if (!isMounted || !recoveryState?.needsRecovery) return
        hasRecoveredRef.current = true

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
          const song = songs.find((s) => s.id === recoveryState.songId)
          if (song) {
            useAppStore.getState().setSelectedSong(song)
            useProjectionStore.getState().setSlides(generateSlidesForSong(song))

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
      } catch (err) {
        logger.error('Recovery error:', err)
      }
    }

    void recoverSession()

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
      unsubApp()
      unsubPl()
      unsubProj()
    }
  }, [showToast, songs])
}
