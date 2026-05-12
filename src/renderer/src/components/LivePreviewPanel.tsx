import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Expand,
  Gauge,
  Monitor,
  Pause,
  Radio,
  ScreenShare,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Snowflake,
  Square,
  Volume2,
  XCircle,
  Zap
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import type { SlideData } from '../types'
import { PresentationCanvas } from './PresentationCanvas'
import { executeRuntimeCommand } from '../utils/runtimeCommandBus'
import { logger } from '../utils/logger'

const TRANSITION_SPEEDS = [
  { label: '0.1s', value: 0.1 },
  { label: '0.4s', value: 0.4 },
  { label: '0.8s', value: 0.8 },
  { label: '1.2s', value: 1.2 }
]

interface MonitorFrameProps {
  mode: 'preview' | 'program'
  slide: SlideData | null
  stateLabel: string
  isLive?: boolean
  isBlack?: boolean
  isClear?: boolean
  isProjectorLost?: boolean
  theme: Record<string, string>
  programLockState?: 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'
  onExpand: () => void
  onSettings: () => void
}

function MonitorFrame({
  mode,
  slide,
  stateLabel,
  isLive = false,
  isBlack = false,
  isClear = false,
  isProjectorLost = false,
  theme,
  programLockState = 'UNLOCKED',
  onExpand,
  onSettings
}: MonitorFrameProps): React.JSX.Element {
  const isProgram = mode === 'program'
  const emptyLyrics = slide !== null && slide.text.trim().length === 0
  const accent = isProgram ? 'program' : 'preview'
  const showLyrics = !isBlack && !isClear && slide && !emptyLyrics
  const canvasState = isProgram ? (isBlack ? 'BLACK' : isClear ? 'CLEAR' : 'LIVE') : 'LIVE'

  return (
    <div className={`broadcast-monitor broadcast-monitor--${accent}`}>
      <div className="broadcast-monitor__header">
        <div className="flex min-w-0 items-center gap-2">
          <span className="broadcast-monitor__dot" />
          <span className="truncate font-heading text-[13px] font-black uppercase tracking-[0.18em] text-text-primary">
            {isProgram ? 'Program / Live' : 'Preview / Cue'}
          </span>
          <span className="broadcast-monitor__state">{stateLabel}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {isProgram && programLockState === 'LIVE_LOCK' && (
            <span className="broadcast-status broadcast-status--green">Live Lock</span>
          )}
          {isProgram && programLockState === 'LIVE_DIRTY' && (
            <span className="broadcast-status broadcast-status--amber">
              <AlertCircle size={11} />
              Dirty
            </span>
          )}
          {isProgram && isProjectorLost && (
            <span className="broadcast-status broadcast-status--red">
              <AlertTriangle size={11} />
              Projector Lost
            </span>
          )}
          {emptyLyrics && (
            <span className="broadcast-status broadcast-status--amber">
              <AlertTriangle size={11} />
              Empty
            </span>
          )}
          {isProgram && isLive && programLockState !== 'LIVE_DIRTY' && (
            <span className="broadcast-status broadcast-status--red">
              <Radio size={10} className="animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="broadcast-monitor__frame">
        <div className="broadcast-monitor__screen">
          <PresentationCanvas
            slide={slide}
            projectionState={canvasState}
            theme={theme}
            animated={false}
            showMetadata={false}
            fit
          />

          {!showLyrics && !isBlack && !isClear && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/12">
              <ScreenShare size={isProgram ? 48 : 40} />
              <span className="font-heading text-[12px] font-black uppercase tracking-[0.28em]">
                SION PRESENTER
              </span>
            </div>
          )}

          <div className="broadcast-monitor__tools">
            <button title="Focus monitor workspace" onClick={onExpand}>
              <Expand size={15} />
            </button>
            <button title="Monitor settings" onClick={onSettings}>
              <Settings size={15} />
            </button>
          </div>

          <div className="broadcast-monitor__meta">
            <span>16:9</span>
            <span>1920x1080</span>
            <span>60 FPS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TransitionColumn(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlides,
    programSlideIndex,
    projectionState,
    fadeSpeed,
    setFadeSpeed
  } = useProjectionStore()

  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null
  const previewSlide = slides[currentSlideIndex]
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isCueSameAsProgram =
    hasCue &&
    hasProgram &&
    previewSlide?.songId === programSlide?.songId &&
    previewSlide?.slideIndex === programSlide?.slideIndex

  const takeCue = (): void => {
    executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')
  }

  const cutCue = (): void => {
    setFadeSpeed(0.1)
    takeCue()
  }

  return (
    <aside className="transition-rack">
      <div className="transition-rack__header">
        <span>Transition</span>
        <select
          value={fadeSpeed}
          onChange={(event) => setFadeSpeed(Number(event.target.value))}
          className="transition-rack__select"
          title="Transition speed"
        >
          {TRANSITION_SPEEDS.map((speed) => (
            <option key={speed.value} value={speed.value}>
              Fade {speed.label}
            </option>
          ))}
        </select>
      </div>

      <button
        className={`transition-rack__take ${isLive ? 'is-live' : ''}`}
        onClick={takeCue}
        disabled={!hasCue || (isCueSameAsProgram && isLive)}
        title="TAKE cue ke Program (Space)"
      >
        <Zap size={27} fill="currentColor" />
        <span>Take</span>
      </button>

      <button
        className="transition-rack__auto"
        onClick={takeCue}
        disabled={!hasCue || (isCueSameAsProgram && isLive)}
        title="Auto transition"
      >
        <span>Auto</span>
        <strong>{fadeSpeed.toFixed(1)}s</strong>
      </button>

      <div className="transition-rack__transport">
        <button
          onClick={() => executeRuntimeCommand('NAV_CUE_PREV', undefined, 'UI_BUTTON')}
          disabled={currentSlideIndex <= 0 || !hasCue}
          title="Cue sebelumnya"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={() => executeRuntimeCommand('PROJ_FREEZE', undefined, 'UI_BUTTON')}
          className={projectionState === 'FREEZE' ? 'is-active' : ''}
          title="Freeze Screen (F)"
        >
          {projectionState === 'FREEZE' ? <Pause size={14} /> : <Snowflake size={14} />}
        </button>
        <button
          onClick={() => executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'UI_BUTTON')}
          disabled={!hasProgram || programSlideIndex >= programSlides.length - 1}
          title="Live slide berikutnya"
        >
          <SkipForward size={14} />
        </button>
      </div>

      <button
        className="transition-rack__cut"
        onClick={cutCue}
        disabled={!hasCue || (isCueSameAsProgram && isLive)}
        title="Cut instantly"
      >
        Cut
      </button>
    </aside>
  )
}

function AudioOutputPanel(): React.JSX.Element {
  const { timerElapsed, timerRunning, timerStart, timerStop, timerReset, timerTick } =
    useProjectionStore()
  const meters = [
    { label: 'Master', value: '0.0 dB', level: '92%' },
    { label: 'Mic / Aux', value: '-3.2 dB', level: '76%' },
    { label: 'BGM', value: '-6.1 dB', level: '64%' }
  ]
  const timerValue = new Date(timerElapsed * 1000).toISOString().slice(11, 19)

  useEffect(() => {
    if (!timerRunning) return undefined
    const interval = window.setInterval(timerTick, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning, timerTick])

  return (
    <aside className="output-rack">
      <div className="output-rack__header">
        <span>Audio Mixer</span>
        <Settings size={15} />
      </div>

      <div className="space-y-5">
        {meters.map((meter) => (
          <div key={meter.label} className="audio-meter">
            <div className="flex items-center justify-between">
              <span>{meter.label}</span>
              <strong>{meter.value}</strong>
            </div>
            <div className="audio-meter__track">
              <div className="audio-meter__fill" style={{ width: meter.level }} />
              <div className="audio-meter__knob" style={{ left: meter.level }} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold text-text-disabled">
              <span>L</span>
              <span>R</span>
              <Volume2 size={12} />
            </div>
          </div>
        ))}
      </div>

      <div className="output-rack__timer">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">
          <span>Timer</span>
          <button onClick={timerReset}>Reset</button>
        </div>
        <div className="mt-3 font-mono text-[22px] font-black text-text-primary">{timerValue}</div>
        <button
          className="mt-3 w-full"
          onClick={timerRunning ? timerStop : timerStart}
          title={timerRunning ? 'Stop timer' : 'Start timer'}
        >
          {timerRunning ? 'Stop Timer' : 'Start Timer'}
        </button>
      </div>
    </aside>
  )
}

export function LivePreviewPanel(): React.JSX.Element {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlideIndex,
    programSlides,
    projectionState,
    programLockState,
    hasPendingLiveChanges,
    nextSlideData,
    nextSlideIndex,
    hasNextSlide,
    nextSong,
    hasNextSong,
    nextReadyState
  } = useProjectionStore()
  const {
    displayCount,
    isFocusMode,
    isProjectionVisible,
    setProjectionVisible,
    toggleFocusMode,
    setScreen,
    showToast
  } = useAppStore()
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [selectedScene, setSelectedScene] = useState('1')

  useEffect(() => {
    let mounted = true
    window.api.settings
      .getAll()
      .then((settings) => {
        if (mounted) setTheme(settings)
      })
      .catch((err) => logger.error('Failed to load theme:', err))
    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      setTheme((currentTheme) => ({ ...currentTheme, ...(data as Record<string, string>) }))
    })
    return () => {
      mounted = false
      unsubscribeTheme()
    }
  }, [])

  const previewSlide = slides[currentSlideIndex] ?? null
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isBlack = projectionState === 'BLACK'
  const isClear = projectionState === 'CLEAR' || projectionState === 'LOGO'
  const isProjectorLost = displayCount <= 1

  const previewState = useMemo(() => {
    if (slides.length === 0) return 'No Cue'
    return `Slide ${currentSlideIndex + 1}/${slides.length}`
  }, [currentSlideIndex, slides.length])

  const programState = useMemo(() => {
    if (!programSlide || programSlides.length === 0) return projectionState
    return `${projectionState} ${programSlideIndex + 1}/${programSlides.length}`
  }, [programSlide, programSlideIndex, programSlides.length, projectionState])

  const nextSlideLabel = useMemo(() => {
    if (!hasNextSlide || nextSlideIndex === null) return null
    return `Slide ${nextSlideIndex + 1}/${programSlides.length}`
  }, [hasNextSlide, nextSlideIndex, programSlides.length])

  const nextSongLabel = useMemo(() => {
    if (!hasNextSong || !nextSong) return null
    return `${nextSong.number} - ${nextSong.title}`
  }, [hasNextSong, nextSong])

  const handleToggleProjection = (): void => {
    try {
      if (isProjectionVisible) {
        window.api.projection.hide()
        setProjectionVisible(false)
      } else {
        window.api.projection.show()
        setProjectionVisible(true)
      }
    } catch (err) {
      logger.error('Failed to toggle projection window:', err)
      showToast('Gagal mengubah status proyektor', 'error')
    }
  }

  const handleSceneSelect = (scene: string): void => {
    setSelectedScene(scene)
    window.dispatchEvent(new CustomEvent('projection-scene-change', { detail: scene }))
    const labels: Record<string, string> = {
      '1': 'All Workspace',
      '2': 'Library Focus',
      '3': 'Rundown Focus',
      '4': 'Song Info Focus'
    }
    showToast(`Scene ${scene}: ${labels[scene]}`, 'success')
  }

  return (
    <div className="projection-command-center">
      <div className="projection-command-center__grid">
        <MonitorFrame
          mode="preview"
          slide={previewSlide}
          stateLabel={previewState}
          theme={theme}
          onExpand={toggleFocusMode}
          onSettings={() => setScreen('settings')}
        />

        <TransitionColumn />

        <MonitorFrame
          mode="program"
          slide={programSlide}
          stateLabel={programState}
          isLive={isLive}
          isBlack={isBlack}
          isClear={isClear}
          isProjectorLost={isProjectorLost}
          theme={theme}
          programLockState={programLockState}
          onExpand={toggleFocusMode}
          onSettings={() => setScreen('settings')}
        />

        <AudioOutputPanel />
      </div>

      <div className="projection-scene-strip">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-text-muted">
            Scene
          </span>
          {[
            ['1', 'VERSE'],
            ['2', 'CHORUS'],
            ['3', 'BRIDGE'],
            ['4', 'ENDING']
          ].map(([scene, label]) => (
            <button
              key={scene}
              className={selectedScene === scene ? 'is-active' : ''}
              onClick={() => handleSceneSelect(scene)}
            >
              <strong>{label}</strong>
              <small>{scene}</small>
            </button>
          ))}
          <button onClick={() => showToast('Scene baru siap ditambahkan', 'info')}>+</button>
        </div>

        <div className="flex items-center gap-2">
          <button title="Output settings" onClick={() => setScreen('settings')}>
            <SlidersHorizontal size={15} />
          </button>
          <button
            title={isProjectionVisible ? 'Hide projection window' : 'Show projection window'}
            onClick={handleToggleProjection}
            className={isProjectionVisible ? 'is-active' : ''}
          >
            <Monitor size={15} />
          </button>
          <button
            title={isFocusMode ? 'Exit focus mode' : 'Focus monitors'}
            onClick={toggleFocusMode}
            className={isFocusMode ? 'is-active' : ''}
          >
            <Gauge size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => executeRuntimeCommand('PROJ_BLACK', undefined, 'UI_BUTTON')}
            className={projectionState === 'BLACK' ? 'is-danger-active' : ''}
            title="Black Out (B)"
          >
            <Square size={14} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
            Black Out
          </button>
          <button
            onClick={() => executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')}
            className="is-clear"
            title="Clear Output (Esc)"
          >
            <XCircle size={14} />
            Clear
          </button>
        </div>
      </div>

      {nextReadyState !== 'EMPTY' && (
        <div className="projection-next-strip">
          <span>Next</span>
          {hasNextSlide && nextSlideLabel && nextSlideData && (
            <strong>
              {nextSlideLabel} / {nextSlideData.sectionLabel}
            </strong>
          )}
          {hasNextSong && nextSongLabel && <strong>{nextSongLabel}</strong>}
        </div>
      )}

      {isProjectorLost && (
        <div className="projection-warning">
          Simulasi preview aktif karena proyektor eksternal tidak terdeteksi.
        </div>
      )}

      {programLockState === 'LIVE_DIRTY' && hasPendingLiveChanges && (
        <div className="projection-dirty-bar">
          <AlertCircle size={16} className="animate-pulse" />
          <span>Pending changes detected. Apply to live output?</span>
          <button
            onClick={() => executeRuntimeCommand('PROTECTION_UPDATE_LIVE', undefined, 'UI_BUTTON')}
          >
            Update Live
          </button>
          <button
            onClick={() => executeRuntimeCommand('PROTECTION_DISCARD', undefined, 'UI_BUTTON')}
          >
            Discard
          </button>
        </div>
      )}
    </div>
  )
}
