import { useEffect } from 'react'
import type { AppMode } from '@renderer/store/useModeStore'

const lazyModules: Record<AppMode, () => Promise<unknown>> = {
  LIBRARY: () => import('@renderer/screens/modes/LibraryModeRedesigned'),
  PROJECTION: () => import('@renderer/screens/modes/ProjectionMode'),
  BROADCAST: () => import('@renderer/screens/modes/BroadcastMode'),
  MANAGEMENT: () => import('@renderer/screens/modes/ManagementMode')
}

const preloadPriority: Record<AppMode, AppMode[]> = {
  LIBRARY: ['PROJECTION', 'BROADCAST', 'MANAGEMENT'],
  PROJECTION: ['BROADCAST', 'LIBRARY', 'MANAGEMENT'],
  BROADCAST: ['PROJECTION', 'LIBRARY', 'MANAGEMENT'],
  MANAGEMENT: ['LIBRARY', 'PROJECTION', 'BROADCAST']
}

export function useModePreloader(currentMode: AppMode): void {
  useEffect(() => {
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory
    const memoryBudget = deviceMemory ? Math.min(deviceMemory, 8) : 4
    const allowAllPreload = memoryBudget >= 4

    const preload = (): void => {
      preloadPriority[currentMode].forEach((mode, index) => {
        if (mode === currentMode) return
        if (!allowAllPreload && index > 1) return
        void lazyModules[mode]().catch(() => {
          // Preload failures are non-blocking and can be retried later.
        })
      })
    }

    const globalWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof globalWindow.requestIdleCallback === 'function') {
      const handle = globalWindow.requestIdleCallback(preload, { timeout: 1500 })
      return () => globalWindow.cancelIdleCallback?.(handle)
    }

    const timer = window.setTimeout(preload, 150)
    return () => window.clearTimeout(timer)
  }, [currentMode])
}
