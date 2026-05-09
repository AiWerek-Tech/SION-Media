import React, { useCallback } from 'react'
// Icons are used in parent component tabs
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { logger } from '../../utils/logger'
import { LibraryNumberView } from './LibraryNumberView'
import { LibraryTitleView } from './LibraryTitleView'
import { LibraryPlaylistWorkspace } from './LibraryPlaylistWorkspace'
import type { Song } from '../../types'

export type LibraryTab = 'playlist' | 'number' | 'title'

export function LibraryBrowserPanel({ activeTab }: { activeTab: LibraryTab }): React.JSX.Element {
  const { songs, selectedSong, setSelectedSong, setLyricsFullscreen, loadSongs } = useAppStore()

  const { addSongToPlaylist } = usePlaylistStore()

  const handleSelectSong = useCallback(
    (song: Song) => {
      setSelectedSong(song)
      setLyricsFullscreen(true)
    },
    [setLyricsFullscreen, setSelectedSong]
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

  return (
    <div className="h-full flex relative overflow-hidden">
      {/* Main Content (Master List) */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'number' && (
              <motion.div
                key="number"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <LibraryNumberView
                  songs={songs}
                  selectedSongId={selectedSong?.id}
                  onSelectSong={handleSelectSong}
                />
              </motion.div>
            )}
            {activeTab === 'title' && (
              <motion.div
                key="title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <LibraryTitleView
                  songs={songs}
                  selectedSongId={selectedSong?.id}
                  onSelectSong={handleSelectSong}
                  onAddToPlaylist={handleAddToPlaylist}
                  onToggleFavorite={handleToggleFavorite}
                />
              </motion.div>
            )}
            {activeTab === 'playlist' && (
              <motion.div
                key="playlist"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <LibraryPlaylistWorkspace />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
