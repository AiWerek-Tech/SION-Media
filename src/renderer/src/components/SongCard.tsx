import React from 'react'
import { AlertTriangle, Edit, Eye, Plus, Star, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getHymnalColor, getHymnalBgColor, getHymnalBorderColor } from '../utils/hymnal-colors'
import type { Song } from '../types'

interface SongCardProps {
  song: Song
  rowIndex: number
  isActive: boolean
  onProjectNow: (song: Song) => void
  onAddToPlaylist: (song: Song) => void
  onEdit: (song: Song) => void
  onDelete: (song: Song) => void
  onToggleFavorite: (song: Song) => void
}

export function SongCard({
  song,
  rowIndex,
  isActive,
  onProjectNow,
  onAddToPlaylist,
  onEdit,
  onDelete,
  onToggleFavorite
}: SongCardProps): React.JSX.Element {
  const { setScreen, setEditingSong, showToast } = useAppStore.getState()

  const gradientIndex = ((song.id ?? 0) + (song.number ? parseInt(String(song.number).replace(/[^0-9]/g, ''), 10) || 0 : 0)) % 6
  const gradients = [
    'from-brand-primary/22 via-brand-secondary/10 to-transparent',
    'from-brand-secondary/22 via-accent/10 to-transparent',
    'from-status-warning/18 via-brand-primary/10 to-transparent',
    'from-preview/18 via-brand-primary/10 to-transparent',
    'from-live-red/16 via-brand-secondary/10 to-transparent',
    'from-accent/20 via-brand-primary/8 to-transparent'
  ]

  const handleEdit = (): void => {
    setEditingSong(song)
    setScreen('song-editor')
    onEdit(song)
  }

  const handleProjectNow = (): void => {
    onProjectNow(song)
    showToast(`Cue "${song.title}" masuk ke Preview`, 'success')
  }

  const hasEmptyLyrics = !song.lyrics_raw?.trim()
  const meta = [song.key_note ? `Nada ${song.key_note}` : '', song.tempo || ''].filter(Boolean)
  const hymnalCode = song.hymnal_code || 'LS'
  const hymnalAccent = getHymnalColor(hymnalCode)
  const hymnalBg = getHymnalBgColor(hymnalCode)
  const hymnalBorder = getHymnalBorderColor(hymnalCode)

  return (
    <div
      className={`group flex h-full items-center justify-between rounded-xl border px-3 py-2 transition-all duration-200 hover:scale-[1.02] ${
        isActive
          ? 'bg-preview/12 border-preview/45 shadow-[var(--shadow-elevation-3),var(--shadow-glow-green)]'
          : rowIndex % 2 === 0
            ? 'bg-bg-elevated/72 border-border-subtle shadow-[var(--shadow-elevation-1)] hover:bg-bg-elevated-hover hover:border-border-strong hover:shadow-[var(--shadow-elevation-2)]'
            : 'bg-bg-surface/70 border-border-subtle shadow-[var(--shadow-elevation-1)] hover:bg-bg-elevated-hover hover:border-border-strong hover:shadow-[var(--shadow-elevation-2)]'
      }`}
    >
      {/* Left info: Song identity */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-bg-base/40">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradients[gradientIndex]} opacity-100`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-base/50 to-transparent" />
          <div className="relative flex h-full w-full flex-col items-start justify-between p-2">
            <div
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]"
              style={{ backgroundColor: hymnalBg, color: hymnalAccent, border: `1px solid ${hymnalBorder}` }}
            >
              {hymnalCode}
            </div>
            <div className="text-[12px] font-black leading-none text-text-primary">
              {song.number || '---'}
            </div>
          </div>
          {isActive && (
            <div className="absolute inset-0 rounded-xl ring-1 ring-preview/35 shadow-[var(--shadow-glow-green)]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="truncate text-[12px] font-bold text-text-primary transition-colors group-hover:text-preview">
              {song.title}
            </div>
            {hasEmptyLyrics && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded border border-status-warning/30 bg-status-warning/12 px-1.5 py-0.5 text-[12px] font-black uppercase text-status-warning">
                <AlertTriangle size={10} />
                Lirik Kosong
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {song.alternate_title && (
              <span className="max-w-[140px] truncate text-[12px] italic text-text-muted">
                {song.alternate_title}
              </span>
            )}
            <span className="rounded border border-border-subtle bg-bg-base/60 px-1.5 py-0.5 text-[12px] font-bold text-text-muted">
              {song.category || 'Song'}
            </span>
            {meta.map((item) => (
              <span
                key={item}
                className="rounded border border-border-subtle bg-bg-base/40 px-1.5 py-0.5 text-[12px] font-bold text-text-disabled"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons: Progressive Disclosure */}
      <div className="flex items-center gap-1 ml-2 opacity-20 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleProjectNow}
          className="p-1.5 rounded-md text-preview hover:bg-preview/20 transition-all hover:scale-105"
          title="Cue to Preview"
          aria-label={`Cue ${song.title}`}
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => onAddToPlaylist(song)}
          className="p-1.5 rounded-md text-brand-primary hover:bg-brand-primary/20 transition-all hover:scale-105"
          title="Add to Playlist"
          aria-label={`Add ${song.title} to playlist`}
        >
          <Plus size={18} />
        </button>

        {/* Overflow Menu Style for less frequent actions */}
        <div className="flex items-center border-l border-border-strong ml-1 pl-1 gap-1">
          <button
            onClick={handleEdit}
            className="p-1.5 rounded-md text-text-muted hover:bg-bg-active hover:text-text-primary transition-colors"
            title="Edit"
            aria-label={`Edit ${song.title}`}
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onToggleFavorite(song)}
            className={`p-1.5 rounded-md transition-colors ${
              song.is_favorite
                ? 'text-brand-accent hover:bg-brand-accent/10'
                : 'text-text-muted hover:bg-bg-active'
            }`}
            title="Toggle Favorite"
            aria-label={`${song.is_favorite ? 'Remove' : 'Add'} ${song.title} favorite`}
          >
            <Star size={16} fill={song.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => onDelete(song)}
            className="p-1.5 rounded-md text-text-muted hover:bg-status-error/20 hover:text-status-error transition-colors"
            title="Delete"
            aria-label={`Delete ${song.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
