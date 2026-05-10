import React, { useEffect, useMemo, useState } from 'react'
import { logger } from '../utils/logger'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Radio, ScreenShare } from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
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
  isProjectorLost?: boolean
  theme: Record<string, string>
}

function MonitorFrame({
  mode,
  slide,
  stateLabel,
  isLive = false,
  isBlack = false,
  isClear = false,
  isProjectorLost = false,
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
          {isProgram && isLive && (
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

  const isProjectorLost = displayCount <= 1

  return (
    <div className="relative h-full min-h-0 p-2.5 pt-8">
      <PanelGroup
        direction="horizontal"
        className="flex h-full min-h-0 gap-2.5"
        autoSaveId="sion:projection:monitorSplit"
      >
        <Panel minSize={28} maxSize={65} defaultSize={40}>
          <MonitorFrame
            mode="preview"
            slide={previewSlide}
            stateLabel={previewState}
            theme={theme}
          />
        </Panel>

        <PanelResizeHandle className="monitor-resize-handle" />

        <Panel minSize={35} maxSize={72} defaultSize={60}>
          <MonitorFrame
            mode="program"
            slide={programSlide}
            stateLabel={programState}
            isLive={isLive}
            isBlack={isBlack}
            isClear={isClear}
            isProjectorLost={isProjectorLost}
            theme={theme}
          />
        </Panel>
      </PanelGroup>

      {isProjectorLost && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-status-error/10 px-2.5 py-1 text-[11px] font-semibold text-status-error/85 shadow-[0_10px_28px_rgba(0,0,0,0.38)] backdrop-blur">
          Simulasi preview aktif karena proyektor eksternal tidak terdeteksi.
        </div>
      )}
    </div>
  )
}
