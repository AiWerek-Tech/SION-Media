import { create } from 'zustand'
import type { SlideData, ProjectionState } from '../types'

interface ProjectionStore {
  slides: SlideData[]
  setSlides: (slides: SlideData[]) => void
  programSlide: SlideData | null
  programSlides: SlideData[]
  programSlideIndex: number
  currentSlideIndex: number
  setCurrentSlideIndex: (index: number) => void
  projectionState: ProjectionState
  setProjectionState: (state: ProjectionState) => void
  fadeSpeed: number
  setFadeSpeed: (speed: number) => void

  // Actions
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
  setSlides: (slides) => {
    set({ slides, currentSlideIndex: 0 })
  },
  programSlide: null,
  programSlides: [],
  programSlideIndex: -1,
  currentSlideIndex: 0,
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
    window.api.settings.update('transition_duration', speed.toString())
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
    const { currentSlideIndex } = get()
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
        programSlide: slideData
      })
      sendLiveSlide(slideData)
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
    set({ projectionState: 'CLEAR' })
    window.api.projection.stateChange('CLEAR')
  },

  hotSwapSlides: (songId, newSlides) => {
    const { slides, currentSlideIndex, programSlide, programSlideIndex, projectionState } = get()

    if (slides.length > 0 && slides[0].songId === songId) {
      const newCueIndex = Math.max(0, Math.min(currentSlideIndex, newSlides.length - 1))
      set({ slides: newSlides, currentSlideIndex: newCueIndex })
    }

    if (programSlide?.songId === songId) {
      const newProgramIndex = Math.max(0, Math.min(programSlideIndex, newSlides.length - 1))

      if (newSlides.length > 0) {
        const slideData = withNextSlide(newSlides, newProgramIndex)
        set({
          programSlides: newSlides,
          programSlideIndex: newProgramIndex,
          programSlide: slideData
        })
        if (projectionState === 'LIVE') sendLiveSlide(slideData)
      } else {
        set({
          programSlides: [],
          programSlideIndex: -1,
          projectionState: 'CLEAR',
          programSlide: null
        })
        window.api.projection.stateChange('CLEAR')
      }
    }
  }
}))
