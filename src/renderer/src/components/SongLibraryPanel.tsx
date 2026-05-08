import React, { useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Plus, Star, Clock, FolderOpen, Folder, X, Music } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlides } from '../engine/slideEngine'
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
    selectedSong,
    setActiveFilter,
    setScreen,
    setEditingSong,
    loadSongs,
    searchSongs,
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
    const slides = generateSlides(song.id, song.lyrics_raw)
    setSlides(slides)
  }

  const handleCueSong = (song: Song): void => {
    handleSongClick(song)
  }

  const handleAddToPlaylist = (song: Song): void => {
    addSongToPlaylist(song)
  }
  const handleEdit = (song: Song): void => {
    setEditingSong(song)
    setScreen('song-editor')
  }

  const handleDelete = async (song: Song): Promise<void> => {
    if (confirm(`Hapus lagu "${song.title}"?`)) {
      try {
        await window.api.songs.delete(song.id)
        await loadSongs()
        if (useAppStore.getState().selectedSong?.id === song.id) {
          useAppStore.getState().setSelectedSong(null)
        }
      } catch (err) {
        logger.error('Failed to delete song:', err)
        useAppStore.getState().showToast('Gagal menghapus lagu', 'error')
      }
    }
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

  const handleNewSong = (): void => {
    setEditingSong(null)
    setScreen('song-editor')
  }

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: filteredSongs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 18
  })

  return (
    <div className="flex-1 flex flex-row min-h-0 rounded-md border border-border-default bg-bg-surface/86 shadow-sm backdrop-blur overflow-hidden">
      {/* Hymnal Sidebar — extracted component */}
      <HymnalSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header: Search & Add */}
        <div className="border-b border-border-subtle bg-bg-surface/70 p-2 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-brand-primary/10 p-1.5 text-brand-primary">
                <Music size={15} />
              </div>
              <h2 className="font-heading text-[13px] font-bold text-text-primary">
                {selectedHymnalId
                  ? hymnals.find((h) => h.id === selectedHymnalId)?.name
                  : 'Library Lagu'}
              </h2>
              <span className="rounded-full bg-bg-elevated border border-border-subtle px-2 py-0.5 text-[10px] font-bold text-text-muted">
                {filteredSongs.length} lagu
                {localQuery && songs.length >= 120 && (
                  <span
                    className="ml-1 text-status-warning"
                    title="Hasil mungkin terpotong (maks 120). Perkecil pencarian."
                  >
                    ⚠
                  </span>
                )}
              </span>
            </div>
            <button onClick={handleNewSong} className="btn btn-primary h-7 px-2 text-[12px]">
              <Plus size={13} strokeWidth={3} />
              Tambah Baru
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-brand-primary transition-colors">
              <Search size={16} />
            </div>
            <input
              id="song-search-input"
              type="text"
              value={localQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari judul, lirik, atau nomor lagu... (Ctrl+K)"
              className="w-full rounded-md border border-border-default bg-bg-base pl-9 pr-9 py-2 text-[12px] text-text-primary placeholder:text-text-disabled transition-all focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
            />
            {localQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col border-b border-border-subtle">
          <div className="flex items-center gap-1 overflow-x-auto bg-bg-base/35 px-2 py-1.5 no-scrollbar">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[12px] font-semibold transition-all ${
                  activeFilter === tab.key
                    ? 'bg-bg-elevated text-brand-primary shadow-sm border border-border-strong'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/50'
                }`}
              >
                {React.cloneElement(tab.icon as React.ReactElement<{ size?: number }>, {
                  size: 14
                })}
                {tab.label}
              </button>
            ))}
          </div>

          {activeFilter === 'category' && (
            <div className="bg-bg-base/50 px-2 py-1.5">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded border border-border-default bg-bg-surface px-2 py-1.5 text-[12px] text-text-primary outline-none focus:border-brand-primary"
              >
                <option value="">-- Pilih Kategori --</option>
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
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const song = filteredSongs[virtualRow.index]
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: '3px 8px'
                  }}
                >
                  <SongCard
                    song={song}
                    rowIndex={virtualRow.index}
                    isActive={selectedSong?.id === song.id}
                    onProjectNow={handleCueSong}
                    onAddToPlaylist={handleAddToPlaylist}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </div>
              )
            })}
          </div>

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
