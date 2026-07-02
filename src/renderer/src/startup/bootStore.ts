import { create } from 'zustand'

export type BootPhase =
  | 'native'
  | 'renderer'
  | 'critical'
  | 'shell'
  | 'optional'
  | 'background'
  | 'ready'
  | 'failed'

export type BootTaskStatus = 'pending' | 'running' | 'done' | 'error'
export type BootPriority = 'critical' | 'optional' | 'background'

export type BootTraceStatus = 'started' | 'completed' | 'failed'

export interface BootTraceStep {
  id: string
  label: string
  phase: BootPhase | 'bootstrap'
  status: BootTraceStatus
  timestamp: number
  elapsedMs: number
  errorMessage?: string
}

export interface BootTask {
  id: string
  label: string
  status: BootTaskStatus
  progress: number
  priority: BootPriority
  startedAt?: number
  completedAt?: number
  errorMessage?: string
}

export interface BootMetrics {
  coldStartMs: number
  rendererBootMs: number
  criticalBootMs: number
  shellReadyMs: number
  firstInteractiveMs: number
  projectionReadyMs: number
  optionalBootMs: number
  readyMs: number
  nativeSplashMs: number
}

interface BootState {
  phase: BootPhase
  tasks: BootTask[]
  bootTrace: BootTraceStep[]
  lastBootTrace: BootTraceStep[]
  safeMode: boolean
  bootStartAt: number | null
  metrics: BootMetrics
  registerTask: (
    task: Omit<BootTask, 'status' | 'progress' | 'startedAt' | 'completedAt' | 'errorMessage'>
  ) => void
  startTask: (id: string) => void
  updateTaskProgress: (id: string, progress: number) => void
  completeTask: (id: string) => void
  failTask: (id: string, errorMessage?: string) => void
  setPhase: (phase: BootPhase) => void
  setSafeMode: (safeMode: boolean) => void
  setBootStartAt: (timestamp: number) => void
  recordMetric: (name: keyof BootMetrics, value: number) => void
  addTraceStep: (
    id: string,
    label: string,
    phase: BootPhase | 'bootstrap',
    status: BootTraceStatus,
    errorMessage?: string
  ) => void
  persistBootTrace: () => void
  resetBootTrace: () => void
  getProgress: () => number
}

const BOOT_TRACE_STORAGE_KEY = 'sion-boot-trace'

const loadPersistedBootTrace = (): BootTraceStep[] => {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const item = window.localStorage.getItem(BOOT_TRACE_STORAGE_KEY)
    return item ? (JSON.parse(item) as BootTraceStep[]) : []
  } catch {
    return []
  }
}

const initialMetrics: BootMetrics = {
  coldStartMs: 0,
  rendererBootMs: 0,
  criticalBootMs: 0,
  shellReadyMs: 0,
  firstInteractiveMs: 0,
  projectionReadyMs: 0,
  optionalBootMs: 0,
  readyMs: 0,
  nativeSplashMs: 0
}

const persistedBootTrace = loadPersistedBootTrace()
const persistedBootFailed = persistedBootTrace.some((step) => step.status === 'failed')

export const useBootStore = create<BootState>((set, get) => ({
  phase: 'native',
  tasks: [],
  bootTrace: [],
  lastBootTrace: persistedBootTrace,
  safeMode: persistedBootFailed,
  metrics: initialMetrics,
  bootStartAt: null,
  setBootStartAt: (timestamp) => set({ bootStartAt: timestamp }),
  registerTask: (task) =>
    set((state) => {
      if (state.tasks.some((item) => item.id === task.id)) return state
      return {
        tasks: [
          ...state.tasks,
          {
            ...task,
            status: 'pending',
            progress: 0,
            startedAt: undefined,
            completedAt: undefined,
            errorMessage: undefined
          }
        ]
      }
    }),
  startTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? { ...task, status: 'running', progress: task.progress || 0, startedAt: Date.now() }
          : task
      )
    })),
  updateTaskProgress: (id, progress) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, progress: Math.min(Math.max(progress, 0), 100) } : task
      )
    })),
  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: 'done', progress: 100, completedAt: Date.now() } : task
      )
    })),
  failTask: (id, errorMessage) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, status: 'error', errorMessage, completedAt: Date.now() } : task
      )
    })),
  setPhase: (phase) => set({ phase }),
  setSafeMode: (safeMode) => set({ safeMode }),
  recordMetric: (name, value) =>
    set((state) => ({
      metrics: {
        ...state.metrics,
        [name]: Math.round(value)
      }
    })),
  addTraceStep: (id, label, phase, status, errorMessage) =>
    set((state) => {
      const timestamp = performance.now()
      const base = state.bootStartAt ?? timestamp
      const elapsedMs = Math.round(timestamp - base)
      const traceStep: BootTraceStep = {
        id,
        label,
        phase,
        status,
        timestamp,
        elapsedMs,
        errorMessage
      }
      return {
        bootTrace: [...state.bootTrace, traceStep]
      }
    }),
  persistBootTrace: () =>
    set((state) => {
      const bootFailure = state.bootTrace.some((step) => step.status === 'failed')
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(BOOT_TRACE_STORAGE_KEY, JSON.stringify(state.bootTrace))
        }
      } catch {
        // Ignore persistence failures.
      }
      return {
        lastBootTrace: state.bootTrace,
        safeMode: state.safeMode || bootFailure
      }
    }),
  resetBootTrace: () => set({ bootTrace: [] }),
  getProgress: () => {
    const tasks = get().tasks
    if (tasks.length === 0) return 0
    const completed = tasks.reduce((sum, task) => sum + task.progress, 0)
    return Math.round(completed / tasks.length)
  }
}))
