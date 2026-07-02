/**
 * PlaylistPickerDialog — MM-004 (Phase 6 context menu)
 *
 * Shown when operator right-clicks a song and selects "Add to Playlist".
 * Lists all available playlists for selection.
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React, { useState } from 'react'
import { ListMusic, Check } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import type { Playlist } from '../../types'
import { formatPlaylistSchedule } from '../../utils/playlistSchedule'

interface PlaylistPickerDialogProps {
  id: string
  /** Called with the selected playlist */
  onSelect?: (playlist: Playlist) => void
}

export function PlaylistPickerDialog({
  id,
  onSelect
}: PlaylistPickerDialogProps): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const playlists = usePlaylistStore((s) => s.playlists)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleSelect = (): void => {
    if (selectedId === null) return
    const playlist = playlists.find((p) => p.id === selectedId)
    if (playlist) {
      onSelect?.(playlist)
      closeById(id, playlist)
    }
  }

  return (
    <Modal
      id={id}
      title="Pilih Playlist"
      subtitle="Tambahkan lagu ke playlist"
      size="sm"
      footer={
        <>
          <ModalButton onClick={() => closeById(id, null)} variant="secondary">
            Batal
          </ModalButton>
          <ModalButton onClick={handleSelect} disabled={selectedId === null} variant="primary">
            Tambahkan
          </ModalButton>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <ListMusic size={32} className="text-muted opacity-40" />
            <p className="text-sm text-muted">Belum ada playlist</p>
            <p className="text-xs text-disabled">
              Buat playlist baru dari menu File &gt; New Playlist
            </p>
          </div>
        ) : (
          playlists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => setSelectedId(playlist.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] ${
                selectedId === playlist.id
                  ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                  : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] text-text-secondary'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.05] border border-white/[0.05]">
                <ListMusic size={14} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{playlist.name}</p>
                <p className="text-xs text-text-muted">
                  {formatPlaylistSchedule(playlist.service_date)}
                </p>
              </div>
              {selectedId === playlist.id && (
                <Check size={16} className="text-brand-primary flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}
