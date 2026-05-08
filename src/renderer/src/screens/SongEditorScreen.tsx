import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ArrowLeft, Save, Wand2, SplitSquareHorizontal } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlides, autoFormatLyrics } from '../engine/slideEngine'
import type { SlideData } from '../types'
import { logger } from '../utils/logger'

export function SongEditorScreen(): React.JSX.Element {
  const { editingSong, hymnals, setScreen, loadSongs, showToast } = useAppStore()
  const isEditing = !!editingSong

  const [hymnalId, setHymnalId] = useState<number>(editingSong?.hymnal_id || hymnals[0]?.id || 1)
  const [songNumber, setSongNumber] = useState(editingSong?.number || '')
  const [title, setTitle] = useState(editingSong?.title || '')
  const [alternateTitle, setAlternateTitle] = useState(editingSong?.alternate_title || '')
  const [lyricsRaw, setLyricsRaw] = useState(editingSong?.lyrics_raw || '')
  const [category, setCategory] = useState(editingSong?.category || '')
  const [keyNote, setKeyNote] = useState(editingSong?.key_note || '')
  const [tempo, setTempo] = useState(editingSong?.tempo || '')
  const [isSaving, setIsSaving] = useState(false)
  const [activeSlideIdx, setActiveSlideIdx] = useState(0)
  const [theme, setTheme] = useState<Record<string, string>>({})

  useEffect(() => {
    window.api.settings.getAll().then(setTheme)
  }, [])

  const previewSlides: SlideData[] = useMemo(() => {
    return generateSlides(editingSong?.id || 0, lyricsRaw)
  }, [lyricsRaw, editingSong])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!songNumber.trim() || !title.trim()) return
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
        tempo,
        tags: editingSong?.tags || ''
      }
      if (isEditing && editingSong) {
        await window.api.songs.update(editingSong.id, songData)
        // Hot-Swap API: if this song is currently live, update the projection seamlessly
        const newSlides = generateSlides(editingSong.id, lyricsRaw)
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
    tempo,
    isEditing,
    editingSong,
    loadSongs,
    setScreen,
    showToast
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
      <div className="h-14 flex items-center justify-between px-6 border-b border-border-default bg-bg-surface/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen('dashboard')}
            className="p-2 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-h3 text-text-primary leading-tight">
              {isEditing ? 'Edit Lagu' : 'Tambah Lagu Baru'}
            </h1>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
              {isEditing
                ? `${editingSong.hymnal_code || 'LS'} ${editingSong.number} — ${editingSong.title}`
                : 'Input Data Lagu'}
            </p>
          </div>
          {lineWarnings > 0 && (
            <div className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-warning/10 border border-status-warning/20 text-status-warning">
              <div className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {lineWarnings} Baris Terlalu Panjang
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('dashboard')} className="btn btn-ghost text-xs">
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !songNumber.trim() || !title.trim()}
            className="btn btn-primary px-6 text-xs shadow-lg shadow-brand-primary/20"
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Main Layout: Split Screen */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side: Editor Form */}
        <div className="flex-[5] flex flex-col min-h-0 border-r border-border-default bg-bg-surface/30">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            {/* Essential Info Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-brand-primary rounded-full" />
                <h3 className="text-micro text-text-muted">Informasi Dasar</h3>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Buku Lagu (Hymnal)
                  </label>
                  <select
                    value={hymnalId}
                    onChange={(e) => setHymnalId(Number(e.target.value))}
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all appearance-none"
                  >
                    {hymnals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.code} - {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Nomor
                  </label>
                  <input
                    type="text"
                    value={songNumber}
                    onChange={(e) => setSongNumber(e.target.value)}
                    placeholder="001"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="col-span-6">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Judul Utama
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Kudus, Kudus, Kudus"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all appearance-none"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-8">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Sub Judul (English/Optional)
                  </label>
                  <input
                    type="text"
                    value={alternateTitle}
                    onChange={(e) => setAlternateTitle(e.target.value)}
                    placeholder="Holy, Holy, Holy"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Nada Dasar
                  </label>
                  <input
                    type="text"
                    value={keyNote}
                    onChange={(e) => setKeyNote(e.target.value)}
                    placeholder="C / G / Am"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Tempo
                  </label>
                  <input
                    type="text"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    placeholder="Moderate / 4/4"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Lyrics Editor Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-brand-secondary rounded-full" />
                  <h3 className="text-micro text-text-muted">Lirik & Struktur</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoFormat}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-bg-elevated border border-border-default text-[11px] font-bold text-text-secondary hover:text-brand-secondary hover:border-brand-secondary/30 transition-all"
                    title="Auto-format spasi dan baris"
                  >
                    <Wand2 size={12} />
                    Format Lirik
                  </button>
                </div>
              </div>

              {/* Editor Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2 p-2 bg-bg-base/50 rounded-lg border border-border-subtle">
                <span className="text-[10px] text-text-disabled font-bold uppercase ml-1 mr-2 tracking-widest">
                  Sisipkan:
                </span>
                {['Bait', 'Chorus', 'Bridge', 'Ending', 'Pre-Chorus'].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => insertSection(sec)}
                    className="px-2.5 py-1 rounded bg-bg-elevated border border-border-default text-[10px] font-bold text-text-muted hover:text-text-primary hover:border-border-strong transition-all"
                  >
                    {sec}
                  </button>
                ))}
                <div className="w-px h-4 bg-border-strong mx-1" />
                <button
                  onClick={insertBreak}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-elevated border border-border-default text-[10px] font-bold text-brand-primary hover:bg-brand-primary/10 transition-all"
                >
                  <SplitSquareHorizontal size={12} />
                  Slide Break
                </button>
              </div>

              <div className="relative group">
                <textarea
                  value={lyricsRaw}
                  onChange={(e) => setLyricsRaw(e.target.value)}
                  placeholder="Ketik lirik di sini... gunakan --- untuk membagi slide secara manual."
                  className="w-full h-[400px] bg-bg-base border border-border-default rounded-xl p-6 text-sm font-mono leading-relaxed focus:border-brand-secondary outline-none transition-all resize-none shadow-inner"
                  spellCheck={false}
                />
                <div className="absolute bottom-4 right-6 text-[10px] text-text-disabled font-mono">
                  {lyricsRaw.length} karakter · {lyricsRaw.split('\n').length} baris
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Right Side: Visual Preview */}
        <div className="flex-[4] flex flex-col min-h-0 bg-bg-base/40">
          <div className="p-6 border-b border-border-default bg-bg-surface/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h3 className="text-h3">Visual Preview</h3>
                <p className="text-caption">Pratinjau tampilan pada layar proyektor</p>
              </div>
              <div className="flex items-center gap-1.5 bg-bg-elevated p-1 rounded-lg border border-border-subtle">
                <span className="px-2 text-[10px] font-bold text-text-muted uppercase">Slide</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={activeSlideIdx <= 0}
                    onClick={() => setActiveSlideIdx((v) => v - 1)}
                    className="p-1.5 rounded hover:bg-bg-active text-text-primary disabled:opacity-20"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold text-brand-primary w-8 text-center tabular-nums">
                    {previewSlides.length > 0
                      ? `${activeSlideIdx + 1} / ${previewSlides.length}`
                      : '0'}
                  </span>
                  <button
                    disabled={activeSlideIdx >= previewSlides.length - 1}
                    onClick={() => setActiveSlideIdx((v) => v + 1)}
                    className="p-1.5 rounded hover:bg-bg-active text-text-primary disabled:opacity-20 rotate-180"
                  >
                    <ArrowLeft size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Projection Frame Simulator */}
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border-4 border-bg-surface bg-black relative group/monitor">
              {/* Simulator Background */}
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 group-hover/monitor:scale-105"
                style={{
                  backgroundColor: bgColor,
                  backgroundImage: theme.projection_bg_image
                    ? `url(${theme.projection_bg_image})`
                    : 'none',
                  opacity: theme.projection_bg_opacity || 0.7
                }}
              />

              {/* Simulator Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[10%] z-10 text-center">
                {activeSlide ? (
                  <div
                    className="w-full animate-fade-in"
                    style={{
                      fontFamily,
                      color: textColor,
                      textShadow:
                        theme.projection_text_shadow === '1'
                          ? '2px 4px 12px rgba(0,0,0,0.8)'
                          : 'none',
                      fontSize: 'min(3.5vw, 24px)',
                      lineHeight: '1.4',
                      fontWeight: '600',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {activeSlide.sectionLabel && (
                      <div className="text-micro opacity-60 mb-2" style={{ color: textColor }}>
                        [{activeSlide.sectionLabel}]
                      </div>
                    )}
                    {activeSlide.text}
                  </div>
                ) : (
                  <div className="text-text-disabled text-xs font-medium italic">
                    Belum ada lirik untuk ditampilkan
                  </div>
                )}
              </div>

              {/* Status Badge Overlays */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1 rounded bg-black/40 backdrop-blur-md border border-white/10 text-[9px] text-white/60 font-black tracking-widest">
                PREVIEW MODE
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
            <h4 className="text-micro text-text-disabled mb-4">
              Urutan Slide ({previewSlides.length})
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {previewSlides.map((slide, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSlideIdx(idx)}
                  className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                    activeSlideIdx === idx
                      ? 'border-brand-primary ring-4 ring-brand-primary/10 shadow-lg'
                      : 'border-border-default hover:border-border-strong opacity-70 hover:opacity-100'
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
                      opacity: 0.5
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-[8px] font-bold text-white/80 line-clamp-3 leading-normal">
                    {slide.text}
                  </div>
                  <div className="absolute bottom-1 right-2 text-[9px] font-black text-white/40 tabular-nums">
                    {idx + 1}
                  </div>
                  {slide.sectionLabel && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-brand-secondary text-white text-[7px] font-black uppercase">
                      {slide.sectionLabel}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
