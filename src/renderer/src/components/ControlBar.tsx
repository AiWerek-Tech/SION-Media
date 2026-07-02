import React, { useCallback, useRef, useState } from 'react'
import { CircleDot, FastForward, Pause, Snowflake, Square, XCircle } from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { executeProjectionCommand } from '@core/projection'

const FADE_SPEEDS = [
  { label: '0.1', value: 0.1 },
  { label: '0.4', value: 0.4 },
  { label: '0.8', value: 0.8 },
  { label: '1.2', value: 1.2 }
]

/**
 * FIX UX-05: Safe Clear button with double-click confirmation guard.
 *
 * When the program is LIVE, a single click arms the button (shows "Confirm?"
 * for 2 seconds). A second click within that window executes the clear.
 * If no second click arrives, the button resets automatically.
 *
 * When NOT live, the button clears immediately (no guard needed).
 */
function SafeClearButton({ isLive }: { isLive: boolean }): React.JSX.Element {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (!isLive) {
      // Not live — clear immediately, no confirmation needed
      executeProjectionCommand('PROJ_CLEAR')
      return
    }

    if (!armed) {
      // First click while live — arm the button
      setArmed(true)
      timerRef.current = setTimeout(() => {
        setArmed(false)
        timerRef.current = null
      }, 2000)
    } else {
      // Second click within 2s — execute clear
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setArmed(false)
      executeProjectionCommand('PROJ_CLEAR')
    }
  }, [isLive, armed])

  return (
    <button
      className={`state-btn ${armed ? 'state-btn--danger-active' : ''}`}
      onClick={handleClick}
      title={
        isLive
          ? armed
            ? 'Klik lagi untuk konfirmasi Clear (layar akan kosong)'
            : 'Clear Output — klik 2× saat LIVE (Esc)'
          : 'Clear Output (Esc)'
      }
    >
      <XCircle size={15} />
      {armed && (
        <span className="ml-1 text-[9px] font-black uppercase tracking-wider animate-pulse">?</span>
      )}
    </button>
  )
}

export function ControlBar(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    cuedSongMeta,
    programSlide,
    programSlides,
    programSlideIndex,
    programSongMeta,
    projectionState,
    fadeSpeed,
    setFadeSpeed
  } = useProjectionStore()

  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'

  // FIX UX-06: build a human-readable label for the cue and program pills
  // that includes the song name and section label when available.
  const cueSlide = slides[currentSlideIndex]
  const cueLabel = hasCue
    ? [
        cuedSongMeta?.hymnalName,
        `Slide ${currentSlideIndex + 1}/${slides.length}`,
        cueSlide?.sectionLabel ? `· ${cueSlide.sectionLabel}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    : 'Tidak ada cue'

  const programLabel = hasProgram
    ? [
        programSongMeta?.hymnalName,
        `${programSlideIndex + 1}/${programSlides.length}`,
        programSlide?.sectionLabel ? `· ${programSlide.sectionLabel}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    : projectionState

  return (
    <div className="flex h-full items-center justify-between gap-3 px-6">
      {/* Left: CUE Status Pill */}
      <div className="info-pill info-pill--preview min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-preview">
          <CircleDot size={10} />
          Cue
        </div>
        <div
          className="max-w-[260px] truncate text-[11px] font-bold text-text-primary"
          title={cueLabel}
        >
          {cueLabel}
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
            onClick={() => executeProjectionCommand('PROJ_BLACK')}
            title="Black Out (B)"
          >
            <Square size={15} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`state-btn ${projectionState === 'FREEZE' ? 'state-btn--warn-active' : ''}`}
            onClick={() => executeProjectionCommand('PROJ_FREEZE')}
            title="Freeze Screen (F)"
          >
            {projectionState === 'FREEZE' ? <Pause size={15} /> : <Snowflake size={15} />}
          </button>
          {/* FIX UX-05: SafeClearButton requires double-click confirmation when LIVE */}
          <SafeClearButton isLive={isLive} />
        </div>
      </div>

      {/* Right: PROGRAM Status Pill — FIX UX-06: now shows song name + section */}
      <div className="info-pill info-pill--program min-w-0 flex">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-program">
          <FastForward size={10} />
          Program
        </div>
        <div
          className="max-w-[260px] truncate text-[11px] font-bold text-text-primary"
          title={programLabel}
        >
          {programLabel}
        </div>
      </div>
    </div>
  )
}
