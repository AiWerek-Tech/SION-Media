import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Expand,
  Gauge,
  Image,
  Monitor,
  Music2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Snowflake,
  Square,
  Volume2,
  VolumeX,
  XCircle,
  Zap
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { DEFAULT_SCENE_PRESETS } from '../atmosphere/presets'
import { useProjectionStore } from '../store/useProjectionStore'
import { useAtmosphereStore } from '../store/useAtmosphereStore'
import { useInstrumentStore } from '../store/useInstrumentStore'
import type { ProjectionState, SlideData } from '@renderer/types'
import sionLogoMono from '../assets/sion-logo-mono.svg'
import { PresentationCanvas } from './PresentationCanvas'
import { LiveProjectionCanvas } from './LiveProjectionCanvas'
import { LyricsZoomControl } from './projection/LyricsZoomControl'
import { WorshipFlowIndicator } from './projection/WorshipFlowIndicator'
import { executeRuntimeCommand } from '@renderer/utils/runtimeCommandBus'
import { logger } from '../utils/logger'
import { isSamePresentationCue } from '../utils/presentationCueIdentity'
import { STATE_CONFIG, TitleBarTimer } from './titlebar/TitleBarStatus'

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
  projectionState?: ProjectionState
  isProjectorLost?: boolean
  theme: Record<string, string>
  songBackgroundConfig?: string
  programLockState?: 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'
  lyricsFontSizePercent?: number
  /** Resolusi output aktual dari display yang terhubung */
  outputResolution?: { width: number; height: number }
  onExpand: () => void
  onSettings: () => void
}

function VideoControlBar({ accent }: { accent: 'preview' | 'program' }): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const isProgram = accent === 'program'

  useEffect(() => {
    const updateState = (): void => {
      const video = document.querySelector(
        `.broadcast-monitor--${accent} video`
      ) as HTMLVideoElement | null
      if (!video) return

      setIsPlaying(!video.paused)
      setCurrentTime(video.currentTime)
      setDuration(video.duration || 0)
    }

    updateState()
    const timer = setInterval(updateState, 250)

    return () => {
      clearInterval(timer)
    }
  }, [accent])

  const handlePlayPause = (): void => {
    const video = document.querySelector(
      `.broadcast-monitor--${accent} video`
    ) as HTMLVideoElement | null
    if (!video) return

    if (video.paused) {
      video.play().catch((err) => console.error('[VideoControl] Play failed:', err))
      if (isProgram) {
        window.api.projection.videoControl('play')
      }
    } else {
      video.pause()
      if (isProgram) {
        window.api.projection.videoControl('pause')
      }
    }
  }

  const handleStop = (): void => {
    const video = document.querySelector(
      `.broadcast-monitor--${accent} video`
    ) as HTMLVideoElement | null
    if (!video) return

    video.pause()
    video.currentTime = 0
    if (isProgram) {
      window.api.projection.videoControl('stop')
    }
  }

  const handleSeek = (time: number): void => {
    const video = document.querySelector(
      `.broadcast-monitor--${accent} video`
    ) as HTMLVideoElement | null
    if (!video) return

    video.currentTime = time
    setCurrentTime(time)
    if (isProgram) {
      window.api.projection.videoControl('seek', time)
    }
  }

  const formatTime = (secs: number): string => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00'
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0')
    const s = Math.floor(secs % 60)
      .toString()
      .padStart(2, '0')
    return `${m}:${s}`
  }

  const sliderPercent = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-md mx-auto flex items-center justify-between gap-3 px-3 py-1 rounded-lg bg-black/60 border border-white/[0.06] backdrop-blur-sm select-none z-30">
      <button
        onClick={handlePlayPause}
        className="p-1 rounded-md hover:bg-white/10 text-text-primary active:scale-95 transition-all shrink-0"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={12} fill="currentColor" />
        ) : (
          <Play size={12} fill="currentColor" />
        )}
      </button>
      <button
        onClick={handleStop}
        className="p-1 rounded-md hover:bg-white/10 text-text-primary active:scale-95 transition-all shrink-0"
        title="Stop"
      >
        <Square size={11} fill="currentColor" />
      </button>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={(e) => handleSeek(Number(e.target.value))}
        className="flex-1 h-1 rounded bg-white/20 accent-brand-primary outline-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--color-brand-primary) 0%, var(--color-brand-primary) ${sliderPercent}%, rgba(255,255,255,0.2) ${sliderPercent}%, rgba(255,255,255,0.2) 100%)`
        }}
      />

      <span className="text-[10px] font-mono text-text-muted shrink-0">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  )
}

function MonitorFrame({
  mode,
  slide,
  stateLabel,
  isLive = false,
  isBlack = false,
  isClear = false,
  projectionState = 'CLEAR',
  isProjectorLost = false,
  theme,
  songBackgroundConfig = '',
  programLockState = 'UNLOCKED',
  lyricsFontSizePercent = 100,
  outputResolution,
  onExpand,
  onSettings
}: MonitorFrameProps): React.JSX.Element {
  const isProgram = mode === 'program'
  const emptyLyrics = slide !== null && slide.text.trim().length === 0
  const accent = isProgram ? 'program' : 'preview'
  const showLyrics = !isBlack && !isClear && slide && !emptyLyrics

  const hasVideo = useMemo(() => {
    if (!songBackgroundConfig) return false
    try {
      const config = JSON.parse(songBackgroundConfig)
      return config.mode === 'video' && !!config.media?.path
    } catch {
      return false
    }
  }, [songBackgroundConfig])

  // Derive clean state label for program
  const stateKey = stateLabel.split(' ')[0]
  const stateConf = STATE_CONFIG[stateKey] ?? STATE_CONFIG.CLEAR

  return (
    <div
      className={`broadcast-monitor broadcast-monitor--${accent}${isProgram && isLive ? ' is-live' : ''}${!isProgram && isProjectorLost ? ' is-sim' : ''}${isProgram && isProjectorLost ? ' is-no-output' : ''}`}
    >
      {/* ── Header ── */}
      <div className="broadcast-monitor__header">
        {/* Left: dot + label + state badge */}
        <div className="flex min-w-0 items-center gap-1.5 flex-1 overflow-hidden">
          <span className="broadcast-monitor__dot flex-shrink-0" />
          <span className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-text-primary">
            {isProgram ? 'Program' : 'Preview'}
          </span>

          {/* State badge */}
          {isProgram ? (
            <div
              className="broadcast-monitor__state-badge flex-shrink-0"
              style={{ '--state-color': stateConf.color } as React.CSSProperties}
            >
              <span className={`status-dot ${stateConf.dotClass}`} />
              <span>{stateKey}</span>
            </div>
          ) : (
            <span className="broadcast-monitor__state flex-shrink-0">{stateLabel}</span>
          )}

          {/* Slide position — tampil saat ada slide di program */}
          {isProgram && stateLabel.includes('/') && (
            <span className="broadcast-monitor__slide-pos flex-shrink-0">
              {stateLabel.split(' ').slice(1).join(' ')}
            </span>
          )}

          {/* Simulasi warning — inline di header, hanya untuk preview saat proyektor tidak terdeteksi */}
          {!isProgram && isProjectorLost && (
            <span
              className="broadcast-monitor__sim-warning flex-shrink-0"
              title="Proyektor eksternal tidak terdeteksi — mode simulasi aktif"
            >
              <AlertTriangle size={9} />
              Simulasi
            </span>
          )}
        </div>

        {/* Right: status badges + timer */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          {/* Timer — compact, only on program */}
          {isProgram && (
            <div
              className="broadcast-monitor__timer-wrap"
              title="Timer ibadah — klik untuk start/stop"
            >
              <TitleBarTimer />
            </div>
          )}

          {/* Lock state */}
          {isProgram && programLockState === 'LIVE_LOCK' && (
            <span
              className="broadcast-status broadcast-status--green"
              title="Program terkunci — slide aktif di output live"
            >
              Lock
            </span>
          )}
          {isProgram && programLockState === 'LIVE_DIRTY' && (
            <span
              className="broadcast-status broadcast-status--amber"
              title="Ada perubahan yang belum diterapkan ke output live"
            >
              <AlertCircle size={10} />
              Dirty
            </span>
          )}

          {/* Empty lyrics warning */}
          {emptyLyrics && (
            <span className="broadcast-status broadcast-status--amber">
              <AlertTriangle size={10} />
              Empty
            </span>
          )}

          {/* Live indicator */}
          {isProgram && isLive && programLockState !== 'LIVE_DIRTY' && (
            <span className="broadcast-status broadcast-status--red">
              <Radio size={9} className="animate-pulse" />
              Live
            </span>
          )}

          {/* No output warning */}
          {isProgram && isProjectorLost && (
            <span
              className="broadcast-status broadcast-status--amber"
              title="Proyektor eksternal tidak terdeteksi"
            >
              <AlertTriangle size={10} />
              No Output
            </span>
          )}
        </div>
      </div>

      {/* ── Screen ── */}
      <div className="broadcast-monitor__frame flex flex-col gap-2 min-h-0 w-full">
        <div className="broadcast-monitor__screen flex-1">
          {isProgram ? (
            <LiveProjectionCanvas
              slide={slide}
              projectionState={projectionState}
              theme={{ ...theme, song_background_config: songBackgroundConfig }}
              showMetadata={false}
              fit
              lyricsFontSizePercent={lyricsFontSizePercent}
              muted={true}
            />
          ) : (
            <PresentationCanvas
              slide={slide}
              projectionState="LIVE"
              theme={{ ...theme, song_background_config: songBackgroundConfig }}
              animated={false}
              showMetadata={false}
              showIdleWatermark={false}
              fit
              lyricsFontSizePercent={lyricsFontSizePercent}
              muted={true}
            />
          )}

          {/* Empty preview guidance overlay */}
          {!isProgram && !slide && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-[#020617]/75 backdrop-blur-[2px]">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary mb-2.5">
                <Music2 size={20} />
              </div>
              <h4 className="text-[12px] font-bold text-text-primary mb-1">Preview Kosong</h4>
              <p className="text-[10px] text-text-muted leading-relaxed max-w-[200px]">
                Klik ganda lagu dari perpustakaan atau rundown di bawah untuk memuat slide di sini.
              </p>
            </div>
          )}

          {/* Watermark logo — tampil saat tidak ada lirik aktif DAN bukan BLACK */}
          {!isProgram && !showLyrics && !isBlack && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <img
                src={sionLogoMono}
                alt=""
                role="presentation"
                className="monitor-watermark"
                style={{
                  width: isProgram ? 80 : 64,
                  height: 'auto',
                  opacity: 0.1,
                  filter: 'brightness(10) saturate(0)',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
                draggable={false}
              />
            </div>
          )}

          <div className="broadcast-monitor__tools">
            <button title="Perbesar monitor" onClick={onExpand}>
              <Expand size={14} />
            </button>
            <button title="Pengaturan output" onClick={onSettings}>
              <Settings size={14} />
            </button>
          </div>

          {/* Meta bar — position absolute di pojok kanan bawah screen */}
          <div className="broadcast-monitor__meta">
            <span>16:9</span>
            <span>
              {outputResolution
                ? `${outputResolution.width}×${outputResolution.height}`
                : '1920×1080'}
            </span>
            <span>60 FPS</span>
          </div>
        </div>

        {hasVideo && (
          <div className="w-full pb-1 select-none">
            <VideoControlBar accent={accent} />
          </div>
        )}
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
    setFadeSpeed,
    transitionType,
    setTransitionType,
    navigationFlow,
    flowPosition,
    isSmartMode,
    cuedSongBackgroundConfig,
    programSongBackgroundConfig
  } = useProjectionStore()

  const hasCue = slides.length > 0
  const hasProgram = programSlides.length > 0 && programSlide !== null
  const previewSlide = slides[currentSlideIndex]
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'

  // FIX BUG-08: compare both songId AND the actual text content to avoid
  // false-positives when two different songs share the same slideIndex value.
  const isCueSameAsProgram =
    hasCue &&
    hasProgram &&
    isSamePresentationCue(
      previewSlide,
      programSlide,
      cuedSongBackgroundConfig,
      programSongBackgroundConfig
    )

  // Derive TAKE disabled state and tooltip contextually
  const isTakeDisabled = !hasCue || (isCueSameAsProgram && isLive)
  const takeTitle = !hasCue
    ? 'Tidak ada cue — pilih lagu terlebih dahulu'
    : isCueSameAsProgram && isLive
      ? 'Slide ini sudah tayang di Program'
      : 'Tayangkan (Take) lirik ke Program (Space)'

  const takeCue = (): void => {
    executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')
  }

  // FIX BUG-07: cutCue must NOT permanently change the stored fade speed.
  const cutCue = (): void => {
    window.api.projection.themeUpdate({ transition_duration: '0.1', transition_type: 'fast-cut' })
    executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')
    setTimeout(() => {
      window.api.projection.themeUpdate({
        transition_duration: fadeSpeed.toString(),
        transition_type: transitionType
      })
    }, 150)
  }

  // FIX SMART-NAV: canNavNext/Prev must be Smart Navigation aware.
  // In Smart_Mode, the flow can jump to chorus slides that are "before" the
  // current linear index — so we cannot use programSlideIndex < length-1.
  // Instead: check if computeSmartNext returns a valid target.
  const canNavPrev = (() => {
    if (!hasProgram) return false
    if (isSmartMode && navigationFlow && flowPosition >= 0) {
      // In Smart_Mode: can go prev if not at the very first step AND not at
      // the first slide within the first step
      const currentStep = navigationFlow.steps[flowPosition]
      if (!currentStep) return programSlideIndex > 0
      // Can go prev if: within section (not at first slide) OR there's a prev step
      return programSlideIndex > currentStep.firstSlideIndex || flowPosition > 0
    }
    // Linear_Mode: standard check
    return programSlideIndex > 0
  })()

  const canNavNext = (() => {
    if (!hasProgram) return false
    if (isSmartMode && navigationFlow && flowPosition >= 0) {
      // In Smart_Mode: can go next if not at the very last step AND not at
      // the last slide within the last step
      const currentStep = navigationFlow.steps[flowPosition]
      if (!currentStep) return programSlideIndex < programSlides.length - 1
      // Can go next if: within section (not at last slide) OR there's a next step
      return (
        programSlideIndex < currentStep.lastSlideIndex ||
        flowPosition < navigationFlow.steps.length - 1
      )
    }
    // Linear_Mode: standard check
    return programSlideIndex < programSlides.length - 1
  })()

  return (
    <aside className="transition-rack">
      <div className="transition-rack__header">
        <span>Transition</span>
        <div className="flex flex-col gap-1 w-full mt-1">
          {/* FIX UX-DROPDOWN: wrapper provides custom chevron so text is never clipped */}
          <div className="transition-rack__select-wrap">
            <select
              value={transitionType}
              onChange={(event) => setTransitionType(event.target.value)}
              className="transition-rack__select w-full"
              title="Jenis transisi"
              aria-label="Jenis transisi"
            >
              <option value="dissolve">Fade</option>
              <option value="crossfade">Crossfade</option>
              <option value="fast-cut">Fast Cut</option>
              <option value="slide">Slide Up</option>
              <option value="smooth-blur">Smooth Blur</option>
              <option value="premium-slide">Premium Slide</option>
            </select>
          </div>
          <div className="transition-rack__select-wrap">
            <select
              value={fadeSpeed}
              onChange={(event) => setFadeSpeed(Number(event.target.value))}
              className="transition-rack__select w-full"
              title="Kecepatan transisi"
              aria-label="Kecepatan transisi"
            >
              {TRANSITION_SPEEDS.map((speed) => (
                <option key={speed.value} value={speed.value}>
                  Speed: {speed.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        className={`transition-rack__take ${isLive ? 'is-live' : ''}`}
        onClick={takeCue}
        disabled={isTakeDisabled}
        title={takeTitle}
        aria-label={takeTitle}
      >
        <Zap size={27} fill="currentColor" />
        <span>Tayangkan</span>
      </button>

      {/* FIX UX-01: CUT is a distinct instant-take (always 0.1s fast-cut),
          clearly differentiated from TAKE which uses the selected transition. */}
      <button
        className="transition-rack__auto"
        onClick={cutCue}
        disabled={isTakeDisabled}
        title="Tayangkan instan tanpa efek transisi (0.1s)"
        aria-label="Tayangkan instan tanpa efek transisi"
      >
        <span>Instan</span>
        <strong>0.1s</strong>
      </button>

      {/* FIX NAV-01: Both transport buttons now navigate the live/program output.
          Prev = NAV_PREV_SLIDE (live back), Freeze = toggle, Next = NAV_NEXT_SLIDE (live forward).
          Previously prev used NAV_CUE_PREV (preview) while next used NAV_NEXT_SLIDE (live) — inconsistent. */}
      <div className="transition-rack__transport">
        <button
          onClick={() => executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'UI_BUTTON')}
          disabled={!canNavPrev}
          title={canNavPrev ? 'Slide live sebelumnya (←)' : 'Sudah di slide pertama'}
          aria-label="Slide live sebelumnya"
        >
          <SkipBack size={14} />
        </button>
        <button
          onClick={() => executeRuntimeCommand('PROJ_FREEZE', undefined, 'UI_BUTTON')}
          className={projectionState === 'FREEZE' ? 'is-active' : ''}
          title={
            projectionState === 'FREEZE'
              ? 'Unfreeze — lanjutkan output (F)'
              : 'Freeze Screen — bekukan output (F)'
          }
          aria-label={projectionState === 'FREEZE' ? 'Unfreeze output' : 'Freeze output'}
        >
          {projectionState === 'FREEZE' ? <Pause size={14} /> : <Snowflake size={14} />}
        </button>
        <button
          onClick={() => executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'UI_BUTTON')}
          disabled={!canNavNext}
          title={canNavNext ? 'Slide live berikutnya (→)' : 'Sudah di slide terakhir'}
          aria-label="Slide live berikutnya"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </aside>
  )
}

/**
 * Audio Output Panel — 4th column in the broadcast monitor grid.
 * Combines: service timer + real audio volume fader + live VU meter (OBS-style).
 */
function AudioOutputPanel(): React.JSX.Element {
  const {
    timerElapsed,
    timerRunning,
    timerStart,
    timerStop,
    timerReset,
    mediaVolume,
    mediaMuted,
    setMediaVolume,
    setMediaMuted,
    instrumentVolume,
    instrumentMuted,
    setInstrumentVolume,
    setInstrumentMuted
  } = useProjectionStore()

  // Instrument VU level simulated for operator feedback when playing
  const [instVuLevel, setInstVuLevel] = React.useState(0)
  const { isPlaying: isInstrumentPlaying } = useInstrumentStore()

  React.useEffect(() => {
    if (!isInstrumentPlaying || instrumentMuted) {
      return
    }
    let rafId = 0
    const tick = (): void => {
      const randomFactor = Math.random() * 0.4 + 0.5
      const wave = Math.sin(Date.now() / 100) * 0.1 + 0.1
      setInstVuLevel(Math.max(0, Math.min(1, (randomFactor + wave) * (instrumentVolume / 100))))
      rafId = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(rafId)
  }, [isInstrumentPlaying, instrumentVolume, instrumentMuted])

  // VU meter state driven by Web Audio API
  const [vuLevel, setVuLevel] = React.useState(0)
  const analyserRef = React.useRef<AnalyserNode | null>(null)
  const sourceRef = React.useRef<MediaElementAudioSourceNode | null>(null)
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const rafRef = React.useRef<number>(0)

  // Poll the program monitor's video element for audio levels
  React.useEffect(() => {
    let cancelled = false

    const connectAudio = (): void => {
      const video = document.querySelector(
        '.broadcast-monitor--program video'
      ) as HTMLVideoElement | null
      if (!video || sourceRef.current) return

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext()
        }
        const ctx = audioCtxRef.current
        const source = ctx.createMediaElementSource(video)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.7
        source.connect(analyser)
        // Don't connect to destination — audio plays from projection window, not operator
        sourceRef.current = source
        analyserRef.current = analyser
      } catch {
        // Video element may not be ready yet
      }
    }

    const tick = (): void => {
      if (cancelled) return
      if (!analyserRef.current) {
        connectAudio()
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const analyser = analyserRef.current
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      // RMS level calculation
      let sum = 0
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
      const rms = Math.sqrt(sum / data.length)
      const normalized = Math.min(rms / 128, 1)
      setVuLevel(normalized)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const h = Math.floor(timerElapsed / 3600)
  const m = Math.floor((timerElapsed % 3600) / 60)
  const s = timerElapsed % 60
  const timerValue =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  const isLong = timerElapsed >= 3600

  // Volume display in dB
  const volumeDb = mediaVolume > 0 ? (20 * Math.log10(mediaVolume / 100)).toFixed(1) : '-∞'
  const instrumentVolumeDb =
    instrumentVolume > 0 ? (20 * Math.log10(instrumentVolume / 100)).toFixed(1) : '-∞'
  const displayedInstVuLevel = !isInstrumentPlaying || instrumentMuted ? 0 : instVuLevel

  return (
    <aside className="output-rack">
      {/* TIMER */}
      <div className="output-rack__header">
        <span>TIMER</span>
        <Settings size={12} className="opacity-30" />
      </div>

      <div
        className={`audio-panel__timer ${timerRunning ? 'is-running' : ''} ${isLong ? 'is-long' : ''}`}
        style={{ margin: '0 -2px' }}
      >
        {timerRunning && <span className="audio-panel__timer-dot" />}
        <span className="audio-panel__timer-value" style={{ fontSize: isLong ? 16 : 20 }}>
          {timerValue}
        </span>
      </div>

      <div className="flex gap-1.5">
        <button
          className={`audio-panel__btn-primary flex-1 ${timerRunning ? 'is-stop' : 'is-start'}`}
          style={{ height: 28, fontSize: 10 }}
          onClick={timerRunning ? timerStop : timerStart}
        >
          {timerRunning ? <Pause size={10} /> : <Play size={10} />}
          {timerRunning ? 'Pause' : 'Start'}
        </button>
        <button
          className="audio-panel__btn-reset"
          style={{ width: 28, height: 28 }}
          onClick={timerReset}
          title="Reset"
        >
          <RotateCcw size={10} />
        </button>
      </div>

      {/* AUDIO MIXER (OBS Studio Style) */}
      <div className="output-rack__divider" />

      <div
        className="flex flex-col gap-4 overflow-y-auto pr-1"
        style={{ maxHeight: 200, width: '100%' }}
      >
        {/* Desktop Audio */}
        <div className="obs-mixer">
          <div className="obs-mixer__title-row">
            <span className="obs-mixer__channel-name">Desktop Audio</span>
            <button
              onClick={() => setMediaMuted(!mediaMuted)}
              className={`obs-mixer__mute-btn ${mediaMuted ? 'is-muted' : ''}`}
              title={mediaMuted ? 'Unmute' : 'Mute'}
              aria-label={mediaMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {mediaMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>
          </div>

          {/* Dual channel VU meter */}
          <div className="obs-mixer__vu-container">
            {/* L Channel */}
            <div className="obs-mixer__vu-channel">
              <div
                className="obs-mixer__vu-fill"
                style={{
                  width: mediaMuted ? '0%' : `${vuLevel * 100}%`
                }}
              />
            </div>
            {/* R Channel */}
            <div className="obs-mixer__vu-channel" style={{ marginTop: 2 }}>
              <div
                className="obs-mixer__vu-fill"
                style={{
                  width: mediaMuted ? '0%' : `${vuLevel * 100}%`
                }}
              />
            </div>

            {/* Ticks/dB marks */}
            <div className="obs-mixer__db-ticks">
              <span>-60</span>
              <span>-30</span>
              <span>-20</span>
              <span>-10</span>
              <span>-5</span>
              <span>0</span>
            </div>
          </div>

          {/* Fader slot and knob */}
          <div className="obs-mixer__fader-row">
            <div className="obs-mixer__fader-container">
              <input
                type="range"
                min={0}
                max={100}
                value={mediaMuted ? 0 : mediaVolume}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setMediaVolume(val)
                  if (mediaMuted && val > 0) setMediaMuted(false)
                }}
                className="obs-mixer__fader-slider"
                aria-label="Desktop Audio Fader"
              />
            </div>
            <span className="obs-mixer__db-value">{mediaMuted ? 'Mute' : `${volumeDb} dB`}</span>
          </div>
        </div>

        {/* Instrument Audio */}
        <div className="obs-mixer">
          <div className="obs-mixer__title-row">
            <span className="obs-mixer__channel-name">Instrumen Lagu</span>
            <button
              onClick={() => setInstrumentMuted(!instrumentMuted)}
              className={`obs-mixer__mute-btn ${instrumentMuted ? 'is-muted' : ''}`}
              title={instrumentMuted ? 'Unmute' : 'Mute'}
              aria-label={instrumentMuted ? 'Unmute instrument' : 'Mute instrument'}
            >
              {instrumentMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
            </button>
          </div>

          {/* Dual channel VU meter */}
          <div className="obs-mixer__vu-container">
            {/* L Channel */}
            <div className="obs-mixer__vu-channel">
              <div
                className="obs-mixer__vu-fill"
                style={{
                  width: `${displayedInstVuLevel * 100}%`
                }}
              />
            </div>
            {/* R Channel */}
            <div className="obs-mixer__vu-channel" style={{ marginTop: 2 }}>
              <div
                className="obs-mixer__vu-fill"
                style={{
                  width: `${displayedInstVuLevel * 100}%`
                }}
              />
            </div>

            {/* Ticks/dB marks */}
            <div className="obs-mixer__db-ticks">
              <span>-60</span>
              <span>-30</span>
              <span>-20</span>
              <span>-10</span>
              <span>-5</span>
              <span>0</span>
            </div>
          </div>

          {/* Fader slot and knob */}
          <div className="obs-mixer__fader-row">
            <div className="obs-mixer__fader-container">
              <input
                type="range"
                min={0}
                max={100}
                value={instrumentMuted ? 0 : instrumentVolume}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  setInstrumentVolume(val)
                  if (instrumentMuted && val > 0) setInstrumentMuted(false)
                }}
                className="obs-mixer__fader-slider"
                aria-label="Instrument Fader"
              />
            </div>
            <span className="obs-mixer__db-value">
              {instrumentMuted ? 'Mute' : `${instrumentVolumeDb} dB`}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

/**
 * Scene strip Clear button.
 * - Saat LIVE: double-click guard (2s window)
 * - Saat tidak LIVE dan tidak CLEAR: langsung clear
 * - Saat CLEAR: tombol menunjukkan state aktif, tidak disabled
 *   (user bisa take cue dari preview untuk keluar dari CLEAR)
 */
function SceneStripClearButton({
  isLive,
  isClear
}: {
  isLive: boolean
  isClear: boolean
}): React.JSX.Element {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset armed state saat isClear berubah
  useEffect(() => {
    if (isClear && armed) {
      // Use timeout to avoid calling setState synchronously within effect
      const id = setTimeout(() => {
        setArmed(false)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }, 0)
      return () => clearTimeout(id)
    }
    return undefined
  }, [isClear, armed])

  const handleClick = useCallback(() => {
    if (isClear) {
      // Saat sudah CLEAR, klik Clear lagi akan restore ke LIVE jika ada slide
      executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')
      return
    }
    if (!isLive) {
      executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')
      return
    }
    if (!armed) {
      setArmed(true)
      timerRef.current = setTimeout(() => {
        setArmed(false)
        timerRef.current = null
      }, 2000)
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setArmed(false)
      executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')
    }
  }, [isLive, isClear, armed])

  return (
    <button
      onClick={handleClick}
      className={`scene-strip__state-btn scene-strip__state-btn--clear ${armed ? 'is-armed' : ''} ${isClear ? 'is-clear-active' : ''}`}
      title={
        isClear
          ? 'Restore — tampilkan kembali teks lirik ke output'
          : isLive
            ? armed
              ? 'Klik lagi untuk konfirmasi Clear (Kosongkan Lirik)'
              : 'Clear Output — klik 2× saat LIVE (Sembunyikan teks lirik saja) (Esc)'
            : 'Clear Output (Sembunyikan teks lirik saja) (Esc)'
      }
    >
      <XCircle size={13} />
      <span>{isClear ? 'Restore' : armed ? 'Konfirmasi?' : 'Clear (Kosongkan)'}</span>
    </button>
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
    nextReadyState,
    cuedSongBackgroundConfig,
    programSongBackgroundConfig,
    lyricsFontSizePercent,
    navigationFlow,
    flowPosition,
    isSmartMode,
    toggleLogo,
    goToLiveSlide
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
  const { liveOverride, applyScenePreset, clearLiveOverride } = useAtmosphereStore()

  // Resolusi output aktual — diambil dari display non-primary (proyektor) jika ada
  const [outputResolution, setOutputResolution] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080
  })

  // Re-fetch resolusi setiap kali displayCount berubah (sudah di-track oleh bootstrap)
  useEffect(() => {
    window.api.display
      .getAll()
      .then((displays) => {
        const typed = displays as Array<{
          id: number
          width: number
          height: number
          isPrimary: boolean
        }>
        // Gunakan display non-primary (proyektor) jika ada, fallback ke primary
        const projector = typed.find((d) => !d.isPrimary) ?? typed[0]
        if (projector) {
          setOutputResolution({ width: projector.width, height: projector.height })
        }
      })
      .catch(() => {
        /* fallback ke default 1920×1080 */
      })
  }, [displayCount])

  useEffect(() => {
    let mounted = true
    window.api.settings
      .getAll()
      .then((settings) => {
        if (mounted) {
          setTheme(settings)
          // Initialize projection store with saved settings without triggering side effects
          if (settings.transition_duration) {
            useProjectionStore.setState({ fadeSpeed: Number(settings.transition_duration) })
          }
          if (settings.transition_type) {
            useProjectionStore.setState({ transitionType: settings.transition_type })
          }
          // Restore persisted UI preferences
          if (settings.ui_lyrics_font_size) {
            const size = Number(settings.ui_lyrics_font_size)
            if (size >= 50 && size <= 300) {
              useProjectionStore.setState({ lyricsFontSizePercent: size })
            }
          }
          if (settings.ui_audio_panel_visible === '1') {
            useProjectionStore.setState({ isAudioPanelVisible: true })
          }
        }
      })
      .catch((err) => logger.error('Failed to load theme:', err))
    const unsubscribeTheme = window.api.projection.onThemeUpdate((data) => {
      const updates = data as Record<string, string>
      setTheme((currentTheme) => ({ ...currentTheme, ...updates }))

      // Keep store UI in sync with external theme changes without triggering side effects
      const store = useProjectionStore.getState()
      if (updates.transition_duration && Number(updates.transition_duration) !== store.fadeSpeed) {
        useProjectionStore.setState({ fadeSpeed: Number(updates.transition_duration) })
      }
      if (updates.transition_type && updates.transition_type !== store.transitionType) {
        useProjectionStore.setState({ transitionType: updates.transition_type })
      }
    })

    const unsubscribeTimeUpdate = window.api.projection.onInstrumentTimeUpdate(
      (currentTime, duration) => {
        useInstrumentStore.getState().setTimeUpdate(currentTime, duration)
      }
    )

    return () => {
      mounted = false
      unsubscribeTheme()
      unsubscribeTimeUpdate()
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
    // Selalu tampilkan state + slide position jika ada slides di program
    if (programSlides.length > 0 && programSlideIndex >= 0) {
      return `${projectionState} ${programSlideIndex + 1}/${programSlides.length}`
    }
    return projectionState
  }, [programSlideIndex, programSlides.length, projectionState])

  const nextSlideLabel = useMemo(() => {
    if (!hasNextSlide || nextSlideIndex === null) return null
    return `Slide ${nextSlideIndex + 1}/${programSlides.length}`
  }, [hasNextSlide, nextSlideIndex, programSlides.length])

  const nextSongLabel = useMemo(() => {
    if (!hasNextSong || !nextSong) return null
    return `${nextSong.number} - ${nextSong.title}`
  }, [hasNextSong, nextSong])

  const handleToggleProjection = async (): Promise<void> => {
    try {
      if (isProjectionVisible) {
        window.api.projection.hide()
        setProjectionVisible(false)
      } else {
        const hasExternal = await window.api.display.hasExternal()
        if (!hasExternal) {
          showToast(
            'Layar output eksternal tidak terdeteksi. Lirik sudah tampil di monitor LIVE di dashboard.',
            'info'
          )
          return
        }
        window.api.projection.show()
        setProjectionVisible(true)
      }
    } catch (err) {
      logger.error('Failed to toggle projection window:', err)
      showToast('Gagal mengubah status proyektor', 'error')
    }
  }

  const handleSceneSelect = (presetId: string): void => {
    const preset = DEFAULT_SCENE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return

    applyScenePreset(presetId)
    window.api.projection.themeUpdate({
      projection_atmosphere_live_override: JSON.stringify(preset.config)
    })
    showToast(`Atmosfer live: ${preset.name}`, 'success')
  }

  const handleClearAtmosphereOverride = (): void => {
    clearLiveOverride()
    window.api.projection.themeUpdate({ projection_atmosphere_live_override: '' })
    showToast('Live override atmosphere dibersihkan', 'info')
  }

  const activeSceneId =
    DEFAULT_SCENE_PRESETS.find(
      (preset) =>
        preset.id === liveOverride?.config.id ||
        preset.config.id === liveOverride?.config.id ||
        preset.name === liveOverride?.config.name
    )?.id || ''

  return (
    <div className="projection-command-center">
      <div className="projection-command-center__grid">
        <MonitorFrame
          mode="preview"
          slide={previewSlide}
          stateLabel={previewState}
          isProjectorLost={isProjectorLost}
          theme={theme}
          songBackgroundConfig={cuedSongBackgroundConfig}
          lyricsFontSizePercent={lyricsFontSizePercent}
          outputResolution={outputResolution}
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
          projectionState={projectionState}
          isProjectorLost={isProjectorLost}
          theme={theme}
          songBackgroundConfig={programSongBackgroundConfig}
          programLockState={programLockState}
          lyricsFontSizePercent={lyricsFontSizePercent}
          outputResolution={outputResolution}
          onExpand={toggleFocusMode}
          onSettings={() => setScreen('settings')}
        />

        {/* Audio panel — always visible in the 4th grid column.
            The collapsible AudioPanel in ProjectionMode is for the bottom workspace.
            This panel shows the timer and audio monitoring status inline with monitors. */}
        <AudioOutputPanel />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SCENE STRIP — 4-zone control bar
          Left:   Atmosphere selector + Lyrics zoom
          Flow:   Worship Flow Indicator (Smart Navigation badges)
          Center: Monitor utility controls
          Right:  Output state controls (Safe / Logo / Black / Clear)
          ═══════════════════════════════════════════════════════════ */}
      <div className="scene-strip">
        {/* ── Zone Left: Atmosphere + Zoom ── */}
        <div className="scene-strip__zone scene-strip__zone--left">
          {/* Atmosphere label + select */}
          <div className="scene-strip__group">
            <span className="scene-strip__label">Atmosfer</span>
            <div className="scene-strip__select-wrap">
              <select
                className="scene-strip__select"
                value={activeSceneId || ''}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '') handleClearAtmosphereOverride()
                  else handleSceneSelect(val)
                }}
                title="Pilih atmosfer proyeksi"
              >
                <option value="" className="bg-[#0f1724] text-white">
                  Default
                </option>
                {DEFAULT_SCENE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-[#0f1724] text-white">
                    {preset.name}
                  </option>
                ))}
              </select>
              {activeSceneId && (
                <button
                  className="scene-strip__select-clear"
                  onClick={handleClearAtmosphereOverride}
                  title="Reset atmosfer"
                >
                  <XCircle size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="scene-strip__divider" />

          {/* Lyrics zoom */}
          <LyricsZoomControl />
        </div>

        {/* ── Zone Flow: Worship Flow Indicator ── */}
        <div className="scene-strip__zone scene-strip__zone--flow">
          <WorshipFlowIndicator
            navigationFlow={navigationFlow}
            flowPosition={flowPosition}
            isSmartMode={isSmartMode}
            projectionState={projectionState}
            onBadgeClick={(step) => goToLiveSlide(step.firstSlideIndex)}
            slides={programSlides}
            currentSlideIndex={programSlideIndex}
            onSlideClick={goToLiveSlide}
          />
        </div>

        {/* ── Zone Center: Monitor utilities ── */}
        <div className="scene-strip__zone scene-strip__zone--center">
          <button
            className="scene-strip__icon-btn"
            title="Pengaturan output"
            onClick={() => setScreen('settings')}
          >
            <SlidersHorizontal size={14} />
          </button>
          <button
            className={`scene-strip__icon-btn ${isProjectionVisible ? 'is-on' : ''}`}
            title={
              isProjectionVisible ? 'Sembunyikan jendela proyeksi' : 'Tampilkan jendela proyeksi'
            }
            onClick={handleToggleProjection}
          >
            <Monitor size={14} />
          </button>
          <button
            className={`scene-strip__icon-btn ${isFocusMode ? 'is-on' : ''}`}
            title={isFocusMode ? 'Keluar Focus Mode' : 'Focus Mode — perbesar monitor'}
            onClick={toggleFocusMode}
          >
            <Gauge size={14} />
          </button>
        </div>

        {/* ── Zone Right: Output state controls ── */}
        <div className="scene-strip__zone scene-strip__zone--right">
          {/* Safe Mode */}
          <button
            className={`scene-strip__state-btn ${activeSceneId === 'sermon' ? 'is-safe-active' : ''}`}
            onClick={() => {
              if (activeSceneId === 'sermon') handleClearAtmosphereOverride()
              else handleSceneSelect('sermon')
            }}
            title={
              activeSceneId === 'sermon'
                ? 'Safe Mode aktif — klik untuk matikan'
                : 'Safe Mode (Atmosfer gelap minimalis untuk Khotbah)'
            }
          >
            <Snowflake size={13} />
            <span>Safe (Polos)</span>
          </button>

          {/* Logo */}
          <button
            className={`scene-strip__state-btn ${projectionState === 'LOGO' ? 'is-logo-active' : ''}`}
            onClick={toggleLogo}
            title={
              projectionState === 'LOGO'
                ? 'Logo aktif — klik untuk kembali ke Clear'
                : 'Logo Standby (L)'
            }
          >
            <Image size={13} />
            <span>{projectionState === 'LOGO' ? 'Logo ✓' : 'Logo'}</span>
          </button>

          {/* Divider */}
          <div className="scene-strip__divider" />

          {/* Black Out */}
          <button
            className={`scene-strip__state-btn scene-strip__state-btn--black ${projectionState === 'BLACK' ? 'is-black-active' : ''}`}
            onClick={() => executeRuntimeCommand('PROJ_BLACK', undefined, 'UI_BUTTON')}
            title={
              projectionState === 'BLACK'
                ? 'Black Out aktif — klik untuk restore (B)'
                : 'Black (Padamkan layar total) (B)'
            }
          >
            <Square size={13} fill={projectionState === 'BLACK' ? 'currentColor' : 'none'} />
            <span>{projectionState === 'BLACK' ? 'Restore' : 'Black (Padam)'}</span>
          </button>

          {/* Clear */}
          <SceneStripClearButton isLive={isLive} isClear={isClear} />
        </div>
      </div>

      {nextReadyState !== 'EMPTY' && (
        <div className="projection-next-strip">
          <span>Next</span>
          {hasNextSlide && nextSlideLabel && nextSlideData && (
            <strong>
              {/* FIX: guard against undefined/empty sectionLabel */}
              {nextSlideLabel}
              {nextSlideData.sectionLabel ? ` · ${nextSlideData.sectionLabel}` : ''}
            </strong>
          )}
          {hasNextSong && nextSongLabel && <strong>{nextSongLabel}</strong>}
        </div>
      )}

      {programLockState === 'LIVE_DIRTY' && hasPendingLiveChanges && (
        <div className="projection-dirty-bar">
          <AlertCircle size={16} className="animate-pulse" />
          <span>Ada perubahan yang belum diterapkan ke output live.</span>
          <button
            onClick={() => executeRuntimeCommand('PROTECTION_UPDATE_LIVE', undefined, 'UI_BUTTON')}
          >
            Terapkan
          </button>
          <button
            onClick={() => executeRuntimeCommand('PROTECTION_DISCARD', undefined, 'UI_BUTTON')}
          >
            Batalkan
          </button>
        </div>
      )}
    </div>
  )
}
