import { create } from 'zustand'
import type { CustomSlide, SlideGroup } from '../types'
import { logger } from '../utils/logger'

interface AnnouncementStore {
  // Slides
  slides: CustomSlide[]
  loadSlides: () => Promise<void>
  addSlide: (slide: Partial<CustomSlide>) => Promise<CustomSlide | null>
  updateSlide: (id: number, updates: Partial<CustomSlide>) => Promise<boolean>
  deleteSlide: (id: number) => Promise<boolean>

  // Groups
  groups: SlideGroup[]
  activeGroup: SlideGroup | null
  loadGroups: () => Promise<void>
  setActiveGroup: (group: SlideGroup | null) => void
  addGroup: (group: Partial<SlideGroup>) => Promise<SlideGroup | null>
  updateGroup: (id: number, updates: Partial<SlideGroup>) => Promise<boolean>
  deleteGroup: (id: number) => Promise<boolean>

  // Group Slides
  groupSlides: CustomSlide[]
  loadGroupSlides: (groupId: number) => Promise<void>
  addSlideToGroup: (groupId: number, slideId: number, sortOrder?: number) => Promise<boolean>
  removeSlideFromGroup: (groupId: number, slideId: number) => Promise<boolean>

  // Loop Logic
  isLooping: boolean
  currentIndex: number
  startLoop: (groupId?: number) => void
  stopLoop: () => void
  nextSlide: () => void
  prevSlide: () => void
  goToSlide: (index: number) => void
}

let loopInterval: ReturnType<typeof setInterval> | null = null

export const useAnnouncementStore = create<AnnouncementStore>((set, get) => ({
  // Initial State
  slides: [],
  groups: [],
  activeGroup: null,
  groupSlides: [],
  isLooping: false,
  currentIndex: 0,

  // Slide Actions
  loadSlides: async () => {
    try {
      const result = (await window.api.slides.getAll()) as CustomSlide[]
      set({ slides: result })
    } catch (err) {
      logger.error('Failed to load slides:', err)
    }
  },

  addSlide: async (slide) => {
    try {
      const result = (await window.api.slides.add(slide)) as CustomSlide
      set((state) => ({ slides: [...state.slides, result] }))
      return result
    } catch (err) {
      logger.error('Failed to add slide:', err)
      return null
    }
  },

  updateSlide: async (id, updates) => {
    try {
      await window.api.slides.update(id, updates)
      set((state) => ({
        slides: state.slides.map((s) => (s.id === id ? { ...s, ...updates } : s))
      }))
      return true
    } catch (err) {
      logger.error('Failed to update slide:', err)
      return false
    }
  },

  deleteSlide: async (id) => {
    try {
      await window.api.slides.delete(id)
      set((state) => ({
        slides: state.slides.filter((s) => s.id !== id)
      }))
      return true
    } catch (err) {
      logger.error('Failed to delete slide:', err)
      return false
    }
  },

  // Group Actions
  loadGroups: async () => {
    try {
      const result = (await window.api.slides.getGroups()) as SlideGroup[]
      set({ groups: result })
    } catch (err) {
      logger.error('Failed to load groups:', err)
    }
  },

  setActiveGroup: (group) => {
    set({ activeGroup: group, currentIndex: 0 })
    if (group) {
      get().loadGroupSlides(group.id)
    } else {
      set({ groupSlides: [] })
    }
  },

  addGroup: async (group) => {
    try {
      const result = (await window.api.slides.addGroup(group)) as SlideGroup
      set((state) => ({ groups: [...state.groups, result] }))
      return result
    } catch (err) {
      logger.error('Failed to add group:', err)
      return null
    }
  },

  updateGroup: async (id, updates) => {
    try {
      await window.api.slides.updateGroup(id, updates)
      set((state) => ({
        groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g))
      }))
      return true
    } catch (err) {
      logger.error('Failed to update group:', err)
      return false
    }
  },

  deleteGroup: async (id) => {
    try {
      await window.api.slides.deleteGroup(id)
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        activeGroup: state.activeGroup?.id === id ? null : state.activeGroup
      }))
      return true
    } catch (err) {
      logger.error('Failed to delete group:', err)
      return false
    }
  },

  // Group Slides
  loadGroupSlides: async (groupId) => {
    try {
      const result = (await window.api.slides.getGroupSlides(groupId)) as CustomSlide[]
      set({ groupSlides: result, currentIndex: 0 })
    } catch (err) {
      logger.error('Failed to load group slides:', err)
    }
  },

  addSlideToGroup: async (groupId, slideId, sortOrder) => {
    try {
      await window.api.slides.addSlideToGroup(groupId, slideId, sortOrder)
      // Reload group slides
      get().loadGroupSlides(groupId)
      return true
    } catch (err) {
      logger.error('Failed to add slide to group:', err)
      return false
    }
  },

  removeSlideFromGroup: async (groupId, slideId) => {
    try {
      await window.api.slides.removeSlideFromGroup(groupId, slideId)
      // Reload group slides
      get().loadGroupSlides(groupId)
      return true
    } catch (err) {
      logger.error('Failed to remove slide from group:', err)
      return false
    }
  },

  // Loop Logic
  startLoop: (groupId) => {
    const state = get()

    // If groupId provided, load that group first
    if (groupId) {
      const group = state.groups.find((g) => g.id === groupId)
      if (group) {
        set({ activeGroup: group })
        get()
          .loadGroupSlides(groupId)
          .then(() => {
            startLoopInternal()
          })
        return
      }
    }

    // Otherwise use current state
    startLoopInternal()

    function startLoopInternal(): void {
      const { groupSlides, activeGroup } = get()
      if (groupSlides.length === 0 || !activeGroup) return

      // Clear existing interval
      if (loopInterval) {
        clearInterval(loopInterval)
      }

      set({ isLooping: true, currentIndex: 0 })

      // Start interval based on group's loop_interval
      const intervalMs = (activeGroup.loop_interval || 10) * 1000
      loopInterval = setInterval(() => {
        const { groupSlides: slides, currentIndex } = get()
        if (slides.length === 0) {
          get().stopLoop()
          return
        }

        // Advance to next slide (wrap around)
        const nextIndex = (currentIndex + 1) % slides.length
        set({ currentIndex: nextIndex })
      }, intervalMs)
    }
  },

  stopLoop: () => {
    if (loopInterval) {
      clearInterval(loopInterval)
      loopInterval = null
    }
    set({ isLooping: false })
  },

  nextSlide: () => {
    const { groupSlides, currentIndex } = get()
    if (groupSlides.length === 0) return
    const nextIndex = (currentIndex + 1) % groupSlides.length
    set({ currentIndex: nextIndex })
  },

  prevSlide: () => {
    const { groupSlides, currentIndex } = get()
    if (groupSlides.length === 0) return
    const prevIndex = currentIndex === 0 ? groupSlides.length - 1 : currentIndex - 1
    set({ currentIndex: prevIndex })
  },

  goToSlide: (index) => {
    const { groupSlides } = get()
    if (index >= 0 && index < groupSlides.length) {
      set({ currentIndex: index })
    }
  }
}))
