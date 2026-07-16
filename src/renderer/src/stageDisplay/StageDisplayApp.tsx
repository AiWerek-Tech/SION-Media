/**
 * Read-only confidence monitor for musicians, singers, and worship leaders.
 */

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BookOpen,
  Clock3,
  EyeOff,
  Music2,
  Pause,
  Radio,
  TimerReset
} from 'lucide-react'
import type { ConfidencePayload, ProjectionState } from '@renderer/types'
import { cleanStageBibleText, getStageTextFit, stageTextFitClass } from './stageDisplayPresentation'

const EMPTY_PAYLOAD: Omit<ConfidencePayload, 'clock'> = {
  currentSlide: null,
  nextSlide: null,
  currentSection: null,
  nextSection: null,
  song: null,
  timer: { elapsed: 0, running: false },
  status: { isLive: false, isFrozen: false, isBlack: false, projectionState: 'CLEAR' },
  updatedAt: 0
}

function formatElapsed(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const secs = safeSeconds % 60
  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getStatusPresentation(status: ConfidencePayload['status']): {
  label: string
  color: string
  dot: string
  Icon: typeof Radio
} {
  if (status.isFrozen) {
    return { label: 'FREEZE', color: 'text-amber-300', dot: 'bg-amber-400', Icon: Pause }
  }
  if (status.isBlack) {
    return { label: 'BLACK', color: 'text-zinc-300', dot: 'bg-zinc-500', Icon: EyeOff }
  }
  if (status.isLive) {
    return { label: 'LIVE', color: 'text-red-400', dot: 'bg-red-500', Icon: Radio }
  }
  return { label: 'STANDBY', color: 'text-zinc-400', dot: 'bg-zinc-600', Icon: Radio }
}

export function StageDisplayApp(): React.JSX.Element {
  const [payload, setPayload] = useState<ConfidencePayload | null>(null)
  const [time, setTime] = useState(() => new Date())
  const [lastHeartbeatAck, setLastHeartbeatAck] = useState(0)
  const [stageNotesZoom, setStageNotesZoom] = useState(() => {
    return Number(localStorage.getItem('sion-stage-notes-zoom')) || 32
  })

  const handleStageNotesZoom = (delta: number): void => {
    setStageNotesZoom((prev) => {
      const next = Math.max(16, Math.min(80, prev + delta * 4))
      localStorage.setItem('sion-stage-notes-zoom', String(next))
      return next
    })
  }

  useEffect(() => {
    const clockTimer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      const slideData = data as {
        text?: string
        sectionLabel?: string
        slideIndex?: number
        totalSlides?: number
        nextSlideText?: string
        contentType?: 'song' | 'bible' | 'reading' | 'custom'
        bibleReference?: string
        bibleVersionCode?: string
      }
      if (!slideData || typeof slideData !== 'object') return

      setPayload((previous) => {
        const base: ConfidencePayload = previous ?? {
          ...EMPTY_PAYLOAD,
          clock: new Date().toLocaleTimeString()
        }
        const currentIdx = slideData.slideIndex ?? 0
        const computedTotal = Math.max(
          slideData.totalSlides ?? base.currentSlide?.totalSlides ?? 1,
          currentIdx + 1
        )
        return {
          ...base,
          currentSlide: {
            text: slideData.text || '',
            sectionLabel: slideData.sectionLabel || '',
            slideIndex: currentIdx,
            totalSlides: computedTotal,
            contentType: slideData.contentType,
            bibleReference: slideData.bibleReference,
            bibleVersionCode: slideData.bibleVersionCode
          },
          nextSlide: slideData.nextSlideText
            ? {
                text: slideData.nextSlideText,
                sectionLabel: '',
                contentType: slideData.contentType
              }
            : null,
          currentSection: slideData.sectionLabel || null,
          status: { ...base.status, isLive: true, projectionState: 'LIVE' },
          updatedAt: Date.now()
        }
      })
    })

    const unsubscribeState = window.api.projection.onStateChange((state) => {
      setPayload((previous) => {
        const base: ConfidencePayload = previous ?? {
          ...EMPTY_PAYLOAD,
          clock: new Date().toLocaleTimeString()
        }
        return {
          ...base,
          status: {
            isLive: state === 'LIVE' || state === 'FREEZE',
            isFrozen: state === 'FREEZE',
            isBlack: state === 'BLACK',
            projectionState: state as ProjectionState
          },
          updatedAt: Date.now()
        }
      })
    })

    const unsubscribeConfidence = window.api.confidence?.onUpdate?.((data) => {
      if (!data || typeof data !== 'object') return
      setPayload(data as ConfidencePayload)
    })
    const unsubscribeHeartbeat = window.api.health?.onHeartbeatAck?.((data) => {
      if (data.id === 'STAGE_DISPLAY') setLastHeartbeatAck(Date.now())
    })
    const heartbeat = setInterval(() => window.api.health?.sendHeartbeat('STAGE_DISPLAY'), 1000)

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      unsubscribeConfidence?.()
      unsubscribeHeartbeat?.()
      clearInterval(heartbeat)
    }
  }, [])

  const displayPayload = useMemo<ConfidencePayload>(
    () =>
      payload ?? {
        ...EMPTY_PAYLOAD,
        clock: time.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },
    [payload, time]
  )

  const { currentSlide, nextSlide, currentSection, nextSection, song, timer, status } =
    displayPayload
  const isBible = currentSlide?.contentType === 'bible'
  const isCustom = currentSlide?.contentType === 'custom'
  const currentText = currentSlide
    ? isBible
      ? cleanStageBibleText(currentSlide.text)
      : currentSlide.text.trim()
    : ''
  const nextText = nextSlide
    ? nextSlide.contentType === 'bible'
      ? cleanStageBibleText(nextSlide.text)
      : nextSlide.text.trim()
    : ''
  const currentFit = getStageTextFit(currentText)
  const progress = currentSlide?.totalSlides
    ? Math.min(100, Math.round(((currentSlide.slideIndex + 1) / currentSlide.totalSlides) * 100))
    : 0
  const runtime = getStatusPresentation(status)
  const StatusIcon = runtime.Icon
  const reference = currentSlide?.bibleReference || currentSection || currentSlide?.sectionLabel
  const backendConnected = lastHeartbeatAck > 0 && time.getTime() - lastHeartbeatAck < 3500

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#030506] font-['Poppins',sans-serif] text-white antialiased">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(37,99,235,0.08),transparent_42%)]" />

      <header className="relative z-10 flex h-[clamp(68px,9vh,92px)] shrink-0 items-center justify-between border-b border-white/8 bg-[#080b0f]/95 px-[clamp(22px,3vw,54px)]">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/8 text-sky-400">
            <Clock3 size={24} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              Waktu lokal
            </div>
            <time className="text-[clamp(24px,2.5vw,40px)] font-bold tracking-tight text-white tabular-nums">
              {time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </time>
          </div>
        </div>

        <div className="flex items-center gap-[clamp(14px,2vw,32px)]">
          {currentSlide?.contentType === 'custom' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 mr-2">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-300">
                Catatan:
              </span>
              <button
                onClick={() => handleStageNotesZoom(-1)}
                className="flex h-7 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="Perkecil Catatan"
              >
                A-
              </button>
              <button
                onClick={() => handleStageNotesZoom(1)}
                className="flex h-7 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="Perbesar Catatan"
              >
                A+
              </button>
            </div>
          )}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] ${
              backendConnected
                ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300'
                : 'border-rose-400/25 bg-rose-400/8 text-rose-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${backendConnected ? 'bg-emerald-400' : 'animate-pulse bg-rose-400'}`}
            />
            {backendConnected ? 'Terhubung' : 'Menghubungkan'}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
            <TimerReset className={timer.running ? 'text-amber-300' : 'text-zinc-500'} size={19} />
            <div className="flex flex-col justify-center gap-0.5 leading-none">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 leading-none">
                Durasi ibadah
              </div>
              <span
                className={`font-mono text-[clamp(17px,1.7vw,25px)] font-bold tabular-nums leading-none ${timer.running ? 'text-amber-200' : 'text-zinc-400'}`}
              >
                {formatElapsed(timer.elapsed)}
              </span>
            </div>
          </div>

          <div className={`flex min-w-32 items-center justify-end gap-3 ${runtime.color}`}>
            <span
              className={`h-3 w-3 rounded-full ${runtime.dot} ${status.isLive ? 'animate-pulse' : ''}`}
            />
            <StatusIcon size={20} />
            <span className="text-[clamp(15px,1.4vw,21px)] font-black tracking-[0.18em]">
              {runtime.label}
            </span>
          </div>
        </div>
      </header>

      <section className="relative z-10 flex min-h-0 flex-1 flex-col px-[clamp(26px,5vw,96px)] py-[clamp(20px,3vh,42px)]">
        {status.isLive && currentSlide ? (
          <div
            className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto]"
            aria-label={isBible ? 'Konten Alkitab' : 'Konten lagu'}
          >
            <div className="flex min-h-10 items-center justify-center gap-3">
              {isBible ? (
                <BookOpen className="text-sky-400" size={24} aria-hidden="true" />
              ) : isCustom ? (
                <BookOpen className="text-amber-400" size={24} aria-hidden="true" />
              ) : (
                <Music2 className="text-violet-400" size={24} aria-hidden="true" />
              )}
              <span
                className={`text-[clamp(15px,1.45vw,23px)] font-black uppercase tracking-[0.2em] ${
                  isBible ? 'text-sky-300' : isCustom ? 'text-amber-300' : 'text-violet-300'
                }`}
              >
                {isBible
                  ? reference
                  : isCustom
                    ? 'Catatan Slide Pemateri'
                    : currentSection || currentSlide.sectionLabel || 'Lagu'}
              </span>
              {isBible && currentSlide.bibleVersionCode ? (
                <span className="rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-xs font-black tracking-[0.12em] text-sky-300">
                  {currentSlide.bibleVersionCode}
                </span>
              ) : null}
            </div>

            <div className="flex min-h-0 items-center justify-center overflow-hidden py-[clamp(14px,2vh,30px)] text-center">
              {isCustom ? (
                <p
                  className="mx-auto max-h-full max-w-[1520px] overflow-y-auto px-8 font-extrabold tracking-wide text-amber-100 whitespace-pre-wrap select-none leading-relaxed"
                  style={{ fontSize: `${stageNotesZoom}px` }}
                >
                  {currentSlide.stageNotes || 'Tidak ada catatan untuk slide ini'}
                </p>
              ) : (
                <p
                  data-text-fit={currentFit}
                  className={`mx-auto max-h-full max-w-[1580px] overflow-hidden text-balance font-extrabold tracking-[-0.02em] text-white [text-wrap:balance] ${stageTextFitClass(currentFit)}`}
                >
                  {currentText || currentSlide.stageNotes || 'Konten visual sedang ditayangkan'}
                </p>
              )}
            </div>

            <div className="shrink-0">
              <div className="mb-3 flex items-center gap-4">
                <span className="text-xs font-extrabold tracking-[0.16em] text-zinc-400">
                  SLIDE {currentSlide.slideIndex + 1} /{' '}
                  {Math.max(currentSlide.totalSlides || 1, currentSlide.slideIndex + 1)}
                </span>
                <div
                  role="progressbar"
                  aria-label="Progress slide"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-bold tabular-nums text-zinc-400">
                  {progress}%
                </span>
              </div>

              <div className="min-h-[clamp(96px,15vh,152px)] border-t border-white/8 pt-[clamp(12px,2vh,22px)]">
                {!isCustom && (currentSlide.stageNotes || currentSlide.stageChord) ? (
                  <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    {currentSlide.stageNotes ? (
                      <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-4 py-3">
                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/70">
                          Catatan pemateri
                        </div>
                        <p className="line-clamp-2 text-[clamp(15px,1.3vw,21px)] font-semibold leading-snug text-amber-50">
                          {currentSlide.stageNotes}
                        </p>
                      </div>
                    ) : null}
                    {currentSlide.stageChord ? (
                      <div className="min-w-40 rounded-xl border border-violet-300/20 bg-violet-300/[0.07] px-4 py-3 text-center">
                        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300/70">
                          Chord
                        </div>
                        <div className="font-mono text-[clamp(18px,1.8vw,28px)] font-black text-violet-100">
                          {currentSlide.stageChord}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {nextSlide ? (
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5">
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-black tracking-[0.16em] text-emerald-300">
                      BERIKUTNYA
                    </div>
                    <div className="min-w-0 text-left">
                      {(nextSection || nextSlide.sectionLabel) &&
                      (nextSection || nextSlide.sectionLabel) !== currentSection ? (
                        <div className="mb-1 text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-400/80">
                          {nextSection || nextSlide.sectionLabel}
                        </div>
                      ) : null}
                      <p className="line-clamp-2 text-[clamp(24px,2.65vw,43px)] font-bold leading-[1.18] tracking-[-0.015em] text-zinc-100">
                        {nextText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 py-5 text-zinc-500">
                    <AlertCircle size={18} />
                    <span className="text-sm font-extrabold tracking-[0.18em]">SLIDE TERAKHIR</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-400/15 bg-sky-400/5 text-sky-400/60">
              <Radio size={38} strokeWidth={1.4} />
            </div>
            <div className="text-[clamp(30px,4vw,60px)] font-black tracking-[-0.04em] text-zinc-700">
              SION STAGE
            </div>
            <div className="mt-2 text-sm font-bold uppercase tracking-[0.24em] text-zinc-700">
              Menunggu konten dari operator
            </div>
          </div>
        )}
      </section>

      <footer className="relative z-10 flex h-[clamp(54px,7vh,72px)] shrink-0 items-center justify-between border-t border-white/8 bg-[#080b0f]/96 px-[clamp(22px,3vw,54px)]">
        {!isCustom && song ? (
          <>
            <div className="flex min-w-0 items-center gap-4">
              <span className="rounded-md bg-violet-400/10 px-2.5 py-1 text-sm font-black text-violet-300">
                {song.hymnalCode}
              </span>
              <span className="truncate text-[clamp(16px,1.5vw,23px)] font-bold">{song.title}</span>
              {song.keyNote ? (
                <span className="shrink-0 rounded-md border border-white/10 px-2.5 py-1 text-sm font-bold text-zinc-300">
                  Nada {song.keyNote}
                </span>
              ) : null}
            </div>
            <span className="ml-6 shrink-0 text-sm font-semibold text-zinc-500">
              {song.hymnalName}
            </span>
          </>
        ) : isBible && currentSlide ? (
          <>
            <div className="flex items-center gap-3 text-sky-300">
              <BookOpen size={18} />
              <span className="text-base font-bold">{reference || 'Alkitab'}</span>
              {currentSlide.bibleVersionCode ? (
                <span className="text-sm font-black text-zinc-500">
                  {currentSlide.bibleVersionCode}
                </span>
              ) : null}
            </div>
            <span className="ml-6 truncate text-xs text-zinc-600">
              {currentSlide.bibleCopyright || 'Teks Alkitab'}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Presentasi / Slide Aktif
          </div>
        )}
      </footer>
    </main>
  )
}
