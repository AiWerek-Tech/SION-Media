# Projection Atmosphere System v1

> **Status:** ✅ IMPLEMENTED — Atmosphere system sudah diimplementasikan (v11/v12). Lihat `04-implementation/25-log-impl-media-library-enterprise-v11.md` dan `26-log-impl-media-library-song-binding-v12.md`

## Objective

Build a professional multi-layer projection atmosphere engine for `SION Media` that supports:

- global service atmosphere
- song-level background override
- live operator override
- cinematic but church-safe rendering
- offline-first media handling
- dual-window projection safety
- readability protection by default

The system is designed to feel closer to a worship production surface than a generic background picker.

## Architectural Model

### Resolution Order

Atmosphere is resolved in this order:

1. `live override`
2. `song background config`
3. `global default atmosphere`
4. `legacy flat projection settings fallback`

This ensures live safety while keeping full backward compatibility with the current theme system.

### Layer Stack

Rendering is composed in this order:

1. base solid / gradient
2. image or video media
3. atmospheric overlay
4. lightweight motion system
5. lyrics / content
6. readability guard

### Runtime Safety Rules

- blackout always wins over atmosphere
- live override never mutates persisted song metadata
- readability guard is applied even when media is bright
- motion defaults to CSS/GPU-friendly layers, not video
- video remains optional enhancement, not the primary engine

## Domain Model

### Main Types

- `AtmosphereConfig`
- `SongBackgroundConfig`
- `LiveAtmosphereOverride`
- `ResolvedAtmosphere`
- `AtmosphereScenePreset`
- `MediaAssetRecord`

### Supported Background Modes

- `inherit-global`
- `solid`
- `gradient`
- `image`
- `motion`
- `video`

### Motion Presets

- `aurora`
- `soft-particles`
- `cinematic-haze`
- `volumetric-light`
- `cloud-drift`
- `animated-gradient`

## Persistence Model

### Settings Table

Add JSON-based keys:

- `projection_default_atmosphere`
- `projection_scene_presets`
- `projection_atmosphere_favorites`

These coexist with legacy keys such as `projection_bg_color` and `projection_bg_image`.

### Songs Table

Add:

- `song_background_config TEXT DEFAULT ''`

This stores JSON for song-specific atmosphere overrides.

### Media Library Tables

Add:

- `media_assets`
- `atmosphere_presets`

These tables support offline-first background asset management, presets, categories, usage tracking, and favorites.

## Renderer Architecture

### Main Renderer

- owns operator state and atmosphere orchestration
- persists global defaults
- applies live overrides
- broadcasts resolved runtime deltas to projection window

### Projection Window

- receives slide payload + merged atmosphere payload
- renders the final resolved atmosphere
- never blocks on synchronous disk/media operations

### Stage Display

- does not require full atmosphere rendering
- can reuse readability-only or simplified background mode later

## UI Hierarchy

### Settings

`Settings -> Projection -> Default Atmosphere`

Controls:

- mode selector
- preset chooser
- gradient designer
- media picker
- overlay opacity
- motion intensity
- readability protection

### Song Management

`Song Editor -> Atmosphere`

Controls:

- inherit global
- mode override
- song-level preset
- optional media path
- readability preview

### Projection Mode

`Live control -> Atmosphere`

Controls:

- quick scene presets
- recent atmospheres
- favorites
- clear override
- blackout
- emergency safe mode

## Zustand Design

### `useAtmosphereStore`

State:

- `globalAtmosphere`
- `scenePresets`
- `liveOverride`
- `favorites`
- `recentPresetIds`
- `hydrated`

Actions:

- `hydrateFromSettings()`
- `setGlobalAtmosphere()`
- `applyLiveOverride()`
- `clearLiveOverride()`
- `applyScenePreset()`
- `rememberPreset()`
- `syncProjectionThemePayload()`

## Performance Plan

- keep atmosphere payload JSON small
- preload image/video via cache engine
- reuse CSS animation layers for motion
- avoid canvas draw loops unless needed
- keep projection rendering declarative and GPU-friendly
- push only changed runtime deltas to projection window

## Extensibility

Future phases can add:

- real media browser CRUD
- thumbnails and usage analytics
- playlist-level atmosphere rules
- timed atmosphere automation
- NDI/video source layers
- WebGL motion renderer
- multi-scene automation per service timeline

## Rollout Plan

### Phase 1

- typed atmosphere model
- global default atmosphere
- song-level JSON support
- live override runtime support
- layered renderer in `PresentationCanvas`

### Phase 2

- media asset library CRUD
- preset management UI
- recent/favorites UX
- song editor atmosphere panel

### Phase 3

- advanced transitions
- preload orchestration
- broadcast-grade video pipeline
- automation and timeline logic
