import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  ChevronDown,
  Command,
  Edit3,
  Expand,
  FolderOpen,
  Gauge,
  Grid3X3,
  Heart,
  History,
  Library,
  ListMusic,
  Mic2,
  MonitorPlay,
  MoreHorizontal,
  Music2,
  PanelRightClose,
  Play,
  Plus,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Type
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore } from '../../store/useModeStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { LibraryLyricsViewer } from '../../components/library/LibraryLyricsViewer'
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
      { id: 'all', label: 'Semua Lagu', icon: Music2, count: (ctx) => ctx.songs },
      { id: 'playlist', label: 'Playlist Saya', icon: ListMusic, count: (ctx) => ctx.playlists },
      { id: 'favorites', label: 'Favorit', icon: Heart, count: (ctx) => ctx.favorites },
      { id: 'recent', label: 'Recently Opened', icon: History, count: (ctx) => ctx.recent }
    ]
  },
  {
    label: 'Koleksi',
    items: [
      { id: 'collections', label: 'Collections', icon: Boxes, comingSoon: true },
      { id: 'hymnals', label: 'Hymnals', icon: BookOpen, count: (ctx) => ctx.hymnals },
      { id: 'tags', label: 'Tags & Themes', icon: Tags, count: (ctx) => ctx.tags }
    ]
  },
  {
    label: 'Latihan',
    items: [
      { id: 'practice', label: 'Practice Tools', icon: Gauge, comingSoon: true },
      { id: 'chords', label: 'Chord Charts', icon: SlidersHorizontal, comingSoon: true },
      { id: 'vocal', label: 'Vocal Guide', icon: Mic2, comingSoon: true }
    ]
  },
  {
    label: 'Studio',
    items: [
      { id: 'broadcast', label: 'Broadcast Studio', icon: Radio, comingSoon: true },
      { id: 'ai', label: 'AI Features', icon: Bot, comingSoon: true },
      { id: 'analytics', label: 'Worship Analytics', icon: BarChart3, comingSoon: true },
      { id: 'utilities', label: 'Utilities', icon: Sparkles, comingSoon: true }
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
  if (!raw) return '72 BPM'
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
  onAdd
}: {
  song: Song
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  onAdd: () => void
}): React.JSX.Element {
  const verses = songVerseCount(song)
  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      className={`library-pro-song-card ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <div className="library-pro-song-card__top">
        <LibraryArtwork song={song} />
        <button
          onClick={(event) => {
            event.stopPropagation()
          }}
          className={song.is_favorite === 1 ? 'is-favorite' : ''}
          title="Favorit"
        >
          <Star size={15} fill={song.is_favorite === 1 ? 'currentColor' : 'none'} />
        </button>
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
  onEdit
}: {
  song: Song | null
  onOpen: () => void
  onAdd: () => void
  onEdit: () => void
}): React.JSX.Element {
  if (!song) {
    return (
      <aside className="library-pro-inspector">
        <div className="library-pro-panel-tabs">
          <button className="is-active">Detail Lagu</button>
          <button>Chord</button>
          <button>Notes</button>
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
    ['Buku Lagu', song.hymnal_name || song.hymnal_code || 'Lagu Sion'],
    ['Kategori', song.category || 'Penyembahan'],
    ['Penulis', song.author || 'Unknown'],
    ['Komposer', song.composer || 'Unknown'],
    ['Tema', song.theme || song.tags || 'Worship'],
    ['Key', song.key_note || 'G'],
    ['Tempo', tempoLabel(song)],
    ['Birama', song.time_signature || '4/4'],
    ['Copyright', 'SION Media']
  ]

  return (
    <aside className="library-pro-inspector">
      <div className="library-pro-panel-tabs">
        <button className="is-active">Detail Lagu</button>
        <button>Chord</button>
        <button>Notes</button>
      </div>

      <div className="library-pro-inspector__content">
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
          <button>
            <Heart size={14} />
            Favorit
          </button>
          <button onClick={onEdit}>
            <Edit3 size={14} />
            Edit Info
          </button>
          <button>
            <SlidersHorizontal size={14} />
            Chord
          </button>
          <button>
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
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
      <div className="library-pro-heading">
        <h1>Semua Lagu</h1>
        <p>{counts.songs} lagu dalam database</p>
      </div>
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

export function LibraryMode(): React.JSX.Element {
  const {
    hymnals,
    loadHymnals,
    loadSongs,
    selectedHymnalId,
    setSelectedSong,
    setLyricsFullscreen,
    setEditingSong,
    setScreen,
    showToast,
    songs
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

  useEffect(() => {
    loadHymnals()
    loadSongs(selectedHymnalId || undefined)
    loadPlaylists().catch(logger.error)
  }, [loadHymnals, loadPlaylists, loadSongs, selectedHymnalId])

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
    const tagSet = new Set(
      songs
        .flatMap((song) => [song.category, song.theme, ...(song.tags || '').split(',')])
        .map((tag) => tag?.trim())
        .filter(Boolean) as string[]
    )
    return {
      songs: songs.length,
      playlists: playlists.length,
      favorites: songs.filter((song) => song.is_favorite === 1).length,
      recent: songs.filter((song) => song.last_played || song.last_used).length,
      hymnals: hymnals.length,
      tags: tagSet.size
    }
  }, [hymnals.length, playlists.length, songs])

  const visibleSongs = useMemo(() => {
    let base = songs
    if (workspace === 'favorites') base = songs.filter((song) => song.is_favorite === 1)
    if (workspace === 'recent') base = songs.filter((song) => song.last_played || song.last_used)
    const filtered = base.filter((song) => matchesSong(song, query))
    return [...filtered].sort((a, b) => {
      if (activeTab === 'title') return (a.title || '').localeCompare(b.title || '')
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }, [activeTab, query, songs, workspace])

  useEffect(() => {
    if (!selectedSong && visibleSongs[0]) setSelectedSong(visibleSongs[0])
  }, [selectedSong, setSelectedSong, visibleSongs])

  const pageSize = 120
  const pageCount = Math.max(1, Math.ceil(visibleSongs.length / pageSize))
  const pagedSongs = useMemo(() => {
    if (activeTab !== 'number') return visibleSongs
    return visibleSongs.slice((page - 1) * pageSize, page * pageSize)
  }, [activeTab, page, visibleSongs])

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
    },
    [selectedSong, setLyricsFullscreen, setSelectedSong]
  )

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

  const handleEditSong = (): void => {
    if (!selectedSong) return
    setEditingSong(selectedSong)
    setScreen('song-editor')
  }

  const activeWorkspaceIsComingSoon = NAV_GROUPS.flatMap((group) => group.items).some(
    (item) => item.id === workspace && item.comingSoon
  )

  return (
    <div className={`library-pro-shell ${fullscreenLibrary ? 'is-fullscreen-library' : ''}`}>
      <div className="library-pro-ambient" />

      {!fullscreenLibrary && (
        <aside className="library-pro-sidebar">
          <div className="library-pro-brand">
            <div className="library-pro-brand__mark">
              <Music2 size={18} />
            </div>
            <div>
              <strong>SION Media</strong>
              <span>Library v3.0</span>
            </div>
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
                        if (item.id === 'playlist') setActiveTab('playlist')
                        if (item.id === 'all') setActiveTab('number')
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
            <div className="library-pro-operator">
              <div>A</div>
              <span>
                <strong>Operator</strong>
                <small>admin@sionmedia.org</small>
              </span>
              <ChevronDown size={14} />
            </div>
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

      <main className="library-pro-main">
        <header className="library-pro-command-bar">
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
            <kbd>
              <Command size={11} />K
            </kbd>
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
                <h1>
                  {workspace === 'favorites'
                    ? 'Favorit'
                    : workspace === 'recent'
                      ? 'Recently Opened'
                      : workspace === 'playlist'
                        ? 'Playlist Workspace'
                        : 'Semua Lagu'}
                </h1>
                <p>
                  {activeTab === 'number'
                    ? `Menampilkan ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, visibleSongs.length)} dari ${visibleSongs.length} lagu`
                    : `${visibleSongs.length} lagu tampil dari ${songs.length} lagu dalam database`}
                </p>
              </div>

              <div className="library-pro-browser__tools">
                {!fullscreenLibrary && (
                  <button className="library-pro-filter-button">
                    Semua Kategori
                    <ChevronDown size={14} />
                  </button>
                )}
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
              <div className="library-pro-playlist-workspace">
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
                      <p>Buat atau buka playlist untuk menyusun worship rundown.</p>
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
                <div className="library-pro-number-grid">
                  {pagedSongs.map((song) => (
                    <NumberTile
                      key={song.id}
                      song={song}
                      selected={selectedSong?.id === song.id}
                      onSelect={() => handleSelectSong(song)}
                    />
                  ))}
                </div>
                <div className="library-pro-pagination">
                  <span>
                    Menampilkan {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, visibleSongs.length)} dari {visibleSongs.length} lagu
                  </span>
                  <div>
                    {Array.from({ length: Math.min(pageCount, 5) }).map((_, index) => {
                      const value = index + 1
                      return (
                        <button
                          key={value}
                          className={page === value ? 'is-active' : ''}
                          onClick={() => setPage(value)}
                        >
                          {value}
                        </button>
                      )
                    })}
                    {pageCount > 5 && <small>...</small>}
                    {pageCount > 5 && (
                      <button
                        className={page === pageCount ? 'is-active' : ''}
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
              </div>
            ) : (
              <div className="library-pro-song-grid">
                {visibleSongs.map((song) => (
                  <SongMediaCard
                    key={song.id}
                    song={song}
                    selected={selectedSong?.id === song.id}
                    onSelect={() => handleSelectSong(song)}
                    onOpen={() => handleOpenSong(song)}
                    onAdd={() => handleAddToPlaylist(song)}
                  />
                ))}
              </div>
            )}
          </div>

          {!fullscreenLibrary && (
            <RightInspector
              song={selectedSong}
              onOpen={() => handleOpenSong()}
              onAdd={() => selectedSong && handleAddToPlaylist(selectedSong)}
              onEdit={handleEditSong}
            />
          )}
        </section>
      </main>

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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
