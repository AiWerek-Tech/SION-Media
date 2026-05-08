import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { logger } from '../utils/logger'

interface SlideData {
  songId: number
  slideIndex: number
  text: string
  sectionLabel: string
}

type ProjectionState = 'LIVE' | 'BLACK' | 'FREEZE' | 'CLEAR' | 'LOGO'

export function ProjectionApp(): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<SlideData | null>(null)
  const [projectionState, setProjectionState] = useState<ProjectionState>('CLEAR')
  const [theme, setTheme] = useState<Record<string, string>>({})

  useEffect(() => {
    // Listen for slide updates from operator
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      // Don't update currentSlide if state is FREEZE
      setProjectionState((currentState) => {
        if (currentState !== 'FREEZE') {
          setCurrentSlide(data as SlideData)
        }
        return currentState
      })
    })

    // Listen for state changes
    const unsubscribeState = window.api.projection.onStateChange((state) => {
      setProjectionState(state as ProjectionState)
    })

    // Listen for theme changes
    window.api.settings
      .getAll()
      .then(setTheme)
      .catch((err) => logger.error('Failed to load theme:', err))
    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      setTheme((currentTheme) => ({ ...currentTheme, ...(data as Record<string, string>) }))
    })

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      unsubscribeTheme()
    }
  }, [])

  // Determine what to show
  const showBlack = projectionState === 'BLACK'
  const showLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const showLogo =
    projectionState === 'LOGO' || (projectionState === 'CLEAR' && theme.projection_logo)

  // Theme properties
  const fontFamily = theme.projection_font_family || 'Inter'
  const fontSize = theme.projection_font_size
    ? `${theme.projection_font_size}px`
    : 'clamp(32px, 5vw, 72px)'
  const textColor = theme.projection_text_color || '#ffffff'
  const textShadow = theme.projection_text_shadow === '1' ? '2px 4px 16px rgba(0,0,0,0.8)' : 'none'
  const textAlign = (theme.projection_text_align || 'center') as React.CSSProperties['textAlign']
  const bgColor = theme.projection_bg_color || '#0f0f1a'
  const bgImage = theme.projection_bg_image || ''
  const bgOpacity = theme.projection_bg_opacity || '0.7'

  // Transition settings
  const transitionType = theme.transition_type || 'dissolve'
  const transitionDuration = parseFloat(theme.transition_duration || '0.5')

  // Generate transition configs based on user preference
  const getTransitionAnim = useMemo(() => {
    switch (transitionType) {
      case 'fast-cut':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.1 }
        }
      case 'smooth-blur':
        return {
          initial: { opacity: 0, filter: 'blur(16px)', scale: 0.98 },
          animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
          exit: { opacity: 0, filter: 'blur(12px)', scale: 1.02 },
          transition: {
            duration: transitionDuration,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
          }
        }
      case 'slide':
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 },
          transition: { duration: transitionDuration, ease: 'easeOut' as const }
        }
      case 'crossfade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: transitionDuration * 1.5, ease: 'easeInOut' as const }
        }
      case 'dissolve':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: transitionDuration }
        }
    }
  }, [transitionType, transitionDuration])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: 'none',
        position: 'relative',
        fontFamily: `'${fontFamily}', system-ui, sans-serif`,
        backgroundColor: '#000'
      }}
    >
      {/* Background Layer (Virtual Layer 1) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: showBlack ? '#000000' : bgColor,
          backgroundImage: showBlack
            ? 'none'
            : bgImage && !bgImage.match(/\.(mp4|webm)$/i)
              ? `url(${bgImage})`
              : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-color 0.8s ease',
          willChange: 'background-color'
        }}
      />

      {/* Video Background Layer */}
      {bgImage && bgImage.match(/\.(mp4|webm)$/i) && !showBlack && (
        <video
          src={bgImage}
          autoPlay
          loop
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}

      {/* Background Overlay (dimming image) */}
      {bgImage && !showBlack && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`
          }}
        />
      )}

      {/* Lyrics Content Layer (Virtual Layer 2 - Double Buffered via AnimatePresence) */}
      <AnimatePresence mode="wait">
        {showLive && currentSlide && (
          <motion.div
            key={`${currentSlide.songId}-${currentSlide.slideIndex}`}
            initial={getTransitionAnim.initial}
            animate={getTransitionAnim.animate}
            exit={getTransitionAnim.exit}
            transition={getTransitionAnim.transition}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8vh 10vw',
              willChange: 'transform, opacity, filter'
            }}
          >
            <p
              style={{
                color: textColor,
                fontSize: fontSize,
                fontWeight: 600,
                lineHeight: 1.4,
                textAlign: textAlign,
                whiteSpace: 'pre-line',
                textShadow: textShadow,
                maxWidth: '100%',
                margin: 0,
                letterSpacing: '0.02em',
                fontFeatureSettings: '"pnum" on, "lnum" on'
              }}
            >
              {currentSlide.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standby Logo Layer (Virtual Layer 3) */}
      <AnimatePresence>
        {showLogo && theme.projection_logo && !showBlack && (
          <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity:
                theme.projection_logo_position === 'center'
                  ? 1
                  : theme.projection_logo_opacity
                    ? parseFloat(theme.projection_logo_opacity)
                    : 0.5,
              scale: 1
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            src={
              theme.projection_logo.startsWith('http')
                ? theme.projection_logo
                : `file://${theme.projection_logo.replace(/\\/g, '/')}`
            }
            style={{
              position: 'absolute',
              maxWidth: theme.projection_logo_position === 'center' ? '50vw' : '20vw',
              maxHeight: theme.projection_logo_position === 'center' ? '50vh' : '20vh',
              objectFit: 'contain',
              willChange: 'opacity, transform',
              ...(theme.projection_logo_position === 'center'
                ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : theme.projection_logo_position === 'top-left'
                  ? { top: '5vh', left: '5vw' }
                  : { bottom: '5vh', right: '5vw' })
            }}
          />
        )}
      </AnimatePresence>

      {/* Hardware Blackout Layer (Topmost Layer) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: showBlack ? 1 : 0,
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: showBlack ? 'auto' : 'none',
          willChange: 'opacity'
        }}
      />
    </div>
  )
}
