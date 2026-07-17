import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Book,
  Check,
  Clock,
  Edit3,
  FileEdit,
  Maximize2,
  Megaphone,
  Minus,
  Music2,
  Play,
  Plus,
  Star,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Square,
  Pause,
  MonitorPlay
} from 'lucide-react'
import { useInstrumentStore } from '@renderer/store/useInstrumentStore'
import { parseLrc, stripLrcTimestamps } from '@renderer/utils/lrcParser'
import { SongLibraryPanel } from '@renderer/components/SongLibraryPanel'
import { LivePreviewPanel } from '@renderer/components/LivePreviewPanel'
import { PlaylistPanel } from '@renderer/components/PlaylistPanel'
import { BiblePanel } from '@renderer/components/projection/BiblePanel'
import { AnnouncementPanel } from '@renderer/components/projection/AnnouncementPanel'
import { LocalMediaPanel } from '@renderer/components/projection/LocalMediaPanel'
import { PowerPointBridgePanel } from '@renderer/components/projection/PowerPointBridgePanel'
import { getPdfPageCount } from '@renderer/utils/pdfUtils'
import { parseMediaPlaylistDescriptor } from '../../../../shared/media-playlist'
import {
  getProjectionMediaMode,
  isPagedMediaKind,
  resolveMediaKind
} from '../../../../shared/media-kind'
import { AudioPanel } from '@renderer/components/projection/AudioPanel'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useNotificationStore } from '@renderer/store/useNotificationStore'
import { generateSlidesForSong, generateSlidesForPlaylistItem } from '@core/projection'
import { mediaEngine } from '@renderer/engine/mediaEngine'
import { useSongStore } from '@renderer/store/useSongStore'
import type { PlaylistItem, Song } from '@renderer/types'

type BottomRightTab = 'song-info' | 'bible' | 'announcement' | 'media-local' | 'powerpoint'

type SongInfoTab = 'info' | 'lyrics' | 'chord' | 'notes'

// ─── Hymnal color palette for song art ──────────────────────────────────────
const HYMNAL_COLORS: Record<string, string> = {
  LS: 'radial-gradient(circle at 70% 18%, rgba(56,189,248,0.45), transparent 34%), linear-gradient(135deg, rgba(29,78,216,0.65), rgba(88,28,135,0.5) 48%, rgba(2,6,23,0.95))',
  KJ: 'radial-gradient(circle at 70% 18%, rgba(251,146,60,0.45), transparent 34%), linear-gradient(135deg, rgba(154,52,18,0.65), rgba(120,53,15,0.5) 48%, rgba(2,6,23,0.95))',
  NKB: 'radial-gradient(circle at 70% 18%, rgba(74,222,128,0.45), transparent 34%), linear-gradient(135deg, rgba(21,128,61,0.65), rgba(20,83,45,0.5) 48%, rgba(2,6,23,0.95))',
  PKJ: 'radial-gradient(circle at 70% 18%, rgba(167,139,250,0.45), transparent 34%), linear-gradient(135deg, rgba(109,40,217,0.65), rgba(76,29,149,0.5) 48%, rgba(2,6,23,0.95))',
  KPPK: 'radial-gradient(circle at 70% 18%, rgba(251,191,36,0.45), transparent 34%), linear-gradient(135deg, rgba(161,98,7,0.65), rgba(120,53,15,0.5) 48%, rgba(2,6,23,0.95))'
}

function getSongArtGradient(hymnalCode?: string): string {
  if (!hymnalCode) return HYMNAL_COLORS['LS']
  const key = Object.keys(HYMNAL_COLORS).find((k) => hymnalCode.toUpperCase().startsWith(k))
  return key ? HYMNAL_COLORS[key] : HYMNAL_COLORS['LS']
}

// ─── Music theory helpers for chord tab ─────────────────────────────────────
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#'
}

function normalizeKey(key: string): string {
  const clean = key.trim().replace(/\s+/g, '')
  return ENHARMONIC[clean] ?? clean
}

function getRelativeChord(keyNote: string, degree: number): string {
  const root = normalizeKey(keyNote.split('/')[0])
  const idx = CHROMATIC_SCALE.indexOf(root)
  if (idx === -1) return '?'
  // Major scale intervals: W W H W W W H → semitones from root
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11]
  const semitones = majorIntervals[(degree - 1) % 7]
  return CHROMATIC_SCALE[(idx + semitones) % 12]
}

function getRelativeMinor(keyNote: string): string {
  // Relative minor is 9 semitones up (or 3 down) from major root
  const root = normalizeKey(keyNote.split('/')[0])
  const idx = CHROMATIC_SCALE.indexOf(root)
  if (idx === -1) return '?'
  return CHROMATIC_SCALE[(idx + 9) % 12] + 'm'
}

interface InstrumentPlayerWidgetProps {
  activeSong: Song
  instrumentPath: string
}

function InstrumentPlayerWidget({
  activeSong,
  instrumentPath
}: InstrumentPlayerWidgetProps): React.JSX.Element {
  const {
    isPlaying,
    currentTime,
    duration,
    monitorVolume,
    monitorMuted,
    autoAdvanceEnabled,
    activeLrcLines,
    setPlaying,
    setMonitorVolume,
    setMonitorMuted,
    setAutoAdvanceEnabled,
    setActiveLrcLines
  } = useInstrumentStore()

  const localAudioRef = useRef<HTMLAudioElement | null>(null)
  const normalizedUrl = instrumentPath ? `local-media:///${instrumentPath.replace(/\\/g, '/')}` : ''
  const lastTargetIndexRef = useRef<number | null>(null)

  const programSlides = useProjectionStore((s) => s.programSlides)
  const programSlideIndex = useProjectionStore((s) => s.programSlideIndex)

  // Sync volume & mute to native local audio
  useEffect(() => {
    if (localAudioRef.current) {
      localAudioRef.current.volume = monitorVolume / 100
      localAudioRef.current.muted = monitorMuted
    }
  }, [monitorVolume, monitorMuted, instrumentPath])

  // Load LRC timestamps
  useEffect(() => {
    if (!activeSong) {
      setActiveLrcLines([])
      return
    }

    // 1. Check if the song has inline LRC timestamps
    if (activeSong.lyrics_raw && /\[\d+:\d+(?:\.\d+)?\]/.test(activeSong.lyrics_raw)) {
      const parsed = parseLrc(activeSong.lyrics_raw)
      setActiveLrcLines(parsed)
      return
    }

    // 2. Otherwise, check for external LRC file next to the instrument audio file
    if (instrumentPath && window.api.file?.readLrc) {
      window.api.file
        .readLrc(instrumentPath)
        .then((content) => {
          if (content) {
            const parsed = parseLrc(content)
            setActiveLrcLines(parsed)
          } else {
            setActiveLrcLines([])
          }
        })
        .catch((err) => {
          console.error('Failed to read external LRC file:', err)
          setActiveLrcLines([])
        })
      return
    }

    setActiveLrcLines([])
  }, [activeSong, instrumentPath, setActiveLrcLines])

  // Listen to currentTime updates to trigger auto-advance
  useEffect(() => {
    if (!isPlaying || !autoAdvanceEnabled) return
    if (programSlides.length === 0) return

    // Find the slide that covers the currentTime
    const targetIdx = programSlides.findIndex(
      (slide) =>
        slide.startTime !== undefined &&
        currentTime >= slide.startTime &&
        (slide.endTime === undefined || currentTime < slide.endTime)
    )

    if (targetIdx !== -1 && targetIdx !== programSlideIndex) {
      lastTargetIndexRef.current = targetIdx
      useProjectionStore.getState().goToSlide(targetIdx)
    }
  }, [currentTime, isPlaying, autoAdvanceEnabled, programSlides, programSlideIndex])

  // Listen to manual slide selection to trigger seek (Smart Re-Sync)
  useEffect(() => {
    if (!isPlaying) return
    const audio = localAudioRef.current
    if (!audio) return

    if (programSlideIndex >= 0 && programSlideIndex < programSlides.length) {
      if (programSlideIndex !== lastTargetIndexRef.current) {
        const slide = programSlides[programSlideIndex]
        if (slide && slide.startTime !== undefined) {
          audio.currentTime = slide.startTime
          window.api.projection.instrumentControl('seek', slide.startTime)
          lastTargetIndexRef.current = programSlideIndex
        }
      }
    }
  }, [programSlideIndex, programSlides, isPlaying])

  // Clean up on unmount or path change
  useEffect(() => {
    return () => {
      setPlaying(false)
      window.api.projection.instrumentControl('stop')
    }
  }, [instrumentPath, setPlaying])

  const handlePlayPause = async (): Promise<void> => {
    const audio = localAudioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setPlaying(false)
      window.api.projection.instrumentControl('pause')
    } else {
      try {
        await audio.play()
        setPlaying(true)
        window.api.projection.instrumentControl('play')
      } catch (err) {
        console.error('Local audio play failed:', err)
      }
    }
  }

  const handleStop = (): void => {
    const audio = localAudioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    window.api.projection.instrumentControl('stop')
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const audio = localAudioRef.current
    if (!audio) return
    const val = Number(e.target.value)
    audio.currentTime = val
    window.api.projection.instrumentControl('seek', val)
  }

  const formatTime = (time: number): string => {
    if (isNaN(time)) return '00:00'
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleSelectManualFile = async (): Promise<void> => {
    try {
      const result = (await window.api.file.showOpenDialog({
        title: `Pilih Berkas Instrumen untuk ${activeSong.hymnal_code || 'LS'} ${activeSong.number}`,
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac'] }],
        properties: ['openFile']
      })) as { canceled: boolean; filePaths: string[] }

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0]
        const key = `${activeSong.hymnal_code}-${activeSong.number}`.toUpperCase()
        const currentMap = useInstrumentStore.getState().instrumentsMap
        useInstrumentStore.getState().setInstrumentsMap({
          ...currentMap,
          [key]: selectedPath
        })
      }
    } catch (err) {
      console.error('Failed to choose manual instrument:', err)
    }
  }

  // If no instrument is associated yet, show manual selection placeholder
  if (!instrumentPath) {
    return (
      <div className="p-3 border-t border-white/[0.06] bg-black/40 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-disabled uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-text-disabled/40" />
            Instrumen Musik
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02]">
          <span className="text-[10px] text-text-disabled leading-tight truncate">
            Tidak ada instrumen otomatis yang cocok
          </span>
          <button
            onClick={handleSelectManualFile}
            className="h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 active:scale-95 text-text-primary text-[9px] font-bold transition-all flex items-center gap-1 flex-shrink-0"
          >
            <Plus size={10} />
            Pilih Manual
          </button>
        </div>
      </div>
    )
  }

  const fileName = instrumentPath.split(/[\\/]/).pop() || 'Minus One'

  return (
    <div className="p-3 border-t border-white/[0.06] bg-black/40 flex flex-col gap-2 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1.5 min-w-0 flex-1 pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse flex-shrink-0" />
          <span className="truncate" title={fileName}>
            {fileName}
          </span>
        </span>
        <span className="text-[10px] text-text-disabled flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-brand-primary text-white'
              : 'bg-white/10 text-text-primary hover:bg-white/20'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-text-secondary flex items-center justify-center transition-all"
          title="Stop"
        >
          <Square size={10} fill="currentColor" />
        </button>

        {/* Auto Slide Toggle */}
        {activeLrcLines.length > 0 && (
          <button
            onClick={() => setAutoAdvanceEnabled(!autoAdvanceEnabled)}
            className={`h-7 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 flex-shrink-0 ${
              autoAdvanceEnabled
                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/20'
                : 'bg-white/5 border-white/[0.06] text-text-muted hover:bg-white/10 hover:text-text-primary'
            }`}
            title="Auto-Advance Slide Mengikuti Waktu Musik"
          >
            <Clock size={10} />
            <span>Auto Slide</span>
          </button>
        )}

        {/* Progress slider */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 rounded-lg appearance-none bg-white/10 accent-brand-primary outline-none cursor-pointer"
        />

        {/* Monitor Volume */}
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 h-7">
          <button
            onClick={() => setMonitorMuted(!monitorMuted)}
            className="text-text-muted hover:text-text-primary transition-colors"
            title={monitorMuted ? 'Unmute Monitor' : 'Mute Monitor'}
          >
            {monitorMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={monitorMuted ? 0 : monitorVolume}
            onChange={(e) => {
              const val = Number(e.target.value)
              setMonitorVolume(val)
              if (monitorMuted && val > 0) setMonitorMuted(false)
            }}
            className="w-12 h-1 accent-brand-primary outline-none"
            title="Volume Monitor PC Operator"
          />
        </div>
      </div>

      {normalizedUrl && (
        <audio
          ref={localAudioRef}
          src={normalizedUrl}
          onTimeUpdate={() => {
            if (localAudioRef.current) {
              useInstrumentStore
                .getState()
                .setTimeUpdate(
                  localAudioRef.current.currentTime,
                  localAudioRef.current.duration || 0
                )
            }
          }}
          onLoadedMetadata={() => {
            if (localAudioRef.current) {
              useInstrumentStore
                .getState()
                .setTimeUpdate(
                  localAudioRef.current.currentTime,
                  localAudioRef.current.duration || 0
                )
            }
          }}
          onEnded={() => {
            setPlaying(false)
            window.api.projection.instrumentControl('stop')
          }}
        />
      )}
    </div>
  )
}

function SongInfoPanel(): React.JSX.Element {
  const { selectedSong, setSelectedSong, setEditingSong, setScreen, showToast } = useAppStore()
  const songs = useSongStore((s) => s.songs)
  const setSongs = useSongStore((s) => s.setSongs)
  const activeItemIndex = usePlaylistStore((s) => s.activeItemIndex)
  const playlistItems = usePlaylistStore((s) => s.playlistItems)
  const activePlaylist = usePlaylistStore((s) => s.activePlaylist)
  const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist)
  const { setSlides } = useProjectionStore()
  const lyricsFontSizePercent = useProjectionStore((s) => s.lyricsFontSizePercent)
  const increaseLyricsFontSize = useProjectionStore((s) => s.increaseLyricsFontSize)
  const decreaseLyricsFontSize = useProjectionStore((s) => s.decreaseLyricsFontSize)
  const resetLyricsFontSize = useProjectionStore((s) => s.resetLyricsFontSize)
  const activePlaylistItem = playlistItems[activeItemIndex]
  const activeSong = selectedSong ?? songs.find((song) => song.id === activePlaylistItem?.song_id)

  // Instrument indexing with LS/LSEL cross-lookup fallback support
  const { instrumentsMap } = useInstrumentStore()
  const instrumentPath = useMemo(() => {
    if (!activeSong) return ''
    const code = (activeSong.hymnal_code || '').toUpperCase()
    const num = activeSong.number
    const primaryKey = `${code}-${num}`
    if (instrumentsMap[primaryKey]) {
      return instrumentsMap[primaryKey]
    }
    // Fallback cross-lookup between LS and LSEL
    if (code === 'LS') {
      return instrumentsMap[`LSEL-${num}`] || ''
    }
    if (code === 'LSEL') {
      return instrumentsMap[`LS-${num}`] || ''
    }
    return ''
  }, [activeSong, instrumentsMap])

  // Load instrument path into projection window when activeSong changes
  useEffect(() => {
    window.api.projection.instrumentControl('load', instrumentPath)
  }, [instrumentPath])

  const [activeTab, setActiveTab] = useState<SongInfoTab>('info')
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false)
  const [addedToPlaylist, setAddedToPlaylist] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const [localNote, setLocalNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  const activeSongId = activeSong?.id

  useEffect(() => {
    if (activeSongId === undefined) return
    let active = true
    window.api.songs
      .getNote(activeSongId)
      .then((text) => {
        if (active) setLocalNote(text || '')
      })
      .catch((err) => {
        console.error('Failed to get song note:', err)
      })
    return () => {
      active = false
    }
  }, [activeSongId])

  const handleSaveNote = async (): Promise<void> => {
    if (!activeSong) return
    setIsSavingNote(true)
    try {
      await window.api.songs.updateNote(activeSong.id, localNote)
      showToast('Catatan operator berhasil disimpan', 'success')
    } catch (err) {
      console.error('Failed to save song note:', err)
      showToast('Gagal menyimpan catatan', 'error')
    } finally {
      setIsSavingNote(false)
    }
  }
  const lyricsRef = useRef<HTMLDivElement>(null)

  // Reset added state when song changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAddedToPlaylist(false)
  }, [activeSong?.id])

  const metaRows = useMemo(() => {
    if (!activeSong) return []
    const rows: Array<[string, string, boolean?]> = []
    if (activeSong.author) rows.push(['Penulis', activeSong.author])
    if (activeSong.composer) rows.push(['Komposer', activeSong.composer])
    rows.push(['Tema', activeSong.category || activeSong.theme || 'Pujian'])
    if (activeSong.tempo) rows.push(['Tempo', activeSong.tempo])
    if (activeSong.time_signature) rows.push(['Birama', activeSong.time_signature])
    if (activeSong.key_note) rows.push(['Nada Dasar', activeSong.key_note])
    if (activeSong.language) rows.push(['Bahasa', activeSong.language])
    if (activeSong.scripture_reference) rows.push(['Referensi', activeSong.scripture_reference])
    rows.push(['Copyright', '-'])
    return rows
  }, [activeSong])

  /** Parse lyrics into structured sections */
  const lyricsSections = useMemo(() => {
    if (!activeSong?.lyrics_raw) return []
    const raw = stripLrcTimestamps(activeSong.lyrics_raw)
    const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim())
    return blocks.map((block) => {
      const lines = block.split('\n')
      const firstLine = lines[0]?.trim() || ''
      const headerMatch = firstLine.match(/^\[([^\]]+)\]$/)
      if (headerMatch) {
        return {
          header: headerMatch[1],
          lines: lines
            .slice(1)
            .map((l) => l.trim())
            .filter(Boolean)
        }
      }
      return { header: null, lines: lines.map((l) => l.trim()).filter(Boolean) }
    })
  }, [activeSong])

  /** Build operator notes from song metadata */
  const operatorNotes = useMemo(() => {
    if (!activeSong) return []
    const notes: Array<{ label: string; content: string; highlight?: boolean }> = []
    if (activeSong.key_note) {
      notes.push({
        label: 'Kunci & Modulasi',
        content: `Kunci dasar: ${activeSong.key_note}${activeSong.time_signature ? ` • Birama: ${activeSong.time_signature}` : ''}${activeSong.tempo ? ` • Tempo: ${activeSong.tempo}` : ''}`,
        highlight: true
      })
    }
    if (activeSong.category || activeSong.theme) {
      notes.push({
        label: 'Kategori & Tema',
        content: [activeSong.category, activeSong.theme].filter(Boolean).join(' • ')
      })
    }
    if (activeSong.hymnal_name) {
      notes.push({
        label: 'Sumber',
        content: `${activeSong.hymnal_name}${activeSong.number ? ` No. ${activeSong.number}` : ''}`
      })
    }
    if (activeSong.scripture_reference) {
      notes.push({ label: 'Referensi Alkitab', content: activeSong.scripture_reference })
    }
    if (activeSong.tags) {
      notes.push({ label: 'Tags', content: activeSong.tags })
    }
    notes.push({
      label: 'Panduan Operator',
      content: `${lyricsSections.length} bait/section tersedia. Gunakan ← → atau klik slide di Preview untuk navigasi.`
    })
    return notes
  }, [activeSong, lyricsSections.length])

  const handlePreview = (): void => {
    if (!activeSong) return
    setSlides(generateSlidesForSong(activeSong), {
      hymnalCode: activeSong.hymnal_code || 'LS',
      hymnalName: activeSong.hymnal_name || 'Lagu Sion',
      songBackgroundConfig: activeSong.song_background_config || ''
    })
    showToast(`Cue "${activeSong.title}" masuk ke Preview`, 'success')
  }

  const handleEditLyrics = (): void => {
    if (!activeSong) return
    setEditingSong(activeSong)
    setScreen('song-editor')
  }

  const handleAddToPlaylist = async (): Promise<void> => {
    if (!activeSong || isAddingToPlaylist) return
    if (!activePlaylist) {
      showToast('Buka atau buat playlist terlebih dahulu', 'error')
      return
    }
    setIsAddingToPlaylist(true)
    try {
      await addSongToPlaylist(activeSong)
      setAddedToPlaylist(true)
      showToast(`"${activeSong.title}" ditambahkan ke playlist`, 'success')
      // Reset checkmark after 2s
      setTimeout(() => setAddedToPlaylist(false), 2000)
    } catch {
      // The playlist store owns failure logging and user feedback.
    } finally {
      setIsAddingToPlaylist(false)
    }
  }

  /** Toggle favorite with optimistic update */
  const handleToggleFavorite = async (): Promise<void> => {
    if (!activeSong || isFavoriteLoading) return
    setIsFavoriteLoading(true)
    const newFav = activeSong.is_favorite ? 0 : 1
    const updatedSong = { ...activeSong, is_favorite: newFav }
    // FIX: optimistic update BOTH songs array AND selectedSong so isFavorite
    // reflects immediately in the UI (activeSong = selectedSong ?? songs.find(...))
    setSongs(songs.map((s) => (s.id === activeSong.id ? updatedSong : s)))
    setSelectedSong(updatedSong)
    try {
      await window.api.songs.toggleFavorite(activeSong.id)
    } catch {
      // Rollback on error — restore both
      setSongs(
        songs.map((s) =>
          s.id === activeSong.id ? { ...s, is_favorite: activeSong.is_favorite } : s
        )
      )
      setSelectedSong(activeSong)
      showToast('Gagal mengubah status favorit', 'error')
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  const isFavorite = activeSong?.is_favorite === 1

  const tabButtons = (
    <div className="projection-song-panel__tabs" role="tablist" aria-label="Song info tabs">
      <div className="projection-song-panel__tab-track">
        {[
          { id: 'info' as const, label: 'Info' },
          { id: 'lyrics' as const, label: 'Lirik' },
          { id: 'chord' as const, label: 'Chord' },
          { id: 'notes' as const, label: 'Notes' }
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`projection-song-panel__tab ${activeTab === tab.id ? 'is-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (!activeSong) {
    return (
      <aside className="projection-song-info-panel projection-song-panel">
        {tabButtons}
        <div className="projection-song-panel__empty">
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 flex flex-col items-center gap-3">
            <Music2 size={28} className="opacity-40" />
            <p className="text-[12px] leading-relaxed max-w-[200px]">
              Pilih lagu dari library atau rundown untuk melihat detail operator.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="projection-song-info-panel projection-song-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {tabButtons}

        {/* ── Info Tab ── */}
        {activeTab === 'info' && (
          <div id="tabpanel-info" role="tabpanel" className="projection-song-panel__pane">
            <div className="projection-song-panel__scroll projection-song-panel__scroll--info">
              {/* Song header: art + title + actions */}
              <div className="flex items-start gap-3">
                <div
                  className="projection-song-art"
                  style={{ background: getSongArtGradient(activeSong.hymnal_code) }}
                >
                  <span>{activeSong.hymnal_code || 'SION'}</span>
                  <strong>{activeSong.number || '—'}</strong>
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-[16px] font-black tracking-tight text-text-primary leading-tight"
                    title={activeSong.title}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {activeSong.title}
                  </h3>
                  {(activeSong.alternate_title || activeSong.title_en) && (
                    <p className="mt-0.5 truncate text-[12px] text-text-muted italic">
                      {activeSong.alternate_title || activeSong.title_en}
                    </p>
                  )}
                  {activeSong.hymnal_name && (
                    <p className="mt-0.5 truncate text-[11px] text-text-muted/70">
                      {activeSong.hymnal_name}
                    </p>
                  )}
                  {/* Action row: favorite + add to playlist */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      className={`projection-icon-button projection-icon-button--favorite ${isFavorite ? 'is-active' : ''} ${isFavoriteLoading ? 'opacity-50' : ''}`}
                      title={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                      aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                      aria-pressed={isFavorite}
                      onClick={() => void handleToggleFavorite()}
                      disabled={isFavoriteLoading}
                    >
                      <Star
                        size={14}
                        fill={isFavorite ? 'currentColor' : 'none'}
                        strokeWidth={isFavorite ? 0 : 1.8}
                      />
                    </button>
                    <button
                      className={`projection-icon-button ${addedToPlaylist ? 'projection-icon-button--success' : ''}`}
                      title={addedToPlaylist ? 'Ditambahkan!' : 'Tambah ke playlist'}
                      aria-label={`Tambah ${activeSong.title} ke playlist`}
                      onClick={() => void handleAddToPlaylist()}
                      disabled={isAddingToPlaylist}
                    >
                      {addedToPlaylist ? <Check size={14} /> : <Plus size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Meta table */}
              <div className="projection-meta-table">
                {metaRows.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong title={value}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="projection-song-panel__actions">
              <button className="projection-action-button" onClick={handlePreview}>
                <Play size={13} />
                Preview
              </button>
              <button className="projection-action-button" onClick={handleEditLyrics}>
                <Edit3 size={13} />
                Edit Lirik
              </button>
              <button className="projection-action-button" onClick={() => setActiveTab('chord')}>
                <Music2 size={13} />
                Chord
              </button>
            </div>
          </div>
        )}

        {/* ── Lirik Tab ── */}
        {activeTab === 'lyrics' && (
          <div id="tabpanel-lyrics" role="tabpanel" className="projection-song-panel__pane">
            {/* Toolbar: song ref + zoom controls */}
            <div className="projection-song-panel__toolbar">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0">
                  {activeSong.hymnal_code} {activeSong.number}
                </span>
                <span className="text-[10px] text-text-muted/50">•</span>
                <span className="text-[11px] font-semibold text-text-secondary truncate">
                  {activeSong.title}
                </span>
              </div>
              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={decreaseLyricsFontSize}
                  className="projection-zoom-btn"
                  title="Perkecil teks (Ctrl+-)"
                  aria-label="Perkecil teks"
                >
                  <Minus size={10} />
                </button>
                <button
                  onClick={resetLyricsFontSize}
                  className="projection-zoom-label"
                  title="Reset zoom (Ctrl+0)"
                  aria-label="Reset zoom"
                >
                  {lyricsFontSizePercent}%
                </button>
                <button
                  onClick={increaseLyricsFontSize}
                  className="projection-zoom-btn"
                  title="Perbesar teks (Ctrl++)"
                  aria-label="Perbesar teks"
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
            {/* Lyrics content */}
            <div
              ref={lyricsRef}
              className="projection-song-panel__scroll projection-song-panel__lyrics"
              style={{
                fontSize: `${lyricsFontSizePercent}%`,
                transition: 'font-size 0.15s ease-in-out'
              }}
            >
              {lyricsSections.length > 0 ? (
                lyricsSections.map((section, idx) => (
                  <div key={idx}>
                    {section.header && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/70 bg-brand-primary/[0.06] px-2 py-0.5 rounded-md">
                          {section.header}
                        </span>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {section.lines.map((line, lineIdx) => (
                        <p
                          key={lineIdx}
                          className="text-[0.8125rem] text-text-primary leading-relaxed font-medium"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-center py-8 text-text-muted">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 flex flex-col items-center gap-2">
                    <Edit3 size={22} className="opacity-40" />
                    <p className="text-[12px]">Belum ada lirik untuk lagu ini</p>
                    <button
                      onClick={handleEditLyrics}
                      className="text-[11px] font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors"
                    >
                      Tambah lirik →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chord Tab ── */}
        {activeTab === 'chord' && (
          <div id="tabpanel-chord" role="tabpanel" className="projection-song-panel__pane">
            <div className="projection-song-panel__toolbar">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Chord Sheet
              </span>
              <button
                onClick={handleEditLyrics}
                className="text-[10px] font-semibold text-brand-primary/70 hover:text-brand-primary transition-colors flex items-center gap-1"
              >
                <Edit3 size={10} />
                Edit
              </button>
            </div>
            <div className="projection-song-panel__scroll projection-song-panel__chords">
              {/* Key info pills */}
              <div className="flex flex-wrap gap-2">
                {activeSong.key_note && (
                  <div className="projection-chord-pill projection-chord-pill--key">
                    <span className="label">Nada Dasar</span>
                    <strong>{activeSong.key_note}</strong>
                  </div>
                )}
                {activeSong.time_signature && (
                  <div className="projection-chord-pill">
                    <span className="label">Birama</span>
                    <strong>{activeSong.time_signature}</strong>
                  </div>
                )}
                {activeSong.tempo && (
                  <div className="projection-chord-pill">
                    <span className="label">Tempo</span>
                    <strong>{activeSong.tempo}</strong>
                  </div>
                )}
              </div>

              {/* Chord content or empty state */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                {activeSong.key_note ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Music2 size={13} className="text-brand-primary/60" />
                      <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Informasi Musik
                      </span>
                    </div>

                    {/* Key circle — show related chords */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Tonika (I)', chord: activeSong.key_note },
                        {
                          label: 'Sub-Dominan (IV)',
                          chord: getRelativeChord(activeSong.key_note, 4)
                        },
                        { label: 'Dominan (V)', chord: getRelativeChord(activeSong.key_note, 5) },
                        { label: 'Relatif Minor', chord: getRelativeMinor(activeSong.key_note) }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col gap-0.5 p-2 rounded-lg bg-black/20 border border-white/[0.04]"
                        >
                          <span className="text-[9px] font-semibold text-text-disabled uppercase tracking-wider">
                            {item.label}
                          </span>
                          <strong className="text-[14px] font-black text-text-primary">
                            {item.chord}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-text-disabled leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/[0.04]">
                      Chord sheet lengkap belum tersedia. Gunakan tombol{' '}
                      <button
                        onClick={handleEditLyrics}
                        className="text-brand-primary hover:underline font-semibold"
                      >
                        Edit Lirik
                      </button>{' '}
                      untuk menambahkan chord pada lirik.
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 text-center text-text-muted">
                    <Music2 size={22} className="opacity-30" />
                    <p className="text-[12px]">Metadata nada dasar belum diatur</p>
                    <button
                      onClick={handleEditLyrics}
                      className="text-[11px] font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors"
                    >
                      Atur nada dasar →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Notes Tab ── */}
        {activeTab === 'notes' && (
          <div id="tabpanel-notes" role="tabpanel" className="projection-song-panel__pane">
            <div className="projection-song-panel__toolbar">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Operator Notes
              </span>
            </div>
            <div className="projection-song-panel__scroll projection-song-panel__notes">
              {/* Custom Notes Editor */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 flex flex-col gap-2 mb-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Catatan Kustom Operator
                  </h4>
                  <span className="text-[9px] text-text-disabled bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                    Edit langsung
                  </span>
                </div>
                <textarea
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  placeholder="Ketik pengingat ibadah untuk lagu ini..."
                  className="w-full h-[72px] text-[11px] text-text-primary placeholder:text-text-disabled bg-black/25 border border-white/[0.05] focus:border-brand-primary/45 p-2 rounded-lg resize-none outline-none transition-all scrollbar-thin"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-[11px] font-bold transition-all disabled:opacity-50"
                >
                  <FileEdit size={11} className={isSavingNote ? 'animate-pulse' : ''} />
                  {isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>

              {operatorNotes.map((note, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 ${
                    note.highlight
                      ? 'bg-brand-primary/[0.05] border-brand-primary/15'
                      : 'bg-white/[0.02] border-white/[0.04]'
                  }`}
                >
                  <h4
                    className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${note.highlight ? 'text-brand-primary/60' : 'text-text-muted'}`}
                  >
                    {note.label}
                  </h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed font-medium">
                    {note.content}
                  </p>
                </div>
              ))}

              {/* Quick actions */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 mt-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Aksi Cepat
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={handlePreview}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/15 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Play size={10} />
                    Preview
                  </button>
                  <button
                    onClick={handleEditLyrics}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.06] px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Edit3 size={10} />
                    Edit
                  </button>
                  <button
                    onClick={() => void handleAddToPlaylist()}
                    disabled={isAddingToPlaylist || addedToPlaylist}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.06] px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {addedToPlaylist ? <Check size={10} /> : <Plus size={10} />}
                    {addedToPlaylist ? 'Ditambahkan' : 'Playlist'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <InstrumentPlayerWidget activeSong={activeSong} instrumentPath={instrumentPath} />
    </aside>
  )
}

export function ProjectionMode(): React.JSX.Element {
  const { playlistItems } = usePlaylistStore()
  const {
    isFocusMode,
    toggleFocusMode,
    loadHymnals,
    loadSongs,
    setSelectedSong,
    songs,
    showToast
  } = useAppStore()
  const { setSlides, programSlide, isAudioPanelVisible, toggleAudioPanel } = useProjectionStore()
  const [scenePreset, setScenePreset] = useState('1')
  const [bottomRightTab, setBottomRightTab] = useState<BottomRightTab>('song-info')
  const [pendingPowerPointRequests, setPendingPowerPointRequests] = useState(0)
  const notifiedPowerPointRequestIds = useRef<Set<string>>(new Set())
  useEffect(() => {
    const updatePending = (status: {
      requests: Array<{
        id: string
        status: string
        deviceName?: string
        deckName?: string
        address?: string
      }>
    }): void => {
      const pendingRequests = status.requests.filter((request) => request.status === 'pending')
      setPendingPowerPointRequests(pendingRequests.length)
      for (const request of pendingRequests) {
        if (notifiedPowerPointRequestIds.current.has(request.id)) continue
        notifiedPowerPointRequestIds.current.add(request.id)
        const deviceName = request.deviceName || 'Perangkat pemateri'
        const deckName = request.deckName || 'PowerPoint'
        showToast(`${deviceName} meminta izin PowerPoint Bridge`, 'info')
        useNotificationStore.getState().add({
          title: 'Permintaan PowerPoint Bridge',
          message: `${deviceName} ingin mengirim "${deckName}". Buka tab PPT untuk Izinkan atau Tolak.`,
          level: 'warning',
          category: 'projection',
          actionLabel: 'Buka tab PPT',
          actionKey: 'open-powerpoint-bridge'
        })
      }
    }
    void window.api.presenterRemote.powerPointStatus().then(updatePending)
    return window.api.presenterRemote.onPowerPointStatus(updatePending)
  }, [showToast])
  const projectedSongId = programSlide?.songId ?? null

  /** Phase 4: Preload next song's background asset 500ms after selection */
  const scheduleNextSongPreload = useCallback(
    (currentIndex: number): void => {
      const nextItem = playlistItems[currentIndex + 1]
      if (!nextItem) return
      const nextSong = songs.find((s) => s.id === nextItem.song_id) as Song | undefined
      if (!nextSong?.song_background_config) return
      try {
        const cfg = JSON.parse(nextSong.song_background_config) as {
          mediaUrl?: string
          type?: string
        }
        if (cfg.mediaUrl) {
          setTimeout(() => {
            if (cfg.type === 'video') {
              mediaEngine.preloadVideo(cfg.mediaUrl!).catch(() => {})
            } else {
              mediaEngine.preloadImage(cfg.mediaUrl!).catch(() => {})
            }
          }, 500)
        }
      } catch {
        // ignore malformed config
      }
    },
    [playlistItems, songs]
  )

  const handlePlaylistItemClick = async (item: PlaylistItem, index: number): Promise<void> => {
    usePlaylistStore.getState().setActiveItemIndex(index)
    if (item.item_type === 'info') {
      setSelectedSong(null)
      setSlides(generateSlidesForPlaylistItem(item), {
        hymnalCode: 'INFO',
        hymnalName: item.title || 'Info',
        songBackgroundConfig: ''
      })
      return
    }
    if (item.item_type === 'bible') {
      setSelectedSong(null)
      const bibleSlides = generateSlidesForPlaylistItem(item)
      setSlides(bibleSlides, {
        hymnalCode: item.bible_version_short_name || item.bible_version_code || 'BIBLE',
        hymnalName: item.bible_book_name || 'Alkitab',
        songBackgroundConfig: ''
      })
      return
    }
    if (item.item_type === 'media') {
      setSelectedSong(null)
      const mediaDescriptor = parseMediaPlaylistDescriptor(item.notes)
      const mediaPath = mediaDescriptor.path
      const mediaKind = resolveMediaKind({
        path: mediaPath,
        hasPresentationPackage: Boolean(mediaDescriptor.presentation?.slides.length)
      })
      const mode = getProjectionMediaMode(mediaKind)

      const mediaConfig = JSON.stringify({
        mode,
        media: {
          path: mediaPath
        },
        opacity: 100,
        blur: 0
      })

      let slides = generateSlidesForPlaylistItem(item)
      if (isPagedMediaKind(mediaKind) && mediaPath) {
        try {
          const pageCount = await getPdfPageCount(mediaPath)
          const hasSlideImages = mediaDescriptor.presentation?.slides.some((slide) =>
            Boolean(slide.imagePath)
          )
          slides = Array.from({ length: pageCount }).map((_, idx) => {
            const slideImagePath = hasSlideImages
              ? mediaDescriptor.presentation?.slides[idx]?.imagePath
              : undefined
            return {
              contentType: 'media',
              songId: null,
              playlistItemId: item.id,
              slideIndex: idx,
              text: '',
              sectionLabel:
                mediaDescriptor.presentation?.slides[idx]?.title || `Halaman ${idx + 1}`,
              speakerNotes: mediaDescriptor.presentation?.slides[idx]?.notes || '',
              pdfPath: slideImagePath ? undefined : mediaPath,
              visualImagePath: slideImagePath,
              mediaKind,
              mediaSourcePath: mediaPath,
              mediaPageNumber: idx + 1
            }
          })
        } catch (err) {
          console.error('Failed to get PDF page count:', err)
        }
      }

      setSlides(slides, {
        hymnalCode: isPagedMediaKind(mediaKind) ? 'PDF' : 'MEDIA',
        hymnalName: item.title || 'Media',
        songBackgroundConfig: mediaConfig
      })
      return
    }
    const song = songs.find((s) => s.id === item.song_id)
    if (song) {
      setSelectedSong(song)
      setSlides(generateSlidesForSong(song), {
        hymnalCode: song.hymnal_code || 'LS',
        hymnalName: song.hymnal_name || 'Lagu Sion',
        songBackgroundConfig: song.song_background_config || ''
      })
      // Phase 4: preload next song background
      scheduleNextSongPreload(index)
    }
  }

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  useEffect(() => {
    const handleSceneChange = (event: Event): void => {
      const scene = (event as CustomEvent<string>).detail
      if (['1', '2', '3', '4'].includes(scene)) setScenePreset(scene)
    }

    window.addEventListener('projection-scene-change', handleSceneChange)
    return () => window.removeEventListener('projection-scene-change', handleSceneChange)
  }, [])

  // Keyboard shortcuts for lyrics zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const { increaseLyricsFontSize, decreaseLyricsFontSize, resetLyricsFontSize } =
        useProjectionStore.getState()

      // Ctrl++ or Cmd++ to increase font size
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        increaseLyricsFontSize()
      }
      // Ctrl+- or Cmd+- to decrease font size
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        decreaseLyricsFontSize()
      }
      // Ctrl+0 or Cmd+0 to reset font size
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetLyricsFontSize()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      className={`h-full w-full overflow-hidden bg-bg-base text-text-primary projection-layout-v2 projection-scene-${scenePreset} ${
        isFocusMode ? 'projection-layout--focus' : ''
      }`}
    >
      <section
        className={`relative min-h-0 overflow-hidden px-5 pt-3 pb-0 ${
          isFocusMode
            ? 'h-full ring-1 ring-brand-primary/10 shadow-[0_0_60px_rgba(59,130,246,0.06)]'
            : ''
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

      <section className="min-h-0 flex-1 overflow-hidden px-5 pb-3">
        {/* FIX UX-07: management section now uses AnimatePresence + motion.div
            so focus mode toggle has a smooth fade+slide animation instead of
            an instant jarring layout shift. */}
        <AnimatePresence initial={false}>
          {!isFocusMode && (
            <motion.div
              key="management"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`projection-bottom-workspace h-full ${isAudioPanelVisible ? 'projection-bottom-workspace--with-audio' : ''}`}
            >
              <SongLibraryPanel />
              <PlaylistPanel
                projectedSongId={projectedSongId}
                onItemClick={handlePlaylistItemClick}
              />

              {/* Phase 7: Tabbed bottom-right panel */}
              <div className="projection-utility-panel">
                {/* ── Outer tab bar + timer toggle ── */}
                <div className="projection-utility-tabs">
                  <div
                    className="projection-utility-tabs__track"
                    role="tablist"
                    aria-label="Panel tabs"
                  >
                    {(
                      [
                        { id: 'song-info', label: 'Lagu', icon: <Music2 size={12} /> },
                        { id: 'bible', label: 'Alkitab', icon: <Book size={12} /> },
                        { id: 'announcement', label: 'Info', icon: <Megaphone size={12} /> },
                        { id: 'media-local', label: 'Media', icon: <ImageIcon size={12} /> },
                        {
                          id: 'powerpoint',
                          label: 'PPT',
                          icon: <MonitorPlay size={12} />,
                          badge: pendingPowerPointRequests || undefined
                        }
                      ] as Array<{
                        id: BottomRightTab
                        label: string
                        icon: React.ReactNode
                        badge?: number
                      }>
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={bottomRightTab === tab.id}
                        type="button"
                        onClick={() => setBottomRightTab(tab.id)}
                        className={`projection-utility-tabs__tab ${bottomRightTab === tab.id ? 'is-active' : ''}`}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span className="projection-utility-tabs__badge">
                            {tab.badge > 9 ? '9+' : tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Timer toggle */}
                  <button
                    onClick={toggleAudioPanel}
                    className={`projection-utility-tabs__timer ${isAudioPanelVisible ? 'is-active' : ''}`}
                    aria-pressed={isAudioPanelVisible}
                    aria-label={
                      isAudioPanelVisible ? 'Sembunyikan panel timer' : 'Tampilkan panel timer'
                    }
                    title={
                      isAudioPanelVisible ? 'Sembunyikan panel timer' : 'Tampilkan panel timer'
                    }
                  >
                    <Clock size={13} />
                  </button>
                </div>

                {/* ── Tab content — panels render WITHOUT their own tab bar ── */}
                <div className="projection-utility-panel__content">
                  {bottomRightTab === 'song-info' && <SongInfoPanel />}
                  {bottomRightTab === 'bible' && <BiblePanel />}
                  {bottomRightTab === 'announcement' && <AnnouncementPanel />}
                  {bottomRightTab === 'media-local' && <LocalMediaPanel />}
                  {bottomRightTab === 'powerpoint' && <PowerPointBridgePanel />}
                </div>
              </div>

              {/* Audio Panel - 4th column, collapsible */}
              <AnimatePresence initial={false}>
                {isAudioPanelVisible && (
                  <motion.div
                    key="audio-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-0 overflow-hidden"
                  >
                    <AudioPanel />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
