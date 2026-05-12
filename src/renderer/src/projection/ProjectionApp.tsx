import React, { useEffect, useState } from 'react'
import { PresentationCanvas } from '../components/PresentationCanvas'
import type { ProjectionState, SlideData } from '../types'
import { logger } from '../utils/logger'

export function ProjectionApp(): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<SlideData | null>(null)
  const [projectionState, setProjectionState] = useState<ProjectionState>('CLEAR')
  const [theme, setTheme] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      setProjectionState((currentState) => {
        if (currentState !== 'FREEZE') {
          setCurrentSlide(data as SlideData)
        }
        return currentState
      })
    })

    const unsubscribeState = window.api.projection.onStateChange((state) => {
      setProjectionState(state as ProjectionState)
    })

    window.api.settings
      .getAll()
      .then(setTheme)
      .catch((err) => logger.error('Failed to load theme:', err))

    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      setTheme((currentTheme) => ({ ...currentTheme, ...(data as Record<string, string>) }))
    })

    const heartbeatInterval = window.setInterval(() => {
      window.api.health?.sendHeartbeat('PROJECTION_WINDOW')
    }, 1000)

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      unsubscribeTheme()
      window.clearInterval(heartbeatInterval)
    }
  }, [])

  return (
    <div className="projection-output-root">
      <PresentationCanvas
        slide={currentSlide}
        projectionState={projectionState}
        theme={theme}
        animated
        showMetadata
        fit
        className="projection-output-canvas"
      />
    </div>
  )
}
