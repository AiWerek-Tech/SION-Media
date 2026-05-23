/**
 * LyricsZoomControl — compact lyrics font size control for scene strip
 * Range: 70%–150%, step 10% via buttons, 1% via slider
 * Keyboard: Ctrl+/- to step, Ctrl+0 to reset
 */
import React from 'react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'

export function LyricsZoomControl(): React.JSX.Element {
  const {
    lyricsFontSizePercent,
    increaseLyricsFontSize,
    decreaseLyricsFontSize,
    resetLyricsFontSize,
    setLyricsFontSize
  } = useProjectionStore()

  const pct = lyricsFontSizePercent
  const fillPct = ((pct - 70) / 80) * 100
  const isDefault = pct === 100

  return (
    <div className="flex items-center gap-1.5" title="Zoom lirik (Ctrl+/−/0)">
      {/* A− */}
      <button
        onClick={decreaseLyricsFontSize}
        disabled={pct <= 70}
        className="scene-strip__icon-btn"
        style={{ width: 26, height: 26, fontSize: 11, fontWeight: 800 }}
        title="Perkecil teks (Ctrl+−)"
        aria-label="Perkecil teks"
      >
        A<sup style={{ fontSize: 7, lineHeight: 0 }}>−</sup>
      </button>

      {/* Slider */}
      <input
        type="range"
        min={70}
        max={150}
        step={1}
        value={pct}
        onChange={(e) => setLyricsFontSize(Number(e.target.value))}
        className="w-16 h-1 rounded-full cursor-pointer"
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          background: `linear-gradient(to right,
            var(--color-brand-primary) 0%,
            var(--color-brand-primary) ${fillPct}%,
            rgba(255,255,255,0.1) ${fillPct}%,
            rgba(255,255,255,0.1) 100%)`
        }}
        title={`${pct}% — drag untuk ubah`}
        aria-label="Zoom lirik"
        aria-valuemin={70}
        aria-valuemax={150}
        aria-valuenow={pct}
      />

      {/* Percentage — click to reset */}
      <button
        onClick={resetLyricsFontSize}
        className={`inline-flex items-center justify-center rounded-md text-[10px] font-bold border transition-all ${
          isDefault
            ? 'bg-transparent border-transparent text-text-disabled hover:text-text-muted hover:bg-white/[0.04] hover:border-white/[0.06]'
            : 'bg-brand-primary/10 border-brand-primary/25 text-brand-primary hover:bg-brand-primary/15'
        }`}
        style={{ height: 26, minWidth: 36, padding: '0 6px' }}
        title="Reset zoom ke 100% (Ctrl+0)"
        aria-label="Reset zoom"
      >
        {pct}%
      </button>

      {/* A+ */}
      <button
        onClick={increaseLyricsFontSize}
        disabled={pct >= 150}
        className="scene-strip__icon-btn"
        style={{ width: 26, height: 26, fontSize: 11, fontWeight: 800 }}
        title="Perbesar teks (Ctrl++)"
        aria-label="Perbesar teks"
      >
        A<sup style={{ fontSize: 7, lineHeight: 0 }}>+</sup>
      </button>
    </div>
  )
}
