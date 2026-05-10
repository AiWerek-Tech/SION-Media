import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, Minus, Plus, Link2 } from 'lucide-react'
import type { Song } from '../../types'
import { useAppStore } from '../../store/useAppStore'

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

type LyricsBlock = {
  label: string
  lines: string[]
}

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

    // Keep empty line inside a block as stanza separator hint, but we'll compact later.
    currentLines.push(trimmed)
  }

  if (currentLines.length > 0) blocks.push({ label: currentLabel, lines: currentLines })

  // Normalize: trim leading/trailing empty lines per block + collapse repeated empties.
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

function isReffLabel(label: string): boolean {
  const l = (label || '').toLowerCase()
  return l.includes('reff') || l.includes('ref') || l.includes('chorus')
}

function blockText(block: LyricsBlock): string {
  return block.lines.filter((l) => l !== '').join('\n')
}

function splitIntoStanzas(lines: string[]): string[] {
  const stanzas: string[] = []
  let current: string[] = []

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length > 0) {
        stanzas.push(current.join('\n'))
        current = []
      }
      continue
    }
    current.push(line)
  }

  if (current.length > 0) stanzas.push(current.join('\n'))
  return stanzas.filter((s) => s.trim().length > 0)
}

function buildStanzaPages(lyricsRaw: string): string[] {
  const blocks = parseLyricsBlocks(lyricsRaw)
  if (blocks.length === 0) return []

  const reffBlocks = blocks.filter((b) => isReffLabel(b.label))
  const reffStanzas = reffBlocks.flatMap((b) => splitIntoStanzas(b.lines))
  const reffText = reffStanzas.length > 0 ? reffStanzas.join('\n\n') : ''

  const stanzaBlocks = blocks.filter((b) => !isReffLabel(b.label))

  // If the song is only Reff/Chorus, show those blocks as pages.
  if (stanzaBlocks.length === 0) {
    return reffStanzas.length > 0 ? reffStanzas : reffBlocks.map((b) => blockText(b))
  }

  const verseStanzas = stanzaBlocks.flatMap((b) => splitIntoStanzas(b.lines))

  return verseStanzas.map((verse) => {
    if (!reffText) return verse
    return `${verse}\n\nReff:\n${reffText}`
  })
}

export function LibraryLyricsViewer({
  song,
  onClose
}: {
  song: Song
  onClose: () => void
}): React.JSX.Element {
  const pages = useMemo(() => buildStanzaPages(song.lyrics_raw || ''), [song.lyrics_raw])
  const [index, setIndex] = useState(0)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('sion:lyric-font-size')
    return saved ? parseInt(saved, 10) : 32
  })
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed] = useState(1)
  const [linkedSongs, setLinkedSongs] = useState<Song[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollInterval = useRef<ReturnType<typeof setInterval>>(undefined)

  const setLyricsFullscreen = useAppStore((s) => s.setLyricsFullscreen)

  useEffect(() => {
    localStorage.setItem('sion:lyric-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [index])

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

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    // Focus trap: focus back button on mount
    const backBtn = document.querySelector('[data-lyrics-back]') as HTMLElement | null
    backBtn?.focus()
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const close = useCallback(() => {
    setLyricsFullscreen(false)
    onClose()
  }, [onClose, setLyricsFullscreen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        e.preventDefault()
        close()
        return
      }

      if (e.code === 'Space') {
        e.preventDefault()
        setAutoScroll((v) => !v)
        return
      }

      if (e.code === 'ArrowDown' || e.code === 'PageDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, Math.max(0, pages.length - 1)))
        return
      }

      if (e.code === 'ArrowUp' || e.code === 'PageUp') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
        return
      }

      if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault()
        setFontSize((s) => Math.min(s + 2, 48))
        return
      }

      if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault()
        setFontSize((s) => Math.max(s - 2, 14))
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, pages.length])

  const total = Math.max(1, pages.length)
  const currentText = pages[index] || song.lyrics_raw || ''
  const badgeText = [song.key_note, song.time_signature].filter(Boolean).join(' ')

  const titleId = song.title
  const titleEn = song.title_en

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg-base">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(circle_at_76%_72%,rgba(168,85,247,0.14),transparent_46%),linear-gradient(180deg,rgba(8,10,16,0.78),rgba(7,9,14,0.98))]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent,rgba(0,0,0,0.45))]" />

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_40%)]" />

      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between px-5 pt-5">
        <div className="flex items-start gap-4 min-w-0">
          <button
            data-lyrics-back
            onClick={close}
            className="no-drag inline-flex h-11 items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-[12px] font-black text-white/85 backdrop-blur-md shadow-[0_10px_26px_rgba(0,0,0,0.35)] hover:bg-white/[0.08] hover:text-white transition-all"
            aria-label="Kembali"
            title="Kembali (Esc)"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
              <span className="font-mono tracking-[0.12em] uppercase">
                {normalizeDisplayNumber(song.number)}
              </span>
              {badgeText ? (
                <span className="rounded-full border border-white/[0.10] bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-white/75 backdrop-blur">
                  {badgeText}
                </span>
              ) : null}
            </div>

            <div className="mt-1 truncate text-[18px] font-black tracking-[-0.02em] text-white/92">
              {titleId}
            </div>

            {titleEn ? (
              <div className="truncate text-[12px] font-semibold text-white/55">{titleEn}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="no-drag flex items-center gap-1.5 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-2 py-2 backdrop-blur-md shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
            <button
              onClick={() => setFontSize((s) => Math.max(14, s - 2))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.10] hover:text-white transition-all"
              aria-label="Perkecil font"
              title="Font -"
            >
              <Minus size={16} />
            </button>

            <input
              className="w-[140px] accent-white/80"
              type="range"
              min={14}
              max={48}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              aria-label="Ukuran font"
            />

            <button
              onClick={() => setFontSize((s) => Math.min(48, s + 2))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white/80 hover:bg-white/[0.10] hover:text-white transition-all"
              aria-label="Perbesar font"
              title="Font +"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => setAutoScroll((v) => !v)}
            className="no-drag inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.06] text-white/85 backdrop-blur-md shadow-[0_10px_26px_rgba(0,0,0,0.28)] hover:bg-white/[0.08] transition-all"
            aria-label={autoScroll ? 'Pause auto-scroll' : 'Play auto-scroll'}
            title="Play/Pause (Space)"
          >
            {autoScroll ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-[12px] font-black text-white/85 backdrop-blur-md shadow-[0_10px_26px_rgba(0,0,0,0.18)]">
            {index + 1}/{total}
          </div>
        </div>
      </div>

      {/* Right navigation */}
      <div className="absolute right-6 top-1/2 z-10 -translate-y-1/2">
        <div className="no-drag flex flex-col items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === index
                  ? 'bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.09)]'
                  : 'bg-white/25 hover:bg-white/45'
              }`}
              aria-label={`Bait ${i + 1}`}
              title={`Bait ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Center lyrics */}
      <div className="absolute inset-0 flex items-center justify-center px-[7%] py-[10%]">
        <div className="max-w-[1280px] w-full">
          {currentText.trim() ? (
            <div
              ref={scrollRef}
              className="max-h-[70vh] overflow-hidden"
              style={{
                WebkitMaskImage:
                  'linear-gradient(180deg, transparent, #000 10%, #000 88%, transparent)'
              }}
            >
              <div
                className="text-white/95 font-black tracking-[-0.02em] drop-shadow-[0_10px_28px_rgba(0,0,0,0.70)] whitespace-pre-line"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.14 }}
              >
                {currentText}
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/[0.10] bg-white/[0.06] backdrop-blur-md p-10 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              <div className="text-[18px] font-black text-white/90">Lirik belum tersedia</div>
              <div className="mt-2 text-[12px] font-semibold text-white/55">
                Data lagu ini belum memiliki lirik. Silakan lengkapi di Song Editor atau lakukan
                sync.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: linked songs */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center px-6">
        {linkedSongs.length > 0 ? (
          <div className="no-drag flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-[12px] font-semibold text-white/70 backdrop-blur-md shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
            <Link2 size={16} className="text-white/70" />
            <span>Versi lain tersedia:</span>
            <span className="font-black text-white/85">{linkedSongs.length}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
