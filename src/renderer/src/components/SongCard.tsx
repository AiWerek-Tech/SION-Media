import React from 'react'
import { AlertTriangle, Edit, Eye, Plus, Star, Trash2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
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

  return (
    <div
      className={`group flex h-full items-center justify-between rounded-md border px-2.5 py-2 transition-all duration-200 ${
        isActive
          ? 'bg-preview/12 border-preview/45 shadow-[0_0_14px_rgba(52,199,89,0.14)]'
          : rowIndex % 2 === 0
            ? 'bg-bg-elevated/74 border-border-subtle hover:bg-bg-elevated-hover hover:border-border-strong'
            : 'bg-bg-surface/72 border-border-subtle hover:bg-bg-elevated-hover hover:border-border-strong'
      }`}
    >
      {/* Left info: Song identity */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={`flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded border font-mono text-[12px] font-black leading-none transition-colors ${
            isActive
              ? 'border-preview/40 bg-preview/18 text-preview'
              : 'border-border-default bg-bg-base/70 text-text-muted'
          }`}
        >
          <span className="text-[12px] uppercase tracking-[0.04em] opacity-70">
            {song.hymnal_code || 'LS'}
          </span>
          <span>{song.number || '---'}</span>
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
