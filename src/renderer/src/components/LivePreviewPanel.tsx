import React, { useEffect, useMemo, useState } from 'react'
import { logger } from '../utils/logger'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Lock,
  Radio,
  ScreenShare,
  SkipBack,
  SkipForward,
  Zap
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import type { SlideData } from '../types'
import { executeRuntimeCommand } from '../utils/runtimeCommandBus'

const PREVIEW_TRANSITION = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
}

interface MonitorFrameProps {
  mode: 'preview' | 'program'
  slide: SlideData | null
  stateLabel: string
  isLive?: boolean
  isBlack?: boolean
  isClear?: boolean
  isProjectorLost?: boolean
  theme: Record<string, string>
  // Runtime Protection
  programLockState?: 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'
  hasPendingLiveChanges?: boolean
}

function MonitorFrame({
  mode,
  slide,
  stateLabel,
  isLive = false,
  isBlack = false,
  isClear = false,
  isProjectorLost = false,
  theme,
  programLockState = 'UNLOCKED'
}: MonitorFrameProps): React.JSX.Element {
  const isProgram = mode === 'program'
  const emptyLyrics = slide !== null && slide.text.trim().length === 0
  const monitorColor = isProgram ? 'var(--color-program)' : 'var(--color-preview)'
  const fontFamily = theme.projection_font_family || 'Inter'
  const textColor = theme.projection_text_color || '#ffffff'
  const textShadow = theme.projection_text_shadow === '1' ? '2px 4px 12px rgba(0,0,0,0.82)' : 'none'
  const textAlign = (theme.projection_text_align || 'center') as React.CSSProperties['textAlign']
  const bgColor = theme.projection_bg_color || '#10131f'
  const bgImage = theme.projection_bg_image || ''
  const bgOpacity = theme.projection_bg_opacity || '0.7'
  const showLyrics = !isBlack && !isClear && slide && !emptyLyrics
  const useContainedStandby = !showLyrics && !isBlack && Boolean(bgImage)

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5">
      {/* Title Bar */}
      <div className="monitor-title-bar">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shadow-[0_0_12px_currentColor]"
            style={{ color: monitorColor, backgroundColor: monitorColor }}
          />
          <span className="truncate font-heading text-[12px] font-black uppercase tracking-[0.16em] text-text-primary">
            {isProgram ? 'PROGRAM / LIVE' : 'PREVIEW / CUE'}
          </span>
          <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-[0.04em] text-text-muted">
            {stateLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Runtime Protection: LIVE_LOCK indicator */}
          {isProgram && programLockState === 'LIVE_LOCK' && (
            <span className="inline-flex items-center gap-1 rounded bg-status-success/16 px-1.5 py-0.5 text-[12px] font-black text-status-success">
              <Lock size={11} />
              LIVE-LOCK
            </span>
          )}
          {/* Runtime Protection: LIVE_DIRTY warning */}
          {isProgram && programLockState === 'LIVE_DIRTY' && (
            <span className="inline-flex items-center gap-1 rounded bg-status-warning/20 px-1.5 py-0.5 text-[12px] font-black text-status-warning animate-pulse">
              <AlertCircle size={11} />
              LIVE-DIRTY
            </span>
          )}
          {isProgram && isProjectorLost && (
            <span className="inline-flex items-center gap-1 rounded bg-status-error/16 px-1.5 py-0.5 text-[12px] font-black text-status-error">
              <AlertTriangle size={11} />
              PROJECTOR LOST
            </span>
          )}
          {emptyLyrics && (
            <span className="inline-flex items-center gap-1 rounded bg-status-warning/15 px-1.5 py-0.5 text-[12px] font-black text-status-warning">
              <AlertTriangle size={11} />
              LIRIK KOSONG
            </span>
          )}
          {isProgram && isLive && programLockState !== 'LIVE_DIRTY' && (
            <span className="inline-flex items-center gap-1 rounded bg-live-red/18 px-1.5 py-0.5 text-[12px] font-black text-live-red shadow-[0_0_12px_rgba(255,59,48,0.18)]">
              <Radio size={10} className="animate-pulse" />
              ON AIR
            </span>
          )}
        </div>
      </div>

      {/* Monitor Body */}
      <div
        className={`monitor-frame flex-1 min-h-0 ${
          isProgram ? 'monitor-frame--program' : 'monitor-frame--preview'
        } ${isLive ? 'monitor-frame--live' : ''}`}
      >
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="relative aspect-video h-full max-h-full w-full max-w-full overflow-hidden rounded-lg bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div
              className="absolute inset-0 bg-center bg-no-repeat"
              style={{
                backgroundColor: isBlack ? '#000000' : bgColor,
                backgroundImage: bgImage && !isBlack ? `url(${bgImage})` : 'none',
                backgroundSize: useContainedStandby ? 'contain' : 'cover',
                opacity: isBlack ? 1 : bgOpacity
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.22))]" />

            <AnimatePresence mode="wait">
              {showLyrics && (
                <motion.div
                  key={`${mode}-${slide.songId}-${slide.slideIndex}-${slide.text}`}
                  initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={PREVIEW_TRANSITION}
                  className="absolute inset-0 z-10 flex items-center justify-center px-[8%] py-[7%]"
                >
                  <p
                    className="m-0 whitespace-pre-line text-center font-semibold leading-snug"
                    style={{
                      fontFamily,
                      color: textColor,
                      textShadow,
                      textAlign,
                      fontSize: isProgram ? 'clamp(18px,2.15vw,34px)' : 'clamp(14px,1.55vw,26px)'
                    }}
                  >
                    {slide.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!showLyrics && !isBlack && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white/12">
                <ScreenShare size={isProgram ? 42 : 34} />
                <span className="font-heading text-[12px] font-black uppercase tracking-[0.24em]">
                  SION MEDIA
                </span>
              </div>
            )}

            <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/58 px-2 py-0.5 font-mono text-[11px] font-bold text-white/70 backdrop-blur">
              16:9 1920x1080
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Transition Column (vMix-style vertical controls between monitors) ── */
function TransitionColumn(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlides,
    programSlideIndex,
    projectionState
  } = useProjectionStore()

  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null
  const previewSlide = slides[currentSlideIndex]
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isCueSameAsProgram =
    hasCue &&
    hasProgram &&
    previewSlide?.songId === programSlide?.songId &&
    previewSlide?.slideIndex === programSlide?.slideIndex

  return (
    <div className="transition-column">
      {/* CUE Navigation */}
      <div className="transition-column__section">
        <span className="transition-column__label text-preview">CUE</span>
        <div className="flex items-center gap-1">
          <button
            className="transition-column__nav-btn"
            onClick={() => executeRuntimeCommand('NAV_CUE_PREV', undefined, 'UI_BUTTON')}
            disabled={currentSlideIndex <= 0 || !hasCue}
            title="Cue sebelumnya"
          >
            <ChevronUp size={14} />
          </button>
          <span className="transition-column__counter">
            {hasCue ? `${currentSlideIndex + 1}/${slides.length}` : '—'}
          </span>
          <button
            className="transition-column__nav-btn"
            onClick={() => executeRuntimeCommand('NAV_CUE_NEXT', undefined, 'UI_BUTTON')}
            disabled={currentSlideIndex >= slides.length - 1 || !hasCue}
            title="Cue berikutnya"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* TAKE Button — center focal point */}
      <button
        className={`take-button take-button--column ${isLive ? 'is-live' : ''}`}
        onClick={() => executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')}
        disabled={!hasCue || (isCueSameAsProgram && isLive)}
        title="TAKE cue ke Program (Space)"
      >
        <Zap size={18} fill="currentColor" />
        <span>TAKE</span>
      </button>

      {/* LIVE Navigation */}
      <div className="transition-column__section">
        <span className="transition-column__label text-program">LIVE</span>
        <div className="flex items-center gap-1">
          <button
            className="transition-column__nav-btn"
            onClick={() => executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'UI_BUTTON')}
            disabled={!hasProgram || programSlideIndex <= 0}
            title="Live slide sebelumnya"
          >
            <SkipBack size={12} />
          </button>
          <span className="transition-column__counter">
            {hasProgram ? `${programSlideIndex + 1}/${programSlides.length}` : '—'}
          </span>
          <button
            className="transition-column__nav-btn"
            onClick={() => executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'UI_BUTTON')}
            disabled={!hasProgram || programSlideIndex >= programSlides.length - 1}
            title="Live slide berikutnya"
          >
            <SkipForward size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function LivePreviewPanel(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlideIndex,
    programSlides,
    projectionState,
    // Runtime Protection
    programLockState,
    hasPendingLiveChanges,
    // NEXT State
    nextSlideData,
    nextSlideIndex,
    hasNextSlide,
    nextSong,
    hasNextSong,
    nextReadyState
  } = useProjectionStore()
  const { displayCount } = useAppStore()
  const [theme, setTheme] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    window.api.settings
      .getAll()
      .then((settings) => {
        if (mounted) setTheme(settings)
      })
      .catch((err) => logger.error('Failed to load theme:', err))
    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      setTheme((currentTheme) => ({ ...currentTheme, ...(data as Record<string, string>) }))
    })
    return () => {
      mounted = false
      unsubscribeTheme()
    }
  }, [])

  const previewSlide = slides[currentSlideIndex] ?? null
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isBlack = projectionState === 'BLACK'
  const isClear = projectionState === 'CLEAR' || projectionState === 'LOGO'

  const previewState = useMemo(() => {
    if (slides.length === 0) return 'NO CUE'
    return `SLIDE ${currentSlideIndex + 1}/${slides.length}`
  }, [currentSlideIndex, slides.length])

  const programState = useMemo(() => {
    if (!programSlide || programSlides.length === 0) return projectionState
    return `${projectionState} ${programSlideIndex + 1}/${programSlides.length}`
  }, [programSlide, programSlideIndex, programSlides.length, projectionState])

  // NEXT State computed values
  const nextSlideLabel = useMemo(() => {
    if (!hasNextSlide || nextSlideIndex === null) return null
    return `Slide ${nextSlideIndex + 1}/${programSlides.length}`
  }, [hasNextSlide, nextSlideIndex, programSlides.length])

  const nextSongLabel = useMemo(() => {
    if (!hasNextSong || !nextSong) return null
    return `${nextSong.number} - ${nextSong.title}`
  }, [hasNextSong, nextSong])

  const isProjectorLost = displayCount <= 1

  return (
    <div className="relative h-full min-h-0 px-6 pt-8 pb-2">
      {/* 3-column layout: Preview | Transition Controls | Program */}
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-0">
        {/* Preview Monitor */}
        <div className="min-h-0 min-w-0 pr-2 flex justify-end">
          <div className="w-full max-w-[1200px]">
            <MonitorFrame
              mode="preview"
              slide={previewSlide}
              stateLabel={previewState}
              theme={theme}
            />
          </div>
        </div>

        {/* Transition Column (vMix-style) */}
        <TransitionColumn />

        {/* Program Monitor */}
        <div className="min-h-0 min-w-0 pl-2 flex flex-col justify-start">
          <div className="w-full max-w-[1200px]">
            <MonitorFrame
              mode="program"
              slide={programSlide}
              stateLabel={programState}
              isLive={isLive}
              isBlack={isBlack}
              isClear={isClear}
              isProjectorLost={isProjectorLost}
              theme={theme}
              programLockState={programLockState}
              hasPendingLiveChanges={hasPendingLiveChanges}
            />
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* NEXT STRIP - Shows upcoming content */}
          {/* ══════════════════════════════════════════════════════════ */}
          {nextReadyState !== 'EMPTY' && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-next-blue/8 px-3 py-2 text-[11px] font-semibold text-next-blue border border-next-blue/15">
              <span className="font-black uppercase tracking-[0.1em] text-next-blue/70">NEXT</span>

              {/* Next Slide */}
              {hasNextSlide && nextSlideLabel && nextSlideData && (
                <div className="flex items-center gap-1.5 border-l border-next-blue/20 pl-2">
                  <ChevronRight size={10} />
                  <span className="font-bold">{nextSlideLabel}</span>
                  <span className="text-next-blue/60 truncate max-w-[120px]">
                    {nextSlideData.sectionLabel}
                  </span>
                </div>
              )}

              {/* Separator if both exist */}
              {hasNextSlide && hasNextSong && <span className="text-next-blue/30">|</span>}

              {/* Next Song */}
              {hasNextSong && nextSongLabel && (
                <div className="flex items-center gap-1.5 border-l border-next-blue/20 pl-2">
                  <span className="font-bold">Song:</span>
                  <span className="truncate max-w-[150px]">{nextSongLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isProjectorLost && (
        <div className="pointer-events-none absolute bottom-4 left-8 rounded-full bg-status-error/10 px-2.5 py-1 text-[11px] font-semibold text-status-error/85 shadow-[0_10px_28px_rgba(0,0,0,0.38)] backdrop-blur">
          Simulasi preview aktif karena proyektor eksternal tidak terdeteksi.
        </div>
      )}

      {/* Runtime Protection: Dirty State Warning Bar */}
      {programLockState === 'LIVE_DIRTY' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-status-warning/12 px-4 py-2.5 text-[13px] font-semibold text-status-warning shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-status-warning/20">
          <AlertCircle size={16} className="animate-pulse" />
          <span>Pending changes detected. Apply to live output?</span>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() =>
                executeRuntimeCommand('PROTECTION_UPDATE_LIVE', undefined, 'UI_BUTTON')
              }
              className="rounded bg-status-success/20 px-3 py-1 text-[12px] font-bold text-status-success hover:bg-status-success/30 transition-colors"
            >
              Update Live
            </button>
            <button
              onClick={() => executeRuntimeCommand('PROTECTION_DISCARD', undefined, 'UI_BUTTON')}
              className="rounded bg-white/10 px-3 py-1 text-[12px] font-bold text-text-muted hover:bg-white/20 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
