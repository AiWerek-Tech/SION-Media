/**
 * TitleBarClock — wall clock + FPS counter
 *
 * Service timer has been moved to TitleBarStatus (TitleBarTimer component).
 * This component only shows: FPS | clock time
 *
 * Auto-start of the projection timer when going LIVE is handled here
 * so it still fires even when AudioPanel is hidden.
 */
import React, { useState, useEffect } from 'react'
import { Clock, Zap } from 'lucide-react'
import { useProjectionStore } from '../../store/useProjectionStore'

function useFPS(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let raf: number
    const tick = (): void => {
      frameCount++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setFps(frameCount)
        frameCount = 0
        lastTime = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

export function TitleBarClock(): React.JSX.Element {
  const [time, setTime] = useState(new Date())
  const fps = useFPS()

  // Auto-start projection timer when first going LIVE
  const projectionState = useProjectionStore((s) => s.projectionState)
  const timerRunning = useProjectionStore((s) => s.timerRunning)
  const timerStart = useProjectionStore((s) => s.timerStart)

  useEffect(() => {
    if (projectionState === 'LIVE' && !timerRunning) {
      timerStart()
    }
  }, [projectionState, timerRunning, timerStart])

  // Clock tick — 1s interval
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fpsColor =
    fps >= 50 ? 'var(--color-live)' : fps >= 30 ? 'var(--color-warning)' : 'var(--color-program)'

  return (
    <div className="title-bar-clock no-drag">
      {/* FPS counter */}
      <div className="title-bar-fps" style={{ color: fpsColor }} title={`${fps} FPS`}>
        <Zap size={9} />
        <span>{fps}</span>
      </div>

      {/* Separator */}
      <div className="title-bar-separator" />

      {/* Wall clock */}
      <div className="title-bar-time" title={time.toLocaleDateString()}>
        <Clock size={10} />
        <span>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
