import React from 'react'
import {
  Activity,
  BookOpen,
  Database,
  Edit3,
  Monitor,
  MonitorOff,
  Music2,
  Radio,
  Settings,
  Tv,
  Users
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { useModeStore } from '../../store/useModeStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { logger } from '../../utils/logger'

// eslint-disable-next-line react-refresh/only-export-components
export const STATE_CONFIG: Record<string, { label: string; dotClass: string; color: string }> = {
  LIVE: { label: 'LIVE', dotClass: 'live', color: 'var(--color-program)' },
  BLACK: { label: 'BLACK', dotClass: 'black', color: 'var(--color-text-muted)' },
  FREEZE: { label: 'FREEZE', dotClass: 'freeze', color: 'var(--color-warning)' },
  CLEAR: { label: 'CLEAR', dotClass: 'clear', color: 'var(--color-text-muted)' },
  LOGO: { label: 'LOGO', dotClass: 'clear', color: 'var(--color-accent)' }
}

/** Format seconds as MM:SS or H:MM:SS */
function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Compact timer in title bar: shows MM:SS, click to start/stop */
export function TitleBarTimer(): React.JSX.Element {
  const timerElapsed = useProjectionStore((s) => s.timerElapsed)
  const timerRunning = useProjectionStore((s) => s.timerRunning)
  const timerStart = useProjectionStore((s) => s.timerStart)
  const timerStop = useProjectionStore((s) => s.timerStop)
  const timerReset = useProjectionStore((s) => s.timerReset)

  return (
    <div className="titlebar-timer no-drag">
      {/* Clickable timer display: click to toggle start/stop */}
      <button
        className={`titlebar-timer__display ${timerRunning ? 'is-running' : ''}`}
        onClick={timerRunning ? timerStop : timerStart}
        title={timerRunning ? 'Klik untuk stop timer' : 'Klik untuk start timer'}
      >
        {timerRunning && <span className="titlebar-timer__dot" />}
        <span className="titlebar-timer__value">{formatTimer(timerElapsed)}</span>
      </button>
      {/* Reset: only show when there's elapsed time */}
      {timerElapsed > 0 && (
        <button
          className="titlebar-timer__reset"
          onClick={timerReset}
          title="Reset timer"
          aria-label="Reset timer"
        >
          R
        </button>
      )}
    </div>
  )
}

export function TitleBarStatus(): React.JSX.Element {
  const {
    currentScreen,
    displayCount,
    hymnals,
    isProjectionVisible,
    isStageDisplayVisible,
    isFocusMode,
    selectedHymnalId,
    selectedSong,
    setScreen,
    songs,
    activeLibraryWorkspace
  } = useAppStore()
  const { currentMode } = useModeStore()
  const { activePlaylist, playlistItems } = usePlaylistStore()
  const hasExternal = displayCount > 1
  const selectedHymnal = hymnals.find((hymnal) => hymnal.id === selectedHymnalId)

  const handleToggleProjection = async (): Promise<void> => {
    try {
      if (isProjectionVisible) {
        window.api.projection.hide()
        useAppStore.getState().setProjectionVisible(false)
      } else {
        const hasExt = await window.api.display.hasExternal()
        if (!hasExt) {
          useAppStore
            .getState()
            .showToast(
              'Layar output eksternal tidak terdeteksi. Lirik sudah tampil di monitor LIVE di dashboard.',
              'info'
            )
          return
        }
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

  if (currentScreen === 'settings') {
    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--focus" title="Pengaturan aplikasi">
          <Settings size={10} />
          Settings
        </div>
        <div className="titlebar-badge">
          <Database size={10} />
          <span>{hymnals.length} Buku</span>
        </div>
      </div>
    )
  }

  if (currentScreen === 'song-editor') {
    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--focus" title="Editor lagu">
          <Edit3 size={10} />
          Song Editor
        </div>
        <div className="titlebar-badge">
          <BookOpen size={10} />
          <span>{selectedHymnal?.code?.toUpperCase() || 'Buku'}</span>
        </div>
      </div>
    )
  }

  if (currentScreen === 'import-export') {
    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--focus" title="Import dan export data">
          <Database size={10} />
          Import / Export
        </div>
        <div className="titlebar-badge">
          <Music2 size={10} />
          <span>{songs.length} Lagu</span>
        </div>
      </div>
    )
  }

  if (currentScreen === 'bible') {
    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--focus" title="Alkitab">
          <BookOpen size={10} />
          Bible
        </div>
      </div>
    )
  }

  if (currentMode === 'LIBRARY') {
    if (activeLibraryWorkspace === 'bible') {
      return (
        <div className="title-bar-status no-drag">
          <div className="titlebar-badge titlebar-badge--connected" title="Alkitab Aktif">
            <BookOpen size={10} />
            <span>Alkitab</span>
          </div>
        </div>
      )
    }

    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--connected" title="Database library aktif">
          <Database size={10} />
          <span>{songs.length} Lagu</span>
        </div>
        <div className="titlebar-badge">
          <BookOpen size={10} />
          <span>{hymnals.length} Buku</span>
        </div>
        {selectedSong && (
          <div className="title-bar-song-info" title={selectedSong.title}>
            <span className="title-bar-song-number">{selectedSong.number}</span>
            <span className="title-bar-song-title">{selectedSong.title}</span>
          </div>
        )}
      </div>
    )
  }

  if (currentMode === 'MANAGEMENT') {
    return (
      <div className="title-bar-status no-drag">
        <button
          type="button"
          className="titlebar-stage-btn"
          onClick={() => setScreen('song-editor')}
          title="Tambah atau edit lagu"
        >
          <Edit3 size={12} />
          <span>Song Editor</span>
        </button>
        <div className="titlebar-badge titlebar-badge--connected">
          <Database size={10} />
          <span>{songs.length} Lagu</span>
        </div>
        <div className="titlebar-badge">
          <BookOpen size={10} />
          <span>{selectedHymnal?.code?.toUpperCase() || `${hymnals.length} Buku`}</span>
        </div>
      </div>
    )
  }

  if (currentMode === 'BROADCAST') {
    return (
      <div className="title-bar-status no-drag">
        <div className="titlebar-badge titlebar-badge--focus" title="Broadcast workspace">
          <Radio size={10} />
          Broadcast
        </div>
        <div
          className={`titlebar-badge ${hasExternal ? 'titlebar-badge--connected' : 'titlebar-badge--lost'}`}
        >
          <Monitor size={10} />
          <span>{hasExternal ? `${displayCount} Display` : 'No Output'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="title-bar-status no-drag">
      {/* Projection output toggle */}
      <button
        onClick={handleToggleProjection}
        className={`titlebar-output-btn ${isProjectionVisible ? 'is-live' : 'is-off'}`}
        title={
          isProjectionVisible
            ? 'Output aktif - klik untuk matikan'
            : 'Output mati - klik untuk aktifkan'
        }
      >
        {isProjectionVisible ? <Tv size={12} /> : <MonitorOff size={12} />}
        <span>{isProjectionVisible ? 'Output ON' : 'Output OFF'}</span>
        {isProjectionVisible && <span className="titlebar-output-btn__dot" />}
      </button>

      {/* Stage display toggle */}
      <button
        onClick={handleToggleStage}
        className={`titlebar-stage-btn ${isStageDisplayVisible ? 'is-active' : ''}`}
        title={isStageDisplayVisible ? 'Stage display aktif' : 'Aktifkan stage display'}
        aria-label={isStageDisplayVisible ? 'Hide stage display' : 'Show stage display'}
      >
        <Users size={12} />
        <span>Stage</span>
        {isStageDisplayVisible && (
          <span
            className="titlebar-output-btn__dot"
            style={{ background: 'var(--color-preview)' }}
          />
        )}
      </button>

      {/* Focus mode badge */}
      {isFocusMode && (
        <div className="titlebar-badge titlebar-badge--focus">
          <Activity size={10} />
          Focus
        </div>
      )}

      {activePlaylist && (
        <div className="titlebar-badge" title={activePlaylist.name}>
          <Music2 size={10} />
          <span>{playlistItems.length} Item</span>
        </div>
      )}

      {/* Display / projector status */}
      <div
        className={`titlebar-badge ${hasExternal ? 'titlebar-badge--connected' : 'titlebar-badge--lost'}`}
      >
        <Monitor size={10} />
        <span>{hasExternal ? `${displayCount} Display` : 'No Output'}</span>
      </div>
    </div>
  )
}
