/**
 * Confidence Monitor App
 *
 * Stage-facing display for musicians, singers, and worship leaders.
 * Shows current/next content with extremely readable typography.
 *
 * @module StageDisplayApp
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Clock, Music, Timer, AlertCircle } from 'lucide-react'
import type { ConfidencePayload, ProjectionState } from '../types'

export function StageDisplayApp(): React.JSX.Element {
  const [payload, setPayload] = useState<ConfidencePayload | null>(null)
  const [time, setTime] = useState(new Date())

  // Clock sync
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Listen for confidence updates
  useEffect(() => {
    // Listen for slide updates (legacy compatibility)
    const unsubscribeSlide = window.api.projection.onSlideUpdate((data) => {
      // Build partial payload from legacy slide data
      const slideData = data as {
        text?: string
        sectionLabel?: string
        slideIndex?: number
        nextSlideText?: string
      }
      if (slideData && slideData.text) {
        const text = slideData.text // Ensure string type
        setPayload((prev) => {
          const base = prev || {
            currentSlide: null,
            nextSlide: null,
            currentSection: null,
            nextSection: null,
            song: null,
            clock: time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }),
            timer: { elapsed: 0, running: false },
            status: {
              isLive: false,
              isFrozen: false,
              isBlack: false,
              projectionState: 'CLEAR' as const
            }
          }
          return {
            ...base,
            currentSlide: {
              text: text,
              sectionLabel: slideData.sectionLabel || '',
              slideIndex: slideData.slideIndex ?? 0,
              totalSlides: 1
            },
            nextSlide: slideData.nextSlideText
              ? { text: slideData.nextSlideText, sectionLabel: '' }
              : null,
            currentSection: slideData.sectionLabel || null,
            status: { ...base.status, isLive: true, projectionState: 'LIVE' as const }
          }
        })
      }
    })

    // Listen for state changes
    const unsubscribeState = window.api.projection.onStateChange((state) => {
      setPayload((prev) => {
        const base = prev || {
          currentSlide: null,
          nextSlide: null,
          currentSection: null,
          nextSection: null,
          song: null,
          clock: time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          timer: { elapsed: 0, running: false },
          status: {
            isLive: false,
            isFrozen: false,
            isBlack: false,
            projectionState: 'CLEAR' as const
          }
        }
        return {
          ...base,
          status: {
            isLive: state === 'LIVE' || state === 'FREEZE',
            isFrozen: state === 'FREEZE',
            isBlack: state === 'BLACK',
            projectionState: state as ProjectionState
          }
        }
      })
    })

    // TODO: Add direct confidence channel listener
    // const unsubscribeConfidence = window.api.confidence.onUpdate((data) => {
    //   setPayload(data as ConfidencePayload)
    // })

    // Start heartbeat
    const heartbeatInterval = setInterval(() => {
      window.api.health?.sendHeartbeat('STAGE_DISPLAY')
    }, 1000)

    return () => {
      unsubscribeSlide()
      unsubscribeState()
      clearInterval(heartbeatInterval)
    }
  }, [time])

  // Build local payload from legacy channels (temporary)
  const displayPayload = useMemo<ConfidencePayload>(() => {
    if (payload) return payload

    // Fallback: build from current state
    return {
      currentSlide: null,
      nextSlide: null,
      currentSection: null,
      nextSection: null,
      song: null,
      clock: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timer: { elapsed: 0, running: false },
      status: { isLive: false, isFrozen: false, isBlack: false, projectionState: 'CLEAR' }
    }
  }, [payload, time])

  const { currentSlide, nextSlide, currentSection, nextSection, song, timer, status } =
    displayPayload

  // Format elapsed time
  const formatElapsed = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans antialiased">
      {/* ══════════════════════════════════════════════════════════ */}
      {/* TOP BAR - Clock, Timer, Status */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="h-24 flex items-center justify-between px-12 border-b border-white/10 bg-zinc-900/40">
        {/* Clock */}
        <div className="flex items-center gap-6">
          <Clock className="text-status-info" size={36} />
          <span className="text-5xl font-bold tracking-tight tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* Timer & Status */}
        <div className="flex items-center gap-8">
          {/* Timer */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5">
            <Timer
              size={20}
              className={timer.running ? 'text-status-warning animate-pulse' : 'text-zinc-500'}
            />
            <span
              className={`text-2xl font-mono tabular-nums ${timer.running ? 'text-status-warning' : 'text-zinc-400'}`}
            >
              {formatElapsed(timer.elapsed)}
            </span>
          </div>

          {/* Live Status */}
          <div className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full ${status.isLive ? 'bg-status-error animate-pulse' : 'bg-zinc-700'}`}
            />
            <span
              className={`text-2xl font-black uppercase tracking-[0.2em] ${status.isLive ? 'text-status-error' : 'text-zinc-500'}`}
            >
              {status.isLive ? 'LIVE' : status.isBlack ? 'BLACK' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - Current & Next */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-16 text-center">
        {status.isLive && currentSlide ? (
          <div className="w-full max-w-7xl space-y-10">
            {/* Section Label */}
            {currentSection && (
              <div className="flex items-center justify-center gap-4">
                <Music size={28} className="text-status-accent" />
                <span className="text-status-accent text-3xl font-black uppercase tracking-[0.3em]">
                  {currentSection}
                </span>
              </div>
            )}

            {/* Current Slide - LARGE */}
            <div className="space-y-2">
              <p className="text-7xl lg:text-8xl xl:text-9xl font-bold leading-tight whitespace-pre-line drop-shadow-2xl">
                {currentSlide.text}
              </p>
              <p className="text-zinc-500 text-xl font-medium">
                {currentSlide.slideIndex + 1} / {currentSlide.totalSlides}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 pt-8" />

            {/* Next Slide - Smaller */}
            {nextSlide ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-zinc-500 text-xl font-bold uppercase tracking-[0.15em]">
                    NEXT
                  </span>
                  {nextSection && nextSection !== currentSection && (
                    <span className="text-status-accent text-lg font-bold uppercase tracking-[0.1em]">
                      ({nextSection})
                    </span>
                  )}
                </div>
                <p className="text-4xl lg:text-5xl text-zinc-400 font-medium leading-relaxed italic line-clamp-3">
                  {nextSlide.text}
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 text-zinc-600">
                <AlertCircle size={20} />
                <span className="text-xl font-medium">Last slide</span>
              </div>
            )}
          </div>
        ) : (
          /* Standby Screen */
          <div className="text-center space-y-6">
            <div className="text-zinc-800 text-7xl font-black uppercase tracking-tighter select-none">
              SION MEDIA
            </div>
            <div className="text-zinc-600 text-xl font-medium">Confidence Monitor</div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* FOOTER - Song Info */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="h-20 bg-zinc-900/60 border-t border-white/5 flex items-center justify-between px-12">
        {song ? (
          <>
            <div className="flex items-center gap-4">
              <span className="text-status-accent text-lg font-bold">{song.hymnalCode}</span>
              <span className="text-white text-xl font-semibold">{song.title}</span>
              {song.keyNote && (
                <span className="text-zinc-400 text-lg font-medium ml-2">Key: {song.keyNote}</span>
              )}
            </div>
            <div className="flex items-center gap-6 text-zinc-400 text-sm">
              <div className="text-zinc-500 text-lg font-medium">{song.hymnalName}</div>
              {song.composer && <span className="text-zinc-400">Composer: {song.composer}</span>}
              {song.author && <span className="text-zinc-400">Arranger: {song.author}</span>}
            </div>
          </>
        ) : (
          <div className="text-zinc-600 text-lg font-medium">No song loaded</div>
        )}
      </div>
    </div>
  )
}
