import React, { useEffect } from 'react'
import { AlertTriangle, Maximize2 } from 'lucide-react'
import { SongLibraryPanel } from '../../components/SongLibraryPanel'
import { LivePreviewPanel } from '../../components/LivePreviewPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { ControlBar } from '../../components/ControlBar'
import { TwoPanelLayout } from '../../components/design-system'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { generateSlidesForSong } from '../../engine/slideEngine'
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
      setSlides(generateSlidesForSong(song))
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

      {/* Management Section — collapsed by CSS grid when focus mode active */}
      <section className="min-h-0 overflow-hidden pb-2 px-6">
        <TwoPanelLayout
          layoutKey="projectionBottom"
          className="h-full min-h-0"
          leftClassName="min-w-0"
          rightClassName="min-w-0"
          left={<SongLibraryPanel />}
          right={
            <PlaylistPanel
              projectedSongId={projectedSongId}
              onItemClick={handlePlaylistItemClick}
            />
          }
        />
      </section>
    </div>
  )
}
