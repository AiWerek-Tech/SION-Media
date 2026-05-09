import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Rewind,
  Maximize2,
  Minimize2
} from 'lucide-react'
import type { Song } from '../../types'
import { useAppStore } from '../../store/useAppStore'

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
  onClose,
  songs,
  onSelectSong
}: {
  song: Song
  onClose: () => void
  songs: Song[]
  onSelectSong: (song: Song) => void
}): React.JSX.Element {
  const pages = useMemo(() => buildStanzaPages(song.lyrics_raw || ''), [song.lyrics_raw])
  const [index, setIndex] = useState(0)
  const { isLyricsFullscreen, setLyricsFullscreen } = useAppStore()

  const songIndex = useMemo(() => songs.findIndex((s) => s.id === song.id), [songs, song.id])
  const prevSong = songIndex > 0 ? songs[songIndex - 1] : null
  const nextSong = songIndex >= 0 && songIndex < songs.length - 1 ? songs[songIndex + 1] : null

  const toggleFullscreen = async (): Promise<void> => {
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
  }

  useEffect(() => {
    const onFsChange = (): void => {
      setLyricsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [setLyricsFullscreen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
          setLyricsFullscreen(false)
        }
        onClose()
        return
      }

      if (e.code === 'F11') {
        e.preventDefault()
        const isFs = Boolean(document.fullscreenElement)
        if (!isFs) {
          document.documentElement.requestFullscreen().catch(() => {})
          setLyricsFullscreen(true)
        } else {
          document.exitFullscreen().catch(() => {})
          setLyricsFullscreen(false)
        }
        return
      }

      if (
        e.code === 'ArrowDown' ||
        e.code === 'PageDown' ||
        e.code === 'ArrowRight' ||
        e.code === 'Space'
      ) {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, Math.max(0, pages.length - 1)))
        return
      }

      if (e.code === 'ArrowUp' || e.code === 'PageUp' || e.code === 'ArrowLeft') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, pages.length, setLyricsFullscreen])

  const total = Math.max(1, pages.length)
  const currentText = pages[index] || song.lyrics_raw || ''
  const badgeText = [song.key_note, song.time_signature].filter(Boolean).join(' ')

  return (
    <div className="absolute inset-0 z-[80] overflow-hidden bg-bg-base">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.22),transparent_44%),radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.18),transparent_46%),linear-gradient(180deg,rgba(8,10,16,0.74),rgba(7,9,14,0.96))]" />

      <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55))]" />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="no-drag inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 text-[12px] font-bold text-white/80 backdrop-blur hover:bg-white/[0.08] hover:text-white transition-all"
            aria-label="Kembali"
            title="Kembali (Esc)"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>

          <button
            onClick={() => prevSong && onSelectSong(prevSong)}
            disabled={!prevSong}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.05] text-white/80 backdrop-blur hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-40"
            aria-label="Lagu sebelumnya"
            title="Lagu sebelumnya"
          >
            <Rewind size={16} />
          </button>

          <button
            onClick={() => nextSong && onSelectSong(nextSong)}
            disabled={!nextSong}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.05] text-white/80 backdrop-blur hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-40"
            aria-label="Lagu berikutnya"
            title="Lagu berikutnya"
          >
            <FastForward size={16} />
          </button>

          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-white/75">
              {song.number ? `${song.number} · ` : ''}
              {song.title}
            </div>
            <div className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
              {song.author || song.composer || song.key_note
                ? [song.author, song.composer, song.key_note].filter(Boolean).join(' · ')
                : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void toggleFullscreen()}
            className="no-drag inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.05] text-white/80 backdrop-blur hover:bg-white/[0.08] hover:text-white transition-all"
            aria-label="Fullscreen"
            title="Fullscreen (F11)"
          >
            {isLyricsFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[12px] font-black text-white/85 backdrop-blur">
            {index + 1}/{total}
          </div>
        </div>
      </div>

      {/* Page markers */}
      <div className="absolute right-5 top-1/2 z-10 -translate-y-1/2">
        <div className="flex flex-col items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-3 w-3 rounded-full transition-all ${
                i === index
                  ? 'bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.10)]'
                  : 'bg-white/25 hover:bg-white/45'
              }`}
              aria-label={`Halaman ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main lyrics */}
      <div className="absolute inset-0 flex items-center justify-center px-[7%] py-[10%]">
        <div className="max-w-[1200px] w-full">
          <div className="text-white font-black leading-[1.08] tracking-[-0.02em] drop-shadow-[0_10px_26px_rgba(0,0,0,0.72)] whitespace-pre-line text-left text-[clamp(28px,4.2vw,58px)]">
            {currentText}
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-3">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="no-drag inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.05] text-white/85 backdrop-blur hover:bg-white/[0.08] transition-all disabled:opacity-40"
          disabled={index <= 0}
          aria-label="Sebelumnya"
          title="Sebelumnya (← / PageUp)"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="h-1.5 w-[min(520px,62vw)] overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white/70"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <button
          onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
          className="no-drag inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.05] text-white/85 backdrop-blur hover:bg-white/[0.08] transition-all disabled:opacity-40"
          disabled={index >= total - 1}
          aria-label="Berikutnya"
          title="Berikutnya (→ / PageDown)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Corner count like sample */}
      <div className="absolute left-6 top-[92px] z-10 text-[42px] font-black text-white/80">
        {index + 1}/{total}
      </div>

      <div className="absolute right-6 top-[92px] z-10 rounded-2xl bg-white/8 border border-white/[0.10] px-4 py-2 text-[34px] font-black text-status-error backdrop-blur">
        {badgeText ? `${badgeText} ${index + 1}/${total}` : `${index + 1}/${total}`}
      </div>
    </div>
  )
}
