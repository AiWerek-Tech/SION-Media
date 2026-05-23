import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Book,
  Check,
  Edit3,
  Maximize2,
  Megaphone,
  Minus,
  Music2,
  Play,
  Plus,
  Star,
  Volume2
} from 'lucide-react'
import { SongLibraryPanel } from '@renderer/components/SongLibraryPanel'
import { LivePreviewPanel } from '@renderer/components/LivePreviewPanel'
import { PlaylistPanel } from '@renderer/components/PlaylistPanel'
import { BiblePanel } from '@renderer/components/projection/BiblePanel'
import { AnnouncementPanel } from '@renderer/components/projection/AnnouncementPanel'
import { NotificationPanel } from '@renderer/components/projection/NotificationPanel'
import { AudioPanel } from '@renderer/components/projection/AudioPanel'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useNotificationStore } from '@renderer/store/useNotificationStore'
import { generateSlidesForSong } from '@core/projection'
import { mediaEngine } from '@renderer/engine/mediaEngine'
import { useSongStore } from '@renderer/store/useSongStore'
import type { PlaylistItem, Song } from '@renderer/types'

type BottomRightTab = 'song-info' | 'bible' | 'announcement' | 'notifications'

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
  const [activeTab, setActiveTab] = useState<SongInfoTab>('info')
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState(false)
  const [addedToPlaylist, setAddedToPlaylist] = useState(false)
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
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
    return rows
  }, [activeSong])

  /** Parse lyrics into structured sections */
  const lyricsSections = useMemo(() => {
    if (!activeSong?.lyrics_raw) return []
    const raw = activeSong.lyrics_raw
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
      showToast('Gagal menambahkan ke playlist', 'error')
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
    <div
      className="flex items-center gap-1.5 px-3 pt-2 pb-2 border-b border-white/[0.04] flex-shrink-0"
      role="tablist"
      aria-label="Song info tabs"
    >
      <div className="flex items-center gap-1 flex-1 bg-black/15 rounded-lg p-0.5 border border-white/[0.04]">
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
            className={`
              flex-1 inline-flex items-center justify-center
              h-6 px-1.5 rounded-md border
              text-[10px] font-bold transition-all duration-150
              ${
                activeTab === tab.id
                  ? 'bg-white/[0.08] text-text-primary border-white/[0.1]'
                  : 'text-text-disabled hover:text-text-secondary border-transparent hover:bg-white/[0.04]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )

  if (!activeSong) {
    return (
      <aside className="projection-song-info-panel">
        {tabButtons}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-text-muted px-4">
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
    <aside className="projection-song-info-panel">
      {tabButtons}

      {/* ── Info Tab ── */}
      {activeTab === 'info' && (
        <div id="tabpanel-info" role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-3 p-4">
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

          {/* Action buttons */}
          <div className="mt-auto grid grid-cols-3 gap-2">
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
        <div
          id="tabpanel-lyrics"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* Toolbar: song ref + zoom controls */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/[0.05]">
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
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4"
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
        <div
          id="tabpanel-chord"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05]">
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
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-3">
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
        <div
          id="tabpanel-notes"
          role="tabpanel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/[0.05]">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Operator Notes
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-3 space-y-2">
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
    </aside>
  )
}

export function ProjectionMode(): React.JSX.Element {
  const { playlistItems } = usePlaylistStore()
  const { isFocusMode, toggleFocusMode, loadHymnals, loadSongs, setSelectedSong, songs } =
    useAppStore()
  const { setSlides, programSlide, isAudioPanelVisible, toggleAudioPanel } = useProjectionStore()
  const [scenePreset, setScenePreset] = useState('1')
  const [bottomRightTab, setBottomRightTab] = useState<BottomRightTab>('song-info')
  const projectedSongId = programSlide?.songId ?? null
  const notificationUnread = useNotificationStore((s) => s.unreadCount)

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
              <div className="flex flex-col min-h-0 overflow-hidden rounded-[17px] border border-white/[0.065] bg-[linear-gradient(180deg,rgba(17,23,36,0.82),rgba(10,14,23,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.3)]">
                {/* ── Outer tab bar + timer toggle ── */}
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2.5 border-b border-white/[0.055] flex-shrink-0 bg-white/[0.012] rounded-t-[17px]">
                  <div
                    className="flex items-center gap-1 flex-1 min-w-0 bg-black/25 rounded-xl p-1 border border-white/[0.06]"
                    role="tablist"
                    aria-label="Panel tabs"
                  >
                    {(
                      [
                        { id: 'song-info', label: 'Info', icon: <Music2 size={12} /> },
                        { id: 'bible', label: 'Alkitab', icon: <Book size={12} /> },
                        { id: 'announcement', label: 'Warta', icon: <Megaphone size={12} /> },
                        {
                          id: 'notifications',
                          label: 'Notif',
                          icon: <Bell size={12} />,
                          badge: notificationUnread > 0 ? notificationUnread : undefined
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
                        className={`
                          relative flex-1 inline-flex items-center justify-center gap-1.5
                          h-7 px-2 rounded-lg border
                          text-[11px] font-bold tracking-wide
                          transition-all duration-150 select-none
                          ${
                            bottomRightTab === tab.id
                              ? 'bg-brand-primary/15 text-brand-primary border-brand-primary/25 shadow-[0_0_12px_rgba(56,189,248,0.12)]'
                              : 'text-text-disabled hover:text-text-secondary hover:bg-white/[0.05] border-transparent'
                          }
                        `}
                      >
                        <span className="shrink-0">{tab.icon}</span>
                        <span className="truncate">{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span className="shrink-0 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-danger text-white text-[9px] font-black leading-none">
                            {tab.badge > 9 ? '9+' : tab.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Timer toggle */}
                  <button
                    onClick={toggleAudioPanel}
                    className={`
                      shrink-0 inline-flex items-center justify-center
                      h-9 w-9 rounded-xl border transition-all duration-150
                      ${
                        isAudioPanelVisible
                          ? 'bg-brand-primary/15 border-brand-primary/25 text-brand-primary shadow-[0_0_10px_rgba(56,189,248,0.1)]'
                          : 'bg-black/20 border-white/[0.06] text-text-disabled hover:text-text-secondary hover:bg-white/[0.05] hover:border-white/[0.1]'
                      }
                    `}
                    title={
                      isAudioPanelVisible ? 'Sembunyikan panel timer' : 'Tampilkan panel timer'
                    }
                  >
                    <Volume2 size={13} />
                  </button>
                </div>

                {/* ── Tab content — panels render WITHOUT their own tab bar ── */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {bottomRightTab === 'song-info' && <SongInfoPanel />}
                  {bottomRightTab === 'bible' && <BiblePanel />}
                  {bottomRightTab === 'announcement' && <AnnouncementPanel />}
                  {bottomRightTab === 'notifications' && <NotificationPanel />}
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
