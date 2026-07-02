import { create } from 'zustand'
import type {
  AtmosphereConfig,
  SongBackgroundConfig,
  LiveAtmosphereOverride,
  AtmosphereScenePreset,
  ResolvedAtmosphere
} from '@renderer/atmosphere/types'
import {
  DEFAULT_GLOBAL_ATMOSPHERE,
  DEFAULT_SCENE_PRESETS,
  DEFAULT_OVERLAY,
  DEFAULT_READABILITY
} from '@renderer/atmosphere/presets'

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

// Module-level debounce timer for theme IPC sync
let _themeSyncTimer: ReturnType<typeof setTimeout> | null = null

function mergeScenePresets(
  defaults: AtmosphereScenePreset[],
  custom: AtmosphereScenePreset[]
): AtmosphereScenePreset[] {
  const byId = new Map<string, AtmosphereScenePreset>()
  defaults.forEach((preset) => byId.set(preset.id, preset))
  custom.forEach((preset) => byId.set(preset.id, preset))
  return Array.from(byId.values())
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
    // FIX ARCH-05: persist to settings so the change survives a restart
    window.api.settings
      .update('projection_default_atmosphere', JSON.stringify(config))
      .catch((err) => console.error('[AtmosphereStore] Failed to persist globalAtmosphere:', err))
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
    // Debounce theme IPC updates (300ms) to prevent excessive cross-window communication
    if (_themeSyncTimer) clearTimeout(_themeSyncTimer)
    _themeSyncTimer = setTimeout(() => {
      const { globalAtmosphere, liveOverride } = get()
      window.api.projection.themeUpdate({
        projection_default_atmosphere: JSON.stringify(globalAtmosphere),
        projection_atmosphere_live_override: liveOverride ? JSON.stringify(liveOverride.config) : ''
      })
    }, 300)
  },

  getResolvedAtmosphere: (legacyTheme) => {
    const { globalAtmosphere, currentSongAtmosphere, liveOverride } = get()

    let active: AtmosphereConfig = globalAtmosphere
    let source: ResolvedAtmosphere['source'] = 'global'

    // Try parsing from theme object first (for projection window context)
    const parseTheme = (key: string): AtmosphereConfig | null => {
      if (!legacyTheme || !legacyTheme[key]) return null
      try {
        return JSON.parse(legacyTheme[key]) as AtmosphereConfig
      } catch {
        return null
      }
    }

    const themeLive = parseTheme('projection_atmosphere_live_override')
    const themeSong = parseTheme('song_background_config')
    const themeGlobal = parseTheme('projection_default_atmosphere')

    // Hierarchy: Live Override > Song > Global
    if (themeLive) {
      active = themeLive
      source = 'live-override'
    } else if (liveOverride && liveOverride.enabled) {
      active = liveOverride.config
      source = 'live-override'
    } else if (themeSong && themeSong.mode !== 'inherit-global') {
      active = themeSong
      source = 'song'
    } else if (currentSongAtmosphere && currentSongAtmosphere.mode !== 'inherit-global') {
      active = currentSongAtmosphere
      source = 'song'
    } else if (themeGlobal) {
      active = themeGlobal
      source = 'global'
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
        const customPresets = JSON.parse(
          settings.projection_scene_presets
        ) as AtmosphereScenePreset[]
        nextState.scenePresets = mergeScenePresets(DEFAULT_SCENE_PRESETS, customPresets)
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
