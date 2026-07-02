import React from 'react'
import { AlertTriangle, Eye, Plus, Star } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import {
  getHymnalBgColor,
  getHymnalBorderColor,
  getHymnalColor
} from '@renderer/utils/hymnal-colors'
import type { Song } from '@renderer/types'

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
  // FIX: count actual [SECTION] markers, fallback to paragraph count, min 1
  const sectionCount = song.lyrics_raw
    ? (song.lyrics_raw.match(/^\[.+\]$/gm) || []).length ||
      Math.max(1, song.lyrics_raw.split(/\n\s*\n/).filter(Boolean).length)
    : 1
  // FIX: use actual time_signature from song data, fallback to '4/4'
  const timeSignature = song.time_signature || '4/4'
  // FIX: use actual tempo, no hardcoded default
  const bpm = song.tempo?.match(/\d+/)?.[0] ?? null

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
      onClick={handleProjectNow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleProjectNow()
        }
      }}
      aria-label={`Cue lagu ${song.title}`}
      aria-pressed={isActive}
    >
      <button
        className="projection-song-row__favorite"
        onClick={(event) => {
          event.stopPropagation()
          onToggleFavorite(song)
        }}
        title={song.is_favorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
        aria-label={`${song.is_favorite ? 'Hapus' : 'Tambahkan'} ${song.title} ${song.is_favorite ? 'dari' : 'ke'} favorit`}
        style={song.is_favorite ? { opacity: 1 } : undefined}
      >
        <Star
          size={13}
          fill={song.is_favorite ? 'currentColor' : 'none'}
          strokeWidth={song.is_favorite ? 0 : 1.8}
        />
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
              Lirik kosong
            </span>
          )}
        </div>
        <div className="projection-song-row__subtitle">
          <span>{song.alternate_title || song.title_en || song.composer || 'SION Media'}</span>
          <span>{song.category || 'Song'}</span>
        </div>
      </div>

      <div className="projection-song-row__stats">
        <span>{timeSignature}</span>
        {bpm && <span>BPM {bpm}</span>}
        <span>{sectionCount} bagian</span>
      </div>

      <div className="projection-song-row__actions">
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleProjectNow()
          }}
          title="Tampilkan di Preview"
          aria-label={`Tampilkan ${song.title} di Preview`}
        >
          <Eye size={13} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onAddToPlaylist(song)
          }}
          title="Tambahkan ke Playlist"
          aria-label={`Tambahkan ${song.title} ke playlist`}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
