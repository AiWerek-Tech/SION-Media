import React, { useEffect, useState } from 'react'
import { PresentationCanvas } from '@renderer/components/PresentationCanvas'
import { EmergencyOverlay } from '@renderer/components/EmergencyOverlay'
import type { ProjectionState, SlideData } from '@renderer/types'
import { logger } from '@renderer/utils/logger'

export function ProjectionApp(): React.JSX.Element {
  const [currentSlide, setCurrentSlide] = useState<SlideData | null>(null)
  const [projectionState, setProjectionState] = useState<ProjectionState>('CLEAR')
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [emergencyConfig, setEmergencyConfig] = useState<{
    active: boolean
    message?: string
    subMessage?: string
  }>({ active: false })

  // FIX RACE-01: buffer slide updates that arrive while FROZEN so they are
  // applied the moment the state transitions back to LIVE.
  const pendingSlideRef = React.useRef<SlideData | null>(null)

  useEffect(() => {
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      setProjectionState((currentState) => {
        if (currentState === 'FREEZE') {
          // Buffer the incoming slide — apply when unfrozen
          pendingSlideRef.current = data as SlideData
        } else {
          setCurrentSlide(data as SlideData)
          pendingSlideRef.current = null
        }
        return currentState
      })
    })

    const unsubscribeState = window.api.projection.onStateChange((state) => {
      const newState = state as ProjectionState
      setProjectionState(newState)
      // FIX RACE-01: if transitioning out of FREEZE and there's a buffered slide, apply it now
      if (newState !== 'FREEZE' && pendingSlideRef.current) {
        setCurrentSlide(pendingSlideRef.current)
        pendingSlideRef.current = null
      }
    })

    window.api.settings
      .getAll()
      .then(setTheme)
      .catch((err) => logger.error('Failed to load theme:', err))

    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      setTheme((currentTheme) => ({ ...currentTheme, ...(data as Record<string, string>) }))
    })

    const unsubscribeEmergency = window.api.projection.onEmergencyUpdate?.((payload) => {
      setEmergencyConfig(payload)
    })

    // Phase 4: Heartbeat interval reduced from 1000ms to 500ms for faster health detection
    const heartbeatInterval = window.setInterval(() => {
      window.api.health?.sendHeartbeat('PROJECTION_WINDOW')
    }, 500)

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      unsubscribeTheme()
      unsubscribeEmergency?.()
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
      <EmergencyOverlay
        active={emergencyConfig.active}
        message={emergencyConfig.message}
        subMessage={emergencyConfig.subMessage}
      />
    </div>
  )
}
