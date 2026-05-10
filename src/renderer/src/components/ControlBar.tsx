import React from 'react'
import { CircleDot, FastForward, Pause, Snowflake, Square, XCircle } from 'lucide-react'
import { useProjectionStore } from '../store/useProjectionStore'
import { executeRuntimeCommand } from '../utils/runtimeCommandBus'

const FADE_SPEEDS = [
  { label: '0.1', value: 0.1 },
  { label: '0.4', value: 0.4 },
  { label: '0.8', value: 0.8 },
  { label: '1.2', value: 1.2 }
]

export function ControlBar(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlides,
    programSlideIndex,
    projectionState,
    fadeSpeed,
    setFadeSpeed
  } = useProjectionStore()

  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null

  return (
    <div className="flex h-full items-center justify-between gap-3 px-6">
      {/* Left: CUE Status Pill */}
      <div className="info-pill info-pill--preview min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-preview">
          <CircleDot size={10} />
          Cue
        </div>
        <div className="max-w-[240px] truncate text-[11px] font-bold text-text-primary">
          {hasCue ? `Slide ${currentSlideIndex + 1}/${slides.length}` : 'Tidak ada cue'}
        </div>
      </div>

      {/* Center: Fade Speed + State Buttons */}
      <div className="flex items-center gap-2">
        <div className="segmented-control">
          {FADE_SPEEDS.map((speed) => (
            <button
              key={speed.value}
              onClick={() => setFadeSpeed(speed.value)}
              className={`segmented-control__item ${
                fadeSpeed === speed.value ? 'segmented-control__item--active' : ''
              }`}
              title={`${speed.label}s transition`}
            >
              {speed.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border-subtle" />

        <div className="state-btn-group">
          <button
            className={`state-btn ${projectionState === 'BLACK' ? 'state-btn--danger-active' : ''}`}
            onClick={() => executeRuntimeCommand('PROJ_BLACK', undefined, 'UI_BUTTON')}
            title="Black Out (B)"
          >
            <Square size={15} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`state-btn ${projectionState === 'FREEZE' ? 'state-btn--warn-active' : ''}`}
            onClick={() => executeRuntimeCommand('PROJ_FREEZE', undefined, 'UI_BUTTON')}
            title="Freeze Screen (F)"
          >
            {projectionState === 'FREEZE' ? <Pause size={15} /> : <Snowflake size={15} />}
          </button>
          <button
            className="state-btn"
            onClick={() => executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')}
            title="Clear Output (Esc)"
          >
            <XCircle size={15} />
          </button>
        </div>
      </div>

      {/* Right: PROGRAM Status Pill */}
      <div className="info-pill info-pill--program min-w-0 flex">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-program">
          <FastForward size={10} />
          Program
        </div>
        <div className="max-w-[200px] truncate text-[11px] font-bold text-text-primary">
          {hasProgram ? `Live ${programSlideIndex + 1}/${programSlides.length}` : projectionState}
        </div>
      </div>
    </div>
  )
}
