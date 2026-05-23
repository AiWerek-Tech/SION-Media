/**
 * Phase 8 — SongRelationsModal
 *
 * Modal for viewing and managing song relationships:
 * - Related songs (same theme/category)
 * - Same-key songs (for medley planning)
 * - Same-hymnal songs
 *
 * Opened from Management Mode song inspector.
 * Additive component — does not modify any existing store or modal logic.
 */

import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Layers3, Link2, Music2, X } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModalStore } from '@renderer/store/useModalStore'
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
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-[520px] max-h-[70vh] rounded-xl border border-border-strong
            bg-bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.4)]
            flex flex-col overflow-hidden
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <Link2 size={16} className="text-brand-primary" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-text-primary">Relasi Lagu</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {song.number} — {song.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border-subtle">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md
                  text-[11px] font-semibold transition-all duration-150
                  ${
                    tab === t.id
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04]'
                  }
                `}
              >
                {t.icon}
                {t.label}
                <span className="text-[9px] opacity-60">{t.count}</span>
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3">
            {currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
                <Music2 size={28} className="opacity-30" />
                <span className="text-[12px]">Tidak ada relasi ditemukan</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {currentList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectSong?.(s)}
                    className="
                      flex items-center gap-3 px-3 py-2 rounded-lg text-left
                      hover:bg-white/[0.04] transition-colors group
                    "
                  >
                    <span
                      className="
                        shrink-0 w-9 h-6 rounded text-[10px] font-black
                        flex items-center justify-center
                        bg-white/[0.04] text-text-muted
                      "
                    >
                      {s.number || '--'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                        {s.title}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {[s.hymnal_name, s.key_note, s.category].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
