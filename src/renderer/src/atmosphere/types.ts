export type AtmosphereMode = 'inherit-global' | 'solid' | 'gradient' | 'image' | 'motion' | 'video'

export type GradientKind = 'linear' | 'radial' | 'aurora'

export interface GradientStop {
  color: string
  position: number
}

export interface GradientConfig {
  kind: GradientKind
  angle?: number
  animated?: boolean
  speed?: number
  stops: GradientStop[]
}

export type MotionPreset =
  | 'aurora'
  | 'soft-particles'
  | 'cinematic-haze'
  | 'volumetric-light'
  | 'cloud-drift'
  | 'animated-gradient'
  | 'sabbath-dawn'
  | 'three-angels'
  | 'sanctuary-light'
  | 'living-water'
  | 'second-advent'
  | 'scripture-glow'
  | 'cosmic-aurora'
  | 'pentecost-fire'
  | 'ocean-glory'
  | 'shekinah-light'
  | 'glorious-beams'
  | 'stage-smoke'
  | 'laser-lines'
  | 'cyber-grid'
  | 'cosmic-orbs'
  | 'ray-wave'

export interface MotionConfig {
  preset: MotionPreset
  intensity: number
  speed: number
  tint?: string
}

export interface OverlayConfig {
  dim: number
  blur: number
  vignette: number
  glow: number
  textShieldOpacity: number
}

export interface ReadabilityConfig {
  smartDimming: boolean
  contrastBoost: number
  blurBehindLyrics: boolean
  lyricSafeMode: boolean
}

export interface AtmosphereMediaConfig {
  assetId?: string
  path?: string
  fit?: 'cover' | 'contain'
  loop?: boolean
  muted?: boolean
}

export interface AtmosphereConfig {
  id?: string
  name?: string
  mode: AtmosphereMode
  solidColor?: string
  gradient?: GradientConfig
  media?: AtmosphereMediaConfig
  motion?: MotionConfig
  overlay?: OverlayConfig
  readability?: ReadabilityConfig
  tags?: string[]
}

export type SongBackgroundConfig = AtmosphereConfig

export interface LiveAtmosphereOverride {
  enabled: boolean
  reason?: 'operator' | 'scene-preset' | 'emergency' | 'sermon-mode' | 'prayer-mode'
  config: AtmosphereConfig
}

export interface ResolvedAtmosphere {
  source: 'global' | 'song' | 'live-override' | 'legacy'
  global: AtmosphereConfig
  song: SongBackgroundConfig | null
  liveOverride: LiveAtmosphereOverride | null
  active: AtmosphereConfig
  overlay: OverlayConfig
  readability: ReadabilityConfig
}

export type MediaAssetType = 'image' | 'motion' | 'video' | 'pdf'

export interface MediaAssetRecord {
  id: string
  type: MediaAssetType
  name: string
  originalPath: string
  localPath: string
  thumbnailPath?: string
  category?: string
  tags?: string[]
  isFavorite?: boolean
  usageCount?: number
  collectionIds?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface MediaCollectionRecord {
  id: string
  name: string
  description?: string
  coverAssetId?: string
  coverThumbnailPath?: string
  assetCount: number
  assetIds: string[]
  createdAt?: string
  updatedAt?: string
}

export interface AtmosphereScenePreset {
  id: string
  name: string
  description: string
  icon?: string
  config: AtmosphereConfig
}

export interface AtmosphereThemePack {
  schema: 'sion.atmosphere.theme-pack.v1'
  name: string
  version?: string
  author?: string
  presets: AtmosphereScenePreset[]
}
