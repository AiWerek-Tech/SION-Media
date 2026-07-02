import React from 'react'
import { Pause, Play, RotateCcw, Volume2, X } from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'

function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function AudioPanel(): React.JSX.Element {
  const { timerElapsed, timerRunning, timerStart, timerStop, timerReset, toggleAudioPanel } =
    useProjectionStore()
  const display = formatTimer(timerElapsed)

  return (
    <div className="audio-panel">
      <div className="audio-panel__header">
        <div className="audio-panel__heading">
          <span className="audio-panel__title">Timer Ibadah</span>
          <span className={`audio-panel__status ${timerRunning ? 'is-running' : ''}`}>
            {timerRunning ? 'Berjalan' : 'Dijeda'}
          </span>
        </div>
        <button
          onClick={toggleAudioPanel}
          className="audio-panel__close"
          title="Tutup panel"
          aria-label="Tutup panel timer"
        >
          <X size={12} />
        </button>
      </div>

      <div className="audio-panel__body">
        <div
          className={`audio-panel__timer ${timerRunning ? 'is-running' : ''} ${timerElapsed >= 3600 ? 'is-long' : ''}`}
        >
          {timerRunning && <span className="audio-panel__timer-dot" />}
          <span className="audio-panel__timer-value">{display}</span>
        </div>
        <div className="audio-panel__controls">
          <button
            className={`audio-panel__btn-primary ${timerRunning ? 'is-stop' : 'is-start'}`}
            onClick={timerRunning ? timerStop : timerStart}
            title={timerRunning ? 'Jeda timer' : 'Mulai timer'}
            aria-label={timerRunning ? 'Jeda timer' : 'Mulai timer'}
          >
            {timerRunning ? <Pause size={13} /> : <Play size={13} />}
            <span>{timerRunning ? 'Jeda' : 'Mulai'}</span>
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

      <div className="audio-panel__monitoring">
        <div className="audio-panel__monitoring-icon" aria-hidden="true">
          <Volume2 size={14} />
        </div>
        <div className="audio-panel__monitoring-copy">
          <p className="audio-panel__monitoring-label">Pemantauan audio belum tersedia</p>
          <p className="audio-panel__monitoring-sub">
            Timer tetap dapat digunakan tanpa input audio.
          </p>
        </div>
      </div>
    </div>
  )
}
