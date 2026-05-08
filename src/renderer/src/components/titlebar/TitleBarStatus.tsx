import React from 'react'
import { Monitor, MonitorOff, Tv, Users } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'

const STATE_CONFIG: Record<string, { label: string; dotClass: string; color: string }> = {
  LIVE: { label: 'LIVE', dotClass: 'live', color: 'var(--color-program)' },
  BLACK: { label: 'BLACK', dotClass: 'black', color: 'var(--color-text-muted)' },
  FREEZE: { label: 'FREEZE', dotClass: 'freeze', color: 'var(--color-warning)' },
  CLEAR: { label: 'CLEAR', dotClass: 'clear', color: 'var(--color-text-muted)' },
  LOGO: { label: 'LOGO', dotClass: 'clear', color: 'var(--color-accent)' }
}

export function TitleBarStatus(): React.JSX.Element {
  const { displayCount, isProjectionVisible, isStageDisplayVisible, selectedSong, isFocusMode } =
    useAppStore()
  const { projectionState } = useProjectionStore()
  const config = STATE_CONFIG[projectionState] || STATE_CONFIG.CLEAR
  const hasExternal = displayCount > 1

  const handleToggleProjection = (): void => {
    if (isProjectionVisible) {
      window.api.projection.hide()
      useAppStore.getState().setProjectionVisible(false)
    } else {
      window.api.projection.show()
      useAppStore.getState().setProjectionVisible(true)
    }
  }

  const handleToggleStage = (): void => {
    if (isStageDisplayVisible) {
      window.api.stage.hide()
      useAppStore.getState().setStageDisplayVisible(false)
    } else {
      window.api.stage.show()
      useAppStore.getState().setStageDisplayVisible(true)
    }
  }

  return (
    <div className="title-bar-status no-drag">
      {/* Selected Song */}
      {selectedSong && (
        <div className="title-bar-song-info animate-fadeIn">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="title-bar-song-number">
                {selectedSong.hymnal_code || 'LS'} {selectedSong.number}
              </span>
              <span className="title-bar-song-title">{selectedSong.title}</span>
            </div>
            {selectedSong.alternate_title && (
              <span className="text-xs text-text-muted italic leading-tight truncate max-w-[180px]">
                {selectedSong.alternate_title}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Projection toggle */}
      <button
        onClick={handleToggleProjection}
        className={`title-bar-toggle-btn ${isProjectionVisible ? 'active-live' : ''}`}
        title={isProjectionVisible ? 'Hide Projection' : 'Show Projection'}
      >
        {isProjectionVisible ? <Tv size={12} /> : <MonitorOff size={12} />}
        <span>{isProjectionVisible ? 'ON' : 'OFF'}</span>
        {isProjectionVisible && <span className="status-dot live" />}
      </button>

      {/* Stage display toggle */}
      <button
        onClick={handleToggleStage}
        className={`title-bar-toggle-btn ${isStageDisplayVisible ? 'active-stage' : ''}`}
        title="Toggle Stage Display"
      >
        <Users size={12} />
        <span>Stage</span>
        {isStageDisplayVisible && <span className="status-dot preview" />}
      </button>

      {/* State Badge */}
      {isFocusMode && <div className="title-bar-focus-badge">FOCUS</div>}

      {/* State Badge */}
      <div
        className="title-bar-state-badge"
        style={{ '--state-color': config.color } as React.CSSProperties}
      >
        <span className={`status-dot ${config.dotClass}`} />
        <span>{config.label}</span>
      </div>

      {/* Display counter */}
      <div className={`title-bar-display-badge ${hasExternal ? 'connected' : 'disconnected'}`}>
        <Monitor size={10} />
        <span>{hasExternal ? `${displayCount} DISP` : 'PROJECTOR LOST'}</span>
      </div>
    </div>
  )
}
