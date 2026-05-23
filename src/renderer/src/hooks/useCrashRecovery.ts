/**
 * useCrashRecovery — Phase 3 Updated
 *
 * On app start: checks for crash recovery state.
 * If needsRecovery: opens CrashRecoveryDialog via useModalStore.
 * User can choose to restore or start fresh.
 *
 * Also subscribes to state changes to auto-save session for future recovery.
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import { useEffect, useRef } from 'react'
import { generateSlidesForSong } from '@core/projection'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useModalStore } from '@renderer/store/useModalStore'
import type { Playlist, RecoveryState, Song } from '@renderer/types'
import { logger } from '@renderer/utils/logger'

/** Restore session state from a RecoveryState snapshot */
async function doRestoreSession(recoveryState: RecoveryState, songs: Song[]): Promise<void> {
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
      useProjectionStore.getState().setSlides(generateSlidesForSong(song), {
        hymnalCode: song.hymnal_code || 'LS',
        hymnalName: song.hymnal_name || 'Lagu Sion',
        songBackgroundConfig: song.song_background_config || ''
      })

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

export function useCrashRecovery(): void {
  const songs = useAppStore((s) => s.songs)
  const showToast = useAppStore((s) => s.showToast)
  const hasRecoveredRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function checkRecovery(): Promise<void> {
      try {
        if (hasRecoveredRef.current) return
        const recoveryState = (await window.api.system.getRecoveryState()) as RecoveryState
        if (!isMounted || !recoveryState?.needsRecovery) return
        hasRecoveredRef.current = true

        // Open CrashRecoveryDialog — user decides whether to restore
        useModalStore.getState().open('crash-recovery', 'crash-recovery', {
          recoveryState,
          onRestore: () => {
            void doRestoreSession(recoveryState, songs)
              .then(() => {
                showToast('Sesi berhasil dipulihkan', 'success')
                void window.api.system.markCleanExit()
              })
              .catch((err) => {
                logger.error('Recovery restore error:', err)
                showToast('Gagal memulihkan sesi', 'error')
              })
          },
          onDismiss: () => {
            void window.api.system.markCleanExit()
          }
        })
      } catch (err) {
        logger.error('Recovery check error:', err)
      }
    }

    void checkRecovery()

    // Auto-save session on state changes for future crash recovery (debounced 2000ms)
    let saveTimeout: ReturnType<typeof setTimeout> | null = null
    const debouncedSaveSession = (): void => {
      if (saveTimeout) clearTimeout(saveTimeout)
      saveTimeout = setTimeout(() => {
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
      }, 2000)
    }

    const unsubApp = useAppStore.subscribe((state, prevState) => {
      if (state.selectedSong?.id !== prevState.selectedSong?.id) debouncedSaveSession()
    })

    const unsubPl = usePlaylistStore.subscribe((state, prevState) => {
      if (state.activePlaylist?.id !== prevState.activePlaylist?.id) debouncedSaveSession()
    })

    const unsubProj = useProjectionStore.subscribe((state, prevState) => {
      if (
        state.currentSlideIndex !== prevState.currentSlideIndex ||
        state.projectionState !== prevState.projectionState
      ) {
        debouncedSaveSession()
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
