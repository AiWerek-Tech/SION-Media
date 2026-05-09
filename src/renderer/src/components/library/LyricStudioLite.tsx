/**
 * LyricStudioLite — Premium lyric viewer for personal practice.
 * Features: Auto-scroll, font-size slider, linked songs display.
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Play,
  Pause,
  Minus,
  Plus,
  Link2,
  BookOpen,
  Music,
  Maximize2,
  Minimize2
} from 'lucide-react'
import type { Song } from '../../types'
import { useAppStore } from '../../store/useAppStore'
import { getHymnalColor } from '../../utils/hymnal-colors'

interface LyricStudioProps {
  song: Song
  onClose: () => void
  onSelectLinkedSong?: (song: Song) => void
}

interface LyricsBlock {
  label: string
  lines: string[]
}

// Parse lyrics into blocks
function parseLyricsBlocks(lyricsRaw: string): LyricsBlock[] {
  const blocks: LyricsBlock[] = []
  let currentLabel = ''
  let currentLines: string[] = []

  const lines = (lyricsRaw || '').replace(/\r\n/g, '\n').split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    const sectionMatch = trimmed.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })
      currentLabel = sectionMatch[1]
      currentLines = []
      continue
    }

    if (trimmed === '---') {
      if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })
      currentLines = []
      continue
    }

    currentLines.push(trimmed)
  }

  if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })

  // Normalize
  return blocks
    .map((b) => {
      const normalized: string[] = []
      for (const ln of b.lines) {
        const v = ln.trim()
        if (v === '' && normalized[normalized.length - 1] === '') continue
        normalized.push(v)
      }
      while (normalized[0] === '') normalized.shift()
      while (normalized[normalized.length - 1] === '') normalized.pop()

      return { ...b, lines: normalized }
    })
    .filter((b) => b.lines.length > 0)
}

export function LyricStudioLite({
  song,
  onClose,
  onSelectLinkedSong
}: LyricStudioProps): React.JSX.Element {
  const { isLyricsFullscreen, setLyricsFullscreen } = useAppStore()
  const blocks = useMemo(() => parseLyricsBlocks(song.lyrics_raw || ''), [song.lyrics_raw])
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('sion:lyric-font-size')
    return saved ? parseInt(saved, 10) : 24
  })
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const [linkedSongs, setLinkedSongs] = useState<Song[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollInterval = useRef<ReturnType<typeof setInterval>>(undefined)

  // Load linked songs
  useEffect(() => {
    async function loadLinkedSongs(): Promise<void> {
      try {
        const relations = (await window.api.songs.getRelations(song.id)) as Array<{
          id: number
          number: string
          title: string
          hymnal_code: string
        }>
        const linked = relations.map(
          (r) =>
            ({
              id: r.id,
              number: r.number,
              title: r.title,
              hymnal_code: r.hymnal_code
            }) as Song
        )
        setLinkedSongs(linked)
      } catch {
        setLinkedSongs([])
      }
    }
    loadLinkedSongs()
  }, [song.id])

  // Save font size preference
  useEffect(() => {
    localStorage.setItem('sion:lyric-font-size', String(fontSize))
  }, [fontSize])

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollInterval.current = setInterval(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += scrollSpeed * 0.5
        }
      }, 16)
    } else {
      if (scrollInterval.current) clearInterval(scrollInterval.current)
    }
    return () => {
      if (scrollInterval.current) clearInterval(scrollInterval.current)
    }
  }, [autoScroll, scrollSpeed])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const isFs = Boolean(document.fullscreenElement)
    try {
      if (!isFs) {
        await document.documentElement.requestFullscreen()
        setLyricsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setLyricsFullscreen(false)
      }
    } catch {
      setLyricsFullscreen(!isLyricsFullscreen)
    }
  }, [isLyricsFullscreen, setLyricsFullscreen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
          setLyricsFullscreen(false)
        }
        onClose()
      } else if (e.key === ' ') {
        e.preventDefault()
        setAutoScroll((v) => !v)
      } else if (e.key === '+' || e.key === '=') {
        setFontSize((s) => Math.min(s + 2, 48))
      } else if (e.key === '-') {
        setFontSize((s) => Math.max(s - 2, 14))
      } else if (e.key === 'F11') {
        e.preventDefault()
        void toggleFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, setLyricsFullscreen, toggleFullscreen])

  const accentColor = getHymnalColor(song.hymnal_code || 'LS')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-[100] overflow-hidden bg-bg-base"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${accentColor.replace('hsl', 'hsla').replace(')', ', 0.15)')}, transparent 50%),
                        radial-gradient(ellipse at 70% 80%, rgba(59, 130, 246, 0.1), transparent 50%),
                        linear-gradient(180deg, rgba(8, 10, 16, 0.95), rgba(7, 9, 14, 0.98))`
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-10 bg-gradient-to-b from-bg-base/90 to-transparent">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-xl border border-border-default/30 bg-surface-2/60 text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all flex items-center gap-2 text-[12px] font-semibold"
          >
            <ChevronLeft size={16} />
            Kembali
          </button>

          {/* Song info */}
          <div className="flex items-center gap-2">
            <div
              className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 border font-mono"
              style={{
                backgroundColor: accentColor.replace('hsl', 'hsla').replace(')', ', 0.15)'),
                borderColor: accentColor.replace('hsl', 'hsla').replace(')', ', 0.3)')
              }}
            >
              <span
                className="text-[9px] uppercase font-bold opacity-60"
                style={{ color: accentColor }}
              >
                {song.hymnal_code || 'LS'}
              </span>
              <span className="text-[13px] font-bold" style={{ color: accentColor }}>
                {song.number || '—'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text-primary truncate">
                {song.title}
              </div>
              {song.alternate_title && (
                <div className="text-[11px] text-text-muted italic truncate">
                  {song.alternate_title}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Metadata badges */}
          {song.key_note && (
            <span className="px-2 py-1 rounded-lg bg-surface-2/60 border border-border-default/30 text-[11px] font-medium text-text-muted">
              {song.key_note}
            </span>
          )}
          {song.tempo && (
            <span className="px-2 py-1 rounded-lg bg-surface-2/60 border border-border-default/30 text-[11px] font-medium text-text-muted">
              {song.tempo}
            </span>
          )}

          <button
            onClick={() => void toggleFullscreen()}
            className="h-9 w-9 rounded-xl border border-border-default/30 bg-surface-2/60 text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all flex items-center justify-center"
            title="Fullscreen (F11)"
          >
            {isLyricsFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main lyrics area */}
      <div
        ref={scrollRef}
        className="absolute inset-0 pt-16 pb-24 overflow-y-auto scrollbar-thin px-[10%]"
      >
        <div className="max-w-[900px] mx-auto py-8">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh]">
              <Music size={48} className="text-text-disabled mb-4" />
              <div className="text-text-muted text-sm">Lirik tidak tersedia</div>
              <div className="text-text-disabled text-[11px] mt-1">
                Tambahkan lirik melalui mode Manajemen
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {blocks.map((block, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  className="relative"
                >
                  {block.label && (
                    <div
                      className="text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: accentColor }}
                    >
                      {block.label}
                    </div>
                  )}
                  <div
                    className="text-text-primary leading-relaxed whitespace-pre-line"
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                  >
                    {block.lines.join('\n')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-10 bg-gradient-to-t from-bg-base/95 to-transparent">
        {/* Left: Font size controls */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted font-medium">Font</span>
          <button
            onClick={() => setFontSize((s) => Math.max(s - 2, 14))}
            className="h-8 w-8 rounded-lg border border-border-default/30 bg-surface-2/60 text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all flex items-center justify-center"
          >
            <Minus size={14} />
          </button>
          <span className="text-[12px] font-mono text-text-primary w-8 text-center">
            {fontSize}
          </span>
          <button
            onClick={() => setFontSize((s) => Math.min(s + 2, 48))}
            className="h-8 w-8 rounded-lg border border-border-default/30 bg-surface-2/60 text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all flex items-center justify-center"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Center: Auto-scroll controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`h-10 px-4 rounded-xl border flex items-center gap-2 text-[12px] font-semibold transition-all ${
              autoScroll
                ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary'
                : 'bg-surface-2/60 border-border-default/30 text-text-secondary hover:text-text-primary hover:bg-surface-3/60'
            }`}
          >
            {autoScroll ? <Pause size={14} /> : <Play size={14} />}
            {autoScroll ? 'Pause' : 'Auto-scroll'}
          </button>
          {autoScroll && (
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
              className="w-24 accent-brand-primary"
              title="Scroll speed"
            />
          )}
        </div>

        {/* Right: Linked songs */}
        {linkedSongs.length > 0 && (
          <div className="flex items-center gap-2">
            <Link2 size={14} className="text-text-muted" />
            <span className="text-[11px] text-text-muted">Terkait:</span>
            <div className="flex items-center gap-1">
              {linkedSongs.slice(0, 3).map((ls) => (
                <button
                  key={ls.id}
                  onClick={() => onSelectLinkedSong?.(ls)}
                  className="h-7 px-2 rounded-lg bg-surface-2/60 border border-border-default/30 text-[10px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all flex items-center gap-1"
                >
                  <BookOpen size={10} />
                  {ls.hymnal_code} {ls.number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
