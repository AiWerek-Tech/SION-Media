import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  FolderOpen,
  ListMusic,
  Music,
  Plus,
  SeparatorHorizontal,
  Trash2,
  Upload,
  Repeat2,
  Search,
  X
} from 'lucide-react'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModalStore } from '@renderer/store/useModalStore'
import { generateSlidesForPlaylistItem } from '@renderer/engine/slideEngine'
import { logger } from '@renderer/utils/logger'
import type { PlaylistItem } from '@renderer/types'
import {
  formatPlaylistSchedule,
  normalizePlaylistServiceDate,
  type PlaylistScheduleMode
} from '@renderer/utils/playlistSchedule'
import {
  buildRundownTimingSummary,
  formatRundownDuration
} from '@renderer/utils/rundownDuration'
import PlaylistItemCard from '@renderer/components/PlaylistItemCard'
import { Modal, ModalButton } from '@renderer/components/modals/Modal'
import { PlaylistSelector } from '@renderer/components/playlist/PlaylistSelector'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

interface PlaylistPanelProps {
  projectedSongId?: number | null
  onItemClick?: (item: PlaylistItem, index: number) => void
}

const SECTION_PRESETS = [
  'PEMBUKAAN',
  'PUJIAN',
  'PENYEMBAHAN',
  'KHOTBAH',
  'PERSEMBAHAN',
  'PENUTUPAN'
] as const

// ─── Section Menu (click-outside aware) ──────────────────────────────────────
function SectionMenu({
  onSelect,
  onClose
}: {
  onSelect: (label: string) => void
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [customValue, setCustomValue] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // FIX: click-outside handler
  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl ring-1 ring-white/10 bg-bg-surface/98 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm py-1"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
        Pemisah Bagian
      </div>
      {SECTION_PRESETS.map((label) => (
        <button
          key={label}
          onClick={() => {
            onSelect(label)
            onClose()
          }}
          className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-text-secondary hover:bg-white/[0.05] hover:text-text-primary transition-colors"
        >
          {label}
        </button>
      ))}
      <div className="h-px bg-white/5 mx-2 my-1" />
      {showCustomInput ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (customValue.trim()) {
              onSelect(customValue.trim().toUpperCase())
              onClose()
            }
          }}
          className="px-2 pb-2 flex gap-1"
        >
          <input
            autoFocus
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Nama bagian..."
            className="flex-1 rounded-lg border border-white/10 bg-bg-base px-2 py-1 text-[11px] outline-none focus:border-brand-primary transition-colors"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-2 py-1 text-[11px] font-semibold text-white"
          >
            OK
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowCustomInput(true)}
          className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-text-muted hover:bg-white/[0.05] hover:text-text-primary transition-colors italic"
        >
          Custom...
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PlaylistPanel({
  projectedSongId,
  onItemClick
}: PlaylistPanelProps): React.JSX.Element {
  const {
    activePlaylist,
    playlistItems,
    playlists,
    setActivePlaylist,
    createPlaylist,
    loadPlaylistItems,
    removeItem,
    reorderItems
  } = usePlaylistStore()
  const { setSelectedSong, songs } = useAppStore()
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showSectionMenu, setShowSectionMenu] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<PlaylistItem | null>(null)
  const [replaceQuery, setReplaceQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [newScheduleMode, setNewScheduleMode] = useState<PlaylistScheduleMode>('anytime')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const activeItemIndex = usePlaylistStore((s) => s.activeItemIndex)
  const setActiveItemIndex = usePlaylistStore((s) => s.setActiveItemIndex)
  const replaceSongItem = usePlaylistStore((s) => s.replaceSongItem)
  const replacementSongs = React.useMemo(() => {
    const query = replaceQuery.trim().toLocaleLowerCase('id-ID')
    if (!query) return songs.slice(0, 80)
    return songs
      .filter((song) =>
        `${song.number} ${song.title} ${song.hymnal_code || ''}`
          .toLocaleLowerCase('id-ID')
          .includes(query)
      )
      .slice(0, 100)
  }, [replaceQuery, songs])

  // Total slide count
  const totalSlideCount = React.useMemo(
    () => playlistItems.reduce((sum, item) => sum + generateSlidesForPlaylistItem(item).length, 0),
    [playlistItems]
  )

  const rundownTiming = React.useMemo(
    () =>
      buildRundownTimingSummary({
        items: playlistItems,
        currentPlaylistItemId: playlistItems[activeItemIndex]?.id
      }),
    [playlistItems, activeItemIndex]
  )

  // FIX: Apply section label to the currently active item, or last item
  const handleAddSectionDivider = useCallback(
    (label: string): void => {
      const updateItemLabel = usePlaylistStore.getState().updateItemLabel
      if (playlistItems.length === 0) return
      // Apply to active item if valid, otherwise last item
      const targetIndex =
        activeItemIndex >= 0 && activeItemIndex < playlistItems.length
          ? activeItemIndex
          : playlistItems.length - 1
      updateItemLabel(playlistItems[targetIndex].id, label)
    },
    [playlistItems, activeItemIndex]
  )

  const handleCreatePlaylist = async (): Promise<void> => {
    if (!newName.trim()) return
    const serviceDate = normalizePlaylistServiceDate(newScheduleMode, newDate)
    if (newScheduleMode === 'dated' && !serviceDate) return
    await createPlaylist(newName, serviceDate)
    setSelectedSong(null)
    // FIX: reset both fields after creation
    setNewName('')
    setNewScheduleMode('anytime')
    setNewDate(new Date().toISOString().split('T')[0])
    setShowNewDialog(false)
    // FIX: read activePlaylist from store AFTER createPlaylist resolves,
    // since the store update is synchronous within the same microtask.
    const { activePlaylist: newPlaylist } = usePlaylistStore.getState()
    if (newPlaylist) await loadPlaylistItems(newPlaylist.id)
  }

  const handleLoadPlaylist = async (playlist: (typeof playlists)[0]): Promise<void> => {
    setActivePlaylist(playlist)
    await loadPlaylistItems(playlist.id)
    setSelectedSong(null)
    setShowLoadDialog(false)
  }

  const handleItemClick = (item: PlaylistItem, index: number): void => {
    if (onItemClick) {
      onItemClick(item, index)
      return
    }
    setActiveItemIndex(index)
    const song = songs.find((s) => s.id === item.song_id)
    if (song) setSelectedSong(song)
  }

  const handleRemoveItem = async (e: React.MouseEvent, itemId: number): Promise<void> => {
    e.stopPropagation()
    const removedItem = playlistItems.find((item) => item.id === itemId)
    const wasShowingRemovedSong =
      removedItem !== undefined && useAppStore.getState().selectedSong?.id === removedItem.song_id
    await removeItem(itemId)
    if (wasShowingRemovedSong) {
      const { playlistItems: nextItems, activeItemIndex: nextActiveIndex } =
        usePlaylistStore.getState()
      const nextItem = nextItems[nextActiveIndex]
      const nextSong = nextItem ? songs.find((song) => song.id === nextItem.song_id) : undefined
      setSelectedSong(nextSong ?? null)
    }
  }

  // FIX: Use Electron native save dialog instead of data: URI
  const handleExportPlaylist = async (): Promise<void> => {
    const showToast = useAppStore.getState().showToast
    if (!activePlaylist || playlistItems.length === 0) {
      showToast('Rundown kosong, tidak ada yang diekspor', 'error')
      return
    }

    const exportData = {
      isSionPlaylist: true,
      playlist: {
        name: activePlaylist.name,
        service_date: activePlaylist.service_date
      },
      songs: playlistItems
        .filter((item) => item.item_type === 'song')
        .map((item) => {
          const fullSong = useAppStore.getState().songs.find((s) => s.id === item.song_id)
          return {
            number: item.number,
            title: item.title,
            hymnal_code: item.hymnal_code || fullSong?.hymnal_code || 'LS',
            lyrics_raw: item.lyrics_raw,
            category: item.category,
            language: fullSong?.language || 'Indonesia',
            author: fullSong?.author || '',
            composer: fullSong?.composer || '',
            key_note: fullSong?.key_note || '',
            tempo: fullSong?.tempo || '',
            tags: fullSong?.tags || ''
          }
        }),
      items: playlistItems.map((item) => {
        if (item.item_type === 'info') {
          return {
            item_type: 'info',
            title: item.title,
            notes: item.notes || ''
          }
        }
        if (item.item_type === 'bible') {
          return {
            item_type: 'bible',
            title: item.title,
            section_label: item.section_label,
            notes: item.notes || '',
            bible_version_code: item.bible_version_code,
            bible_version_short_name: item.bible_version_short_name,
            bible_book_code: item.bible_book_code,
            bible_book_name: item.bible_book_name,
            bible_chapter: item.bible_chapter,
            bible_verse_start: item.bible_verse_start,
            bible_verse_end: item.bible_verse_end,
            bible_reference: item.bible_reference,
            bible_text_json: item.bible_text_json,
            bible_copyright: item.bible_copyright
          }
        } else {
          const fullSong = useAppStore.getState().songs.find((s) => s.id === item.song_id)
          return {
            item_type: 'song',
            title: item.title,
            section_label: item.section_label,
            notes: item.notes || '',
            number: item.number,
            hymnal_code: item.hymnal_code || fullSong?.hymnal_code || 'LS',
            lyrics_raw: item.lyrics_raw,
            category: item.category,
            language: fullSong?.language || 'Indonesia',
            author: fullSong?.author || '',
            composer: fullSong?.composer || '',
            key_note: fullSong?.key_note || '',
            tempo: fullSong?.tempo || '',
            tags: fullSong?.tags || ''
          }
        }
      })
    }

    try {
      const defaultName = `sion-playlist-${activePlaylist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
      const result = await window.api.file.showSaveDialog({
        defaultPath: defaultName,
        filters: [{ name: 'SION Playlist', extensions: ['json'] }]
      })
      if (result && !(result as { canceled?: boolean }).canceled) {
        const filePath = (result as { filePath?: string }).filePath
        if (filePath) {
          await window.api.file.writeJson(filePath, exportData)
          showToast('Berhasil mengekspor rundown', 'success')
        }
      }
    } catch (err) {
      logger.error('Export failed:', err)
      showToast('Gagal mengekspor rundown', 'error')
    }
  }

  const handleImportPlaylist = async (): Promise<void> => {
    const showToast = useAppStore.getState().showToast
    try {
      const result = await window.api.file.showOpenDialog({
        filters: [{ name: 'SION Playlist', extensions: ['json'] }]
      })
      if (!result || result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return
      }
      const filePath = result.filePaths[0]
      const rawData = await window.api.file.readJson(filePath)
      if (!rawData || typeof rawData !== 'object' || !('isSionPlaylist' in rawData)) {
        showToast('Format file rundown tidak valid', 'error')
        return
      }
      const data = rawData as {
        isSionPlaylist: boolean
        playlist?: { name?: string; service_date?: string }
        items?: Array<Record<string, unknown>>
        songs?: Array<Record<string, unknown>>
      }
      if (!data.isSionPlaylist) {
        showToast('Format file rundown tidak valid', 'error')
        return
      }

      // Create new playlist
      const playlistName = `${data.playlist?.name || 'Imported Playlist'} (Import)`
      const playlistDate = data.playlist?.service_date?.trim() || ''
      await createPlaylist(playlistName, playlistDate)

      const { activePlaylist: newPlaylist } = usePlaylistStore.getState()
      if (!newPlaylist) {
        showToast('Gagal membuat rundown untuk import', 'error')
        return
      }

      // Load all songs to match
      const allSongs = useAppStore.getState().songs
      const itemsToImport = data.items || data.songs || []
      let matchCount = 0
      let failCount = 0

      for (const rawItem of itemsToImport) {
        const itemType = rawItem.item_type || 'song'
        if (itemType === 'info') {
          await window.api.playlists.addInfo(newPlaylist.id, {
            title: String(rawItem.title || ''),
            body: String(rawItem.notes || '')
          })
          matchCount++
        } else if (itemType === 'bible') {
          await window.api.playlists.addBible(newPlaylist.id, {
            bible_version_code: String(rawItem.bible_version_code || ''),
            bible_version_short_name: String(rawItem.bible_version_short_name || ''),
            bible_book_code: String(rawItem.bible_book_code || ''),
            bible_book_name: String(rawItem.bible_book_name || ''),
            bible_chapter: Number(rawItem.bible_chapter || 1),
            bible_verse_start: Number(rawItem.bible_verse_start || 1),
            bible_verse_end: Number(rawItem.bible_verse_end || 1),
            bible_reference: String(rawItem.bible_reference || ''),
            bible_text_json: String(rawItem.bible_text_json || '[]'),
            bible_copyright: String(rawItem.bible_copyright || ''),
            notes: String(rawItem.notes || '')
          })
          matchCount++
        } else {
          const matched = allSongs.find(
            (s) =>
              String(s.number).toLowerCase() === String(rawItem.number || '').toLowerCase() &&
              String(s.hymnal_code || '').toLowerCase() ===
                String(rawItem.hymnal_code || 'ls').toLowerCase()
          )
          if (matched) {
            await window.api.playlists.addItem({
              playlist_id: newPlaylist.id,
              song_id: matched.id,
              section_label: String(rawItem.section_label || '')
            })
            matchCount++
          } else {
            failCount++
          }
        }
      }

      await loadPlaylistItems(newPlaylist.id)
      if (failCount > 0) {
        showToast(
          `Berhasil mengimpor ${matchCount} item. ${failCount} lagu gagal dicocokkan.`,
          'info'
        )
      } else {
        showToast(`Berhasil mengimpor ${matchCount} item ke rundown baru.`, 'success')
      }
    } catch (err) {
      logger.error('Import failed:', err)
      showToast('Gagal mengimpor rundown', 'error')
    }
  }

  const handleDeletePlaylist = async (): Promise<void> => {
    if (!activePlaylist) return
    const confirmed = await useModalStore
      .getState()
      .openAsync<boolean>('confirm-delete-playlist', 'confirm', {
        title: 'Hapus Rundown Worship?',
        description: `"${activePlaylist.name}" akan dihapus permanen beserta semua item di dalamnya.`,
        confirmLabel: 'Hapus',
        danger: true
      })
    if (!confirmed) return
    try {
      await window.api.playlists.delete(activePlaylist.id)
      usePlaylistStore.getState().setActivePlaylist(null)
      usePlaylistStore.getState().setPlaylistItems([])
      setSelectedSong(null)
      await usePlaylistStore.getState().loadPlaylists()
    } catch (err) {
      logger.error('Failed to delete playlist:', err)
      useAppStore.getState().showToast('Gagal menghapus rundown', 'error')
    }
  }

  const handleClosePlaylist = (): void => {
    setActivePlaylist(null)
    usePlaylistStore.getState().setPlaylistItems([])
    setSelectedSong(null)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = playlistItems.findIndex((item) => item.id.toString() === active.id)
      const newIndex = playlistItems.findIndex((item) => item.id.toString() === over?.id)
      if (activeItemIndex === oldIndex) setActiveItemIndex(newIndex)
      else if (activeItemIndex > oldIndex && activeItemIndex <= newIndex)
        setActiveItemIndex(activeItemIndex - 1)
      else if (activeItemIndex < oldIndex && activeItemIndex >= newIndex)
        setActiveItemIndex(activeItemIndex + 1)
      await reorderItems(oldIndex, newIndex)
    }
  }

  return (
    <div className="playlist-panel">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="playlist-panel__header">
        <PlaylistSelector
          playlists={playlists}
          activePlaylist={activePlaylist}
          itemCount={playlistItems.length}
          slideCount={totalSlideCount}
          onSelect={handleLoadPlaylist}
          onCreate={() => setShowNewDialog(true)}
        />

        <div className="flex items-center gap-1 shrink-0">
          {activePlaylist && (
            <>
              {/* Section divider */}
              <div className="relative">
                <button
                  onClick={() => setShowSectionMenu((v) => !v)}
                  className="playlist-panel__tool"
                  title="Tambah label bagian ke item aktif"
                >
                  <SeparatorHorizontal size={14} />
                  <ChevronDown size={9} />
                </button>
                {showSectionMenu && (
                  <SectionMenu
                    onSelect={handleAddSectionDivider}
                    onClose={() => setShowSectionMenu(false)}
                  />
                )}
              </div>
              <button
                onClick={handleExportPlaylist}
                className="playlist-panel__tool"
                title="Export rundown"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleImportPlaylist}
                className="playlist-panel__tool"
                title="Import rundown"
              >
                <Upload size={14} />
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="playlist-panel__tool playlist-panel__tool--danger"
                title="Hapus rundown"
              >
                <Trash2 size={14} />
              </button>
              <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
            </>
          )}
          <button
            onClick={() => setShowNewDialog(true)}
            className="playlist-panel__tool playlist-panel__tool--primary"
            title="Rundown baru"
          >
            <Plus size={14} />
          </button>
          {activePlaylist && (
            <button
              onClick={handleClosePlaylist}
              className="playlist-panel__tool"
              title="Tutup rundown"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="playlist-panel__body">
        {activePlaylist && playlistItems.length > 0 && (
          <div className="mx-2 mb-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.045] px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Clock3 size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                    Durasi Rundown Worship
                  </div>
                  <div className="truncate text-[11px] font-semibold text-text-muted">
                    {playlistItems.length} item · {totalSlideCount} slide · estimasi ibadah
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[18px] font-black tabular-nums text-text-primary">
                  {formatRundownDuration(rundownTiming.rundownTotalSeconds)}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                  Total
                </div>
              </div>
            </div>
          </div>
        )}
        {!activePlaylist ? (
          /* Empty — no playlist selected */
          <div className="playlist-panel__empty">
            <div className="playlist-panel__empty-icon">
              <ListMusic size={22} />
            </div>
            <h3>Belum ada Rundown Worship aktif</h3>
            <p>Buat rundown baru atau buka rundown yang sudah ada.</p>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setShowLoadDialog(true)} className="playlist-panel__empty-btn">
                <FolderOpen size={13} />
                Buka Rundown
              </button>
              <button
                onClick={() => setShowNewDialog(true)}
                className="playlist-panel__empty-btn playlist-panel__empty-btn--primary"
              >
                <Plus size={13} />
                Baru
              </button>
            </div>
          </div>
        ) : playlistItems.length === 0 ? (
          /* Empty — playlist has no items */
          <div className="playlist-panel__empty">
            <div className="playlist-panel__empty-icon">
              <Music size={20} />
            </div>
            <h3>Rundown Kosong</h3>
            <p>Klik tombol + pada lagu di library untuk menambahkan ke sini.</p>
          </div>
        ) : (
          /* Song list with DnD */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlistItems.map((i) => i.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="playlist-panel__list">
                {playlistItems.map((item, index) => (
                  <PlaylistItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    isActive={activeItemIndex === index}
                    isProjected={projectedSongId === item.song_id}
                    onClick={() => handleItemClick(item, index)}
                    onRemove={(e) => handleRemoveItem(e, item.id)}
                    onReplace={(target) => {
                      setReplaceTarget(target)
                      setReplaceQuery('')
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showNewDialog && (
        <Modal
          id="playlist-panel-create"
          title="Buat Rundown Worship"
          subtitle="Siapkan urutan ibadah yang dapat dipakai kapan saja atau untuk tanggal tertentu."
          size="md"
          onClose={() => setShowNewDialog(false)}
          footer={
            <>
              <ModalButton onClick={() => setShowNewDialog(false)}>Batal</ModalButton>
              <ModalButton
                variant="primary"
                onClick={() => void handleCreatePlaylist()}
                disabled={!newName.trim() || (newScheduleMode === 'dated' && !newDate)}
              >
                Simpan Rundown
              </ModalButton>
            </>
          }
        >
          <div className="playlist-modal-form">
            <div className="sp-field">
              <label htmlFor="playlist-panel-name" className="sp-field__label">
                Nama Event / Ibadah
              </label>
              <input
                id="playlist-panel-name"
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreatePlaylist()
                }}
                placeholder="Contoh: Ibadah Minggu Pagi"
                className="sp-input"
              />
            </div>
            <fieldset className="sp-field">
              <legend className="sp-field__label">Penggunaan</legend>
              <div className="playlist-schedule-options">
                <button
                  type="button"
                  className={`playlist-schedule-option ${newScheduleMode === 'anytime' ? 'is-active' : ''}`}
                  onClick={() => setNewScheduleMode('anytime')}
                  aria-pressed={newScheduleMode === 'anytime'}
                >
                  <Repeat2 size={17} />
                  <span>
                    <strong>Kapan saja</strong>
                    <small>Dapat digunakan berulang kali</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`playlist-schedule-option ${newScheduleMode === 'dated' ? 'is-active' : ''}`}
                  onClick={() => setNewScheduleMode('dated')}
                  aria-pressed={newScheduleMode === 'dated'}
                >
                  <CalendarDays size={17} />
                  <span>
                    <strong>Bertanggal</strong>
                    <small>Untuk ibadah tertentu</small>
                  </span>
                </button>
              </div>
            </fieldset>
            {newScheduleMode === 'dated' && (
              <div className="sp-field">
                <label htmlFor="playlist-panel-date" className="sp-field__label">
                  Tanggal Ibadah
                </label>
                <input
                  id="playlist-panel-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="sp-input"
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {showLoadDialog && (
        <Modal
          id="playlist-panel-load"
          title="Buka Rundown Worship"
          subtitle="Pilih rundown tersimpan untuk melanjutkan persiapan ibadah."
          size="md"
          onClose={() => setShowLoadDialog(false)}
        >
          {playlists.length === 0 ? (
            <div className="sp-modal-empty">
              <ListMusic size={24} />
              <strong>Belum ada rundown tersimpan</strong>
              <span>Buat Rundown Worship baru untuk memulai persiapan ibadah.</span>
            </div>
          ) : (
            <div className="playlist-modal-list">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  onClick={() => void handleLoadPlaylist(playlist)}
                  className="playlist-modal-list__item"
                >
                  <span className="playlist-modal-list__icon">
                    <ListMusic size={15} />
                  </span>
                  <span className="playlist-modal-list__copy">
                    <strong>{playlist.name}</strong>
                    <small>{formatPlaylistSchedule(playlist.service_date)}</small>
                  </span>
                  <FolderOpen size={15} />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {replaceTarget && (
        <Modal
          id="playlist-replace-song"
          title="Ganti Lagu Rundown"
          subtitle={`Posisi, urutan, dan label “${replaceTarget.section_label || replaceTarget.title}” tetap dipertahankan.`}
          size="lg"
          onClose={() => setReplaceTarget(null)}
        >
          <div className="playlist-replace">
            <label className="playlist-replace__search">
              <Search size={16} />
              <input
                autoFocus
                value={replaceQuery}
                onChange={(event) => setReplaceQuery(event.target.value)}
                placeholder="Cari nomor atau judul lagu…"
              />
            </label>
            <div className="playlist-replace__list">
              {replacementSongs.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  className="playlist-replace__item"
                  onClick={async () => {
                    await replaceSongItem(replaceTarget.id, song)
                    setReplaceTarget(null)
                  }}
                >
                  <span className="playlist-replace__number">{song.number || '—'}</span>
                  <span className="playlist-replace__copy">
                    <strong>{song.title}</strong>
                    <small>{song.hymnal_code || song.hymnal_name || 'Koleksi lagu'}</small>
                  </span>
                  <span className="playlist-replace__action">Pilih</span>
                </button>
              ))}
              {replacementSongs.length === 0 && (
                <div className="sp-modal-empty">
                  <Music size={24} />
                  <strong>Lagu tidak ditemukan</strong>
                  <span>Coba nomor atau kata kunci lain.</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
