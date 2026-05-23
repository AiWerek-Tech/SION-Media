/**
 * CreatePlaylistDialog — MM-001
 *
 * Triggered by:
 *   - File > New Playlist (TitleBarMenu)
 *   - document.dispatchEvent(new CustomEvent('sion:create-playlist'))
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React, { useState, useRef, useEffect } from 'react'
import { ListMusic } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useAppStore } from '../../store/useAppStore'

interface CreatePlaylistDialogProps {
  id: string
}

export function CreatePlaylistDialog({ id }: CreatePlaylistDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [serviceDate, setServiceDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const closeById = useModalStore((s) => s.closeById)
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const showToast = useAppStore((s) => s.showToast)

  // Auto-focus name input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (): Promise<void> => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nama playlist tidak boleh kosong')
      inputRef.current?.focus()
      return
    }

    setError(null)
    setLoading(true)
    try {
      await createPlaylist(trimmed, serviceDate)
      showToast(`Playlist "${trimmed}" berhasil dibuat`, 'success')
      closeById(id, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat playlist')
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  return (
    <Modal
      id={id}
      title="Buat Playlist Baru"
      subtitle="Playlist untuk ibadah atau acara"
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      footer={
        <>
          <ModalButton onClick={() => closeById(id, false)} disabled={loading} variant="secondary">
            Batal
          </ModalButton>
          <ModalButton onClick={() => void handleSubmit()} loading={loading} variant="primary">
            Buat Playlist
          </ModalButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Icon */}
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.12)' }}
          >
            <ListMusic size={20} color="#60a5fa" />
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Playlist akan langsung aktif setelah dibuat.
          </p>
        </div>

        {/* Name field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-600 text-secondary" htmlFor={`playlist-name-${id}`}>
            Nama Playlist <span className="text-rose-400">*</span>
          </label>
          <input
            ref={inputRef}
            id={`playlist-name-${id}`}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="cth. Ibadah Minggu 18 Mei"
            maxLength={80}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--color-text-primary, #fff)',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              width: '100%',
              transition: 'border-color 0.15s'
            }}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Service date field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-600 text-secondary" htmlFor={`playlist-date-${id}`}>
            Tanggal Ibadah <span className="text-muted">(opsional)</span>
          </label>
          <input
            id={`playlist-date-${id}`}
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--color-text-primary, #fff)',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              width: '100%',
              colorScheme: 'dark'
            }}
          />
        </div>
      </div>
    </Modal>
  )
}
