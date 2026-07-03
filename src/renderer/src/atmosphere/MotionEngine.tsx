import React from 'react'
import { motion } from 'framer-motion'
import type { MotionConfig } from './types'

interface MotionEngineProps {
  config?: MotionConfig
  className?: string
}

export const MotionEngine: React.FC<MotionEngineProps> = ({ config, className }) => {
  if (!config) return null

  const { preset, intensity, speed, tint } = config

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {preset === 'aurora' && <AuroraEffect intensity={intensity} speed={speed} tint={tint} />}
      {preset === 'animated-gradient' && (
        <AnimatedGradientEffect intensity={intensity} speed={speed} />
      )}
      {preset === 'soft-particles' && (
        <ParticlesEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'cinematic-haze' && (
        <HazeEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'volumetric-light' && (
        <VolumetricLightEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'cloud-drift' && (
        <CloudDriftEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'sabbath-dawn' && (
        <CssMotionEffect variant="sabbath-dawn" intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'three-angels' && (
        <CssMotionEffect variant="three-angels" intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'sanctuary-light' && (
        <CssMotionEffect
          variant="sanctuary-light"
          intensity={intensity}
          speed={speed}
          tint={tint}
        />
      )}
      {preset === 'living-water' && (
        <CssMotionEffect variant="living-water" intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'second-advent' && (
        <CssMotionEffect variant="second-advent" intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'scripture-glow' && (
        <CssMotionEffect variant="scripture-glow" intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'cosmic-aurora' && (
        <CosmicAuroraEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'pentecost-fire' && (
        <PentecostFireEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'ocean-glory' && (
        <OceanGloryEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'shekinah-light' && (
        <ShekinahLightEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'glorious-beams' && (
        <GloriousBeamsEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'stage-smoke' && (
        <StageSmokeEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'laser-lines' && (
        <LaserLinesEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'cyber-grid' && (
        <CyberGridEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'cosmic-orbs' && (
        <CosmicOrbsEffect intensity={intensity} speed={speed} tint={tint} />
      )}
      {preset === 'ray-wave' && <RayWaveEffect intensity={intensity} speed={speed} tint={tint} />}
    </div>
  )
}

type CssMotionVariant =
  | 'sabbath-dawn'
  | 'three-angels'
  | 'sanctuary-light'
  | 'living-water'
  | 'second-advent'
  | 'scripture-glow'

const cssMotionBackground: Record<CssMotionVariant, string> = {
  'sabbath-dawn':
    'radial-gradient(circle at 20% 18%, var(--motion-tint) 0%, transparent 24%), radial-gradient(circle at 78% 30%, rgba(125,211,252,0.32) 0%, transparent 28%), linear-gradient(135deg, rgba(3,7,18,0), rgba(14,165,233,0.22), rgba(2,6,23,0))',
  'three-angels':
    'conic-gradient(from 180deg at 50% 50%, transparent 0deg, var(--motion-tint) 54deg, transparent 108deg, rgba(14,165,233,0.28) 180deg, transparent 260deg, rgba(250,204,21,0.2) 320deg, transparent 360deg)',
  'sanctuary-light':
    'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.08) 38%, var(--motion-tint) 50%, rgba(255,255,255,0.08) 62%, transparent 100%)',
  'living-water':
    'repeating-radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.1) 0 2px, transparent 2px 22px), linear-gradient(180deg, transparent, var(--motion-tint))',
  'second-advent':
    'radial-gradient(circle at 50% 18%, rgba(254,243,199,0.6), transparent 20%), linear-gradient(115deg, transparent 18%, var(--motion-tint) 48%, transparent 78%)',
  'scripture-glow':
    'linear-gradient(90deg, transparent, var(--motion-tint), transparent), radial-gradient(circle at 50% 55%, rgba(255,255,255,0.12), transparent 42%)'
}

const CssMotionEffect: React.FC<Omit<MotionConfig, 'preset'> & { variant: CssMotionVariant }> = ({
  variant,
  intensity,
  speed,
  tint
}) => {
  const duration = `${Math.max(16 / Math.max(speed, 0.1), 8).toFixed(1)}s`
  const opacity = Math.min(Math.max(0.16 + intensity * 0.52, 0.12), 0.72)

  return (
    <div
      className="absolute inset-[-10%] mix-blend-screen"
      style={
        {
          '--motion-tint': tint || '#93c5fd',
          '--motion-duration': duration,
          background: cssMotionBackground[variant],
          backgroundSize: '220% 220%',
          opacity,
          filter: `blur(${Math.round(18 + intensity * 44)}px)`,
          animation: 'sion-css-motion var(--motion-duration) ease-in-out infinite alternate'
        } as React.CSSProperties
      }
    />
  )
}

const AuroraEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = 20 / Math.max(speed, 0.1)

  return (
    <div className="absolute inset-0 opacity-30 mix-blend-screen">
      <motion.div
        animate={{
          rotate: [0, 5, 0],
          scale: [1, 1.1, 1],
          x: ['-5%', '5%', '-5%']
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute inset-[-20%] opacity-40"
        style={{
          background: `radial-gradient(circle at 20% 30%, ${tint || '#3b82f6'} 0%, transparent 50%), 
                       radial-gradient(circle at 80% 70%, ${tint || '#8b5cf6'} 0%, transparent 50%)`,
          filter: `blur(${60 * intensity}px)`
        }}
      />
    </div>
  )
}

const AnimatedGradientEffect: React.FC<Omit<MotionConfig, 'preset' | 'tint'>> = ({
  intensity,
  speed
}) => {
  const duration = 15 / Math.max(speed, 0.1)

  return (
    <motion.div
      animate={{
        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear'
      }}
      className="absolute inset-0 opacity-20"
      style={{
        background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)',
        backgroundSize: '400% 400%',
        filter: `blur(${40 * intensity}px)`
      }}
    />
  )
}

// Pre-computed particle data — generated once at module load, never during render
const PARTICLE_DATA = Array.from({ length: 12 }, () => ({
  x0: `${Math.random() * 100}%`,
  y0: `${Math.random() * 100}%`,
  scale0: Math.random() * 0.5 + 0.5,
  y1: `${Math.random() * 100}%`,
  y2: `${Math.random() * 100 - 20}%`,
  baseDelay: Math.random() * 10
}))

const ParticlesEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  return (
    <div className="absolute inset-0 mix-blend-screen">
      {PARTICLE_DATA.map((p, i) => (
        <motion.div
          key={i}
          initial={{
            x: p.x0,
            y: p.y0,
            opacity: 0,
            scale: p.scale0
          }}
          animate={{
            y: [p.y1, p.y2],
            opacity: [0, 0.4 * intensity, 0]
          }}
          transition={{
            duration: (10 + i * 1.5) / Math.max(speed, 0.1),
            repeat: Infinity,
            delay: p.baseDelay,
            ease: 'linear'
          }}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: tint || '#fff',
            filter: 'blur(2px)'
          }}
        />
      ))}
    </div>
  )
}

const HazeEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  return (
    <div className="absolute inset-0 opacity-20 mix-blend-soft-light">
      <motion.div
        animate={{
          x: ['-10%', '10%', '-10%'],
          y: ['-5%', '5%', '-5%']
        }}
        transition={{
          duration: 25 / Math.max(speed, 0.1),
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute inset-[-50%]"
        style={{
          background: `radial-gradient(ellipse at center, ${tint || 'rgba(255,255,255,0.2)'} 0%, transparent 70%)`,
          filter: `blur(${100 * intensity}px)`
        }}
      />
    </div>
  )
}

const VolumetricLightEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({
  intensity,
  speed,
  tint
}) => {
  const beamTint = tint || 'rgba(255,255,255,0.28)'

  return (
    <div className="absolute inset-0 opacity-25 mix-blend-screen">
      {[0, 1, 2].map((beam) => (
        <motion.div
          key={beam}
          animate={{
            opacity: [0.08, 0.22 * intensity + 0.08, 0.08],
            x: ['-6%', '6%', '-6%'],
            rotate: [-8 + beam * 4, -2 + beam * 4, -8 + beam * 4]
          }}
          transition={{
            duration: (18 + beam * 4) / Math.max(speed, 0.1),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: beam * 0.8
          }}
          className="absolute top-[-10%] h-[140%] w-[28%]"
          style={{
            left: `${12 + beam * 24}%`,
            background: `linear-gradient(180deg, ${beamTint}, transparent 72%)`,
            filter: `blur(${32 + intensity * 36}px)`
          }}
        />
      ))}
    </div>
  )
}

const CloudDriftEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const cloudTint = tint || 'rgba(255,255,255,0.16)'

  return (
    <div className="absolute inset-0 opacity-30 mix-blend-screen">
      {[0, 1, 2].map((cloud) => (
        <motion.div
          key={cloud}
          animate={{
            x: ['-18%', '12%', '-18%'],
            y: [`${cloud * 6}%`, `${cloud * 6 + 3}%`, `${cloud * 6}%`],
            scale: [1, 1.06, 1]
          }}
          transition={{
            duration: (26 + cloud * 6) / Math.max(speed, 0.1),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: cloud * 1.2
          }}
          className="absolute h-[46%] w-[62%] rounded-full"
          style={{
            top: `${12 + cloud * 18}%`,
            left: `${-10 + cloud * 14}%`,
            background: `radial-gradient(circle at 40% 50%, ${cloudTint} 0%, transparent 68%)`,
            filter: `blur(${42 + intensity * 58}px)`
          }}
        />
      ))}
    </div>
  )
}

const CosmicAuroraEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = `${Math.max(14 / Math.max(speed, 0.1), 6).toFixed(1)}s`
  const color1 = tint || '#38bdf8'
  const color2 = '#818cf8'
  const color3 = '#c084fc'

  return (
    <div className="absolute inset-[-15%] opacity-65 mix-blend-screen">
      <div
        style={{
          background: `
            radial-gradient(ellipse at 25% 25%, ${color1} 0%, transparent 55%),
            radial-gradient(ellipse at 75% 35%, ${color2} 0%, transparent 60%),
            radial-gradient(ellipse at 50% 75%, ${color3} 0%, transparent 65%)
          `,
          width: '100%',
          height: '100%',
          filter: `blur(${Math.round(40 + intensity * 35)}px)`,
          animation: `sion-aurora-mesh ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const PentecostFireEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({
  intensity,
  speed,
  tint
}) => {
  const duration = `${Math.max(12 / Math.max(speed, 0.1), 5).toFixed(1)}s`
  const fireTint = tint || '#f97316'

  return (
    <div className="absolute inset-[-10%] opacity-60 mix-blend-color-dodge">
      <div
        style={{
          background: `
            radial-gradient(circle at 50% 90%, ${fireTint} 0%, rgba(225,29,72,0.6) 35%, rgba(192,38,211,0.3) 65%, transparent 85%),
            radial-gradient(circle at 30% 60%, rgba(251,146,60,0.5) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(244,63,94,0.5) 0%, transparent 50%)
          `,
          width: '100%',
          height: '100%',
          filter: `blur(${Math.round(30 + intensity * 30)}px)`,
          animation: `sion-fire-glow ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const OceanGloryEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = `${Math.max(16 / Math.max(speed, 0.1), 7).toFixed(1)}s`
  const oceanTint = tint || '#06b6d4'

  return (
    <div className="absolute inset-[-12%] opacity-60 mix-blend-screen">
      <div
        style={{
          background: `
            radial-gradient(ellipse at 50% 100%, ${oceanTint} 0%, rgba(14,165,233,0.5) 30%, rgba(30,58,138,0.2) 65%, transparent 85%),
            radial-gradient(circle at 20% 40%, rgba(56,189,248,0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 40%, rgba(99,102,241,0.4) 0%, transparent 50%)
          `,
          width: '100%',
          height: '100%',
          filter: `blur(${Math.round(35 + intensity * 35)}px)`,
          animation: `sion-ocean-wave ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const ShekinahLightEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({
  intensity,
  speed,
  tint
}) => {
  const duration = `${Math.max(18 / Math.max(speed, 0.1), 8).toFixed(1)}s`
  const goldTint = tint || '#fbbf24'

  return (
    <div className="absolute inset-[-10%] opacity-55 mix-blend-screen">
      <div
        style={{
          background: `
            radial-gradient(circle at 50% 20%, ${goldTint} 0%, rgba(217,119,6,0.4) 40%, rgba(120,53,15,0.2) 70%, transparent 90%),
            radial-gradient(circle at 50% 50%, rgba(254,243,199,0.3) 0%, transparent 60%)
          `,
          width: '100%',
          height: '100%',
          filter: `blur(${Math.round(40 + intensity * 30)}px)`,
          animation: `sion-shekinah-pulse ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const GloriousBeamsEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({
  intensity,
  speed,
  tint
}) => {
  const duration = `${Math.max(15 / Math.max(speed, 0.1), 6).toFixed(1)}s`
  const beamColor = tint || '#a855f7'

  return (
    <div className="absolute inset-[-15%] opacity-55 mix-blend-screen">
      <div
        style={{
          background: `
            linear-gradient(135deg, transparent 20%, ${beamColor} 45%, rgba(56,189,248,0.5) 55%, transparent 80%),
            radial-gradient(circle at 70% 30%, rgba(236,72,153,0.4) 0%, transparent 60%)
          `,
          width: '100%',
          height: '100%',
          filter: `blur(${Math.round(45 + intensity * 25)}px)`,
          animation: `sion-beam-sweep ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const StageSmokeEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration1 = `${Math.max(16 / Math.max(speed, 0.1), 7).toFixed(1)}s`
  const duration2 = `${Math.max(22 / Math.max(speed, 0.1), 10).toFixed(1)}s`
  const smokeColor = tint || '#38bdf8'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
      {/* Layer 1: Drifting smoke clouds */}
      <div
        className="absolute inset-[-20%]"
        style={{
          background: `
            radial-gradient(circle at 30% 70%, ${smokeColor} 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(147,197,253,0.5) 0%, transparent 55%),
            radial-gradient(circle at 50% 90%, rgba(192,132,252,0.4) 0%, transparent 60%)
          `,
          filter: `blur(${Math.round(50 + intensity * 40)}px)`,
          animation: `sion-smoke-drift ${duration1} ease-in-out infinite`
        }}
      />
      {/* Layer 2: Swirling fog turbulence */}
      <div
        className="absolute inset-[-25%]"
        style={{
          background: `
            radial-gradient(circle at 60% 40%, rgba(255,255,255,0.25) 0%, transparent 45%),
            radial-gradient(circle at 40% 80%, ${smokeColor} 0%, transparent 50%)
          `,
          filter: `blur(${Math.round(60 + intensity * 35)}px)`,
          animation: `sion-smoke-swirl ${duration2} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const LaserLinesEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = `${Math.max(10 / Math.max(speed, 0.1), 4).toFixed(1)}s`
  const laserColor = tint || '#00f0ff'

  return (
    <div className="absolute inset-[-20%] pointer-events-none mix-blend-screen">
      <div
        style={{
          background: `
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 40px,
              ${laserColor} 41px,
              transparent 43px,
              transparent 120px
            ),
            radial-gradient(circle at 50% 50%, rgba(0,240,255,0.3) 0%, transparent 70%)
          `,
          backgroundSize: '200% 200%',
          width: '100%',
          height: '100%',
          opacity: Math.min(0.4 + intensity * 0.4, 0.8),
          filter: `blur(${Math.round(4 + intensity * 8)}px)`,
          animation: `sion-laser-sweep ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const CyberGridEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = `${Math.max(8 / Math.max(speed, 0.1), 3).toFixed(1)}s`
  const gridColor = tint || 'rgba(56,189,248,0.4)'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
      <div
        className="absolute inset-[-30%]"
        style={{
          background: `
            linear-gradient(90deg, ${gridColor} 1px, transparent 1px),
            linear-gradient(180deg, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: Math.min(0.3 + intensity * 0.35, 0.75),
          filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.6))',
          animation: `sion-grid-pulse ${duration} ease-in-out infinite`
        }}
      />
    </div>
  )
}

const CosmicOrbsEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration1 = `${Math.max(14 / Math.max(speed, 0.1), 6).toFixed(1)}s`
  const duration2 = `${Math.max(18 / Math.max(speed, 0.1), 8).toFixed(1)}s`
  const orbColor = tint || '#c084fc'

  return (
    <div className="absolute inset-0 pointer-events-none mix-blend-screen">
      <div
        className="absolute inset-[-10%]"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, ${orbColor} 0%, transparent 35%),
            radial-gradient(circle at 80% 70%, rgba(56,189,248,0.6) 0%, transparent 40%),
            radial-gradient(circle at 50% 80%, rgba(251,146,60,0.5) 0%, transparent 45%)
          `,
          filter: `blur(${Math.round(35 + intensity * 35)}px)`,
          animation: `sion-orb-float ${duration1} ease-in-out infinite`
        }}
      />
      <div
        className="absolute inset-[-15%]"
        style={{
          background: `
            radial-gradient(circle at 70% 20%, rgba(244,63,94,0.5) 0%, transparent 35%),
            radial-gradient(circle at 30% 80%, rgba(167,139,250,0.5) 0%, transparent 40%)
          `,
          filter: `blur(${Math.round(45 + intensity * 30)}px)`,
          animation: `sion-orb-float ${duration2} ease-in-out infinite reverse`
        }}
      />
    </div>
  )
}

const RayWaveEffect: React.FC<Omit<MotionConfig, 'preset'>> = ({ intensity, speed, tint }) => {
  const duration = `${Math.max(20 / Math.max(speed, 0.1), 9).toFixed(1)}s`
  const rayColor = tint || '#f59e0b'

  return (
    <div className="absolute inset-[-40%] pointer-events-none mix-blend-screen">
      <div
        style={{
          background: `
            conic-gradient(
              from 0deg at 50% 50%,
              transparent 0deg,
              ${rayColor} 30deg,
              transparent 60deg,
              rgba(239,68,68,0.5) 120deg,
              transparent 150deg,
              rgba(168,85,247,0.5) 210deg,
              transparent 240deg,
              ${rayColor} 300deg,
              transparent 330deg
            )
          `,
          width: '100%',
          height: '100%',
          opacity: Math.min(0.35 + intensity * 0.35, 0.7),
          filter: `blur(${Math.round(30 + intensity * 30)}px)`,
          animation: `sion-ray-rotate ${duration} linear infinite`
        }}
      />
    </div>
  )
}
