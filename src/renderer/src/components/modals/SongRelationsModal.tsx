/**
 * Phase 8 — SongRelationsModal
 *
 * Modal for viewing and managing song relationships:
 * - Related songs (same theme/category)
 * - Same-key songs (for medley planning)
 * - Same-hymnal songs
 *
 * Opened from Management Mode song inspector.
 * Inherits standard Modal component for styling consistency.
 */

import React, { useMemo, useState } from 'react'
import { BookOpen, Layers3, Music2 } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModalStore } from '@renderer/store/useModalStore'
import { Modal, ModalButton } from './Modal'
import type { Song } from '@renderer/types'

type RelationTab = 'theme' | 'key' | 'hymnal'

interface SongRelationsModalProps {
  id: string
  /** The anchor song to find relations for */
  song?: Song
  /** Optional: callback when selecting a related song */
  onSelectSong?: (song: Song) => void
}

export function SongRelationsModal({
  id,
  song,
  onSelectSong
}: SongRelationsModalProps): React.JSX.Element | null {
  const [tab, setTab] = useState<RelationTab>('theme')
  const { songs: allSongs } = useAppStore()
  const closeById = useModalStore((s) => s.closeById)

  const onClose = (): void => closeById(id)

  const relatedByTheme = useMemo(() => {
    if (!song) return []
    const themeTokens = [song.category, song.theme, ...(song.tags || '').split(',')]
      .map((t) => t?.trim().toLowerCase())
      .filter(Boolean)
    if (themeTokens.length === 0) return []
    return allSongs
      .filter((s) => s.id !== song.id)
      .filter((s) => {
        const sTokens = [s.category, s.theme, ...(s.tags || '').split(',')]
          .map((t) => t?.trim().toLowerCase())
          .filter(Boolean)
        return sTokens.some((t) => themeTokens.includes(t))
      })
      .slice(0, 20)
  }, [allSongs, song])

  const relatedByKey = useMemo(() => {
    if (!song || !song.key_note) return []
    return allSongs.filter((s) => s.id !== song.id && s.key_note === song.key_note).slice(0, 20)
  }, [allSongs, song])

  const relatedByHymnal = useMemo(() => {
    if (!song || !song.hymnal_id) return []
    return allSongs.filter((s) => s.id !== song.id && s.hymnal_id === song.hymnal_id).slice(0, 30)
  }, [allSongs, song])

  const currentList =
    tab === 'theme' ? relatedByTheme : tab === 'key' ? relatedByKey : relatedByHymnal

  if (!song) return null

  const TABS: Array<{ id: RelationTab; label: string; icon: React.ReactNode; count: number }> = [
    { id: 'theme', label: 'Tema', icon: <Layers3 size={13} />, count: relatedByTheme.length },
    { id: 'key', label: 'Key', icon: <Music2 size={13} />, count: relatedByKey.length },
    {
      id: 'hymnal',
      label: 'Buku Lagu',
      icon: <BookOpen size={13} />,
      count: relatedByHymnal.length
    }
  ]

  return (
    <Modal
      id={id}
      title="Relasi Lagu"
      subtitle={`${song.number} — ${song.title}`}
      size="lg"
      footer={
        <ModalButton variant="secondary" onClick={onClose}>
          Tutup
        </ModalButton>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-border-subtle w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                text-[11px] font-semibold transition-all duration-150
                ${
                  tab === t.id
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                }
              `}
              style={{ cursor: 'pointer' }}
            >
              {t.icon}
              {t.label}
              <span className="text-[9px] opacity-60 bg-black/20 px-1.5 py-0.5 rounded-full ml-1">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto max-h-[360px] border border-border-subtle rounded-xl bg-white/[0.01]">
          {currentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-muted">
              <Music2 size={28} className="opacity-30" />
              <span className="text-[12px]">Tidak ada relasi ditemukan</span>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle/50">
              {currentList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSong?.(s)}
                  className="
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    hover:bg-white/[0.03] transition-colors group
                  "
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    className="
                      shrink-0 w-10 h-7 rounded-lg text-[10px] font-bold
                      flex items-center justify-center
                      bg-white/[0.04] text-text-muted border border-white/[0.03]
                    "
                  >
                    {s.number || '--'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      {[s.hymnal_name, s.key_note, s.category].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
