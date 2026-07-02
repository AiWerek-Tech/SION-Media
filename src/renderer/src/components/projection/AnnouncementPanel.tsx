/**
 * Phase 7 — AnnouncementPanel (v2)
 *
 * Quick text panel for sending announcements/custom text to the projection.
 * Supports templates, character counter, and history for rapid service announcements.
 */

import React, { useCallback, useState } from 'react'
import { AlignLeft, ListPlus, Send, Trash2, Type } from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import type { SlideData } from '@renderer/types'

const ANNOUNCEMENT_TEMPLATES = [
  {
    label: 'Selamat Datang',
    text: 'Selamat Datang di Ibadah Hari Ini\nSilakan matikan handphone Anda'
  },
  { label: 'Persembahan', text: 'Saat Persembahan\nTuhan memberkati setiap pemberi yang rela' },
  { label: 'Warta Jemaat', text: 'Warta Jemaat' },
  { label: 'Berkat', text: 'Tuhan Memberkati\nSelamat Beraktivitas' },
  { label: 'Doa Bersama', text: 'Saat Doa Bersama\nMari kita berdoa' },
  { label: 'Firman Tuhan', text: 'Firman Tuhan' }
]

const MAX_BODY_CHARS = 280

export function AnnouncementPanel(): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const { showToast } = useAppStore()
  const { setSlides } = useProjectionStore()
  const addInfoToPlaylist = usePlaylistStore((state) => state.addInfoToPlaylist)

  const charCount = body.length
  const isOverLimit = charCount > MAX_BODY_CHARS
  const hasContent = title.trim() || body.trim()

  const handleSend = useCallback(async () => {
    const normalizedTitle = title.trim()
    const normalizedBody = body.trim()
    const text = normalizedBody || normalizedTitle
    if (!text) {
      showToast('Tulis pengumuman terlebih dahulu', 'error')
      return
    }
    if (isOverLimit) {
      showToast(`Teks terlalu panjang (maks ${MAX_BODY_CHARS} karakter)`, 'error')
      return
    }
    setIsSending(true)
    const slide: SlideData = {
      contentType: 'custom',
      songId: -2,
      slideIndex: 0,
      text,
      sectionLabel: normalizedBody ? normalizedTitle : '',
      keyNote: undefined,
      timeSignature: undefined,
      tempo: undefined
    }
    setSlides([slide], {
      hymnalCode: 'ANN',
      hymnalName: normalizedTitle || 'Info',
      songBackgroundConfig: ''
    })
    showToast('Pengumuman masuk ke Preview', 'success')
    setTimeout(() => setIsSending(false), 600)
  }, [body, isOverLimit, setSlides, showToast, title])

  const handleAddToPlaylist = useCallback(async () => {
    if (!hasContent || isOverLimit) return
    await addInfoToPlaylist({ title: title.trim(), body: body.trim() })
  }, [addInfoToPlaylist, body, hasContent, isOverLimit, title])

  const handleTemplate = useCallback((template: { label: string; text: string }) => {
    setTitle(template.label)
    setBody(template.text)
  }, [])

  const handleClear = useCallback(() => {
    setTitle('')
    setBody('')
  }, [])

  // Send on Ctrl+Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  return (
    <aside className="projection-song-info-panel projection-announcement-panel">
      <div className="projection-announcement-panel__content flex min-h-0 flex-1 flex-col gap-2.5 p-3">
        {/* Title */}
        <div className="projection-announcement-panel__field-wrap relative">
          <Type
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Judul (opsional)"
            className="
              projection-announcement-panel__field
              w-full h-8 pl-8 pr-3 rounded-lg border border-border-default
              bg-bg-elevated text-[12px] text-text-primary font-semibold
              placeholder:text-text-disabled outline-none
              focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60
              transition-colors
            "
          />
        </div>

        {/* Body with char counter */}
        <div className="projection-announcement-panel__body relative flex-1 flex flex-col">
          <AlignLeft
            size={12}
            className="absolute left-2.5 top-2.5 text-text-muted pointer-events-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Isi pengumuman... (Ctrl+Enter untuk kirim)"
            rows={5}
            className={`
              projection-announcement-panel__textarea
              w-full flex-1 min-h-[90px] rounded-lg border pl-8 pr-3 pt-2 pb-6
              bg-bg-elevated text-[12px] text-text-primary resize-none
              placeholder:text-text-disabled outline-none leading-relaxed
              focus:ring-1 focus:border-brand-primary/60 transition-colors
              ${
                isOverLimit
                  ? 'border-danger/50 focus:ring-danger/30'
                  : 'border-border-default focus:ring-brand-primary/40'
              }
            `}
          />
          {/* Char counter */}
          <span
            className={`absolute bottom-2 right-2.5 text-[9px] font-semibold tabular-nums ${
              isOverLimit
                ? 'text-danger'
                : charCount > MAX_BODY_CHARS * 0.8
                  ? 'text-amber-400'
                  : 'text-text-disabled'
            }`}
          >
            {charCount}/{MAX_BODY_CHARS}
          </span>
        </div>

        {/* Templates */}
        <div className="projection-announcement-panel__templates">
          <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
            Template Cepat
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ANNOUNCEMENT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => handleTemplate(tmpl)}
                className="
                  px-2 py-1 rounded-md text-[10px] font-semibold
                  bg-white/[0.04] text-text-muted border border-white/[0.06]
                  hover:bg-brand-primary/10 hover:text-brand-primary hover:border-brand-primary/20
                  transition-colors
                "
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="projection-announcement-panel__actions flex gap-2">
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!hasContent || isOverLimit || isSending}
            className="
              flex-1 flex items-center justify-center gap-2 h-9 rounded-lg
              bg-brand-primary text-white text-[12px] font-bold
              hover:bg-brand-primary-hover transition-all
              shadow-[0_0_16px_rgba(99,102,241,0.15)]
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Send size={13} />
            {isSending ? 'Mengirim...' : 'Kirim ke Preview'}
          </button>
          <button
            type="button"
            onClick={() => void handleAddToPlaylist()}
            disabled={!hasContent || isOverLimit}
            aria-label="Tambah ke Playlist"
            title="Tambah ke playlist aktif"
            className="projection-announcement-panel__playlist-button inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-default bg-bg-elevated text-text-secondary text-[11px] font-bold transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/10 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ListPlus size={13} />
            <span>Playlist</span>
          </button>
          {hasContent && (
            <button
              type="button"
              onClick={handleClear}
              className="
                flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg
                border border-border-default bg-bg-elevated text-text-muted text-[12px]
                hover:text-danger hover:border-danger/30 transition-colors
              "
              title="Bersihkan"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
