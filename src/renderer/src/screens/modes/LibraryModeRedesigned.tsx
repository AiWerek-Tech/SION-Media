import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Boxes,
  Command,
  Copy,
  Edit3,
  Expand,
  FileEdit,
  FolderOpen,
  Grid3X3,
  GripVertical,
  Heart,
  History,
  Library,
  ListMusic,
  MonitorPlay,
  MoreHorizontal,
  Music2,
  PanelRightClose,
  PanelLeftOpen,
  Play,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  Star,
  Tags,
  Trash2,
  Type,
  X
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore } from '../../store/useModeStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useModalStore } from '../../store/useModalStore'
import { LibraryLyricsViewer } from '../../components/library/LibraryLyricsViewer'
import { SongContextMenu } from '../../components/library/SongContextMenu'
import type { SongContextMenuAction } from '../../components/library/SongContextMenu'
import { HymnalFilterDropdown } from '../../components/library/HymnalFilterDropdown'
import { logger } from '../../utils/logger'
import type { AppMode } from '../../store/useModeStore'
import type { Song } from '../../types'

type LibraryTab = 'playlist' | 'number' | 'title'
type LibraryWorkspace =
  | 'all'
  | 'playlist'
  | 'favorites'
  | 'recent'
  | 'collections'
  | 'hymnals'
  | 'tags'
  | 'practice'
  | 'chords'
  | 'vocal'
  | 'utilities'
  | 'broadcast'
  | 'ai'
  | 'analytics'

const TABS: Array<{ id: LibraryTab; label: string; icon: React.ElementType }> = [
  { id: 'playlist', label: 'Playlist', icon: ListMusic },
  { id: 'number', label: 'Nomor', icon: Grid3X3 },
  { id: 'title', label: 'Judul', icon: Type }
]

const NAV_GROUPS: Array<{
  label: string
  items: Array<{
    id: LibraryWorkspace
    label: string
    icon: React.ElementType
    count?: (ctx: LibraryCounts) => number
    comingSoon?: boolean
  }>
}> = [
  {
    label: 'Library',
    items: [
      { id: 'all', label: 'Buku Aktif', icon: BookOpen, count: (ctx) => ctx.songs },
      { id: 'playlist', label: 'Playlist Saya', icon: ListMusic, count: (ctx) => ctx.playlists },
      { id: 'favorites', label: 'Favorit', icon: Heart, count: (ctx) => ctx.favorites },
      { id: 'recent', label: 'Recently Opened', icon: History, count: (ctx) => ctx.recent },
      { id: 'tags', label: 'Tags & Themes', icon: Tags, count: (ctx) => ctx.tags }
    ]
  }
]

type LibraryCounts = {
  songs: number
  playlists: number
  favorites: number
  recent: number
  hymnals: number
  tags: number
}

type TagOption = {
  label: string
  count: number
}

function normalizeNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (!raw) return '--'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed || '0'
}

function songVerseCount(song: Song): number {
  const raw = song.lyrics_raw || ''
  const bracketSections = raw.match(/^\[[^\]]+\]/gm)
  if (bracketSections?.length) return bracketSections.length
  return raw.split(/\n\s*\n/g).filter((block) => block.trim().length > 0).length || 1
}

function tempoLabel(song: Song): string {
  const raw = song.tempo?.trim()
  if (!raw) return '-'
  return /\d/.test(raw) && !raw.toLowerCase().includes('bpm') ? `${raw} BPM` : raw
}

function matchesSong(song: Song, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return [
    song.number,
    song.title,
    song.alternate_title,
    song.title_en,
    song.author,
    song.composer,
    song.category,
    song.theme,
    song.tags
  ]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(q))
}

function parseSongTags(song: Song): string[] {
  return [song.category, song.theme, ...(song.tags || '').split(',')]
    .map((tag) => tag?.trim())
    .filter(Boolean) as string[]
}

function LibraryArtwork({
  song,
  large = false
}: {
  song?: Song | null
  large?: boolean
}): React.JSX.Element {
  return (
    <div
      className={large ? 'library-pro-artwork library-pro-artwork--large' : 'library-pro-artwork'}
    >
      <div className="library-pro-artwork__flare" />
      <span>{song?.hymnal_code || 'SION'}</span>
      <strong>{song ? normalizeNumber(song.number) : 'LS'}</strong>
      <Music2 size={large ? 30 : 18} />
    </div>
  )
}

function ComingSoonWorkspace({
  workspace,
  songs,
  onBack
}: {
  workspace: LibraryWorkspace
  songs: Song[]
  onBack: () => void
}): React.JSX.Element {
  const sample = songs.slice(0, 4)
  const title =
    NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === workspace)?.label ||
    'Workspace'

  return (
    <div className="library-pro-coming-soon">
      <div className="library-pro-coming-soon__hero">
        <span className="library-pro-coming-soon__badge">Coming Soon</span>
        <h2>{title}</h2>
        <p>
          Workspace ini sudah disiapkan sebagai bagian dari SION Media ecosystem. Kontrol lanjutan
          akan aktif saat backend modul selesai, sementara struktur visualnya tetap siap untuk
          workflow produksi.
        </p>
        <button onClick={onBack}>
          <Library size={15} />
          Kembali ke Library
        </button>
      </div>

      <div className="library-pro-preview-stack">
        <div className="library-pro-preview-card is-primary">
          <div>
            <span>Prepared Content</span>
            <strong>{sample.length || songs.length} sumber siap dipetakan</strong>
          </div>
          <div className="library-pro-preview-bars">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="library-pro-preview-card is-locked">
          <span>Advanced Controls</span>
          <strong>Locked until module runtime is connected</strong>
          <div className="library-pro-locked-grid">
            <button disabled>Analyze</button>
            <button disabled>Generate</button>
            <button disabled>Sync</button>
          </div>
        </div>
        <div className="library-pro-preview-card">
          <span>Content Preview</span>
          {sample.map((song) => (
            <div key={song.id} className="library-pro-mini-row">
              <LibraryArtwork song={song} />
              <div>
                <strong>{song.title}</strong>
                <p>{song.category || song.hymnal_name || 'Worship media'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SongMediaCard({
  song,
  selected,
  onSelect,
  onOpen,
  onAdd,
  onToggleFavorite,
  onContextMenu
}: {
  song: Song
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onAdd: () => void
  onToggleFavorite: (song: Song) => void
  onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const verses = songVerseCount(song)
  const articleRef = React.useRef<HTMLDivElement>(null)

  // Phase 6: Bind native dragstart via ref to avoid framer-motion conflict
  React.useEffect(() => {
    const el = articleRef.current
    if (!el) return
    el.setAttribute('draggable', 'true')
    const handler = (e: DragEvent): void => {
      e.dataTransfer?.setData('application/sion-song-id', String(song.id))
      e.dataTransfer?.setData('text/plain', `${song.number} - ${song.title}`)
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
    }
    el.addEventListener('dragstart', handler)
    return () => el.removeEventListener('dragstart', handler)
  }, [song.id, song.number, song.title])

  return (
    <motion.article
      ref={articleRef}
      layout
      whileHover={{ y: -2 }}
      className={`library-pro-song-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
      onContextMenu={onContextMenu}
    >
      <div className="library-pro-song-card__top">
        <LibraryArtwork song={song} />
        <div className="flex items-center gap-1">
          <span className="text-text-disabled cursor-grab active:cursor-grabbing">
            <GripVertical size={12} />
          </span>
          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleFavorite(song)
            }}
            className={song.is_favorite === 1 ? 'is-favorite' : ''}
            title="Favorit"
          >
            <Star size={15} fill={song.is_favorite === 1 ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="library-pro-song-card__body">
        <div className="library-pro-song-card__number">{normalizeNumber(song.number)}</div>
        <h3>{song.title}</h3>
        <p>{song.title_en || song.alternate_title || song.hymnal_name || 'SION Media'}</p>
      </div>

      <div className="library-pro-song-card__meta">
        <span>{song.key_note || 'G'}</span>
        <span>{tempoLabel(song)}</span>
        <span>{verses} bait</span>
      </div>

      <div className="library-pro-song-card__actions">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          <Play size={13} />
          Buka
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
          title="Tambahkan ke playlist"
        >
          <Plus size={14} />
        </button>
      </div>
    </motion.article>
  )
}

function NumberTile({
  song,
  selected,
  onSelect
}: {
  song: Song
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <button
      className={`library-pro-number-tile ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
    >
      <span>{normalizeNumber(song.number).padStart(3, '0')}</span>
      <small>
        {song.is_favorite === 1 ? 'Favorit' : song.key_note || song.hymnal_code || 'LS'}
      </small>
    </button>
  )
}

function RightInspector({
  song,
  onOpen,
  onAdd,
  onToggleFavorite,
  onEdit
}: {
  song: Song | null
  onOpen: () => void
  onAdd: () => void
  onToggleFavorite: () => void
  onEdit: () => void
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'detail' | 'chord' | 'notes'>('detail')

  if (!song) {
    return (
      <aside className="library-pro-inspector">
        <div className="library-pro-panel-tabs">
          <button
            className={activeTab === 'detail' ? 'is-active' : ''}
            onClick={() => setActiveTab('detail')}
          >
            Detail Lagu
          </button>
          <button
            className={activeTab === 'chord' ? 'is-active' : ''}
            onClick={() => setActiveTab('chord')}
          >
            Chord
          </button>
          <button
            className={activeTab === 'notes' ? 'is-active' : ''}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
        </div>
        <div className="library-pro-empty-inspector">
          <Music2 size={34} />
          <strong>Pilih lagu</strong>
          <p>Metadata, preview, dan aksi cepat akan tampil di inspector.</p>
        </div>
      </aside>
    )
  }

  const meta = [
    ['Buku Lagu', song.hymnal_name || song.hymnal_code || '-'],
    ['Kategori', song.category || '-'],
    ['Penulis', song.author || '-'],
    ['Komposer', song.composer || '-'],
    ['Tema', song.theme || song.tags || '-'],
    ['Key', song.key_note || '-'],
    ['Tempo', tempoLabel(song)],
    ['Birama', song.time_signature || '-'],
    ['Copyright', 'SION Media']
  ]

  return (
    <aside className="library-pro-inspector flex flex-col">
      <div className="library-pro-panel-tabs shrink-0">
        <button
          className={activeTab === 'detail' ? 'is-active' : ''}
          onClick={() => setActiveTab('detail')}
        >
          Detail Lagu
        </button>
        <button
          className={activeTab === 'chord' ? 'is-active' : ''}
          onClick={() => setActiveTab('chord')}
        >
          Chord
        </button>
        <button
          className={activeTab === 'notes' ? 'is-active' : ''}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>

      <div className="library-pro-inspector__content flex-1 overflow-y-auto">
        {activeTab === 'detail' && (
          <>
            <LibraryArtwork song={song} large />
            <div className="library-pro-inspector__title">
              <span>{normalizeNumber(song.number).padStart(3, '0')}</span>
              <h2>{song.title}</h2>
              <p>{song.title_en || song.alternate_title || song.hymnal_name || 'Worship media'}</p>
            </div>

            <div className="library-pro-inspector__primary-actions">
              <button onClick={onOpen}>
                <Play size={15} />
                Buka Lagu
              </button>
              <button onClick={onAdd}>
                <Plus size={15} />
                Tambah Playlist
              </button>
            </div>

            <div className="library-pro-meta-table">
              {meta.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="library-pro-inspector__quick">
              <button
                className={song.is_favorite === 1 ? 'is-favorite' : ''}
                onClick={onToggleFavorite}
              >
                <Heart size={14} />
                {song.is_favorite === 1 ? 'Favorit' : 'Favoritkan'}
              </button>
              <button onClick={onEdit}>
                <Edit3 size={14} />
                Edit Info
              </button>
              <button onClick={() => setActiveTab('chord')}>
                <SlidersHorizontal size={14} />
                Chord
              </button>
              <button>
                <MoreHorizontal size={14} />
              </button>
            </div>
          </>
        )}

        {activeTab === 'chord' && (
          <div className="flex flex-col gap-4 pt-2">
            <h3 className="text-sm font-bold text-white mb-2">Chord Sheet</h3>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center">
              <h4 className="text-[14px] font-bold text-text-primary mb-2">
                Nada Dasar: {song.key_note || '?'}
              </h4>
              <p className="text-[12px] text-text-secondary mb-4">
                Birama: {song.time_signature || '?'} • Tempo: {song.tempo || '?'}
              </p>
              <div className="text-[12px] text-text-muted bg-black/20 p-4 rounded-lg font-mono whitespace-pre text-left overflow-x-auto">
                {song.key_note
                  ? `[${song.key_note}]\nTidak ada chord sheet yang tersimpan untuk lagu ini.`
                  : 'Metadata nada dasar belum diatur.'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col gap-4 pt-2">
            <h3 className="text-sm font-bold text-white mb-2">Operator Notes</h3>
            <div className="text-[12px] text-slate-400 bg-white/[0.03] p-4 rounded-lg border border-white/[0.05] min-h-[150px]">
              Notes kosong. Gunakan fitur Edit Info untuk menambahkan catatan operator khusus untuk
              lagu ini.
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function LibraryFilterRail({
  workspace,
  hymnals,
  selectedHymnalId,
  tagOptions,
  activeTag,
  onSelectHymnal,
  onSelectTag
}: {
  workspace: LibraryWorkspace
  hymnals: Array<{ id: number; name: string; code: string }>
  selectedHymnalId: number | null
  tagOptions: TagOption[]
  activeTag: string | null
  onSelectHymnal: (id: number | null) => void
  onSelectTag: (tag: string | null) => void
}): React.JSX.Element | null {
  if (workspace === 'hymnals') {
    return (
      <div className="library-pro-filter-rail">
        <button
          className={selectedHymnalId === null ? 'is-active' : ''}
          onClick={() => onSelectHymnal(null)}
        >
          Semua Buku
        </button>
        {hymnals.map((hymnal) => (
          <button
            key={hymnal.id}
            className={selectedHymnalId === hymnal.id ? 'is-active' : ''}
            onClick={() => onSelectHymnal(hymnal.id)}
          >
            <span>{hymnal.code}</span>
            {hymnal.name}
          </button>
        ))}
      </div>
    )
  }

  if (workspace === 'tags') {
    return (
      <div className="library-pro-filter-rail">
        <button className={activeTag === null ? 'is-active' : ''} onClick={() => onSelectTag(null)}>
          Semua Tema
        </button>
        {tagOptions.slice(0, 24).map((tag) => (
          <button
            key={tag.label}
            className={activeTag === tag.label ? 'is-active' : ''}
            onClick={() => onSelectTag(tag.label)}
          >
            {tag.label}
            <small>{tag.count}</small>
          </button>
        ))}
      </div>
    )
  }

  return null
}

function LibraryOverview({ counts }: { counts: LibraryCounts }): React.JSX.Element {
  const stats = [
    { label: 'Total Lagu', value: counts.songs, detail: 'semua lagu', icon: Music2, tone: 'blue' },
    {
      label: 'Buku Lagu',
      value: counts.hymnals,
      detail: 'koleksi',
      icon: BookOpen,
      tone: 'violet'
    },
    {
      label: 'Playlist',
      value: counts.playlists,
      detail: 'playlist saya',
      icon: SlidersHorizontal,
      tone: 'green'
    },
    {
      label: 'Favorit',
      value: counts.favorites,
      detail: 'lagu favorit',
      icon: Star,
      tone: 'amber'
    },
    { label: 'Tag', value: counts.tags, detail: 'tema tersedia', icon: Tags, tone: 'cyan' }
  ]

  return (
    <section className="library-pro-overview">
      <div className="library-pro-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className={`library-pro-stat-card is-${stat.tone}`}>
              <div>
                <Icon size={23} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/** Virtualized grid for SongMediaCard (Title tab) — renders only visible rows for 1000+ songs */
const TITLE_CARD_MIN_WIDTH = 236
const TITLE_CARD_GAP = 14
const ROW_HEIGHT = 220

function VirtualizedSongGrid({
  songs,
  selectedSongId,
  onSelectSong,
  onOpenSong,
  onAddToPlaylist,
  onToggleFavorite,
  onContextMenu
}: {
  songs: Song[]
  selectedSongId: number | null
  onSelectSong: (song: Song) => void
  onOpenSong: (song: Song) => void
  onAddToPlaylist: (song: Song) => void
  onToggleFavorite: (song: Song) => void
  onContextMenu: (e: React.MouseEvent, song: Song) => void
}): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const [columnCount, setColumnCount] = useState(3)
  const rowCount = Math.ceil(songs.length / columnCount)

  useEffect(() => {
    const element = parentRef.current
    if (!element) return

    const updateColumnCount = (): void => {
      const contentWidth = Math.max(0, element.clientWidth - 36)
      const nextColumnCount = Math.max(
        1,
        Math.floor((contentWidth + TITLE_CARD_GAP) / (TITLE_CARD_MIN_WIDTH + TITLE_CARD_GAP))
      )
      setColumnCount((current) => (current === nextColumnCount ? current : nextColumnCount))
    }

    updateColumnCount()
    const resizeObserver = new ResizeObserver(updateColumnCount)
    resizeObserver.observe(element)

    return () => resizeObserver.disconnect()
  }, [])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3
  })

  return (
    <div ref={parentRef} className="library-pro-title-scroll scrollbar-thin">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * columnCount
          const rowSongs = songs.slice(startIdx, startIdx + columnCount)

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
                gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`
              }}
              className="library-pro-title-row"
            >
              {rowSongs.map((song) => (
                <SongMediaCard
                  key={song.id}
                  song={song}
                  selected={selectedSongId === song.id}
                  onSelect={() => onSelectSong(song)}
                  onOpen={() => onOpenSong(song)}
                  onAdd={() => onAddToPlaylist(song)}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenu={(e) => onContextMenu(e, song)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LibraryMode(): React.JSX.Element {
  const {
    hymnals,
    loadHymnals,
    loadSongs,
    setSelectedSong,
    setLyricsFullscreen,
    setEditingSong,
    setScreen,
    showToast,
    songs,
    setSongs
  } = useAppStore()
  const selectedSong = useAppStore((s) => s.selectedSong)
  const isLyricsFullscreen = useAppStore((s) => s.isLyricsFullscreen)
  const { setMode } = useModeStore()
  const { playlists, activePlaylist, playlistItems, loadPlaylists, addSongToPlaylist } =
    usePlaylistStore()

  const [activeTab, setActiveTab] = useState<LibraryTab>('number')
  const [workspace, setWorkspace] = useState<LibraryWorkspace>('all')
  const [query, setQuery] = useState('')
  const [fullscreenLibrary, setFullscreenLibrary] = useState(false)
  const [page, setPage] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeLibraryHymnalId, setActiveLibraryHymnalId] = useState<number | null>(null)
  const [appVersion, setAppVersion] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  // Phase 6: Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    open: boolean
    x: number
    y: number
    song: Song | null
  }>({
    open: false,
    x: 0,
    y: 0,
    song: null
  })
  const playlistDropRef = useRef<HTMLDivElement>(null)

  const refreshRecentSongs = useCallback(async (): Promise<void> => {
    try {
      const recent = (await window.api.system.getRecentSongs(50)) as Song[]
      setRecentSongs(recent)
    } catch (err) {
      logger.error('Failed to load recent songs:', err)
      setRecentSongs([])
    }
  }, [])

  useEffect(() => {
    loadHymnals()
    loadSongs(undefined)
    loadPlaylists().catch(logger.error)
    const timer = window.setTimeout(() => {
      void refreshRecentSongs()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadHymnals, loadPlaylists, loadSongs, refreshRecentSongs])

  useEffect(() => {
    if (workspace !== 'recent') return
    const timer = window.setTimeout(() => {
      void refreshRecentSongs()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshRecentSongs, workspace])

  useEffect(() => {
    let isMounted = true
    window.api.window
      .getVersion()
      .then((version) => {
        if (isMounted) setAppVersion(version)
      })
      .catch((err) => logger.error('Failed to load app version:', err))
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('library-pro-search')?.focus()
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFullscreenLibrary((value) => !value)
      }
      if (event.key === 'Escape' && fullscreenLibrary && !isLyricsFullscreen) {
        setFullscreenLibrary(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenLibrary, isLyricsFullscreen])

  const counts = useMemo<LibraryCounts>(() => {
    const tagSet = new Set(songs.flatMap(parseSongTags))
    return {
      songs: songs.length,
      playlists: playlists.length,
      favorites: songs.filter((song) => song.is_favorite === 1).length,
      recent: recentSongs.length,
      hymnals: hymnals.length,
      tags: tagSet.size
    }
  }, [hymnals.length, playlists.length, recentSongs.length, songs])

  const defaultHymnal = useMemo(() => {
    return (
      hymnals.find((hymnal) => hymnal.name.toLowerCase().includes('lagu sion edisi lengkap')) ||
      hymnals.find((hymnal) => hymnal.code.toLowerCase() === 'ls') ||
      hymnals[0] ||
      null
    )
  }, [hymnals])

  const activeHymnal = useMemo(() => {
    return hymnals.find((hymnal) => hymnal.id === activeLibraryHymnalId) || defaultHymnal
  }, [activeLibraryHymnalId, defaultHymnal, hymnals])

  const activeHymnalId = activeHymnal?.id ?? null

  const tagOptions = useMemo<TagOption[]>(() => {
    const map = new Map<string, number>()
    for (const song of songs.filter((item) => item.hymnal_id === activeHymnalId)) {
      for (const tag of parseSongTags(song)) {
        map.set(tag, (map.get(tag) || 0) + 1)
      }
    }
    return Array.from(map, ([label, count]) => ({ label, count })).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label)
    })
  }, [activeHymnalId, songs])

  // Phase 6: Hymnal song counts for filter dropdown
  const hymnalSongCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const song of songs) {
      if (song.hymnal_id) {
        map.set(song.hymnal_id, (map.get(song.hymnal_id) || 0) + 1)
      }
    }
    return map
  }, [songs])

  const effectiveActiveTag = workspace === 'tags' ? activeTag : null

  const visibleSongs = useMemo(() => {
    let base = workspace === 'recent' ? recentSongs : songs
    if (activeHymnalId !== null) base = base.filter((song) => song.hymnal_id === activeHymnalId)
    if (workspace === 'favorites') base = base.filter((song) => song.is_favorite === 1)
    if (effectiveActiveTag) {
      base = base.filter((song) => parseSongTags(song).includes(effectiveActiveTag))
    }
    const filtered = base.filter((song) => matchesSong(song, query))
    return [...filtered].sort((a, b) => {
      if (activeTab === 'title') return (a.title || '').localeCompare(b.title || '')
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }, [activeHymnalId, activeTab, effectiveActiveTag, query, recentSongs, songs, workspace])

  useEffect(() => {
    if (visibleSongs.length === 0) return
    if (!selectedSong || !visibleSongs.some((song) => song.id === selectedSong.id)) {
      setSelectedSong(visibleSongs[0])
    }
  }, [selectedSong, setSelectedSong, visibleSongs])

  const pageSize = 120
  const pageCount = Math.max(1, Math.ceil(visibleSongs.length / pageSize))
  const currentPage = Math.min(page, pageCount)

  const pagedSongs = useMemo(() => {
    if (activeTab !== 'number') return visibleSongs
    return visibleSongs.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [activeTab, currentPage, visibleSongs])

  const inspectedSong = useMemo(() => {
    if (!selectedSong) return null
    return (
      visibleSongs.find((song) => song.id === selectedSong.id) ||
      songs.find((song) => song.id === selectedSong.id) ||
      recentSongs.find((song) => song.id === selectedSong.id) ||
      selectedSong
    )
  }, [recentSongs, selectedSong, songs, visibleSongs])

  const workspaceTitle = useMemo(() => {
    if (workspace === 'favorites') return 'Favorit'
    if (workspace === 'recent') return 'Recently Opened'
    if (workspace === 'playlist') return 'Playlist Workspace'
    if (workspace === 'tags')
      return effectiveActiveTag ? `Tema: ${effectiveActiveTag}` : 'Tags & Themes'
    return activeHymnal?.name || 'Buku Lagu'
  }, [activeHymnal?.name, effectiveActiveTag, workspace])

  const resultSummary = useMemo(() => {
    if (visibleSongs.length === 0) return 'Tidak ada lagu yang cocok'
    if (activeTab === 'number') {
      return `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, visibleSongs.length)} dari ${visibleSongs.length} lagu`
    }
    return `${visibleSongs.length} lagu tampil dari ${songs.length} lagu dalam database`
  }, [activeTab, currentPage, songs.length, visibleSongs.length])

  const handleSelectSong = useCallback(
    (song: Song) => {
      setSelectedSong(song)
      if (fullscreenLibrary) setLyricsFullscreen(true)
    },
    [fullscreenLibrary, setLyricsFullscreen, setSelectedSong]
  )

  const handleOpenSong = useCallback(
    (song = selectedSong): void => {
      if (!song) return
      setSelectedSong(song)
      setLyricsFullscreen(true)
      window.setTimeout(() => {
        void refreshRecentSongs()
      }, 150)
    },
    [refreshRecentSongs, selectedSong, setLyricsFullscreen, setSelectedSong]
  )

  const handlePrevSong = useCallback(() => {
    if (!selectedSong) return
    if (activeTab === 'playlist') {
      const index = playlistItems.findIndex((item) => item.song_id === selectedSong.id)
      if (index > 0) {
        const prevId = playlistItems[index - 1].song_id
        const song = songs.find((s) => s.id === prevId)
        if (song) setSelectedSong(song)
      }
      return
    }
    const index = visibleSongs.findIndex((s) => s.id === selectedSong.id)
    if (index > 0) {
      setSelectedSong(visibleSongs[index - 1])
    }
  }, [activeTab, playlistItems, selectedSong, setSelectedSong, songs, visibleSongs])

  const handleNextSong = useCallback(() => {
    if (!selectedSong) return
    if (activeTab === 'playlist') {
      const index = playlistItems.findIndex((item) => item.song_id === selectedSong.id)
      if (index >= 0 && index < playlistItems.length - 1) {
        const nextId = playlistItems[index + 1].song_id
        const song = songs.find((s) => s.id === nextId)
        if (song) setSelectedSong(song)
      }
      return
    }
    const index = visibleSongs.findIndex((s) => s.id === selectedSong.id)
    if (index >= 0 && index < visibleSongs.length - 1) {
      setSelectedSong(visibleSongs[index + 1])
    }
  }, [activeTab, playlistItems, selectedSong, setSelectedSong, songs, visibleSongs])

  const handleAddToPlaylist = useCallback(
    (song: Song): void => {
      if (!activePlaylist) {
        showToast('Buka atau buat playlist terlebih dahulu', 'error')
        return
      }
      addSongToPlaylist(song).catch(logger.error)
      showToast(`"${song.title}" ditambahkan ke playlist`, 'success')
    },
    [activePlaylist, addSongToPlaylist, showToast]
  )

  // DUI-001: Wire favorite button with optimistic update
  const handleToggleFavorite = useCallback(
    async (song: Song): Promise<void> => {
      const prevSongs = songs
      // Optimistic update
      setSongs(
        songs.map((s) => (s.id === song.id ? { ...s, is_favorite: s.is_favorite ? 0 : 1 } : s))
      )
      setRecentSongs(
        recentSongs.map((s) =>
          s.id === song.id ? { ...s, is_favorite: s.is_favorite ? 0 : 1 } : s
        )
      )
      try {
        await window.api.songs.toggleFavorite(song.id)
      } catch {
        setSongs(prevSongs)
        void refreshRecentSongs()
        showToast('Gagal mengubah favorit', 'error')
      }
    },
    [recentSongs, refreshRecentSongs, setSongs, showToast, songs]
  )

  const handleEditSong = (): void => {
    if (!inspectedSong) return
    setEditingSong(inspectedSong)
    setScreen('song-editor')
  }

  // Phase 6: Context menu handler
  const handleSongContextMenu = useCallback((e: React.MouseEvent, song: Song) => {
    e.preventDefault()
    setCtxMenu({ open: true, x: e.clientX, y: e.clientY, song })
  }, [])

  const ctxMenuActions: SongContextMenuAction[] = useMemo(() => {
    if (!ctxMenu.song) return []
    const song = ctxMenu.song
    return [
      {
        id: 'open_song',
        label: 'Buka Lagu',
        icon: <BookOpen size={14} />,
        onClick: () => {
          setSelectedSong(song)
          setLyricsFullscreen(true)
        }
      },
      {
        id: 'add_to_playlist',
        label: 'Tambah ke Playlist',
        icon: <Plus size={14} />,
        onClick: () => handleAddToPlaylist(song)
      },
      {
        id: 'toggle_favorite',
        label: song.is_favorite === 1 ? 'Hapus Favorit' : 'Tambah Favorit',
        icon: <Star size={14} />,
        onClick: () => {
          void handleToggleFavorite(song)
        },
        dividerBefore: true
      },
      {
        id: 'edit_song',
        label: 'Edit Info Lagu',
        icon: <Edit3 size={14} />,
        onClick: () => {
          setEditingSong(song)
          setScreen('song-editor')
        }
      },
      {
        id: 'edit_lyrics',
        label: 'Edit Lirik',
        icon: <FileEdit size={14} />,
        onClick: () => {
          setEditingSong(song)
          setScreen('song-editor')
        }
      },
      {
        id: 'copy_number',
        label: 'Salin Nomor Lagu',
        icon: <Copy size={14} />,
        onClick: () => {
          navigator.clipboard.writeText(String(song.number || '')).catch(() => {})
          showToast(`Nomor "${song.number}" disalin`, 'info')
        },
        dividerBefore: true
      },
      {
        id: 'copy_title',
        label: 'Salin Judul',
        icon: <Copy size={14} />,
        onClick: () => {
          navigator.clipboard.writeText(song.title || '').catch(() => {})
          showToast(`Judul "${song.title}" disalin`, 'info')
        }
      },
      {
        id: 'view_relations',
        label: 'Lihat Relasi Lagu',
        icon: <Boxes size={14} />,
        onClick: () => {
          useModalStore.getState().open('song-relations-modal', 'song-relations', { song })
        },
        dividerBefore: true
      },
      {
        id: 'delete_song',
        label: 'Hapus Lagu...',
        icon: <Trash2 size={14} />,
        onClick: () => {
          showToast('Gunakan Management Mode untuk menghapus lagu', 'info')
        },
        danger: true,
        dividerBefore: true
      }
    ]
  }, [
    ctxMenu.song,
    handleAddToPlaylist,
    handleToggleFavorite,
    setEditingSong,
    setScreen,
    setSelectedSong,
    setLyricsFullscreen,
    showToast
  ])

  // Phase 6: Drag-to-playlist drop handler
  const handlePlaylistDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const songIdStr = e.dataTransfer.getData('application/sion-song-id')
      if (!songIdStr) return
      const songId = parseInt(songIdStr, 10)
      const song = songs.find((s) => s.id === songId)
      if (song) handleAddToPlaylist(song)
    },
    [songs, handleAddToPlaylist]
  )

  const handlePlaylistDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sion-song-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const activeWorkspaceIsComingSoon = NAV_GROUPS.flatMap((group) => group.items).some(
    (item) => item.id === workspace && item.comingSoon
  )

  return (
    <div
      className={`library-pro-shell ${fullscreenLibrary ? 'is-fullscreen-library' : ''} ${sidebarOpen ? 'is-sidebar-open' : ''}`}
    >
      <div className="library-pro-ambient" />

      {!fullscreenLibrary && (
        <aside className="library-pro-sidebar">
          <div className="library-pro-brand">
            <div className="library-pro-brand__mark">
              <Music2 size={18} />
            </div>
            <div>
              <strong>SION Media</strong>
              <span>{appVersion ? `Library v${appVersion}` : 'Library'}</span>
            </div>
            <button
              className="library-pro-sidebar__close"
              onClick={() => setSidebarOpen(false)}
              title="Sembunyikan sidebar"
            >
              <X size={16} />
            </button>
          </div>

          <nav className="library-pro-nav">
            {NAV_GROUPS.map((group) => (
              <section key={group.label}>
                <h3>{group.label}</h3>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = workspace === item.id
                  const count = item.count?.(counts)
                  return (
                    <button
                      key={item.id}
                      className={active ? 'is-active' : ''}
                      onClick={() => {
                        setWorkspace(item.id)
                        setPage(1)
                        if (item.id === 'playlist') {
                          setActiveTab('playlist')
                        } else if (!item.comingSoon) {
                          setActiveTab((tab) => (tab === 'playlist' ? 'number' : tab))
                        }
                        if (item.id !== 'tags') setActiveTag(null)
                        setSidebarOpen(false)
                      }}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                      {item.comingSoon ? (
                        <em>Soon</em>
                      ) : count !== undefined ? (
                        <b>{count}</b>
                      ) : null}
                    </button>
                  )
                })}
              </section>
            ))}
          </nav>

          <div className="library-pro-sidebar__footer">
            <div className="library-pro-db-status">
              <span>Database</span>
              <strong>
                <i />
                Terhubung
              </strong>
            </div>
          </div>
        </aside>
      )}

      {!fullscreenLibrary && sidebarOpen && (
        <button
          className="library-pro-sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Tutup menu Library"
        />
      )}

      <main className="library-pro-main">
        <header className="library-pro-command-bar">
          {!fullscreenLibrary && (
            <button
              className="library-pro-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              title="Buka menu Library"
            >
              <PanelLeftOpen size={17} />
            </button>
          )}
          <div className="library-pro-mode-pill">
            <Library size={15} />
            <span>Library Mode</span>
          </div>

          <label className="library-pro-search">
            <Search size={17} />
            <input
              id="library-pro-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Cari lagu, penulis, tema, nomor..."
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setPage(1)
                  document.getElementById('library-pro-search')?.focus()
                }}
                title="Hapus pencarian"
                aria-label="Hapus pencarian"
              >
                <X size={13} />
              </button>
            ) : (
              <kbd>
                <Command size={11} />K
              </kbd>
            )}
          </label>

          {!fullscreenLibrary && (
            <div className="library-pro-command-actions">
              <button onClick={() => setMode('MANAGEMENT' as AppMode)}>
                <FolderOpen size={15} />
                Content
              </button>
              <button onClick={() => setMode('BROADCAST' as AppMode)}>
                <Radio size={15} />
                Broadcast
              </button>
              <button className="is-primary" onClick={() => setMode('PROJECTION' as AppMode)}>
                <MonitorPlay size={15} />
                Present
              </button>
            </div>
          )}
        </header>

        {!fullscreenLibrary && <LibraryOverview counts={counts} />}

        <section className="library-pro-content">
          <div className="library-pro-browser">
            <div className="library-pro-browser__header">
              <div>
                {workspace === 'all' ? (
                  <HymnalFilterDropdown
                    hymnals={hymnals}
                    selectedId={activeHymnalId}
                    songCounts={hymnalSongCounts}
                    includeAll={false}
                    className="library-pro-title-selector"
                    onChange={(id) => {
                      if (id === null) return
                      setActiveLibraryHymnalId(id)
                      setWorkspace('all')
                      setActiveTab('number')
                      setActiveTag(null)
                      setPage(1)
                    }}
                  />
                ) : (
                  <h1>{workspaceTitle}</h1>
                )}
                <p>
                  {activeTab === 'playlist'
                    ? `${playlistItems.length} item dalam rundown ibadah`
                    : resultSummary}
                </p>
              </div>

              <div className="library-pro-browser__tools">
                <div className="library-pro-tabs">
                  {TABS.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        className={activeTab === tab.id ? 'is-active' : ''}
                        onClick={() => {
                          setActiveTab(tab.id)
                          setPage(1)
                        }}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
                <button
                  className="library-pro-fullscreen-button"
                  onClick={() => setFullscreenLibrary((value) => !value)}
                  title="Fullscreen library (Ctrl+Shift+F)"
                >
                  {fullscreenLibrary ? <PanelRightClose size={16} /> : <Expand size={16} />}
                </button>
              </div>
            </div>

            {activeWorkspaceIsComingSoon ? (
              <ComingSoonWorkspace
                workspace={workspace}
                songs={songs}
                onBack={() => {
                  setWorkspace('all')
                  setActiveTab('number')
                }}
              />
            ) : activeTab === 'playlist' ? (
              <div
                ref={playlistDropRef}
                className="library-pro-playlist-workspace"
                onDrop={handlePlaylistDrop}
                onDragOver={handlePlaylistDragOver}
              >
                <div className="library-pro-playlist-hero">
                  <ListMusic size={24} />
                  <div>
                    <h2>{activePlaylist?.name || 'Pilih Playlist'}</h2>
                    <p>{playlistItems.length} item dalam rundown ibadah</p>
                  </div>
                </div>
                <div className="library-pro-playlist-list">
                  {playlistItems.length === 0 ? (
                    <div className="library-pro-empty-state">
                      <ListMusic size={38} />
                      <strong>Belum ada playlist aktif</strong>
                      <p>Buat atau buka playlist, lalu drag lagu ke sini.</p>
                    </div>
                  ) : (
                    playlistItems.map((item, index) => (
                      <button
                        key={item.id}
                        className="library-pro-rundown-row"
                        onClick={() => {
                          const song = songs.find((candidate) => candidate.id === item.song_id)
                          if (song) handleSelectSong(song)
                        }}
                      >
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.section_label || item.hymnal_code || 'Service item'}</p>
                        </div>
                        <small>{item.tempo || '4:00'}</small>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'number' ? (
              <div className="library-pro-number-workspace">
                <LibraryFilterRail
                  workspace={workspace}
                  hymnals={hymnals}
                  selectedHymnalId={activeHymnalId}
                  tagOptions={tagOptions}
                  activeTag={effectiveActiveTag}
                  onSelectHymnal={(id) => {
                    if (id !== null) setActiveLibraryHymnalId(id)
                    setPage(1)
                  }}
                  onSelectTag={(tag) => {
                    setActiveTag(tag)
                    setPage(1)
                  }}
                />
                {visibleSongs.length === 0 ? (
                  <div className="library-pro-empty-state">
                    <Search size={38} />
                    <strong>Tidak ada lagu ditemukan</strong>
                    <p>Ubah kata kunci, buku lagu, atau tema untuk melihat hasil lain.</p>
                  </div>
                ) : (
                  <div className="library-pro-number-grid">
                    {pagedSongs.map((song) => (
                      <NumberTile
                        key={song.id}
                        song={song}
                        selected={inspectedSong?.id === song.id}
                        onSelect={() => handleSelectSong(song)}
                      />
                    ))}
                  </div>
                )}
                {visibleSongs.length > 0 && (
                  <div className="library-pro-pagination">
                    <span>{resultSummary}</span>
                    <div>
                      {Array.from({ length: Math.min(pageCount, 5) }).map((_, index) => {
                        const value = index + 1
                        return (
                          <button
                            key={value}
                            className={currentPage === value ? 'is-active' : ''}
                            onClick={() => setPage(value)}
                          >
                            {value}
                          </button>
                        )
                      })}
                      {pageCount > 5 && <small>...</small>}
                      {pageCount > 5 && (
                        <button
                          className={currentPage === pageCount ? 'is-active' : ''}
                          onClick={() => setPage(pageCount)}
                        >
                          {pageCount}
                        </button>
                      )}
                    </div>
                    <button onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                      120 / halaman
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="library-pro-title-workspace">
                <LibraryFilterRail
                  workspace={workspace}
                  hymnals={hymnals}
                  selectedHymnalId={activeHymnalId}
                  tagOptions={tagOptions}
                  activeTag={effectiveActiveTag}
                  onSelectHymnal={(id) => {
                    if (id !== null) setActiveLibraryHymnalId(id)
                    setPage(1)
                  }}
                  onSelectTag={(tag) => {
                    setActiveTag(tag)
                    setPage(1)
                  }}
                />
                {visibleSongs.length === 0 ? (
                  <div className="library-pro-empty-state">
                    <Search size={38} />
                    <strong>Tidak ada lagu ditemukan</strong>
                    <p>Ubah kata kunci, buku lagu, atau tema untuk melihat hasil lain.</p>
                  </div>
                ) : (
                  <VirtualizedSongGrid
                    songs={visibleSongs}
                    selectedSongId={inspectedSong?.id ?? null}
                    onSelectSong={handleSelectSong}
                    onOpenSong={handleOpenSong}
                    onAddToPlaylist={handleAddToPlaylist}
                    onToggleFavorite={handleToggleFavorite}
                    onContextMenu={handleSongContextMenu}
                  />
                )}
              </div>
            )}
          </div>

          {!fullscreenLibrary && (
            <RightInspector
              song={inspectedSong}
              onOpen={() => handleOpenSong()}
              onAdd={() => inspectedSong && handleAddToPlaylist(inspectedSong)}
              onToggleFavorite={() => inspectedSong && void handleToggleFavorite(inspectedSong)}
              onEdit={handleEditSong}
            />
          )}
        </section>
      </main>

      {/* Phase 6: Song context menu */}
      <SongContextMenu
        open={ctxMenu.open}
        x={ctxMenu.x}
        y={ctxMenu.y}
        onClose={() => setCtxMenu((prev) => ({ ...prev, open: false }))}
        actions={ctxMenuActions}
      />

      <AnimatePresence>
        {isLyricsFullscreen && selectedSong && (
          <motion.div
            key={selectedSong.id}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[90]"
          >
            <LibraryLyricsViewer
              song={selectedSong}
              onClose={() => {
                setLyricsFullscreen(false)
                if (!fullscreenLibrary) setSelectedSong(selectedSong)
              }}
              onPrevSong={handlePrevSong}
              onNextSong={handleNextSong}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
