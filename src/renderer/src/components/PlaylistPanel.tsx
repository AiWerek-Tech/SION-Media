import React, { useState, useMemo } from 'react'
import {
  ListMusic,
  Plus,
  FolderOpen,
  Music,
  Trash2,
  Download,
  SeparatorHorizontal,
  ChevronDown
} from 'lucide-react'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useAppStore } from '../store/useAppStore'
import { generateSlides } from '../engine/slideEngine'
import { logger } from '../utils/logger'
import type { PlaylistItem } from '../types'
import PlaylistItemCard from '../components/PlaylistItemCard'
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

// SortablePlaylistItem component has been replaced by PlaylistItemCard (see components/PlaylistItemCard.tsx)

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

  // Total slide count across all playlist items
  const totalSlideCount = useMemo(
    () =>
      playlistItems.reduce(
        (sum, item) => sum + generateSlides(item.song_id, item.lyrics_raw || '').length,
        0
      ),
    [playlistItems]
  )

  // Add section label to the next playlist item that doesn't have one
  const handleAddSectionDivider = (label: string): void => {
    const updateItemLabel = usePlaylistStore.getState().updateItemLabel
    // Apply label to the last item in the list (or first without a label)
    const target = playlistItems.find((item) => !item.section_label)
    if (target) {
      updateItemLabel(target.id, label)
    } else if (playlistItems.length > 0) {
      // If all items have labels, apply to last item
      updateItemLabel(playlistItems[playlistItems.length - 1].id, label)
    }
  }

  const handleCreatePlaylist = async (): Promise<void> => {
    if (!newName.trim()) return
    await createPlaylist(newName, newDate)
    setNewName('')
    setShowNewDialog(false)
    const store = usePlaylistStore.getState()
    if (store.activePlaylist) await loadPlaylistItems(store.activePlaylist.id)
  }

  const handleLoadPlaylist = async (playlist: (typeof playlists)[0]): Promise<void> => {
    setActivePlaylist(playlist)
    await loadPlaylistItems(playlist.id)
    setShowLoadDialog(false)
  }

  const handleItemClick = (item: PlaylistItem, index: number): void => {
    if (onItemClick) {
      onItemClick(item, index)
      return
    }
    setActiveItemIndex(index)
    const song = songs.find((s) => s.id === item.song_id)
    if (song) {
      setSelectedSong(song)
    }
  }

  const handleRemoveItem = async (e: React.MouseEvent, itemId: number): Promise<void> => {
    e.stopPropagation()
    await removeItem(itemId)
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

  const handleDeletePlaylist = async (): Promise<void> => {
    if (!activePlaylist) return
    if (confirm(`Hapus playlist "${activePlaylist.name}"?`)) {
      try {
        await window.api.playlists.delete(activePlaylist.id)
        usePlaylistStore.getState().setActivePlaylist(null)
        usePlaylistStore.getState().setPlaylistItems([])
        await usePlaylistStore.getState().loadPlaylists()
      } catch (err) {
        logger.error('Failed to delete playlist:', err)
        useAppStore.getState().showToast('Gagal menghapus playlist', 'error')
      }
    }
  }

  const handleExportPlaylist = (): void => {
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

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `sion-playlist-${activePlaylist.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    showToast('Berhasil mengekspor playlist', 'success')
  }

  return (
    <div className="panel-glass flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header: Title & Actions */}
      <div className="bg-bg-surface/50 px-3 py-2.5 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-secondary/10 text-brand-secondary">
              <ListMusic size={15} />
            </div>
            <div>
              <h2 className="font-heading text-[13px] font-black uppercase tracking-[0.08em] text-text-primary leading-tight">
                {activePlaylist?.name || 'Pilih Playlist'}
              </h2>
              {activePlaylist && (
                <p className="text-[12px] text-text-muted font-medium uppercase tracking-[0.04em]">
                  {new Date(activePlaylist.service_date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLoadDialog(true)}
              className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              title="Buka Playlist"
            >
              <FolderOpen size={18} />
            </button>
            <button
              onClick={() => setShowNewDialog(true)}
              className="rounded-md bg-brand-primary/10 p-1.5 text-brand-primary transition-colors hover:bg-brand-primary/20"
              title="Playlist Baru"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        {activePlaylist && (
          <div className="flex items-center justify-between rounded-lg bg-bg-base/40 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <span className="text-[11px] text-text-muted font-medium ml-2">
              {playlistItems.length} Item · {totalSlideCount} Slides
            </span>
            <div className="flex items-center gap-1">
              {/* Section Divider Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSectionMenu(!showSectionMenu)}
                  className="flex items-center gap-1 p-1.5 rounded text-text-muted hover:text-brand-secondary hover:bg-brand-secondary/10 transition-colors"
                  title="Tambah Pemisah Bagian"
                >
                  <SeparatorHorizontal size={14} />
                  <ChevronDown size={10} />
                </button>
                {showSectionMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border-strong bg-bg-surface/98 shadow-2xl backdrop-blur-sm py-1 animate-fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-text-disabled">
                      Pemisah Bagian Ibadah
                    </div>
                    {SECTION_PRESETS.map((label) => (
                      <button
                        key={label}
                        onClick={() => {
                          handleAddSectionDivider(label)
                          setShowSectionMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-[12px] font-semibold text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                    <div className="h-px bg-border-subtle mx-2 my-1" />
                    <button
                      onClick={() => {
                        const custom = prompt('Masukkan nama bagian:')
                        if (custom?.trim()) {
                          handleAddSectionDivider(custom.trim().toUpperCase())
                        }
                        setShowSectionMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-[12px] font-medium text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors italic"
                    >
                      Custom...
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleExportPlaylist}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                title="Export Playlist"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="p-1.5 rounded text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                title="Hapus Playlist"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content: List with DND */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-bg-base/20 p-2">
        {!activePlaylist ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-full max-w-[520px] rounded-2xl border border-border-subtle bg-bg-surface/70 backdrop-blur-md shadow-[var(--shadow-elevation-3)] px-8 py-10">
              <div className="mx-auto w-20 h-20 rounded-3xl border border-border-subtle bg-bg-elevated flex items-center justify-center mb-6 text-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_34px_rgba(0,0,0,0.28)]">
                <ListMusic size={38} />
              </div>
              <h3 className="text-text-primary font-heading font-black uppercase tracking-[0.12em] text-[12px] mb-2">
                Belum ada playlist aktif
              </h3>
              <p className="text-text-muted text-[12px] max-w-[360px] mx-auto mb-7 leading-relaxed">
                Buat playlist baru atau buka playlist yang sudah ada untuk mulai menyusun urutan
                lagu.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowLoadDialog(true)}
                  className="btn-premium btn-premium-ghost h-9 px-4 gap-2 text-[12px]"
                >
                  <FolderOpen size={16} />
                  Buka Playlist
                </button>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="btn-premium btn-premium-primary h-9 px-4 gap-2 text-[12px]"
                >
                  <Plus size={16} />
                  Baru
                </button>
              </div>
            </div>
          </div>
        ) : playlistItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-full max-w-[520px] rounded-2xl border border-border-subtle bg-bg-surface/55 backdrop-blur-md shadow-[var(--shadow-elevation-2)] px-8 py-10">
              <div className="mx-auto w-16 h-16 rounded-2xl border border-border-subtle bg-bg-elevated/60 flex items-center justify-center mb-4 text-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Music size={28} />
              </div>
              <h4 className="text-text-primary font-semibold text-[13px] mb-1">Playlist Kosong</h4>
              <p className="text-text-muted text-[12px] leading-relaxed">
                Klik tombol &apos;+&apos; pada lagu di library untuk menambahkan ke sini.
              </p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlistItems.map((i) => i.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1.5 pb-4">
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

      {/* Dialogs */}
      {(showNewDialog || showLoadDialog) && (
        <div className="fixed inset-0 modal-overlay z-[100] flex items-center justify-center p-6">
          <div className="glass-panel-strong w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {showNewDialog && (
              <div className="p-6">
                <h3 className="text-h3 mb-4">Buat Playlist Baru</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-micro text-text-muted mb-1.5 block">
                      Nama Event / Ibadah
                    </label>
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Contoh: Ibadah Minggu Pagi"
                      className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-micro text-text-muted mb-1.5 block">Tanggal</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    onClick={() => setShowNewDialog(false)}
                    className="btn-premium btn-premium-ghost"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreatePlaylist}
                    className="btn-premium btn-premium-primary px-6"
                  >
                    Simpan Playlist
                  </button>
                </div>
              </div>
            )}

            {showLoadDialog && (
              <div className="flex flex-col max-h-[70vh]">
                <div className="p-6 border-b border-border-subtle">
                  <h3 className="text-h3">Buka Playlist</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {playlists.length === 0 ? (
                    <div className="p-8 text-center text-text-muted text-sm">
                      Belum ada playlist tersimpan.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {playlists.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleLoadPlaylist(p)}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-bg-elevated text-left group transition-all"
                        >
                          <div>
                            <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[12px] text-text-muted">
                              {new Date(p.service_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <FolderOpen
                            size={16}
                            className="text-text-disabled group-hover:text-brand-primary"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-bg-base/50 border-t border-border-subtle flex justify-end">
                  <button
                    onClick={() => setShowLoadDialog(false)}
                    className="btn btn-ghost text-xs"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
