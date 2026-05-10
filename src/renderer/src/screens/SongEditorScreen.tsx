import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, Wand2, SplitSquareHorizontal, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlides, autoFormatLyrics } from '../engine/slideEngine'
import type { SlideData } from '../types'
import { logger } from '../utils/logger'
import {
  validateKeyNote,
  validateTempo,
  formatKeyNote,
  formatTempo
} from '../utils/metadataValidation'

export function SongEditorScreen(): React.JSX.Element {
  const { editingSong, hymnals, songs, setScreen, loadSongs, showToast } = useAppStore()
  const isEditing = !!editingSong

  const inputBaseClass =
    'w-full h-11 bg-bg-base/50 border border-border-subtle/60 rounded-xl px-4 text-[14px] font-medium text-text-primary focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 outline-none transition'
  const selectBaseClass = `${inputBaseClass} appearance-none cursor-pointer`

  const [hymnalId, setHymnalId] = useState<number>(editingSong?.hymnal_id || hymnals[0]?.id || 1)
  const [songNumber, setSongNumber] = useState(editingSong?.number || '')
  const [title, setTitle] = useState(editingSong?.title || '')
  const [alternateTitle, setAlternateTitle] = useState(editingSong?.alternate_title || '')
  const [lyricsRaw, setLyricsRaw] = useState(editingSong?.lyrics_raw || '')
  const [category, setCategory] = useState(editingSong?.category || '')
  const [keyNote, setKeyNote] = useState(editingSong?.key_note || '')
  const [timeSignature, setTimeSignature] = useState(editingSong?.time_signature || '')
  const [tempo, setTempo] = useState(editingSong?.tempo || '')
  const [isSaving, setIsSaving] = useState(false)
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  const [theme, setTheme] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [keyNoteError, setKeyNoteError] = useState<string | null>(null)
  const [tempoError, setTempoError] = useState<string | null>(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)

  // Dirty State Guard: snapshot of initial values
  const [initialSnapshot] = useState({
    hymnalId: editingSong?.hymnal_id || hymnals[0]?.id || 1,
    songNumber: editingSong?.number || '',
    title: editingSong?.title || '',
    alternateTitle: editingSong?.alternate_title || '',
    lyricsRaw: editingSong?.lyrics_raw || '',
    category: editingSong?.category || '',
    keyNote: editingSong?.key_note || '',
    timeSignature: editingSong?.time_signature || '',
    tempo: editingSong?.tempo || ''
  })

  const isDirty = useMemo(() => {
    return (
      hymnalId !== initialSnapshot.hymnalId ||
      songNumber !== initialSnapshot.songNumber ||
      title !== initialSnapshot.title ||
      alternateTitle !== initialSnapshot.alternateTitle ||
      lyricsRaw !== initialSnapshot.lyricsRaw ||
      category !== initialSnapshot.category ||
      keyNote !== initialSnapshot.keyNote ||
      timeSignature !== initialSnapshot.timeSignature ||
      tempo !== initialSnapshot.tempo
    )
  }, [
    hymnalId,
    songNumber,
    title,
    alternateTitle,
    lyricsRaw,
    category,
    keyNote,
    timeSignature,
    tempo,
    initialSnapshot
  ])

  useEffect(() => {
    window.api.settings
      .getAll()
      .then(setTheme)
      .catch((err) => logger.error('Failed to load theme:', err))
  }, [])

  const previewSlides: SlideData[] = useMemo(() => {
    return generateSlides(editingSong?.id || 0, lyricsRaw, undefined, {
      keyNote: keyNote || undefined,
      timeSignature: timeSignature || undefined,
      tempo: tempo || undefined
    })
  }, [lyricsRaw, editingSong, keyNote, timeSignature, tempo])

  // Check for duplicate song number or title in the same hymnal
  const checkDuplicate = useCallback((): string | null => {
    const hymnalSongs = songs.filter((s) => s.hymnal_id === hymnalId)
    const duplicateByNumber = hymnalSongs.find(
      (s) => s.number.toLowerCase() === songNumber.trim().toLowerCase() && s.id !== editingSong?.id
    )
    const duplicateByTitle = hymnalSongs.find(
      (s) => s.title.toLowerCase() === title.trim().toLowerCase() && s.id !== editingSong?.id
    )

    if (duplicateByNumber && duplicateByTitle) {
      return `Nomor "${songNumber}" dan judul "${title}" sudah ada di buku ini`
    }
    if (duplicateByNumber) {
      return `Nomor "${songNumber}" sudah digunakan oleh "${duplicateByNumber.title}"`
    }
    if (duplicateByTitle) {
      return `Judul "${title}" sudah digunakan oleh nomor ${duplicateByTitle.number}`
    }
    return null
  }, [songs, hymnalId, songNumber, title, editingSong])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!songNumber.trim() || !title.trim()) return

    // Validate metadata
    const keyNoteValidation = validateKeyNote(keyNote)
    const tempoValidation = validateTempo(tempo)
    setKeyNoteError(keyNoteValidation.valid ? null : keyNoteValidation.message || null)
    setTempoError(tempoValidation.valid ? null : tempoValidation.message || null)
    if (!keyNoteValidation.valid || !tempoValidation.valid) {
      showToast('Periksa kembali data metadata (nada dasar/tempo)', 'error')
      return
    }

    // Check for duplicates
    const duplicate = checkDuplicate()
    if (duplicate) {
      showToast(duplicate, 'error')
      setDuplicateWarning(duplicate)
      return
    }

    setIsSaving(true)
    try {
      const songData = {
        hymnal_id: hymnalId,
        number: songNumber,
        title,
        alternate_title: alternateTitle,
        lyrics_raw: lyricsRaw,
        category,
        language: editingSong?.language || 'Indonesia',
        author: editingSong?.author || '',
        composer: editingSong?.composer || '',
        key_note: keyNote,
        time_signature: timeSignature,
        tempo,
        tags: editingSong?.tags || ''
      }
      if (isEditing && editingSong) {
        await window.api.songs.update(editingSong.id, songData)
        // Hot-Swap API: if this song is currently live, update the projection seamlessly
        const newSlides = generateSlides(editingSong.id, lyricsRaw, undefined, {
          keyNote: keyNote || undefined,
          timeSignature: timeSignature || undefined,
          tempo: tempo || undefined
        })
        useProjectionStore.getState().hotSwapSlides(editingSong.id, newSlides)
      } else {
        await window.api.songs.add(songData)
      }
      await loadSongs()
      setScreen('dashboard')
      showToast(isEditing ? 'Lagu berhasil diperbarui' : 'Lagu berhasil ditambahkan', 'success')
    } catch (err) {
      logger.error('Save error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan lagu'
      showToast(errorMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }, [
    hymnalId,
    songNumber,
    title,
    alternateTitle,
    lyricsRaw,
    category,
    keyNote,
    timeSignature,
    tempo,
    isEditing,
    editingSong,
    loadSongs,
    setScreen,
    showToast,
    checkDuplicate
  ])

  // Listen for Ctrl+S
  useEffect(() => {
    const handler = (): void => {
      void handleSave()
    }
    document.addEventListener('sion:save-song', handler)
    return () => document.removeEventListener('sion:save-song', handler)
  }, [handleSave])

  const handleAutoFormat = (): void => {
    setLyricsRaw(autoFormatLyrics(lyricsRaw))
  }

  const insertSection = (label: string): void => {
    const cursor = `[${label}]\n`
    setLyricsRaw((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n\n') + cursor)
  }

  const insertBreak = (): void => {
    setLyricsRaw((prev) => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + '---\n')
  }

  const categories = [
    'Kebaktian - Ibadah',
    'Tuhan, Allah',
    'Allah - Bapa',
    'Yesus Kristus',
    'Roh Kudus',
    'Kitab Suci',
    'Injil - Kabar Baik',
    'Gereja Kristen',
    'Doktrin Gereja',
    'Kedatangan Yesus',
    'Hidup Kekristenan',
    'Rumah Tangga, Pernikahan',
    'Paduan Suara, Orang Muda',
    'Lagu Penutup Doa',
    'Kebangunan Rohani',
    'Panggilan dan Penyerahan',
    'Sekolah Sabat',
    'Anggota Bekerja',
    'Permintaan Doa',
    'Perjamuan Suci dan Baptisan',
    'Kedatangan Kedua Kali',
    'Surga',
    'Nyanyian Advent',
    'Hari Sabat',
    'Pagi dan Petang',
    'Pemakaman',
    'Nyanyian Biduan',
    'Perpisahan',
    'Nyanyian Pendek',
    'Persembahan',
    'Selamat Datang',
    'Doa',
    'Alkitab',
    'Penciptaan',
    'Pujian',
    'Kelahiran Yesus',
    'Pemeliharaan Allah',
    'Kasih Allah',
    'Keselamatan',
    'Penyerahan',
    'Alam Ciptaan',
    'Keluarga - Persaudaraan',
    'Cerita Alkitab',
    'Bersaksi',
    'Komitmen - Ketetapan',
    'Sukacita',
    'Lagu-Lagu Pathfinder',
    'Lagu Perjamuan Jemaat Jambrut',
    'Lagu Tema Kesehatan GMAHK',
    'Sembah dan Puji'
  ]

  const activeSlide = previewSlides[activeSlideIdx]

  // Theme
  const fontFamily = theme.projection_font_family || 'Inter'
  const textColor = theme.projection_text_color || '#ffffff'
  const bgColor = theme.projection_bg_color || '#0f0f1a'

  // Overflow warnings
  const lineWarnings = lyricsRaw.split('\n').reduce((count, line) => {
    return count + (line.length > 40 ? 1 : 0)
  }, 0)

  return (
    <div className="h-full w-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border-subtle/50 bg-bg-base/40 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.03)] z-20 relative">
        <div className="flex items-center gap-5">
          <button
            onClick={() => {
              if (isDirty && !showDiscardDialog) {
                setShowDiscardDialog(true)
                return
              }
              setScreen('dashboard')
            }}
            className="p-2.5 rounded-xl text-text-secondary bg-bg-surface/50 border border-border-subtle hover:bg-bg-elevated hover:text-text-primary hover:border-border-strong transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-text-primary leading-tight tracking-tight">
              {isEditing ? 'Edit Lagu' : 'Tambah Lagu Baru'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
              <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">
                {isEditing
                  ? `${editingSong?.hymnal_code || 'LS'} ${editingSong?.number} — ${editingSong?.title}`
                  : 'Input Data Baru'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 border-l border-border-subtle pl-4">
            {lineWarnings > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-warning/10 border border-status-warning/20 text-status-warning shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {lineWarnings} Baris Panjang
                </span>
              </div>
            )}
            {duplicateWarning && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error shadow-sm">
                <AlertTriangle size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Duplikat</span>
              </div>
            )}
            {isDirty && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Belum Disimpan
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isDirty && !showDiscardDialog) {
                setShowDiscardDialog(true)
                return
              }
              setScreen('dashboard')
            }}
            className="btn-premium btn-premium-ghost text-xs px-5 h-9"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !songNumber.trim() || !title.trim()}
            className={`btn-premium btn-premium-primary text-xs px-6 h-9 gap-2 shadow-brand-primary/20 shadow-lg ${isDirty ? 'ring-2 ring-brand-primary/30' : ''}`}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Professional Lyric Studio: 3-Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Column 1: Metadata & Lyrics Editor */}
        <div className="flex-[4] flex flex-col min-h-0 bg-bg-surface/10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.03),transparent_50%)] pointer-events-none" />

          <div className="flex-1 overflow-y-auto p-8 space-y-10 relative z-10 custom-scrollbar">
            {/* Essential Info Section */}
            <section>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary tracking-tight">
                    Informasi Dasar
                  </h3>
                  <p className="text-[12px] text-text-muted mt-1">
                    Identitas lagu dan pengaturan buku lagu.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)] space-y-5">
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-5">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Buku Lagu (Hymnal)
                    </label>
                    <select
                      value={hymnalId}
                      onChange={(e) => setHymnalId(Number(e.target.value))}
                      className={selectBaseClass}
                    >
                      {hymnals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.code} - {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Nomor
                    </label>
                    <input
                      type="text"
                      value={songNumber}
                      onChange={(e) => setSongNumber(e.target.value)}
                      placeholder="001"
                      className={`${inputBaseClass} font-semibold`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                    Judul Utama
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Kudus, Kudus, Kudus"
                    className={`${inputBaseClass} text-[15px] font-semibold`}
                  />
                </div>

                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-5">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Kategori
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={selectBaseClass}
                    >
                      <option value="">Pilih Kategori...</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-7">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Sub Judul (English/Optional)
                    </label>
                    <input
                      type="text"
                      value={alternateTitle}
                      onChange={(e) => setAlternateTitle(e.target.value)}
                      placeholder="Holy, Holy, Holy"
                      className={inputBaseClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-5 p-5 rounded-2xl bg-black/10 border border-white/10">
                  <div className="col-span-4">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Nada Dasar
                    </label>
                    <input
                      type="text"
                      value={keyNote}
                      onChange={(e) => {
                        setKeyNote(e.target.value)
                        const v = validateKeyNote(e.target.value)
                        setKeyNoteError(v.valid ? null : v.message || null)
                      }}
                      onBlur={() => setKeyNote(formatKeyNote(keyNote))}
                      placeholder="C / G / Am"
                      className={`w-full h-11 bg-bg-base/50 border rounded-xl px-4 text-[14px] font-semibold outline-none transition ${
                        keyNoteError
                          ? 'border-status-error/70 focus:border-status-error focus:ring-4 focus:ring-status-error/10'
                          : 'border-white/10 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10'
                      }`}
                    />
                    {keyNoteError && (
                      <span className="text-[12px] text-status-error mt-2 block font-medium">
                        {keyNoteError}
                      </span>
                    )}
                  </div>
                  <div className="col-span-4">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Birama
                    </label>
                    <select
                      value={timeSignature}
                      onChange={(e) => setTimeSignature(e.target.value)}
                      className={`${selectBaseClass} font-semibold`}
                    >
                      <option value="">Pilih Birama...</option>
                      <optgroup label="Common">
                        <option value="2/2">2/2 (Cut Time)</option>
                        <option value="2/4">2/4</option>
                        <option value="3/4">3/4 (Waltz)</option>
                        <option value="4/4">4/4 (Common Time)</option>
                        <option value="6/8">6/8</option>
                      </optgroup>
                      <optgroup label="Complex">
                        <option value="3/8">3/8</option>
                        <option value="5/4">5/4</option>
                        <option value="7/8">7/8</option>
                        <option value="9/8">9/8</option>
                        <option value="12/8">12/8</option>
                      </optgroup>
                      <optgroup label="Other">
                        <option value="C">C (Common Time)</option>
                        <option value="C|">C| (Alla Breve)</option>
                      </optgroup>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="text-[12px] font-semibold text-text-secondary mb-2 block">
                      Tempo (BPM)
                    </label>
                    <input
                      type="text"
                      value={tempo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '')
                        setTempo(val)
                        const v = validateTempo(val)
                        setTempoError(v.valid ? null : v.message || null)
                      }}
                      onBlur={() => setTempo(formatTempo(tempo))}
                      placeholder="100"
                      className={`w-full h-11 bg-bg-base/50 border rounded-xl px-4 text-[14px] font-semibold outline-none transition ${
                        tempoError
                          ? 'border-status-error/70 focus:border-status-error focus:ring-4 focus:ring-status-error/10'
                          : 'border-white/10 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10'
                      }`}
                    />
                    {tempoError && (
                      <span className="text-[12px] text-status-error mt-2 block font-medium">
                        {tempoError}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-white/5" />

            {/* Lyrics Editor Section */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary text-[11px] font-bold">
                    2
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-primary">
                    Lirik & Struktur
                  </h3>
                </div>
                <button
                  onClick={handleAutoFormat}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-[11px] font-bold text-text-secondary hover:text-brand-secondary hover:bg-brand-secondary/10 transition-all duration-200"
                  title="Auto-format spasi dan baris"
                >
                  <Wand2 size={12} />
                  Format Lirik
                </button>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.28)] focus-within:ring-2 focus-within:ring-brand-secondary/15 transition-shadow">
                <div className="px-4 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-black/10 ring-1 ring-white/10 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                          Structure
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-1.5">
                          {['Bait', 'Chorus', 'Bridge', 'Ending', 'Pre-Chorus'].map((sec, i) => (
                            <button
                              key={sec}
                              onClick={() => insertSection(sec)}
                              className="group relative px-3 h-8 rounded-xl text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.06] active:bg-white/[0.08] active:scale-[0.98] transition-all duration-150"
                            >
                              <span>{sec}</span>
                              <span className="absolute -top-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded bg-white/5 text-[8px] font-mono text-text-muted tabular-nums">
                                {i + 1}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="hidden md:block w-px h-7 bg-white/5" />

                      <div className="flex items-center gap-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
                          Slide
                        </div>
                        <button
                          onClick={insertBreak}
                          className="group relative flex items-center gap-1.5 px-3 h-8 rounded-2xl bg-brand-primary/10 ring-1 ring-brand-primary/20 text-[11px] font-semibold text-brand-primary hover:bg-brand-primary/15 active:bg-brand-primary/20 active:scale-[0.98] transition-all duration-150"
                        >
                          <SplitSquareHorizontal size={12} />
                          <span>Slide Break</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-mono text-text-muted">
                            ---
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-2 text-[9px] text-text-disabled font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-white/5">Ctrl+S</span>
                        <span className="text-text-muted/40">·</span>
                        <span className="text-text-muted">save</span>
                      </div>
                      <div className="text-[10px] text-text-disabled font-mono">
                        {lyricsRaw.length} karakter · {lyricsRaw.split('\n').length} baris
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative px-4 pb-4 pt-3">
                  <textarea
                    value={lyricsRaw}
                    onChange={(e) => setLyricsRaw(e.target.value)}
                    placeholder="Ketik lirik di sini... gunakan --- untuk membagi slide secara manual."
                    className="w-full h-[480px] bg-bg-base/40 ring-1 ring-white/10 rounded-2xl p-6 text-[14px] font-mono leading-[1.9] text-text-primary/95 placeholder:text-text-muted/50 focus:ring-4 focus:ring-brand-secondary/10 focus:ring-offset-0 outline-none transition resize-none shadow-inner custom-scrollbar"
                    spellCheck={false}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Column 2: Slide Strip */}
        <div className="flex-[2] flex flex-col min-h-0 bg-bg-base/20 relative">
          <div className="shrink-0 px-5 py-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-md z-10 flex flex-col gap-1">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-text-primary">
              Slide Strip
            </h3>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
              {previewSlides.length} slide otomatis
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar relative z-0">
            {previewSlides.map((slide, idx) => {
              const isActive = activeSlideIdx === idx
              const excerpt = (slide.text || '').replace(/\n+/g, ' ').trim()

              return (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`w-full text-left rounded-2xl transition-all duration-200 ease-out active:scale-[0.99] group ${
                    isActive
                      ? 'bg-brand-primary/10 shadow-[0_18px_50px_rgba(0,0,0,0.35)] ring-1 ring-brand-primary/25'
                      : 'bg-white/[0.03] hover:bg-white/[0.05] ring-1 ring-white/10 hover:ring-white/15'
                  }`}
                >
                  <div className="flex items-center gap-4 px-4 py-3.5">
                    <div className="shrink-0 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black tabular-nums transition-colors ${
                          isActive
                            ? 'bg-brand-primary/20 text-brand-primary'
                            : 'bg-black/20 text-text-muted group-hover:text-text-secondary'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div
                        className={`relative w-16 aspect-video rounded-lg overflow-hidden transition-transform duration-300 ${
                          isActive ? 'scale-[1.02]' : 'group-hover:scale-[1.02]'
                        }`}
                      >
                        <div className="absolute inset-0 bg-black" />
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundColor: bgColor,
                            backgroundImage: theme.projection_bg_image
                              ? `url(${theme.projection_bg_image})`
                              : 'none',
                            opacity: 0.55
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/60" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2">
                          {slide.sectionLabel && (
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                isActive
                                  ? 'bg-brand-secondary/15 text-brand-secondary'
                                  : 'bg-white/5 text-text-muted'
                              }`}
                            >
                              {slide.sectionLabel}
                            </span>
                          )}
                          <span
                            className={`truncate text-[12px] font-semibold transition-colors ${
                              isActive
                                ? 'text-text-primary'
                                : 'text-text-secondary group-hover:text-text-primary'
                            }`}
                          >
                            {excerpt || 'Slide kosong'}
                          </span>
                        </div>

                        <div
                          className={`shrink-0 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            isActive ? 'text-brand-primary' : 'text-text-disabled'
                          }`}
                        >
                          {slide.text.split('\n').filter(Boolean).length} baris
                        </div>
                      </div>

                      <div className="mt-2 h-px bg-white/5" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Column 3: Live Presentation Preview 16:9 */}
        <div className="flex-[5] flex flex-col min-h-0 bg-bg-base/60 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.02),transparent_60%)] pointer-events-none" />

          <div className="p-8 border-b border-border-subtle bg-bg-surface/20 relative z-10 flex flex-col justify-center min-h-[60%]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-bg-elevated border border-border-subtle shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-status-success animate-pulse shadow-[0_0_8px_rgba(46,204,113,0.6)]" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-text-primary">Live Monitor</h3>
                  <p className="text-[11px] text-text-muted font-medium uppercase tracking-widest">
                    Simulasi Proyeksi
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-bg-surface/80 p-1.5 rounded-xl border border-border-subtle shadow-sm backdrop-blur-md">
                <span className="px-3 text-[10px] font-black text-text-muted uppercase tracking-wider">
                  Slide
                </span>
                <div className="flex items-center gap-1 bg-bg-base rounded-lg p-0.5 border border-border-subtle shadow-inner">
                  <button
                    disabled={activeSlideIdx <= 0}
                    onClick={() => setActiveSlideIdx((v) => v - 1)}
                    className="p-2 rounded-md hover:bg-bg-elevated text-text-primary disabled:opacity-20 transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[12px] font-bold text-brand-primary w-12 text-center tabular-nums">
                    {previewSlides.length > 0
                      ? `${activeSlideIdx + 1} / ${previewSlides.length}`
                      : '0'}
                  </span>
                  <button
                    disabled={activeSlideIdx >= previewSlides.length - 1}
                    onClick={() => setActiveSlideIdx((v) => v + 1)}
                    className="p-2 rounded-md hover:bg-bg-elevated text-text-primary disabled:opacity-20 rotate-180 transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Projection Frame Simulator */}
            <div className="aspect-video w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.55)] bg-black relative group/monitor">
              {/* Subtle bezel / screen depth */}
              <div className="absolute inset-0 ring-1 ring-white/[0.07] rounded-2xl" />
              <div className="absolute inset-[1px] ring-[3px] ring-black/40 rounded-2xl" />

              {/* Simulator Background */}
              <div
                className="absolute inset-[4px] rounded-xl bg-cover bg-center bg-noisetexture transition-transform duration-1000 group-hover/monitor:scale-[1.02]"
                style={{
                  backgroundColor: bgColor,
                  backgroundImage: theme.projection_bg_image
                    ? `url(${theme.projection_bg_image})`
                    : 'none',
                  opacity: theme.projection_bg_opacity || 0.7
                }}
              />

              {/* Projection atmosphere layers */}
              <div className="absolute inset-[4px] rounded-xl bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.05),rgba(0,0,0,0.45))]" />
              <div className="absolute inset-[4px] rounded-xl bg-gradient-to-b from-black/15 via-transparent to-black/40" />

              {/* Subtle inner shadow for screen depth */}
              <div className="absolute inset-[4px] rounded-xl shadow-[inset_0_2px_20px_rgba(0,0,0,0.35)]" />

              {/* Simulator Content */}
              <div className="absolute inset-[4px] rounded-xl flex flex-col items-center justify-center p-[8%] z-10 text-center">
                {activeSlide ? (
                  <div
                    className="w-full animate-fade-in drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
                    style={{
                      fontFamily,
                      color: textColor,
                      textShadow:
                        theme.projection_text_shadow === '1'
                          ? '0 2px 20px rgba(0,0,0,0.9), 0 4px 40px rgba(0,0,0,0.5)'
                          : '0 2px 12px rgba(0,0,0,0.6)',
                      fontSize: 'clamp(18px, 3.2vw, 32px)',
                      lineHeight: '1.55',
                      fontWeight: '500',
                      letterSpacing: '0.01em',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {activeSlide.sectionLabel && (
                      <div
                        className="text-[0.55em] opacity-50 mb-3 font-semibold tracking-widest uppercase"
                        style={{ color: textColor }}
                      >
                        {activeSlide.sectionLabel}
                      </div>
                    )}
                    {activeSlide.text}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-white/25">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center">
                      <SplitSquareHorizontal size={28} className="opacity-40" />
                    </div>
                    <div className="text-[13px] font-medium tracking-wide">Tidak ada lirik</div>
                  </div>
                )}
              </div>

              {/* Metadata Overlay - Integrated with Preview */}
              {(keyNote || timeSignature || tempo) && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  {keyNote && (
                    <div className="flex items-center gap-1.5 text-white/70">
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
                        Nada
                      </span>
                      <span className="text-[11px] font-semibold">{formatKeyNote(keyNote)}</span>
                    </div>
                  )}
                  {timeSignature && (
                    <div className="flex items-center gap-1.5 text-white/70">
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
                        Birama
                      </span>
                      <span className="text-[11px] font-semibold">{timeSignature}</span>
                    </div>
                  )}
                  {tempo && (
                    <div className="flex items-center gap-1.5 text-white/70">
                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-50">
                        BPM
                      </span>
                      <span className="text-[11px] font-semibold">{formatTempo(tempo)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status Badge Overlays - Broadcast style */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-xl ring-1 ring-white/[0.08] text-[9px] text-white/50 font-semibold tracking-wider">
                PREVIEW
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-primary/15 backdrop-blur-xl ring-1 ring-brand-primary/20 text-[9px] text-brand-primary/90 font-semibold tracking-wider">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                  LIVE
                </div>
                <div className="px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-xl ring-1 ring-white/[0.08] text-[9px] text-white/45 font-mono tracking-tight">
                  1920×1080
                </div>
                <div className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-xl ring-1 ring-white/[0.08] text-[9px] text-white/40 font-mono tracking-tight">
                  16:9
                </div>
              </div>
            </div>
          </div>

          {/* Slide Info Panel */}
          <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
            {activeSlide ? (
              <div className="max-w-4xl mx-auto rounded-2xl border border-border-subtle bg-bg-surface/30 p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border-subtle/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Konten Slide #{activeSlideIdx + 1}
                    </div>
                    {activeSlide.sectionLabel && (
                      <span className="px-2 py-0.5 rounded-md bg-brand-secondary/10 text-brand-secondary text-[10px] font-bold uppercase tracking-wider">
                        {activeSlide.sectionLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-text-disabled uppercase tracking-wider">
                    <span>{activeSlide.text.length} karakter</span>
                    <span>{activeSlide.text.split('\n').length} baris</span>
                  </div>
                </div>
                <div className="text-[14px] text-text-primary leading-relaxed whitespace-pre-line font-medium pt-2">
                  {activeSlide.text}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                <p className="text-sm font-medium">Slide Kosong</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dirty State Discard Dialog */}
      {showDiscardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-border-subtle">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-status-warning/10 flex items-center justify-center text-status-warning">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-h3">Perubahan Belum Disimpan</h3>
                <p className="text-caption mt-1">Apakah Anda yakin ingin keluar tanpa menyimpan?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDiscardDialog(false)}
                className="btn-premium btn-premium-ghost text-xs h-9 px-4"
              >
                Lanjutkan Edit
              </button>
              <button
                onClick={() => {
                  setShowDiscardDialog(false)
                  setScreen('dashboard')
                }}
                className="btn-premium btn-premium-primary text-xs h-9 px-5 bg-status-error border-status-error text-white hover:bg-status-error/90"
              >
                Buang Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
