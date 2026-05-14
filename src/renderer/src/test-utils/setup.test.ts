/**
 * Phase 0 validation test
 * Verifies: renderer test environment is correctly configured
 */

import { describe, it, expect, vi } from 'vitest'
import { mockSong, mockSlide, mockPlaylist, mockHymnal } from './helpers'

describe('Phase 0: Renderer test environment', () => {
  describe('window.api mock', () => {
    it('window.api is defined', () => {
      expect(window.api).toBeDefined()
    })

    it('window.api.songs.getAll is a mock function', () => {
      expect(window.api.songs.getAll).toBeDefined()
      expect(vi.isMockFunction(window.api.songs.getAll)).toBe(true)
    })

    it('window.api.projection.slideUpdate is a mock function', () => {
      expect(vi.isMockFunction(window.api.projection.slideUpdate)).toBe(true)
    })

    it('window.api.system.getRecoveryState returns needsRecovery: false by default', async () => {
      const result = await window.api.system.getRecoveryState()
      expect(result).toEqual({ needsRecovery: false })
    })

    it('window.api.display.getAll returns one display by default', async () => {
      const displays = await window.api.display.getAll()
      expect(displays).toHaveLength(1)
      expect((displays[0] as { isPrimary: boolean }).isPrimary).toBe(true)
    })

    it('IPC listener mocks return cleanup functions', () => {
      const cleanup = window.api.projection.onSlideUpdate(() => {})
      expect(typeof cleanup).toBe('function')
    })
  })

  describe('Mock data factories', () => {
    it('mockSong creates a valid Song object', () => {
      const song = mockSong()
      expect(song.id).toBe(1)
      expect(song.title).toBe('Test Song')
      expect(song.hymnal_code).toBe('LS')
      expect(song.lyrics_raw).toContain('[Verse 1]')
    })

    it('mockSong accepts overrides', () => {
      const song = mockSong({ id: 42, title: 'Custom Song', is_favorite: 1 })
      expect(song.id).toBe(42)
      expect(song.title).toBe('Custom Song')
      expect(song.is_favorite).toBe(1)
    })

    it('mockSlide creates a valid SlideData object', () => {
      const slide = mockSlide(0)
      expect(slide.slideIndex).toBe(0)
      expect(slide.songId).toBe(1)
      expect(slide.sectionLabel).toBe('Verse 1')
      expect(slide.text).toContain('Slide 1')
    })

    it('mockSlide with custom text', () => {
      const slide = mockSlide(2, 'Custom text\nSecond line')
      expect(slide.text).toBe('Custom text\nSecond line')
      expect(slide.slideIndex).toBe(2)
    })

    it('mockPlaylist creates a valid Playlist object', () => {
      const playlist = mockPlaylist()
      expect(playlist.id).toBe(1)
      expect(playlist.name).toBe('Ibadah Minggu')
    })

    it('mockHymnal creates a valid Hymnal object', () => {
      const hymnal = mockHymnal()
      expect(hymnal.code).toBe('LS')
      expect(hymnal.is_official).toBe(1)
    })
  })

  describe('Mock isolation', () => {
    it('mocks are cleared between tests (vi.clearAllMocks in afterEach)', () => {
      // Call a mock in this test
      window.api.projection.slideUpdate({ test: true })
      expect(window.api.projection.slideUpdate).toHaveBeenCalledOnce()
      // afterEach will clear this — verified by the next test
    })

    it('mock call count is 0 at start of each test', () => {
      // This test runs after the previous one
      // afterEach cleared the mocks, so call count should be 0
      expect(window.api.projection.slideUpdate).not.toHaveBeenCalled()
    })
  })
})
