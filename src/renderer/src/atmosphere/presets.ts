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
  name: 'Galaksi Sabat',
  mode: 'gradient',
  gradient: {
    kind: 'aurora',
    animated: true,
    speed: 0.55,
    angle: 145,
    stops: [
      { color: '#020617', position: 0 },
      { color: '#0f172a', position: 28 },
      { color: '#1e1b4b', position: 64 },
      { color: '#312e81', position: 100 }
    ]
  },
  motion: {
    preset: 'cosmic-aurora',
    intensity: 0.65,
    speed: 0.55,
    tint: '#38bdf8'
  },
  overlay: { ...DEFAULT_OVERLAY },
  readability: { ...DEFAULT_READABILITY },
  tags: ['default', 'worship']
}

export const DEFAULT_SCENE_PRESETS: AtmosphereScenePreset[] = [
  {
    id: 'worship',
    name: 'Sabat Penciptaan',
    description: 'Nuansa Sabat yang agung & dinamis dengan gelombang aurora kosmik.',
    config: {
      id: 'scene-worship',
      name: 'Sabat Penciptaan',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.6,
        angle: 135,
        stops: [
          { color: '#020617', position: 0 },
          { color: '#0c4a6e', position: 30 },
          { color: '#1e1b4b', position: 72 },
          { color: '#0284c7', position: 100 }
        ]
      },
      motion: { preset: 'cosmic-aurora', intensity: 0.68, speed: 0.6, tint: '#38bdf8' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.45 },
      readability: { ...DEFAULT_READABILITY }
    }
  },
  {
    id: 'prayer',
    name: 'Doa di Bilik Suci',
    description: 'Nuansa Bilik Maha Kudus dengan kemilau emas Shekinah & stardust mengapung.',
    config: {
      id: 'scene-prayer',
      name: 'Doa di Bilik Suci',
      mode: 'gradient',
      gradient: {
        kind: 'radial',
        angle: 180,
        animated: true,
        stops: [
          { color: '#17120a', position: 0 },
          { color: '#271a0c', position: 45 },
          { color: '#020617', position: 100 }
        ]
      },
      motion: { preset: 'shekinah-light', intensity: 0.58, speed: 0.35, tint: '#fbbf24' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.52, glow: 0.14, textShieldOpacity: 0.28 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.22 }
    }
  },
  {
    id: 'sermon',
    name: 'Firman yang Hidup',
    description: 'Latar netral nan elegan dengan pendaran sinar firman bergerak.',
    config: {
      id: 'scene-sermon',
      name: 'Firman yang Hidup',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 140,
        animated: true,
        speed: 0.3,
        stops: [
          { color: '#090d16', position: 0 },
          { color: '#0f172a', position: 50 },
          { color: '#1e293b', position: 100 }
        ]
      },
      motion: { preset: 'scripture-glow', intensity: 0.45, speed: 0.3, tint: '#cbd5e1' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.55, glow: 0.08, textShieldOpacity: 0.3 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.26 }
    }
  },
  {
    id: 'announcement',
    name: 'Pekabaran Tiga Malaikat',
    description: 'Sinar fajar emas & teal yang energik untuk warta pengumuman.',
    config: {
      id: 'scene-announcement',
      name: 'Pekabaran Tiga Malaikat',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 125,
        animated: true,
        speed: 0.5,
        stops: [
          { color: '#042f2e', position: 0 },
          { color: '#0f766e', position: 50 },
          { color: '#1e1b4b', position: 100 }
        ]
      },
      motion: { preset: 'three-angels', intensity: 0.55, speed: 0.45, tint: '#5eead4' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.42, vignette: 0.18 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.2 }
    }
  },
  {
    id: 'communion',
    name: 'Perjamuan Perjanjian',
    description: 'Nuansa anggur kirmizi & emas perjamuan kudus dengan sinar tembus.',
    config: {
      id: 'scene-communion',
      name: 'Perjamuan Perjanjian',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 155,
        animated: true,
        speed: 0.4,
        stops: [
          { color: '#18070b', position: 0 },
          { color: '#450a0a', position: 40 },
          { color: '#7c2d12', position: 75 },
          { color: '#b45309', position: 100 }
        ]
      },
      motion: { preset: 'volumetric-light', intensity: 0.6, speed: 0.4, tint: '#fbbf24' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.48, glow: 0.15, textShieldOpacity: 0.28 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  },
  {
    id: 'baptism',
    name: 'Baptisan Hidup Baru',
    description: 'Gelombang air samudra cyan & aquamarine bercahaya melingkar.',
    config: {
      id: 'scene-baptism',
      name: 'Baptisan Hidup Baru',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.5,
        angle: 120,
        stops: [
          { color: '#041f31', position: 0 },
          { color: '#0369a1', position: 40 },
          { color: '#0891b2', position: 75 },
          { color: '#22d3ee', position: 100 }
        ]
      },
      motion: { preset: 'ocean-glory', intensity: 0.65, speed: 0.5, tint: '#38bdf8' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.42, vignette: 0.16, textShieldOpacity: 0.22 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.2 }
    }
  },
  {
    id: 'second-advent',
    name: 'Pengharapan Advent',
    description: 'Nuansa kedatangan Raja segala raja: ungu kerajaan & emas kemuliaan.',
    config: {
      id: 'scene-second-advent',
      name: 'Pengharapan Advent',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.55,
        angle: 160,
        stops: [
          { color: '#090514', position: 0 },
          { color: '#3b0764', position: 38 },
          { color: '#b45309', position: 75 },
          { color: '#fbbf24', position: 100 }
        ]
      },
      motion: { preset: 'glorious-beams', intensity: 0.65, speed: 0.55, tint: '#fde047' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.45, glow: 0.2, textShieldOpacity: 0.26 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  },
  {
    id: 'pentecost',
    name: 'Api Roh Kudus',
    description: 'Nuansa kebangunan & dorongan misi: api magenta, amber & kirmizi.',
    config: {
      id: 'scene-pentecost',
      name: 'Api Roh Kudus',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.6,
        angle: 130,
        stops: [
          { color: '#18020c', position: 0 },
          { color: '#881337', position: 35 },
          { color: '#c2410c', position: 70 },
          { color: '#f59e0b', position: 100 }
        ]
      },
      motion: { preset: 'pentecost-fire', intensity: 0.72, speed: 0.6, tint: '#f97316' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.44, glow: 0.18, textShieldOpacity: 0.26 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.24 }
    }
  },
  {
    id: 'stage-haze',
    name: 'Asap Panggung Megah',
    description: 'Efek asap panggung (stage fog/haze) volumetrik bergerak profesional.',
    config: {
      id: 'scene-stage-haze',
      name: 'Asap Panggung Megah',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.5,
        angle: 140,
        stops: [
          { color: '#020617', position: 0 },
          { color: '#0f172a', position: 35 },
          { color: '#1e3a8a', position: 70 },
          { color: '#38bdf8', position: 100 }
        ]
      },
      motion: { preset: 'stage-smoke', intensity: 0.7, speed: 0.5, tint: '#38bdf8' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.42, glow: 0.16, textShieldOpacity: 0.24 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.22 }
    }
  },
  {
    id: 'laser-lines',
    name: 'Garis Cahaya Modern',
    description: 'Sinar garis cahaya laser & grid neon perspektif bergerak modern.',
    config: {
      id: 'scene-laser-lines',
      name: 'Garis Cahaya Modern',
      mode: 'gradient',
      gradient: {
        kind: 'linear',
        angle: 135,
        animated: true,
        speed: 0.55,
        stops: [
          { color: '#090d16', position: 0 },
          { color: '#042f2e', position: 40 },
          { color: '#0f766e', position: 75 },
          { color: '#06b6d4', position: 100 }
        ]
      },
      motion: { preset: 'laser-lines', intensity: 0.65, speed: 0.55, tint: '#22d3ee' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.4, glow: 0.14, textShieldOpacity: 0.22 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.2 }
    }
  },
  {
    id: 'cosmic-orbs',
    name: 'Bokeh & Orba Cahaya',
    description: 'Orba cahaya melayang & partikel bokeh lembut yang megah.',
    config: {
      id: 'scene-cosmic-orbs',
      name: 'Bokeh & Orba Cahaya',
      mode: 'gradient',
      gradient: {
        kind: 'aurora',
        animated: true,
        speed: 0.5,
        angle: 150,
        stops: [
          { color: '#0c0a09', position: 0 },
          { color: '#292524', position: 35 },
          { color: '#44403c', position: 70 },
          { color: '#a855f7', position: 100 }
        ]
      },
      motion: { preset: 'cosmic-orbs', intensity: 0.68, speed: 0.5, tint: '#c084fc' },
      overlay: { ...DEFAULT_OVERLAY, dim: 0.42, glow: 0.16, textShieldOpacity: 0.24 },
      readability: { ...DEFAULT_READABILITY, contrastBoost: 0.22 }
    }
  }
]
