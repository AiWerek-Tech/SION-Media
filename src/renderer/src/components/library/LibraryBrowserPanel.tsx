import React, { useCallback, useState } from 'react'
import { Grid3X3, ListMusic, Type } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { logger } from '../../utils/logger'
import { LibraryNumberView } from './LibraryNumberView'
import { LibraryTitleView } from './LibraryTitleView'
import { LibraryPlaylistWorkspace } from './LibraryPlaylistWorkspace'
import { LyricStudioLite } from './LyricStudioLite'
import type { Song } from '../../types'

export type LibraryTab = 'playlist' | 'number' | 'title'

export function LibraryBrowserPanel({ activeTab }: { activeTab: LibraryTab }): React.JSX.Element {
  const { songs, selectedSong, setSelectedSong, loadSongs } = useAppStore()

  const { addSongToPlaylist } = usePlaylistStore()

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

      {/* Detail Panel (Right Sidebar) */}
      <AnimatePresence>
        {selectedSong && (
          <motion.div
            initial={{ opacity: 0, x: 500 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 500 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-[400px] lg:w-[450px] border-l border-border-default/20 shadow-[-12px_0_32px_rgba(0,0,0,0.15)] z-20 relative bg-bg-surface"
          >
            <LyricStudioLite
              key={selectedSong.id}
              song={selectedSong}
              onClose={() => setSelectedSong(null)}
              onSelectLinkedSong={handleSelectSong}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
