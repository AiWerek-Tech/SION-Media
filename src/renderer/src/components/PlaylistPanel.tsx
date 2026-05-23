import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  Download,
  FolderOpen,
  ListMusic,
  Music,
  Plus,
  SeparatorHorizontal,
  Trash2,
  X
} from 'lucide-react'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModalStore } from '@renderer/store/useModalStore'
import { generateSlidesForPlaylistItem } from '@renderer/engine/slideEngine'
import { logger } from '@renderer/utils/logger'
import type { PlaylistItem } from '@renderer/types'
import PlaylistItemCard from '@renderer/components/PlaylistItemCard'
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
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const activeItemIndex = usePlaylistStore((s) => s.activeItemIndex)
  const setActiveItemIndex = usePlaylistStore((s) => s.setActiveItemIndex)

  // Total slide count
  const totalSlideCount = React.useMemo(
    () => playlistItems.reduce((sum, item) => sum + generateSlidesForPlaylistItem(item).length, 0),
    [playlistItems]
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
    await createPlaylist(newName, newDate)
    setSelectedSong(null)
    // FIX: reset both fields after creation
    setNewName('')
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
      showToast('Playlist kosong, tidak ada yang diekspor', 'error')
      return
    }

    const exportData = {
      isSionPlaylist: true,
      playlist: {
        name: activePlaylist.name,
        service_date: activePlaylist.service_date
      },
      songs: playlistItems.map((item) => {
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
          showToast('Berhasil mengekspor playlist', 'success')
        }
      }
    } catch (err) {
      logger.error('Export failed:', err)
      showToast('Gagal mengekspor playlist', 'error')
    }
  }

  const handleDeletePlaylist = async (): Promise<void> => {
    if (!activePlaylist) return
    const confirmed = await useModalStore
      .getState()
      .openAsync<boolean>('confirm-delete-playlist', 'confirm', {
        title: 'Hapus Playlist?',
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
      useAppStore.getState().showToast('Gagal menghapus playlist', 'error')
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
        <div className="flex min-w-0 items-center gap-2.5 flex-1">
          <div className="playlist-panel__icon">
            <ListMusic size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="playlist-panel__title">{activePlaylist?.name || 'Pilih Playlist'}</h2>
            {activePlaylist && (
              <p className="playlist-panel__subtitle">
                {new Date(activePlaylist.service_date).toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
                {' · '}
                {playlistItems.length} lagu · {totalSlideCount} slide
              </p>
            )}
          </div>
        </div>

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
                title="Export playlist"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="playlist-panel__tool playlist-panel__tool--danger"
                title="Hapus playlist"
              >
                <Trash2 size={14} />
              </button>
              <div className="w-px h-4 bg-white/[0.06] mx-0.5" />
            </>
          )}
          <button
            onClick={() => setShowLoadDialog(true)}
            className="playlist-panel__tool"
            title="Buka playlist"
          >
            <FolderOpen size={14} />
          </button>
          <button
            onClick={() => setShowNewDialog(true)}
            className="playlist-panel__tool playlist-panel__tool--primary"
            title="Playlist baru"
          >
            <Plus size={14} />
          </button>
          {activePlaylist && (
            <button
              onClick={handleClosePlaylist}
              className="playlist-panel__tool"
              title="Tutup playlist"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="playlist-panel__body">
        {!activePlaylist ? (
          /* Empty — no playlist selected */
          <div className="playlist-panel__empty">
            <div className="playlist-panel__empty-icon">
              <ListMusic size={22} />
            </div>
            <h3>Belum ada playlist aktif</h3>
            <p>Buat playlist baru atau buka playlist yang sudah ada.</p>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setShowLoadDialog(true)} className="playlist-panel__empty-btn">
                <FolderOpen size={13} />
                Buka Playlist
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
            <h3>Playlist Kosong</h3>
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      {(showNewDialog || showLoadDialog) && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewDialog(false)
              setShowLoadDialog(false)
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0d1525] ring-1 ring-white/10 shadow-2xl overflow-hidden">
            {/* New Playlist Dialog */}
            {showNewDialog && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[15px] font-bold text-text-primary">Buat Playlist Baru</h3>
                  <button
                    onClick={() => setShowNewDialog(false)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted mb-1.5 block uppercase tracking-wider">
                      Nama Event / Ibadah
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleCreatePlaylist()
                        if (e.key === 'Escape') setShowNewDialog(false)
                      }}
                      placeholder="Contoh: Ibadah Minggu Pagi"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-disabled focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-muted mb-1.5 block uppercase tracking-wider">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-text-primary focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/10 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setShowNewDialog(false)}
                    className="px-4 py-2 rounded-xl text-[12px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={!newName.trim()}
                    className="px-5 py-2 rounded-xl bg-brand-primary text-[12px] font-bold text-white hover:bg-brand-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {/* Load Playlist Dialog */}
            {showLoadDialog && (
              <div className="flex flex-col max-h-[65vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <h3 className="text-[15px] font-bold text-text-primary">Buka Playlist</h3>
                  <button
                    onClick={() => setShowLoadDialog(false)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {playlists.length === 0 ? (
                    <div className="py-10 text-center text-text-muted text-[13px]">
                      Belum ada playlist tersimpan.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {playlists.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleLoadPlaylist(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.05] text-left group transition-all"
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {new Date(p.service_date).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <FolderOpen
                            size={14}
                            className="text-text-disabled group-hover:text-brand-primary transition-colors shrink-0"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
