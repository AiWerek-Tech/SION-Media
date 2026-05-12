import React from 'react'
import { Monitor, MonitorOff, Tv, Users } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { useModeStore } from '../../store/useModeStore'
import { logger } from '../../utils/logger'

const STATE_CONFIG: Record<string, { label: string; dotClass: string; color: string }> = {
  LIVE: { label: 'LIVE', dotClass: 'live', color: 'var(--color-program)' },
  BLACK: { label: 'BLACK', dotClass: 'black', color: 'var(--color-text-muted)' },
  FREEZE: { label: 'FREEZE', dotClass: 'freeze', color: 'var(--color-warning)' },
  CLEAR: { label: 'CLEAR', dotClass: 'clear', color: 'var(--color-text-muted)' },
  LOGO: { label: 'LOGO', dotClass: 'clear', color: 'var(--color-accent)' }
}

export function TitleBarStatus(): React.JSX.Element {
  const { displayCount, isProjectionVisible, isStageDisplayVisible, isFocusMode } = useAppStore()
  const { currentMode } = useModeStore()
  const { projectionState } = useProjectionStore()
  const config = STATE_CONFIG[projectionState] || STATE_CONFIG.CLEAR
  const hasExternal = displayCount > 1

  const handleToggleProjection = (): void => {
    try {
      if (isProjectionVisible) {
        window.api.projection.hide()
        useAppStore.getState().setProjectionVisible(false)
      } else {
        window.api.projection.show()
        useAppStore.getState().setProjectionVisible(true)
      }
    } catch (err) {
      logger.error('Failed to toggle projection window:', err)
      useAppStore.getState().showToast('Gagal mengubah status proyektor', 'error')
    }
  }

  const handleToggleStage = (): void => {
    try {
      if (isStageDisplayVisible) {
        window.api.stage.hide()
        useAppStore.getState().setStageDisplayVisible(false)
      } else {
        window.api.stage.show()
        useAppStore.getState().setStageDisplayVisible(true)
      }
    } catch (err) {
      logger.error('Failed to toggle stage display window:', err)
      useAppStore.getState().showToast('Gagal mengubah status stage display', 'error')
    }
  }

  return (
    <div className="title-bar-status no-drag">
      {currentMode === 'PROJECTION' ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}
