import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronDown, Clock, Heart, History, Search, Star, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import type { Song } from '../../types'

interface SidebarProps {
  onSelectSong: (song: Song) => void
  selectedSongId?: number | null
}

export function LibrarySidebar({ onSelectSong, selectedSongId }: SidebarProps): React.JSX.Element {
  const { songs, hymnals, selectedHymnalId, setSelectedHymnalId, searchQuery, searchSongs } =
    useAppStore()

  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [hymnalOpen, setHymnalOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'search' | 'recent' | 'favorites'>('search')
  const [recentSongs, setRecentSongs] = useState<Song[]>([])

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hymnalDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.api?.system?.getRecentSongs) {
      window.api.system
        .getRecentSongs(20)
        .then((data) => setRecentSongs(data as Song[]))
        .catch(() => {})
    }
  }, [activeSection])

  const handleSearch = useCallback(
    (value: string) => {
      setLocalQuery(value)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        searchSongs(value)
      }, 250)
    },
    [searchSongs]
  )

  const clearSearch = (): void => {
    setLocalQuery('')
    searchSongs('')
  }

  const favoriteSongs = useMemo(
    () => songs.filter((s) => s.is_favorite === 1).slice(0, 30),
    [songs]
  )

  const displayedSongs = useMemo(() => {
    if (activeSection === 'favorites') return favoriteSongs
    if (activeSection === 'recent') return recentSongs
    const q = localQuery.trim().toLowerCase()
    if (!q) return songs.slice(0, 20)
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.number || '').toLowerCase().includes(q) ||
        (s.author || '').toLowerCase().includes(q)
    )
  }, [activeSection, favoriteSongs, recentSongs, localQuery, songs])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId),
    [hymnals, selectedHymnalId]
  )

  const handleHymnalSelect = (id: number | null): void => {
    setSelectedHymnalId(id)
    setHymnalOpen(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent): void {
      if (hymnalDropdownRef.current && !hymnalDropdownRef.current.contains(e.target as Node)) {
        setHymnalOpen(false)
      }
    }
    if (hymnalOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [hymnalOpen])

  return (
    <div className="h-full flex flex-col surface-1">
      {/* Hymnal Selector */}
      <div className="px-3 pt-3 pb-2 relative" ref={hymnalDropdownRef}>
        <button
          onClick={() => setHymnalOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-surface-2/60 border border-border-default/40 hover:bg-surface-3/60 transition-all duration-200 group"
        >
          <div className="h-8 w-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
            <BookOpen size={15} />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-[11px] text-text-muted font-medium leading-tight">Buku Lagu</div>
            <div className="text-[12px] text-text-primary font-semibold truncate leading-tight">
              {selectedHymnal ? `${selectedHymnal.code}. ${selectedHymnal.name}` : 'Semua Hymnal'}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform duration-200 ${hymnalOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {hymnalOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-3 right-3 top-full mt-1.5 z-50 glass-panel-strong p-1.5 max-h-[280px] overflow-y-auto scrollbar-thin"
            >
              <button
                onClick={() => handleHymnalSelect(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-colors ${
                  selectedHymnalId === null
                    ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                    : 'text-text-secondary hover:bg-surface-3/50'
                }`}
              >
                <span className="text-[10px] font-bold bg-surface-3 border border-border-default/30 rounded px-1.5 py-0.5">
                  ALL
                </span>
                Semua Hymnal
              </button>
              {hymnals.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleHymnalSelect(h.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-colors ${
                    selectedHymnalId === h.id
                      ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                      : 'text-text-secondary hover:bg-surface-3/50'
                  }`}
                >
                  <span className="text-[10px] font-bold bg-surface-3 border border-border-default/30 rounded px-1.5 py-0.5 min-w-[28px] text-center">
                    {h.code}
                  </span>
                  <span className="truncate">{h.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={localQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari judul, nomor, lirik..."
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-surface-0/80 border border-border-default/30 text-[12px] text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary/30 focus:ring-2 focus:ring-brand-primary/8 transition-all duration-200"
          />
          {localQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md bg-surface-2/60 hover:bg-surface-3 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="px-3 pb-2 flex gap-1">
        <SectionTab
          icon={<Search size={13} />}
          label="Cari"
          active={activeSection === 'search'}
          onClick={() => setActiveSection('search')}
          count={songs.length}
        />
        <SectionTab
          icon={<History size={13} />}
          label="Terakhir"
          active={activeSection === 'recent'}
          onClick={() => setActiveSection('recent')}
          count={recentSongs.length}
        />
        <SectionTab
          icon={<Heart size={13} />}
          label="Favorit"
          active={activeSection === 'favorites'}
          onClick={() => setActiveSection('favorites')}
          count={favoriteSongs.length}
        />
      </div>

      {/* Divider */}
      <div className="mx-3 divider-glow mb-2" />

      {/* Song List */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 pb-3">
        <div className="space-y-1">
          {displayedSongs.map((song, index) => (
            <SongListItem
              key={song.id}
              song={song}
              index={index}
              isSelected={selectedSongId === song.id}
              onClick={() => onSelectSong(song)}
              activeSection={activeSection}
            />
          ))}
          {displayedSongs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-text-muted">
              <Search size={20} className="mb-2 opacity-50" />
              <p className="text-[11px]">Tidak ada hasil</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Section Tab ── */
function SectionTab({
  icon,
  label,
  active,
  onClick,
  count
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  count: number
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
        active
          ? 'bg-surface-3 text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-secondary hover:bg-surface-2/40'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
            active ? 'bg-brand-primary/15 text-brand-primary' : 'bg-surface-3 text-text-muted'
          }`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

/* ── Song List Item ── */
function SongListItem({
  song,
  isSelected,
  onClick,
  activeSection
}: {
  song: Song
  index: number
  isSelected: boolean
  onClick: () => void
  activeSection: string
}): React.JSX.Element {
  const isRecent = activeSection === 'recent'
  const isFavorite = song.is_favorite === 1

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-200 group ${
        isSelected
          ? 'bg-brand-primary/8 border border-brand-primary/20 shadow-sm'
          : 'border border-transparent hover:bg-surface-2/50 hover:border-border-default/20'
      }`}
    >
      {/* Thumbnail / Hymnal Badge */}
      <div
        className={`h-9 w-9 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
          isSelected
            ? 'bg-brand-primary/15 text-brand-primary border border-brand-primary/20'
            : 'bg-surface-2 text-text-muted border border-border-default/30 group-hover:border-border-default/50'
        }`}
      >
        {song.hymnal_code?.slice(0, 2) || 'LS'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-text-muted font-mono tabular-nums">
            {song.number || '—'}
          </span>
          <span
            className={`text-[12px] font-semibold truncate ${
              isSelected ? 'text-brand-primary' : 'text-text-primary'
            }`}
          >
            {song.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {song.category && (
            <span className="text-[10px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
              {song.category}
            </span>
          )}
          {isFavorite && <Star size={10} className="text-amber-400 fill-amber-400" />}
          {isRecent && song.last_used && (
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Clock size={10} />
              {formatRelativeTime(song.last_used)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}

/* ── Relative Time Formatter ── */
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'baru saja'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}j`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}h`
    return `${Math.floor(days / 7)}mg`
  } catch {
    return ''
  }
}
