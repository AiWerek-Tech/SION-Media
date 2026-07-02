/**
 * Effect Boundary Definitions
 *
 * Side effects are isolated from transition computation.
 * The transition runner returns their intentions for the runtime to execute.
 */

import type { SlideData, ProjectionState } from '@renderer/types'

export type ProjectionEffectType =
  | 'projection:state-change'
  | 'projection:slide-update'
  | 'projection:clear'
  | 'projection:go-live'

export interface ProjectionStateChangeEffect {
  readonly type: 'projection:state-change'
  readonly payload: {
    previousState: ProjectionState
    nextState: ProjectionState
  }
}

export interface ProjectionSlideUpdateEffect {
  readonly type: 'projection:slide-update'
  readonly payload: {
    slide: SlideData | null
    slideIndex: number | null
  }
}

export interface ProjectionClearEffect {
  readonly type: 'projection:clear'
}

export interface ProjectionGoLiveEffect {
  readonly type: 'projection:go-live'
  readonly payload: {
    slideIndex: number
    songBackgroundConfig: string
    sessionSlideIndex: number
  }
}

export interface ProjectionThemeUpdateEffect {
  readonly type: 'projection:theme-update'
  readonly payload: {
    transition_duration?: string
    transition_type?: string
    song_background_config?: string
  }
}

export type ProjectionEffect =
  | ProjectionStateChangeEffect
  | ProjectionSlideUpdateEffect
  | ProjectionClearEffect
  | ProjectionGoLiveEffect
  | ProjectionThemeUpdateEffect

export function createProjectionStateChangeEffect(
  previousState: ProjectionState,
  nextState: ProjectionState
): ProjectionStateChangeEffect {
  return {
    type: 'projection:state-change',
    payload: { previousState, nextState }
  }
}

export function createProgramSlideUpdateEffect(
  slide: SlideData | null,
  slideIndex: number | null
): ProjectionSlideUpdateEffect {
  return {
    type: 'projection:slide-update',
    payload: { slide, slideIndex }
  }
}

export function createProjectionClearEffect(): ProjectionClearEffect {
  return {
    type: 'projection:clear'
  }
}

export function createProjectionGoLiveEffect(
  slideIndex: number,
  songBackgroundConfig: string,
  sessionSlideIndex: number
): ProjectionGoLiveEffect {
  return {
    type: 'projection:go-live',
    payload: { slideIndex, songBackgroundConfig, sessionSlideIndex }
  }
}

export function createProjectionThemeUpdateEffect(payload: {
  transition_duration?: string
  transition_type?: string
  song_background_config?: string
}): ProjectionThemeUpdateEffect {
  return {
    type: 'projection:theme-update',
    payload
  }
}

export function executeProjectionEffects(effects: ProjectionEffect[]): void {
  let shouldBroadcastConfidence = false

  effects.forEach((effect) => {
    switch (effect.type) {
      case 'projection:state-change':
        window.api.projection.stateChange(effect.payload.nextState)
        shouldBroadcastConfidence = true
        break
      case 'projection:slide-update':
        if (effect.payload.slide) {
          window.api.projection.slideUpdate(effect.payload.slide)
        }
        shouldBroadcastConfidence = true
        break
      case 'projection:clear':
        // State sync is handled by the projection transition application.
        // IPC is handled by state-change effect when state becomes CLEAR
        shouldBroadcastConfidence = true
        break
      case 'projection:go-live':
        try {
          window.api.projection.themeUpdate({
            song_background_config: effect.payload.songBackgroundConfig || ''
          })
        } catch {
          /* ignore */
        }

        try {
          const { usePlaylistStore } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@renderer/store/usePlaylistStore') as typeof import('@renderer/store/usePlaylistStore')
          const { useAppStore } =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@renderer/store/useAppStore') as typeof import('@renderer/store/useAppStore')
          const activePlaylist = usePlaylistStore.getState().activePlaylist
          const selectedSong = useAppStore.getState().selectedSong
          window.api.system
            .saveSession({
              playlistId: activePlaylist?.id,
              songId: selectedSong?.id,
              slideIndex: effect.payload.sessionSlideIndex,
              projectionState: 'LIVE'
            })
            .catch(() => {})
        } catch {
          /* ignore */
        }
        shouldBroadcastConfidence = true
        break
      case 'projection:theme-update':
        try {
          window.api.projection.themeUpdate(effect.payload)
        } catch {
          /* ignore */
        }
        break
      default:
        // Unknown effects are ignored here to preserve compatibility with future effect extensions.
        break
    }
  })

  // Phase 4: Broadcast confidence payload to stage display after state/slide changes
  if (shouldBroadcastConfidence && window.api.confidence?.update) {
    try {
      const { useProjectionStore } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@renderer/store/useProjectionStore') as typeof import('@renderer/store/useProjectionStore')
      const payload = useProjectionStore.getState().getConfidencePayload()
      window.api.confidence.update(payload)
    } catch {
      /* ignore — confidence broadcast is non-critical */
    }
  }
}
