import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FastForward,
  Pause,
  SkipBack,
  SkipForward,
  Snowflake,
  Square,
  XCircle,
  Zap
} from 'lucide-react'
import { useProjectionStore } from '../store/useProjectionStore'

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
    cueNextSlide,
    cuePrevSlide,
    takeCue,
    nextSlide,
    prevSlide,
    toggleBlack,
    toggleFreeze,
    clearScreen,
    fadeSpeed,
    setFadeSpeed
  } = useProjectionStore()

  const previewSlide = slides[currentSlideIndex]
  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isCueSameAsProgram =
    hasCue &&
    hasProgram &&
    previewSlide?.songId === programSlide?.songId &&
    previewSlide?.slideIndex === programSlide?.slideIndex

  return (
    <div className="grid h-full grid-cols-[minmax(240px,1fr)_auto_minmax(300px,1fr)] items-center gap-4 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="rounded-md border border-preview/25 bg-preview/10 px-2 py-1">
          <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-preview">
            <CircleDot size={11} />
            Cue
          </div>
          <div className="mt-0.5 max-w-[260px] truncate text-[12px] font-bold text-text-primary">
            {hasCue ? `Slide ${currentSlideIndex + 1}/${slides.length}` : 'Tidak ada cue'}
          </div>
        </div>

        <div className="flex items-center rounded-md border border-border-default bg-bg-elevated/70 p-1">
          <button
            className="console-icon-btn"
            onClick={cuePrevSlide}
            disabled={currentSlideIndex <= 0 || !hasCue}
            title="Cue slide sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="console-icon-btn"
            onClick={cueNextSlide}
            disabled={currentSlideIndex >= slides.length - 1 || !hasCue}
            title="Cue slide berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="console-live-nav"
          onClick={prevSlide}
          disabled={!hasProgram || programSlideIndex <= 0}
          title="Previous live slide"
        >
          <SkipBack size={18} />
        </button>

        <button
          className={`take-button ${isLive ? 'is-live' : ''}`}
          onClick={takeCue}
          disabled={!hasCue || (isCueSameAsProgram && isLive)}
          title="TAKE cue ke Program"
        >
          <Zap size={24} fill="currentColor" />
          <span>TAKE</span>
        </button>

        <button
          className="console-live-nav"
          onClick={nextSlide}
          disabled={!hasProgram || programSlideIndex >= programSlides.length - 1}
          title="Next live slide"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className="hidden min-w-0 rounded-md border border-program/25 bg-program/10 px-2 py-1 xl:block">
          <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-program">
            <FastForward size={11} />
            Program
          </div>
          <div className="mt-0.5 max-w-[220px] truncate text-[12px] font-bold text-text-primary">
            {hasProgram ? `Live ${programSlideIndex + 1}/${programSlides.length}` : projectionState}
          </div>
        </div>

        <div className="flex items-center rounded-md border border-border-default bg-bg-elevated/70 p-1">
          {FADE_SPEEDS.map((speed) => (
            <button
              key={speed.value}
              onClick={() => setFadeSpeed(speed.value)}
              className={`h-7 min-w-8 rounded px-2 text-[12px] font-black transition ${
                fadeSpeed === speed.value
                  ? 'bg-brand-primary text-white'
                  : 'text-text-muted hover:bg-bg-active hover:text-text-primary'
              }`}
              title={`${speed.label}s transition`}
            >
              {speed.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            className={`console-state-btn ${projectionState === 'BLACK' ? 'danger-active' : ''}`}
            onClick={toggleBlack}
            title="Black Out (B)"
          >
            <Square size={17} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`console-state-btn ${projectionState === 'FREEZE' ? 'warn-active' : ''}`}
            onClick={toggleFreeze}
            title="Freeze Screen (F)"
          >
            {projectionState === 'FREEZE' ? <Pause size={17} /> : <Snowflake size={17} />}
          </button>
          <button className="console-state-btn" onClick={clearScreen} title="Clear Output (Esc)">
            <XCircle size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
