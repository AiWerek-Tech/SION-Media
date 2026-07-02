/**
 * BibleHeroHeader — Premium hero area for Bible workspace.
 *
 * "Alkitab Interaktif" title with cosmic blue gradient background,
 * version badge, chapter selector, and fullscreen button.
 */

import React from 'react'
import { ChevronLeft, ChevronRight, Expand, Sparkles } from 'lucide-react'
import type { BibleBook, BibleVersion } from '../../hooks/useBibleReader'

interface BibleHeroHeaderProps {
  selectedBook: BibleBook | null
  selectedChapter: number
  selectedVersion: BibleVersion | null
  versions: BibleVersion[]
  onSelectVersion: (versionCode: string) => void
  onPrevChapter: () => void
  onNextChapter: () => void
  onFullscreen: () => void
}

export function BibleHeroHeader({
  selectedBook,
  selectedChapter,
  selectedVersion,
  versions,
  onSelectVersion,
  onPrevChapter,
  onNextChapter,
  onFullscreen
}: BibleHeroHeaderProps): React.JSX.Element {
  return (
    <div className="bible-hero">
      {/* Cosmic background glow */}
      <div className="bible-hero__glow" />

      {/* Title area */}
      <div className="bible-hero__titles">
        <h1 className="bible-hero__heading">
          <Sparkles size={20} className="bible-hero__sparkle" />
          Alkitab Interaktif
        </h1>
        <p className="bible-hero__subtitle">
          {selectedVersion
            ? `${selectedVersion.name} (${selectedVersion.shortName})`
            : 'Memuat Alkitab...'}
        </p>
      </div>

      {/* Controls row */}
      <div className="bible-hero__controls">
        {/* Version badge */}
        <div className="bible-hero__version-group">
          {versions.map((ver) => (
            <button
              key={ver.versionCode}
              onClick={() => onSelectVersion(ver.versionCode)}
              className={`bible-hero__version-badge ${selectedVersion?.versionCode === ver.versionCode ? 'is-active' : ''}`}
              title={ver.name}
            >
              <span className="bible-hero__version-code">{ver.shortName}</span>
            </button>
          ))}
          {selectedVersion && (
            <div className="bible-hero__version-meta">
              <strong>{selectedVersion.name}</strong>
              <span>
                {selectedVersion.language === 'id'
                  ? 'Terjemahan Indonesia'
                  : selectedVersion.language}
              </span>
            </div>
          )}
        </div>

        {/* Chapter navigator */}
        <div className="bible-hero__chapter-nav">
          <button
            onClick={onPrevChapter}
            disabled={!selectedBook || selectedChapter <= 1}
            className="bible-hero__nav-btn"
            title="Pasal Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="bible-hero__chapter-pill">
            {selectedBook ? `${selectedBook.name} ${selectedChapter}` : 'Pilih Kitab'}
          </span>
          <button
            onClick={onNextChapter}
            disabled={!selectedBook || selectedChapter >= (selectedBook.chapters ?? 0)}
            className="bible-hero__nav-btn"
            title="Pasal Berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={onFullscreen}
          className="bible-hero__fullscreen-btn"
          title="Membaca Layar Penuh"
        >
          <Expand size={14} />
          <span>Membaca Layar Penuh</span>
        </button>
      </div>
    </div>
  )
}
