/**
 * useTimerTick — Phase 1 Infrastructure
 *
 * Owns the 1-second interval that drives the projection timer.
 * This hook is the SOLE owner of the timer interval — no other
 * component or hook should create a competing interval.
 *
 * Must be mounted exactly ONCE in App.tsx (after useAppBootstrap).
 *
 * @see implementation-master-order-v1.md §2.3 Sequence 1.2
 */

import { useEffect, useRef } from 'react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'

/**
 * Starts a 1-second interval that calls `timerTick()` on the projection store.
 * The interval is always running but `timerTick()` internally checks `timerRunning`
 * before incrementing, so there is zero overhead when the timer is stopped.
 *
 * Cleanup: interval is cleared on unmount (app close).
 */
export function useTimerTick(): void {
  const timerTick = useProjectionStore((s) => s.timerTick)
  const timerTickRef = useRef(timerTick)

  // Keep ref in sync to avoid stale closures
  useEffect(() => {
    timerTickRef.current = timerTick
  }, [timerTick])

  useEffect(() => {
    const interval = setInterval(() => {
      timerTickRef.current()
    }, 1000)

    return () => clearInterval(interval)
  }, [])
}
