import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Database,
  Download,
  Edit3,
  FileJson,
  FileText,
  Filter,
  FolderPlus,
  Grid2X2,
  History,
  Import,
  Layers3,
  Maximize2,
  MoreHorizontal,
  Music2,
  PanelRight,
  Pencil,
  Play,
  Plus,
  Search,
  Tag,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Hymnal, Song } from '../../types'
import { logger } from '../../utils/logger'

type StatusTone = 'published' | 'draft' | 'review' | 'archived'

interface MetricCard {
  label: string
  value: string
  meta: string
  tone: string
  icon: React.ReactNode
  trend: string
  bars: number[]
}

const formatNumber = (value: number): string => new Intl.NumberFormat('id-ID').format(value)

const parseDate = (value?: string): number => {
  if (!value) return 0
  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
}

const getSongStatus = (song: Song): StatusTone => {
  const tags = `${song.tags || ''} ${song.category || ''}`.toLowerCase()
  if (tags.includes('archive')) return 'archived'
  if (tags.includes('review') || tags.includes('perlu review')) return 'review'
  if (!(song.lyrics_raw || '').trim()) return 'draft'
  return 'published'
}

const statusConfig: Record<StatusTone, { label: string; className: string; dot: string }> = {
  published: {
    label: 'Diterbitkan',
    className: 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.08)]',
    dot: 'bg-emerald-400'
  },
  draft: {
    label: 'Draft',
    className: 'border-sky-400/15 bg-sky-400/10 text-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.08)]',
    dot: 'bg-sky-400'
  },
  review: {
    label: 'Perlu Review',
    className: 'border-orange-400/15 bg-orange-400/10 text-orange-300 shadow-[0_0_18px_rgba(245,158,11,0.08)]',
    dot: 'bg-orange-400'
  },
  archived: {
    label: 'Arsip',
    className: 'border-white/10 bg-white/[0.04] text-slate-400',
    dot: 'bg-slate-400'
  }
}

function Surface({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={`rounded-2xl border border-border-subtle bg-bg-surface/70 shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

function IconButton({
  children,
  title,
  onClick,
  danger = false,
  disabled = false
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-slate-300 transition-all duration-200 hover:-translate-y-px hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200' : ''
      }`}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: StatusTone }): React.JSX.Element {
  const config = statusConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function MiniBars({ values, tone }: { values: number[]; tone: string }): React.JSX.Element {
  return (
    <div className="flex h-8 items-end gap-1">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className={`w-1.5 rounded-full bg-gradient-to-t ${tone} opacity-80`}
          style={{ height: `${Math.max(18, value)}%` }}
        />
      ))}
    </div>
  )
}

export function ManagementMode(): React.JSX.Element {
  const {
    setScreen,
    setEditingSong,
    hymnals,
    loadHymnals,
    songs,
    loadSongs,
    showToast,
    selectedHymnalId,
    setSelectedHymnalId
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | StatusTone>('all')
  const [sortMode, setSortMode] = useState<'number' | 'title' | 'updated'>('number')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(new Set())
  const [showNewHymnalDialog, setShowNewHymnalDialog] = useState(false)
  const [isImportingJson, setIsImportingJson] = useState(false)
  const [isFocusWorkspace, setIsFocusWorkspace] = useState(false)
  const [newHymnalData, setNewHymnalData] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: ''
  })
  const jsonInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadHymnals()
  }, [loadHymnals])

  useEffect(() => {
    if (selectedHymnalId) {
      loadSongs(selectedHymnalId)
    }
  }, [selectedHymnalId, loadSongs])

  useEffect(() => {
    if (!selectedHymnalId && hymnals[0]) {
      setSelectedHymnalId(hymnals[0].id)
    }
  }, [hymnals, selectedHymnalId, setSelectedHymnalId])

  useEffect(() => {
    setSelectedSongIds(new Set())
  }, [selectedHymnalId])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId) || null,
    [hymnals, selectedHymnalId]
  )

  const songStats = useMemo(() => {
    const statuses = songs.reduce(
      (acc, song) => {
        acc[getSongStatus(song)] += 1
        return acc
      },
      { published: 0, draft: 0, review: 0, archived: 0 }
    )
    const authors = new Set(
      songs.flatMap((song) => [song.author, song.composer].filter(Boolean).map((v) => v.trim()))
    )
    const categories = new Set(songs.map((song) => song.category).filter(Boolean))
    const lyricLines = songs.reduce(
      (sum, song) => sum + (song.lyrics_raw || '').split('\n').filter((line) => line.trim()).length,
      0
    )
    const coverage = songs.length > 0 ? Math.round((statuses.published / songs.length) * 100) : 0
    const latestImport = songs.reduce((latest, song) => Math.max(latest, parseDate(song.updated_at)), 0)
    return { statuses, authors, categories, lyricLines, coverage, latestImport }
  }, [songs])

  const filteredSongs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const list = songs.filter((song) => {
      const status = getSongStatus(song)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (!query) return true
      return [
        song.number,
        song.title,
        song.alternate_title,
        song.title_en,
        song.author,
        song.composer,
        song.category,
        song.tags,
        song.hymnal_name,
        song.hymnal_code
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })

    const toNumber = (value: string): number => {
      const parsed = Number(value.replace(/[^0-9]/g, ''))
      return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER
    }

    return [...list].sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title)
      if (sortMode === 'updated') return parseDate(b.updated_at) - parseDate(a.updated_at)
      const numberDiff = toNumber(a.number) - toNumber(b.number)
      return numberDiff || a.number.localeCompare(b.number)
    })
  }, [searchQuery, songs, sortMode, statusFilter])

  const selectedSong = useMemo(() => {
    if (!selectedSongId) return filteredSongs[0] || songs[0] || null
    return songs.find((song) => song.id === selectedSongId) || filteredSongs[0] || null
  }, [filteredSongs, selectedSongId, songs])

  useEffect(() => {
    if (!selectedSong && selectedSongId) setSelectedSongId(null)
  }, [selectedSong, selectedSongId])

  const metrics: MetricCard[] = useMemo(
    () => [
      {
        label: 'Total Lagu',
        value: formatNumber(songs.length),
        meta: `+${Math.max(0, Math.round(songs.length * 0.02))} bulan ini`,
        tone: 'from-blue-400 to-cyan-300',
        icon: <Music2 size={20} />,
        trend: '+12%',
        bars: [38, 54, 42, 68, 58, 78, 86]
      },
      {
        label: 'Buku Lagu',
        value: formatNumber(hymnals.length),
        meta: `${hymnals.filter((h) => h.is_official === 1).length} koleksi resmi`,
        tone: 'from-violet-400 to-purple-300',
        icon: <BookOpen size={20} />,
        trend: 'aktif',
        bars: [42, 45, 48, 48, 54, 60, 62]
      },
      {
        label: 'Penulis / Komposer',
        value: formatNumber(songStats.authors.size),
        meta: 'metadata terdaftar',
        tone: 'from-purple-400 to-fuchsia-300',
        icon: <Pencil size={20} />,
        trend: 'curated',
        bars: [22, 38, 48, 64, 55, 70, 76]
      },
      {
        label: 'Tema',
        value: formatNumber(songStats.categories.size),
        meta: 'tema tersedia',
        tone: 'from-orange-400 to-amber-300',
        icon: <Tag size={20} />,
        trend: 'tagged',
        bars: [28, 42, 38, 52, 48, 58, 62]
      },
      {
        label: 'Total Lirik',
        value: formatNumber(songStats.lyricLines),
        meta: `${songStats.coverage}% coverage`,
        tone: 'from-cyan-400 to-blue-300',
        icon: <FileText size={20} />,
        trend: `${songStats.statuses.draft} draft`,
        bars: [28, 44, 52, 58, 66, 74, 82]
      },
      {
        label: 'Penyimpanan',
        value: '28.4 GB',
        meta: '28% dari 100 GB',
        tone: 'from-emerald-400 to-teal-300',
        icon: <Database size={20} />,
        trend: 'stable',
        bars: [18, 24, 32, 36, 42, 48, 52]
      }
    ],
    [hymnals, songStats, songs.length]
  )

  const handleAddNewSong = useCallback((): void => {
    if (!selectedHymnalId) {
      showToast('Pilih buku lagu terlebih dahulu', 'error')
      return
    }
    setEditingSong(null)
    setScreen('song-editor')
  }, [selectedHymnalId, setEditingSong, setScreen, showToast])

  const handleEditSong = useCallback(
    (song: Song): void => {
      setEditingSong(song)
      setScreen('song-editor')
    },
    [setEditingSong, setScreen]
  )

  const handleDeleteSong = useCallback(
    async (song: Song): Promise<void> => {
      if (!confirm(`Hapus lagu "${song.number} - ${song.title}"?`)) return
      try {
        await window.api.songs.delete(song.id)
        setSelectedSongIds((prev) => {
          const next = new Set(prev)
          next.delete(song.id)
          return next
        })
        if (selectedSongId === song.id) setSelectedSongId(null)
        await loadSongs(selectedHymnalId || undefined)
        showToast('Lagu berhasil dihapus', 'success')
      } catch (err) {
        logger.error('Failed to delete song:', err)
        showToast('Gagal menghapus lagu', 'error')
      }
    },
    [loadSongs, selectedHymnalId, selectedSongId, showToast]
  )

  const handleBulkDelete = useCallback(async (): Promise<void> => {
    if (selectedSongIds.size === 0) return
    if (!confirm(`Hapus ${selectedSongIds.size} lagu yang dipilih?`)) return
    try {
      for (const id of selectedSongIds) {
        await window.api.songs.delete(id)
      }
      setSelectedSongIds(new Set())
      setSelectedSongId(null)
      await loadSongs(selectedHymnalId || undefined)
      showToast(`${selectedSongIds.size} lagu berhasil dihapus`, 'success')
    } catch (err) {
      logger.error('Bulk delete failed:', err)
      showToast('Gagal menghapus lagu', 'error')
    }
  }, [loadSongs, selectedHymnalId, selectedSongIds, showToast])

  const handleCreateHymnal = useCallback(async (): Promise<void> => {
    if (!newHymnalData.code.trim() || !newHymnalData.name.trim()) {
      showToast('Kode dan nama buku lagu wajib diisi', 'error')
      return
    }
    if (hymnals.some((h) => h.code.toLowerCase() === newHymnalData.code.trim().toLowerCase())) {
      showToast('Kode buku lagu sudah ada', 'error')
      return
    }
    try {
      const result = (await window.api.hymnals.add({
        code: newHymnalData.code.trim().toUpperCase(),
        name: newHymnalData.name.trim(),
        language: newHymnalData.language.trim() || 'Indonesia',
        publisher: newHymnalData.publisher.trim(),
        region: 'Indonesia',
        version: '1.0',
        is_official: 0
      })) as Hymnal
      await loadHymnals()
      setShowNewHymnalDialog(false)
      setNewHymnalData({ code: '', name: '', language: 'Indonesia', publisher: '' })
      if (result?.id) setSelectedHymnalId(result.id)
      showToast('Buku lagu berhasil dibuat', 'success')
    } catch (err) {
      logger.error('Failed to create hymnal:', err)
      showToast('Gagal membuat buku lagu', 'error')
    }
  }, [hymnals, loadHymnals, newHymnalData, setSelectedHymnalId, showToast])

  const handleJsonImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      if (!selectedHymnalId) {
        showToast('Pilih buku lagu target sebelum import JSON', 'error')
        return
      }
      setIsImportingJson(true)
      try {
        const raw = await file.text()
        const parsed = JSON.parse(raw) as unknown
        const items = Array.isArray(parsed)
          ? parsed
          : parsed && typeof parsed === 'object' && Array.isArray((parsed as { songs?: unknown[] }).songs)
            ? (parsed as { songs: unknown[] }).songs
            : []
        if (items.length === 0) {
          showToast('Format JSON tidak berisi daftar lagu', 'error')
          return
        }
        const report = await window.api.songs.importJson({
          items,
          defaultHymnalId: selectedHymnalId,
          conflictPolicy: 'skip',
          dryRun: false
        })
        await loadSongs(selectedHymnalId)
        showToast(`Import selesai: ${report.inserted} baru, ${report.skipped} dilewati`, 'success')
      } catch (err) {
        logger.error('JSON import failed:', err)
        showToast('Import JSON gagal', 'error')
      } finally {
        setIsImportingJson(false)
      }
    },
    [loadSongs, selectedHymnalId, showToast]
  )

  const handleExportData = useCallback(async (): Promise<void> => {
    try {
      const result = await window.api.file.showSaveDialog({
        title: 'Export SION song library',
        defaultPath: `sion-media-library-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) return
      await window.api.file.writeJson(result.filePath, {
        exported_at: new Date().toISOString(),
        hymnal: selectedHymnal,
        songs: filteredSongs
      })
      showToast('Data berhasil diexport', 'success')
    } catch (err) {
      logger.error('Export failed:', err)
      showToast('Export data gagal', 'error')
    }
  }, [filteredSongs, selectedHymnal, showToast])

  const toggleSongSelection = (songId: number): void => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev)
      if (next.has(songId)) next.delete(songId)
      else next.add(songId)
      return next
    })
  }

  const selectAllVisible = (): void => {
    setSelectedSongIds(new Set(filteredSongs.map((song) => song.id)))
  }

  const lyricLineCount = selectedSong
    ? (selectedSong.lyrics_raw || '').split('\n').filter((line) => line.trim()).length
    : 0

  return (
    <div className={`management-studio ${isFocusWorkspace ? 'management-studio--focus' : ''}`}>
      <input ref={jsonInputRef} type="file" accept=".json" className="hidden" onChange={handleJsonImport} />

      <div className="management-studio__shell">
        <header className="management-studio__header">
          <div className="management-studio__heading">
            <div className="management-studio__eyebrow">
              <Layers3 size={14} />
              Worship Content Operations Studio
            </div>
            <h1>Dashboard</h1>
            <p>
              Kelola lagu, lirik, hymnals, metadata, review, publishing, dan operasi konten.
            </p>
          </div>

          <div className="management-studio__actions">
            <button
              type="button"
              onClick={handleAddNewSong}
              className="management-action management-action--primary"
            >
              <Plus size={16} />
              Lagu Baru
            </button>
            <button
              type="button"
              onClick={() => setScreen('import-export')}
              disabled={isImportingJson}
              className="management-action"
            >
              <UploadCloud size={16} />
              Import Lagu
              <ChevronDown size={14} className="text-slate-500" />
            </button>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="management-action"
            >
              <FileJson size={16} />
              Import JSON
            </button>
            <button
              type="button"
              onClick={handleExportData}
              className="management-action"
            >
              <Download size={16} />
              Export Data
            </button>
            <IconButton title="More actions">
              <MoreHorizontal size={17} />
            </IconButton>
            <button
              type="button"
              onClick={() => setIsFocusWorkspace((value) => !value)}
              className={`management-action management-action--compact ${isFocusWorkspace ? 'is-active' : ''}`}
            >
              <Maximize2 size={15} />
              Focus
            </button>
          </div>
        </header>

        <section className="management-summary-grid">
          {metrics.slice(0, 6).map((metric) => (
            <Surface
              key={metric.label}
              className="management-summary-card"
            >
              <div className="management-summary-card__top">
                <div
                  className={`management-summary-card__icon bg-gradient-to-br ${metric.tone}`}
                >
                  {metric.icon}
                </div>
                <MiniBars values={metric.bars} tone={metric.tone} />
              </div>
              <div className="management-summary-card__label">{metric.label}</div>
              <div className="management-summary-card__value-row">
                <div className="management-summary-card__value">{metric.value}</div>
                <span>
                  {metric.trend}
                </span>
              </div>
              <div className="management-summary-card__meta">{metric.meta}</div>
            </Surface>
          ))}
        </section>

        <main className="management-workspace-grid">
          <section className="flex min-h-0 flex-col gap-4">
            <Surface className="management-command-bar">
              <div className="management-command-bar__inner">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="management-segmented">
                    {(['all', 'draft', 'review', 'published'] as Array<'all' | StatusTone>).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatusFilter(status)}
                        className={statusFilter === status ? 'is-active' : ''}
                      >
                        {status === 'all' ? 'Semua' : statusConfig[status].label}
                      </button>
                    ))}
                  </div>

                  <IconButton title="Buku Lagu Baru" onClick={() => setShowNewHymnalDialog(true)}>
                    <FolderPlus size={15} />
                  </IconButton>
                  <IconButton title="Bulk import/export" onClick={() => setScreen('import-export')}>
                    <Import size={15} />
                  </IconButton>
                </div>

                <div className="flex min-w-0 items-center justify-end gap-2">
                  <select
                    value={selectedHymnalId ?? ''}
                    onChange={(event) => setSelectedHymnalId(Number(event.target.value) || null)}
                    className="management-select max-w-[210px]"
                  >
                    {hymnals.map((hymnal) => (
                      <option key={hymnal.id} value={hymnal.id}>
                        {hymnal.name}
                      </option>
                    ))}
                  </select>
                  <button className="management-action management-action--compact">
                    <Filter size={15} />
                    Filter
                  </button>
                  <div className="management-search">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="song-search-input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari judul, nomor, penulis..."
                      className="management-search__input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-white/[0.06] hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as 'number' | 'title' | 'updated')}
                    className="management-select"
                  >
                    <option value="number">Sort: Nomor</option>
                    <option value="title">Sort: Judul</option>
                    <option value="updated">Sort: Terbaru</option>
                  </select>
                  <IconButton title="Layout toggle">
                    <Grid2X2 size={16} />
                  </IconButton>
                </div>
              </div>
            </Surface>

            <Surface className="management-browser">
              <div className="management-browser__header">
                <div>
                  <h2>Daftar Lagu</h2>
                  <p>
                    Menampilkan {formatNumber(filteredSongs.length)} dari {formatNumber(songs.length)} lagu
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSongIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedSongIds(new Set())}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-white"
                      >
                        Clear {selectedSongIds.size}
                      </button>
                      <IconButton title="Delete selected" onClick={handleBulkDelete} danger>
                        <Trash2 size={15} />
                      </IconButton>
                    </>
                  )}
                  <IconButton title="Select all visible" onClick={selectAllVisible}>
                    <Check size={15} />
                  </IconButton>
                  <IconButton title="Database view">
                    <PanelRight size={15} />
                  </IconButton>
                </div>
              </div>

              <div className="management-browser__columns">
                <span />
                <span>No</span>
                <span>Judul Lagu</span>
                <span>Buku Lagu</span>
                <span>Status</span>
                <span>Metadata</span>
                <span className="text-right">Aksi</span>
              </div>

              <div className="management-browser__viewport">
                {filteredSongs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/15 bg-blue-500/10 text-blue-200">
                        <Music2 size={24} />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">Tidak ada lagu</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Ubah filter atau tambahkan lagu baru untuk koleksi ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="management-browser__stack">
                    {filteredSongs.map((song) => {
                      const status = getSongStatus(song)
                      const isSelected = selectedSong?.id === song.id
                      const checked = selectedSongIds.has(song.id)
                      return (
                        <div
                          key={song.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSongId(song.id)}
                          onDoubleClick={() => handleEditSong(song)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') handleEditSong(song)
                            if (event.key === ' ') {
                              event.preventDefault()
                              setSelectedSongId(song.id)
                            }
                          }}
                          className={`management-browser__row ${isSelected ? 'is-selected' : ''}`}
                        >
                          <span
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleSongSelection(song.id)
                            }}
                            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                              checked
                                ? 'border-blue-400 bg-blue-500 text-white'
                                : 'border-slate-600 bg-black/20 text-transparent hover:border-blue-400/50'
                            }`}
                          >
                            <Check size={12} />
                          </span>
                          <span className="text-sm font-semibold text-slate-200">{song.number}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{song.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {song.alternate_title || song.title_en || 'Tanpa subtitle'}
                            </span>
                          </span>
                          <span className="truncate text-xs font-medium text-slate-400">
                            {song.hymnal_name || selectedHymnal?.name || 'Library'}
                          </span>
                          <StatusBadge status={status} />
                          <span className="flex items-center gap-1.5">
                            {song.key_note && (
                              <span className="rounded-md bg-purple-400/10 px-2 py-1 text-[11px] font-semibold text-purple-200">
                                {song.key_note}
                              </span>
                            )}
                            {song.tempo && (
                              <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-slate-400">
                                {song.tempo}
                              </span>
                            )}
                          </span>
                          <span className="flex justify-end gap-1.5">
                            <IconButton title="Edit lagu" onClick={() => handleEditSong(song)}>
                              <Edit3 size={14} />
                            </IconButton>
                            <IconButton title="Duplicate">
                              <Copy size={14} />
                            </IconButton>
                            <IconButton title="Delete" onClick={() => handleDeleteSong(song)} danger>
                              <Trash2 size={14} />
                            </IconButton>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="management-browser__footer">
                <span>
                  Menampilkan 1-{Math.min(filteredSongs.length, 25)} dari {formatNumber(filteredSongs.length)} lagu
                </span>
                <div className="flex items-center gap-2">
                  <button className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-slate-400 transition-all hover:bg-white/[0.06] hover:text-white">
                    1
                  </button>
                  <span>2</span>
                  <span>3</span>
                  <span>...</span>
                  <select className="h-8 rounded-lg border border-white/[0.07] bg-bg-base px-2 text-slate-300 outline-none">
                    <option>25 / halaman</option>
                    <option>50 / halaman</option>
                  </select>
                </div>
              </div>
            </Surface>
          </section>

          <aside className="flex min-h-0 flex-col gap-4">
            <Surface className="management-inspector">
              <div className="management-inspector__header">
                <div>
                  <h2>Detail Lagu</h2>
                  <p>Metadata inspector</p>
                </div>
                <div className="flex gap-1.5">
                  <IconButton title="Pin inspector">
                    <Bell size={14} />
                  </IconButton>
                  <IconButton title="Fullscreen lyrics">
                    <Maximize2 size={14} />
                  </IconButton>
                </div>
              </div>

              {selectedSong ? (
                <div className="management-inspector__body">
                  <div className="management-inspector__hero">
                    <div className="management-inspector__artwork">
                      <div className="management-inspector__artwork-flare" />
                      <div>
                        {selectedSong.title}
                      </div>
                    </div>
                    <div className="management-inspector__title-block">
                      <h3>
                        {selectedSong.number} - {selectedSong.title}
                      </h3>
                      <p>
                        {selectedSong.alternate_title || selectedSong.title_en || 'No alternate title'}
                      </p>
                      <div className="management-inspector__badges">
                        <StatusBadge status={getSongStatus(selectedSong)} />
                        <span className="rounded-full border border-purple-400/15 bg-purple-400/10 px-2.5 py-1 text-[11px] font-semibold text-purple-200">
                          Metadata
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="management-inspector__actions">
                    <button>
                      <Play size={15} />
                      Pratinjau
                    </button>
                    <button
                      onClick={() => handleEditSong(selectedSong)}
                      className="is-primary"
                    >
                      <Edit3 size={15} />
                      Edit Lagu
                    </button>
                  </div>

                  <div className="management-inspector__section">
                    <div className="management-inspector__section-title">Publishing</div>
                    <dl>
                      {[
                        ['Status', statusConfig[getSongStatus(selectedSong)].label],
                        ['Buku Lagu', selectedSong.hymnal_name || selectedHymnal?.name || '-'],
                        ['Kategori', selectedSong.category || 'Penyembahan'],
                        ['Tema', selectedSong.theme || selectedSong.tags || 'Umum']
                      ].map(([label, value]) => (
                        <React.Fragment key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>

                  <div className="management-inspector__section">
                    <div className="management-inspector__section-title">Musical</div>
                    <dl>
                      {[
                        ['Penulis', selectedSong.author || '-'],
                        ['Komposer', selectedSong.composer || '-'],
                        ['Tempo', selectedSong.tempo ? `${selectedSong.tempo} BPM` : '-'],
                        ['Birama', selectedSong.time_signature || '-'],
                        ['Key', selectedSong.key_note || '-']
                      ].map(([label, value]) => (
                        <React.Fragment key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>

                  <div className="management-inspector__section">
                    <div className="management-inspector__section-title">Content</div>
                    <dl>
                      {[
                        ['Bahasa', selectedSong.language || 'Indonesia'],
                        ['Hak Cipta', selectedSong.scripture_reference || 'Public Domain'],
                        ['Dibuat', selectedSong.created_at ? new Date(selectedSong.created_at).toLocaleString('id-ID') : '-'],
                        ['Diubah', selectedSong.updated_at ? new Date(selectedSong.updated_at).toLocaleString('id-ID') : '-']
                      ].map(([label, value]) => (
                        <React.Fragment key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>

                  <div className="management-inspector__section">
                    <div className="management-inspector__section-title">Statistik</div>
                    <div className="management-inspector__stats">
                      {[
                        ['Baris', lyricLineCount],
                        ['Verse', Math.max(1, Math.round(lyricLineCount / 5))],
                        ['Chorus', (selectedSong.lyrics_raw || '').toLowerCase().includes('chorus') ? 1 : 0],
                        ['Bridge', (selectedSong.lyrics_raw || '').toLowerCase().includes('bridge') ? 1 : 0]
                      ].map(([label, value]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="management-inspector__quick-actions">
                    {[
                      ['Open Lyrics', Maximize2],
                      ['Add Playlist', Plus],
                      ['Duplicate', Copy],
                      ['History', History]
                    ].map(([label, Icon]) => {
                      const LucideIcon = Icon as typeof Maximize2
                      return (
                        <button
                          key={label as string}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                        >
                          <LucideIcon size={14} />
                          {label as string}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-500">
                  Pilih lagu untuk melihat inspector.
                </div>
              )}
            </Surface>
          </aside>
        </main>
      </div>

      {showNewHymnalDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-8 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c1422] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                  Hymnal Management
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">Buat Buku Lagu Baru</h2>
              </div>
              <IconButton title="Close" onClick={() => setShowNewHymnalDialog(false)}>
                <X size={16} />
              </IconButton>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                ['Kode', 'code', 'KPPK'],
                ['Nama Buku Lagu', 'name', 'Kidung Puji-Pujian Kristen'],
                ['Bahasa', 'language', 'Indonesia'],
                ['Penerbit', 'publisher', 'SION Media']
              ].map(([label, key, placeholder]) => (
                <label key={key} className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-400">{label}</span>
                  <input
                    value={newHymnalData[key as keyof typeof newHymnalData]}
                    onChange={(event) =>
                      setNewHymnalData((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    placeholder={placeholder}
                    className="h-11 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-400/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewHymnalDialog(false)}
                className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateHymnal}
                className="h-10 rounded-xl border border-blue-300/20 bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.24)] transition-all hover:bg-blue-500"
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
