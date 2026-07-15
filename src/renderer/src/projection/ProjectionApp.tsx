import React, { useEffect, useState } from 'react'
import { LiveProjectionCanvas } from '@renderer/components/LiveProjectionCanvas'
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

  const [mediaVolume, setMediaVolume] = useState(() => {
    const saved = localStorage.getItem('sion_media_volume')
    return saved ? Number(saved) / 100 : 1.0
  })
  const [mediaMuted, setMediaMuted] = useState(() => {
    const saved = localStorage.getItem('sion_media_muted')
    return saved === 'true'
  })

  // Instrument audio state and refs
  const [instrumentUrl, setInstrumentUrl] = useState<string>('')
  const [instrumentVolume, setInstrumentVolume] = useState(() => {
    const saved = localStorage.getItem('sion_instrument_volume')
    return saved ? Number(saved) / 100 : 0.7
  })
  const [instrumentMuted, setInstrumentMuted] = useState(() => {
    const saved = localStorage.getItem('sion_instrument_muted')
    return saved === 'true'
  })

  const instrumentAudioRef = React.useRef<HTMLAudioElement | null>(null)

  // FIX RACE-01: buffer slide updates that arrive while FROZEN so they are
  // applied the moment the state transitions back to LIVE.
  const pendingSlideRef = React.useRef<SlideData | null>(null)

  useEffect(() => {
    if (instrumentAudioRef.current) {
      instrumentAudioRef.current.volume = instrumentVolume
      instrumentAudioRef.current.muted = instrumentMuted
    }
  }, [instrumentVolume, instrumentMuted, instrumentUrl])

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

    const unsubscribeVideoControl = window.api.projection.onVideoControl((command, value) => {
      const video = document.querySelector('video')

      switch (command) {
        case 'play':
          if (video) video.play().catch((err) => console.error('[ProjectionApp] Play failed:', err))
          break
        case 'pause':
          if (video) video.pause()
          break
        case 'stop':
          if (video) {
            video.pause()
            video.currentTime = 0
          }
          break
        case 'seek':
          if (video && typeof value === 'number') {
            video.currentTime = value
          }
          break
        case 'volume':
          if (typeof value === 'number') {
            setMediaVolume(value)
            if (video) video.volume = value
          }
          break
        case 'mute':
          if (typeof value === 'boolean') {
            setMediaMuted(value)
            if (video) video.muted = value
          }
          break
        default:
          break
      }
    })

    const unsubscribeInstrumentControl = window.api.projection.onInstrumentControl(
      (command, value) => {
        const audio = instrumentAudioRef.current
        switch (command) {
          case 'load':
            if (typeof value === 'string') {
              const normalizedUrl = value ? `local-media:///${value.replace(/\\/g, '/')}` : ''
              setInstrumentUrl(normalizedUrl)
            }
            break
          case 'play':
            if (audio) {
              audio
                .play()
                .catch((err) => console.error('[ProjectionApp] Instrument play failed:', err))
            }
            break
          case 'pause':
            if (audio) audio.pause()
            break
          case 'stop':
            if (audio) {
              audio.pause()
              audio.currentTime = 0
            }
            break
          case 'seek':
            if (audio && typeof value === 'number') {
              audio.currentTime = value
            }
            break
          case 'volume':
            if (typeof value === 'number') {
              setInstrumentVolume(value)
            }
            break
          case 'mute':
            if (typeof value === 'boolean') {
              setInstrumentMuted(value)
            }
            break
          default:
            break
        }
      }
    )

    // Phase 4: Heartbeat interval reduced from 1000ms to 500ms for faster health detection
    const heartbeatInterval = window.setInterval(() => {
      window.api.health?.sendHeartbeat('PROJECTION_WINDOW')
    }, 500)

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      unsubscribeTheme()
      unsubscribeEmergency?.()
      unsubscribeVideoControl()
      unsubscribeInstrumentControl()
      window.clearInterval(heartbeatInterval)
    }
  }, [])

  const lyricsFontSizePercent = theme.ui_lyrics_font_size
    ? Math.max(50, Math.min(300, Number(theme.ui_lyrics_font_size)))
    : 100

  const handleInstrumentTimeUpdate = (): void => {
    const audio = instrumentAudioRef.current
    if (audio) {
      window.api.projection.instrumentTimeUpdate(audio.currentTime, audio.duration || 0)
    }
  }

  const handleInstrumentLoadedMetadata = (): void => {
    const audio = instrumentAudioRef.current
    if (audio) {
      window.api.projection.instrumentTimeUpdate(audio.currentTime, audio.duration || 0)
    }
  }

  return (
    <div className="projection-output-root">
      <LiveProjectionCanvas
        slide={currentSlide}
        projectionState={projectionState}
        theme={theme}
        animated
        showMetadata
        fit
        fitMode="cover"
        lyricsFontSizePercent={lyricsFontSizePercent}
        className="projection-output-canvas"
        muted={mediaMuted}
        volume={mediaVolume}
      />
      <EmergencyOverlay
        active={emergencyConfig.active}
        message={emergencyConfig.message}
        subMessage={emergencyConfig.subMessage}
      />
      {instrumentUrl && (
        <audio
          ref={instrumentAudioRef}
          src={instrumentUrl}
          onTimeUpdate={handleInstrumentTimeUpdate}
          onLoadedMetadata={handleInstrumentLoadedMetadata}
          onEnded={() => {
            if (instrumentAudioRef.current) {
              instrumentAudioRef.current.currentTime = 0
              window.api.projection.instrumentTimeUpdate(
                0,
                instrumentAudioRef.current.duration || 0
              )
            }
          }}
        />
      )}
    </div>
  )
}
