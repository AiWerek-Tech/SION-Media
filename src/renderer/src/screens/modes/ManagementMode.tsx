import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Database,
  Download,
  Edit3,
  Film,
  FileJson,
  FileText,
  FolderPlus,
  Grid2X2,
  History,
  Image as ImageIcon,
  Import,
  Layers3,
  List,
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
import { useModalStore } from '../../store/useModalStore'
import { useModeStore } from '../../store/useModeStore'
import type { Hymnal, Song } from '../../types'
import { logger } from '../../utils/logger'
import { DEFAULT_SCENE_PRESETS } from '../../atmosphere/presets'
import type {
  AtmosphereConfig,
  MediaAssetRecord,
  MediaCollectionRecord
} from '../../atmosphere/types'
import { HymnalFilterDropdown } from '../../components/library/HymnalFilterDropdown'

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

const getSongAtmosphereSummary = (
  song: Song
): { mode: 'global' | 'preset' | 'asset'; label: string; detail: string } => {
  if (!song.song_background_config) {
    return {
      mode: 'global',
      label: 'Global',
      detail: 'Mengikuti default atmosphere service'
    }
  }

  try {
    const parsed = JSON.parse(song.song_background_config) as {
      name?: string
      media?: { assetId?: string; path?: string }
    }

    if (parsed.media?.assetId || parsed.media?.path) {
      return {
        mode: 'asset',
        label: 'Asset Library',
        detail: parsed.name || 'Background asset terikat ke lagu ini'
      }
    }

    return {
      mode: 'preset',
      label: 'Preset Lagu',
      detail: parsed.name || 'Preset atmosphere custom'
    }
  } catch {
    return {
      mode: 'preset',
      label: 'Config Manual',
      detail: 'Konfigurasi atmosphere tersimpan sebagai JSON'
    }
  }
}

function toFileUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

function buildSongAssetAtmosphere(asset: MediaAssetRecord): AtmosphereConfig {
  return {
    id: `song-asset-${asset.id}`,
    name: asset.name,
    mode: asset.type === 'video' ? 'video' : 'image',
    media: {
      assetId: asset.id,
      path: asset.localPath,
      fit: 'cover',
      loop: true,
      muted: true
    }
  }
}

const statusConfig: Record<StatusTone, { label: string; className: string; dot: string }> = {
  published: {
    label: 'Diterbitkan',
    className:
      'border-emerald-400/15 bg-emerald-400/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.08)]',
    dot: 'bg-emerald-400'
  },
  draft: {
    label: 'Draft',
    className:
      'border-sky-400/15 bg-sky-400/10 text-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.08)]',
    dot: 'bg-sky-400'
  },
  review: {
    label: 'Perlu Review',
    className:
      'border-orange-400/15 bg-orange-400/10 text-orange-300 shadow-[0_0_18px_rgba(245,158,11,0.08)]',
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
      className={`management-icon-button inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-slate-300 transition-all duration-200 hover:-translate-y-px hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${
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

interface TableSongRowProps {
  song: Song
  status: StatusTone
  isSelected: boolean
  isChecked: boolean
  hymnalName: string
  virtualRowSize: number
  virtualRowStart: number
  onSelectSong: (id: number) => void
  onEditSong: (song: Song) => void
  onDuplicateSong: (song: Song) => void
  onDeleteSong: (song: Song) => void
  onToggleSelection: (id: number) => void
}

const TableSongRow = ({
  song,
  status,
  isSelected,
  isChecked,
  hymnalName,
  virtualRowSize,
  virtualRowStart,
  onSelectSong,
  onEditSong,
  onDuplicateSong,
  onDeleteSong,
  onToggleSelection
}: TableSongRowProps): React.JSX.Element => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectSong(song.id)}
      onDoubleClick={() => onEditSong(song)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEditSong(song)
        if (event.key === ' ') {
          event.preventDefault()
          onSelectSong(song.id)
        }
      }}
      className={`management-browser__row ${isSelected ? 'is-selected' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRowSize}px`,
        transform: `translateY(${virtualRowStart}px)`
      }}
    >
      <span
        onClick={(event) => {
          event.stopPropagation()
          onToggleSelection(song.id)
        }}
        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
          isChecked
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
      <span className="truncate text-xs font-medium text-slate-400">{hymnalName}</span>
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
        <IconButton title="Edit lagu" onClick={() => onEditSong(song)}>
          <Edit3 size={14} />
        </IconButton>
        <IconButton title="Duplicate" onClick={() => onDuplicateSong(song)}>
          <Copy size={14} />
        </IconButton>
        <IconButton title="Delete" onClick={() => onDeleteSong(song)} danger>
          <Trash2 size={14} />
        </IconButton>
      </span>
    </div>
  )
}

const MemoizedTableSongRow = React.memo(TableSongRow)

interface VirtualizedSongListProps {
  filteredSongs: Song[]
  viewMode: 'table' | 'grid'
  selectedSong: Song | null
  selectedSongIds: Set<number>
  selectedHymnal: Hymnal | null
  parentRef: React.RefObject<HTMLDivElement | null>
  onSelectSong: (id: number) => void
  onEditSong: (song: Song) => void
  onDuplicateSong: (song: Song) => void
  onDeleteSong: (song: Song) => void
  onToggleSelection: (id: number) => void
}

function VirtualizedSongList({
  filteredSongs,
  viewMode,
  selectedSong,
  selectedSongIds,
  selectedHymnal,
  parentRef,
  onSelectSong,
  onEditSong,
  onDuplicateSong,
  onDeleteSong,
  onToggleSelection
}: VirtualizedSongListProps): React.JSX.Element {
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filteredSongs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10
  })

  // Grid view is not virtualized for now to keep it simple and responsive
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4 items-start">
        {filteredSongs.map((song) => {
          const status = getSongStatus(song)
          const isSelected = selectedSong?.id === song.id
          const checked = selectedSongIds.has(song.id)

          return (
            <div
              key={song.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSong(song.id)}
              onDoubleClick={() => onEditSong(song)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onEditSong(song)
                if (event.key === ' ') {
                  event.preventDefault()
                  onSelectSong(song.id)
                }
              }}
              className={`relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/10 ring-1 ring-brand-primary/30'
                  : 'border-white/[0.06] bg-surface-2/40 hover:border-white/[0.1] hover:bg-surface-2/60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleSelection(song.id)
                  }}
                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                    checked
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-slate-600 bg-black/20 text-transparent hover:border-brand-primary/50'
                  }`}
                >
                  <Check size={12} />
                </div>
                <div className="flex gap-1.5">
                  <IconButton title="Edit lagu" onClick={() => onEditSong(song)}>
                    <Edit3 size={14} />
                  </IconButton>
                  <IconButton title="Duplicate" onClick={() => onDuplicateSong(song)}>
                    <Copy size={14} />
                  </IconButton>
                  <IconButton title="Delete" onClick={() => onDeleteSong(song)} danger>
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-400">
                  {song.hymnal_name || 'Library'}
                </span>
                <span className="text-xs font-bold text-slate-300 px-1.5 py-0.5 rounded bg-black/20 border border-white/[0.05]">
                  {song.number}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white truncate">{song.title}</h3>
              <p className="text-xs text-slate-400 truncate mb-3">
                {song.alternate_title || song.title_en || 'Tanpa subtitle'}
              </p>

              <div className="mt-auto flex items-center justify-between">
                <StatusBadge status={status} />
                <div className="flex items-center gap-1.5">
                  {song.key_note && (
                    <span className="rounded-md bg-purple-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-200">
                      {song.key_note}
                    </span>
                  )}
                  {song.tempo && (
                    <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {song.tempo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Virtualized Table View
  return (
    <div
      className="management-browser__stack"
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative'
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const song = filteredSongs[virtualRow.index]
        if (!song) return null

        return (
          <MemoizedTableSongRow
            key={virtualRow.key}
            song={song}
            status={getSongStatus(song)}
            isSelected={selectedSong?.id === song.id}
            isChecked={selectedSongIds.has(song.id)}
            hymnalName={song.hymnal_name || selectedHymnal?.name || 'Library'}
            virtualRowSize={virtualRow.size}
            virtualRowStart={virtualRow.start}
            onSelectSong={onSelectSong}
            onEditSong={onEditSong}
            onDuplicateSong={onDuplicateSong}
            onDeleteSong={onDeleteSong}
            onToggleSelection={onToggleSelection}
          />
        )
      })}
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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(new Set())
  const [isBulkBackgroundDialogOpen, setIsBulkBackgroundDialogOpen] = useState(false)
  const [bulkBackgroundMode, setBulkBackgroundMode] = useState<
    'global' | 'scene-preset' | 'library-asset'
  >('library-asset')
  const [bulkPresetId, setBulkPresetId] = useState(DEFAULT_SCENE_PRESETS[0]?.id || 'worship')
  const [bulkCollectionId, setBulkCollectionId] = useState<string>('')
  const [bulkAssetId, setBulkAssetId] = useState<string>('')
  const [bulkAssetSearch, setBulkAssetSearch] = useState('')
  const [isApplyingBulkBackground, setIsApplyingBulkBackground] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([])
  const [mediaCollections, setMediaCollections] = useState<MediaCollectionRecord[]>([])
  const [showNewHymnalDialog, setShowNewHymnalDialog] = useState(false)
  const [isFocusWorkspace, setIsFocusWorkspace] = useState(false)
  // DUI-006: Real storage stats
  const [storageStats, setStorageStats] = useState<{ dbSizeMB: string; memoryMB: string } | null>(
    null
  )
  const [newHymnalData, setNewHymnalData] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: ''
  })
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const tableParentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadHymnals()
  }, [loadHymnals])

  // DUI-006: Fetch real storage stats on mount
  useEffect(() => {
    window.api.system
      .getStorageStats()
      .then((stats) => {
        const s = stats as { dbSizeMB: string; memoryMB: string }
        setStorageStats(s)
      })
      .catch(() => {
        // silently ignore — fallback to placeholder
      })
  }, [])

  useEffect(() => {
    Promise.all([window.api.media.getAll(), window.api.media.getCollections()])
      .then(([assets, collections]) => {
        setMediaAssets(assets as MediaAssetRecord[])
        setMediaCollections(collections as MediaCollectionRecord[])
      })
      .catch((err) => logger.error('Failed to load media library for management mode:', err))
  }, [])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSongIds(new Set())
  }, [selectedHymnalId])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId) || null,
    [hymnals, selectedHymnalId]
  )

  const bulkOrderedAssets = useMemo(() => {
    if (!bulkCollectionId) return mediaAssets
    const collection = mediaCollections.find((item) => item.id === bulkCollectionId)
    if (!collection) {
      return mediaAssets.filter((asset) => (asset.collectionIds || []).includes(bulkCollectionId))
    }
    const byId = new Map(mediaAssets.map((asset) => [asset.id, asset]))
    const ordered: MediaAssetRecord[] = []
    for (const assetId of collection.assetIds) {
      const asset = byId.get(assetId)
      if (asset) ordered.push(asset)
    }
    return ordered
  }, [bulkCollectionId, mediaAssets, mediaCollections])

  const bulkFilteredAssets = useMemo(() => {
    const base = bulkCollectionId ? bulkOrderedAssets : mediaAssets
    const query = bulkAssetSearch.trim().toLowerCase()
    if (!query) return base
    return base.filter((asset) => {
      const haystack =
        `${asset.name} ${asset.category || ''} ${(asset.tags || []).join(' ')}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [bulkAssetSearch, bulkCollectionId, bulkOrderedAssets, mediaAssets])

  useEffect(() => {
    if (!isBulkBackgroundDialogOpen) return
    if (bulkBackgroundMode !== 'library-asset') return
    if (bulkAssetId) return
    const candidates = bulkCollectionId ? bulkOrderedAssets : mediaAssets
    if (candidates[0]?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBulkAssetId(candidates[0].id)
    }
  }, [
    bulkAssetId,
    bulkBackgroundMode,
    bulkCollectionId,
    bulkOrderedAssets,
    isBulkBackgroundDialogOpen,
    mediaAssets
  ])

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
    const latestImport = songs.reduce(
      (latest, song) => Math.max(latest, parseDate(song.updated_at)),
      0
    )
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedSong && selectedSongId) setSelectedSongId(null)
  }, [selectedSong, selectedSongId])

  const [now] = useState<number>(() => Date.now())

  const metrics: MetricCard[] = useMemo(() => {
    // Generate trend data based on updated_at dates (last 7 days of activity)
    const dayMs = 24 * 60 * 60 * 1000
    const activityByDay = new Array(7).fill(0)

    songs.forEach((song) => {
      if (!song.updated_at) return
      const diffDays = Math.floor((now - new Date(song.updated_at).getTime()) / dayMs)
      if (diffDays >= 0 && diffDays < 7) {
        // Reverse index: 6 is today, 0 is 6 days ago
        activityByDay[6 - diffDays]++
      }
    })

    // Normalize for bars (0-100)
    const maxActivity = Math.max(...activityByDay, 10) // prevent division by zero
    const songTrendBars = activityByDay.map((count) =>
      Math.max(15, Math.round((count / maxActivity) * 100))
    )

    // Generate deterministic variations for other metrics based on base trend
    const shiftBars = (bars: number[], shift: number): number[] =>
      bars.map((b, i) => Math.max(10, Math.min(100, b + Math.sin(i * 1.5 + shift) * 20)))

    return [
      {
        label: 'Total Lagu',
        value: formatNumber(songs.length),
        meta: `+${activityByDay.reduce((a, b) => a + b, 0)} minggu ini`,
        tone: 'from-blue-400 to-cyan-300',
        icon: <Music2 size={20} />,
        trend: 'aktif',
        bars: songTrendBars
      },
      {
        label: 'Buku Lagu',
        value: formatNumber(hymnals.length),
        meta: `${hymnals.filter((h) => h.is_official === 1).length} koleksi resmi`,
        tone: 'from-violet-400 to-purple-300',
        icon: <BookOpen size={20} />,
        trend: 'stabil',
        bars: shiftBars(songTrendBars, 1)
      },
      {
        label: 'Penulis / Komposer',
        value: formatNumber(songStats.authors.size),
        meta: 'metadata terdaftar',
        tone: 'from-purple-400 to-fuchsia-300',
        icon: <Pencil size={20} />,
        trend: 'curated',
        bars: shiftBars(songTrendBars, 2)
      },
      {
        label: 'Tema',
        value: formatNumber(songStats.categories.size),
        meta: 'tema tersedia',
        tone: 'from-orange-400 to-amber-300',
        icon: <Tag size={20} />,
        trend: 'tagged',
        bars: shiftBars(songTrendBars, 3)
      },
      {
        label: 'Total Lirik',
        value: formatNumber(songStats.lyricLines),
        meta: `${songStats.coverage}% coverage`,
        tone: 'from-cyan-400 to-blue-300',
        icon: <FileText size={20} />,
        trend: `${songStats.statuses.draft} draft`,
        bars: shiftBars(songTrendBars, 4)
      },
      {
        label: 'Penyimpanan',
        value: storageStats ? `${storageStats.dbSizeMB} MB` : '—',
        meta: storageStats ? `RAM: ${storageStats.memoryMB} MB` : 'Memuat...',
        tone: 'from-emerald-400 to-teal-300',
        icon: <Database size={20} />,
        trend: 'stable',
        bars: shiftBars(songTrendBars, 5)
      }
    ]
  }, [now, songs, hymnals, songStats, storageStats])

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

  const handleDuplicateSong = useCallback(
    async (song: Song): Promise<void> => {
      const confirmed = await useModalStore
        .getState()
        .openAsync<boolean>('confirm-duplicate-song', 'confirm', {
          title: `Duplikat Lagu?`,
          description: `Buat salinan untuk "${song.number} - ${song.title}"?`,
          confirmLabel: 'Duplikat',
          danger: false
        })
      if (!confirmed) return
      try {
        await window.api.songs.duplicate(song.id)
        await loadSongs(selectedHymnalId || undefined)
        showToast('Lagu berhasil diduplikat', 'success')
      } catch (err) {
        logger.error('Failed to duplicate song:', err)
        showToast('Gagal menduplikat lagu', 'error')
      }
    },
    [loadSongs, selectedHymnalId, showToast]
  )

  const handleDeleteSong = useCallback(
    async (song: Song): Promise<void> => {
      const confirmed = await useModalStore
        .getState()
        .openAsync<boolean>('confirm-delete-song', 'confirm', {
          title: `Hapus Lagu?`,
          description: `"${song.number} - ${song.title}" akan dihapus permanen dari database.`,
          confirmLabel: 'Hapus',
          danger: true
        })
      if (!confirmed) return
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
    const confirmed = await useModalStore
      .getState()
      .openAsync<boolean>('confirm-bulk-delete', 'confirm', {
        title: `Hapus ${selectedSongIds.size} Lagu?`,
        description: `${selectedSongIds.size} lagu yang dipilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
        confirmLabel: 'Hapus Semua',
        danger: true
      })
    if (!confirmed) return
    const countToDelete = selectedSongIds.size
    try {
      for (const id of selectedSongIds) {
        await window.api.songs.delete(id)
      }
      setSelectedSongIds(new Set())
      setSelectedSongId(null)
      await loadSongs(selectedHymnalId || undefined)
      showToast(`${countToDelete} lagu berhasil dihapus`, 'success')
    } catch (err) {
      logger.error('Bulk delete failed:', err)
      showToast('Gagal menghapus lagu', 'error')
    }
  }, [loadSongs, selectedHymnalId, selectedSongIds, showToast])

  /** Bulk set category/tags on selected songs */
  const handleBulkSetCategory = useCallback(
    async (category: string): Promise<void> => {
      const songIds = Array.from(selectedSongIds)
      if (songIds.length === 0) return
      try {
        for (const id of songIds) {
          await window.api.songs.update(id, { category })
        }
        await loadSongs(selectedHymnalId || undefined)
        showToast(`Kategori "${category}" diterapkan ke ${songIds.length} lagu`, 'success')
      } catch (err) {
        logger.error('Bulk category failed:', err)
        showToast('Gagal mengubah kategori', 'error')
      }
    },
    [loadSongs, selectedHymnalId, selectedSongIds, showToast]
  )

  /** Bulk export selected songs as JSON */
  const handleBulkExportSelected = useCallback(async (): Promise<void> => {
    const songIds = Array.from(selectedSongIds)
    if (songIds.length === 0) return
    const exportSongs = songs.filter((song) => songIds.includes(song.id))

    useModalStore.getState().open('export-songs', 'export-song', { songs: exportSongs })
  }, [selectedSongIds, songs])

  const handleApplyBulkBackground = useCallback(async (): Promise<void> => {
    const songIds = Array.from(selectedSongIds)
    if (songIds.length === 0) return

    let songBackgroundConfig = ''
    let assetId: string | undefined

    if (bulkBackgroundMode === 'scene-preset') {
      const preset = DEFAULT_SCENE_PRESETS.find((item) => item.id === bulkPresetId)
      if (!preset) {
        showToast('Preset tidak ditemukan', 'error')
        return
      }
      songBackgroundConfig = JSON.stringify(preset.config)
    } else if (bulkBackgroundMode === 'library-asset') {
      const asset = mediaAssets.find((item) => item.id === bulkAssetId) || null
      if (!asset) {
        showToast('Pilih asset background terlebih dahulu', 'error')
        return
      }
      songBackgroundConfig = JSON.stringify(buildSongAssetAtmosphere(asset))
      assetId = asset.id
    } else {
      songBackgroundConfig = ''
    }

    setIsApplyingBulkBackground(true)
    try {
      const changed = await window.api.songs.bulkAssignBackground({
        songIds,
        songBackgroundConfig,
        assetId
      })
      await loadSongs(selectedHymnalId || undefined)
      showToast(`Background diterapkan: ${changed}/${songIds.length} lagu`, 'success')
      setIsBulkBackgroundDialogOpen(false)
    } catch (err) {
      logger.error('Bulk background assignment failed:', err)
      showToast('Gagal menerapkan background bulk', 'error')
    } finally {
      setIsApplyingBulkBackground(false)
    }
  }, [
    bulkAssetId,
    bulkBackgroundMode,
    bulkPresetId,
    loadSongs,
    mediaAssets,
    selectedHymnalId,
    selectedSongIds,
    showToast
  ])

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

      try {
        const rawText = await file.text()
        useModalStore.getState().open('import-progress', 'import-progress', {
          rawText,
          targetHymnalId: selectedHymnalId
        })
      } catch (err) {
        logger.error('Failed to read JSON file:', err)
        showToast('Gagal membaca file JSON', 'error')
      }
    },
    [selectedHymnalId, showToast]
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
  const selectedSongAtmosphere = selectedSong ? getSongAtmosphereSummary(selectedSong) : null

  return (
    <div className={`management-studio ${isFocusWorkspace ? 'management-studio--focus' : ''}`}>
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleJsonImport}
      />

      <div className="management-studio__shell">
        <header className="management-studio__header">
          <div className="management-studio__heading">
            <div className="management-studio__eyebrow">
              <Layers3 size={14} />
              Content Operations
            </div>
            <h1>Dashboard Management</h1>
            <p>
              Kelola koleksi lagu, metadata, import, dan validasi database dalam satu workspace.
            </p>
            <div className="management-studio__hero-metrics">
              <span>{formatNumber(songs.length)} lagu</span>
              <span>{songStats.coverage}% publish coverage</span>
              <span>{formatNumber(filteredSongs.length)} hasil aktif</span>
            </div>
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
              onClick={() => useModalStore.getState().open('integrity-check', 'integrity-check')}
              className="management-action"
            >
              <Database size={16} />
              Integritas
            </button>
            <button type="button" onClick={handleExportData} className="management-action">
              <Download size={16} />
              Export
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
            <Surface key={metric.label} className="management-summary-card">
              <div className={`management-summary-card__icon bg-gradient-to-br ${metric.tone}`}>
                {metric.icon}
              </div>
              <div className="management-summary-card__content">
                <div className="management-summary-card__label">{metric.label}</div>
                <div className="management-summary-card__value-row">
                  <div className="management-summary-card__value">{metric.value}</div>
                  <span>{metric.trend}</span>
                </div>
              </div>
              <div className="management-summary-card__sparkline">
                <MiniBars values={metric.bars} tone={metric.tone} />
              </div>
              <div className="management-summary-card__meta">{metric.meta}</div>
            </Surface>
          ))}
        </section>

        <main className="management-workspace-grid">
          <section className="management-list-stack flex min-h-0 flex-col">
            <Surface className="management-command-bar">
              <div className="management-command-bar__inner">
                <div className="management-command-bar__primary">
                  <div className="management-segmented">
                    {(['all', 'draft', 'review', 'published'] as Array<'all' | StatusTone>).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatusFilter(status)}
                          className={statusFilter === status ? 'is-active' : ''}
                        >
                          {status === 'all' ? 'Semua' : statusConfig[status].label}
                        </button>
                      )
                    )}
                  </div>

                  <IconButton title="Buku Lagu Baru" onClick={() => setShowNewHymnalDialog(true)}>
                    <FolderPlus size={15} />
                  </IconButton>
                  <IconButton title="Bulk import/export" onClick={() => setScreen('import-export')}>
                    <Import size={15} />
                  </IconButton>
                </div>

                <div className="management-command-bar__filters">
                  <HymnalFilterDropdown
                    hymnals={hymnals}
                    selectedId={selectedHymnalId}
                    className="management-hymnal-filter"
                    onChange={(id) => setSelectedHymnalId(id)}
                  />

                  <div className="management-search">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      id="song-search-input"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari judul atau nomor..."
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
                    onChange={(event) =>
                      setSortMode(event.target.value as 'number' | 'title' | 'updated')
                    }
                    className="management-select"
                  >
                    <option value="number">Sort: Nomor</option>
                    <option value="title">Sort: Judul</option>
                    <option value="updated">Sort: Terbaru</option>
                  </select>
                  <IconButton
                    title="Layout toggle"
                    onClick={() => setViewMode((v) => (v === 'table' ? 'grid' : 'table'))}
                  >
                    {viewMode === 'table' ? <Grid2X2 size={16} /> : <List size={16} />}
                  </IconButton>
                </div>
              </div>
            </Surface>

            <Surface className="management-browser">
              <div className="management-browser__header">
                <div>
                  <h2>Daftar Lagu</h2>
                  <p>
                    {formatNumber(filteredSongs.length)} dari {formatNumber(songs.length)} lagu
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSongIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedSongIds(new Set())}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.05] hover:text-white"
                        aria-label={`Deselect ${selectedSongIds.size} lagu`}
                      >
                        Clear {selectedSongIds.size}
                      </button>
                      <IconButton
                        title="Bulk background assignment"
                        onClick={() => {
                          setBulkAssetSearch('')
                          setIsBulkBackgroundDialogOpen(true)
                        }}
                      >
                        <Layers3 size={15} />
                      </IconButton>
                      <select
                        className="management-select text-[11px] max-w-[140px]"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) void handleBulkSetCategory(e.target.value)
                        }}
                        aria-label="Bulk set category"
                      >
                        <option value="" disabled>
                          Set Kategori
                        </option>
                        <option value="Pujian">Pujian</option>
                        <option value="Penyembahan">Penyembahan</option>
                        <option value="Pembukaan">Pembukaan</option>
                        <option value="Penutupan">Penutupan</option>
                        <option value="Natal">Natal</option>
                        <option value="Paskah">Paskah</option>
                        <option value="Anak">Anak</option>
                        <option value="Umum">Umum</option>
                      </select>
                      <IconButton
                        title="Export selected songs"
                        onClick={() => void handleBulkExportSelected()}
                      >
                        <Download size={15} />
                      </IconButton>
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

              {viewMode === 'table' && (
                <div className="management-browser__columns">
                  <span />
                  <span>No</span>
                  <span>Judul Lagu</span>
                  <span>Buku Lagu</span>
                  <span>Status</span>
                  <span>Metadata</span>
                  <span className="text-right">Aksi</span>
                </div>
              )}

              <div className="management-browser__viewport" ref={tableParentRef}>
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
                  <VirtualizedSongList
                    filteredSongs={filteredSongs}
                    viewMode={viewMode}
                    selectedSong={selectedSong}
                    selectedSongIds={selectedSongIds}
                    selectedHymnal={selectedHymnal}
                    parentRef={tableParentRef}
                    onSelectSong={setSelectedSongId}
                    onEditSong={handleEditSong}
                    onDuplicateSong={handleDuplicateSong}
                    onDeleteSong={handleDeleteSong}
                    onToggleSelection={toggleSongSelection}
                  />
                )}
              </div>
              <div className="management-browser__footer">
                <span>
                  {formatNumber(filteredSongs.length)} lagu dalam hasil aktif
                  {selectedSongIds.size > 0
                    ? ` - ${formatNumber(selectedSongIds.size)} dipilih`
                    : ''}
                </span>
                <div className="flex items-center gap-2">
                  <span>{viewMode === 'table' ? 'Virtual table' : 'Grid view'}</span>
                  <span>
                    {sortMode === 'number' ? 'Nomor' : sortMode === 'title' ? 'Judul' : 'Terbaru'}
                  </span>
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
                      <div>{selectedSong.title}</div>
                    </div>
                    <div className="management-inspector__title-block">
                      <h3>
                        {selectedSong.number} - {selectedSong.title}
                      </h3>
                      <p>
                        {selectedSong.alternate_title ||
                          selectedSong.title_en ||
                          'No alternate title'}
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
                    <button onClick={() => handleEditSong(selectedSong)} className="is-primary">
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
                        [
                          'Dibuat',
                          selectedSong.created_at
                            ? new Date(selectedSong.created_at).toLocaleString('id-ID')
                            : '-'
                        ],
                        [
                          'Diubah',
                          selectedSong.updated_at
                            ? new Date(selectedSong.updated_at).toLocaleString('id-ID')
                            : '-'
                        ]
                      ].map(([label, value]) => (
                        <React.Fragment key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  </div>

                  <div className="management-inspector__section">
                    <div className="management-inspector__section-title">Background Binding</div>
                    <dl>
                      {[
                        ['Mode', selectedSongAtmosphere?.label || 'Global'],
                        [
                          'Detail',
                          selectedSongAtmosphere?.detail || 'Mengikuti default atmosphere service'
                        ]
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
                        [
                          'Chorus',
                          (selectedSong.lyrics_raw || '').toLowerCase().includes('chorus') ? 1 : 0
                        ],
                        [
                          'Bridge',
                          (selectedSong.lyrics_raw || '').toLowerCase().includes('bridge') ? 1 : 0
                        ]
                      ].map(([label, value]) => (
                        <div key={label}>
                          <strong>{value}</strong>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="management-inspector__quick-actions">
                    <button
                      onClick={() => useModeStore.getState().setMode('PROJECTION')}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                    >
                      <Maximize2 size={14} />
                      Open Lyrics
                    </button>
                    <button
                      onClick={() =>
                        useModalStore.getState().open('playlist-picker', 'playlist-picker')
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                    >
                      <Plus size={14} />
                      Add Playlist
                    </button>
                    <button
                      onClick={() =>
                        useModalStore
                          .getState()
                          .open('duplicate-song', 'duplicate-song', { song: selectedSong })
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                    >
                      <Copy size={14} />
                      Duplicate
                    </button>
                    <button
                      onClick={() =>
                        useModalStore.getState().open('song-relations', 'song-relations')
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-xs font-semibold text-slate-300 transition-all hover:border-blue-400/25 hover:bg-blue-500/10 hover:text-white"
                    >
                      <History size={14} />
                      History
                    </button>
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

      {isBulkBackgroundDialogOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-8 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-[#0c1422] p-6 shadow-[0_35px_100px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">
                  Workflow Operator
                </div>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Bulk Song Background Assignment
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Terapkan background binding ke {selectedSongIds.size} lagu yang dipilih.
                </p>
              </div>
              <IconButton
                title="Close"
                onClick={() => {
                  if (!isApplyingBulkBackground) setIsBulkBackgroundDialogOpen(false)
                }}
                disabled={isApplyingBulkBackground}
              >
                <X size={16} />
              </IconButton>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-slate-400">Mode</span>
                <div className="relative">
                  <select
                    value={bulkBackgroundMode}
                    onChange={(event) =>
                      setBulkBackgroundMode(
                        event.target.value as 'global' | 'scene-preset' | 'library-asset'
                      )
                    }
                    className="h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-black/20 px-3 pr-10 text-sm text-white outline-none transition-all focus:border-blue-400/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                  >
                    <option value="global">Reset ke Global (hapus binding)</option>
                    <option value="scene-preset">Preset Atmosphere</option>
                    <option value="library-asset">Asset Media Library</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </label>

              {bulkBackgroundMode === 'scene-preset' && (
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-slate-400">Preset</span>
                  <div className="relative">
                    <select
                      value={bulkPresetId}
                      onChange={(event) => setBulkPresetId(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-black/20 px-3 pr-10 text-sm text-white outline-none transition-all focus:border-blue-400/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                    >
                      {DEFAULT_SCENE_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </label>
              )}

              {bulkBackgroundMode === 'library-asset' && (
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold text-slate-400">Koleksi</span>
                      <div className="relative">
                        <select
                          value={bulkCollectionId}
                          onChange={(event) => {
                            setBulkCollectionId(event.target.value)
                            setBulkAssetSearch('')
                          }}
                          className="h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-black/20 px-3 pr-10 text-sm text-white outline-none transition-all focus:border-blue-400/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                        >
                          <option value="">Semua Asset</option>
                          {mediaCollections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                              {collection.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                      </div>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold text-slate-400">Cari Asset</span>
                      <input
                        value={bulkAssetSearch}
                        onChange={(event) => setBulkAssetSearch(event.target.value)}
                        placeholder="Cari nama, kategori, tag..."
                        className="h-11 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-400/40 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
                      />
                    </label>
                  </div>

                  <div className="grid max-h-[340px] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
                    {bulkFilteredAssets.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-white/[0.06] bg-black/20 px-4 py-5 text-sm text-slate-400">
                        Tidak ada asset pada filter ini.
                      </div>
                    ) : (
                      bulkFilteredAssets.map((asset) => {
                        const isSelected = asset.id === bulkAssetId
                        const thumbUrl = asset.thumbnailPath ? toFileUrl(asset.thumbnailPath) : ''
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => setBulkAssetId(asset.id)}
                            className={`group overflow-hidden rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-blue-400/40 bg-blue-500/10 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                                : 'border-white/[0.06] bg-white/[0.02] hover:border-blue-400/25 hover:bg-blue-500/5'
                            }`}
                          >
                            <div className="relative aspect-video bg-black/30">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={asset.name}
                                  className="h-full w-full object-cover"
                                  draggable={false}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  {asset.type === 'video' ? (
                                    <Film size={18} />
                                  ) : (
                                    <ImageIcon size={18} />
                                  )}
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-bold text-blue-200">
                                  Selected
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-2">
                              <div className="truncate text-sm font-semibold text-white">
                                {asset.name}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="truncate">
                                  {asset.category || 'Uncategorized'}
                                </span>
                                <span className="opacity-60">·</span>
                                <span className="whitespace-nowrap">
                                  {asset.type === 'video' ? 'Video' : 'Image'}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkBackgroundDialogOpen(false)}
                disabled={isApplyingBulkBackground}
                className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition-all hover:bg-white/[0.06] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyBulkBackground}
                disabled={
                  isApplyingBulkBackground ||
                  selectedSongIds.size === 0 ||
                  (bulkBackgroundMode === 'library-asset' && !bulkAssetId)
                }
                className="h-10 rounded-xl border border-blue-300/20 bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.24)] transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Terapkan Ke {selectedSongIds.size} Lagu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
