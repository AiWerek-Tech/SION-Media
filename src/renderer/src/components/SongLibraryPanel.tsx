import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ChevronDown, Clock, Folder, FolderOpen, Music, Plus, Search, Star, X } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { generateSlidesForSong } from '@renderer/engine/slideEngine'
import { logger } from '@renderer/utils/logger'
import type { FilterTab, Song } from '@renderer/types'
import { SongCard } from './SongCard'
import { getHymnalBgColor, getHymnalColor } from '@renderer/utils/hymnal-colors'

const FILTER_TABS: { key: FilterTab; label: string; icon: React.JSX.Element }[] = [
  { key: 'all', label: 'Semua', icon: <FolderOpen size={12} /> },
  { key: 'favorites', label: 'Favorit', icon: <Star size={12} /> },
  { key: 'recent', label: 'Terbaru', icon: <Clock size={12} /> },
  { key: 'category', label: 'Kategori', icon: <Folder size={12} /> }
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
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // ── Auto-select first hymnal ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedHymnalId === null && hymnals.length > 0) {
      setSelectedHymnalId(hymnals[0].id)
    }
  }, [selectedHymnalId, hymnals, setSelectedHymnalId])

  // ── FIX: Reset category selection when hymnal changes ────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSelectedCategory(''), 0)
    return () => clearTimeout(t)
  }, [selectedHymnalId])

  // ── Load recent songs whenever the tab is active or songs list refreshes ──
  // FIX: was only triggered on activeFilter change, missing refresh after play
  const loadRecentSongs = useCallback(async () => {
    if (!window.api?.system?.getRecentSongs) return
    try {
      const data = await window.api.system.getRecentSongs(50)
      setRecentSongs(data as Song[])
    } catch (err) {
      logger.error('Failed to load recent songs:', err)
    }
  }, [])

  useEffect(() => {
    if (activeFilter === 'recent') {
      const t = setTimeout(() => void loadRecentSongs(), 0)
      return () => clearTimeout(t)
    }
    return undefined
  }, [activeFilter, loadRecentSongs])

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80)
    }
  }, [searchOpen])

  // ── Search handler ────────────────────────────────────────────────────────
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

  const handleToggleSearch = (): void => {
    if (searchOpen && localQuery) {
      clearSearch()
    }
    setSearchOpen((v) => !v)
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  // FIX: 'all' and 'favorites' and 'category' all operate on the loaded songs array.
  // 'recent' uses its own separate recentSongs array from song_history.
  let filteredSongs: Song[]

  if (activeFilter === 'recent') {
    // FIX: apply localQuery filter on recentSongs too
    filteredSongs = localQuery.trim()
      ? recentSongs.filter(
          (song) =>
            song.title.toLowerCase().includes(localQuery.toLowerCase()) ||
            song.number.includes(localQuery) ||
            (song.author || '').toLowerCase().includes(localQuery.toLowerCase())
        )
      : recentSongs
  } else {
    filteredSongs = songs.filter((song) => {
      if (activeFilter === 'favorites') return song.is_favorite === 1
      if (activeFilter === 'category' && selectedCategory) return song.category === selectedCategory
      return true
    })
  }

  const categories = Array.from(new Set(songs.map((s) => s.category).filter(Boolean))).sort()
  const selectedHymnal = hymnals.find((hymnal) => hymnal.id === selectedHymnalId)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSongClick = (song: Song): void => {
    useAppStore.getState().setSelectedSong(song)
    setSlides(generateSlidesForSong(song), {
      hymnalCode: song.hymnal_code || 'LS',
      hymnalName: song.hymnal_name || selectedHymnal?.name || 'Lagu Sion',
      songBackgroundConfig: song.song_background_config || ''
    })
    // FIX: refresh recent list after a song is played so "Terbaru" stays current
    if (activeFilter === 'recent') {
      setTimeout(() => void loadRecentSongs(), 300)
    }
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
    // FIX: optimistic update — flip is_favorite immediately so UI responds instantly
    const newFav = song.is_favorite ? 0 : 1
    const updatedSong = { ...song, is_favorite: newFav }
    const appStore = useAppStore.getState()

    // Update songs array in store immediately
    appStore.setSongs(songs.map((s) => (s.id === song.id ? updatedSong : s)))
    // If this song is currently selected, update selectedSong too
    if (appStore.selectedSong?.id === song.id) {
      appStore.setSelectedSong(updatedSong)
    }

    try {
      await window.api.songs.toggleFavorite(song.id)
    } catch (err) {
      logger.error('Failed to toggle favorite:', err)
      // Rollback on error
      appStore.setSongs(songs.map((s) => (s.id === song.id ? song : s)))
      if (appStore.selectedSong?.id === song.id) {
        appStore.setSelectedSong(song)
      }
      appStore.showToast('Gagal mengubah favorit', 'error')
    }
  }

  // ── Empty state messages per filter ──────────────────────────────────────
  const emptyMessages: Record<FilterTab, { title: string; desc: string }> = {
    all: { title: 'Tidak ada lagu', desc: 'Coba kata kunci lain atau pilih buku lagu berbeda.' },
    favorites: {
      title: 'Belum ada favorit',
      desc: 'Klik ikon bintang pada lagu untuk menandainya sebagai favorit.'
    },
    recent: {
      title: 'Belum ada riwayat',
      desc: 'Lagu yang pernah diputar akan muncul di sini.'
    },
    category: {
      title: 'Tidak ada lagu',
      desc: selectedCategory
        ? `Tidak ada lagu dalam kategori "${selectedCategory}".`
        : 'Pilih kategori untuk melihat lagu.'
    }
  }

  const emptyMsg = emptyMessages[activeFilter]

  // ── Animation variants ────────────────────────────────────────────────────
  const listContainerVariants: Variants = {
    show: { transition: { staggerChildren: 0.012 } }
  }

  const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] } }
  }

  return (
    <section className="projection-library-panel">
      {/* ── HEADER: Hymnal dropdown + search icon ────────────────────────── */}
      <div className="projection-library-panel__header">
        {/* Hymnal selector dropdown */}
        <div className="projection-hymnal-dropdown">
          <div
            className="projection-hymnal-dropdown__icon"
            style={
              selectedHymnal
                ? ({
                    '--hymnal-bg': getHymnalBgColor(selectedHymnal.code),
                    '--hymnal-color': getHymnalColor(selectedHymnal.code)
                  } as React.CSSProperties)
                : undefined
            }
          >
            <Music size={14} />
          </div>
          <select
            value={selectedHymnalId ?? ''}
            onChange={(e) => setSelectedHymnalId(Number(e.target.value))}
            className="projection-hymnal-dropdown__select"
            title="Pilih buku lagu"
          >
            {hymnals.map((hymnal) => (
              <option key={hymnal.id} value={hymnal.id}>
                {hymnal.name}
              </option>
            ))}
          </select>
          <ChevronDown size={13} className="projection-hymnal-dropdown__chevron" />
        </div>

        {/* Right: song count + search toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-semibold text-text-disabled tabular-nums mr-1">
            {filteredSongs.length}
          </span>
          <button
            className={`projection-library-panel__tool ${searchOpen ? 'is-active' : ''}`}
            onClick={handleToggleSearch}
            title={searchOpen ? 'Tutup pencarian' : 'Cari lagu (Ctrl+F)'}
          >
            {searchOpen && localQuery ? <X size={15} /> : <Search size={15} />}
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR: collapsible ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            key="search-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="projection-library-search projection-library-search--compact">
              <Search size={14} className="shrink-0" />
              <input
                id="song-search-input"
                ref={searchInputRef}
                type="text"
                value={localQuery}
                onChange={(event) => handleSearch(event.target.value)}
                placeholder="Judul, lirik, penulis, tema..."
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    clearSearch()
                    setSearchOpen(false)
                  }
                }}
              />
              {localQuery && (
                <button onClick={clearSearch} title="Hapus pencarian">
                  <X size={13} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FILTER TABS ───────────────────────────────────────────────────── */}
      <div className="projection-library-filters projection-library-filters--compact">
        <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={activeFilter === tab.key ? 'is-active' : ''}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Category selector inline */}
        {activeFilter === 'category' && (
          <div className="projection-category-select projection-category-select--inline">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="">Semua</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown size={11} />
          </div>
        )}
      </div>

      {/* ── SONG LIST ─────────────────────────────────────────────────────── */}
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

        {/* FIX: per-filter empty state messages */}
        {filteredSongs.length === 0 && (
          <div className="projection-library-empty">
            {activeFilter === 'favorites' ? (
              <Star size={28} className="opacity-30" />
            ) : activeFilter === 'recent' ? (
              <Clock size={28} className="opacity-30" />
            ) : (
              <Search size={28} className="opacity-30" />
            )}
            <h3>{emptyMsg.title}</h3>
            <p>{emptyMsg.desc}</p>
          </div>
        )}

        {/* Load more — only relevant for 'all' with active search */}
        {activeFilter === 'all' &&
          localQuery.trim() &&
          hasMoreResults &&
          filteredSongs.length > 0 && (
            <div className="projection-library-load-more">
              <button onClick={() => loadMoreSongs()} disabled={isLoadingMore}>
                <Plus size={13} />
                {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
      </div>
    </section>
  )
}
