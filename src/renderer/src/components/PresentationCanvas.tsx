import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ProjectionState, SlideData } from '../types'
import { AtmosphereRenderer } from '../atmosphere/AtmosphereRenderer'
import type { AtmosphereConfig } from '../atmosphere/types'

interface PresentationCanvasProps {
  slide: SlideData | null
  projectionState: ProjectionState
  theme: Record<string, string>
  animated?: boolean
  showMetadata?: boolean
  fit?: boolean
  className?: string
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
  if (path.startsWith('http')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

function parseAtmosphereConfig(raw?: string): AtmosphereConfig | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AtmosphereConfig
  } catch {
    return null
  }
}

function buildLegacyAtmosphere(theme: Record<string, string>): AtmosphereConfig {
  const bgImage = theme.projection_bg_image || ''
  const isVideo = Boolean(bgImage.match(/\.(mp4|webm)$/i))

  return {
    id: 'legacy-theme-fallback',
    name: 'Legacy Theme Fallback',
    mode: bgImage ? (isVideo ? 'video' : 'image') : 'solid',
    solidColor: theme.projection_bg_color || '#090b14',
    media: bgImage
      ? {
          path: bgImage,
          fit: 'cover',
          loop: true,
          muted: true
        }
      : undefined,
    overlay: {
      dim: Number(theme.projection_bg_opacity || 0.48),
      blur: Number(theme.projection_bg_blur || 0),
      vignette: 0.24,
      glow: 0.1,
      textShieldOpacity: 0.22
    },
    readability: {
      smartDimming: true,
      contrastBoost: 0.18,
      blurBehindLyrics: true,
      lyricSafeMode: true
    }
  }
}

function resolveAtmosphere(theme: Record<string, string>): AtmosphereConfig {
  return (
    parseAtmosphereConfig(theme.projection_atmosphere_live_override) ||
    parseAtmosphereConfig(theme.song_background_config) ||
    parseAtmosphereConfig(theme.projection_default_atmosphere) ||
    buildLegacyAtmosphere(theme)
  )
}

export function PresentationCanvas({
  slide,
  projectionState,
  theme,
  animated = true,
  showMetadata = true,
  fit = false,
  className
}: PresentationCanvasProps): React.JSX.Element {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

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
    projectionState === 'LOGO' || (projectionState === 'CLEAR' && theme.projection_logo)
  )
  const fontFamily = theme.projection_font_family || 'Inter'
  const fontSize = Number(theme.projection_font_size || 86)
  const textColor = theme.projection_text_color || '#ffffff'
  const textShadow =
    theme.projection_text_shadow === '1'
      ? '0 8px 34px rgba(0,0,0,0.88), 0 2px 10px rgba(0,0,0,0.72)'
      : '0 5px 22px rgba(0,0,0,0.62)'
  const textAlign = (theme.projection_text_align || 'center') as React.CSSProperties['textAlign']
  const transitionType = theme.transition_type || 'smooth-blur'
  const transitionDuration = Number(theme.transition_duration || 0.5)
  const transition = useMemo(
    () => getTransitionConfig(transitionType, transitionDuration),
    [transitionType, transitionDuration]
  )
  const hasLyrics = showLive && slide && slide.text.trim().length > 0 && !showBlack
  const contentKey = slide ? `${slide.songId}-${slide.slideIndex}-${slide.text}` : 'empty'
  const resolvedAtmosphere = useMemo(() => resolveAtmosphere(theme), [theme])

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

      <AnimatePresence mode="wait">
        {hasLyrics && (
          <motion.div
            key={contentKey}
            initial={animated ? transition.initial : false}
            animate={animated ? transition.animate : undefined}
            exit={animated ? transition.exit : undefined}
            transition={animated ? transition.transition : undefined}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '118px 190px',
              willChange: 'transform, opacity, filter'
            }}
          >
            <div
              style={{
                maxWidth: 1440,
                width: '75%',
                textAlign
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: textColor,
                  fontFamily,
                  fontSize,
                  fontWeight: 560,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                  whiteSpace: 'pre-line',
                  textAlign,
                  textShadow
                }}
              >
                {slide.text}
              </p>

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

      {!hasLyrics && !showBlack && (
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

      {showLogo && theme.projection_logo && !showBlack && (
        <motion.img
          initial={animated ? { opacity: 0, scale: 0.95 } : false}
          animate={animated ? { opacity: 1, scale: 1 } : undefined}
          exit={animated ? { opacity: 0, scale: 0.95 } : undefined}
          transition={{ duration: 0.8 }}
          src={toFileUrl(theme.projection_logo)}
          style={{
            position: 'absolute',
            maxWidth: theme.projection_logo_position === 'center' ? 960 : 384,
            maxHeight: theme.projection_logo_position === 'center' ? 540 : 216,
            objectFit: 'contain',
            ...(theme.projection_logo_position === 'center'
              ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
              : theme.projection_logo_position === 'top-left'
                ? { top: 80, left: 90 }
                : { bottom: 80, right: 90 })
          }}
        />
      )}

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
