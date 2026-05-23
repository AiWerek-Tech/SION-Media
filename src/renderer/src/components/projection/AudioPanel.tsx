/**
 * AudioPanel v4 — Service Timer + Audio monitoring placeholder
 * Timer driven by global useTimerTick in App.tsx (no local interval).
 */
import React from 'react'
import { Pause, Play, RotateCcw, Volume2, X } from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function AudioPanel(): React.JSX.Element {
  const { timerElapsed, timerRunning, timerStart, timerStop, timerReset, toggleAudioPanel } =
    useProjectionStore()

  const display = formatTimer(timerElapsed)
  const isLong = timerElapsed >= 3600

  return (
    <div className="audio-panel">
      {/* ── Header ── */}
      <div className="audio-panel__header">
        <span className="audio-panel__title">Service Timer</span>
        <button
          onClick={toggleAudioPanel}
          className="audio-panel__close"
          title="Tutup panel"
          aria-label="Tutup panel timer"
        >
          <X size={11} />
        </button>
      </div>

      {/* ── Timer display ── */}
      <div className="audio-panel__body">
        <div
          className={`audio-panel__timer ${timerRunning ? 'is-running' : ''} ${isLong ? 'is-long' : ''}`}
        >
          {timerRunning && <span className="audio-panel__timer-dot" />}
          <span className="audio-panel__timer-value">{display}</span>
        </div>

        {/* Controls */}
        <div className="audio-panel__controls">
          <button
            className={`audio-panel__btn-primary ${timerRunning ? 'is-stop' : 'is-start'}`}
            onClick={timerRunning ? timerStop : timerStart}
            title={timerRunning ? 'Pause timer' : 'Start timer'}
          >
            {timerRunning ? <Pause size={13} /> : <Play size={13} />}
            <span>{timerRunning ? 'Pause' : 'Start'}</span>
          </button>

          <button
            className="audio-panel__btn-reset"
            onClick={timerReset}
            title="Reset timer"
            aria-label="Reset timer"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* ── Audio monitoring placeholder ── */}
      <div className="audio-panel__monitoring">
        {/* VU bars */}
        <div className="audio-panel__vu">
          {[2, 4, 6, 3, 5, 7, 4, 2].map((h, i) => (
            <div key={i} className="audio-panel__vu-bar" style={{ height: `${h * 3}px` }} />
          ))}
        </div>
        <div className="audio-panel__monitoring-label">
          <Volume2 size={10} />
          <span>Audio Monitoring</span>
        </div>
        <p className="audio-panel__monitoring-sub">Memerlukan OS API</p>
      </div>
    </div>
  )
}
