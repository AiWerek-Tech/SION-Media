import { create } from 'zustand'
import type {
  SlideData,
  ProjectionState,
  ProgramLockState,
  PendingChange,
  NextReadyState,
  Song,
  SectionIndexMap,
  SlideAddress
} from '../types'
import { logger } from '../utils/logger'
import { buildSectionIndexMap, resolveSlideAddress } from '../utils/slideAddressResolver'
import { buildConfidencePayload } from '../utils/confidencePayloadBuilder'

interface ProjectionStore {
  slides: SlideData[]
  setSlides: (slides: SlideData[], meta?: { hymnalCode: string; hymnalName: string }) => void
  cuedSongMeta: { hymnalCode: string; hymnalName: string } | null
  programSongMeta: { hymnalCode: string; hymnalName: string } | null
  programSlide: SlideData | null
  programSlides: SlideData[]
  programSlideIndex: number
  currentSlideIndex: number
  setCurrentSlideIndex: (index: number) => void
  projectionState: ProjectionState
  setProjectionState: (state: ProjectionState) => void
  fadeSpeed: number
  setFadeSpeed: (speed: number) => void

  // ═══════════════════════════════════════════════════════════════
  // RUNTIME PROTECTION STATE
  // ═══════════════════════════════════════════════════════════════
  programLockState: ProgramLockState
  pendingChanges: PendingChange[]
  hasPendingLiveChanges: boolean

  // ═══════════════════════════════════════════════════════════════
  // NEXT STATE - Upcoming content management
  // ═══════════════════════════════════════════════════════════════
  nextSlideData: SlideData | null
  nextSlideIndex: number | null
  hasNextSlide: boolean
  nextSong: Song | null
  nextSongIndex: number | null
  hasNextSong: boolean
  queuedSlides: SlideData[]
  nextReadyState: NextReadyState

  // ═══════════════════════════════════════════════════════════════
  // QUICK JUMP STATE - Semantic navigation
  // ═══════════════════════════════════════════════════════════════
  sectionMap: SectionIndexMap

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE MONITOR STATE - Timer & broadcast
  // ═══════════════════════════════════════════════════════════════
  timerElapsed: number
  timerRunning: boolean

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  cueNextSlide: () => void
  cuePrevSlide: () => void
  takeCue: () => void
  nextSlide: () => void
  prevSlide: () => void
  goToSlide: (index: number) => void
  toggleBlack: () => void
  toggleFreeze: () => void
  clearScreen: () => void
  hotSwapSlides: (songId: number, newSlides: SlideData[]) => void

  // Runtime Protection Actions
  markDirty: (change: PendingChange) => void
  updateLive: () => void
  discardChanges: () => void
  isProgramLocked: () => boolean

  // NEXT State Actions
  computeNextState: () => void
  loadNextSong: (song: Song, slides: SlideData[]) => void
  clearNextSong: () => void

  // Quick Jump Actions
  cueGoToSlide: (index: number) => void
  cueGoToSection: (section: string) => void
  cueGoToAddress: (address: SlideAddress) => void
  goToLiveSlide: (index: number) => void
  goToLiveSection: (section: string) => void
  goToLiveAddress: (address: SlideAddress) => void

  // Confidence Monitor Actions
  timerStart: () => void
  timerStop: () => void
  timerReset: () => void
  timerTick: () => void
  getConfidencePayload: () => import('../types').ConfidencePayload
}

function withNextSlide(slides: SlideData[], index: number): SlideData {
  return {
    ...slides[index],
    nextSlideText: slides[index + 1]?.text || ''
  }
}

function sendLiveSlide(slideData: SlideData): void {
  window.api.projection.stateChange('LIVE')
  window.api.projection.slideUpdate(slideData)
}

export const useProjectionStore = create<ProjectionStore>((set, get) => ({
  slides: [],
  setSlides: (slides, meta) => {
    const sectionMap = buildSectionIndexMap(slides)
    set({ slides, currentSlideIndex: 0, cuedSongMeta: meta ?? null, sectionMap })
    logger.info('[Quick Jump] Built section map:', Object.keys(sectionMap).join(', ') || 'none')
  },
  cuedSongMeta: null,
  programSongMeta: null,
  programSlide: null,
  programSlides: [],
  programSlideIndex: -1,
  currentSlideIndex: 0,

  // ═══════════════════════════════════════════════════════════════
  // RUNTIME PROTECTION STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  programLockState: 'UNLOCKED',
  pendingChanges: [],
  hasPendingLiveChanges: false,

  // ═══════════════════════════════════════════════════════════════
  // NEXT STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  nextSlideData: null,
  nextSlideIndex: null,
  hasNextSlide: false,
  nextSong: null,
  nextSongIndex: null,
  hasNextSong: false,
  queuedSlides: [],
  nextReadyState: 'EMPTY',

  // ═══════════════════════════════════════════════════════════════
  // QUICK JUMP STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  sectionMap: {},

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE MONITOR STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  timerElapsed: 0,
  timerRunning: false,

  setCurrentSlideIndex: (index) => {
    const { slides } = get()
    if (slides.length === 0) {
      set({ currentSlideIndex: 0 })
      return
    }
    set({ currentSlideIndex: Math.max(0, Math.min(index, slides.length - 1)) })
  },
  projectionState: 'CLEAR',
  setProjectionState: (state) => set({ projectionState: state }),
  fadeSpeed: 0.4,
  setFadeSpeed: (speed) => {
    set({ fadeSpeed: speed })
    window.api.settings
      .update('transition_duration', speed.toString())
      .catch((err) => logger.error('Failed to save transition_duration:', err))
    window.api.projection.themeUpdate({ transition_duration: speed.toString() })
  },

  cueNextSlide: () => {
    const { slides, currentSlideIndex } = get()
    if (slides.length === 0) return
    set({ currentSlideIndex: Math.min(currentSlideIndex + 1, slides.length - 1) })
  },

  cuePrevSlide: () => {
    const { slides, currentSlideIndex } = get()
    if (slides.length === 0) return
    set({ currentSlideIndex: Math.max(currentSlideIndex - 1, 0) })
  },

  takeCue: () => {
    const { currentSlideIndex, cuedSongMeta } = get()
    set({ programSongMeta: cuedSongMeta })
    get().goToSlide(currentSlideIndex)
  },

  nextSlide: () => {
    const { programSlides, programSlideIndex, projectionState } = get()
    if (programSlides.length === 0) return

    const shouldAdvance = projectionState === 'LIVE' || projectionState === 'FREEZE'
    if (!shouldAdvance) return

    const newIndex = Math.min(programSlideIndex + 1, programSlides.length - 1)
    const slideData = withNextSlide(programSlides, newIndex)

    set({ programSlideIndex: newIndex, projectionState: 'LIVE', programSlide: slideData })
    sendLiveSlide(slideData)
    get().computeNextState()
  },

  prevSlide: () => {
    const { programSlides, programSlideIndex, projectionState } = get()
    if (programSlides.length === 0) return

    const shouldNavigateLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
    if (!shouldNavigateLive) return

    const newIndex = Math.max(programSlideIndex - 1, 0)
    const slideData = withNextSlide(programSlides, newIndex)

    set({ programSlideIndex: newIndex, projectionState: 'LIVE', programSlide: slideData })
    sendLiveSlide(slideData)
    get().computeNextState()
  },

  goToSlide: (index) => {
    const { slides } = get()
    if (index >= 0 && index < slides.length) {
      const slideData = withNextSlide(slides, index)

      set({
        currentSlideIndex: index,
        programSlides: slides,
        programSlideIndex: index,
        projectionState: 'LIVE',
        programSlide: slideData,
        // ══════════════════════════════════════════════════════════
        // RUNTIME PROTECTION: Lock program when going LIVE
        // ══════════════════════════════════════════════════════════
        programLockState: 'LIVE_LOCK',
        pendingChanges: [],
        hasPendingLiveChanges: false
      })
      sendLiveSlide(slideData)
      get().computeNextState()
    }
  },

  toggleBlack: () => {
    const { projectionState } = get()
    const newState = projectionState === 'BLACK' ? 'LIVE' : 'BLACK'
    set({ projectionState: newState })
    window.api.projection.stateChange(newState)
    if (newState === 'LIVE') {
      const { programSlides, programSlideIndex, programSlide } = get()
      if (programSlide) {
        window.api.projection.slideUpdate(programSlide)
      } else if (programSlides[programSlideIndex]) {
        const slideData = withNextSlide(programSlides, programSlideIndex)
        set({ programSlide: slideData })
        window.api.projection.slideUpdate(slideData)
      }
    }
  },

  toggleFreeze: () => {
    const { projectionState } = get()
    const newState = projectionState === 'FREEZE' ? 'LIVE' : 'FREEZE'
    set({ projectionState: newState })
    window.api.projection.stateChange(newState)
    if (newState === 'LIVE') {
      const { programSlide } = get()
      if (programSlide) window.api.projection.slideUpdate(programSlide)
    }
  },

  clearScreen: () => {
    set({
      projectionState: 'CLEAR',
      // ══════════════════════════════════════════════════════════
      // RUNTIME PROTECTION: Unlock when output is cleared
      // ══════════════════════════════════════════════════════════
      programLockState: 'UNLOCKED',
      pendingChanges: [],
      hasPendingLiveChanges: false
    })
    window.api.projection.stateChange('CLEAR')
  },

  hotSwapSlides: (songId, newSlides) => {
    const {
      slides,
      currentSlideIndex,
      programSlide,
      programSlideIndex,
      projectionState,
      programLockState
    } = get()

    // ══════════════════════════════════════════════════════════
    // RUNTIME PROTECTION: Handle preview updates
    // ══════════════════════════════════════════════════════════
    const newCueIndex = Math.max(0, Math.min(currentSlideIndex, newSlides.length - 1))
    if (slides.length > 0 && slides[0].songId === songId) {
      set({ slides: newSlides, currentSlideIndex: newCueIndex })
    }

    // ══════════════════════════════════════════════════════════
    // RUNTIME PROTECTION: Handle program updates with lock awareness
    // ══════════════════════════════════════════════════════════
    if (programSlide?.songId === songId) {
      const newProgramIndex = Math.max(0, Math.min(programSlideIndex, newSlides.length - 1))

      if (newSlides.length > 0) {
        const slideData = withNextSlide(newSlides, newProgramIndex)

        // Check if program is LIVE_LOCKED
        if (programLockState === 'LIVE_LOCK') {
          // Changes go to preview only, mark as dirty
          set({
            slides: newSlides,
            currentSlideIndex: newCueIndex,
            programLockState: 'LIVE_DIRTY',
            hasPendingLiveChanges: true,
            pendingChanges: [
              ...get().pendingChanges,
              {
                type: 'slide_content' as const,
                timestamp: Date.now(),
                description: 'Lyrics updated while live'
              }
            ]
          })
          logger.warn('[Runtime Protection] Program is LIVE_LOCK, changes stored in preview only')
        } else {
          // Not locked, apply directly
          set({
            programSlides: newSlides,
            programSlideIndex: newProgramIndex,
            programSlide: slideData
          })
          if (projectionState === 'LIVE') sendLiveSlide(slideData)
        }
      } else {
        set({
          programSlides: [],
          programSlideIndex: -1,
          projectionState: 'CLEAR',
          programSlide: null,
          programLockState: 'UNLOCKED',
          pendingChanges: [],
          hasPendingLiveChanges: false
        })
        window.api.projection.stateChange('CLEAR')
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // RUNTIME PROTECTION ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark program as dirty with a pending change record
   */
  markDirty: (change: PendingChange) => {
    const { programLockState } = get()
    if (programLockState === 'LIVE_LOCK') {
      set({
        programLockState: 'LIVE_DIRTY',
        hasPendingLiveChanges: true,
        pendingChanges: [...get().pendingChanges, change]
      })
      logger.warn('[Runtime Protection] Program marked as LIVE_DIRTY:', change.type)
    }
  },

  /**
   * Commit pending changes to live output
   * Requires explicit confirmation from operator
   */
  updateLive: () => {
    const { slides, currentSlideIndex, programLockState, pendingChanges } = get()

    if (programLockState !== 'LIVE_DIRTY') {
      logger.warn('[Runtime Protection] updateLive called but not in LIVE_DIRTY state')
      return
    }

    // Apply pending changes to program
    const slideData = withNextSlide(slides, currentSlideIndex)
    set({
      programSlides: slides,
      programSlideIndex: currentSlideIndex,
      programSlide: slideData,
      programLockState: 'LIVE_LOCK',
      pendingChanges: [],
      hasPendingLiveChanges: false
    })

    sendLiveSlide(slideData)
    logger.info(
      '[Runtime Protection] Live updated with pending changes:',
      pendingChanges.length,
      'changes'
    )
  },

  /**
   * Discard pending changes and revert preview to match program
   */
  discardChanges: () => {
    const { programSlides, programSlideIndex, programLockState } = get()

    if (programLockState !== 'LIVE_DIRTY') {
      logger.warn('[Runtime Protection] discardChanges called but not in LIVE_DIRTY state')
      return
    }

    // Revert preview to match program
    set({
      slides: programSlides,
      currentSlideIndex: programSlideIndex,
      programLockState: 'LIVE_LOCK',
      pendingChanges: [],
      hasPendingLiveChanges: false
    })

    logger.info('[Runtime Protection] Pending changes discarded, preview synced with program')
  },

  /**
   * Check if program is currently locked (LIVE_LOCK or LIVE_DIRTY)
   */
  isProgramLocked: () => {
    const { programLockState } = get()
    return programLockState === 'LIVE_LOCK' || programLockState === 'LIVE_DIRTY'
  },

  // ═══════════════════════════════════════════════════════════════
  // NEXT STATE ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compute and update NEXT state based on current program state
   * Called automatically when programSlideIndex changes
   */
  computeNextState: () => {
    const { programSlides, programSlideIndex, nextSong, queuedSlides } = get()

    // Compute next slide
    const nextIndex = programSlideIndex + 1
    const hasNextSlide = programSlides.length > 0 && nextIndex < programSlides.length
    const nextSlideData = hasNextSlide ? programSlides[nextIndex] : null

    // Compute ready state
    const hasNextSong = nextSong !== null && queuedSlides.length > 0
    let readyState: NextReadyState = 'EMPTY'
    if (hasNextSlide && hasNextSong) {
      readyState = 'BOTH_READY'
    } else if (hasNextSlide) {
      readyState = 'SLIDE_READY'
    } else if (hasNextSong) {
      readyState = 'SONG_QUEUED'
    }

    set({
      nextSlideData,
      nextSlideIndex: hasNextSlide ? nextIndex : null,
      hasNextSlide,
      hasNextSong,
      nextReadyState: readyState
    })

    logger.info('[NEXT State] Computed:', {
      hasNextSlide,
      nextSlideIndex: hasNextSlide ? nextIndex : null,
      readyState
    })
  },

  /**
   * Pre-load next song into queuedSlides
   * Called when operator wants to prepare next song
   */
  loadNextSong: (song: Song, slides: SlideData[]) => {
    const { programSlide } = get()

    // Don't load if it's the same as current program song
    if (programSlide && song.id === programSlide.songId) {
      logger.warn('[NEXT State] Cannot load current program song as next')
      return
    }

    set({
      nextSong: song,
      nextSongIndex: null, // Will be set by playlist integration
      queuedSlides: slides,
      hasNextSong: true
    })

    // Recompute ready state
    get().computeNextState()

    logger.info('[NEXT State] Loaded next song:', song.title, 'with', slides.length, 'slides')
  },

  /**
   * Clear next song data
   * Called when switching contexts or after next song is taken
   */
  clearNextSong: () => {
    set({
      nextSong: null,
      nextSongIndex: null,
      queuedSlides: [],
      hasNextSong: false
    })

    // Recompute ready state
    get().computeNextState()

    logger.info('[NEXT State] Cleared next song')
  },

  // ═══════════════════════════════════════════════════════════════
  // QUICK JUMP ACTIONS - Semantic navigation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Navigate preview to a specific slide index
   * Safe - only affects preview, not live output
   */
  cueGoToSlide: (index: number) => {
    const { slides } = get()
    if (index >= 0 && index < slides.length) {
      set({ currentSlideIndex: index })
      logger.info('[Quick Jump] Preview navigated to slide', index + 1)
    }
  },

  /**
   * Navigate preview to a section
   * Finds the first occurrence of the section
   */
  cueGoToSection: (section: string) => {
    const { sectionMap } = get()
    const indices = sectionMap[section.toLowerCase()]
    if (indices && indices.length > 0) {
      set({ currentSlideIndex: indices[0] })
      logger.info('[Quick Jump] Preview navigated to section:', section, 'at slide', indices[0] + 1)
    } else {
      logger.warn('[Quick Jump] Section not found:', section)
    }
  },

  /**
   * Navigate preview using a slide address
   * Universal navigation method
   */
  cueGoToAddress: (address: SlideAddress) => {
    const { slides, sectionMap, currentSlideIndex } = get()
    const result = resolveSlideAddress(address, slides, sectionMap, currentSlideIndex)

    if (result.found && result.slideIndex !== null) {
      set({ currentSlideIndex: result.slideIndex })
      logger.info('[Quick Jump] Preview navigated:', result.description)
    } else {
      logger.warn('[Quick Jump] Navigation failed:', result.error)
    }
  },

  /**
   * Navigate live output to a specific slide index
   * DANGEROUS - directly affects live output
   * Should only be used when operator intends to change live content
   */
  goToLiveSlide: (index: number) => {
    const { programSlides, programLockState } = get()

    if (programLockState === 'LIVE_LOCK') {
      logger.warn('[Quick Jump] Cannot navigate live while LIVE_LOCK is active')
      return
    }

    if (index >= 0 && index < programSlides.length) {
      const slideData = withNextSlide(programSlides, index)
      set({
        programSlideIndex: index,
        programSlide: slideData,
        projectionState: 'LIVE'
      })
      sendLiveSlide(slideData)
      get().computeNextState()
      logger.info('[Quick Jump] Live navigated to slide', index + 1)
    }
  },

  /**
   * Navigate live output to a section
   * DANGEROUS - directly affects live output
   */
  goToLiveSection: (section: string) => {
    const { sectionMap, programLockState } = get()

    if (programLockState === 'LIVE_LOCK') {
      logger.warn('[Quick Jump] Cannot navigate live while LIVE_LOCK is active')
      return
    }

    const indices = sectionMap[section.toLowerCase()]
    if (indices && indices.length > 0) {
      get().goToLiveSlide(indices[0])
      logger.info('[Quick Jump] Live navigated to section:', section)
    } else {
      logger.warn('[Quick Jump] Section not found:', section)
    }
  },

  /**
   * Navigate live output using a slide address
   * DANGEROUS - directly affects live output
   * Universal navigation method for live
   */
  goToLiveAddress: (address: SlideAddress) => {
    const { programSlides, sectionMap, programSlideIndex, programLockState } = get()

    if (programLockState === 'LIVE_LOCK') {
      logger.warn('[Quick Jump] Cannot navigate live while LIVE_LOCK is active')
      return
    }

    const result = resolveSlideAddress(address, programSlides, sectionMap, programSlideIndex)

    if (result.found && result.slideIndex !== null) {
      get().goToLiveSlide(result.slideIndex)
      logger.info('[Quick Jump] Live navigated:', result.description)
    } else {
      logger.warn('[Quick Jump] Live navigation failed:', result.error)
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE MONITOR ACTIONS - Timer & payload
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start the timer
   */
  timerStart: () => {
    set({ timerRunning: true })
    logger.info('[Confidence] Timer started')
  },

  /**
   * Stop the timer
   */
  timerStop: () => {
    set({ timerRunning: false })
    logger.info('[Confidence] Timer stopped')
  },

  /**
   * Reset the timer to 0
   */
  timerReset: () => {
    set({ timerElapsed: 0, timerRunning: false })
    logger.info('[Confidence] Timer reset')
  },

  /**
   * Tick the timer (called by external interval)
   */
  timerTick: () => {
    const { timerRunning, timerElapsed } = get()
    if (timerRunning) {
      set({ timerElapsed: timerElapsed + 1 })
    }
  },

  /**
   * Build and return confidence payload for external displays
   */
  getConfidencePayload: () => {
    const {
      programSlide,
      programSlides,
      programSlideIndex,
      nextSlideData,
      programSongMeta,
      projectionState,
      timerElapsed
    } = get()

    // Use top-level import (no circular dependency since confidencePayloadBuilder only imports types)

    return buildConfidencePayload(
      programSlide,
      programSlides,
      programSlideIndex,
      nextSlideData,
      programSongMeta,
      projectionState,
      timerElapsed
    )
  }
}))
