import React, { useEffect, useMemo, useState } from 'react'
import { Edit3, Maximize2, Music2, Play, Plus, Star } from 'lucide-react'
import { SongLibraryPanel } from '../../components/SongLibraryPanel'
import { LivePreviewPanel } from '../../components/LivePreviewPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useAppStore } from '../../store/useAppStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { generateSlidesForSong } from '../../engine/slideEngine'
import type { PlaylistItem } from '../../types'

function SongInfoPanel(): React.JSX.Element {
  const { selectedSong, songs, setEditingSong, setScreen, showToast } = useAppStore()
  const activeItemIndex = usePlaylistStore((s) => s.activeItemIndex)
  const playlistItems = usePlaylistStore((s) => s.playlistItems)
  const activePlaylist = usePlaylistStore((s) => s.activePlaylist)
  const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist)
  const { setSlides } = useProjectionStore()
  const activePlaylistItem = playlistItems[activeItemIndex]
  const activeSong = selectedSong ?? songs.find((song) => song.id === activePlaylistItem?.song_id)

  const metaRows = useMemo(() => {
    if (!activeSong) return []
    return [
      ['Penulis', activeSong.author || 'Unknown'],
      ['Komposer', activeSong.composer || 'Unknown'],
      ['Tema', activeSong.category || activeSong.theme || 'Pujian'],
      ['Tempo', activeSong.tempo || '72 BPM'],
      ['Birama', activeSong.time_signature || '4/4'],
      ['Key', activeSong.key_note || 'G'],
      ['Bahasa', activeSong.language || 'Indonesia'],
      ['Hak Cipta', 'SION Media']
    ]
  }, [activeSong])

  const handlePreview = (): void => {
    if (!activeSong) return
    setSlides(generateSlidesForSong(activeSong), {
      hymnalCode: activeSong.hymnal_code || 'LS',
      hymnalName: activeSong.hymnal_name || 'Lagu Sion'
    })
    showToast(`Cue "${activeSong.title}" masuk ke Preview`, 'success')
  }

  const handleEditLyrics = (): void => {
    if (!activeSong) return
    setEditingSong(activeSong)
    setScreen('song-editor')
  }

  const handleAddToPlaylist = async (): Promise<void> => {
    if (!activeSong) return
    if (!activePlaylist) {
      showToast('Buka atau buat playlist terlebih dahulu', 'error')
      return
    }
    await addSongToPlaylist(activeSong)
    showToast(`"${activeSong.title}" ditambahkan ke playlist`, 'success')
  }

  if (!activeSong) {
    return (
      <aside className="projection-song-info-panel">
        <div className="projection-panel-tabs">
          <button className="is-active">Song Info</button>
          <button>Lirik</button>
          <button>Notes</button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-text-muted">
          <Music2 size={30} />
          <p className="max-w-[220px] text-[12px] leading-relaxed">
            Pilih lagu dari library atau rundown untuk melihat metadata operator.
          </p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="projection-song-info-panel">
      <div className="projection-panel-tabs">
        <button className="is-active">Song Info</button>
        <button>Lirik</button>
        <button>Notes</button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          <div className="projection-song-art">
            <span>{activeSong.hymnal_code || 'SION'}</span>
            <strong>{activeSong.number}</strong>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[17px] font-black tracking-tight text-text-primary">
                {activeSong.title}
              </h3>
              <Star size={17} className="shrink-0 text-brand-accent" fill="currentColor" />
              <button
                className="projection-icon-button"
                title="Tambah ke playlist"
                onClick={handleAddToPlaylist}
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="mt-1 truncate text-[13px] text-text-muted">
              {activeSong.alternate_title ||
                activeSong.title_en ||
                activeSong.hymnal_name ||
                'SION Media'}
            </p>
          </div>
        </div>

        <div className="projection-meta-table">
          {metaRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2">
          <button className="projection-action-button" onClick={handlePreview}>
            <Play size={14} />
            Preview
          </button>
          <button className="projection-action-button" onClick={handleEditLyrics}>
            <Edit3 size={14} />
            Edit Lirik
          </button>
          <button
            className="projection-action-button"
            onClick={() => showToast('Panel chord akan mengikuti metadata lagu ini', 'info')}
          >
            <Music2 size={14} />
            Chord
          </button>
        </div>
      </div>
    </aside>
  )
}

export function ProjectionMode(): React.JSX.Element {
  const { playlistItems } = usePlaylistStore()
  const { isFocusMode, toggleFocusMode, loadHymnals, loadSongs, setSelectedSong, songs } =
    useAppStore()
  const { setSlides, programSlide } = useProjectionStore()
  const [scenePreset, setScenePreset] = useState('1')
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

  useEffect(() => {
    const handleSceneChange = (event: Event): void => {
      const scene = (event as CustomEvent<string>).detail
      if (['1', '2', '3', '4'].includes(scene)) setScenePreset(scene)
    }

    window.addEventListener('projection-scene-change', handleSceneChange)
    return () => window.removeEventListener('projection-scene-change', handleSceneChange)
  }, [])

  return (
    <div
      className={`h-full w-full overflow-hidden bg-bg-base text-text-primary projection-layout projection-layout-v2 projection-scene-${scenePreset} ${
        isFocusMode ? 'projection-layout--focus' : ''
      }`}
    >
      <section
        className={`relative min-h-0 overflow-hidden px-5 pt-3 ${
          isFocusMode ? 'ring-1 ring-brand-primary/10 shadow-[0_0_60px_rgba(59,130,246,0.06)]' : ''
        }`}
      >
        <div className="absolute left-7 top-3 z-20 flex items-center gap-2">
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

      <section className="min-h-0 overflow-hidden px-5 pb-3">
        <div className="projection-bottom-workspace">
          <SongLibraryPanel />
          <PlaylistPanel projectedSongId={projectedSongId} onItemClick={handlePlaylistItemClick} />
          <SongInfoPanel />
        </div>
      </section>
    </div>
  )
}
