import React, { useMemo, useRef } from 'react'
import { Check, Heart, ListMusic, MoreHorizontal, Pin, SortAsc, Type } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion } from 'framer-motion'
import { getHymnalColor } from '../../utils/hymnal-colors'
import type { Song } from '../../types'
import { SongContextMenu } from './SongContextMenu'

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

interface TitleViewProps {
  songs: Song[]
  selectedSongId?: number | null
  onSelectSong: (song: Song) => void
  onAddToPlaylist: (song: Song) => void
  onToggleFavorite: (songId: number) => void
}

type SortMode = 'number' | 'title' | 'category' | 'favorite'

export function LibraryTitleView({
  songs,
  selectedSongId,
  onSelectSong,
  onAddToPlaylist,
  onToggleFavorite
}: TitleViewProps): React.JSX.Element {
  const [sortMode, setSortMode] = React.useState<SortMode>('number')

  const [menuOpen, setMenuOpen] = React.useState(false)
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [menuSong, setMenuSong] = React.useState<Song | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const sortedSongs = useMemo(() => {
    const arr = [...songs]
    switch (sortMode) {
      case 'number':
        return arr.sort((a, b) => {
          const na = parseInt(a.number || '0', 10)
          const nb = parseInt(b.number || '0', 10)
          if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
          return (a.number || '').localeCompare(b.number || '')
        })
      case 'title':
        return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      case 'category':
        return arr.sort(
          (a, b) =>
            (a.category || '').localeCompare(b.category || '') ||
            (a.number || '').localeCompare(b.number || '')
        )
      case 'favorite':
        return arr.sort((a, b) => (b.is_favorite || 0) - (a.is_favorite || 0))
      default:
        return arr
    }
  }, [songs, sortMode])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: sortedSongs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  const openMenu = (e: React.MouseEvent, song: Song): void => {
    e.preventDefault()
    e.stopPropagation()
    const x = Math.min(window.innerWidth - 240, e.clientX)
    const y = Math.min(window.innerHeight - 240, e.clientY)
    setMenuSong(song)
    setMenuPos({ x, y })
    setMenuOpen(true)
  }

  return (
    <div className="h-full flex flex-col">
      <SongContextMenu
        open={menuOpen && !!menuSong}
        x={menuPos.x}
        y={menuPos.y}
        onClose={() => setMenuOpen(false)}
        actions={
          menuSong
            ? [
                {
                  id: 'add_to_playlist',
                  label: 'Tambah ke playlist',
                  icon: <ListMusic size={14} />,
                  onClick: () => onAddToPlaylist(menuSong)
                },
                {
                  id: 'toggle_favorite',
                  label: menuSong.is_favorite === 1 ? 'Hapus favorit' : 'Jadikan favorit',
                  icon: <Heart size={14} />,
                  onClick: () => onToggleFavorite(menuSong.id)
                },
                {
                  id: 'pin',
                  label: 'Pin (coming soon)',
                  icon: <Pin size={14} />,
                  onClick: () => {}
                },
                {
                  id: 'close',
                  label: 'Tutup',
                  icon: <MoreHorizontal size={14} />,
                  onClick: () => {}
                }
              ]
            : []
        }
      />

      {/* Toolbar */}
      <div className="h-[48px] min-h-[48px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Type size={14} className="text-brand-primary" />
          </div>
          <span className="text-[12px] font-semibold text-text-primary">
            {sortedSongs.length} lagu
          </span>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { key: 'number', label: 'Nomor', icon: <SortAsc size={12} /> },
              { key: 'title', label: 'Judul', icon: <Type size={12} /> },
              { key: 'category', label: 'Kategori', icon: <Pin size={12} /> },
              { key: 'favorite', label: 'Favorit', icon: <Heart size={12} /> }
            ] as { key: SortMode; label: string; icon: React.ReactNode }[]
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                sortMode === s.key
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2/60'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Virtualized List */}
      <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualItems.map((vr) => {
            const song = sortedSongs[vr.index]
            const isSelected = selectedSongId === song.id
            const isFavorite = song.is_favorite === 1
            const isRecent = !!song.last_used || !!song.last_played

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
                className="px-3 py-1.5"
              >
                <motion.div
                  layout
                  className={`h-full w-full rounded-xl border transition-all duration-200 flex items-center gap-3 px-3 group cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary/[0.06] border-brand-primary/20 shadow-sm'
                      : vr.index % 2 === 0
                        ? 'bg-bg-elevated/50 border-transparent hover:bg-surface-2/40 hover:border-border-default/30 hover:shadow-sm'
                        : 'bg-bg-surface/40 border-transparent hover:bg-surface-2/40 hover:border-border-default/30 hover:shadow-sm'
                  }`}
                  onClick={() => onSelectSong(song)}
                >
                  {/* Thumbnail / Number Badge with Hymnal Accent */}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border font-mono text-[13px] font-bold transition-all"
                    style={{
                      backgroundColor: getHymnalColor(song.hymnal_code || 'LS')
                        .replace('hsl', 'hsla')
                        .replace(')', ', 0.12)'),
                      borderColor: getHymnalColor(song.hymnal_code || 'LS')
                        .replace('hsl', 'hsla')
                        .replace(')', ', 0.25)'),
                      color: getHymnalColor(song.hymnal_code || 'LS')
                    }}
                  >
                    {normalizeDisplayNumber(song.number)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] font-semibold truncate ${
                          isSelected ? 'text-brand-primary' : 'text-text-primary'
                        }`}
                      >
                        {song.title}
                      </span>
                      {isRecent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-2 border border-border-default/20 text-text-muted">
                          Recent
                        </span>
                      )}
                      {isFavorite && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                          <Heart size={12} className="text-amber-400 fill-amber-400" />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {song.category && (
                        <span className="text-[10px] text-text-muted bg-surface-2 border border-border-default/20 px-1.5 py-0.5 rounded-md">
                          {song.category}
                        </span>
                      )}
                      {song.composer && (
                        <span className="text-[10px] text-text-muted truncate">
                          {song.composer}
                        </span>
                      )}
                      {song.author && (
                        <span className="text-[10px] text-text-muted truncate">{song.author}</span>
                      )}
                      {/* Lyric preview */}
                      <span className="text-[10px] text-text-muted truncate max-w-[200px] opacity-60">
                        {(song.lyrics_raw || '').split('\n')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 opacity-20 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onAddToPlaylist(song)}
                      className="h-8 w-8 rounded-lg bg-surface-2 border border-border-default/30 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-3 hover:border-border-default/50 transition-all"
                      title="Tambah ke playlist"
                      aria-label={`Tambah ${song.title} ke playlist`}
                    >
                      <ListMusic size={14} />
                    </button>
                    <button
                      onClick={() => onToggleFavorite(song.id)}
                      className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all ${
                        isFavorite
                          ? 'bg-amber-400/10 border-amber-400/20 text-amber-400 opacity-100' // Ensure it stands out when favorite
                          : 'bg-surface-2 border-border-default/30 text-text-muted hover:text-amber-400 hover:bg-amber-400/5'
                      }`}
                      title="Favorit"
                      aria-label={`Toggle favorit ${song.title}`}
                    >
                      <Heart size={14} className={isFavorite ? 'fill-amber-400' : ''} />
                    </button>
                    <button
                      onClick={(e) => openMenu(e, song)}
                      className="h-8 w-8 rounded-lg bg-surface-2 border border-border-default/30 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-3 hover:border-border-default/50 transition-all"
                      title="Lainnya"
                      aria-label={`Menu aksi untuk ${song.title}`}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="h-6 w-6 rounded-full bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center text-brand-primary"
                    >
                      <Check size={12} />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
