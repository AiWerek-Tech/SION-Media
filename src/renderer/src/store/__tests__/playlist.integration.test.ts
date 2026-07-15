import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { handlePlaylistCueNext, handlePlaylistQueueNext } from '@core/runtime/handlers/playlist'
import { getPlaylistComposition } from '@renderer/utils/playlistComposition'
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
    item_type: 'song',
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
  vi.mocked(window.api.playlists.updateItem).mockClear()

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
  test('propagates add-song failures so callers cannot report false success', async () => {
    const failure = new Error('write failed')
    vi.mocked(window.api.playlists.addItem).mockRejectedValueOnce(failure)

    await expect(
      usePlaylistStore.getState().addSongToPlaylist(makeSong(1, 'Opening'))
    ).rejects.toBe(failure)
  })

  test('creates a reusable playlist without retaining items from the previous playlist', async () => {
    const oldItem = makeItem(1, 1)
    usePlaylistStore.setState({ playlistItems: [oldItem], activeItemIndex: 0 })
    vi.mocked(window.api.playlists.add).mockResolvedValue({
      ...makePlaylist(),
      id: 2,
      name: 'Playlist Umum',
      service_date: ''
    })
    vi.mocked(window.api.playlists.getAll).mockResolvedValue([])

    await usePlaylistStore.getState().createPlaylist('  Playlist Umum  ', '')

    expect(window.api.playlists.add).toHaveBeenCalledWith({
      name: 'Playlist Umum',
      service_date: ''
    })
    expect(usePlaylistStore.getState().playlistItems).toEqual([])
    expect(usePlaylistStore.getState().activeItemIndex).toBe(-1)
  })

  test('removeItem keeps activeItemIndex inside bounds', async () => {
    const first = makeItem(1, 1)
    const second = makeItem(2, 2)
    const secondDto = { ...second, item_type: 'song' as const }
    usePlaylistStore.setState({ playlistItems: [first, second], activeItemIndex: 1 })
    vi.mocked(window.api.playlists.getItems).mockResolvedValue([secondDto])

    await usePlaylistStore.getState().removeItem(first.id)

    expect(usePlaylistStore.getState().playlistItems).toEqual([second])
    expect(usePlaylistStore.getState().activeItemIndex).toBe(0)
  })

  test('updates an Info playlist item so it can be edited instead of recreated', async () => {
    const infoItem: PlaylistItem = {
      id: 7,
      playlist_id: 1,
      song_id: null,
      sort_order: 0,
      section_label: '',
      item_type: 'info',
      title: 'Pengumuman',
      notes: 'Teks lama'
    }
    usePlaylistStore.setState({ playlistItems: [infoItem], activeItemIndex: 0 })

    await usePlaylistStore.getState().updateInfoItem(7, {
      title: 'Pengumuman Baru',
      body: 'Teks baru'
    })

    expect(window.api.playlists.updateItem).toHaveBeenCalledWith(7, {
      title: 'Pengumuman Baru',
      notes: 'Teks baru'
    })
    expect(usePlaylistStore.getState().playlistItems[0]).toMatchObject({
      title: 'Pengumuman Baru',
      notes: 'Teks baru'
    })
  })

  test('replaces a song in place without changing the active rundown position', async () => {
    const opening = makeItem(1, 1)
    const replacement = makeSong(2, 'New Opening')
    const updatedItem = {
      ...opening,
      item_type: 'song' as const,
      song_id: replacement.id,
      number: replacement.number,
      title: replacement.title
    }
    usePlaylistStore.setState({ playlistItems: [opening], activeItemIndex: 0 })
    vi.mocked(window.api.playlists.getItems).mockResolvedValue([updatedItem])

    await usePlaylistStore.getState().replaceSongItem(opening.id, replacement)

    expect(window.api.playlists.updateItem).toHaveBeenCalledWith(opening.id, {
      song_id: replacement.id
    })
    expect(usePlaylistStore.getState().playlistItems[0]).toMatchObject({
      song_id: 2,
      title: 'New Opening'
    })
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

describe('playlist mixed content summary', () => {
  test('counts songs, Bible, Info, and Media items separately', () => {
    expect(
      getPlaylistComposition([
        { song_id: 1, item_type: 'song' },
        { song_id: null, item_type: 'bible' },
        { song_id: null, item_type: 'info' },
        { song_id: null, item_type: 'media' }
      ])
    ).toEqual({ songs: 1, bible: 1, info: 1, media: 1 })
  })
})
