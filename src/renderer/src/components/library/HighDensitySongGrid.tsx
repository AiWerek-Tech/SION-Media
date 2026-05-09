/**
 * HighDensitySongGrid — Premium song card grid with rich metadata.
 * Displays: Number, Title (ID), Title (EN), Key, Tempo
 * Action affordance: 20% opacity idle, 100% on hover
 */

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Heart, ListMusic, BookOpen, Music, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { getHymnalColor, getHymnalBgColor } from '../../utils/hymnal-colors'
import { logger } from '../../utils/logger'
import type { Song } from '../../types'

interface SongGridProps {
  songs: Song[]
  selectedSongId?: number | null
  onSelectSong: (song: Song) => void
}

interface SongCardProps {
  song: Song
  isSelected: boolean
  isFocused: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onAddToPlaylist: () => void
}

// Individual Song Card
function SongCard({
  song,
  isSelected,
  isFocused,
  onSelect,
  onToggleFavorite,
  onAddToPlaylist
}: SongCardProps): React.JSX.Element {
  const [hovered, setHovered] = useState(false)
  const accentColor = getHymnalColor(song.hymnal_code || 'LS')
  const bgColor = getHymnalBgColor(song.hymnal_code || 'LS')
  const hasLyrics = song.lyrics_raw && song.lyrics_raw.trim().length > 0

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      onFocus={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative w-full text-left rounded-xl border transition-all duration-200 ${
        isSelected ? 'shadow-lg' : 'hover:border-border-default/50 hover:bg-surface-2/30'
      } ${isFocused ? 'ring-2 ring-brand-primary/30' : ''}`}
      style={
        isSelected
          ? {
              backgroundColor: bgColor,
              borderColor: accentColor.replace('hsl', 'hsla').replace(')', ', 0.35)'),
              boxShadow: `0 4px 24px ${accentColor.replace('hsl', 'hsla').replace(')', ', 0.12)')}`
            }
          : { borderColor: 'rgba(255,255,255,0.06)' }
      }
      tabIndex={0}
    >
      {/* Content */}
      <div className="p-3">
        {/* Top row: Number + Hymnal badge */}
        <div className="flex items-center justify-between mb-2">
          <div
            className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 border font-mono"
            style={{
              backgroundColor: isSelected
                ? accentColor.replace('hsl', 'hsla').replace(')', ', 0.15)')
                : 'rgba(255,255,255,0.04)',
              borderColor: isSelected
                ? accentColor.replace('hsl', 'hsla').replace(')', ', 0.3)')
                : 'rgba(255,255,255,0.08)'
            }}
          >
            <span
              className="text-[9px] uppercase font-bold opacity-60"
              style={{ color: isSelected ? accentColor : undefined }}
            >
              {song.hymnal_code || 'LS'}
            </span>
            <span
              className="text-[13px] font-bold"
              style={{ color: isSelected ? accentColor : undefined }}
            >
              {song.number || '—'}
            </span>
          </div>

          {/* Missing lyrics badge */}
          {!hasLyrics && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-status-error/15 text-status-error text-[9px] font-bold">
              <AlertCircle size={10} />
              LIRIK KOSONG
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mb-1.5">
          <div
            className={`text-[13px] font-semibold truncate ${isSelected ? '' : 'text-text-primary'}`}
            style={isSelected ? { color: accentColor } : undefined}
          >
            {song.title}
          </div>
          {song.alternate_title && (
            <div className="text-[11px] text-text-muted italic truncate">
              {song.alternate_title}
            </div>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {song.key_note && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3/60 text-text-muted font-medium">
              {song.key_note}
            </span>
          )}
          {song.tempo && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3/60 text-text-muted font-medium">
              {song.tempo}
            </span>
          )}
          {song.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2/60 text-text-disabled">
              {song.category}
            </span>
          )}
        </div>

        {/* Action buttons - 20% opacity idle, 100% on hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            className={`p-1.5 rounded-lg transition-all ${
              song.is_favorite === 1
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-surface-2/60 text-text-muted hover:text-amber-400 hover:bg-amber-500/10'
            }`}
            style={{ opacity: hovered || song.is_favorite === 1 ? 1 : 0.2 }}
            title={song.is_favorite === 1 ? 'Hapus favorit' : 'Jadikan favorit'}
          >
            <Heart size={14} fill={song.is_favorite === 1 ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddToPlaylist()
            }}
            className="p-1.5 rounded-lg bg-surface-2/60 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
            style={{ opacity: hovered ? 1 : 0.2 }}
            title="Tambah ke playlist"
          >
            <ListMusic size={14} />
          </button>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          layoutId="song-selected-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ backgroundColor: accentColor }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  )
}

export function HighDensitySongGrid({
  songs,
  selectedSongId,
  onSelectSong
}: SongGridProps): React.JSX.Element {
  const { loadSongs } = useAppStore()
  const { addSongToPlaylist } = usePlaylistStore()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const gridRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Sort songs by number
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }, [songs])

  // Grid layout calculations
  const CARD_WIDTH = 220
  const CARD_GAP = 12
  const CARD_HEIGHT = 130

  const columns = useMemo(() => {
    const w = gridRef.current?.clientWidth ?? 900
    return Math.max(2, Math.floor((w + CARD_GAP) / (CARD_WIDTH + CARD_GAP)))
  }, [])

  const rowCount = useMemo(
    () => Math.ceil(sortedSongs.length / columns),
    [sortedSongs.length, columns]
  )

  // Virtualizer for performance
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 4
  })

  const rows = rowVirtualizer.getVirtualItems()

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    async (songId: number) => {
      try {
        await window.api.songs.toggleFavorite(songId)
        await loadSongs()
      } catch (err) {
        logger.error('Failed to toggle favorite:', err)
      }
    },
    [loadSongs]
  )

  // Add to playlist
  const handleAddToPlaylist = useCallback(
    async (song: Song) => {
      try {
        await addSongToPlaylist(song)
      } catch (err) {
        logger.error('Failed to add to playlist:', err)
      }
    },
    [addSongToPlaylist]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isTyping) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + 1, sortedSongs.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => Math.min(i + columns, sortedSongs.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - columns, 0))
      } else if (e.key === 'Enter' && sortedSongs[focusedIndex]) {
        e.preventDefault()
        onSelectSong(sortedSongs[focusedIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [columns, focusedIndex, sortedSongs, onSelectSong])

  // Keep focused item visible
  useEffect(() => {
    if (focusedIndex < 0) return
    const rowIndex = Math.floor(focusedIndex / columns)
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'center' })
  }, [focusedIndex, columns, rowVirtualizer])

  // Empty state
  if (sortedSongs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="h-20 w-20 rounded-2xl bg-surface-2/60 border border-border-default/30 flex items-center justify-center mb-4">
          <BookOpen size={36} className="text-text-disabled" />
        </div>
        <div className="text-text-muted text-sm mb-1">Tidak ada lagu</div>
        <div className="text-text-disabled text-[11px] text-center max-w-[280px]">
          Belum ada lagu dalam koleksi ini. Gunakan mode Manajemen untuk menambah lagu.
        </div>
      </div>
    )
  }

  return (
    <div ref={gridRef} className="flex-1 min-h-0 overflow-hidden">
      <div ref={parentRef} className="h-full overflow-y-auto scrollbar-thin p-4">
        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Music size={14} className="text-brand-primary" />
            <span className="text-[12px] font-semibold text-text-primary">
              {sortedSongs.length} lagu
            </span>
          </div>
          <div className="text-[10px] text-text-muted">
            Gunakan tombol panah untuk navigasi, Enter untuk membuka
          </div>
        </div>

        {/* Virtualized grid */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          <AnimatePresence>
            {rows.map((vr) => {
              const rowIndex = vr.index
              const startIndex = rowIndex * columns
              const endIndex = Math.min(startIndex + columns, sortedSongs.length)
              const rowSongs = sortedSongs.slice(startIndex, endIndex)

              return (
                <div
                  key={vr.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${vr.size}px`,
                    transform: `translateY(${vr.start}px)`
                  }}
                >
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: `${CARD_GAP}px`
                    }}
                  >
                    {rowSongs.map((song, colIdx) => {
                      const index = startIndex + colIdx
                      const isSelected = selectedSongId === song.id
                      const isFocused = focusedIndex === index

                      return (
                        <SongCard
                          key={song.id}
                          song={song}
                          isSelected={isSelected}
                          isFocused={isFocused}
                          onSelect={() => {
                            setFocusedIndex(index)
                            onSelectSong(song)
                          }}
                          onToggleFavorite={() => handleToggleFavorite(song.id)}
                          onAddToPlaylist={() => handleAddToPlaylist(song)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
