import React, { useCallback, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  ChevronDown,
  Clock,
  Folder,
  FolderOpen,
  ListFilter,
  Music,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  X
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlidesForSong } from '../engine/slideEngine'
import { logger } from '../utils/logger'
import type { FilterTab, Song } from '../types'
import { SongCard } from './SongCard'
import { getHymnalBgColor, getHymnalBorderColor, getHymnalColor } from '../utils/hymnal-colors'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.JSX.Element }[] = [
  { key: 'all', label: 'Semua', icon: <FolderOpen size={13} /> },
  { key: 'favorites', label: 'Favorit', icon: <Star size={13} /> },
  { key: 'recent', label: 'Terbaru', icon: <Clock size={13} /> },
  { key: 'category', label: 'Kategori', icon: <Folder size={13} /> }
]

export function SongLibraryPanel(): React.JSX.Element {
  'use no memo'
  const {
    songs,
    hymnals,
    selectedHymnalId,
    setSelectedHymnalId,
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
  const { addSongToPlaylist, activePlaylist } = usePlaylistStore()
  const { setSlides } = useProjectionStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => {
    if (selectedHymnalId === null && hymnals.length > 0) {
      setSelectedHymnalId(hymnals[0].id)
    }
  }, [selectedHymnalId, hymnals, setSelectedHymnalId])

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
      }, 180)
    },
    [searchSongs]
  )

  const clearSearch = (): void => {
    setLocalQuery('')
    searchSongs('')
  }

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
  const selectedHymnal = hymnals.find((hymnal) => hymnal.id === selectedHymnalId)

  const handleSongClick = (song: Song): void => {
    useAppStore.getState().setSelectedSong(song)
    setSlides(generateSlidesForSong(song), {
      hymnalCode: song.hymnal_code || 'LS',
      hymnalName: song.hymnal_name || selectedHymnal?.name || 'Lagu Sion'
    })
  }

  const handleAddToPlaylist = async (song: Song): Promise<void> => {
    if (!activePlaylist) {
      useAppStore.getState().showToast('Buka atau buat playlist terlebih dahulu', 'error')
      return
    }
    await addSongToPlaylist(song)
    useAppStore.getState().showToast(`"${song.title}" ditambahkan ke playlist`, 'success')
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

  const listContainerVariants: Variants = {
    show: {
      transition: {
        staggerChildren: 0.012
      }
    }
  }

  const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <section className="projection-library-panel">
      <div className="projection-library-panel__header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="projection-panel-icon projection-panel-icon--blue">
            <Music size={17} />
          </div>
          <div className="min-w-0">
            <h2>{selectedHymnal?.name || 'Song Library'}</h2>
            <p>
              {filteredSongs.length} lagu
              {localQuery && songs.length >= 120 ? ' / hasil pencarian terbatas' : ''}
            </p>
          </div>
        </div>

        <button className="projection-library-panel__tool" title="Library options">
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="projection-hymnal-strip">
        {hymnals.map((hymnal) => {
          const isActive = selectedHymnalId === hymnal.id
          return (
            <button
              key={hymnal.id}
              onClick={() => setSelectedHymnalId(hymnal.id)}
              className={isActive ? 'is-active' : ''}
              style={
                isActive
                  ? ({
                      '--hymnal-bg': getHymnalBgColor(hymnal.code),
                      '--hymnal-color': getHymnalColor(hymnal.code),
                      '--hymnal-border': getHymnalBorderColor(hymnal.code)
                    } as React.CSSProperties)
                  : undefined
              }
              title={hymnal.name}
            >
              {hymnal.code}
            </button>
          )
        })}
      </div>

      <div className="projection-library-search">
        <Search size={16} />
        <input
          id="song-search-input"
          type="text"
          value={localQuery}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Cari judul, lirik, penulis, tema... (Ctrl+K)"
        />
        {localQuery && (
          <button onClick={clearSearch} title="Clear search">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="projection-library-filters">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={activeFilter === tab.key ? 'is-active' : ''}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <span>{filteredSongs.length} lagu</span>
      </div>

      {activeFilter === 'category' && (
        <div className="projection-category-select">
          <ListFilter size={14} />
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
      )}

      <div className="projection-library-list">
        <motion.div
          initial="hidden"
          animate="show"
          variants={listContainerVariants}
          className="projection-library-list__stack"
        >
          {filteredSongs.map((song, index) => (
            <motion.div key={song.id} variants={listItemVariants}>
              <SongCard
                song={song}
                rowIndex={index}
                isActive={selectedSong?.id === song.id}
                onProjectNow={handleSongClick}
                onAddToPlaylist={handleAddToPlaylist}
                onToggleFavorite={handleToggleFavorite}
              />
            </motion.div>
          ))}
        </motion.div>

        {filteredSongs.length === 0 && (
          <div className="projection-library-empty">
            <Search size={32} />
            <h3>Tidak ada hasil</h3>
            <p>Coba kata kunci lain atau gunakan filter berbeda.</p>
          </div>
        )}

        {localQuery.trim() && hasMoreResults && filteredSongs.length > 0 && (
          <div className="projection-library-load-more">
            <button onClick={() => loadMoreSongs()} disabled={isLoadingMore}>
              <Plus size={14} />
              {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
