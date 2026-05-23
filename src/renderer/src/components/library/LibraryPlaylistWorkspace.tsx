import React, { useEffect, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  Download,
  GripVertical,
  Layers,
  Plus,
  Sparkles,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useAppStore } from '@renderer/store/useAppStore'
import PlaylistItemCard from '@renderer/components/PlaylistItemCard'
import { logger } from '@renderer/utils/logger'

const SECTION_PRESETS = [
  'PEMBUKAAN',
  'PUJIAN',
  'PENYEMBAHAN',
  'KHOTBAH',
  'PERSEMBAHAN',
  'PENUTUPAN'
] as const

export function LibraryPlaylistWorkspace(): React.JSX.Element {
  const {
    playlists,
    activePlaylist,
    setActivePlaylist,
    loadPlaylists,
    createPlaylist,
    loadPlaylistItems,
    playlistItems,
    removeItem,
    reorderItems
  } = usePlaylistStore()

  const { songs, setSelectedSong } = useAppStore()

  const [menuOpen, setMenuOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadPlaylists().catch(logger.error)
  }, [loadPlaylists])

  useEffect(() => {
    if (activePlaylist) loadPlaylistItems(activePlaylist.id).catch(logger.error)
  }, [activePlaylist, loadPlaylistItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = playlistItems.findIndex((item) => item.id.toString() === active.id)
      const newIndex = playlistItems.findIndex((item) => item.id.toString() === over?.id)
      await reorderItems(oldIndex, newIndex)
    }
  }

  const handleItemClick = (songId: number, index: number): void => {
    usePlaylistStore.getState().setActiveItemIndex(index)
    const song = songs.find((s) => s.id === songId)
    if (!song) return
    setSelectedSong(song)
  }

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    await createPlaylist(newName, newDate)
    setCreateOpen(false)
    setNewName('')
    const store = usePlaylistStore.getState()
    if (store.activePlaylist) await loadPlaylistItems(store.activePlaylist.id)
  }

  const handleExport = (): void => {
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
    const exportFileDefaultName = `sion-playlist-${activePlaylist.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    showToast('Berhasil mengekspor playlist', 'success')
  }

  const handleAddSectionDivider = (label: string): void => {
    const updateItemLabel = usePlaylistStore.getState().updateItemLabel
    const target = playlistItems.find((item) => !item.section_label)
    if (target) updateItemLabel(target.id, label)
    else if (playlistItems.length > 0)
      updateItemLabel(playlistItems[playlistItems.length - 1].id, label)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header / Toolbar */}
      <div className="h-[54px] min-h-[54px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Layers size={16} className="text-brand-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-text-muted font-medium">Playlist Workspace</div>
            <div className="text-[13px] font-semibold text-text-primary truncate">
              {activePlaylist ? activePlaylist.name : 'Pilih / buat playlist'}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 px-3 rounded-xl bg-surface-0/60 border border-border-default/30 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-2/50 transition-all flex items-center gap-2"
              aria-label="Pilih playlist"
            >
              <Calendar size={14} />
              <span className="max-w-[180px] truncate">
                {activePlaylist ? activePlaylist.service_date : 'No date'}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 top-full mt-2 w-[340px] glass-panel-strong p-1.5 max-h-[360px] overflow-y-auto scrollbar-thin z-40"
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setCreateOpen(true)
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] text-text-secondary hover:bg-surface-3/50"
                  >
                    <Plus size={14} />
                    Buat playlist baru…
                  </button>
                  <div className="my-1 h-px bg-border-default/20" />
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        setActivePlaylist(p)
                        await loadPlaylistItems(p.id)
                        setMenuOpen(false)
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-colors ${
                        activePlaylist?.id === p.id
                          ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                          : 'text-text-secondary hover:bg-surface-3/50'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] text-text-muted">{p.service_date}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {activePlaylist && (
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <span className="chip chip-active">{playlistItems.length} lagu</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport()}
            className="btn-premium btn-premium-icon"
            aria-label="Export playlist"
            title="Export"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => handleAddSectionDivider('PUJIAN')}
            className="btn-premium"
            aria-label="Tambah section"
            title="Tambah section"
          >
            <Sparkles size={16} />
            Section
          </button>
          <button
            onClick={() => usePlaylistStore.getState().clearPlaylist().catch(logger.error)}
            className="btn-premium"
            aria-label="Kosongkan playlist"
            title="Clear"
          >
            <Trash2 size={16} />
            Clear
          </button>
        </div>
      </div>

      {/* Create Dialog */}
      <AnimatePresence>
        {createOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[120] flex items-center justify-center modal-overlay"
            onClick={() => setCreateOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-[520px] max-w-[92vw] glass-panel-strong p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[13px] font-semibold text-text-primary">Buat Playlist</div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama playlist"
                  className="w-full h-10 px-3 rounded-xl bg-surface-0 border border-border-default/30 text-[12px] text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/8"
                />
                <input
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  type="date"
                  className="w-full h-10 px-3 rounded-xl bg-surface-0 border border-border-default/30 text-[12px] text-text-primary outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/8"
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCreateOpen(false)}
                  className="btn-premium btn-premium-ghost"
                >
                  Batal
                </button>
                <button onClick={() => handleCreate()} className="btn-premium btn-premium-primary">
                  <Check size={16} />
                  Buat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline / Queue */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4">
        {!activePlaylist ? (
          <div className="h-full flex items-center justify-center">
            <div className="glass-panel-strong p-6 text-center">
              <div className="text-[13px] font-semibold text-text-primary">Playlist Workspace</div>
              <div className="text-[11px] text-text-muted mt-1">
                Buat playlist untuk memulai queue
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-premium btn-premium-primary mt-4"
              >
                <Plus size={16} />
                Buat playlist
              </button>
            </div>
          </div>
        ) : playlistItems.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="glass-panel-strong p-6 text-center">
              <div className="text-[13px] font-semibold text-text-primary">Queue kosong</div>
              <div className="text-[11px] text-text-muted mt-1">
                Tambahkan lagu dari tab Judul / Sidebar
              </div>
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
              <div className="space-y-2">
                {playlistItems.map((item, index) => {
                  const isActive = usePlaylistStore.getState().activeItemIndex === index
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <PlaylistItemCard
                        item={item}
                        index={index}
                        isActive={isActive}
                        onClick={() => handleItemClick(item.song_id, index)}
                        onRemove={(e) => {
                          e.stopPropagation()
                          removeItem(item.id).catch(logger.error)
                        }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Section presets quick bar */}
      {activePlaylist && playlistItems.length > 0 && (
        <div className="h-[56px] min-h-[56px] border-t border-border-default/30 surface-2 px-4 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <span className="text-[11px] text-text-muted font-semibold mr-1">Sections</span>
          {SECTION_PRESETS.map((label) => (
            <button
              key={label}
              onClick={() => handleAddSectionDivider(label)}
              className="btn-premium btn-premium-ghost whitespace-nowrap"
              aria-label={`Tambah section ${label}`}
            >
              <GripVertical size={14} className="opacity-50" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
