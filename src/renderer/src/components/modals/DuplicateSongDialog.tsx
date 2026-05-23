import React, { useState } from 'react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useSongStore } from '../../store/useSongStore'
import type { Song } from '../../types'

interface DuplicateSongDialogProps {
  id: string
  song: Song
}

export function DuplicateSongDialog({ id, song }: DuplicateSongDialogProps): React.JSX.Element {
  const close = useModalStore((s) => s.close)
  const loadSongs = useSongStore((s) => s.loadSongs)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDuplicate = async (): Promise<void> => {
    setIsDuplicating(true)
    setError(null)
    try {
      await window.api.songs.duplicate(song.id)
      await loadSongs()
      close(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsDuplicating(false)
    }
  }

  return (
    <Modal
      id={id}
      title="Duplikasi Lagu"
      size="sm"
      footer={
        <>
          <ModalButton variant="secondary" onClick={() => close(id)} disabled={isDuplicating}>
            Batal
          </ModalButton>
          <ModalButton variant="primary" onClick={handleDuplicate} disabled={isDuplicating}>
            {isDuplicating ? 'Menduplikasi...' : 'Duplikasi'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-zinc-300">
          Apakah Anda yakin ingin menduplikasi lagu{' '}
          <strong className="text-zinc-100">{song.title}</strong>?
        </p>
        <p className="text-sm text-zinc-400">
          Lagu hasil duplikasi akan ditambahkan dengan kata &quot;(Copy)&quot; pada judulnya dan
          bisa Anda ubah nanti.
        </p>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
