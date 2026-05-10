import React, { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Plus, Star, Clock, FolderOpen, Folder, X, Music } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlidesForSong } from '../engine/slideEngine'
import { logger } from '../utils/logger'
import type { Song, FilterTab } from '../types'
import { SongCard } from './SongCard'
import { HymnalSidebar } from './HymnalSidebar'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.JSX.Element }[] = [
  { key: 'all', label: 'Semua', icon: <FolderOpen size={11} /> },
  { key: 'favorites', label: 'Favorit', icon: <Star size={11} /> },
  { key: 'recent', label: 'Terbaru', icon: <Clock size={11} /> },
  { key: 'category', label: 'Kategori', icon: <Folder size={11} /> }
]

export function SongLibraryPanel(): React.JSX.Element {
  'use no memo'
  const {
    songs,
    hymnals,
    selectedHymnalId,
    searchQuery,
    activeFilter,
    setActiveFilter,
    loadSongs,
    searchSongs,
    selectedSong,
    loadMoreSongs,
    hasMoreResults,
    isLoadingMore
  } = useAppStore()
  const { addSongToPlaylist } = usePlaylistStore()
  const { setSlides } = useProjectionStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => {
    if (activeFilter === 'recent' && window.api?.system?.getRecentSongs) {
      window.api.system
        .getRecentSongs(30)
        .then((data) => setRecentSongs(data as Song[]))
        .catch(logger.error)
    }
  }, [activeFilter, songs])

  const handleSearch = useCallback(
    (value: string) => {
      setLocalQuery(value)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        searchSongs(value)
      }, 200)
    },
    [searchSongs]
  )

  const clearSearch = (): void => {
    setLocalQuery('')
    searchSongs('')
  }

  // Filter songs
  let filteredSongs = songs.filter((song) => {
    if (activeFilter === 'favorites') return song.is_favorite === 1
    if (activeFilter === 'category' && selectedCategory) return song.category === selectedCategory
    return true
  })

  if (activeFilter === 'recent') {
    filteredSongs = recentSongs.filter(
      (song) =>
        !localQuery ||
        song.title.toLowerCase().includes(localQuery.toLowerCase()) ||
        song.number.includes(localQuery)
    )
  }

  const categories = Array.from(new Set(songs.map((s) => s.category).filter(Boolean))).sort()

  const handleSongClick = (song: Song): void => {
    useAppStore.getState().setSelectedSong(song)
    const slides = generateSlidesForSong(song)
    setSlides(slides)
  }

  const handleCueSong = (song: Song): void => {
    handleSongClick(song)
  }

  const handleAddToPlaylist = (song: Song): void => {
    addSongToPlaylist(song)
  }
  const handleToggleFavorite = async (song: Song): Promise<void> => {
    try {
      await window.api.songs.toggleFavorite(song.id)
      await loadSongs()
    } catch (err) {
      logger.error('Failed to toggle favorite:', err)
      useAppStore.getState().showToast('Gagal mengubah favorit', 'error')
    }
  }

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: filteredSongs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 18
  })

  const easePremium: [number, number, number, number] = [0.22, 1, 0.36, 1]

  const listContainerVariants: Variants = {
    show: {
      transition: {
        staggerChildren: 0.018
      }
    }
  }

  const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: easePremium } }
  }

  return (
    <div className="flex-1 flex flex-row min-h-0 rounded-xl bg-bg-surface/95 shadow-[0_2px_12px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden border border-border-subtle">
      {/* Hymnal Sidebar — extracted component */}
      <HymnalSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-base/10">
        {/* Header: Search & Info */}
        <div className="p-3 bg-bg-surface/40 border-b border-border-subtle relative z-10 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="rounded-md bg-brand-primary/10 p-1.5 text-brand-primary shrink-0">
                <Music size={14} />
              </div>
              <h2 className="font-heading text-[13px] font-bold text-text-primary truncate min-w-0 flex-1 tracking-wide">
                {selectedHymnalId
                  ? hymnals.find((h) => h.id === selectedHymnalId)?.name
                  : 'Library Lagu'}
              </h2>
              <span className="rounded-full bg-bg-elevated border border-border-default px-2.5 py-0.5 text-[10px] font-bold text-text-muted shrink-0">
                {filteredSongs.length} lagu
                {localQuery && songs.length >= 120 && (
                  <span className="ml-1 text-status-warning" title="Hasil terpotong">
                    ⚠
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary transition-colors">
              <Search size={15} />
            </div>
            <input
              id="song-search-input"
              type="text"
              value={localQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari judul, lirik, atau nomor... (Ctrl+K)"
              className="w-full rounded-lg border border-border-strong bg-bg-elevated/50 pl-9 pr-9 py-2.5 text-[12px] font-medium text-text-primary placeholder:text-text-disabled transition-all focus:border-brand-primary focus:bg-bg-base focus:outline-none focus:ring-2 focus:ring-brand-primary/20 shadow-sm"
            />
            {localQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col border-b border-border-subtle bg-bg-surface/20">
          <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition-all ${
                  activeFilter === tab.key
                    ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-transparent'
                }`}
              >
                {React.cloneElement(tab.icon as React.ReactElement<{ size?: number }>, {
                  size: 12
                })}
                {tab.label}
              </button>
            ))}
          </div>

          {activeFilter === 'category' && (
            <div className="bg-bg-base/40 px-3 py-2 border-t border-border-subtle">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-bg-elevated px-2.5 py-1.5 text-[12px] font-medium text-text-primary outline-none focus:border-brand-primary transition-colors"
              >
                <option value="">-- Semua Kategori --</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content: List */}
        <div className="flex-1 min-h-0 relative bg-bg-base/20" ref={parentRef}>
          <motion.div
            initial="hidden"
            animate="show"
            variants={listContainerVariants}
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const song = filteredSongs[virtualRow.index]
              return (
                <motion.div
                  key={virtualRow.key}
                  variants={listItemVariants}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: '4px 8px'
                  }}
                >
                  <SongCard
                    song={song}
                    rowIndex={virtualRow.index}
                    isActive={selectedSong?.id === song.id}
                    onProjectNow={handleCueSong}
                    onAddToPlaylist={handleAddToPlaylist}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </motion.div>
              )
            })}
          </motion.div>

          {/* Empty State */}
          {filteredSongs.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-disabled">
                <Search size={32} />
              </div>
              <h3 className="text-text-primary font-semibold mb-1">Tidak ada hasil</h3>
              <p className="text-text-muted text-xs max-w-[200px]">
                Coba gunakan kata kunci lain atau filter yang berbeda.
              </p>
            </div>
          )}

          {/* Load More Button */}
          {localQuery.trim() && hasMoreResults && filteredSongs.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-bg-base via-bg-base/95 to-transparent">
              <button
                onClick={() => {
                  loadMoreSongs()
                }}
                disabled={isLoadingMore}
                className="w-full py-2.5 rounded-lg border border-border-default bg-bg-surface/80 text-xs font-semibold text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> Memuat...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Plus size={14} />
                    Muat Lebih Banyak
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
