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
    <div className="grid h-full grid-cols-[minmax(260px,1fr)_auto_minmax(320px,1fr)] items-center gap-3 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="info-pill info-pill--preview min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-preview">
            <CircleDot size={11} />
            Cue
          </div>
          <div className="max-w-[280px] truncate text-[12px] font-bold text-text-primary">
            {hasCue ? `Slide ${currentSlideIndex + 1}/${slides.length}` : 'Tidak ada cue'}
          </div>
        </div>

        <div className="state-btn-group">
          <button
            className="state-btn"
            onClick={cuePrevSlide}
            disabled={currentSlideIndex <= 0 || !hasCue}
            title="Cue slide sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="state-btn"
            onClick={cueNextSlide}
            disabled={currentSlideIndex >= slides.length - 1 || !hasCue}
            title="Cue slide berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mixer-center-well">
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
        <div className="info-pill info-pill--program min-w-0 flex">
          <div className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-[0.08em] text-program">
            <FastForward size={11} />
            Program
          </div>
          <div className="max-w-[220px] truncate text-[12px] font-bold text-text-primary">
            {hasProgram ? `Live ${programSlideIndex + 1}/${programSlides.length}` : projectionState}
          </div>
        </div>

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

        <div className="state-btn-group">
          <button
            className={`state-btn ${projectionState === 'BLACK' ? 'state-btn--danger-active' : ''}`}
            onClick={toggleBlack}
            title="Black Out (B)"
          >
            <Square size={17} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`state-btn ${projectionState === 'FREEZE' ? 'state-btn--warn-active' : ''}`}
            onClick={toggleFreeze}
            title="Freeze Screen (F)"
          >
            {projectionState === 'FREEZE' ? <Pause size={17} /> : <Snowflake size={17} />}
          </button>
          <button className="state-btn" onClick={clearScreen} title="Clear Output (Esc)">
            <XCircle size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
