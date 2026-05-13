import React, { useEffect } from 'react'
import { AlertTriangle, Maximize2 } from 'lucide-react'
import { SongLibraryPanel } from '../components/SongLibraryPanel'
import { LivePreviewPanel } from '../components/LivePreviewPanel'
import { PlaylistPanel } from '../components/PlaylistPanel'
import { ControlBar } from '../components/ControlBar'
import { TwoPanelLayout } from '../components/design-system'
import { usePlaylistStore } from '../store/usePlaylistStore'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlidesForSong } from '../engine/slideEngine'
import type { PlaylistItem } from '../types'

export function Dashboard(): React.JSX.Element {
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
      setSlides(generateSlidesForSong(song), {
        hymnalCode: song.hymnal_code || 'LS',
        hymnalName: song.hymnal_name || 'Lagu Sion',
        songBackgroundConfig: song.song_background_config || ''
      })
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
      className={`h-full w-full overflow-hidden bg-bg-base text-text-primary ${
        isFocusMode
          ? 'grid grid-rows-[minmax(0,1fr)_70px]'
          : 'grid grid-rows-[minmax(0,1fr)_70px_minmax(0,1fr)]'
      }`}
    >
      <section className="relative min-h-0 border-b border-border-default bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.10),transparent_36%),linear-gradient(180deg,rgba(21,24,38,0.72),rgba(13,15,23,0.96))]">
        <div className="absolute left-3 top-2 z-20 flex items-center gap-2">
          {hasSingleMonitor && (
            <div className="inline-flex h-7 items-center gap-1.5 rounded-md border border-status-error/40 bg-status-error/15 px-2 text-[12px] font-black uppercase tracking-[0.04em] text-status-error shadow-[0_0_18px_rgba(239,68,68,0.16)]">
              <AlertTriangle size={13} />
              Monitor Tunggal
            </div>
          )}
          {isFocusMode && (
            <button
              onClick={toggleFocusMode}
              className="no-drag inline-flex h-7 items-center gap-1.5 rounded-md border border-border-strong bg-bg-elevated/80 px-2 text-[12px] font-bold uppercase tracking-[0.04em] text-text-secondary backdrop-blur hover:text-text-primary"
              title="Exit Focus Live Mode"
            >
              <Maximize2 size={12} />
              Exit Focus
            </button>
          )}
        </div>
        <LivePreviewPanel />
      </section>

      <section className="min-h-0 border-y border-white/[0.06] bg-bg-surface/82 shadow-[0_-1px_0_rgba(255,255,255,0.03),0_12px_34px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <ControlBar />
      </section>

      {!isFocusMode && (
        <section className="min-h-0 bg-bg-base">
          <TwoPanelLayout
            layoutKey="dashboardBottom"
            className="h-full min-h-0"
            leftClassName="min-w-0 border-r border-border-default p-2"
            rightClassName="min-w-0 p-2"
            left={<SongLibraryPanel />}
            right={
              <PlaylistPanel
                projectedSongId={projectedSongId}
                onItemClick={handlePlaylistItemClick}
              />
            }
          />
        </section>
      )}
    </div>
  )
}
