import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Settings,
  UploadCloud,
  Plus,
  Edit3,
  Trash2,
  Search,
  BookOpen,
  Music,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  FolderPlus
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Song, Hymnal } from '../../types'
import { logger } from '../../utils/logger'

export function ManagementMode(): React.JSX.Element {
  const { setScreen, setEditingSong, hymnals, loadHymnals, songs, loadSongs, showToast } =
    useAppStore()

  const [selectedHymnalId, setSelectedHymnalId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyEmptyLyrics, setShowOnlyEmptyLyrics] = useState(false)
  const [sortMode, setSortMode] = useState<'number-asc' | 'title-asc'>('number-asc')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [quickEditDraft, setQuickEditDraft] = useState<{
    number: string
    title: string
    alternate_title: string
    category: string
    key_note: string
  } | null>(null)
  const [isQuickSaving, setIsQuickSaving] = useState(false)
  const [showNewHymnalDialog, setShowNewHymnalDialog] = useState(false)
  const [newHymnalData, setNewHymnalData] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: ''
  })

  const searchRef = useRef<HTMLInputElement | null>(null)
  const listViewportRef = useRef<HTMLDivElement | null>(null)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listViewportHeight, setListViewportHeight] = useState(600)

  const rowHeight = 56
  const overscan = 8

  useEffect(() => {
    const el = listViewportRef.current
    if (!el) return

    setListViewportHeight(el.clientHeight || 600)
    const ro = new ResizeObserver(() => {
      setListViewportHeight(el.clientHeight || 600)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const resetListScroll = useCallback((): void => {
    const el = listViewportRef.current
    if (el) el.scrollTop = 0
    setListScrollTop(0)
  }, [listViewportRef])

  const scrollToIndex = useCallback(
    (idx: number): void => {
      const el = listViewportRef.current
      if (!el) return
      const top = idx * rowHeight
      const bottom = top + rowHeight
      const viewTop = el.scrollTop
      const viewBottom = el.scrollTop + el.clientHeight

      if (top < viewTop) {
        el.scrollTop = top
        setListScrollTop(top)
        return
      }
      if (bottom > viewBottom) {
        const nextTop = Math.max(0, bottom - el.clientHeight)
        el.scrollTop = nextTop
        setListScrollTop(nextTop)
      }
    },
    [rowHeight]
  )

  // Load hymnals on mount
  useEffect(() => {
    loadHymnals()
  }, [loadHymnals])

  // Load songs when hymnal is selected
  useEffect(() => {
    if (selectedHymnalId) {
      loadSongs(selectedHymnalId)
    }
  }, [selectedHymnalId, loadSongs])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId),
    [hymnals, selectedHymnalId]
  )

  const hymnalStats = useMemo(() => {
    const emptyLyricsCount = songs.reduce((count, s) => {
      const hasLyrics = (s.lyrics_raw || '').trim().length > 0
      return count + (hasLyrics ? 0 : 1)
    }, 0)
    const withLyricsCount = songs.length - emptyLyricsCount
    const withLyricsPct = songs.length > 0 ? Math.round((withLyricsCount / songs.length) * 100) : 0
    return { emptyLyricsCount, withLyricsCount, withLyricsPct }
  }, [songs])

  // Filter songs by search query
  const filteredSongs = useMemo(() => {
    let result = songs
    if (showOnlyEmptyLyrics) {
      result = result.filter((s) => (s.lyrics_raw || '').trim().length === 0)
    }
    if (!searchQuery.trim()) return result
    const query = searchQuery.toLowerCase()
    return result.filter(
      (s) =>
        s.number.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        (s.alternate_title && s.alternate_title.toLowerCase().includes(query))
    )
  }, [songs, searchQuery, showOnlyEmptyLyrics])

  const visibleSongs = useMemo(() => {
    const list = [...filteredSongs]
    if (sortMode === 'title-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title))
      return list
    }
    const toNum = (v: string): number => {
      const n = Number(String(v).replace(/[^0-9]/g, ''))
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
    }
    list.sort((a, b) => {
      const an = toNum(a.number)
      const bn = toNum(b.number)
      if (an !== bn) return an - bn
      return a.number.localeCompare(b.number)
    })
    return list
  }, [filteredSongs, sortMode])

  const selectedSong = useMemo(() => {
    if (!selectedSongId) return null
    return songs.find((s) => s.id === selectedSongId) || null
  }, [songs, selectedSongId])

  const quickEditDuplicateMessage = useMemo((): string | null => {
    if (!selectedSong || !quickEditDraft) return null
    const number = quickEditDraft.number.trim().toLowerCase()
    const title = quickEditDraft.title.trim().toLowerCase()

    const hymnalSongs = songs.filter((s) => s.hymnal_id === selectedSong.hymnal_id)
    const duplicateByNumber = hymnalSongs.find(
      (s) => s.id !== selectedSong.id && s.number.trim().toLowerCase() === number
    )
    const duplicateByTitle = hymnalSongs.find(
      (s) => s.id !== selectedSong.id && s.title.trim().toLowerCase() === title
    )

    if (duplicateByNumber && duplicateByTitle) {
      return `Nomor "${quickEditDraft.number}" dan judul "${quickEditDraft.title}" sudah ada di buku ini`
    }
    if (duplicateByNumber) {
      return `Nomor "${quickEditDraft.number}" sudah digunakan oleh "${duplicateByNumber.title}"`
    }
    if (duplicateByTitle) {
      return `Judul "${quickEditDraft.title}" sudah digunakan oleh nomor ${duplicateByTitle.number}`
    }
    return null
  }, [selectedSong, quickEditDraft, songs])

  const virtualRange = useMemo(() => {
    const total = visibleSongs.length
    if (total === 0) {
      return {
        startIndex: 0,
        endIndex: -1,
        topPad: 0,
        bottomPad: 0,
        slice: [] as Song[]
      }
    }
    const rawStart = Math.floor(listScrollTop / rowHeight) - overscan
    const startIndex = Math.max(0, rawStart)
    const visibleCount = Math.ceil(listViewportHeight / rowHeight) + overscan * 2
    const endIndex = Math.min(total - 1, startIndex + visibleCount)
    const topPad = startIndex * rowHeight
    const bottomPad = (total - endIndex - 1) * rowHeight
    return {
      startIndex,
      endIndex,
      topPad,
      bottomPad,
      slice: visibleSongs.slice(startIndex, endIndex + 1)
    }
  }, [visibleSongs, listScrollTop, listViewportHeight])

  const handleEditSong = useCallback(
    (song: Song): void => {
      setEditingSong(song)
      setScreen('song-editor')
    },
    [setEditingSong, setScreen]
  )

  const openQuickEdit = useCallback((): void => {
    if (!selectedSong) return
    setQuickEditDraft({
      number: selectedSong.number || '',
      title: selectedSong.title || '',
      alternate_title: selectedSong.alternate_title || '',
      category: selectedSong.category || '',
      key_note: selectedSong.key_note || ''
    })
  }, [selectedSong])

  const cancelQuickEdit = useCallback((): void => {
    setQuickEditDraft(null)
  }, [])

  const saveQuickEdit = useCallback(async (): Promise<void> => {
    if (!selectedSong || !quickEditDraft) return
    if (!quickEditDraft.number.trim() || !quickEditDraft.title.trim()) {
      showToast('Nomor dan judul wajib diisi', 'error')
      return
    }
    if (quickEditDuplicateMessage) {
      showToast(quickEditDuplicateMessage, 'error')
      return
    }

    setIsQuickSaving(true)
    try {
      const songData = {
        hymnal_id: selectedSong.hymnal_id,
        number: quickEditDraft.number,
        title: quickEditDraft.title,
        alternate_title: quickEditDraft.alternate_title,
        lyrics_raw: selectedSong.lyrics_raw || '',
        category: quickEditDraft.category,
        language: selectedSong.language || 'Indonesia',
        author: selectedSong.author || '',
        composer: selectedSong.composer || '',
        key_note: quickEditDraft.key_note,
        time_signature: selectedSong.time_signature || '',
        tempo: selectedSong.tempo || '',
        tags: selectedSong.tags || ''
      }
      await window.api.songs.update(selectedSong.id, songData)
      await loadSongs(selectedSong.hymnal_id)
      setQuickEditDraft(null)
      showToast('Perubahan disimpan', 'success')
    } catch (err) {
      logger.error('Quick edit save failed:', err)
      showToast('Gagal menyimpan perubahan', 'error')
    } finally {
      setIsQuickSaving(false)
    }
  }, [selectedSong, quickEditDraft, loadSongs, quickEditDuplicateMessage, showToast])

  const selectSongByIndex = useCallback(
    (idx: number): void => {
      const next = visibleSongs[idx]
      if (!next) return
      setSelectedSongId(next.id)
      scrollToIndex(idx)
    },
    [visibleSongs, scrollToIndex]
  )

  const jumpToEmptyLyrics = useCallback(
    (direction: 'next' | 'prev'): void => {
      if (!selectedHymnalId) return
      if (visibleSongs.length === 0) return

      const isEmpty = (s: Song): boolean => (s.lyrics_raw || '').trim().length === 0
      const currentIdx = selectedSongId
        ? visibleSongs.findIndex((s) => s.id === selectedSongId)
        : -1

      const step = direction === 'next' ? 1 : -1
      const start =
        currentIdx === -1 ? (direction === 'next' ? 0 : visibleSongs.length - 1) : currentIdx + step

      const inBounds = (i: number): boolean => i >= 0 && i < visibleSongs.length
      for (let i = start; inBounds(i); i += step) {
        if (isEmpty(visibleSongs[i])) {
          selectSongByIndex(i)
          return
        }
      }

      // Wrap-around
      const wrapStart = direction === 'next' ? 0 : visibleSongs.length - 1
      const wrapEnd = direction === 'next' ? visibleSongs.length : -1
      for (let i = wrapStart; i !== wrapEnd; i += step) {
        if (isEmpty(visibleSongs[i])) {
          selectSongByIndex(i)
          return
        }
      }

      showToast('Tidak ada lagu dengan lirik kosong', 'success')
    },
    [selectedHymnalId, visibleSongs, selectedSongId, selectSongByIndex, showToast]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (e.key === '/' && !isTypingTarget) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (!selectedHymnalId) return
      if (isTypingTarget) return
      if (visibleSongs.length === 0) return

      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        jumpToEmptyLyrics(e.shiftKey ? 'prev' : 'next')
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const currentIdx = selectedSongId
          ? visibleSongs.findIndex((s) => s.id === selectedSongId)
          : -1
        const nextIdx = Math.min(visibleSongs.length - 1, currentIdx + 1)
        selectSongByIndex(Math.max(0, nextIdx))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIdx = selectedSongId
          ? visibleSongs.findIndex((s) => s.id === selectedSongId)
          : visibleSongs.length
        const nextIdx = Math.max(0, currentIdx - 1)
        selectSongByIndex(nextIdx)
        return
      }
      if (e.key === 'Enter') {
        if (!selectedSongId) return
        const song = songs.find((s) => s.id === selectedSongId)
        if (!song) return
        e.preventDefault()
        handleEditSong(song)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedHymnalId,
    visibleSongs,
    selectSongByIndex,
    selectedSongId,
    songs,
    handleEditSong,
    jumpToEmptyLyrics
  ])

  const handleAddNewSong = (): void => {
    // Check if hymnal is selected
    if (!selectedHymnalId) {
      showToast('Pilih buku lagu terlebih dahulu', 'error')
      return
    }
    setEditingSong(null)
    setScreen('song-editor')
  }

  const handleDeleteSong = async (song: Song): Promise<void> => {
    if (!confirm(`Hapus lagu "${song.number} - ${song.title}"?`)) return

    try {
      await window.api.songs.delete(song.id)
      if (selectedSongId === song.id) {
        setSelectedSongId(null)
      }
      await loadSongs(selectedHymnalId || undefined)
      showToast('Lagu berhasil dihapus', 'success')
    } catch (err) {
      logger.error('Failed to delete song:', err)
      showToast('Gagal menghapus lagu', 'error')
    }
  }

  const handleCreateHymnal = async (): Promise<void> => {
    if (!newHymnalData.code.trim() || !newHymnalData.name.trim()) {
      showToast('Kode dan nama buku lagu wajib diisi', 'error')
      return
    }

    // Check if code already exists
    if (hymnals.some((h) => h.code.toLowerCase() === newHymnalData.code.toLowerCase())) {
      showToast('Kode buku lagu sudah ada', 'error')
      return
    }

    try {
      const result = await window.api.hymnals.add({
        code: newHymnalData.code.toUpperCase(),
        name: newHymnalData.name,
        language: newHymnalData.language,
        publisher: newHymnalData.publisher,
        region: 'Indonesia',
        version: '1.0',
        is_official: 0
      })
      await loadHymnals()
      setShowNewHymnalDialog(false)
      setNewHymnalData({ code: '', name: '', language: 'Indonesia', publisher: '' })
      // Select the new hymnal
      const newHymnal = result as Hymnal
      if (newHymnal?.id) {
        setSelectedHymnalId(newHymnal.id)
      }
      showToast('Buku lagu berhasil dibuat', 'success')
    } catch (err) {
      logger.error('Failed to create hymnal:', err)
      showToast('Gagal membuat buku lagu', 'error')
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-base text-text-primary overflow-hidden">
      {/* Header - L3 Elevated with glassmorphism */}
      <div className="shrink-0 px-6 py-4 border-b border-border-subtle bg-bg-surface/70 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_12px_rgba(0,0,0,0.12)] sticky top-0 z-30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-h2">Content Management</h1>
            <p className="text-text-muted text-sm">Kelola buku lagu dan lagu dalam database</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScreen('import-export')}
              className="btn btn-ghost text-xs flex items-center gap-2"
            >
              <UploadCloud size={16} />
              Import/Export
            </button>
            <button
              onClick={() => setScreen('settings')}
              className="btn btn-ghost text-xs flex items-center gap-2"
            >
              <Settings size={16} />
              Pengaturan
            </button>
          </div>
        </div>

        {/* Hymnal Selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
              Pilih Buku Lagu
            </label>
            <div className="relative">
              <select
                value={selectedHymnalId || ''}
                onChange={(e) => {
                  const nextId = Number(e.target.value) || null
                  setSelectedHymnalId(nextId)
                  setSelectedSongId(null)
                  resetListScroll()
                }}
                className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all appearance-none pr-10"
              >
                <option value="">-- Pilih Buku Lagu --</option>
                {hymnals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.code} - {h.name} ({h.language})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>
          </div>

          <button
            onClick={() => setShowNewHymnalDialog(true)}
            className="btn btn-primary text-xs flex items-center gap-2 mt-5"
          >
            <FolderPlus size={16} />
            Buku Lagu Baru
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {selectedHymnal ? (
          <>
            {/* Song List Header - L2 Surface */}
            <div className="shrink-0 px-6 py-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.02)] flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <Music size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{selectedHymnal.name}</div>
                  <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
                    <span>
                      {songs.length} lagu · {selectedHymnal.code}
                    </span>
                    <span className="text-text-muted/50">|</span>
                    <span>
                      {hymnalStats.withLyricsCount} lengkap · {hymnalStats.emptyLyricsCount} kosong
                    </span>
                    <span className="text-text-muted/50">|</span>
                    <span>{hymnalStats.withLyricsPct}% coverage</span>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={() => setShowOnlyEmptyLyrics((v) => !v)}
                    className={`h-8 px-3 rounded-lg border text-[11px] font-bold transition-all ${
                      showOnlyEmptyLyrics
                        ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
                        : 'border-border-default bg-bg-base text-text-muted hover:text-text-primary hover:border-border-strong'
                    }`}
                    title="Tampilkan hanya lagu dengan lirik kosong"
                  >
                    {showOnlyEmptyLyrics ? 'Filter: Lirik Kosong' : 'Filter: Semua'}
                  </button>

                  <button
                    onClick={() => jumpToEmptyLyrics('next')}
                    className="h-8 px-3 rounded-lg border border-border-default bg-bg-base text-[11px] font-bold text-text-muted hover:text-text-primary hover:border-border-strong transition-all"
                    title="Lompat ke lagu berikutnya yang liriknya kosong (E)"
                  >
                    Empty Next
                  </button>

                  <select
                    value={sortMode}
                    onChange={(e) => {
                      setSortMode(e.target.value as 'number-asc' | 'title-asc')
                      resetListScroll()
                    }}
                    className="h-8 px-3 rounded-lg border border-border-default bg-bg-base text-[11px] font-bold text-text-muted hover:text-text-primary hover:border-border-strong focus:border-brand-primary outline-none transition-all appearance-none"
                    title="Urutkan daftar lagu"
                  >
                    <option value="number-asc">Urut: Nomor</option>
                    <option value="title-asc">Urut: Judul</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      resetListScroll()
                    }}
                    placeholder="Cari nomor/judul..."
                    className="h-9 w-56 pl-9 pr-9 rounded-lg bg-bg-base border border-border-default text-sm focus:border-brand-primary outline-none"
                    ref={searchRef}
                  />
                  {searchQuery.trim().length > 0 && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        resetListScroll()
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                      title="Hapus pencarian"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Add Song Button */}
                <button
                  onClick={handleAddNewSong}
                  className="btn btn-primary text-xs flex items-center gap-2"
                >
                  <Plus size={16} />
                  Tambah Lagu
                </button>
              </div>
            </div>

            {/* Song List */}
            <div className="flex-1 min-h-0 grid grid-cols-12">
              <div className="col-span-12 lg:col-span-7 xl:col-span-8 min-h-0 border-r border-border-subtle">
                <div
                  className="h-full overflow-y-auto"
                  ref={listViewportRef}
                  onScroll={(e) => setListScrollTop((e.target as HTMLDivElement).scrollTop)}
                >
                  {visibleSongs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted px-6">
                      <div className="h-16 w-16 rounded-2xl bg-bg-elevated/60 border border-border-subtle flex items-center justify-center mb-5">
                        <Music size={28} className="opacity-50" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-text-primary">
                        {searchQuery
                          ? 'Tidak ada hasil'
                          : showOnlyEmptyLyrics
                            ? 'Semua lagu sudah lengkap'
                            : 'Belum ada lagu'}
                      </h3>
                      <p className="text-sm text-center max-w-lg">
                        {searchQuery
                          ? 'Coba kata kunci lain, atau hapus pencarian.'
                          : showOnlyEmptyLyrics
                            ? 'Tidak ada lagu dengan lirik kosong pada buku ini.'
                            : 'Tambahkan lagu baru untuk mulai mengisi konten.'}
                      </p>
                      <div className="flex items-center gap-3 mt-5">
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="btn btn-ghost text-xs"
                          >
                            Reset Pencarian
                          </button>
                        )}
                        {showOnlyEmptyLyrics && (
                          <button
                            onClick={() => setShowOnlyEmptyLyrics(false)}
                            className="btn btn-ghost text-xs"
                          >
                            Reset Filter
                          </button>
                        )}
                        <button
                          onClick={handleAddNewSong}
                          className="btn btn-primary text-xs flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Tambah Lagu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border-subtle">
                      <div className="sticky top-0 z-10 bg-bg-surface/60 backdrop-blur-md border-b border-border-subtle px-6 py-2">
                        <div className="grid grid-cols-[64px_1fr_170px_88px] gap-4 text-[10px] font-black uppercase tracking-widest text-text-muted">
                          <div className="text-center">No</div>
                          <div>Judul</div>
                          <div>Status</div>
                          <div className="text-right">Aksi</div>
                        </div>
                      </div>

                      <div style={{ height: virtualRange.topPad }} />
                      {virtualRange.slice.map((song, idx) => {
                        const hasLyrics = song.lyrics_raw?.trim().length > 0
                        const isSelected = song.id === selectedSongId
                        return (
                          <div
                            key={song.id}
                            className={`h-14 px-6 transition-all duration-200 group grid grid-cols-[64px_1fr_170px_88px] gap-4 items-center cursor-pointer ${
                              isSelected
                                ? 'bg-brand-primary/10 ring-1 ring-brand-primary/20 shadow-[var(--shadow-elevation-2)]'
                                : (virtualRange.startIndex + idx) % 2 === 0
                                  ? 'bg-bg-elevated/14 hover:bg-bg-elevated/26'
                                  : 'bg-bg-surface/10 hover:bg-bg-elevated/22'
                            } hover:shadow-[var(--shadow-elevation-2)] hover:scale-[1.005]`}
                            onClick={() => setSelectedSongId(song.id)}
                            onDoubleClick={() => handleEditSong(song)}
                          >
                            <div className="shrink-0 text-center">
                              <span className="text-sm font-bold text-text-primary">
                                {song.number}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary truncate">
                                  {song.title}
                                </span>
                                {song.alternate_title && (
                                  <span className="text-xs text-text-muted truncate">
                                    ({song.alternate_title})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {song.category && (
                                  <span className="text-[10px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">
                                    {song.category}
                                  </span>
                                )}
                                {song.key_note && (
                                  <span className="text-[10px] text-text-muted">
                                    Nada: {song.key_note}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {!hasLyrics && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                                  <AlertTriangle size={10} />
                                  Lirik Kosong
                                </span>
                              )}
                              {hasLyrics && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-1 rounded">
                                  <CheckCircle size={10} />
                                  {song.lyrics_raw.split('\n').length} baris
                                </span>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center justify-end gap-1 opacity-100">
                              <div className="flex items-center justify-end gap-1 opacity-20 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditSong(song)
                                  }}
                                  className="p-2 rounded-lg text-text-muted/80 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                  title="Edit lagu"
                                >
                                  <Edit3 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void handleDeleteSong(song)
                                  }}
                                  className="p-2 rounded-lg text-text-muted/80 hover:text-status-error hover:bg-status-error/10 transition-colors"
                                  title="Hapus lagu"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ height: virtualRange.bottomPad }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 min-h-0">
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="shrink-0 px-5 py-4 border-b border-border-subtle bg-bg-surface/70 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                          Detail Lagu
                        </div>
                        <div className="text-sm font-semibold text-text-primary mt-1 truncate">
                          {selectedSong
                            ? `${selectedSong.number} — ${selectedSong.title}`
                            : 'Pilih lagu dari daftar'}
                        </div>
                        {selectedSong?.alternate_title && (
                          <div className="text-[11px] text-text-muted truncate">
                            ({selectedSong.alternate_title})
                          </div>
                        )}
                      </div>

                      {selectedSong && (
                        <div className="flex items-center gap-1">
                          {quickEditDraft ? (
                            <>
                              <button
                                onClick={() => void saveQuickEdit()}
                                disabled={isQuickSaving || !!quickEditDuplicateMessage}
                                className="btn-premium btn-premium-primary text-[11px] px-3 h-8"
                              >
                                {isQuickSaving ? 'Menyimpan...' : 'Simpan'}
                              </button>
                              <button
                                onClick={cancelQuickEdit}
                                disabled={isQuickSaving}
                                className="btn-premium btn-premium-ghost text-[11px] px-3 h-8"
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={openQuickEdit}
                              className="btn-premium btn-premium-ghost text-[11px] px-3 h-8"
                            >
                              Edit Cepat
                            </button>
                          )}
                          <button
                            onClick={() => handleEditSong(selectedSong)}
                            className="btn-premium btn-premium-primary text-[11px] px-3 h-8"
                            title="Enter untuk edit cepat"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => void handleDeleteSong(selectedSong)}
                            className="btn-premium btn-premium-ghost text-[11px] px-3 h-8"
                          >
                            <Trash2 size={14} />
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_55%)]">
                    {!selectedSong ? (
                      <div className="h-full flex flex-col items-center justify-center text-text-muted">
                        <div className="h-14 w-14 rounded-2xl bg-bg-elevated/60 border border-border-subtle flex items-center justify-center mb-4">
                          <Music size={22} className="opacity-50" />
                        </div>
                        <div className="text-sm font-semibold text-text-primary mb-1">
                          Tips cepat
                        </div>
                        <div className="text-xs text-center max-w-xs">
                          Gunakan tombol keyboard:
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                            <div className="px-2 py-1 rounded bg-bg-elevated border border-border-subtle">
                              / cari
                            </div>
                            <div className="px-2 py-1 rounded bg-bg-elevated border border-border-subtle">
                              Enter edit
                            </div>
                            <div className="px-2 py-1 rounded bg-bg-elevated border border-border-subtle">
                              ↑/↓ pilih
                            </div>
                            <div className="px-2 py-1 rounded bg-bg-elevated border border-border-subtle">
                              Double click edit
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {quickEditDraft && (
                          <div className="rounded-xl border border-border-subtle bg-bg-surface/30 p-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                              Quick Edit
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                  Nomor
                                </label>
                                <input
                                  type="text"
                                  value={quickEditDraft.number}
                                  onChange={(e) =>
                                    setQuickEditDraft((d) =>
                                      d ? { ...d, number: e.target.value } : d
                                    )
                                  }
                                  className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                  Nada
                                </label>
                                <input
                                  type="text"
                                  value={quickEditDraft.key_note}
                                  onChange={(e) =>
                                    setQuickEditDraft((d) =>
                                      d ? { ...d, key_note: e.target.value } : d
                                    )
                                  }
                                  className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                />
                              </div>
                            </div>

                            <div className="mt-3">
                              <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                Judul
                              </label>
                              <input
                                type="text"
                                value={quickEditDraft.title}
                                onChange={(e) =>
                                  setQuickEditDraft((d) =>
                                    d ? { ...d, title: e.target.value } : d
                                  )
                                }
                                className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                              />
                            </div>

                            <div className="mt-3">
                              <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                Sub Judul
                              </label>
                              <input
                                type="text"
                                value={quickEditDraft.alternate_title}
                                onChange={(e) =>
                                  setQuickEditDraft((d) =>
                                    d ? { ...d, alternate_title: e.target.value } : d
                                  )
                                }
                                className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                              />
                            </div>

                            <div className="mt-3">
                              <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                Kategori
                              </label>
                              <input
                                type="text"
                                value={quickEditDraft.category}
                                onChange={(e) =>
                                  setQuickEditDraft((d) =>
                                    d ? { ...d, category: e.target.value } : d
                                  )
                                }
                                className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                              />
                            </div>

                            {quickEditDuplicateMessage && (
                              <div className="mt-3 text-[11px] font-semibold text-status-error">
                                {quickEditDuplicateMessage}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-border-subtle bg-bg-surface/30 p-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              Status
                            </div>
                            <div className="mt-2">
                              {(selectedSong.lyrics_raw || '').trim().length === 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                                  <AlertTriangle size={12} />
                                  Lirik Kosong
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-status-success bg-status-success/10 px-2 py-1 rounded">
                                  <CheckCircle size={12} />
                                  Lengkap
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border-subtle bg-bg-surface/30 p-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              Statistik
                            </div>
                            <div className="mt-2 text-[12px] text-text-primary font-semibold">
                              {(selectedSong.lyrics_raw || '').trim().length === 0
                                ? '0 baris'
                                : `${selectedSong.lyrics_raw.split('\n').length} baris`}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              {(selectedSong.lyrics_raw || '').length} karakter
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border-subtle bg-bg-surface/30 p-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                            Metadata
                          </div>
                          <div className="space-y-1 text-[12px]">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-text-muted">Kategori</div>
                              <div className="text-text-primary font-semibold truncate">
                                {selectedSong.category || '-'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-text-muted">Nada</div>
                              <div className="text-text-primary font-semibold truncate">
                                {selectedSong.key_note || '-'}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border-subtle bg-bg-surface/30 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              Preview Lirik
                            </div>
                            <button
                              onClick={() => handleEditSong(selectedSong)}
                              className="btn-premium btn-premium-ghost h-7 px-2 text-[11px] gap-1.5"
                            >
                              Buka Editor
                            </button>
                          </div>
                          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-text-primary/90 max-h-[340px] overflow-y-auto">
                            {(selectedSong.lyrics_raw || '').trim().length === 0
                              ? 'Belum ada lirik.'
                              : selectedSong.lyrics_raw}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State - No Hymnal Selected */
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted px-6">
            <div className="h-20 w-20 rounded-3xl bg-bg-elevated/60 border border-border-subtle flex items-center justify-center mb-6">
              <BookOpen size={34} className="opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-text-primary">Pilih Buku Lagu</h3>
            <p className="text-sm text-center max-w-lg">
              Pilih buku lagu dari dropdown di atas untuk melihat dan mengelola daftar lagu. Kamu
              juga bisa membuat buku lagu baru jika belum ada.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowNewHymnalDialog(true)}
                className="btn-premium btn-premium-primary text-xs flex items-center gap-2 h-9 px-4"
              >
                <FolderPlus size={16} />
                Buku Lagu Baru
              </button>
              <button
                onClick={() => setScreen('import-export')}
                className="btn-premium btn-premium-ghost text-xs flex items-center gap-2 h-9 px-4"
              >
                <UploadCloud size={16} />
                Import/Export
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Hymnal Dialog */}
      {showNewHymnalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3">Buat Buku Lagu Baru</h2>
              <button
                onClick={() => setShowNewHymnalDialog(false)}
                className="btn-premium btn-premium-ghost btn-premium-icon"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                  Kode Buku (Singkatan) *
                </label>
                <input
                  type="text"
                  value={newHymnalData.code}
                  onChange={(e) =>
                    setNewHymnalData((d) => ({ ...d, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="Contoh: LS, SDAH, PK"
                  className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={newHymnalData.name}
                  onChange={(e) => setNewHymnalData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Contoh: Lagu Sion Edisi Lengkap"
                  className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Bahasa
                  </label>
                  <input
                    type="text"
                    value={newHymnalData.language}
                    onChange={(e) => setNewHymnalData((d) => ({ ...d, language: e.target.value }))}
                    placeholder="Indonesia"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={newHymnalData.publisher}
                    onChange={(e) => setNewHymnalData((d) => ({ ...d, publisher: e.target.value }))}
                    placeholder="GMAHK"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewHymnalDialog(false)}
                className="btn-premium btn-premium-ghost text-xs h-9 px-4"
              >
                Batal
              </button>
              <button
                onClick={handleCreateHymnal}
                className="btn-premium btn-premium-primary text-xs h-9 px-4"
              >
                Buat Buku Lagu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
