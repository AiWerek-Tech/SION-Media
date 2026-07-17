import { create } from 'zustand'

// ── Navigation debounce guard ─────────────────────────────────────────────────
// Prevents rapid keyboard input (e.g. held arrow keys) from flooding the IPC
// channel with slide-update messages and causing projection desync.
// INVARIANT: at most one slide advance/retreat per NAV_DEBOUNCE_MS window.
let lastNavTimestamp = 0
const NAV_DEBOUNCE_MS = 50

import type {
  SlideData,
  ProjectionState,
  ProgramLockState,
  PendingChange,
  NextReadyState,
  Song,
  SectionIndexMap,
  SlideAddress,
  NavigationFlow
} from '@renderer/types'
import { logger } from '@renderer/utils/logger'
import { buildSectionIndexMap, resolveSlideAddress, requestTransition } from '@core/projection'
import { buildConfidencePayload } from '@core/projection'
import {
  resolveNavigationFlow,
  resolveFlowPosition,
  computeSmartNext,
  computeSmartPrev,
  computeSmartNextSlideData
} from '@core/projection/navigationFlowEngine'
import {
  createProjectionSnapshot,
  type ProjectionSnapshot
} from '@core/projection/state-machine/projection-snapshot'
import {
  executeProjectionEffects,
  createProjectionThemeUpdateEffect
} from '@core/projection/state-machine/effects'
import type { ProjectionEffect } from '@core/projection/state-machine/effects'
import type { ProjectionTransitionRequest } from '@core/projection'

interface ProjectionStore {
  slides: SlideData[]
  setSlides: (
    slides: SlideData[],
    meta?: { hymnalCode: string; hymnalName: string; songBackgroundConfig?: string }
  ) => void
  cuedSongMeta: { hymnalCode: string; hymnalName: string } | null
  cuedSongBackgroundConfig: string
  programSongMeta: { hymnalCode: string; hymnalName: string } | null
  programSongBackgroundConfig: string
  programSlide: SlideData | null
  programSlides: SlideData[]
  programSlideIndex: number
  currentSlideIndex: number
  setCurrentSlideIndex: (index: number) => void
  projectionState: ProjectionState
  setProjectionState: (state: ProjectionState) => void
  fadeSpeed: number
  setFadeSpeed: (speed: number) => void
  transitionType: string
  setTransitionType: (type: string) => void

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
  /** Section map for the CUE (preview) song — used by cueGoToSection */
  sectionMap: SectionIndexMap
  /** Section map for the PROGRAM (live) song — used by goToLiveSection */
  programSectionMap: SectionIndexMap

  // ═══════════════════════════════════════════════════════════════
  // SMART WORSHIP NAVIGATION STATE
  // ═══════════════════════════════════════════════════════════════
  /** Computed navigation flow for the current program song. null when no song is loaded. */
  navigationFlow: NavigationFlow | null
  /** Current position in navigationFlow.steps. -1 when no valid position. */
  flowPosition: number
  /** Shortcut: navigationFlow?.isSmartMode ?? false */
  isSmartMode: boolean

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE MONITOR STATE - Timer & broadcast
  // ═══════════════════════════════════════════════════════════════
  timerElapsed: number
  timerRunning: boolean

  // ═══════════════════════════════════════════════════════════════
  // EMERGENCY STATE - Projection overlay overrides
  // ═══════════════════════════════════════════════════════════════
  emergencyConfig: {
    active: boolean
    message?: string
    subMessage?: string
  }

  /** State saved before entering BLACK — used to restore on toggle off */
  prevStateBeforeBlack: ProjectionState | null

  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  cueNextSlide: () => void
  cuePrevSlide: () => void
  takeCue: () => void
  updateLiveExternalSourceFrame: (
    slides: SlideData[],
    meta: { hymnalCode: string; hymnalName: string; songBackgroundConfig?: string }
  ) => void
  nextSlide: () => void
  prevSlide: () => void
  goToSlide: (index: number) => void
  toggleBlack: () => void
  toggleFreeze: () => void
  toggleLogo: () => void
  clearScreen: () => void
  hotSwapSlides: (songId: number, newSlides: SlideData[]) => void

  // Runtime Protection Actions
  markDirty: (change: PendingChange) => void
  updateLive: () => void
  discardChanges: () => void
  isProgramLocked: () => boolean

  // NEXT State Actions
  computeNextState: () => void
  loadNextSong: (song: Song, slides: SlideData[], playlistIndex?: number | null) => void
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

  // Emergency Actions
  setEmergencyConfig: (config: { active: boolean; message?: string; subMessage?: string }) => void

  // ═══════════════════════════════════════════════════════════════
  // AUDIO PANEL STATE - VU Meter visibility management
  // ═══════════════════════════════════════════════════════════════
  isAudioPanelVisible: boolean
  toggleAudioPanel: () => void
  setAudioPanelVisible: (visible: boolean) => void
  mediaVolume: number
  mediaMuted: boolean
  setMediaVolume: (volume: number) => void
  setMediaMuted: (muted: boolean) => void
  instrumentVolume: number
  instrumentMuted: boolean
  setInstrumentVolume: (volume: number) => void
  setInstrumentMuted: (muted: boolean) => void

  // ═══════════════════════════════════════════════════════════════
  // LYRICS ZOOM STATE - Font size scaling for Preview and Live
  // ═══════════════════════════════════════════════════════════════
  lyricsFontSizePercent: number
  setLyricsFontSize: (percent: number) => void
  increaseLyricsFontSize: () => void
  decreaseLyricsFontSize: () => void
  resetLyricsFontSize: () => void
}

function withProgramNextSlide(
  slides: SlideData[],
  index: number,
  navigationFlow?: NavigationFlow | null,
  flowPosition = -1
): SlideData {
  const nextIndex =
    navigationFlow?.isSmartMode && flowPosition >= 0
      ? computeSmartNext(index, navigationFlow, flowPosition)
      : index + 1

  return {
    ...slides[index],
    nextSlideText:
      nextIndex !== null && nextIndex >= 0 && nextIndex < slides.length
        ? slides[nextIndex]?.text || ''
        : ''
  }
}

function extractCurrentProjectionSnapshot(get: () => ProjectionStore): ProjectionSnapshot {
  const store = get()

  return createProjectionSnapshot({
    projectionState: store.projectionState,
    slides: store.slides,
    currentSlideIndex: store.currentSlideIndex,
    programSlides: store.programSlides,
    programSlideIndex: store.programSlideIndex,
    programSlide: store.programSlide,
    cuedSongMeta: store.cuedSongMeta,
    programSongMeta: store.programSongMeta,
    cuedSongBackgroundConfig: store.cuedSongBackgroundConfig,
    programSongBackgroundConfig: store.programSongBackgroundConfig,
    programLockState: store.programLockState,
    pendingChanges: store.pendingChanges,
    hasPendingLiveChanges: store.hasPendingLiveChanges,
    // Use programSectionMap for live navigation (go-to-section/address use program slides)
    // Fall back to sectionMap (cue) if program map is empty (e.g. before first takeCue)
    sectionMap:
      Object.keys(store.programSectionMap).length > 0 ? store.programSectionMap : store.sectionMap
  })
}

function applyProjectionSnapshot(
  snapshot: ProjectionSnapshot,
  set: (state: Partial<ProjectionStore>) => void
): void {
  set({
    projectionState: snapshot.projectionState,
    slides: snapshot.slides,
    currentSlideIndex: snapshot.currentSlideIndex,
    programSlides: snapshot.programSlides,
    programSlideIndex: snapshot.programSlideIndex,
    programSlide: snapshot.programSlide,
    cuedSongMeta: snapshot.cuedSongMeta,
    programSongMeta: snapshot.programSongMeta,
    cuedSongBackgroundConfig: snapshot.cuedSongBackgroundConfig,
    programSongBackgroundConfig: snapshot.programSongBackgroundConfig,
    programLockState: snapshot.programLockState,
    pendingChanges: snapshot.pendingChanges,
    hasPendingLiveChanges: snapshot.hasPendingLiveChanges,
    sectionMap: snapshot.sectionMap
  })
}

/**
 * Map UI projection state to FSM state
 * NOTE: BLACK and LOGO are preserved as separate string literals to avoid
 * information loss during round-trips through the FSM layer.
 */
function mapUIStateToFSMState(
  uiState: ProjectionState
): 'IDLE' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'BLACK' | 'LOGO' {
  switch (uiState) {
    case 'CLEAR':
      return 'STOPPED'
    case 'LIVE':
      return 'ACTIVE'
    case 'FREEZE':
      return 'PAUSED'
    case 'BLACK':
      return 'BLACK' // FIX ARCH-02: preserve BLACK, not PAUSED
    case 'LOGO':
      return 'LOGO' // FIX ARCH-02: preserve LOGO, not PAUSED
    default:
      return 'STOPPED'
  }
}

/**
 * Map FSM state to UI projection state
 * FIX ARCH-02: BLACK and LOGO are now preserved through the round-trip.
 */
function mapFSMStateToUIState(
  fsmState: 'IDLE' | 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'BLACK' | 'LOGO' | string
): ProjectionState {
  switch (fsmState) {
    case 'STOPPED':
      return 'CLEAR'
    case 'ACTIVE':
      return 'LIVE'
    case 'PAUSED':
      return 'FREEZE'
    case 'IDLE':
      return 'CLEAR'
    case 'BLACK':
      return 'BLACK'
    case 'LOGO':
      return 'LOGO'
    default:
      return 'CLEAR'
  }
}

type ProjectionStoreAction = string | { type: string; payload?: unknown }

/**
 * FIX BUG-03: Unified projection transition executor.
 *
 * Previously, all `projection:*` actions bypassed the FSM and skipped IPC
 * broadcasts. Now each legacy action is handled with proper IPC side-effects
 * so the projection window always stays in sync.
 */
function executeProjectionTransition(
  action: ProjectionStoreAction,
  set: (state: Partial<ProjectionStore>) => void,
  get: () => ProjectionStore
): void {
  try {
    const { type, payload } = typeof action === 'string' ? { type: action, payload: {} } : action

    // ── Legacy / direct-action path ──────────────────────────────────────────
    // These actions bypass the FSM but MUST still broadcast IPC so the
    // projection window stays in sync.
    if (type.startsWith('projection:')) {
      if (type === 'projection:go-to-slide') {
        // FIX BUG-03: was only updating currentSlideIndex (CUE), not program
        const slideIndex = (payload as { slideIndex?: number }).slideIndex ?? 0
        const { programSlides, navigationFlow, flowPosition } = get()
        if (slideIndex >= 0 && slideIndex < programSlides.length) {
          const newFlowPosition = navigationFlow
            ? resolveFlowPosition(slideIndex, navigationFlow, flowPosition)
            : -1
          const slide = withProgramNextSlide(
            programSlides,
            slideIndex,
            navigationFlow,
            newFlowPosition
          )
          set({
            programSlideIndex: slideIndex,
            programSlide: slide,
            projectionState: 'LIVE',
            flowPosition: newFlowPosition
          })
          window.api.projection.stateChange('LIVE')
          window.api.projection.slideUpdate(slide)
          get().computeNextState()
        }
      } else if (type === 'projection:black') {
        // Toggle BLACK dengan restore ke state sebelumnya
        const { projectionState, programSlide, prevStateBeforeBlack } = get()
        if (projectionState === 'BLACK') {
          // Restore ke state sebelumnya yang tersimpan, atau LIVE sebagai fallback
          const restoreState: ProjectionState = prevStateBeforeBlack ?? 'LIVE'
          set({ projectionState: restoreState, prevStateBeforeBlack: null })
          window.api.projection.stateChange(restoreState)
          if (programSlide && restoreState !== 'CLEAR') {
            window.api.projection.slideUpdate(programSlide)
          }
        } else {
          // Simpan state sebelumnya sebelum masuk BLACK
          set({ projectionState: 'BLACK', prevStateBeforeBlack: projectionState })
          window.api.projection.stateChange('BLACK')
        }
      } else if (type === 'projection:freeze') {
        // FIX BUG-03: was missing IPC broadcast
        const { projectionState, programSlide } = get()
        if (projectionState === 'FREEZE') {
          set({ projectionState: 'LIVE' })
          window.api.projection.stateChange('LIVE')
          if (programSlide) window.api.projection.slideUpdate(programSlide)
        } else {
          set({ projectionState: 'FREEZE' })
          window.api.projection.stateChange('FREEZE')
        }
      } else if (type === 'projection:clear') {
        // FIX BUG-03: was missing IPC broadcast
        set({
          projectionState: 'CLEAR',
          programSlide: null,
          programSlideIndex: -1,
          programLockState: 'UNLOCKED',
          pendingChanges: [],
          hasPendingLiveChanges: false
        })
        window.api.projection.stateChange('CLEAR')
        get().computeNextState()
      }
      return
    }

    // ── FSM path ─────────────────────────────────────────────────────────────
    const currentSnapshot = extractCurrentProjectionSnapshot(get)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentFSMState: any = {
      state: mapUIStateToFSMState(currentSnapshot.projectionState),
      context: {
        currentSlideIndex: currentSnapshot.currentSlideIndex
      },
      timestamp: Date.now()
    }

    const transitionRequest: ProjectionTransitionRequest = {
      type: type as ProjectionTransitionRequest['type'],
      payload
    }
    const result = requestTransition(currentFSMState, transitionRequest)

    const updatedSnapshot = {
      ...currentSnapshot,
      ...result.newState,
      projectionState: mapFSMStateToUIState(result.newState.state)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyProjectionSnapshot(updatedSnapshot as any, set)
    get().computeNextState()

    executeProjectionEffects(result.sideEffects as unknown as ProjectionEffect[])
  } catch (err) {
    logger.error('[Projection Store] FSM transition failed:', err)
  }
}

export const useProjectionStore = create<ProjectionStore>((set, get) => ({
  slides: [],
  setSlides: (slides, meta) => {
    const sectionMap = buildSectionIndexMap(slides)
    const cueNavigationFlow = resolveNavigationFlow(slides)
    const hasActiveProgram = get().programSlides.length > 0 && get().programSlideIndex >= 0
    set({
      slides,
      currentSlideIndex: 0,
      cuedSongMeta: meta ? { hymnalCode: meta.hymnalCode, hymnalName: meta.hymnalName } : null,
      cuedSongBackgroundConfig: meta?.songBackgroundConfig || '',
      sectionMap,
      ...(hasActiveProgram
        ? {}
        : {
            navigationFlow: cueNavigationFlow,
            isSmartMode: cueNavigationFlow.isSmartMode,
            flowPosition: -1
          })
    })
    logger.info('[Quick Jump] Built section map:', Object.keys(sectionMap).join(', ') || 'none')
    logger.info(
      '[Smart Nav] Cue navigation flow resolved:',
      cueNavigationFlow.isSmartMode ? 'Smart_Mode' : 'Linear_Mode',
      `(${cueNavigationFlow.steps.length} steps)`
    )
    // Recompute next state after new slides are loaded
    setTimeout(() => get().computeNextState(), 0)
  },
  cuedSongMeta: null,
  cuedSongBackgroundConfig: '',
  programSongMeta: null,
  programSongBackgroundConfig: '',
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
  programSectionMap: {},

  // ═══════════════════════════════════════════════════════════════
  // SMART WORSHIP NAVIGATION STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  navigationFlow: null,
  flowPosition: -1,
  isSmartMode: false,

  // ═══════════════════════════════════════════════════════════════
  // CONFIDENCE MONITOR STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  timerElapsed: 0,
  timerRunning: false,

  // ═══════════════════════════════════════════════════════════════
  // EMERGENCY STATE - Initial Values
  // ═══════════════════════════════════════════════════════════════
  emergencyConfig: { active: false },

  prevStateBeforeBlack: null,

  // ═══════════════════════════════════════════════════════════════
  // AUDIO PANEL STATE - Initial Values (persisted via settings)
  // ═══════════════════════════════════════════════════════════════
  isAudioPanelVisible: false,
  mediaVolume: (() => {
    const saved = localStorage.getItem('sion_media_volume')
    return saved ? Number(saved) : 100
  })(),
  mediaMuted: (() => {
    const saved = localStorage.getItem('sion_media_muted')
    return saved === 'true'
  })(),
  instrumentVolume: (() => {
    const saved = localStorage.getItem('sion_instrument_volume')
    return saved ? Number(saved) : 70
  })(),
  instrumentMuted: (() => {
    const saved = localStorage.getItem('sion_instrument_muted')
    return saved === 'true'
  })(),

  // ═══════════════════════════════════════════════════════════════
  // LYRICS ZOOM STATE - Initial Values (persisted via settings)
  // ═══════════════════════════════════════════════════════════════
  lyricsFontSizePercent: 100,

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
    executeProjectionEffects([
      createProjectionThemeUpdateEffect({ transition_duration: speed.toString() })
    ])
    window.api.settings
      .update('transition_duration', speed.toString())
      .catch((err) => logger.error('Failed to save transition_duration:', err))
  },
  transitionType: 'smooth-blur',
  setTransitionType: (type) => {
    set({ transitionType: type })
    executeProjectionEffects([createProjectionThemeUpdateEffect({ transition_type: type })])
    window.api.settings
      .update('transition_type', type)
      .catch((err) => logger.error('Failed to save transition_type:', err))
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
    try {
      const { slides, currentSlideIndex, cuedSongMeta, cuedSongBackgroundConfig } = get()
      if (slides.length === 0) return

      const slideIndex = Math.max(0, Math.min(currentSlideIndex, slides.length - 1))
      const navigationFlow = resolveNavigationFlow(slides)
      // Compute flowPosition for the committed slide
      const newFlowPosition = navigationFlow
        ? resolveFlowPosition(slideIndex, navigationFlow, 0)
        : -1
      const slide = withProgramNextSlide(slides, slideIndex, navigationFlow, newFlowPosition)

      // Build programSectionMap from the slides being committed to program
      const newProgramSectionMap = buildSectionIndexMap(slides)

      // Commit CUE → PROGRAM
      set({
        projectionState: 'LIVE',
        programSlides: slides,
        programSlideIndex: slideIndex,
        programSlide: slide,
        programSongMeta: cuedSongMeta,
        programSongBackgroundConfig: cuedSongBackgroundConfig,
        programLockState: 'LIVE_LOCK',
        pendingChanges: [],
        hasPendingLiveChanges: false,
        navigationFlow,
        isSmartMode: navigationFlow.isSmartMode,
        flowPosition: newFlowPosition,
        programSectionMap: newProgramSectionMap
      })

      // Broadcast to projection window
      window.api.settings
        .getAll()
        .then((settings) => {
          if ((settings.display_auto_show_on_take ?? '1') === '1') window.api.projection.show()
        })
        .catch((err) => logger.error('[Projection Store] failed to read display settings:', err))
      window.api.projection.stateChange('LIVE')
      window.api.projection.slideUpdate(slide)
      window.api.projection.themeUpdate({
        song_background_config: cuedSongBackgroundConfig || ''
      })

      // Recompute next state
      get().computeNextState()

      logger.info(
        '[takeCue] Committed slide',
        slideIndex + 1,
        'to LIVE, flowPosition:',
        newFlowPosition
      )
    } catch (err) {
      logger.error('[Projection Store] takeCue failed:', err)
    }
  },

  updateLiveExternalSourceFrame: (slides, meta) => {
    try {
      if (slides.length === 0) return
      const slideIndex = 0
      const navigationFlow = resolveNavigationFlow(slides)
      const flowPosition = navigationFlow ? resolveFlowPosition(slideIndex, navigationFlow, 0) : -1
      const slide = withProgramNextSlide(slides, slideIndex, navigationFlow, flowPosition)
      const backgroundConfig = meta.songBackgroundConfig || ''
      set({
        projectionState: 'LIVE',
        programSlides: slides,
        programSlideIndex: slideIndex,
        programSlide: slide,
        programSongMeta: { hymnalCode: meta.hymnalCode, hymnalName: meta.hymnalName },
        programSongBackgroundConfig: backgroundConfig,
        navigationFlow,
        isSmartMode: navigationFlow.isSmartMode,
        flowPosition,
        programSectionMap: buildSectionIndexMap(slides)
      })
      window.api.projection.stateChange('LIVE')
      window.api.projection.slideUpdate(slide)
      window.api.projection.themeUpdate({ song_background_config: backgroundConfig })
      get().computeNextState()
    } catch (err) {
      logger.error('[Projection Store] updateLiveExternalSourceFrame failed:', err)
    }
  },

  nextSlide: () => {
    // Debounce guard — drop calls within NAV_DEBOUNCE_MS of the last accepted call
    const now = Date.now()
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    if (!isTest && now - lastNavTimestamp < NAV_DEBOUNCE_MS) return
    lastNavTimestamp = now

    const {
      programSlides,
      programSlideIndex,
      projectionState,
      navigationFlow,
      flowPosition,
      isSmartMode
    } = get()
    if (programSlides.length === 0) return

    const shouldAdvance = projectionState === 'LIVE' || projectionState === 'FREEZE'
    if (!shouldAdvance) return

    let nextIndex: number | null
    let newFlowPosition = flowPosition

    if (isSmartMode && navigationFlow) {
      // Smart Navigation
      nextIndex = computeSmartNext(programSlideIndex, navigationFlow, flowPosition)
      if (nextIndex === null) return // already at end of song
      // Clamp to valid range (safety guard)
      nextIndex = Math.min(nextIndex, programSlides.length - 1)
      if (nextIndex === programSlideIndex) return

      // CRITICAL: advance flowPosition by 1 when moving to next step.
      // Do NOT use resolveFlowPosition here — chorus slides appear multiple
      // times in the flow with the same slideIndex, so resolveFlowPosition
      // would always return the last matching step, breaking the sequence.
      const currentStep = navigationFlow.steps[flowPosition]
      if (currentStep && programSlideIndex >= currentStep.lastSlideIndex) {
        // We are leaving this step — advance to next step in flow
        newFlowPosition = Math.min(flowPosition + 1, navigationFlow.steps.length - 1)
      }
      // If still within the same section (linear advance), flowPosition stays the same
    } else {
      // Linear Navigation (existing behaviour)
      nextIndex = Math.min(programSlideIndex + 1, programSlides.length - 1)
      if (nextIndex === programSlideIndex) return // already at end
    }

    // Compute nextSlideText using Smart Navigation (Req 7.7)
    const afterNextIndex =
      isSmartMode && navigationFlow
        ? computeSmartNext(nextIndex, navigationFlow, newFlowPosition)
        : nextIndex + 1
    const nextSlideText =
      afterNextIndex !== null && afterNextIndex < programSlides.length
        ? programSlides[afterNextIndex]?.text || ''
        : ''

    const slide = {
      ...programSlides[nextIndex],
      nextSlideText
    }

    set({
      projectionState: 'LIVE',
      programSlideIndex: nextIndex,
      programSlide: slide,
      flowPosition: newFlowPosition
    })

    window.api.projection.stateChange('LIVE')
    window.api.projection.slideUpdate(slide)
    get().computeNextState()
  },

  prevSlide: () => {
    // Debounce guard — drop calls within NAV_DEBOUNCE_MS of the last accepted call
    const now = Date.now()
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    if (!isTest && now - lastNavTimestamp < NAV_DEBOUNCE_MS) return
    lastNavTimestamp = now

    const {
      programSlides,
      programSlideIndex,
      projectionState,
      navigationFlow,
      flowPosition,
      isSmartMode
    } = get()
    if (programSlides.length === 0) return

    const shouldNavigateLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
    if (!shouldNavigateLive) return

    let prevIndex: number | null
    let newFlowPosition = flowPosition

    if (isSmartMode && navigationFlow) {
      // Smart Navigation
      prevIndex = computeSmartPrev(programSlideIndex, navigationFlow, flowPosition)
      if (prevIndex === null) return // already at beginning of song
      // Clamp to valid range (safety guard)
      prevIndex = Math.max(prevIndex, 0)
      if (prevIndex === programSlideIndex) return

      // CRITICAL: decrement flowPosition by 1 when moving to previous step.
      // Do NOT use resolveFlowPosition here — same reason as nextSlide above.
      const currentStep = navigationFlow.steps[flowPosition]
      if (currentStep && programSlideIndex <= currentStep.firstSlideIndex) {
        // We are leaving this step backwards — go to previous step in flow
        newFlowPosition = Math.max(flowPosition - 1, 0)
      }
      // If still within the same section (linear retreat), flowPosition stays the same
    } else {
      // Linear Navigation (existing behaviour)
      prevIndex = Math.max(programSlideIndex - 1, 0)
      if (prevIndex === programSlideIndex) return // already at start
    }

    // Compute nextSlideText using Smart Navigation (Req 7.7)
    const afterPrevIndex =
      isSmartMode && navigationFlow
        ? computeSmartNext(prevIndex, navigationFlow, newFlowPosition)
        : prevIndex + 1
    const nextSlideText =
      afterPrevIndex !== null && afterPrevIndex < programSlides.length
        ? programSlides[afterPrevIndex]?.text || ''
        : ''

    const slide = {
      ...programSlides[prevIndex],
      nextSlideText
    }

    set({
      projectionState: 'LIVE',
      programSlideIndex: prevIndex,
      programSlide: slide,
      flowPosition: newFlowPosition
    })

    window.api.projection.stateChange('LIVE')
    window.api.projection.slideUpdate(slide)
    get().computeNextState()
  },

  goToSlide: (index) => {
    const { slides } = get()
    if (index >= 0 && index < slides.length) {
      try {
        executeProjectionTransition(
          { type: 'projection:go-to-slide', payload: { slideIndex: index } },
          set,
          get
        )
      } catch (err) {
        logger.error('[Projection Store] goToSlide transition failed:', err)
      }
    }
  },

  toggleBlack: () => {
    // BLACK bisa diaktifkan dari state apapun — operator mungkin perlu
    // black screen sebelum ada konten (misal saat persiapan ibadah)
    try {
      executeProjectionTransition({ type: 'projection:black', payload: {} }, set, get)
    } catch (err) {
      logger.error('[Projection Store] toggleBlack transition failed:', err)
    }
  },

  toggleFreeze: () => {
    const { projectionState } = get()
    // Cannot freeze from CLEAR or LOGO state — nothing to freeze
    if (projectionState === 'CLEAR' || projectionState === 'LOGO') return

    try {
      executeProjectionTransition({ type: 'projection:freeze', payload: {} }, set, get)
    } catch (err) {
      logger.error('[Projection Store] toggleFreeze transition failed:', err)
    }
  },

  toggleLogo: () => {
    const { projectionState } = get()
    const nextState: ProjectionState = projectionState === 'LOGO' ? 'CLEAR' : 'LOGO'

    try {
      set({
        projectionState: nextState,
        prevStateBeforeBlack: null,
        flowPosition: -1
      })
      window.api.projection.stateChange(nextState)
      get().computeNextState()
    } catch (err) {
      logger.error('[Projection Store] toggleLogo transition failed:', err)
    }
  },

  clearScreen: () => {
    const { projectionState } = get()
    if (projectionState === 'CLEAR') return

    try {
      executeProjectionTransition({ type: 'projection:clear', payload: {} }, set, get)
      // Reset flow position when screen is cleared
      set({ flowPosition: -1 })
    } catch (err) {
      logger.error('[Projection Store] clearScreen transition failed:', err)
    }
  },

  hotSwapSlides: (songId, newSlides) => {
    const { slides, currentSlideIndex, programSlide, programSlideIndex, programLockState } = get()

    // ══════════════════════════════════════════════════════════
    // RUNTIME PROTECTION: Handle preview updates
    // ══════════════════════════════════════════════════════════
    const newCueIndex = Math.max(0, Math.min(currentSlideIndex, newSlides.length - 1))
    const newCueSectionMap = buildSectionIndexMap(newSlides)
    if (slides.length > 0 && slides[0].songId === songId) {
      set({ slides: newSlides, currentSlideIndex: newCueIndex, sectionMap: newCueSectionMap })
    }

    // ══════════════════════════════════════════════════════════
    // RUNTIME PROTECTION: Handle program updates with lock awareness
    // ══════════════════════════════════════════════════════════
    if (programSlide?.songId === songId) {
      const newProgramIndex = Math.max(0, Math.min(programSlideIndex, newSlides.length - 1))

      // Re-compute navigation flow for the updated slides
      const newNavigationFlow = resolveNavigationFlow(newSlides)
      const newFlowPosition = resolveFlowPosition(
        newProgramIndex,
        newNavigationFlow,
        get().flowPosition
      )

      if (newSlides.length > 0) {
        const slideData = withProgramNextSlide(
          newSlides,
          newProgramIndex,
          newNavigationFlow,
          newFlowPosition
        )

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
            ],
            sectionMap: newCueSectionMap
          })
          logger.warn('[Runtime Protection] Program is LIVE_LOCK, changes stored in preview only')
        } else {
          // Not locked, apply directly
          set({
            programSlides: newSlides,
            programSlideIndex: newProgramIndex,
            programSlide: slideData,
            navigationFlow: newNavigationFlow,
            isSmartMode: newNavigationFlow.isSmartMode,
            flowPosition: newFlowPosition,
            programSectionMap: buildSectionIndexMap(newSlides)
          })
          // Effects will be executed by state sync if needed
        }
      } else {
        set({
          programSlides: [],
          programSlideIndex: -1,
          projectionState: 'CLEAR',
          programSlide: null,
          programLockState: 'UNLOCKED',
          pendingChanges: [],
          hasPendingLiveChanges: false,
          navigationFlow: null,
          isSmartMode: false,
          flowPosition: -1,
          programSectionMap: {}
        })
        // Effects will be executed by state sync
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

    if (slides.length === 0) {
      set({
        programSlides: [],
        programSlideIndex: -1,
        programSlide: null,
        projectionState: 'CLEAR',
        programLockState: 'UNLOCKED',
        pendingChanges: [],
        hasPendingLiveChanges: false,
        navigationFlow: null,
        isSmartMode: false,
        flowPosition: -1,
        programSectionMap: {}
      })
      window.api.projection.stateChange('CLEAR')
      return
    }

    const liveIndex = Math.max(0, Math.min(currentSlideIndex, slides.length - 1))
    const newNavigationFlow = resolveNavigationFlow(slides)
    const newFlowPosition = resolveFlowPosition(liveIndex, newNavigationFlow, get().flowPosition)
    const slideData = withProgramNextSlide(slides, liveIndex, newNavigationFlow, newFlowPosition)
    set({
      programSlides: slides,
      programSlideIndex: liveIndex,
      programSlide: slideData,
      programLockState: 'LIVE_LOCK',
      pendingChanges: [],
      hasPendingLiveChanges: false,
      navigationFlow: newNavigationFlow,
      isSmartMode: newNavigationFlow.isSmartMode,
      flowPosition: newFlowPosition,
      programSectionMap: buildSectionIndexMap(slides)
    })

    // FIX BUG-06 side-effect: broadcast updated slide to projection window
    window.api.projection.slideUpdate(slideData)

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
      sectionMap: buildSectionIndexMap(programSlides),
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
    const {
      programSlides,
      programSlideIndex,
      nextSong,
      queuedSlides,
      navigationFlow,
      flowPosition,
      isSmartMode
    } = get()

    // Compute next slide — Smart_Mode uses flow-aware resolver
    let nextSlideData: SlideData | null = null
    let nextIndex: number | null = null
    const hasActiveProgramSlide = programSlides.length > 0 && programSlideIndex >= 0

    if (hasActiveProgramSlide && isSmartMode && navigationFlow) {
      nextSlideData = computeSmartNextSlideData(
        programSlides,
        programSlideIndex,
        navigationFlow,
        flowPosition
      )
      if (nextSlideData) {
        const smartNextIndex = computeSmartNext(programSlideIndex, navigationFlow, flowPosition)
        nextIndex =
          smartNextIndex !== null ? Math.min(smartNextIndex, programSlides.length - 1) : null
      }
    } else if (hasActiveProgramSlide) {
      const linearNextIndex = programSlideIndex + 1
      const hasNext = programSlides.length > 0 && linearNextIndex < programSlides.length
      nextSlideData = hasNext ? programSlides[linearNextIndex] : null
      nextIndex = hasNext ? linearNextIndex : null
    }

    const hasNextSlide = nextSlideData !== null

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
      nextSlideIndex: nextIndex,
      hasNextSlide,
      hasNextSong,
      nextReadyState: readyState
    })

    logger.info('[NEXT State] Computed:', {
      hasNextSlide,
      nextSlideIndex: nextIndex,
      readyState,
      smartMode: isSmartMode
    })
  },

  /**
   * Pre-load next song into queuedSlides
   * Called when operator wants to prepare next song
   */
  loadNextSong: (song: Song, slides: SlideData[], playlistIndex = null) => {
    const { programSlide } = get()

    // Don't load if it's the same as current program song
    if (programSlide && song.id === programSlide.songId) {
      logger.warn('[NEXT State] Cannot load current program song as next')
      return
    }

    set({
      nextSong: song,
      nextSongIndex: playlistIndex,
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
   * FIX BUG-02: removed incorrect LIVE_LOCK guard — navigating live slides
   * is exactly what operators need to do while the program is live.
   */
  goToLiveSlide: (index: number) => {
    const { programSlides, navigationFlow } = get()

    if (index >= 0 && index < programSlides.length) {
      try {
        executeProjectionTransition(
          { type: 'projection:go-to-slide', payload: { slideIndex: index } },
          set,
          get
        )
        // Update flowPosition to match the new slide
        if (navigationFlow) {
          const newFlowPosition = resolveFlowPosition(index, navigationFlow, get().flowPosition)
          set({ flowPosition: newFlowPosition })
        }
        logger.info('[Quick Jump] Live navigated to slide', index + 1)
      } catch (err) {
        logger.error('[Projection Store] goToLiveSlide transition failed:', err)
      }
    }
  },

  /**
   * Navigate live output to a section
   * FIX BUG-02: removed incorrect LIVE_LOCK guard
   */
  goToLiveSection: (section: string) => {
    const { programSectionMap, navigationFlow, programSlides } = get()

    const indices = programSectionMap[section.toLowerCase()]
    if (indices && indices.length > 0) {
      try {
        // Use programSectionMap for the FSM transition payload
        executeProjectionTransition(
          { type: 'projection:go-to-section', payload: { section } },
          set,
          get
        )
        // Update flowPosition to match the target section's first slide
        if (navigationFlow && programSlides.length > 0) {
          const targetIndex = indices[0]
          if (targetIndex >= 0 && targetIndex < programSlides.length) {
            const newFlowPosition = resolveFlowPosition(
              targetIndex,
              navigationFlow,
              get().flowPosition
            )
            set({ flowPosition: newFlowPosition })
          }
        }
        logger.info('[Quick Jump] Live navigated to section:', section)
      } catch (err) {
        logger.error('[Projection Store] goToLiveSection transition failed:', err)
      }
    } else {
      logger.warn('[Quick Jump] Section not found in program:', section)
    }
  },

  /**
   * Navigate live output using a slide address
   * FIX BUG-02: removed incorrect LIVE_LOCK guard
   */
  goToLiveAddress: (address: SlideAddress) => {
    try {
      executeProjectionTransition(
        { type: 'projection:go-to-address', payload: { address } },
        set,
        get
      )
      // Update flowPosition to match the resolved slide after transition
      const { navigationFlow, programSlideIndex, programSlides } = get()
      if (navigationFlow && programSlideIndex >= 0 && programSlides.length > 0) {
        const newFlowPosition = resolveFlowPosition(
          programSlideIndex,
          navigationFlow,
          get().flowPosition
        )
        set({ flowPosition: newFlowPosition })
      }
      logger.info('[Quick Jump] Live navigated to address')
    } catch (err) {
      logger.error('[Projection Store] goToLiveAddress transition failed:', err)
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
      timerElapsed,
      timerRunning
    } = get()

    // Use top-level import (no circular dependency since confidencePayloadBuilder only imports types)

    return buildConfidencePayload(
      programSlide,
      programSlides,
      programSlideIndex,
      nextSlideData,
      programSongMeta,
      projectionState,
      timerElapsed,
      timerRunning
    )
  },

  setEmergencyConfig: (config: { active: boolean; message?: string; subMessage?: string }) => {
    set({ emergencyConfig: config })
    // Broadcast to projection window
    window.api.projection.emergencyUpdate?.(config)
  },

  // ═══════════════════════════════════════════════════════════════
  // AUDIO PANEL ACTIONS
  // ═══════════════════════════════════════════════════════════════
  toggleAudioPanel: () => {
    const next = !get().isAudioPanelVisible
    set({ isAudioPanelVisible: next })
    window.api.settings
      .update('ui_audio_panel_visible', next ? '1' : '0')
      .catch((err) => logger.error('Failed to save audio panel state:', err))
  },

  setAudioPanelVisible: (visible: boolean) => {
    set({ isAudioPanelVisible: visible })
    window.api.settings
      .update('ui_audio_panel_visible', visible ? '1' : '0')
      .catch((err) => logger.error('Failed to save audio panel state:', err))
  },

  setMediaVolume: (volume: number) => {
    set({ mediaVolume: volume })
    localStorage.setItem('sion_media_volume', String(volume))
    window.api.projection.videoControl('volume', volume / 100)
  },

  setMediaMuted: (muted: boolean) => {
    set({ mediaMuted: muted })
    localStorage.setItem('sion_media_muted', String(muted))
    window.api.projection.videoControl('mute', muted)
  },

  setInstrumentVolume: (volume: number) => {
    set({ instrumentVolume: volume })
    localStorage.setItem('sion_instrument_volume', String(volume))
    window.api.projection.instrumentControl('volume', volume / 100)
  },

  setInstrumentMuted: (muted: boolean) => {
    set({ instrumentMuted: muted })
    localStorage.setItem('sion_instrument_muted', String(muted))
    window.api.projection.instrumentControl('mute', muted)
  },

  // ═══════════════════════════════════════════════════════════════
  // LYRICS ZOOM ACTIONS
  // ═══════════════════════════════════════════════════════════════
  setLyricsFontSize: (percent: number) => {
    const clamped = Math.max(50, Math.min(300, percent))
    set({ lyricsFontSizePercent: clamped })
    window.api.projection.themeUpdate({ ui_lyrics_font_size: clamped.toString() })
    window.api.settings
      .update('ui_lyrics_font_size', clamped.toString())
      .catch((err) => logger.error('Failed to save lyrics font size:', err))
  },

  increaseLyricsFontSize: () => {
    const next = Math.min(300, get().lyricsFontSizePercent + 10)
    set({ lyricsFontSizePercent: next })
    window.api.projection.themeUpdate({ ui_lyrics_font_size: next.toString() })
    window.api.settings
      .update('ui_lyrics_font_size', next.toString())
      .catch((err) => logger.error('Failed to save lyrics font size:', err))
  },

  decreaseLyricsFontSize: () => {
    const next = Math.max(50, get().lyricsFontSizePercent - 10)
    set({ lyricsFontSizePercent: next })
    window.api.projection.themeUpdate({ ui_lyrics_font_size: next.toString() })
    window.api.settings
      .update('ui_lyrics_font_size', next.toString())
      .catch((err) => logger.error('Failed to save lyrics font size:', err))
  },

  resetLyricsFontSize: () => {
    set({ lyricsFontSizePercent: 100 })
    window.api.projection.themeUpdate({ ui_lyrics_font_size: '100' })
    window.api.settings
      .update('ui_lyrics_font_size', '100')
      .catch((err) => logger.error('Failed to save lyrics font size:', err))
  }
}))
