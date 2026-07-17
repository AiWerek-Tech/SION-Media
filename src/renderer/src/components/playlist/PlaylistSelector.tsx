import React, { useEffect, useRef, useState } from 'react'
import { CalendarDays, Check, ChevronDown, ListMusic, Plus, Repeat2 } from 'lucide-react'
import type { Playlist } from '@renderer/types'
import { formatPlaylistSchedule } from '@renderer/utils/playlistSchedule'

interface PlaylistSelectorProps {
  playlists: Playlist[]
  activePlaylist: Playlist | null
  itemCount: number
  slideCount: number
  onSelect: (playlist: Playlist) => void | Promise<void>
  onCreate: () => void
}

export function PlaylistSelector({
  playlists,
  activePlaylist,
  itemCount,
  slideCount,
  onSelect,
  onCreate
}: PlaylistSelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const activeName = activePlaylist?.name ?? 'Belum ada Rundown Worship aktif'

  return (
    <div ref={rootRef} className="playlist-selector">
      <button
        type="button"
        className={`playlist-selector__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={
          activePlaylist
            ? `Pilih Rundown Worship, ${activePlaylist.name} aktif`
            : 'Pilih Rundown Worship'
        }
      >
        <span className="playlist-panel__icon">
          <ListMusic size={15} />
        </span>
        <span className="playlist-selector__summary">
          <span className="playlist-selector__name">{activeName}</span>
          <span className="playlist-selector__meta">
            {activePlaylist ? (
              <>
                <span className="playlist-panel__schedule">
                  {activePlaylist.service_date ? <CalendarDays size={10} /> : <Repeat2 size={10} />}
                  {formatPlaylistSchedule(activePlaylist.service_date)}
                </span>
                <span>{itemCount} item</span>
                <span>{slideCount} slide</span>
              </>
            ) : (
              <span>{playlists.length} rundown tersimpan</span>
            )}
          </span>
        </span>
        <span className="playlist-selector__count">{playlists.length}</span>
        <ChevronDown size={14} className="playlist-selector__chevron" />
      </button>

      {isOpen && (
        <div className="playlist-selector__dropdown">
          <div className="playlist-selector__dropdown-header">
            <span>Semua Rundown Worship</span>
            <small>{playlists.length} rundown tersimpan</small>
          </div>
          <div className="playlist-selector__list" role="listbox" aria-label="Semua rundown">
            {playlists.length === 0 ? (
              <div className="playlist-selector__empty">Belum ada rundown tersimpan.</div>
            ) : (
              playlists.map((playlist) => {
                const isActive = activePlaylist?.id === playlist.id
                const schedule = formatPlaylistSchedule(playlist.service_date)
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    aria-label={`${playlist.name}, ${schedule}${isActive ? ', aktif' : ''}`}
                    className={`playlist-selector__option ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      setIsOpen(false)
                      void onSelect(playlist)
                    }}
                  >
                    <span className="playlist-selector__option-icon">
                      {playlist.service_date ? <CalendarDays size={14} /> : <Repeat2 size={14} />}
                    </span>
                    <span className="playlist-selector__option-copy">
                      <strong>{playlist.name}</strong>
                      <small>{schedule}</small>
                    </span>
                    {isActive && <Check size={15} className="playlist-selector__check" />}
                  </button>
                )
              })
            )}
          </div>
          <button
            type="button"
            className="playlist-selector__create"
            aria-label="Buat rundown baru"
            onClick={() => {
              setIsOpen(false)
              onCreate()
            }}
          >
            <Plus size={14} />
            Buat Rundown Baru
          </button>
        </div>
      )}
    </div>
  )
}
