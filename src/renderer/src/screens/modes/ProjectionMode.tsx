import React, { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Maximize2 } from 'lucide-react'
import { SongLibraryPanel } from '../../components/SongLibraryPanel'
import { LivePreviewPanel } from '../../components/LivePreviewPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { ControlBar } from '../../components/ControlBar'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { generateSlides } from '../../engine/slideEngine'
import type { PlaylistItem } from '../../types'

export function ProjectionMode(): React.JSX.Element {
  const { playlistItems } = usePlaylistStore()
  const {
    displayCount,
    isFocusMode,
    toggleFocusMode,
    loadHymnals,
    loadSongs,
    setSelectedSong,
    songs
  } = useAppStore()
  const { setSlides, programSlide } = useProjectionStore()
  const hasSingleMonitor = displayCount <= 1
  const projectedSongId = programSlide?.songId ?? null

  const handlePlaylistItemClick = (item: PlaylistItem, index: number): void => {
    usePlaylistStore.getState().setActiveItemIndex(index)
    const song = songs.find((s) => s.id === item.song_id)
    if (song) {
      setSelectedSong(song)
      setSlides(generateSlides(song.id, song.lyrics_raw))
    }
  }

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  useEffect(() => {
    if (playlistItems.length > 0) {
      // Reserved for playlist-adjacent media preload without coupling UI to the media engine.
    }
  }, [playlistItems])

  return (
    <div
      className={`h-full w-full overflow-hidden bg-bg-base text-text-primary projection-layout ${
        isFocusMode ? 'projection-layout--focus' : ''
      }`}
    >
      {/* Monitor Section */}
      <section
        className={`relative min-h-0 overflow-hidden preview-section-bg ${
          isFocusMode ? 'ring-1 ring-brand-primary/10 shadow-[0_0_60px_rgba(59,130,246,0.06)]' : ''
        }`}
      >
        <div className="absolute left-3 top-2 z-20 flex items-center gap-2">
          {hasSingleMonitor && (
            <div className="inline-flex h-7 items-center gap-1.5 rounded-md bg-status-error/15 px-2 text-[12px] font-black uppercase tracking-[0.04em] text-status-error shadow-[0_0_18px_rgba(239,68,68,0.16)]">
              <AlertTriangle size={13} />
              Monitor Tunggal
            </div>
          )}
          {isFocusMode && (
            <button
              onClick={toggleFocusMode}
              className="no-drag inline-flex h-7 items-center gap-1.5 rounded-md bg-bg-elevated/80 px-2 text-[12px] font-bold uppercase tracking-[0.04em] text-text-secondary backdrop-blur hover:text-text-primary"
              title="Exit Focus Live Mode"
            >
              <Maximize2 size={12} />
              Exit Focus
            </button>
          )}
        </div>
        <LivePreviewPanel />
      </section>

      {/* Mixer Bar */}
      <section className="min-h-0 mixer-bar">
        <ControlBar />
      </section>

      {/* Management Section */}
      <AnimatePresence initial={false}>
        {!isFocusMode && (
          <motion.section
            key="projection-management"
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 8, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-0 overflow-hidden"
          >
            <div className="grid min-h-0 grid-cols-[minmax(360px,45%)_minmax(420px,55%)] gap-px bg-white/[0.06]">
              <div className="min-w-0 bg-bg-surface/60 backdrop-blur-sm p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.02)]">
                <SongLibraryPanel />
              </div>
              <div className="min-w-0 bg-bg-surface/60 backdrop-blur-sm p-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.02)]">
                <PlaylistPanel
                  projectedSongId={projectedSongId}
                  onItemClick={handlePlaylistItemClick}
                />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
