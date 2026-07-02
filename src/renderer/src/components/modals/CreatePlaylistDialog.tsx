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
import { CalendarDays, ListMusic, Repeat2 } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useAppStore } from '../../store/useAppStore'
import {
  normalizePlaylistServiceDate,
  type PlaylistScheduleMode
} from '../../utils/playlistSchedule'

interface CreatePlaylistDialogProps {
  id: string
}

export function CreatePlaylistDialog({ id }: CreatePlaylistDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [scheduleMode, setScheduleMode] = useState<PlaylistScheduleMode>('anytime')
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
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

    const normalizedDate = normalizePlaylistServiceDate(scheduleMode, serviceDate)
    if (scheduleMode === 'dated' && !normalizedDate) {
      setError('Pilih tanggal ibadah')
      return
    }

    setError(null)
    setLoading(true)
    try {
      await createPlaylist(trimmed, normalizedDate)
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
          <div className="sp-modal-icon-wrap sp-modal-icon-wrap--info">
            <ListMusic size={20} />
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
            className="sp-input w-full"
            style={{
              borderColor: error ? 'rgba(239,68,68,0.5)' : undefined
            }}
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <fieldset disabled={loading}>
          <legend className="text-xs font-600 text-secondary mb-2">Penggunaan</legend>
          <div className="playlist-schedule-options">
            <button
              type="button"
              className={`playlist-schedule-option ${scheduleMode === 'anytime' ? 'is-active' : ''}`}
              onClick={() => setScheduleMode('anytime')}
              aria-pressed={scheduleMode === 'anytime'}
            >
              <Repeat2 size={15} />
              <span>
                <strong>Kapan saja</strong>
                <small>Dapat digunakan berulang kali</small>
              </span>
            </button>
            <button
              type="button"
              className={`playlist-schedule-option ${scheduleMode === 'dated' ? 'is-active' : ''}`}
              onClick={() => setScheduleMode('dated')}
              aria-pressed={scheduleMode === 'dated'}
            >
              <CalendarDays size={15} />
              <span>
                <strong>Bertanggal</strong>
                <small>Untuk ibadah tertentu</small>
              </span>
            </button>
          </div>
        </fieldset>

        {scheduleMode === 'dated' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-600 text-secondary" htmlFor={`playlist-date-${id}`}>
              Tanggal Ibadah
            </label>
            <input
              id={`playlist-date-${id}`}
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              disabled={loading}
              className="sp-input w-full"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
