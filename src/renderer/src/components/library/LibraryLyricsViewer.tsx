import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Song } from '../../types'
import { generateSlides } from '../../engine/slideEngine'

export function LibraryLyricsViewer({
  song,
  onClose
}: {
  song: Song
  onClose: () => void
}): React.JSX.Element {
  const slides = useMemo(
    () => generateSlides(song.id, song.lyrics_raw || ''),
    [song.id, song.lyrics_raw]
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.code === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.code === 'ArrowRight' || e.code === 'PageDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, Math.max(0, slides.length - 1)))
        return
      }

      if (e.code === 'ArrowLeft' || e.code === 'PageUp') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, slides.length])

  const total = Math.max(1, slides.length)
  const currentText = slides[index]?.text || song.lyrics_raw || ''

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

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-[12px] font-black text-white/85 backdrop-blur">
          {index + 1}/{total}
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
        D {index + 1}/{total}
      </div>
    </div>
  )
}
