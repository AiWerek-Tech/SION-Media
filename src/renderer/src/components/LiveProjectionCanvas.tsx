import React from 'react'
import type { ProjectionState, SlideData } from '@renderer/types'
import { PresentationCanvas } from './PresentationCanvas'

interface LiveProjectionCanvasProps {
  slide: SlideData | null
  projectionState: ProjectionState
  theme: Record<string, string>
  animated?: boolean
  showMetadata?: boolean
  fit?: boolean
  className?: string
  lyricsFontSizePercent?: number
}

/**
 * Canonical renderer for every LIVE surface. Keeping these behavioral props
 * here prevents the operator monitor and physical projection window from
 * drifting in logo, transition mode, or transition timing.
 */
export function LiveProjectionCanvas({
  slide,
  projectionState,
  theme,
  animated = true,
  showMetadata = true,
  fit = false,
  className,
  lyricsFontSizePercent = 100
}: LiveProjectionCanvasProps): React.JSX.Element {
  return (
    <PresentationCanvas
      slide={slide}
      projectionState={projectionState}
      theme={theme}
      animated={animated}
      showMetadata={showMetadata}
      showIdleWatermark
      fit={fit}
      lyricsFontSizePercent={lyricsFontSizePercent}
      transitionMode="wait"
      className={className}
    />
  )
}
