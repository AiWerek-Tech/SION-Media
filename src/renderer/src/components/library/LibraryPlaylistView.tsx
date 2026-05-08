import React, { useMemo } from 'react'
import { Layers, Music2, Plus, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Song } from '../../types'

interface PlaylistViewProps {
  songs: Song[]
  selectedSongId?: number | null
  onSelectSong: (song: Song) => void
  onAddToPlaylist: (song: Song) => void
}

export function LibraryPlaylistView({
  songs,
  selectedSongId,
  onSelectSong,
  onAddToPlaylist
}: PlaylistViewProps): React.JSX.Element {
  // Group songs by category
  const groups = useMemo(() => {
    const byCategory: Record<string, Song[]> = {}
    for (const song of songs) {
      const cat = song.category || 'Lainnya'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(song)
    }
    // Sort categories by count descending
    return Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => {
          const na = parseInt(a.number || '0', 10)
          const nb = parseInt(b.number || '0', 10)
          if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
          return (a.number || '').localeCompare(b.number || '')
        })
      }))
  }, [songs])

  const stats = useMemo(() => {
    const total = songs.length
    const withCategory = songs.filter((s) => s.category).length
    const favorites = songs.filter((s) => s.is_favorite === 1).length
    return { total, withCategory, favorites }
  }, [songs])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-[48px] min-h-[48px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Layers size={14} className="text-brand-primary" />
          </div>
          <span className="text-[12px] font-semibold text-text-primary">Playlist Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted font-medium px-2 py-1 rounded-md bg-surface-2 border border-border-default/20">
            {stats.total} lagu
          </span>
          <span className="text-[10px] text-amber-400/70 font-medium px-2 py-1 rounded-md bg-amber-400/5 border border-amber-400/10 flex items-center gap-1">
            <Star size={10} className="fill-amber-400/50" />
            {stats.favorites}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Music2 size={32} className="mb-3 opacity-30" />
            <p className="text-[13px] font-medium">Belum ada lagu</p>
            <p className="text-[11px] mt-1 opacity-60">Cari dan tambahkan lagu ke playlist</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group, gi) => (
              <motion.div
                key={group.category}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(gi * 0.06, 0.4),
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                {/* Section Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    {group.category}
                  </span>
                  <div className="flex-1 h-px bg-border-default/20" />
                  <span className="text-[10px] text-text-muted font-medium">
                    {group.items.length} lagu
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {group.items.map((song, si) => {
                    const isSelected = selectedSongId === song.id
                    const isFavorite = song.is_favorite === 1

                    return (
                      <motion.button
                        key={song.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.2,
                          delay: Math.min(si * 0.015, 0.3),
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        onClick={() => onSelectSong(song)}
                        className={`relative p-3 rounded-xl border text-left transition-all duration-200 group ${
                          isSelected
                            ? 'bg-brand-primary/[0.06] border-brand-primary/20 shadow-sm'
                            : 'bg-surface-1/[0.4] border-border-default/15 hover:bg-surface-2/40 hover:border-border-default/30 hover:shadow-sm'
                        }`}
                      >
                        {/* Number badge */}
                        <div className="flex items-start justify-between mb-1.5">
                          <span
                            className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-brand-primary/10 text-brand-primary'
                                : 'bg-surface-2 text-text-muted'
                            }`}
                          >
                            {song.number || '—'}
                          </span>
                          {isFavorite && (
                            <Star size={10} className="text-amber-400 fill-amber-400" />
                          )}
                        </div>

                        {/* Title */}
                        <p
                          className={`text-[12px] font-semibold truncate ${
                            isSelected ? 'text-brand-primary' : 'text-text-primary'
                          }`}
                        >
                          {song.title}
                        </p>

                        {/* Lyric preview */}
                        <p className="text-[10px] text-text-muted truncate mt-0.5 opacity-60">
                          {(song.lyrics_raw || '').split('\n')[0] || '—'}
                        </p>

                        {/* Add button on hover */}
                        <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddToPlaylist(song)
                            }}
                            className="h-7 w-7 rounded-lg bg-surface-3 border border-border-default/30 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-4 transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Active indicator */}
                        {isSelected && (
                          <motion.div
                            layoutId="playlist-active"
                            className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-brand-primary"
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
