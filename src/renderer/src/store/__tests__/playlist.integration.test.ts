import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { handlePlaylistCueNext, handlePlaylistQueueNext } from '@core/runtime/handlers/playlist'
import type { Playlist, PlaylistItem, Song } from '@renderer/types'
import type { RuntimeCommand } from '@core/runtime/contracts'

function makePlaylist(): Playlist {
  return {
    id: 1,
    name: 'Sunday Service',
    service_date: '2026-05-23',
    description: '',
    created_at: '',
    updated_at: ''
  }
}

function makeSong(id: number, title: string): Song {
  return {
    id,
    hymnal_id: 1,
    number: String(id),
    title,
    alternate_title: '',
    lyrics_raw: '[VERSE 1]\nLine one\nLine two',
    category: '',
    language: 'id',
    author: '',
    composer: '',
    key_note: '',
    time_signature: '',
    tempo: '',
    tags: '',
    theme: '',
    scripture_reference: '',
    is_favorite: 0,
    created_at: '',
    updated_at: '',
    hymnal_code: 'LS',
    hymnal_name: 'Lagu Sion'
  }
}

function makeItem(id: number, songId: number): PlaylistItem {
  return {
    id,
    playlist_id: 1,
    song_id: songId,
    sort_order: id - 1,
    section_label: '',
    number: String(songId),
    title: `Song ${songId}`,
    alternate_title: '',
    lyrics_raw: '[VERSE 1]\nLine one\nLine two',
    category: '',
    key_note: '',
    time_signature: '',
    tempo: '',
    hymnal_code: 'LS',
    hymnal_name: 'Lagu Sion'
  }
}

function command(payload: Record<string, unknown>): RuntimeCommand {
  return {
    id: 'test-command',
    type: 'playlist:queue-next',
    source: 'UI_BUTTON',
    payload,
    timestamp: Date.now()
  } as RuntimeCommand
}

beforeEach(() => {
  vi.mocked(window.api.playlists.deleteItem).mockClear()
  vi.mocked(window.api.playlists.getItems).mockClear()

  usePlaylistStore.setState({
    activePlaylist: makePlaylist(),
    playlistItems: [],
    activeItemIndex: -1
  })
  useProjectionStore.setState({
    slides: [],
    currentSlideIndex: 0,
    nextSong: null,
    nextSongIndex: null,
    queuedSlides: [],
    hasNextSong: false
  })
  useAppStore.setState({
    songs: [makeSong(1, 'Opening'), makeSong(2, 'Response')],
    selectedSong: null
  })
})

describe('playlist store active item hygiene', () => {
  test('removeItem keeps activeItemIndex inside bounds', async () => {
    const first = makeItem(1, 1)
    const second = makeItem(2, 2)
    usePlaylistStore.setState({ playlistItems: [first, second], activeItemIndex: 1 })
    vi.mocked(window.api.playlists.getItems).mockResolvedValue([second])

    await usePlaylistStore.getState().removeItem(first.id)

    expect(usePlaylistStore.getState().playlistItems).toEqual([second])
    expect(usePlaylistStore.getState().activeItemIndex).toBe(0)
  })
})

describe('playlist runtime queue/cue next', () => {
  test('cue-next advances active playlist item and moves queued song to Preview', async () => {
    const first = makeItem(1, 1)
    const second = makeItem(2, 2)
    usePlaylistStore.setState({ playlistItems: [first, second], activeItemIndex: 0 })

    await handlePlaylistQueueNext(command({ itemId: second.id }))
    expect(useProjectionStore.getState().nextSongIndex).toBe(1)

    await handlePlaylistCueNext(command({}))

    expect(usePlaylistStore.getState().activeItemIndex).toBe(1)
    expect(useProjectionStore.getState().slides[0]?.songId).toBe(2)
    expect(useAppStore.getState().selectedSong?.id).toBe(2)
  })
})
