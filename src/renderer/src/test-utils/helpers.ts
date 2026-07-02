/**
 * Test helper utilities for SION Media renderer tests
 *
 * Provides: mock data factories, store reset helpers, render wrappers
 */

import type { Song, Hymnal, Playlist, PlaylistItem, SlideData } from '@renderer/types'

// ============================================================================
// Mock Data Factories
// ============================================================================

export function mockSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 1,
    hymnal_id: 1,
    number: '1',
    title: 'Test Song',
    alternate_title: '',
    title_en: '',
    lyrics_raw: '[Verse 1]\nLine one\nLine two\n\n[Chorus]\nChorus line one\nChorus line two',
    category: 'Pujian',
    language: 'Indonesia',
    author: 'Test Author',
    composer: 'Test Composer',
    key_note: 'G',
    time_signature: '4/4',
    tempo: '72',
    tags: '',
    theme: '',
    scripture_reference: '',
    is_favorite: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    hymnal_code: 'LS',
    hymnal_name: 'Lagu Sion',
    ...overrides
  }
}

export function mockHymnal(overrides: Partial<Hymnal> = {}): Hymnal {
  return {
    id: 1,
    code: 'LS',
    name: 'Lagu Sion Edisi Lengkap',
    language: 'Indonesia',
    region: 'Indonesia',
    version: '1.0',
    publisher: 'GMAHK',
    is_official: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

export function mockPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 1,
    name: 'Ibadah Minggu',
    service_date: '2026-05-18',
    description: '',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

export function mockPlaylistItem(overrides: Partial<PlaylistItem> = {}): PlaylistItem {
  return {
    id: 1,
    playlist_id: 1,
    song_id: 1,
    sort_order: 0,
    section_label: '',
    item_type: 'song',
    number: '1',
    title: 'Test Song',
    alternate_title: '',
    lyrics_raw: '[Verse 1]\nLine one\nLine two',
    category: 'Pujian',
    key_note: 'G',
    time_signature: '4/4',
    tempo: '72',
    hymnal_code: 'LS',
    hymnal_name: 'Lagu Sion',
    ...overrides
  }
}

export function mockSlide(slideIndex: number, text?: string, songId = 1): SlideData {
  return {
    contentType: 'song',
    songId,
    slideIndex,
    text: text ?? `Slide ${slideIndex + 1} text\nSecond line`,
    sectionLabel: slideIndex === 0 ? 'Verse 1' : 'Chorus',
    nextSlideText: '',
    keyNote: 'G',
    timeSignature: '4/4',
    tempo: '72'
  }
}

export function mockSlides(count: number, songId = 1): SlideData[] {
  return Array.from({ length: count }, (_, i) => mockSlide(i, undefined, songId))
}

export const mockSongMeta = {
  hymnalCode: 'LS',
  hymnalName: 'Lagu Sion',
  songBackgroundConfig: ''
}

// ============================================================================
// Store Reset Helpers
// ============================================================================

/**
 * Reset useProjectionStore to clean initial state
 * Call in beforeEach for projection store tests
 */
export async function resetProjectionStore(): Promise<void> {
  const { useProjectionStore } = await import('../store/useProjectionStore')
  useProjectionStore.setState({
    slides: [],
    cuedSongMeta: null,
    cuedSongBackgroundConfig: '',
    programSongMeta: null,
    programSongBackgroundConfig: '',
    programSlide: null,
    programSlides: [],
    programSlideIndex: -1,
    currentSlideIndex: 0,
    projectionState: 'CLEAR',
    fadeSpeed: 0.4,
    programLockState: 'UNLOCKED',
    pendingChanges: [],
    hasPendingLiveChanges: false,
    nextSlideData: null,
    nextSlideIndex: null,
    hasNextSlide: false,
    nextSong: null,
    nextSongIndex: null,
    hasNextSong: false,
    queuedSlides: [],
    nextReadyState: 'EMPTY',
    sectionMap: {},
    timerElapsed: 0,
    timerRunning: false
  })
}

/**
 * Reset useAppStore to clean initial state
 */
export async function resetAppStore(): Promise<void> {
  const { useAppStore } = await import('../store/useAppStore')
  useAppStore.setState({
    currentScreen: 'dashboard',
    hymnals: [],
    selectedHymnalId: null,
    songs: [],
    selectedSong: null,
    searchQuery: '',
    activeFilter: 'all',
    editingSong: null,
    searchOffset: 0,
    hasMoreResults: false,
    isLoadingMore: false,
    displayCount: 1,
    isProjectionVisible: false,
    isStageDisplayVisible: false,
    isMaximized: false,
    isLyricsFullscreen: false,
    isFocusMode: false,
    workspaceName: '',
    serviceTimerStartTime: null,
    isLoading: false,
    loadingMessage: '',
    toast: null
  })
}
