import type { AtmosphereConfig, AtmosphereScenePreset } from './types'

export const DEFAULT_OVERLAY = {
  dim: 0.56,
  blur: 0,
  vignette: 0.24,
  glow: 0.12,
  textShieldOpacity: 0.22
} as const

export const DEFAULT_READABILITY = {
  smartDimming: true,
  contrastBoost: 0.18,
  blurBehindLyrics: true,
  lyricSafeMode: true
} as const

export const DEFAULT_GLOBAL_ATMOSPHERE: AtmosphereConfig = {
  id: 'global-default',
  name: 'Sabat Teduh',
  mode: 'gradient',
  gradient: {
    kind: 'aurora',
    animated: true,
    speed: 0.45,
    angle: 145,
    stops: [
      { color: '#020617', position: 0 },
      { color: '#0b1120', position: 28 },
      { color: '#13233f', position: 64 },
      { color: '#1d4ed8', position: 100 }
    ]
  },
  motion: {
    preset: 'cinematic-haze',
    intensity: 0.34,
    speed: 0.45,
    tint: '#60a5fa'
  },
  overlay: { ...DEFAULT_OVERLAY },
  readability: { ...DEFAULT_READABILITY },
  tags: ['default', 'worship']
}

export const DEFAULT_SCENE_PRESETS: AtmosphereScenePreset[] = [
  {
    id: 'worship',
    name: 'Sabat Penciptaan',
    description: 'Nuansa Sabat yang tenang untuk pujian jemaat dan penyembahan.',
    config: {
      id: 'scene-worship',
      name: 'Sabat Penciptaan',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.42,
        angle: 135,
        stops: [
          { color: '#020617', position: 0 },
          { color: '#0f172a', position: 30 },
          { color: '#1e3a8a', position: 72 },
          { color: '#0ea5e9', position: 100 }
        ]
      },
      motion: { preset: 'sabbath-dawn', intensity: 0.42, speed: 0.48, tint: '#38bdf8' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.58 },
      readability: { ...DEFAULT_READABILITY }
    }
  },
  {
    id: 'prayer',
    name: 'Doa di Bilik Suci',
    description: 'Latar rendah distraksi untuk doa, komitmen, dan momen teduh.',
    config: {
      id: 'scene-prayer',
      name: 'Doa di Bilik Suci',
      mode: 'gradient',
      gradient: {
        kind: 'radial',
        angle: 180,
        animated: false,
        stops: [
          { color: '#111827', position: 0 },
          { color: '#0f172a', position: 52 },
          { color: '#020617', position: 100 }
        ]
      },
      motion: { preset: 'sanctuary-light', intensity: 0.18, speed: 0.28, tint: '#94a3b8' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.66, glow: 0.06, textShieldOpacity: 0.3 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  },
  {
    id: 'sermon',
    name: 'Firman yang Hidup',
    description: 'Background netral untuk khotbah dan pembacaan Firman yang jelas.',
    config: {
      id: 'scene-sermon',
      name: 'Firman yang Hidup',
      mode: 'solid',
      solidColor: '#0f172a',
      motion: { preset: 'scripture-glow', intensity: 0.12, speed: 0.18, tint: '#cbd5e1' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.62, glow: 0.04, textShieldOpacity: 0.34 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.28 }
    }
  },
  {
    id: 'announcement',
    name: 'Pekabaran Tiga Malaikat',
    description: 'Tampilan informatif untuk warta, pengumuman, dan panggilan pelayanan.',
    config: {
      id: 'scene-announcement',
      name: 'Pekabaran Tiga Malaikat',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 125,
        animated: false,
        stops: [
          { color: '#111827', position: 0 },
          { color: '#1e293b', position: 60 },
          { color: '#0f766e', position: 100 }
        ]
      },
      motion: { preset: 'three-angels', intensity: 0.14, speed: 0.22, tint: '#5eead4' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.52, vignette: 0.18 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.2 }
    }
  },
  {
    id: 'communion',
    name: 'Perjamuan Perjanjian',
    description: 'Nuansa hangat dan hormat untuk perjamuan kudus dan refleksi.',
    config: {
      id: 'scene-communion',
      name: 'Perjamuan Perjanjian',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 155,
        animated: true,
        speed: 0.18,
        stops: [
          { color: '#120b0b', position: 0 },
          { color: '#2b1c1c', position: 38 },
          { color: '#6b4226', position: 72 },
          { color: '#d4a373', position: 100 }
        ]
      },
      motion: { preset: 'volumetric-light', intensity: 0.16, speed: 0.2, tint: '#fbbf24' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.6, glow: 0.08, textShieldOpacity: 0.32 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  },
  {
    id: 'baptism',
    name: 'Baptisan Hidup Baru',
    description: 'Gerak air yang lembut untuk baptisan dan respons iman.',
    config: {
      id: 'scene-baptism',
      name: 'Baptisan Hidup Baru',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.3,
        angle: 120,
        stops: [
          { color: '#031525', position: 0 },
          { color: '#0f3d56', position: 34 },
          { color: '#0ea5e9', position: 70 },
          { color: '#67e8f9', position: 100 }
        ]
      },
      motion: { preset: 'living-water', intensity: 0.2, speed: 0.24, tint: '#7dd3fc' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.5, vignette: 0.16, textShieldOpacity: 0.24 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.2 }
    }
  },
  {
    id: 'second-advent',
    name: 'Pengharapan Advent',
    description: 'Cahaya bergerak yang agung untuk panggilan, penutupan, dan pengharapan.',
    config: {
      id: 'scene-second-advent',
      name: 'Pengharapan Advent',
      mode: 'motion',
      solidColor: '#050816',
      gradient: {
        kind: 'linear',
        angle: 160,
        animated: true,
        speed: 0.22,
        stops: [
          { color: '#050816', position: 0 },
          { color: '#172554', position: 44 },
          { color: '#b45309', position: 78 },
          { color: '#fef3c7', position: 100 }
        ]
      },
      motion: { preset: 'second-advent', intensity: 0.2, speed: 0.22, tint: '#fde68a' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.57, glow: 0.16, textShieldOpacity: 0.3 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  }
]
