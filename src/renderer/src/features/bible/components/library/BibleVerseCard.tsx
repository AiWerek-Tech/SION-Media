/**
 * BibleVerseCard — Premium verse card for Bible reading.
 *
 * Rounded glassmorphism card with verse number badge, readable text,
 * hover quick actions (Preview / Live / +Playlist / ⋮), note/highlight markers.
 */

import React from 'react'
import { MonitorPlay, Play, Plus, MoreVertical } from 'lucide-react'
import type { BibleVerse } from '../../hooks/useBibleReader'

interface BibleVerseCardProps {
  verse: BibleVerse
  isSelected: boolean
  isInspected: boolean
  highlightColor: string
  hasNote: boolean
  onClickVerse: () => void
  onInspect: () => void
  onPreview: () => void
  onLive: () => void
  onAddPlaylist: () => void
}

function getHighlightClasses(color: string): { card: string; indicator: string } {
  if (!color) {
    return {
      card: '',
      indicator: ''
    }
  }
  switch (color) {
    case 'yellow':
      return {
        card: 'bible-verse-card--highlight-yellow',
        indicator: 'bg-yellow-500'
      }
    case 'green':
      return {
        card: 'bible-verse-card--highlight-green',
        indicator: 'bg-green-500'
      }
    case 'blue':
      return {
        card: 'bible-verse-card--highlight-blue',
        indicator: 'bg-blue-500'
      }
    case 'pink':
      return {
        card: 'bible-verse-card--highlight-pink',
        indicator: 'bg-pink-500'
      }
    case 'orange':
      return {
        card: 'bible-verse-card--highlight-orange',
        indicator: 'bg-orange-500'
      }
    case 'purple':
      return {
        card: 'bible-verse-card--highlight-purple',
        indicator: 'bg-purple-500'
      }
    default:
      return { card: '', indicator: '' }
  }
}

export function BibleVerseCard({
  verse,
  isSelected,
  isInspected,
  highlightColor,
  hasNote,
  onClickVerse,
  onInspect,
  onPreview,
  onLive,
  onAddPlaylist
}: BibleVerseCardProps): React.JSX.Element {
  const hl = getHighlightClasses(highlightColor)

  return (
    <div
      onClick={() => {
        onClickVerse()
        onInspect()
      }}
      className={`bible-verse-card ${hl.card} ${isSelected ? 'is-selected' : ''} ${isInspected ? 'is-inspected' : ''}`}
    >
      {/* Verse number badge */}
      <div
        className="bible-verse-card__badge"
        onClick={(e) => {
          e.stopPropagation()
          onClickVerse()
        }}
      >
        <span>{verse.verse}</span>
      </div>

      {/* Verse text */}
      <div className="bible-verse-card__body">
        <div className="bible-verse-card__text">{verse.text}</div>

        {/* Markers row */}
        {(hasNote || highlightColor) && (
          <div className="bible-verse-card__markers">
            {hasNote && <span className="bible-verse-card__note-badge">CATATAN</span>}
            {highlightColor && <span className={`bible-verse-card__color-dot ${hl.indicator}`} />}
          </div>
        )}
      </div>

      {/* Quick actions — visible on hover */}
      <div className="bible-verse-card__actions" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onPreview}
          className="bible-verse-card__action-btn"
          title="Kirim ke Preview"
        >
          <MonitorPlay size={13} />
          <span>Preview</span>
        </button>
        <button
          onClick={onLive}
          className="bible-verse-card__action-btn bible-verse-card__action-btn--live"
          title="Tayangkan Live"
        >
          <Play size={13} />
          <span>Live</span>
        </button>
        <button
          onClick={onAddPlaylist}
          className="bible-verse-card__action-btn"
          title="Tambah ke Playlist"
        >
          <Plus size={13} />
          <span>Playlist</span>
        </button>
        <button
          className="bible-verse-card__action-btn bible-verse-card__action-btn--more"
          title="Lainnya"
        >
          <MoreVertical size={13} />
        </button>
      </div>
    </div>
  )
}
