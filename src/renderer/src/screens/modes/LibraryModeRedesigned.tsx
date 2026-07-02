import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Boxes,
  CalendarDays,
  ChevronDown,
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
  Plus,
  Radio,
  Repeat2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tags,
  Trash2,
  Type,
  X,
  Book
} from 'lucide-react'
import {
  useBibleReader,
  BibleVerse,
  SelectedVerseRange,
  BibleVersion
} from '../../features/bible/hooks/useBibleReader'
import { useBibleSearch } from '../../features/bible/hooks/useBibleSearch'
import { LibraryBibleViewer } from '../../components/library/LibraryBibleViewer'
import {
  BibleBookSidebar,
  BibleHeroHeader,
  BibleChapterRail,
  BibleVerseCard,
  BibleStudyInspector
} from '../../features/bible/components/library'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore } from '../../store/useModeStore'
import { useDisplayStore } from '../../store/useDisplayStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { useModalStore } from '../../store/useModalStore'
import { LibraryLyricsViewer } from '../../components/library/LibraryLyricsViewer'
import { SongContextMenu } from '../../components/library/SongContextMenu'
import { Modal, ModalButton } from '../../components/modals/Modal'
import type { SongContextMenuAction } from '../../components/library/SongContextMenu'
import { HymnalFilterDropdown } from '../../components/library/HymnalFilterDropdown'
import { logger } from '../../utils/logger'
import {
  normalizePlaylistServiceDate,
  type PlaylistScheduleMode
} from '../../utils/playlistSchedule'
import type { AppMode } from '../../store/useModeStore'
import type { Song } from '../../types'

type LibraryTab = 'playlist' | 'number' | 'title'
type LibraryWorkspace =
  | 'all'
  | 'bible'
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
    label: 'Studi Pribadi',
    items: [
      { id: 'all', label: 'Buku Aktif', icon: BookOpen, count: (ctx) => ctx.songs },
      { id: 'bible', label: 'Alkitab', icon: BookOpen },
      { id: 'favorites', label: 'Favorit', icon: Heart, count: (ctx) => ctx.favorites },
      { id: 'recent', label: 'Recently Opened', icon: History, count: (ctx) => ctx.recent },
      { id: 'tags', label: 'Tags & Themes', icon: Tags, count: (ctx) => ctx.tags }
    ]
  },
  {
    label: 'Persiapan & Playlist',
    items: [
      { id: 'playlist', label: 'Playlist Saya', icon: ListMusic, count: (ctx) => ctx.playlists }
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
          <MonitorPlay size={13} />
          Tayangkan
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
          title="Tambah ke rundown"
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
  onSelect,
  onOpen
}: {
  song: Song
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}): React.JSX.Element {
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    const el = buttonRef.current
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
    <button
      ref={buttonRef}
      className={`library-pro-number-tile ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <span>{normalizeNumber(song.number).padStart(3, '0')}</span>
      <small>
        {song.is_favorite === 1 ? 'Favorit' : song.key_note || song.hymnal_code || 'LS'}
      </small>
    </button>
  )
}

function RightInspector({
  workspace,
  song,
  onOpen,
  onAdd,
  onToggleFavorite,
  onEdit,
  // Bible inputs
  inspectedVerse,
  selectedRange,
  selectedVersion,
  versions = [],
  onNoteSaved,
  showToast
}: {
  workspace: LibraryWorkspace
  song: Song | null
  onOpen: () => void
  onAdd: () => void
  onToggleFavorite: () => void
  onEdit: () => void
  inspectedVerse?: BibleVerse | null
  selectedRange?: SelectedVerseRange | null
  selectedVersion?: BibleVersion | null
  versions?: BibleVersion[]
  onNoteSaved?: () => void
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'detail' | 'chord' | 'notes'>('detail')
  const [localNote, setLocalNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const songId = song?.id

  // Song note loader
  useEffect(() => {
    if (workspace === 'bible' || songId === undefined) return
    let active = true
    window.api.songs
      .getNote(songId)
      .then((text) => {
        if (active) setLocalNote(text || '')
      })
      .catch((err) => {
        console.error('Failed to get song note:', err)
      })
    return () => {
      active = false
    }
  }, [songId, workspace])

  const handleSaveNote = async (): Promise<void> => {
    if (!song) return
    setIsSavingNote(true)
    try {
      await window.api.songs.updateNote(song.id, localNote)
      showToast?.('Catatan operator berhasil disimpan', 'success')
    } catch (err) {
      console.error('Failed to save song note:', err)
      showToast?.('Gagal menyimpan catatan', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }

  // ==================== BIBLE INSPECTOR LAYOUT ====================
  if (workspace === 'bible') {
    return (
      <BibleStudyInspector
        inspectedVerse={inspectedVerse ?? null}
        selectedRange={selectedRange ?? null}
        selectedVersion={selectedVersion ?? null}
        versions={versions ?? []}
        onNoteSaved={onNoteSaved}
        showToast={showToast}
      />
    )
  }

  // ==================== HYMNAL/SONG INSPECTOR LAYOUT ====================
  if (!song) {
    return (
      <aside className="library-pro-inspector flex flex-col h-full bg-bg-surface/20 backdrop-blur-lg border-l border-border-subtle overflow-y-auto">
        <div className="library-pro-panel-tabs shrink-0">
          <button className="is-active">Panduan Operator</button>
        </div>
        <div className="flex-1 p-6 space-y-6 scrollbar-thin">
          {/* Header */}
          <div className="text-center pb-4 border-b border-white/[0.04]">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-bold text-text-primary">Panduan Cepat Operator</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Selamat bertugas! SION Media dirancang untuk memudahkan pelayanan multimedia Anda.
            </p>
          </div>

          {/* Rundown Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Menyusun Rundown Ibadah
            </h4>
            <div className="space-y-2">
              <div className="flex gap-3 items-start text-xs text-text-secondary bg-white/[0.02] border border-white/[0.03] p-3 rounded-xl">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-[10px] font-bold text-brand-primary mt-0.5">
                  1
                </span>
                <p className="leading-relaxed">
                  Cari lagu lewat kolom pencarian di atas atau pilih tab <strong>Nomor</strong> /{' '}
                  <strong>Judul</strong>.
                </p>
              </div>
              <div className="flex gap-3 items-start text-xs text-text-secondary bg-white/[0.02] border border-white/[0.03] p-3 rounded-xl">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-[10px] font-bold text-brand-primary mt-0.5">
                  2
                </span>
                <p className="leading-relaxed">
                  Seret (drag) lagu yang diinginkan langsung ke tab{' '}
                  <strong>Playlist Rundown</strong> di kiri.
                </p>
              </div>
              <div className="flex gap-3 items-start text-xs text-text-secondary bg-white/[0.02] border border-white/[0.03] p-3 rounded-xl">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/20 text-[10px] font-bold text-brand-primary mt-0.5">
                  3
                </span>
                <p className="leading-relaxed">
                  Klik ganda (double-click) lagu di rundown atau daftar untuk langsung menampilkan
                  lirik penuh.
                </p>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Pintasan Keyboard Utama
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.02]">
                <span className="text-text-muted">Cari Lagu</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-default font-mono text-[10px] text-text-primary">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.02]">
                <span className="text-text-muted">Layar Penuh Perpustakaan</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-default font-mono text-[10px] text-text-primary">
                  Ctrl + Shift + F
                </kbd>
              </div>
              <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.02]">
                <span className="text-text-muted">Tampilkan Lirik Lagu</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-default font-mono text-[10px] text-text-primary">
                  Double Click
                </kbd>
              </div>
              <div className="flex justify-between items-center bg-white/[0.01] hover:bg-white/[0.03] px-3 py-2 rounded-lg border border-white/[0.02]">
                <span className="text-text-muted">Tutup Penampil Lirik</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-elevated border border-border-default font-mono text-[10px] text-text-primary">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
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
                <MonitorPlay size={15} />
                Tayangkan Lirik
              </button>
              <button onClick={onAdd}>
                <Plus size={15} />
                Tambah Rundown
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
          <div className="flex flex-col gap-4 pt-2 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Catatan Ibadah & Operator</h3>
              <span className="text-[10px] text-text-muted bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.02]">
                Disimpan per lagu
              </span>
            </div>
            <div className="relative flex-1 flex flex-col gap-3">
              <textarea
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder="Ketik catatan pelayanan di sini...&#10;Contoh:&#10;- Mulai dengan Intro Piano&#10;- Reff diulang 2x di akhir&#10;- Key transpose naik setengah nada pada verse terakhir"
                className="w-full min-h-[220px] flex-1 text-xs text-text-primary placeholder:text-text-disabled bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/30 p-4 rounded-xl resize-none outline-none transition-all scrollbar-thin"
              />
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold shadow-lg shadow-brand-primary/10 transition-all hover:shadow-brand-primary/20 disabled:opacity-50"
              >
                <FileEdit size={14} className={isSavingNote ? 'animate-pulse' : ''} />
                {isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
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
    setEditingSong,
    setScreen,
    showToast,
    songs,
    setSongs
  } = useAppStore()
  const selectedSong = useAppStore((s) => s.selectedSong)
  const isLyricsFullscreen = useDisplayStore((s) => s.isLyricsFullscreen)
  const setLyricsFullscreen = useDisplayStore((s) => s.setLyricsFullscreen)
  const isBibleFullscreen = useDisplayStore((s) => s.isBibleFullscreen)
  const setBibleFullscreen = useDisplayStore((s) => s.setBibleFullscreen)
  const { setMode } = useModeStore()
  const {
    playlists,
    activePlaylist,
    playlistItems,
    loadPlaylists,
    addSongToPlaylist,
    setActivePlaylist,
    createPlaylist,
    clearPlaylist,
    loadPlaylistItems
  } = usePlaylistStore()
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

  // Alkitab hooks & states
  const bibleReader = useBibleReader()
  const bibleSearch = useBibleSearch()
  const selectedBibleBook = bibleReader.selectedBook
  const selectedBibleVersionCode = bibleReader.selectedVersion?.versionCode
  const setBibleSearchQuery = bibleSearch.setQuery
  const searchBible = bibleSearch.search
  const [inspectedVerse, setInspectedVerse] = useState<BibleVerse | null>(null)
  const [chapterNotes, setChapterNotes] = useState<
    Array<{ verse: number; note_text: string; highlight_color: string }>
  >([])
  const [bookSearchQuery, setBookSearchQuery] = useState('')

  // Sync workspace state to global store for titlebar cleaning
  const setActiveLibraryWorkspace = useAppStore((s) => s.setActiveLibraryWorkspace)
  useEffect(() => {
    setActiveLibraryWorkspace?.(workspace)
    return () => setActiveLibraryWorkspace?.('all')
  }, [workspace, setActiveLibraryWorkspace])

  const loadChapterNotes = useCallback(async () => {
    if (workspace === 'bible' && selectedBibleBook) {
      try {
        const notes = await window.api.biblePack.getNotesForChapter(
          selectedBibleBook.code,
          bibleReader.selectedChapter
        )
        setChapterNotes(
          notes as Array<{ verse: number; note_text: string; highlight_color: string }>
        )
      } catch (err) {
        console.error('Failed to load chapter notes:', err)
      }
    }
  }, [workspace, selectedBibleBook, bibleReader.selectedChapter])

  useEffect(() => {
    // Notes are external persisted state and must refresh when the reference changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChapterNotes()
  }, [loadChapterNotes])

  useEffect(() => {
    if (workspace === 'bible' && bibleReader.verses.length > 0) {
      if (
        !inspectedVerse ||
        inspectedVerse.book_code !== bibleReader.selectedBook?.code ||
        inspectedVerse.chapter !== bibleReader.selectedChapter
      ) {
        // Keep the inspector synchronized with navigation/search selection.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setInspectedVerse(bibleReader.selectedRange?.verses[0] ?? bibleReader.verses[0])
      }
    }
  }, [
    workspace,
    bibleReader.verses,
    bibleReader.selectedBook,
    bibleReader.selectedChapter,
    bibleReader.selectedRange,
    inspectedVerse
  ])

  useEffect(() => {
    if (workspace === 'bible') {
      setBibleSearchQuery(query)
      if (query.trim() && selectedBibleVersionCode) {
        const timer = setTimeout(() => {
          void searchBible(selectedBibleVersionCode, query)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
    return undefined
  }, [query, workspace, selectedBibleVersionCode, searchBible, setBibleSearchQuery])

  // Playlist Management state
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistSchedule, setNewPlaylistSchedule] = useState<PlaylistScheduleMode>('anytime')
  const [newPlaylistDate, setNewPlaylistDate] = useState(new Date().toISOString().split('T')[0])
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const [pendingSongToAdd, setPendingSongToAdd] = useState<Song | null>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

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
    if (workspace === 'bible') return 'Alkitab Interaktif'
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
    async (song: Song): Promise<void> => {
      if (!activePlaylist) {
        setPendingSongToAdd(song)
        setCreatePlaylistOpen(true)
        showToast('Buat playlist terlebih dahulu untuk menambahkan lagu', 'info')
        return
      }
      try {
        await addSongToPlaylist(song)
        showToast(`"${song.title}" ditambahkan ke playlist`, 'success')
      } catch {
        // The playlist store owns failure logging and user feedback.
      }
    },
    [activePlaylist, addSongToPlaylist, showToast]
  )

  const handleCreatePlaylistConfirm = async (): Promise<void> => {
    if (!newPlaylistName.trim()) return
    try {
      const serviceDate = normalizePlaylistServiceDate(newPlaylistSchedule, newPlaylistDate)
      if (newPlaylistSchedule === 'dated' && !serviceDate) return
      await createPlaylist(newPlaylistName.trim(), serviceDate)
      showToast(`Playlist "${newPlaylistName}" berhasil dibuat`, 'success')
      setCreatePlaylistOpen(false)
      setNewPlaylistName('')
      setNewPlaylistSchedule('anytime')

      const store = usePlaylistStore.getState()
      if (store.activePlaylist) {
        await loadPlaylistItems(store.activePlaylist.id)
        if (pendingSongToAdd) {
          await addSongToPlaylist(pendingSongToAdd)
          showToast(`"${pendingSongToAdd.title}" ditambahkan ke playlist`, 'success')
          setPendingSongToAdd(null)
        }
      }
    } catch (err) {
      logger.error('Failed to create playlist:', err)
      showToast('Gagal membuat playlist baru', 'error')
    }
  }

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

  const handleAddSingleVerseToPlaylist = useCallback(
    async (verse: BibleVerse) => {
      if (!bibleReader.selectedBook || !bibleReader.selectedVersion) return
      if (!activePlaylist) {
        showToast('Pilih playlist rundown terlebih dahulu', 'error')
        return
      }
      try {
        const refStr = `${bibleReader.selectedBook.name} ${bibleReader.selectedChapter}:${verse.verse}`
        const singleVerseData = [
          {
            book_code: verse.book_code,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text
          }
        ]

        await window.api.playlists.addBible(activePlaylist.id, {
          bible_version_code: bibleReader.selectedVersion.versionCode,
          bible_version_short_name: bibleReader.selectedVersion.shortName,
          bible_book_code: bibleReader.selectedBook.code,
          bible_book_name: bibleReader.selectedBook.name,
          bible_chapter: bibleReader.selectedChapter,
          bible_verse_start: verse.verse,
          bible_verse_end: verse.verse,
          bible_reference: `${refStr} · ${bibleReader.selectedVersion.shortName}`,
          bible_text_json: JSON.stringify(singleVerseData),
          bible_copyright: bibleReader.selectedVersion.copyright || '© LAI 1974'
        })
        await loadPlaylistItems(activePlaylist.id)
        showToast(`"${refStr}" ditambahkan ke playlist`, 'success')
      } catch (err) {
        console.error(err)
        showToast('Gagal menambahkan ayat ke playlist', 'error')
      }
    },
    [
      bibleReader.selectedBook,
      bibleReader.selectedChapter,
      bibleReader.selectedVersion,
      activePlaylist,
      showToast,
      loadPlaylistItems
    ]
  )

  // Phase 6: Drag-to-playlist drop handler
  const handlePlaylistDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDraggingOver(false)
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

  const handlePlaylistDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/sion-song-id')) {
      e.preventDefault()
      setIsDraggingOver(true)
    }
  }, [])

  const handlePlaylistDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingOver(false)
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
              {workspace === 'bible' ? <BookOpen size={18} /> : <Music2 size={18} />}
            </div>
            <div>
              <strong>{workspace === 'bible' ? 'SION Alkitab' : 'SION Media'}</strong>
              <span>
                {workspace === 'bible'
                  ? 'Alkitab Interaktif'
                  : appVersion
                    ? `Library v${appVersion}`
                    : 'Library'}
              </span>
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
            {workspace === 'bible' ? (
              <section>
                <h3>Studi Alkitab</h3>
                <button className="is-active" onClick={() => setSidebarOpen(false)}>
                  <BookOpen size={16} />
                  <span>Alkitab Interaktif</span>
                </button>
                <button
                  onClick={() => {
                    setWorkspace('all')
                    setPage(1)
                    setActiveTab('number')
                    setSidebarOpen(false)
                  }}
                >
                  <Music2 size={16} />
                  <span>Kembali ke Perpustakaan Lagu</span>
                </button>
              </section>
            ) : (
              NAV_GROUPS.map((group) => (
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
              ))
            )}
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
              placeholder={
                workspace === 'bible'
                  ? 'Cari ayat, kitab, pasal, atau kata...'
                  : 'Cari lagu, penulis, tema, nomor...'
              }
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

        {!fullscreenLibrary && workspace !== 'bible' && <LibraryOverview counts={counts} />}

        <section
          className={`library-pro-content ${workspace === 'bible' ? 'is-bible-workspace' : ''}`}
        >
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
                  {workspace === 'bible'
                    ? bibleReader.selectedVersion
                      ? `${bibleReader.selectedVersion.name} (${bibleReader.selectedVersion.shortName})`
                      : 'Memuat Alkitab...'
                    : activeTab === 'playlist'
                      ? `${playlistItems.length} item dalam rundown ibadah`
                      : resultSummary}
                </p>
              </div>

              <div className="library-pro-browser__tools">
                {workspace !== 'bible' && (
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
                )}
                <button
                  className="library-pro-fullscreen-button"
                  onClick={() => setFullscreenLibrary((value) => !value)}
                  title="Fullscreen library (Ctrl+Shift+F)"
                >
                  {fullscreenLibrary ? <PanelRightClose size={16} /> : <Expand size={16} />}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col relative">
              {query === '' && workspace !== 'bible' && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01] overflow-x-auto scrollbar-none select-none shrink-0">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-brand-primary" />
                    Cari Cepat:
                  </span>
                  {['Pujian', 'Penyembahan', 'Natal', 'Paskah', 'Roh Kudus', 'Kasih', 'Syukur'].map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setQuery(category)
                          setPage(1)
                          if (activeTab === 'playlist') {
                            setActiveTab('title')
                          }
                        }}
                        className="px-2.5 py-1 rounded-full text-xs bg-bg-surface/40 border border-border-subtle text-text-secondary hover:bg-bg-surface hover:text-brand-primary hover:border-brand-primary/30 transition-all duration-200 whitespace-nowrap"
                      >
                        {category}
                      </button>
                    )
                  )}
                </div>
              )}

              {activeWorkspaceIsComingSoon ? (
                <ComingSoonWorkspace
                  workspace={workspace}
                  songs={songs}
                  onBack={() => {
                    setWorkspace('all')
                    setActiveTab('number')
                  }}
                />
              ) : workspace === 'bible' ? (
                <div className="bible-workspace">
                  {/* Left: Book Sidebar */}
                  {query === '' && (
                    <BibleBookSidebar
                      otBooks={bibleReader.otBooks}
                      ntBooks={bibleReader.ntBooks}
                      selectedBookCode={bibleReader.selectedBook?.code ?? null}
                      onSelectBook={bibleReader.selectBook}
                      bookSearchQuery={bookSearchQuery}
                      onBookSearchChange={setBookSearchQuery}
                    />
                  )}

                  {/* Center: Hero + Chapter Rail + Verse List */}
                  <div className="bible-center">
                    {query ? (
                      /* Search Results */
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-4 border-b border-white/[0.04] bg-bg-surface/20 flex justify-between items-center shrink-0">
                          <span className="text-xs font-bold text-text-secondary">
                            Hasil Pencarian Alkitab untuk &ldquo;{query}&rdquo;
                          </span>
                          <span className="text-[10px] text-text-muted bg-white/[0.06] px-2 py-0.5 rounded-full">
                            {bibleSearch.results.length} ayat ditemukan
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                          {bibleSearch.isSearching ? (
                            <div className="flex justify-center items-center h-32 text-xs text-text-muted">
                              Mencari ayat...
                            </div>
                          ) : bibleSearch.results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-xs text-text-muted">
                              Tidak ada hasil pencarian.
                            </div>
                          ) : (
                            bibleSearch.results.map((res) => (
                              <button
                                key={`${res.book_code}-${res.chapter}-${res.verse}`}
                                onClick={async () => {
                                  bibleReader.openReference(
                                    res.book_code,
                                    res.chapter,
                                    res.verse,
                                    res.verse
                                  )
                                  setQuery('')
                                }}
                                className="w-full text-left p-4 rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] hover:border-brand-primary/30 hover:scale-[1.002] transition-all duration-200 group"
                              >
                                <div className="flex justify-between items-center mb-1.5">
                                  <strong className="text-xs text-brand-primary font-bold">
                                    {res.book_name} {res.chapter}:{res.verse}
                                  </strong>
                                  <span className="text-[10px] text-text-muted group-hover:text-brand-primary transition-colors flex items-center gap-1 font-semibold">
                                    Lihat Pasal &rarr;
                                  </span>
                                </div>
                                <p className="text-xs text-text-secondary leading-relaxed font-serif">
                                  {res.text}
                                </p>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Normal Browse Mode */
                      <>
                        <BibleHeroHeader
                          selectedBook={bibleReader.selectedBook}
                          selectedChapter={bibleReader.selectedChapter}
                          selectedVersion={bibleReader.selectedVersion}
                          versions={bibleReader.versions}
                          onSelectVersion={bibleReader.selectVersion}
                          onPrevChapter={bibleReader.previousChapter}
                          onNextChapter={bibleReader.nextChapter}
                          onFullscreen={() => setBibleFullscreen(true)}
                        />

                        {bibleReader.selectedBook && (
                          <BibleChapterRail
                            totalChapters={bibleReader.selectedBook.chapters}
                            selectedChapter={bibleReader.selectedChapter}
                            onSelectChapter={bibleReader.selectChapter}
                          />
                        )}

                        <div className="bible-verse-list">
                          {bibleReader.error ? (
                            <div className="bible-verse-list__empty" role="alert">
                              <div className="bible-verse-list__empty-icon">
                                <BookOpen size={24} />
                              </div>
                              <strong>Alkitab belum dapat dimuat</strong>
                              <span>{bibleReader.error}</span>
                              <button
                                className="bible-hero__fullscreen-btn"
                                onClick={() => setMode('MANAGEMENT' as AppMode)}
                              >
                                Buka Pengaturan Paket
                              </button>
                            </div>
                          ) : bibleReader.loadingVerses ? (
                            <div className="bible-verse-list__empty">
                              <div className="bible-verse-list__empty-icon">
                                <Book size={24} />
                              </div>
                              <span>Memuat teks Alkitab...</span>
                            </div>
                          ) : bibleReader.verses.length === 0 ? (
                            <div className="bible-verse-list__empty">
                              <div className="bible-verse-list__empty-icon">
                                <BookOpen size={24} />
                              </div>
                              <span>Pilih Kitab dan Pasal untuk mulai membaca.</span>
                            </div>
                          ) : (
                            bibleReader.verses.map((verse) => {
                              const noteInfo = chapterNotes.find((cn) => cn.verse === verse.verse)
                              const color = noteInfo?.highlight_color || ''
                              const hasNote = !!noteInfo?.note_text
                              const isVerseSelected =
                                bibleReader.selectedRange?.verses.some(
                                  (v) => v.verse === verse.verse
                                ) || false

                              return (
                                <BibleVerseCard
                                  key={verse.verse}
                                  verse={verse}
                                  isSelected={isVerseSelected}
                                  isInspected={inspectedVerse?.verse === verse.verse}
                                  highlightColor={color}
                                  hasNote={hasNote}
                                  onClickVerse={() => bibleReader.clickVerse(verse)}
                                  onInspect={() => setInspectedVerse(verse)}
                                  onPreview={() => {
                                    if (!bibleReader.selectedBook || !bibleReader.selectedVersion)
                                      return
                                    const refLabel = `${bibleReader.selectedBook.name} ${bibleReader.selectedChapter}:${verse.verse}`
                                    const displayRef = `${refLabel} · ${bibleReader.selectedVersion.shortName}`
                                    const copyright =
                                      bibleReader.selectedVersion.copyright || '© LAI 1974'
                                    const { setSlides, goToSlide } = useProjectionStore.getState()
                                    setSlides([
                                      {
                                        contentType: 'bible',
                                        songId: 0,
                                        slideIndex: 0,
                                        text: `[${verse.verse}] ${verse.text.trim()}`,
                                        sectionLabel: refLabel,
                                        bibleReference: displayRef,
                                        bibleVersionCode: bibleReader.selectedVersion.versionCode,
                                        bibleCopyright: copyright
                                      }
                                    ])
                                    goToSlide(0)
                                    showToast(`${refLabel} dikirim ke Preview`, 'success')
                                  }}
                                  onLive={() => {
                                    if (!bibleReader.selectedBook || !bibleReader.selectedVersion)
                                      return
                                    const refLabel = `${bibleReader.selectedBook.name} ${bibleReader.selectedChapter}:${verse.verse}`
                                    const displayRef = `${refLabel} · ${bibleReader.selectedVersion.shortName}`
                                    const copyright =
                                      bibleReader.selectedVersion.copyright || '© LAI 1974'
                                    const { setSlides, takeCue } = useProjectionStore.getState()
                                    setSlides([
                                      {
                                        contentType: 'bible',
                                        songId: 0,
                                        slideIndex: 0,
                                        text: `[${verse.verse}] ${verse.text.trim()}`,
                                        sectionLabel: refLabel,
                                        bibleReference: displayRef,
                                        bibleVersionCode: bibleReader.selectedVersion.versionCode,
                                        bibleCopyright: copyright
                                      }
                                    ])
                                    takeCue()
                                    showToast(`${refLabel} Tayang Live`, 'success')
                                  }}
                                  onAddPlaylist={() => handleAddSingleVerseToPlaylist(verse)}
                                />
                              )
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : activeTab === 'playlist' ? (
                <div
                  ref={playlistDropRef}
                  className={`library-pro-playlist-workspace flex-1 flex flex-col min-h-0 relative transition-all duration-200 ${isDraggingOver ? 'border-2 border-dashed border-brand-primary/50 bg-brand-primary/5 scale-[0.995]' : ''}`}
                  onDrop={handlePlaylistDrop}
                  onDragOver={handlePlaylistDragOver}
                  onDragEnter={handlePlaylistDragEnter}
                  onDragLeave={handlePlaylistDragLeave}
                >
                  {isDraggingOver && (
                    <div className="absolute inset-0 bg-brand-primary/5 backdrop-blur-[2px] border-2 border-dashed border-brand-primary/40 rounded-2xl z-20 flex flex-col items-center justify-center gap-3 p-6 pointer-events-none">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary animate-pulse">
                        <Plus size={24} />
                      </div>
                      <span className="text-sm font-bold text-brand-primary text-center">
                        Lepaskan lagu di sini untuk menambahkan ke rundown
                      </span>
                    </div>
                  )}
                  <div className="library-pro-playlist-hero flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-bg-surface/30 border border-border-subtle mb-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                        <ListMusic size={22} />
                      </div>
                      <div className="relative text-left">
                        {playlists.length > 1 ? (
                          <div className="relative">
                            <button
                              onClick={() => setPlaylistMenuOpen((prev) => !prev)}
                              className="flex items-center gap-2 text-left hover:text-brand-primary transition-colors focus-visible:outline-none"
                            >
                              <h2 className="text-sm md:text-base font-bold text-text-primary leading-tight">
                                {activePlaylist?.name || 'Pilih Playlist'}
                              </h2>
                              <ChevronDown
                                size={14}
                                className={`text-text-secondary transition-transform ${playlistMenuOpen ? 'rotate-180' : ''}`}
                              />
                            </button>

                            {playlistMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setPlaylistMenuOpen(false)}
                                />
                                <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-border-default bg-bg-elevated p-1 shadow-xl backdrop-blur-md">
                                  <div className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                                    Pilih Playlist Rundown
                                  </div>
                                  <div className="max-h-60 overflow-y-auto scrollbar-thin">
                                    {playlists.map((pl) => (
                                      <button
                                        key={pl.id}
                                        onClick={() => {
                                          setActivePlaylist(pl)
                                          setPlaylistMenuOpen(false)
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                          activePlaylist?.id === pl.id
                                            ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                                            : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                                        }`}
                                      >
                                        <span>{pl.name}</span>
                                        {activePlaylist?.id === pl.id && (
                                          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <h2 className="text-sm md:text-base font-bold text-text-primary leading-tight">
                            {activePlaylist?.name || 'Rundown Ibadah'}
                          </h2>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">
                          {playlistItems.length} item dalam rundown ibadah
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setCreatePlaylistOpen(true)}
                        className="flex items-center gap-1 rounded-lg border border-border-default bg-bg-surface/50 px-2.5 h-8 text-[11px] font-semibold text-text-primary hover:bg-bg-surface hover:border-border-default transition-all duration-200"
                        title="Buat Playlist Baru"
                      >
                        <Plus size={12} />
                        Playlist Baru
                      </button>
                      {playlistItems.length > 0 && (
                        <button
                          onClick={async () => {
                            if (activePlaylist) {
                              if (confirm('Bersihkan semua lagu dari rundown ini?')) {
                                try {
                                  await clearPlaylist()
                                  showToast('Rundown berhasil dikosongkan', 'success')
                                } catch (err) {
                                  logger.error(err)
                                  showToast('Gagal mengosongkan rundown', 'error')
                                }
                              }
                            }
                          }}
                          className="flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30 px-2.5 h-8 text-[11px] font-semibold text-red-400 transition-all duration-200"
                          title="Kosongkan Rundown"
                        >
                          <Trash2 size={12} className="mr-1" />
                          Kosongkan
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="library-pro-playlist-list flex-1 overflow-y-auto scrollbar-thin">
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
                <div className="library-pro-number-workspace flex-1 flex flex-col min-h-0 overflow-hidden">
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
                    <div className="library-pro-empty-state flex-1">
                      <Search size={38} />
                      <strong>Tidak ada lagu ditemukan</strong>
                      <p>Ubah kata kunci, buku lagu, atau tema untuk melihat hasil lain.</p>
                      {query && (
                        <button
                          onClick={() => {
                            setQuery('')
                            setPage(1)
                          }}
                          className="mt-4 px-4 py-2 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated hover:text-brand-primary transition-all text-xs font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          Bersihkan Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="library-pro-number-grid flex-1 overflow-y-auto scrollbar-thin">
                      {pagedSongs.map((song) => (
                        <NumberTile
                          key={song.id}
                          song={song}
                          selected={inspectedSong?.id === song.id}
                          onSelect={() => handleSelectSong(song)}
                          onOpen={() => handleOpenSong(song)}
                        />
                      ))}
                    </div>
                  )}
                  {visibleSongs.length > 0 && (
                    <div className="library-pro-pagination shrink-0">
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
                <div className="library-pro-title-workspace flex-1 flex flex-col min-h-0 overflow-hidden">
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
                    <div className="library-pro-empty-state flex-1">
                      <Search size={38} />
                      <strong>Tidak ada lagu ditemukan</strong>
                      <p>Ubah kata kunci, buku lagu, atau tema untuk melihat hasil lain.</p>
                      {query && (
                        <button
                          onClick={() => {
                            setQuery('')
                            setPage(1)
                          }}
                          className="mt-4 px-4 py-2 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated hover:text-brand-primary transition-all text-xs font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                          Bersihkan Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0">
                      <VirtualizedSongGrid
                        songs={visibleSongs}
                        selectedSongId={inspectedSong?.id ?? null}
                        onSelectSong={handleSelectSong}
                        onOpenSong={handleOpenSong}
                        onAddToPlaylist={handleAddToPlaylist}
                        onToggleFavorite={handleToggleFavorite}
                        onContextMenu={handleSongContextMenu}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {!fullscreenLibrary && (
            <RightInspector
              workspace={workspace}
              song={inspectedSong}
              onOpen={() => handleOpenSong()}
              onAdd={() => inspectedSong && handleAddToPlaylist(inspectedSong)}
              onToggleFavorite={() => inspectedSong && void handleToggleFavorite(inspectedSong)}
              onEdit={handleEditSong}
              inspectedVerse={inspectedVerse}
              selectedRange={bibleReader.selectedRange}
              selectedVersion={bibleReader.selectedVersion}
              versions={bibleReader.versions}
              onNoteSaved={loadChapterNotes}
              showToast={showToast}
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

      <AnimatePresence>
        {isBibleFullscreen && bibleReader.selectedBook && bibleReader.selectedVersion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 22 }}
            transition={{ duration: 0.34 }}
            className="absolute inset-0 z-[90]"
          >
            <LibraryBibleViewer
              selectedBook={bibleReader.selectedBook}
              selectedChapter={bibleReader.selectedChapter}
              versionCode={bibleReader.selectedVersion.versionCode}
              verses={bibleReader.verses}
              onClose={() => setBibleFullscreen(false)}
              onPrevChapter={() => bibleReader.previousChapter()}
              onNextChapter={() => bibleReader.nextChapter()}
              books={bibleReader.books}
              chapterNotes={chapterNotes}
              onNoteSaved={loadChapterNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {createPlaylistOpen && (
        <Modal
          id="library-mode-create-playlist"
          title="Buat Playlist Baru"
          subtitle={
            pendingSongToAdd
              ? `Playlist baru untuk “${pendingSongToAdd.title}”.`
              : 'Playlist akan langsung aktif setelah dibuat.'
          }
          size="md"
          onClose={() => {
            setCreatePlaylistOpen(false)
            setPendingSongToAdd(null)
          }}
          footer={
            <>
              <ModalButton
                onClick={() => {
                  setCreatePlaylistOpen(false)
                  setPendingSongToAdd(null)
                }}
              >
                Batal
              </ModalButton>
              <ModalButton
                variant="primary"
                onClick={() => void handleCreatePlaylistConfirm()}
                disabled={
                  !newPlaylistName.trim() || (newPlaylistSchedule === 'dated' && !newPlaylistDate)
                }
              >
                Buat & Aktifkan
              </ModalButton>
            </>
          }
        >
          <div className="playlist-modal-form">
            <div className="sp-field">
              <label htmlFor="playlist-name-input" className="sp-field__label">
                Nama Playlist
              </label>
              <input
                id="playlist-name-input"
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Contoh: Ibadah Minggu Pagi"
                className="sp-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreatePlaylistConfirm()
                }}
              />
            </div>
            <fieldset className="sp-field">
              <legend className="sp-field__label">Penggunaan</legend>
              <div className="playlist-schedule-options">
                <button
                  type="button"
                  className={`playlist-schedule-option ${newPlaylistSchedule === 'anytime' ? 'is-active' : ''}`}
                  onClick={() => setNewPlaylistSchedule('anytime')}
                  aria-pressed={newPlaylistSchedule === 'anytime'}
                >
                  <Repeat2 size={17} />
                  <span>
                    <strong>Kapan saja</strong>
                    <small>Dapat digunakan berulang kali</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`playlist-schedule-option ${newPlaylistSchedule === 'dated' ? 'is-active' : ''}`}
                  onClick={() => setNewPlaylistSchedule('dated')}
                  aria-pressed={newPlaylistSchedule === 'dated'}
                >
                  <CalendarDays size={17} />
                  <span>
                    <strong>Bertanggal</strong>
                    <small>Untuk ibadah tertentu</small>
                  </span>
                </button>
              </div>
            </fieldset>
            {newPlaylistSchedule === 'dated' && (
              <div className="sp-field">
                <label htmlFor="playlist-date-input" className="sp-field__label">
                  Tanggal Ibadah
                </label>
                <input
                  id="playlist-date-input"
                  type="date"
                  value={newPlaylistDate}
                  onChange={(e) => setNewPlaylistDate(e.target.value)}
                  className="sp-input"
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
