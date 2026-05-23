/**
 * Playlist Handlers
 *
 * Runtime playlist commands are responsible for transitioning playlist items
 * into preview or next-song state. This module acts as the store-adapter seam
 * for playlist-driven projection behavior.
 *
 * @module handlers/playlist
 */

import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { generateSlidesForSong } from '@core/projection'
import { logger } from '@renderer/utils/logger'
import type { PlaylistItem, Song } from '@renderer/types'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

const playlistStore = usePlaylistStore.getState
const appStore = useAppStore.getState
const projectionStore = useProjectionStore.getState

function playlistStoreAdapter(): {
  setActiveItemIndex: (index: number) => void
  loadNextSong: (
    song: Song,
    slides: ReturnType<typeof generateSlidesForSong>,
    playlistIndex?: number | null
  ) => void
  cueSong: (song: Song, slides: ReturnType<typeof generateSlidesForSong>) => void
  cueNextSong: () => boolean
} {
  return {
    setActiveItemIndex: (index: number) => playlistStore().setActiveItemIndex(index),
    loadNextSong: (
      song: Song,
      slides: ReturnType<typeof generateSlidesForSong>,
      playlistIndex?: number | null
    ) => projectionStore().loadNextSong(song, slides, playlistIndex),
    cueSong: (song: Song, slides: ReturnType<typeof generateSlidesForSong>) => {
      appStore().setSelectedSong(song)
      projectionStore().setSlides(slides, {
        hymnalCode: song.hymnal_code || 'LS',
        hymnalName: song.hymnal_name || 'Lagu Sion',
        songBackgroundConfig: song.song_background_config || ''
      })
    },
    cueNextSong: () => {
      const nextSong = projectionStore().nextSong
      const queuedSlides = projectionStore().queuedSlides
      const nextSongIndex = projectionStore().nextSongIndex
      if (!nextSong || queuedSlides.length === 0) return false

      appStore().setSelectedSong(nextSong)
      if (typeof nextSongIndex === 'number') {
        playlistStore().setActiveItemIndex(nextSongIndex)
      }
      projectionStore().setSlides(queuedSlides, {
        hymnalCode: nextSong.hymnal_code || 'LS',
        hymnalName: nextSong.hymnal_name || 'Lagu Sion',
        songBackgroundConfig: nextSong.song_background_config || ''
      })
      projectionStore().clearNextSong()
      return true
    }
  }
}

function findPlaylistItem(itemId: number): PlaylistItem | undefined {
  return playlistStore().playlistItems.find((item) => item.id === itemId)
}

function findSong(songId: number): Song | undefined {
  return appStore().songs.find((song) => song.id === songId)
}

// ============================================================================
// Playlist Handler Implementations
// ============================================================================

export async function handlePlaylistLoadItem(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const itemId = cmd.payload?.itemId as number | undefined
    const position = (cmd.payload?.position as 'CUE' | 'NEXT' | undefined) ?? 'CUE'

    if (typeof itemId !== 'number') {
      return {
        id: `playlist_load_item_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing or invalid itemId',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const item = findPlaylistItem(itemId)
    if (!item) {
      return {
        id: `playlist_load_item_not_found_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: `Playlist item ${itemId} not found`,
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const song = findSong(item.song_id)
    if (!song) {
      return {
        id: `playlist_load_item_song_missing_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: `Song for playlist item ${itemId} not loaded`,
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const slides = generateSlidesForSong(song)

    if (position === 'NEXT') {
      const index = playlistStore().playlistItems.findIndex(
        (playlistItem) => playlistItem.id === itemId
      )
      playlistStoreAdapter().loadNextSong(song, slides, index >= 0 ? index : null)
      logger.info('[PlaylistHandler] playlist:load-item executed as NEXT', {
        itemId,
        source: cmd.source
      })
      return {
        id: `playlist_load_item_next_${Date.now()}`,
        success: true,
        status: 'SUCCESS',
        level: 'INFO',
        result: { itemId, position },
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const index = playlistStore().playlistItems.findIndex(
      (playlistItem) => playlistItem.id === itemId
    )
    if (index >= 0) {
      playlistStoreAdapter().setActiveItemIndex(index)
    }

    playlistStoreAdapter().cueSong(song, slides)
    logger.info('[PlaylistHandler] playlist:load-item executed', { itemId, source: cmd.source })

    return {
      id: `playlist_load_item_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      result: { itemId, position },
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `playlist_load_item_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}

export async function handlePlaylistQueueNext(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const itemId = cmd.payload?.itemId as number | undefined
    if (typeof itemId !== 'number') {
      return {
        id: `playlist_queue_next_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing or invalid itemId',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const item = findPlaylistItem(itemId)
    if (!item) {
      return {
        id: `playlist_queue_next_not_found_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: `Playlist item ${itemId} not found`,
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const song = findSong(item.song_id)
    if (!song) {
      return {
        id: `playlist_queue_next_song_missing_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: `Song for playlist item ${itemId} not loaded`,
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    const slides = generateSlidesForSong(song)
    const index = playlistStore().playlistItems.findIndex(
      (playlistItem) => playlistItem.id === itemId
    )
    playlistStoreAdapter().loadNextSong(song, slides, index >= 0 ? index : null)

    logger.info('[PlaylistHandler] playlist:queue-next executed', { itemId, source: cmd.source })

    return {
      id: `playlist_queue_next_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      result: { itemId },
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `playlist_queue_next_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}

export async function handlePlaylistCueNext(cmd: RuntimeCommand): Promise<RuntimeCommandResult> {
  try {
    const success = playlistStoreAdapter().cueNextSong()
    if (!success) {
      return {
        id: `playlist_cue_next_missing_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'No next song queued',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    logger.info('[PlaylistHandler] playlist:cue-next executed', { source: cmd.source })
    return {
      id: `playlist_cue_next_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    return {
      id: `playlist_cue_next_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
