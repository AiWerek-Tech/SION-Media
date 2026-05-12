import React from 'react'
import { AlertTriangle, Eye, GripVertical, Plus, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getHymnalBgColor, getHymnalBorderColor, getHymnalColor } from '../utils/hymnal-colors'
import type { Song } from '../types'

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '---'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

interface SongCardProps {
  song: Song
  rowIndex: number
  isActive: boolean
  onProjectNow: (song: Song) => void
  onAddToPlaylist: (song: Song) => void
  onToggleFavorite: (song: Song) => void
}

export function SongCard({
  song,
  rowIndex,
  isActive,
  onProjectNow,
  onAddToPlaylist,
  onToggleFavorite
}: SongCardProps): React.JSX.Element {
  const { showToast } = useAppStore.getState()
  const hymnalCode = song.hymnal_code || 'LS'
  const hymnalAccent = getHymnalColor(hymnalCode)
  const hymnalBg = getHymnalBgColor(hymnalCode)
  const hymnalBorder = getHymnalBorderColor(hymnalCode)
  const hasEmptyLyrics = !song.lyrics_raw?.trim()
  const verseCount = Math.max(1, song.lyrics_raw?.split(/\n\s*\n/).filter(Boolean).length || 1)
  const bpm = song.tempo?.match(/\d+/)?.[0] ?? '72'

  const handleProjectNow = (): void => {
    onProjectNow(song)
    showToast(`Cue "${song.title}" masuk ke Preview`, 'success')
  }

  return (
    <div
      className={`projection-song-row ${isActive ? 'is-active' : ''} ${
        rowIndex % 2 === 0 ? 'is-even' : ''
      }`}
      role="button"
      tabIndex={0}
      onDoubleClick={handleProjectNow}
      onKeyDown={(event) => {
        if (event.key === 'Enter') handleProjectNow()
      }}
    >
      <button
        className="projection-song-row__favorite"
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(song)
        }}
        title="Toggle favorite"
        aria-label={`${song.is_favorite ? 'Remove' : 'Add'} ${song.title} favorite`}
      >
        <Star size={15} fill={song.is_favorite ? 'currentColor' : 'none'} />
      </button>

      <div className="projection-song-row__thumb">
        <div
          className="projection-song-row__hymnal"
          style={{
            backgroundColor: hymnalBg,
            borderColor: hymnalBorder,
            color: hymnalAccent
          }}
        >
          {hymnalCode}
        </div>
        <strong>{normalizeDisplayNumber(song.number)}</strong>
      </div>

      <div className="projection-song-row__main">
        <div className="flex min-w-0 items-center gap-2">
          <span className="projection-song-row__title">{song.title}</span>
          {hasEmptyLyrics && (
            <span className="projection-song-row__warning">
              <AlertTriangle size={10} />
              Empty
            </span>
          )}
        </div>
        <div className="projection-song-row__subtitle">
          <span>{song.alternate_title || song.title_en || song.composer || 'SION Media'}</span>
          <span>{song.category || 'Song'}</span>
        </div>
      </div>

      <div className="projection-song-row__stats">
        <span>4/4</span>
        <span>BPM {bpm}</span>
        <span>{verseCount} verse</span>
      </div>

      <div className="projection-song-row__actions">
        <button onClick={handleProjectNow} title="Cue to Preview" aria-label={`Cue ${song.title}`}>
          <Eye size={15} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onAddToPlaylist(song)
          }}
          title="Add to Playlist"
          aria-label={`Add ${song.title} to playlist`}
        >
          <Plus size={16} />
        </button>
        <button title="More actions" aria-label={`More actions for ${song.title}`}>
          <GripVertical size={15} />
        </button>
      </div>
    </div>
  )
}
