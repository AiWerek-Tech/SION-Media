import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Radio, ScreenShare } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import type { SlideData } from '../types'

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
  theme: Record<string, string>
}

function MonitorFrame({
  mode,
  slide,
  stateLabel,
  isLive = false,
  isBlack = false,
  isClear = false,
  theme
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
      <div className="flex h-6 shrink-0 items-center justify-between px-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shadow-[0_0_12px_currentColor]"
            style={{ color: monitorColor, backgroundColor: monitorColor }}
          />
          <span className="truncate font-heading text-[12px] font-black uppercase tracking-[0.16em] text-text-primary">
            {isProgram ? 'PROGRAM / LIVE' : 'PREVIEW / CUE'}
          </span>
          <span className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-[0.04em] text-text-muted">
            {stateLabel}
          </span>
        </div>
        {emptyLyrics && (
          <span className="inline-flex items-center gap-1 rounded border border-status-warning/30 bg-status-warning/15 px-1.5 py-0.5 text-[12px] font-black text-status-warning">
            <AlertTriangle size={11} />
            LIRIK KOSONG
          </span>
        )}
        {isProgram && isLive && (
          <span className="inline-flex items-center gap-1 rounded border border-live-red/45 bg-live-red/18 px-1.5 py-0.5 text-[12px] font-black text-live-red">
            <Radio size={10} className="animate-pulse" />
            ON AIR
          </span>
        )}
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-black shadow-[0_22px_50px_rgba(0,0,0,0.42)]"
        style={{
          borderColor: `color-mix(in srgb, ${monitorColor} 72%, transparent)`,
          boxShadow: isLive
            ? `0 0 0 1px color-mix(in srgb, ${monitorColor} 30%, transparent), 0 0 30px color-mix(in srgb, ${monitorColor} 18%, transparent)`
            : undefined
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="relative aspect-video h-full max-h-full w-full max-w-full overflow-hidden rounded bg-black">
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
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white/28">
                <ScreenShare size={isProgram ? 42 : 34} />
                <span className="font-heading text-[12px] font-black uppercase tracking-[0.24em]">
                  SION MEDIA
                </span>
              </div>
            )}

            <div className="absolute bottom-1.5 right-1.5 rounded bg-black/58 px-1.5 py-0.5 font-mono text-[12px] font-bold text-white/70 backdrop-blur">
              16:9 1920x1080
            </div>
          </div>
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
    projectionState
  } = useProjectionStore()
  const { displayCount } = useAppStore()
  const [theme, setTheme] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    window.api.settings.getAll().then((settings) => {
      if (mounted) setTheme(settings)
    })
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

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,40%)_minmax(420px,60%)] gap-2 p-2 pt-9">
      <MonitorFrame mode="preview" slide={previewSlide} stateLabel={previewState} theme={theme} />
      <MonitorFrame
        mode="program"
        slide={programSlide}
        stateLabel={programState}
        isLive={isLive}
        isBlack={isBlack}
        isClear={isClear}
        theme={theme}
      />
      {displayCount <= 1 && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-status-error/35 bg-status-error/14 px-2 py-1 text-[12px] font-bold text-status-error backdrop-blur">
          Simulasi preview aktif karena proyektor eksternal tidak terdeteksi.
        </div>
      )}
    </div>
  )
}
