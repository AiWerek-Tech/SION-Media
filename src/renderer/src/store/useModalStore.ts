/**
 * Modal Store — Phase 1 Infrastructure
 *
 * Centralized modal state management using a stack-based approach.
 * Supports Promise-based modal interactions for async workflows.
 *
 * Rules:
 *   - Max stack depth: 3 (prevent modal inception)
 *   - No store reads from other stores (Zustand isolation rule)
 *   - Escape closes TOP modal only
 *
 * @see phase2-functional-refactor-architecture-v1.md §3.1
 * @see implementation-master-order-v1.md §2.3 Sequence 1.1
 */

import { create } from 'zustand'

export interface ModalEntry {
  /** Unique modal identifier (e.g., 'confirm-delete', 'create-playlist') */
  id: string
  /** Modal component type to render */
  type: string
  /** Props passed to the modal component */
  props?: Record<string, unknown>
  /** Promise resolver for async modal patterns */
  resolve?: (value: unknown) => void
}

interface ModalStore {
  /** Stack of open modals (last = top/visible) */
  stack: ModalEntry[]

  /**
   * Open a modal by pushing it onto the stack.
   * @param id - Unique modal identifier
   * @param type - Modal component type
   * @param props - Props to pass to the modal
   */
  open: (id: string, type: string, props?: Record<string, unknown>) => void

  /**
   * Open a modal and return a Promise that resolves when the modal closes.
   * Enables async workflows: `const result = await openAsync('confirm', ...)`
   * @returns Promise that resolves with the modal's return value
   */
  openAsync: <T = unknown>(id: string, type: string, props?: Record<string, unknown>) => Promise<T>

  /**
   * Close the top modal on the stack.
   * @param result - Optional result value (resolves the Promise from openAsync)
   */
  close: (result?: unknown) => void

  /**
   * Close a specific modal by its ID.
   * @param id - Modal identifier to close
   * @param result - Optional result value
   */
  closeById: (id: string, result?: unknown) => void

  /**
   * Close all open modals. Used for emergency cleanup.
   */
  closeAll: () => void

  /**
   * Check if a specific modal is currently open.
   */
  isOpen: (id: string) => boolean

  /**
   * Get the top modal on the stack (currently visible).
   */
  getTop: () => ModalEntry | null
}

/** Maximum modal stack depth to prevent modal inception */
const MAX_STACK_DEPTH = 3

export const useModalStore = create<ModalStore>((set, get) => ({
  stack: [],

  open: (id, type, props) => {
    const { stack } = get()

    // Prevent duplicates
    if (stack.some((m) => m.id === id)) return

    // Enforce max depth
    if (stack.length >= MAX_STACK_DEPTH) {
      console.warn(`[ModalStore] Max stack depth (${MAX_STACK_DEPTH}) reached, ignoring open:`, id)
      return
    }

    set({ stack: [...stack, { id, type, props }] })
  },

  openAsync: <T = unknown>(
    id: string,
    type: string,
    props?: Record<string, unknown>
  ): Promise<T> => {
    return new Promise<T>((resolve) => {
      const { stack } = get()

      // Prevent duplicates
      if (stack.some((m) => m.id === id)) {
        resolve(undefined as T)
        return
      }

      // Enforce max depth
      if (stack.length >= MAX_STACK_DEPTH) {
        console.warn(
          `[ModalStore] Max stack depth (${MAX_STACK_DEPTH}) reached, ignoring openAsync:`,
          id
        )
        resolve(undefined as T)
        return
      }

      set({
        stack: [...stack, { id, type, props, resolve: resolve as (value: unknown) => void }]
      })
    })
  },

  close: (result?) => {
    const { stack } = get()
    if (stack.length === 0) return

    const top = stack[stack.length - 1]
    top.resolve?.(result)

    set({ stack: stack.slice(0, -1) })
  },

  closeById: (id, result?) => {
    const { stack } = get()
    const entry = stack.find((m) => m.id === id)
    if (!entry) return

    entry.resolve?.(result)
    set({ stack: stack.filter((m) => m.id !== id) })
  },

  closeAll: () => {
    const { stack } = get()
    // Resolve all pending promises with undefined
    for (const entry of stack) {
      entry.resolve?.(undefined)
    }
    set({ stack: [] })
  },

  isOpen: (id) => {
    return get().stack.some((m) => m.id === id)
  },

  getTop: () => {
    const { stack } = get()
    return stack.length > 0 ? stack[stack.length - 1] : null
  }
}))
