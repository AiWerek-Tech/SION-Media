import React, { useState, useEffect, useCallback } from 'react'
import { Clock, Timer, TimerOff, Zap } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
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

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function TitleBarClock(): React.JSX.Element {
  const [time, setTime] = useState(new Date())
  const { serviceTimerStartTime, startServiceTimer, stopServiceTimer } = useAppStore()
  const { projectionState } = useProjectionStore()
  const [elapsed, setElapsed] = useState(0)
  const fps = useFPS()

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-start service timer when first going LIVE
  useEffect(() => {
    if (projectionState === 'LIVE' && !serviceTimerStartTime) {
      startServiceTimer()
    }
  }, [projectionState, serviceTimerStartTime, startServiceTimer])

  // Update elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (serviceTimerStartTime) {
      interval = setInterval(() => {
        setElapsed(Date.now() - serviceTimerStartTime)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [serviceTimerStartTime])

  useEffect(() => {
    if (!serviceTimerStartTime) {
      setTimeout(() => setElapsed(0), 0)
    }
  }, [serviceTimerStartTime])

  const handleTimerClick = useCallback((): void => {
    if (serviceTimerStartTime) {
      stopServiceTimer()
    } else {
      startServiceTimer()
    }
  }, [serviceTimerStartTime, startServiceTimer, stopServiceTimer])

  const fpsColor =
    fps >= 50 ? 'var(--color-live)' : fps >= 30 ? 'var(--color-warning)' : 'var(--color-program)'

  return (
    <div className="title-bar-clock no-drag">
      {/* FPS counter */}
      <div className="title-bar-fps" style={{ color: fpsColor }} title={`${fps} FPS`}>
        <Zap size={9} />
        <span>{fps}</span>
      </div>

      {/* Service Timer */}
      <button
        className={`title-bar-timer ${serviceTimerStartTime ? 'running' : ''}`}
        onClick={handleTimerClick}
        title={serviceTimerStartTime ? 'Click to stop timer' : 'Click to start timer'}
      >
        {serviceTimerStartTime ? <Timer size={10} /> : <TimerOff size={10} />}
        <span>{serviceTimerStartTime ? formatElapsed(elapsed) : '--:--'}</span>
      </button>

      {/* Separator */}
      <div className="title-bar-separator" />

      {/* Clock */}
      <div className="title-bar-time" title={time.toLocaleDateString()}>
        <Clock size={10} />
        <span>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
