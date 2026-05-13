import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AtmosphereConfig, GradientConfig, OverlayConfig, ReadabilityConfig } from './types'
import { MotionEngine } from './MotionEngine'

interface AtmosphereRendererProps {
  config: AtmosphereConfig
  transitionDuration?: number
  className?: string
  showReadabilityGuard?: boolean
}

export const AtmosphereRenderer: React.FC<AtmosphereRendererProps> = ({
  config,
  transitionDuration = 0.8,
  className = '',
  showReadabilityGuard = true
}) => {
  const { mode, solidColor, gradient, media, motion: motionConfig, overlay, readability } = config

  const backgroundStyle = useMemo(() => {
    if (mode === 'solid') return { backgroundColor: solidColor || '#000' }
    if (mode === 'gradient' && gradient) return { background: getGradientCss(gradient) }
    return { backgroundColor: '#000' }
  }, [mode, solidColor, gradient])

  return (
    <div className={`absolute inset-0 overflow-hidden bg-black ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={config.id || JSON.stringify(config)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: transitionDuration, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {/* Layer 1: Base Background */}
          <div className="absolute inset-0" style={backgroundStyle} />

          {/* Layer 2: Media (Image/Video) */}
          {mode === 'image' && media?.path && (
            <motion.div
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(file://${media.path.replace(/\\/g, '/')})`,
                backgroundSize: media.fit || 'cover',
                backgroundPosition: 'center'
              }}
            />
          )}

          {mode === 'video' && media?.path && (
            <video
              src={`file://${media.path.replace(/\\/g, '/')}`}
              autoPlay
              loop
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Layer 3: Motion Particles/Effects */}
          {motionConfig && <MotionEngine config={motionConfig} />}

          {/* Layer 4: Atmospheric Overlay */}
          {overlay && <AtmosphericOverlay config={overlay} />}

          {/* Layer 5: Readability Guard */}
          {showReadabilityGuard && readability && <ReadabilityGuard config={readability} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const getGradientCss = (config: GradientConfig): string => {
  const { kind, angle = 180, stops } = config
  const stopsCss = stops
    .sort((a, b) => a.position - b.position)
    .map((s) => `${s.color} ${s.position}%`)
    .join(', ')

  if (kind === 'radial') return `radial-gradient(circle at center, ${stopsCss})`
  if (kind === 'aurora') {
    // Aurora is a complex multi-radial gradient
    return `
      radial-gradient(circle at 20% 30%, ${stops[0]?.color || 'transparent'} 0%, transparent 70%),
      radial-gradient(circle at 80% 20%, ${stops[1]?.color || 'transparent'} 0%, transparent 70%),
      radial-gradient(circle at 50% 80%, ${stops[2]?.color || 'transparent'} 0%, transparent 70%),
      ${stops[3]?.color || '#000'}
    `
  }
  return `linear-gradient(${angle}deg, ${stopsCss})`
}

const AtmosphericOverlay: React.FC<{ config: OverlayConfig }> = ({ config }) => {
  const { dim, vignette, glow, textShieldOpacity } = config

  return (
    <>
      {/* Global Dim */}
      <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: dim }} />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignette}) 100%)`
        }}
      />

      {/* Atmospheric Glow */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${glow * 0.2}), transparent 70%)`
        }}
      />

      {/* Text Shield (Lower-third focus) */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background: `linear-gradient(to top, rgba(0,0,0,${textShieldOpacity}), transparent)`
        }}
      />
    </>
  )
}

const ReadabilityGuard: React.FC<{ config: ReadabilityConfig }> = ({ config }) => {
  const { contrastBoost, blurBehindLyrics } = config

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backdropFilter: blurBehindLyrics ? 'blur(4px)' : 'none',
        filter: `contrast(${1 + contrastBoost})`
      }}
    />
  )
}
