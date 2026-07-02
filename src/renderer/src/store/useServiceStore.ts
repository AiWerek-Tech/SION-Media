/**
 * Service Store — Phase 1 Infrastructure
 *
 * Persists service-related state (timer, service metadata) across sessions.
 * Uses localStorage via zustand persist middleware with partialize.
 *
 * Designed to eventually replace timer state in useProjectionStore,
 * but during Phase 1 it operates independently (additive only).
 *
 * Rules:
 *   - No reads from any other store
 *   - Persisted to localStorage key 'sion-service-storage'
 *   - Only timer-related state is persisted (via partialize)
 *
 * @see implementation-master-order-v1.md §2.3 Sequence 1.1
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ServiceStore {
  // ═══════════════════════════════════════════════════════════════
  // Timer State
  // ═══════════════════════════════════════════════════════════════
  /** Elapsed time in seconds */
  timerElapsed: number
  /** Whether the timer is currently running */
  timerRunning: boolean
  /** Timestamp when the timer was last started (for resume accuracy) */
  timerStartedAt: number | null

  // ═══════════════════════════════════════════════════════════════
  // Service Metadata
  // ═══════════════════════════════════════════════════════════════
  /** Current service date (ISO string) */
  serviceDate: string | null
  /** Service label/name */
  serviceLabel: string

  // ═══════════════════════════════════════════════════════════════
  // Timer Actions
  // ═══════════════════════════════════════════════════════════════
  timerStart: () => void
  timerStop: () => void
  timerReset: () => void
  timerTick: () => void

  // ═══════════════════════════════════════════════════════════════
  // Service Actions
  // ═══════════════════════════════════════════════════════════════
  setServiceDate: (date: string | null) => void
  setServiceLabel: (label: string) => void
  resetService: () => void
}

export const useServiceStore = create<ServiceStore>()(
  persist(
    (set, get) => ({
      // Timer state
      timerElapsed: 0,
      timerRunning: false,
      timerStartedAt: null,

      // Service metadata
      serviceDate: null,
      serviceLabel: '',

      // Timer actions
      timerStart: () => {
        set({ timerRunning: true, timerStartedAt: Date.now() })
      },

      timerStop: () => {
        set({ timerRunning: false })
      },

      timerReset: () => {
        set({ timerElapsed: 0, timerRunning: false, timerStartedAt: null })
      },

      timerTick: () => {
        const { timerRunning, timerElapsed } = get()
        if (timerRunning) {
          set({ timerElapsed: timerElapsed + 1 })
        }
      },

      // Service actions
      setServiceDate: (date) => set({ serviceDate: date }),
      setServiceLabel: (label) => set({ serviceLabel: label }),
      resetService: () =>
        set({
          timerElapsed: 0,
          timerRunning: false,
          timerStartedAt: null,
          serviceDate: null,
          serviceLabel: ''
        })
    }),
    {
      name: 'sion-service-storage',
      partialize: (state) => ({
        timerElapsed: state.timerElapsed,
        timerStartedAt: state.timerStartedAt,
        serviceDate: state.serviceDate,
        serviceLabel: state.serviceLabel
      })
    }
  )
)
