import { create } from 'zustand'
import type {
  AtmosphereConfig,
  SongBackgroundConfig,
  LiveAtmosphereOverride,
  AtmosphereScenePreset,
  ResolvedAtmosphere
} from '../atmosphere/types'
import {
  DEFAULT_GLOBAL_ATMOSPHERE,
  DEFAULT_SCENE_PRESETS,
  DEFAULT_OVERLAY,
  DEFAULT_READABILITY
} from '../atmosphere/presets'

interface AtmosphereState {
  // Core State
  globalAtmosphere: AtmosphereConfig
  currentSongAtmosphere: SongBackgroundConfig | null
  liveOverride: LiveAtmosphereOverride | null
  scenePresets: AtmosphereScenePreset[]
  favorites: string[] // asset IDs or preset IDs
  recentPresetIds: string[]

  // Hydration
  hydrated: boolean

  // Actions
  setGlobalAtmosphere: (config: AtmosphereConfig) => void
  setCurrentSongAtmosphere: (config: SongBackgroundConfig | null) => void
  applyLiveOverride: (config: AtmosphereConfig, reason?: LiveAtmosphereOverride['reason']) => void
  clearLiveOverride: () => void
  applyScenePreset: (presetId: string) => void
  toggleFavorite: (id: string) => void
  syncProjectionThemePayload: () => void

  // Resolution
  getResolvedAtmosphere: (legacyTheme?: Record<string, string>) => ResolvedAtmosphere

  // Initialization
  hydrateFromSettings: () => Promise<void>
}

export const useAtmosphereStore = create<AtmosphereState>((set, get) => ({
  globalAtmosphere: DEFAULT_GLOBAL_ATMOSPHERE,
  currentSongAtmosphere: null,
  liveOverride: null,
  scenePresets: DEFAULT_SCENE_PRESETS,
  favorites: [],
  recentPresetIds: [],
  hydrated: false,

  setGlobalAtmosphere: (config) => {
    set({ globalAtmosphere: config })
    get().syncProjectionThemePayload()
  },

  setCurrentSongAtmosphere: (config) => set({ currentSongAtmosphere: config }),

  applyLiveOverride: (config, reason = 'operator') => {
    set({
      liveOverride: {
        enabled: true,
        reason,
        config
      }
    })
    get().syncProjectionThemePayload()
  },

  clearLiveOverride: () => {
    set({ liveOverride: null })
    get().syncProjectionThemePayload()
  },

  applyScenePreset: (presetId) => {
    const preset = get().scenePresets.find((p) => p.id === presetId)
    if (preset) {
      get().applyLiveOverride(preset.config, 'scene-preset')

      // Update recent presets
      const recent = [presetId, ...get().recentPresetIds.filter((id) => id !== presetId)].slice(
        0,
        10
      )
      set({ recentPresetIds: recent })
    }
  },

  toggleFavorite: (id) => {
    set((state) => ({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((fid) => fid !== id)
        : [...state.favorites, id]
    }))
  },

  syncProjectionThemePayload: () => {
    const { globalAtmosphere, liveOverride } = get()
    window.api.projection.themeUpdate({
      projection_default_atmosphere: JSON.stringify(globalAtmosphere),
      projection_atmosphere_live_override: liveOverride ? JSON.stringify(liveOverride.config) : ''
    })
  },

  getResolvedAtmosphere: (legacyTheme) => {
    const { globalAtmosphere, currentSongAtmosphere, liveOverride } = get()

    let active: AtmosphereConfig = globalAtmosphere
    let source: ResolvedAtmosphere['source'] = 'global'

    // Hierarchy: Live Override > Song > Global
    if (liveOverride && liveOverride.enabled) {
      active = liveOverride.config
      source = 'live-override'
    } else if (currentSongAtmosphere && currentSongAtmosphere.mode !== 'inherit-global') {
      active = currentSongAtmosphere
      source = 'song'
    } else if (
      legacyTheme &&
      (legacyTheme.projection_bg_color || legacyTheme.projection_bg_image)
    ) {
      // Legacy fallback
      active = {
        mode: legacyTheme.projection_bg_image
          ? legacyTheme.projection_bg_image.match(/\.(mp4|webm)$/i)
            ? 'video'
            : 'image'
          : 'solid',
        solidColor: legacyTheme.projection_bg_color,
        media: legacyTheme.projection_bg_image
          ? {
              path: legacyTheme.projection_bg_image,
              fit: 'cover'
            }
          : undefined,
        overlay: {
          ...DEFAULT_OVERLAY,
          dim: Number(legacyTheme.projection_bg_opacity || 0.48)
        }
      }
      source = 'legacy'
    }

    return {
      source,
      global: globalAtmosphere,
      song: currentSongAtmosphere,
      liveOverride,
      active,
      overlay: active.overlay || DEFAULT_OVERLAY,
      readability: active.readability || DEFAULT_READABILITY
    }
  },

  hydrateFromSettings: async () => {
    try {
      const settings = await window.api.settings.getAll()
      const nextState: Partial<AtmosphereState> = {}

      if (settings.projection_default_atmosphere) {
        nextState.globalAtmosphere = JSON.parse(
          settings.projection_default_atmosphere
        ) as AtmosphereConfig
      }

      if (settings.projection_scene_presets) {
        nextState.scenePresets = JSON.parse(
          settings.projection_scene_presets
        ) as AtmosphereScenePreset[]
      }

      if (settings.projection_atmosphere_live_override) {
        nextState.liveOverride = {
          enabled: true,
          reason: 'operator',
          config: JSON.parse(settings.projection_atmosphere_live_override) as AtmosphereConfig
        }
      }

      if (settings.projection_atmosphere_favorites) {
        nextState.favorites = JSON.parse(settings.projection_atmosphere_favorites) as string[]
      }

      set(nextState)
      set({ hydrated: true })
    } catch (error) {
      console.error('Failed to hydrate atmosphere settings:', error)
    }
  }
}))
