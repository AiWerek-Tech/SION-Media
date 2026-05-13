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
    </div>
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
