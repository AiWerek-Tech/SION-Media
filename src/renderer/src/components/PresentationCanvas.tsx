import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ProjectionState, SlideData } from '@renderer/types'
import { AtmosphereRenderer } from '@renderer/atmosphere/AtmosphereRenderer'
import { useAtmosphereStore } from '@renderer/store/useAtmosphereStore'
import { BibleAutoFitText } from './presentation/BibleAutoFitText'

interface PresentationCanvasProps {
  slide: SlideData | null
  projectionState: ProjectionState
  theme: Record<string, string>
  animated?: boolean
  showMetadata?: boolean
  fit?: boolean
  className?: string
  lyricsFontSizePercent?: number
  /** When false, suppresses the idle "SION PRESENTER" watermark text.
   *  Set to false when used inside MonitorFrame which has its own SVG watermark. */
  showIdleWatermark?: boolean
  /** AnimatePresence mode: 'wait' (projector, sequential) or 'sync' (operator, simultaneous).
   *  'sync' runs exit and enter in parallel, eliminating perceived delay on small monitors. */
  transitionMode?: 'wait' | 'sync' | 'popLayout'
}

interface TransitionConfig {
  initial: Record<string, number | string>
  animate: Record<string, number | string>
  exit: Record<string, number | string>
  transition: {
    duration: number
    ease?: [number, number, number, number]
  }
}

const CANVAS_STYLE: React.CSSProperties = {
  position: 'relative',
  width: 1920,
  height: 1080,
  overflow: 'hidden',
  background: '#000',
  transformOrigin: 'top left',
  fontFeatureSettings: '"pnum" on, "lnum" on'
}

function getTransitionConfig(type: string, duration: number): TransitionConfig {
  switch (type) {
    case 'fast-cut':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.1 }
      }
    case 'smooth-blur':
      return {
        initial: { opacity: 0, filter: 'blur(18px)', scale: 0.985 },
        animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
        exit: { opacity: 0, filter: 'blur(12px)', scale: 1.015 },
        transition: { duration, ease: [0.22, 1, 0.36, 1] }
      }
    case 'slide':
      return {
        initial: { opacity: 0, y: 34 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -34 },
        transition: { duration, ease: [0.16, 1, 0.3, 1] }
      }
    case 'crossfade':
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: duration * 1.5, ease: [0.4, 0, 0.2, 1] }
      }
    case 'premium-slide':
      return {
        initial: { opacity: 0, y: 48, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -48, scale: 1.02 },
        transition: { duration, ease: [0.22, 1, 0.36, 1] }
      }
    case 'dissolve':
    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration }
      }
  }
}

function toFileUrl(path: string): string {
  if (path.startsWith('http') || path.startsWith('file://')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

export function PresentationCanvas({
  slide,
  projectionState,
  theme,
  animated = true,
  showMetadata = true,
  fit = false,
  className,
  lyricsFontSizePercent = 100,
  showIdleWatermark = true,
  transitionMode = 'wait'
}: PresentationCanvasProps): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const prefersReducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    if (!fit || !wrapperRef.current) return undefined
    const node = wrapperRef.current
    const updateScale = (): void => {
      const rect = node.getBoundingClientRect()
      setScale(Math.min(rect.width / 1920, rect.height / 1080))
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(node)
    return () => observer.disconnect()
  }, [fit])

  const showBlack = projectionState === 'BLACK'
  const showLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const showLogo = Boolean(
    theme.projection_logo &&
    (projectionState === 'LOGO' ||
      projectionState === 'CLEAR' ||
      ((projectionState === 'LIVE' || projectionState === 'FREEZE') &&
        (theme.projection_logo_show_on_live ?? '1') === '1'))
  )
  const fontFamily = theme.projection_font_family || 'Inter'
  const baseFontSize = Number(theme.projection_font_size || 86)
  const fontSize = Math.round(baseFontSize * (lyricsFontSizePercent / 100))
  // Progressively relax layout constraints at higher zoom levels
  // so text can truly fill the screen at 200%+
  const zoomFactor = lyricsFontSizePercent / 100
  const dynamicPaddingV = Math.max(24, Math.round(118 / Math.max(1, zoomFactor * 0.8)))
  const dynamicPaddingH = Math.max(40, Math.round(190 / Math.max(1, zoomFactor * 0.7)))
  const dynamicMaxWidth = Math.min(1920, Math.round(1440 * Math.max(1, zoomFactor * 0.85)))
  const dynamicWidth = `${Math.min(100, Math.round(75 * Math.max(1, zoomFactor * 0.72)))}%`
  const fontWeight = Number(theme.projection_font_weight || 650)
  const lineHeight = Number(theme.projection_line_height || theme.projection_line_spacing || 1.15)
  const textColor = theme.projection_text_color || '#ffffff'
  const textOutline = theme.projection_text_outline === '1'
  const textShadow =
    theme.projection_text_shadow === '1'
      ? '0 8px 34px rgba(0,0,0,0.88), 0 2px 10px rgba(0,0,0,0.72)'
      : '0 5px 22px rgba(0,0,0,0.62)'
  const textAlign = (theme.projection_text_align || 'center') as React.CSSProperties['textAlign']
  const transitionType = theme.transition_type || 'smooth-blur'
  const transitionDuration = Number(theme.transition_duration || 0.5)
  const transition = useMemo(
    () =>
      prefersReducedMotion
        ? getTransitionConfig('dissolve', 0.1)
        : getTransitionConfig(transitionType, transitionDuration),
    [transitionType, transitionDuration, prefersReducedMotion]
  )
  const hasLyrics = showLive && slide && slide.text.trim().length > 0 && !showBlack
  const contentKey = slide ? `${slide.songId}-${slide.slideIndex}-${slide.text}` : 'empty'
  const isInfoSlide = slide?.contentType === 'custom' && Boolean(slide.sectionLabel?.trim())
  const isBibleSlide = slide?.contentType === 'bible'
  const getResolvedAtmosphere = useAtmosphereStore((s) => s.getResolvedAtmosphere)
  const resolvedAtmosphere = useMemo(() => {
    // Use centralized store resolution with legacy theme fallback
    const resolved = getResolvedAtmosphere(theme)
    return resolved.active
  }, [theme, getResolvedAtmosphere])

  const primaryTextContent = slide ? (
    isInfoSlide ? (
      <div data-testid="info-slide-content">
        <div
          data-testid="info-slide-title"
          style={{
            marginBottom: Math.max(18, Math.round(fontSize * 0.3)),
            color: 'rgba(255,255,255,0.62)',
            fontFamily: `var(--font-heading), ${fontFamily}`,
            fontSize: Math.max(24, Math.round(fontSize * 0.38)),
            fontWeight: 600,
            letterSpacing: '0.035em',
            lineHeight: 1.25,
            textAlign,
            textShadow
          }}
        >
          {slide.sectionLabel}
        </div>
        <p
          data-testid="info-slide-body"
          style={{
            margin: 0,
            color: textColor,
            fontFamily: `var(--font-heading), ${fontFamily}`,
            fontSize,
            fontWeight: Math.max(fontWeight, 700),
            letterSpacing: '-0.015em',
            lineHeight,
            whiteSpace: 'pre-line',
            textAlign,
            textShadow,
            WebkitTextStroke: textOutline ? '2px rgba(0,0,0,0.58)' : undefined
          }}
        >
          {slide.text}
        </p>
      </div>
    ) : isBibleSlide ? (
      <BibleAutoFitText
        text={slide.text}
        reference={slide.bibleReference}
        copyright={slide.bibleCopyright}
        requestedFontSize={fontSize}
        minimumFontSize={32}
        availableHeight={1080 - dynamicPaddingV * 2}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        lineHeight={lineHeight}
        textColor={textColor}
        textAlign={textAlign}
        textShadow={textShadow}
        textOutline={textOutline}
      />
    ) : (
      <p
        style={{
          margin: 0,
          color: textColor,
          fontFamily: `var(--font-heading), ${fontFamily}`,
          fontSize,
          fontWeight,
          letterSpacing: 0,
          lineHeight,
          whiteSpace: 'pre-line',
          textAlign,
          textShadow,
          WebkitTextStroke: textOutline ? '2px rgba(0,0,0,0.58)' : undefined
        }}
      >
        {slide.text.split(/(\[\d+\])/g).map((part, i) => {
          if (part.match(/\[\d+\]/)) {
            return (
              <sup key={i} style={{ fontSize: '0.6em', opacity: 0.8, marginRight: '4px' }}>
                {part.replace(/\[|\]/g, '')}
              </sup>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    )
  ) : null

  const canvas = (
    <div
      className={className}
      style={
        fit
          ? {
              ...CANVAS_STYLE,
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${scale})`,
              transformOrigin: 'center center'
            }
          : CANVAS_STYLE
      }
    >
      {!showBlack && (
        <AtmosphereRenderer
          config={resolvedAtmosphere}
          transitionDuration={transitionDuration}
          showReadabilityGuard={hasLyrics || showLogo}
        />
      )}

      {animated ? (
        <AnimatePresence mode={transitionMode}>
          {hasLyrics && (
            <motion.div
              key={contentKey}
              initial={transition.initial}
              animate={transition.animate}
              exit={transition.exit}
              transition={transition.transition}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: `${dynamicPaddingV}px ${dynamicPaddingH}px`,
                willChange: 'transform, opacity, filter'
              }}
            >
              <div
                style={{
                  maxWidth: dynamicMaxWidth,
                  width: dynamicWidth,
                  textAlign
                }}
              >
                {primaryTextContent}

                {!isBibleSlide && slide.bibleReference && (
                  <div
                    style={{
                      marginTop: 48,
                      color: 'rgba(255,255,255,0.9)',
                      fontFamily,
                      fontSize: fontSize * 0.45,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textAlign:
                        textAlign === 'left' ? 'left' : textAlign === 'right' ? 'right' : 'center',
                      textShadow
                    }}
                  >
                    — {slide.bibleReference} —
                  </div>
                )}

                {!isBibleSlide && slide.bibleCopyright && (
                  <div
                    style={{
                      marginTop: 12,
                      color: 'rgba(255,255,255,0.4)',
                      fontFamily,
                      fontSize: fontSize * 0.28,
                      fontWeight: 500,
                      textAlign:
                        textAlign === 'left' ? 'left' : textAlign === 'right' ? 'right' : 'center',
                      textShadow
                    }}
                  >
                    {slide.bibleCopyright}
                  </div>
                )}

                {showMetadata && (slide.keyNote || slide.timeSignature || slide.tempo) && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 24,
                      marginTop: 50,
                      padding: '14px 32px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.42)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(16px)',
                      color: 'rgba(255,255,255,0.72)',
                      fontFamily
                    }}
                  >
                    {slide.keyNote && <strong>Nada {slide.keyNote}</strong>}
                    {slide.timeSignature && <strong>{slide.timeSignature}</strong>}
                    {slide.tempo && <strong>{slide.tempo} BPM</strong>}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        hasLyrics && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: `${dynamicPaddingV}px ${dynamicPaddingH}px`
            }}
          >
            <div
              style={{
                maxWidth: dynamicMaxWidth,
                width: dynamicWidth,
                textAlign
              }}
            >
              {primaryTextContent}

              {!isBibleSlide && slide.bibleReference && (
                <div
                  style={{
                    marginTop: 48,
                    color: 'rgba(255,255,255,0.9)',
                    fontFamily,
                    fontSize: fontSize * 0.45,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    textAlign:
                      textAlign === 'left' ? 'left' : textAlign === 'right' ? 'right' : 'center',
                    textShadow
                  }}
                >
                  — {slide.bibleReference} —
                </div>
              )}

              {!isBibleSlide && slide.bibleCopyright && (
                <div
                  style={{
                    marginTop: 12,
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily,
                    fontSize: fontSize * 0.28,
                    fontWeight: 500,
                    textAlign:
                      textAlign === 'left' ? 'left' : textAlign === 'right' ? 'right' : 'center',
                    textShadow
                  }}
                >
                  {slide.bibleCopyright}
                </div>
              )}

              {showMetadata && (slide.keyNote || slide.timeSignature || slide.tempo) && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 24,
                    marginTop: 50,
                    padding: '14px 32px',
                    borderRadius: 999,
                    background: 'rgba(0,0,0,0.42)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(16px)',
                    color: 'rgba(255,255,255,0.72)',
                    fontFamily
                  }}
                >
                  {slide.keyNote && <strong>Nada {slide.keyNote}</strong>}
                  {slide.timeSignature && <strong>{slide.timeSignature}</strong>}
                  {slide.tempo && <strong>{slide.tempo} BPM</strong>}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {!hasLyrics && !showBlack && showIdleWatermark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.16)',
            fontFamily,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: '0.18em'
          }}
        >
          SION PRESENTER
        </div>
      )}

      {showLogo &&
        theme.projection_logo &&
        !showBlack &&
        (animated ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            src={toFileUrl(theme.projection_logo)}
            style={{
              position: 'absolute',
              maxWidth: theme.projection_logo_position === 'center' ? 960 : 384,
              maxHeight: theme.projection_logo_position === 'center' ? 540 : 216,
              objectFit: 'contain',
              opacity: Number(theme.projection_logo_opacity || 0.85),
              ...(theme.projection_logo_position === 'center'
                ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : theme.projection_logo_position === 'top-left'
                  ? { top: 80, left: 90 }
                  : theme.projection_logo_position === 'top-right'
                    ? { top: 80, right: 90 }
                    : theme.projection_logo_position === 'bottom-left'
                      ? { bottom: 80, left: 90 }
                      : { bottom: 80, right: 90 })
            }}
          />
        ) : (
          <img
            src={toFileUrl(theme.projection_logo)}
            style={{
              position: 'absolute',
              maxWidth: theme.projection_logo_position === 'center' ? 960 : 384,
              maxHeight: theme.projection_logo_position === 'center' ? 540 : 216,
              objectFit: 'contain',
              opacity: Number(theme.projection_logo_opacity || 0.85),
              ...(theme.projection_logo_position === 'center'
                ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : theme.projection_logo_position === 'top-left'
                  ? { top: 80, left: 90 }
                  : theme.projection_logo_position === 'top-right'
                    ? { top: 80, right: 90 }
                    : theme.projection_logo_position === 'bottom-left'
                      ? { bottom: 80, left: 90 }
                      : { bottom: 80, right: 90 })
            }}
          />
        ))}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: showBlack ? 1 : 0,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: showBlack ? 'auto' : 'none'
        }}
      />
    </div>
  )

  if (!fit) return canvas

  return (
    <div ref={wrapperRef} className="presentation-canvas-fit">
      {canvas}
    </div>
  )
}
