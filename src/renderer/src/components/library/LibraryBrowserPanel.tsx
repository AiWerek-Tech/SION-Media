import React, { useCallback, useState } from 'react'
import { Grid3X3, ListMusic, Type } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { logger } from '../../utils/logger'
import { LibrarySidebar } from './LibrarySidebar'
import { LibraryNumberView } from './LibraryNumberView'
import { LibraryTitleView } from './LibraryTitleView'
import { LibraryPlaylistWorkspace } from './LibraryPlaylistWorkspace'
import type { Song } from '../../types'

type LibraryTab = 'playlist' | 'number' | 'title'

const TABS = [
  { id: 'number' as LibraryTab, label: 'Nomor', icon: Grid3X3 },
  { id: 'title' as LibraryTab, label: 'Judul', icon: Type },
  { id: 'playlist' as LibraryTab, label: 'Playlist', icon: ListMusic }
]

export function LibraryBrowserPanel(): React.JSX.Element {
  const { songs, selectedSong, setSelectedSong, loadSongs } = useAppStore()

  const { addSongToPlaylist } = usePlaylistStore()

  const [activeTab, setActiveTab] = useState<LibraryTab>('number')
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [isResizing, setIsResizing] = useState(false)

  const handleSelectSong = useCallback(
    (song: Song) => {
      setSelectedSong(song)
    },
    [setSelectedSong]
  )

  const handleAddToPlaylist = useCallback(
    (song: Song) => {
      addSongToPlaylist(song).catch(logger.error)
    },
    [addSongToPlaylist]
  )

  const handleToggleFavorite = useCallback(
    async (songId: number) => {
      try {
        await window.api.songs.toggleFavorite(songId)
        await loadSongs()
      } catch (err) {
        logger.error('Failed to toggle favorite:', err)
      }
    },
    [loadSongs]
  )

  // Sidebar resize
  const startResize = useCallback(() => {
    setIsResizing(true)
    const onMove = (e: MouseEvent): void => {
      setSidebarWidth(Math.max(240, Math.min(420, e.clientX)))
    }
    const onUp = (): void => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div
        className="flex-shrink-0 flex flex-col border-r border-border-default/50 surface-1"
        style={{ width: sidebarWidth }}
      >
        <LibrarySidebar onSelectSong={handleSelectSong} selectedSongId={selectedSong?.id} />
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResize}
        className={`w-1 flex-shrink-0 cursor-col-resize transition-colors duration-150 ${
          isResizing ? 'bg-brand-primary/40' : 'hover:bg-brand-primary/20'
        }`}
        style={{ cursor: isResizing ? 'col-resize' : 'ew-resize' }}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col surface-0">
        {/* Tab Bar */}
        <div className="h-[48px] min-h-[48px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
          <div className="pill-tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pill-tab ${isActive ? 'pill-tab-active' : ''}`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {tab.id === 'number' && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-surface-3 text-text-muted font-mono">
                      {songs.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-text-muted font-medium px-2 py-1 rounded-lg bg-surface-2/40 border border-border-default/20">
              {songs.length} lagu
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              {activeTab === 'number' && (
                <LibraryNumberView
                  songs={songs}
                  selectedSongId={selectedSong?.id}
                  onSelectSong={handleSelectSong}
                />
              )}
              {activeTab === 'title' && (
                <LibraryTitleView
                  songs={songs}
                  selectedSongId={selectedSong?.id}
                  onSelectSong={handleSelectSong}
                  onAddToPlaylist={handleAddToPlaylist}
                  onToggleFavorite={handleToggleFavorite}
                />
              )}
              {activeTab === 'playlist' && <LibraryPlaylistWorkspace />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
