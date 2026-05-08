import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Grid3X3, Heart, ListMusic, Search, SlidersHorizontal, SortAsc, X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppStore } from '../store/useAppStore'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useProjectionStore } from '../store/useProjectionStore'
import type { Song } from '../types'
import { generateSlides } from '../engine/slideEngine'
import { logger } from '../utils/logger'

type LibraryView = 'playlist' | 'number' | 'title'

function sortSongs(songs: Song[], mode: 'number' | 'title'): Song[] {
  if (mode === 'number') {
    return [...songs].sort((a, b) => {
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }

  return [...songs].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
}

export function LibraryBrowserPanel(): React.JSX.Element {
  const {
    songs,
    hymnals,
    selectedHymnalId,
    searchQuery,
    activeFilter,
    setActiveFilter,
    loadSongs,
    searchSongs,
    loadMoreSongs,
    hasMoreResults,
    isLoadingMore,
    selectedSong,
    setSelectedSong
  } = useAppStore()

  const { addSongToPlaylist } = usePlaylistStore()
  const { setSlides } = useProjectionStore()

  const [view, setView] = useState<LibraryView>('number')
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortMode, setSortMode] = useState<'number' | 'title'>('number')
  const [showFilter, setShowFilter] = useState(false)
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [recentTab, setRecentTab] = useState<'opened' | 'played'>('opened')

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (activeFilter === 'recent' && window.api?.system?.getRecentSongs) {
      window.api.system
        .getRecentSongs(30)
        .then((data) => setRecentSongs(data as Song[]))
        .catch(logger.error)
    }
  }, [activeFilter])

  const categories = useMemo(
    () => Array.from(new Set(songs.map((s) => s.category).filter(Boolean))).sort(),
    [songs]
  )

  const filteredSongs = useMemo(() => {
    let list = songs

    if (activeFilter === 'favorites') list = list.filter((s) => s.is_favorite === 1)
    if (activeFilter === 'category' && selectedCategory) {
      list = list.filter((s) => s.category === selectedCategory)
    }

    if (activeFilter === 'recent') {
      const q = localQuery.trim().toLowerCase()
      list = recentSongs.filter(
        (s) => !q || s.title.toLowerCase().includes(q) || (s.number || '').toLowerCase().includes(q)
      )
    }

    return sortSongs(list, sortMode)
  }, [songs, activeFilter, selectedCategory, sortMode, localQuery, recentSongs])

  const hymnalLabel = useMemo(() => {
    if (!selectedHymnalId) return 'Semua'
    const h = hymnals.find((x) => x.id === selectedHymnalId)
    return h ? `${h.code}. ${h.name}` : 'Semua'
  }, [hymnals, selectedHymnalId])

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

  const cueSong = (song: Song): void => {
    setSelectedSong(song)
    setSlides(generateSlides(song.id, song.lyrics_raw))
  }

  // TITLE LIST virtualization
  const listParentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: filteredSongs.length,
    getScrollElement: () => listParentRef.current,
    estimateSize: () => 62,
    overscan: 14
  })

  // NUMBER GRID
  const numberItems = useMemo(() => {
    const withNumber = filteredSongs
      .filter((s) => (s.number || '').trim() !== '')
      .map((s) => ({
        key: s.id,
        label: s.number,
        song: s
      }))

    // fallback: if no number, show first N songs as index
    if (withNumber.length > 0) return withNumber

    return filteredSongs.slice(0, 300).map((s, idx) => ({
      key: s.id,
      label: String(idx + 1),
      song: s
    }))
  }, [filteredSongs])

  return (
    <div className="h-full w-full grid grid-cols-[300px_1fr] min-h-0 bg-bg-base">
      {/* Left Sidebar */}
      <div className="min-h-0 border-r border-border-default bg-bg-surface/55">
        <div className="p-3 border-b border-border-subtle">
          <button
            className="w-full h-10 px-3 rounded-xl bg-bg-surface border border-border-default text-left flex items-center justify-between no-drag"
            title={hymnalLabel}
            onClick={() => {
              setActiveFilter('all')
              void loadSongs(selectedHymnalId || undefined)
            }}
          >
            <span className="text-[12px] font-black text-text-primary truncate">{hymnalLabel}</span>
            <span className="text-[10px] text-text-muted">▼</span>
          </button>

          <div className="mt-3 relative no-drag">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              <Search size={16} />
            </div>
            <input
              value={localQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tulis judul, lirik, no"
              className="w-full h-10 rounded-xl border border-border-default bg-bg-base pl-9 pr-9 text-[12px] text-text-primary outline-none focus:border-brand-primary"
            />
            {localQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-2 no-drag">
            <button
              onClick={() => {
                setRecentTab('opened')
                setActiveFilter('recent')
              }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg border transition-colors ${
                recentTab === 'opened'
                  ? 'bg-bg-elevated border-border-strong text-text-primary'
                  : 'bg-transparent border-border-default text-text-muted hover:bg-bg-elevated/40'
              }`}
            >
              Terakhir Dibuka
            </button>
            <button
              onClick={() => {
                setRecentTab('played')
                setActiveFilter('recent')
              }}
              className={`flex-1 py-2 text-[12px] font-bold rounded-lg border transition-colors ${
                recentTab === 'played'
                  ? 'bg-bg-elevated border-border-strong text-text-primary'
                  : 'bg-transparent border-border-default text-text-muted hover:bg-bg-elevated/40'
              }`}
            >
              Terakhir Diputar
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {(activeFilter === 'recent' ? recentSongs : filteredSongs).slice(0, 40).map((s) => (
            <button
              key={s.id}
              onClick={() => cueSong(s)}
              className={`w-full text-left p-2 rounded-xl border transition-colors no-drag ${
                selectedSong?.id === s.id
                  ? 'bg-brand-primary/10 border-border-brand'
                  : 'bg-bg-surface/50 border-border-subtle hover:bg-bg-elevated/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="h-9 w-9 rounded-lg bg-bg-elevated border border-border-subtle flex items-center justify-center text-[11px] font-black text-text-secondary">
                  {(s.hymnal_code || 'LS').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-text-primary truncate">
                    {(s.number ? `${s.number}. ` : '') + s.title}
                  </div>
                  <div className="text-[11px] text-text-muted truncate">
                    {(s.lyrics_raw || '').split('\n')[0] || '—'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="min-h-0 flex flex-col">
        <div className="p-3 border-b border-border-default bg-bg-surface/45 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('playlist')}
              className={`h-10 px-4 rounded-xl border text-[12px] font-black uppercase tracking-wide flex items-center gap-2 no-drag ${
                view === 'playlist'
                  ? 'bg-bg-elevated border-border-strong text-text-primary'
                  : 'bg-transparent border-border-default text-text-muted hover:bg-bg-elevated/40'
              }`}
            >
              <ListMusic size={16} /> Playlist
            </button>
            <button
              onClick={() => {
                setView('number')
                setSortMode('number')
              }}
              className={`h-10 px-4 rounded-xl border text-[12px] font-black uppercase tracking-wide flex items-center gap-2 no-drag ${
                view === 'number'
                  ? 'bg-bg-elevated border-border-strong text-text-primary'
                  : 'bg-transparent border-border-default text-text-muted hover:bg-bg-elevated/40'
              }`}
            >
              <Grid3X3 size={16} /> Nomor
            </button>
            <button
              onClick={() => {
                setView('title')
                setSortMode('title')
              }}
              className={`h-10 px-4 rounded-xl border text-[12px] font-black uppercase tracking-wide flex items-center gap-2 no-drag ${
                view === 'title'
                  ? 'bg-bg-elevated border-border-strong text-text-primary'
                  : 'bg-transparent border-border-default text-text-muted hover:bg-bg-elevated/40'
              }`}
            >
              <span className="h-4 w-4 rounded bg-text-muted/30 inline-block" /> Judul
            </button>
          </div>

          <div className="flex items-center gap-2 no-drag">
            <button
              onClick={() => setSortMode((m) => (m === 'title' ? 'number' : 'title'))}
              className="h-10 px-3 rounded-xl border border-border-default bg-bg-base text-[12px] font-bold text-text-secondary hover:bg-bg-elevated/40 flex items-center gap-2"
              title="Sort"
            >
              <SortAsc size={16} /> Sort
            </button>

            <div className="relative">
              <button
                onClick={() => setShowFilter((v) => !v)}
                className="h-10 px-3 rounded-xl border border-border-default bg-status-warning text-[12px] font-black text-bg-base hover:brightness-110 flex items-center gap-2"
                title="Filter"
              >
                <SlidersHorizontal size={16} /> Filter
              </button>

              {showFilter && (
                <div className="absolute right-0 top-full mt-2 w-[280px] rounded-2xl border border-border-strong bg-bg-surface/98 shadow-2xl p-3 z-50">
                  <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                    Kategori
                  </div>
                  <div className="max-h-[260px] overflow-y-auto space-y-1 no-scrollbar">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-[12px] font-semibold border ${
                        selectedCategory === ''
                          ? 'bg-brand-primary/10 text-brand-primary border-border-brand'
                          : 'bg-bg-base/30 text-text-secondary border-border-subtle hover:bg-bg-elevated/50'
                      }`}
                    >
                      Semua
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`w-full px-3 py-2 rounded-xl text-left text-[12px] font-semibold border ${
                          selectedCategory === c
                            ? 'bg-brand-primary/10 text-brand-primary border-border-brand'
                            : 'bg-bg-base/30 text-text-secondary border-border-subtle hover:bg-bg-elevated/50'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 bg-bg-base/20">
          {view === 'playlist' ? (
            <div className="h-full flex items-center justify-center text-text-muted">
              Pilih tab lain untuk melihat lagu.
            </div>
          ) : view === 'number' ? (
            <div className="h-full overflow-y-auto p-4">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(54px,1fr))] gap-3">
                {numberItems.map((it) => {
                  const isActive = selectedSong?.id === it.song.id
                  return (
                    <button
                      key={it.key}
                      onClick={() => cueSong(it.song)}
                      className={`h-12 rounded-xl border text-[12px] font-black transition-colors no-drag ${
                        isActive
                          ? 'bg-brand-primary/12 border-border-brand text-brand-primary'
                          : 'bg-bg-surface/60 border-border-subtle text-text-secondary hover:bg-bg-elevated/60'
                      }`}
                      title={it.song.title}
                    >
                      {it.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div ref={listParentRef} className="h-full overflow-y-auto">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative'
                }}
              >
                {rowVirtualizer.getVirtualItems().map((vr) => {
                  const song = filteredSongs[vr.index]
                  const isActive = selectedSong?.id === song.id

                  return (
                    <div
                      key={vr.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${vr.size}px`,
                        transform: `translateY(${vr.start}px)`,
                        padding: '10px 14px'
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-2xl border bg-bg-surface/55 flex items-center justify-between gap-3 px-3 py-2 transition-colors ${
                          isActive
                            ? 'border-border-brand bg-brand-primary/6'
                            : 'border-border-subtle hover:bg-bg-elevated/45'
                        }`}
                      >
                        <button
                          onClick={() => cueSong(song)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left no-drag"
                        >
                          <div className="h-10 w-10 rounded-xl bg-bg-elevated border border-border-subtle flex items-center justify-center text-[11px] font-black text-text-secondary">
                            {(song.hymnal_code || 'LS').slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[12px] font-black text-text-primary truncate">
                              {(song.number ? `${song.number}. ` : '') + song.title}
                            </div>
                            <div className="text-[11px] text-text-muted truncate">
                              {(song.lyrics_raw || '').split('\n')[0] || '—'}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 no-drag">
                          <button
                            onClick={() => addSongToPlaylist(song)}
                            className="h-9 w-9 rounded-xl border border-border-subtle bg-bg-base/40 hover:bg-bg-elevated flex items-center justify-center text-text-secondary"
                            title="Tambah ke playlist"
                          >
                            <ListMusic size={16} />
                          </button>
                          <button
                            onClick={() => {
                              window.api.songs.toggleFavorite(song.id).then(() => loadSongs())
                            }}
                            className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-colors ${
                              song.is_favorite === 1
                                ? 'border-border-brand bg-brand-primary/12 text-brand-primary'
                                : 'border-border-subtle bg-bg-base/40 text-text-secondary hover:bg-bg-elevated'
                            }`}
                            title="Favorit"
                          >
                            <Heart size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Load more */}
              {localQuery.trim() && hasMoreResults && filteredSongs.length > 0 && (
                <div className="p-3 border-t border-border-subtle bg-bg-base/30">
                  <button
                    onClick={() => loadMoreSongs()}
                    disabled={isLoadingMore}
                    className="w-full h-10 rounded-xl border border-border-default bg-bg-surface/70 text-[12px] font-bold text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
