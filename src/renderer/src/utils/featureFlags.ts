/**
 * Feature Flag System
 *
 * Controls the activation of new features during the enterprise refactor.
 * Flags are compile-time constants — changing them requires app rebuild.
 *
 * Convention:
 *   true  = feature active (deployed + enabled)
 *   false = feature deployed but inactive (behind flag)
 *
 * @see implementation-master-order-v1.md §5.2
 */

export const FEATURE_FLAGS = {
  // ═══════════════════════════════════════════════════════════════
  // Phase 1 — Infrastructure (enabled when Phase 1 complete)
  // ═══════════════════════════════════════════════════════════════
  MODAL_SYSTEM: true, // useModalStore + ModalRegistry
  SERVICE_STORE: true, // useServiceStore (timer persistence)
  NOTIFICATION_STORE: true, // useNotificationStore

  // ═══════════════════════════════════════════════════════════════
  // Phase 4 — Projection Hardening
  // ═══════════════════════════════════════════════════════════════
  NEXT_SONG_PRELOAD: true, // auto-preload next song in playlist
  CONFIDENCE_BROADCAST: true, // confidence:update IPC channel
  MEDIA_ENGINE_LRU: true, // LRU cache eviction in mediaEngine

  // ═══════════════════════════════════════════════════════════════
  // Phase 6-8 — UI Features
  // ═══════════════════════════════════════════════════════════════
  LIBRARY_CONTEXT_MENU: false, // right-click context menu in Library
  LIBRARY_DRAG_DROP: false, // drag song to playlist
  PROJECTION_BIBLE_PANEL: false, // Bible tab in Projection Mode
  PROJECTION_ANNOUNCE_PANEL: false, // Announcement tab in Projection Mode

  // ═══════════════════════════════════════════════════════════════
  // Phase 9 — Store Decomposition
  // ═══════════════════════════════════════════════════════════════
  SONG_STORE_DECOMPOSED: false, // useSongStore replaces useAppStore songs
  HYMNAL_STORE_DECOMPOSED: false, // useHymnalStore replaces useAppStore hymnals

  // ═══════════════════════════════════════════════════════════════
  // Experimental
  // ═══════════════════════════════════════════════════════════════
  OVERLAY_ENGINE: false, // ProjectionPayload system
  SAFE_MODE_STARTUP: true // crash-count based safe mode
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Check if a feature flag is enabled.
 * Designed for tree-shaking: when a flag is `false`,
 * the guarded code block can be eliminated by the bundler.
 */
export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}

/**
 * Projection-specific runtime flags.
 * These NEVER change during a live service — read once at startup.
 * Changing requires app restart.
 */
export const PROJECTION_FLAGS = {
  DISABLE_ATMOSPHERE_TRANSITIONS: false, // for low-end hardware
  FORCE_FAST_CUT: false, // emergency: all transitions = cut
  DISABLE_MOTION_BACKGROUNDS: false, // for LED walls
  SAFE_FONT_ONLY: false // use system font only (fallback)
} as const
