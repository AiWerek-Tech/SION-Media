import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  GripVertical,
  Image as ImageIcon,
  MonitorPlay,
  MoreVertical,
  Music2,
  Plus,
  Radio,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  SplitSquareHorizontal,
  Wand2
} from 'lucide-react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
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

function formatRuntime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

export function SongEditorScreen(): React.JSX.Element {
  const { editingSong, hymnals, songs, setScreen, loadSongs, showToast } = useAppStore()
  const isEditing = !!editingSong
  const projectionState = useProjectionStore((state) => state.projectionState)
  const programLockState = useProjectionStore((state) => state.programLockState)
  const hasPendingLiveChanges = useProjectionStore((state) => state.hasPendingLiveChanges)
  const timerElapsed = useProjectionStore((state) => state.timerElapsed)
  const timerRunning = useProjectionStore((state) => state.timerRunning)
  const fadeSpeed = useProjectionStore((state) => state.fadeSpeed)
  const programSlide = useProjectionStore((state) => state.programSlide)
  const programSlideIndex = useProjectionStore((state) => state.programSlideIndex)
  const programSlides = useProjectionStore((state) => state.programSlides)

  const [hymnalId, setHymnalId] = useState<number>(editingSong?.hymnal_id || hymnals[0]?.id || 1)
  const [songNumber, setSongNumber] = useState(editingSong?.number || '')
  const [title, setTitle] = useState(editingSong?.title || '')
  const [alternateTitle, setAlternateTitle] = useState(editingSong?.alternate_title || '')
  const [lyricsRaw, setLyricsRaw] = useState(editingSong?.lyrics_raw || '')
  const [category, setCategory] = useState(editingSong?.category || '')
  const [author, setAuthor] = useState(editingSong?.author || '')
  const [composer, setComposer] = useState(editingSong?.composer || '')
  const [scriptureReference, setScriptureReference] = useState(
    editingSong?.scripture_reference || ''
  )
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
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'properties'>('preview')

  const [initialSnapshot] = useState({
    hymnalId: editingSong?.hymnal_id || hymnals[0]?.id || 1,
    songNumber: editingSong?.number || '',
    title: editingSong?.title || '',
    alternateTitle: editingSong?.alternate_title || '',
    lyricsRaw: editingSong?.lyrics_raw || '',
    category: editingSong?.category || '',
    author: editingSong?.author || '',
    composer: editingSong?.composer || '',
    scriptureReference: editingSong?.scripture_reference || '',
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
      author !== initialSnapshot.author ||
      composer !== initialSnapshot.composer ||
      scriptureReference !== initialSnapshot.scriptureReference ||
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
    author,
    composer,
    scriptureReference,
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

    const keyNoteValidation = validateKeyNote(keyNote)
    const tempoValidation = validateTempo(tempo)
    setKeyNoteError(keyNoteValidation.valid ? null : keyNoteValidation.message || null)
    setTempoError(tempoValidation.valid ? null : tempoValidation.message || null)
    if (!keyNoteValidation.valid || !tempoValidation.valid) {
      showToast('Periksa kembali data metadata (nada dasar/tempo)', 'error')
      return
    }

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
        author,
        composer,
        key_note: keyNote,
        time_signature: timeSignature,
        tempo,
        scripture_reference: scriptureReference,
        tags: editingSong?.tags || ''
      }
      if (isEditing && editingSong) {
        await window.api.songs.update(editingSong.id, songData)
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
    author,
    composer,
    scriptureReference,
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

  useEffect(() => {
    const handler = (): void => {
      void handleSave()
    }
    document.addEventListener('sion:save-song', handler)
    return () => document.removeEventListener('sion:save-song', handler)
  }, [handleSave])

  const handleBack = (): void => {
    if (isDirty && !showDiscardDialog) {
      setShowDiscardDialog(true)
      return
    }
    setScreen('dashboard')
  }

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

  const activeSlide = previewSlides[Math.min(activeSlideIdx, Math.max(previewSlides.length - 1, 0))]
  const fontFamily = theme.projection_font_family || 'Inter'
  const textColor = theme.projection_text_color || '#ffffff'
  const bgColor = theme.projection_bg_color || '#07101f'
  const bgOpacity = Number(theme.projection_bg_opacity || 0.74) || 0.74
  const lineWarnings = lyricsRaw.split('\n').reduce((count, line) => {
    return count + (line.length > 40 ? 1 : 0)
  }, 0)

  const activeLineCount = activeSlide?.text.split('\n').filter(Boolean).length || 0
  const activeCharacterCount = activeSlide?.text.length || 0
  const selectedHymnal = hymnals.find((h) => h.id === hymnalId)
  const isCurrentSongLive = Boolean(editingSong?.id && programSlide?.songId === editingSong.id)
  const outputLabel =
    projectionState === 'LIVE'
      ? 'OUTPUT ACTIVE'
      : projectionState === 'BLACK'
        ? 'BLACKOUT'
        : projectionState === 'FREEZE'
          ? 'FREEZE'
          : 'STANDBY'
  const routeLabel = isCurrentSongLive
    ? `PROGRAM ${programSlideIndex + 1}/${Math.max(programSlides.length, 1)}`
    : 'PREVIEW ROUTE'
  const lockLabel = hasPendingLiveChanges
    ? 'LIVE DIRTY'
    : programLockState === 'LIVE_LOCK'
      ? 'LIVE LOCK'
      : 'SAFE EDIT'

  return (
    <div className="song-studio">
      <header className="song-studio__topbar">
        <div className="song-studio__title-group">
          <button className="song-studio__back-button" onClick={handleBack} aria-label="Kembali">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="song-studio__title-row">
              <h1>{isEditing ? 'Edit Lagu' : 'Tambah Lagu Baru'}</h1>
              <span className={`song-studio__save-state ${isDirty ? 'is-dirty' : ''}`}>
                {isDirty ? 'Belum disimpan' : 'Tersimpan'}
              </span>
            </div>
            <div className="song-studio__breadcrumb">
              <span>{selectedHymnal?.code || editingSong?.hymnal_code || 'LS'}</span>
              <span>{songNumber || editingSong?.number || 'New'}</span>
              <span>{title || 'Judul lagu belum diisi'}</span>
            </div>
          </div>
        </div>

        <div className="song-studio__broadcast-rack" aria-label="Status broadcast">
          <div className={`song-studio__rack-cell ${projectionState === 'LIVE' ? 'is-live' : ''}`}>
            <Radio size={14} />
            <span>{outputLabel}</span>
          </div>
          <div className="song-studio__rack-cell">
            <MonitorPlay size={14} />
            <span>{routeLabel}</span>
          </div>
          <div className={`song-studio__rack-cell ${timerRunning ? 'is-running' : ''}`}>
            <Clock3 size={14} />
            <span>{formatRuntime(timerElapsed)}</span>
          </div>
          <div className={`song-studio__rack-cell ${hasPendingLiveChanges ? 'is-warning' : ''}`}>
            <Activity size={14} />
            <span>{lockLabel}</span>
          </div>
        </div>

        <div className="song-studio__status-cluster">
          {duplicateWarning && (
            <span className="song-studio__warning-pill">
              <AlertTriangle size={13} />
              Duplikat
            </span>
          )}
          {lineWarnings > 0 && (
            <span className="song-studio__warning-pill">
              <AlertTriangle size={13} />
              {lineWarnings} baris panjang
            </span>
          )}
          <button className="song-studio__ghost-action" onClick={handleBack}>
            Batal
          </button>
          <button
            className="song-studio__primary-action"
            onClick={handleSave}
            disabled={isSaving || !songNumber.trim() || !title.trim()}
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <PanelGroup className="song-studio__workspace" direction="horizontal">
        <Panel defaultSize={28} minSize={20} maxSize={42} order={1}>
          <aside className="song-studio__left-panel song-studio__panel">
            <PanelGroup direction="vertical">
              <Panel defaultSize={68} minSize={38} order={1}>
                <section className="song-studio__section">
                  <div className="song-studio__section-heading">
                    <div>
                      <h2>Informasi Dasar</h2>
                      <p>Identitas lagu dan pengaturan buku lagu.</p>
                    </div>
                    <Music2 size={16} />
                  </div>

                  <div className="song-studio__form-grid two">
                    <label className="song-field span-wide">
                      <span>Buku Lagu (Hymnal)</span>
                      <div className="song-select-wrap">
                        <select
                          value={hymnalId}
                          onChange={(e) => setHymnalId(Number(e.target.value))}
                        >
                          {hymnals.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.code} - {h.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </label>

                    <label className="song-field">
                      <span>Nomor</span>
                      <input value={songNumber} onChange={(e) => setSongNumber(e.target.value)} />
                    </label>
                  </div>

                  <label className="song-field">
                    <span>Judul Utama</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </label>

                  <label className="song-field">
                    <span>Kategori</span>
                    <div className="song-select-wrap">
                      <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Pilih Kategori</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </label>

                  <label className="song-field">
                    <span>Sub Judul (English/Optional)</span>
                    <input
                      value={alternateTitle}
                      onChange={(e) => setAlternateTitle(e.target.value)}
                      placeholder="Before Jehovah's Awful Throne"
                    />
                  </label>

                  <div className="song-studio__form-grid two-even">
                    <label className="song-field">
                      <span>Pengarang (Arranger)</span>
                      <input value={author} onChange={(e) => setAuthor(e.target.value)} />
                    </label>
                    <label className="song-field">
                      <span>Komposer</span>
                      <input value={composer} onChange={(e) => setComposer(e.target.value)} />
                    </label>
                  </div>

                  <label className="song-field">
                    <span>Referensi Alkitab</span>
                    <input
                      value={scriptureReference}
                      onChange={(e) => setScriptureReference(e.target.value)}
                      placeholder="Yohanes 3:16"
                    />
                  </label>

                  <div className="song-studio__form-grid musical">
                    <label className={`song-field ${keyNoteError ? 'has-error' : ''}`}>
                      <span>Nada Dasar</span>
                      <input
                        value={keyNote}
                        onChange={(e) => {
                          setKeyNote(e.target.value)
                          const v = validateKeyNote(e.target.value)
                          setKeyNoteError(v.valid ? null : v.message || null)
                        }}
                        onBlur={() => setKeyNote(formatKeyNote(keyNote))}
                        placeholder="C / G / Am"
                      />
                      {keyNoteError && <small>{keyNoteError}</small>}
                    </label>

                    <label className="song-field">
                      <span>Birama</span>
                      <div className="song-select-wrap">
                        <select
                          value={timeSignature}
                          onChange={(e) => setTimeSignature(e.target.value)}
                        >
                          <option value="">Pilih Birama</option>
                          <option value="2/2">2/2</option>
                          <option value="2/4">2/4</option>
                          <option value="3/4">3/4</option>
                          <option value="4/4">4/4</option>
                          <option value="6/8">6/8</option>
                          <option value="12/8">12/8</option>
                          <option value="C">C</option>
                          <option value="C|">C|</option>
                        </select>
                        <ChevronDown size={14} />
                      </div>
                    </label>

                    <label className={`song-field ${tempoError ? 'has-error' : ''}`}>
                      <span>Tempo (BPM)</span>
                      <input
                        value={tempo}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          setTempo(val)
                          const v = validateTempo(val)
                          setTempoError(v.valid ? null : v.message || null)
                        }}
                        onBlur={() => setTempo(formatTempo(tempo))}
                        placeholder="100"
                      />
                      {tempoError && <small>{tempoError}</small>}
                    </label>
                  </div>
                </section>
              </Panel>

              <PanelResizeHandle className="song-studio__resize-handle song-studio__resize-handle--vertical" />

              <Panel defaultSize={32} minSize={22} order={2}>
                <section className="song-studio__section song-studio__lyrics-section">
                  <div className="song-studio__section-heading">
                    <div>
                      <h2>Lirik & Struktur</h2>
                      <p>Kelola lirik dan struktur slide lagu.</p>
                    </div>
                    <FileText size={16} />
                  </div>

                  <div className="song-studio__chip-group">
                    {['Bait', 'Chorus', 'Bridge', 'Ending', 'Pre-Chorus'].map((sec) => (
                      <button key={sec} onClick={() => insertSection(sec)}>
                        {sec}
                      </button>
                    ))}
                  </div>

                  <div className="song-studio__tool-row">
                    <button onClick={insertBreak}>
                      <SplitSquareHorizontal size={14} />
                      Slide Break
                    </button>
                    <button onClick={handleAutoFormat}>
                      <Wand2 size={14} />
                      Format
                    </button>
                  </div>

                  <textarea
                    value={lyricsRaw}
                    onChange={(e) => setLyricsRaw(e.target.value)}
                    placeholder="Ketik lirik di sini. Gunakan --- untuk membagi slide manual."
                    spellCheck={false}
                  />
                </section>
              </Panel>
            </PanelGroup>
          </aside>
        </Panel>

        <PanelResizeHandle className="song-studio__resize-handle" />

        <Panel defaultSize={45} minSize={30} order={2}>
          <section className="song-studio__center-panel song-studio__panel">
          <div className="song-studio__panel-header">
            <div>
              <h2>Slide Strip</h2>
              <p>Susunan slide otomatis berdasarkan struktur lagu.</p>
            </div>
            <div className="song-studio__header-actions">
              <button>
                <Plus size={15} />
                Tambah Slide
              </button>
              <button onClick={handleAutoFormat}>
                <Sparkles size={15} />
                Otomatis
              </button>
            </div>
          </div>

          <div className="song-studio__slide-stack">
            {previewSlides.length === 0 ? (
              <div className="song-studio__empty-strip">
                <SplitSquareHorizontal size={30} />
                <span>Belum ada slide. Tambahkan lirik untuk membuat strip presentasi.</span>
              </div>
            ) : (
              previewSlides.map((slide, idx) => {
                const isActive = activeSlideIdx === idx
                const lineCount = slide.text.split('\n').filter(Boolean).length
                const excerpt = slide.text.split('\n').filter(Boolean).slice(0, 2).join(' ')

                return (
                  <button
                    key={`${slide.slideIndex}-${idx}`}
                    className={`song-studio__slide-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveSlideIdx(idx)}
                  >
                    <GripVertical size={18} className="song-studio__drag" />
                    <span className="song-studio__section-badge">
                      {slide.sectionLabel || 'Slide'}
                    </span>
                    <span className="song-studio__slide-copy">{excerpt || 'Slide kosong'}</span>
                    <span className="song-studio__line-count">{lineCount} baris</span>
                    <MoreVertical size={17} className="song-studio__more" />
                  </button>
                )
              })
            )}
          </div>
          </section>
        </Panel>

        <PanelResizeHandle className="song-studio__resize-handle" />

        <Panel defaultSize={27} minSize={20} maxSize={40} order={3}>
          <aside className="song-studio__right-panel song-studio__panel">
            <PanelGroup direction="vertical">
              <Panel defaultSize={46} minSize={32} order={1}>
                <div className="song-studio__right-top">
                  <div className="song-studio__panel-header compact">
                    <div>
                      <h2>Preview & Properti</h2>
                      <p>Pratinjau slide aktif dan properti konten.</p>
                    </div>
                    <MonitorPlay size={17} />
                  </div>

                  <div className="song-studio__tabs">
                    <button
                      className={inspectorTab === 'preview' ? 'is-active' : ''}
                      onClick={() => setInspectorTab('preview')}
                    >
                      Preview
                    </button>
                    <button
                      className={inspectorTab === 'properties' ? 'is-active' : ''}
                      onClick={() => setInspectorTab('properties')}
                    >
                      Properti
                    </button>
                  </div>

                  <div className="song-studio__preview-frame">
                    <div className="song-studio__preview-tally">
                      <span className={projectionState === 'LIVE' ? 'is-live' : ''} />
                      {projectionState === 'LIVE' ? 'PROGRAM LIVE' : 'PREVIEW'}
                    </div>
                    <div
                      className="song-studio__preview-bg"
                      style={{
                        backgroundColor: bgColor,
                        backgroundImage: theme.projection_bg_image
                          ? `url(${theme.projection_bg_image})`
                          : undefined,
                        opacity: bgOpacity
                      }}
                    />
                    <div className="song-studio__preview-light" />
                    <div className="song-studio__preview-scan" />
                    <div className="song-studio__preview-index">{activeSlideIdx + 1}</div>
                    <div className="song-studio__preview-badge">
                      {activeSlide?.sectionLabel || 'Preview'}
                    </div>
                    <div
                      className="song-studio__preview-text"
                      style={{
                        fontFamily,
                        color: textColor,
                        textShadow:
                          theme.projection_text_shadow === '1'
                            ? '0 3px 24px rgba(0,0,0,.88), 0 8px 48px rgba(0,0,0,.55)'
                            : '0 3px 18px rgba(0,0,0,.7)'
                      }}
                    >
                      {activeSlide ? activeSlide.text : 'Belum ada lirik'}
                    </div>
                    <div className="song-studio__preview-meta">1920 x 1080</div>
                  </div>

                  <div className="song-studio__output-strip">
                    <span>60 FPS</span>
                    <span>{outputLabel}</span>
                    <span>Fade {fadeSpeed.toFixed(1)}s</span>
                    <span>{isCurrentSongLive ? 'Confidence linked' : 'Preview safe'}</span>
                  </div>
                </div>
              </Panel>

              <PanelResizeHandle className="song-studio__resize-handle song-studio__resize-handle--vertical" />

              <Panel defaultSize={54} minSize={32} order={2}>
                <div className="song-studio__right-scroll">

          <section className="song-studio__property-card">
            <div className="song-studio__property-title">
              <FileText size={15} />
              <span>Konten</span>
              <strong>{activeCharacterCount} karakter</strong>
            </div>
            <div className="song-studio__content-box">
              <div>
                <span>Slide #{activeSlideIdx + 1}</span>
                <strong>{activeSlide?.sectionLabel || 'Slide'}</strong>
              </div>
              <p>{activeSlide?.text || 'Slide kosong'}</p>
            </div>
          </section>

          <section className="song-studio__property-card">
            <div className="song-studio__property-title">
              <Settings2 size={15} />
              <span>Pengaturan Slide</span>
            </div>
            <div className="song-studio__settings-grid">
              <label className="song-field">
                <span>Transisi</span>
                <div className="song-select-wrap">
                  <select defaultValue="Fade">
                    <option>Fade</option>
                    <option>Dissolve</option>
                    <option>Cut</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </label>
              <label className="song-field">
                <span>Durasi (Detik)</span>
                <input defaultValue="5.0" />
              </label>
              <label className="song-field">
                <span>Background</span>
                <div className="song-studio__background-select">
                  <ImageIcon size={15} />
                  <span>Theme</span>
                  <ChevronDown size={14} />
                </div>
              </label>
            </div>
          </section>

          <section className="song-studio__property-card">
            <div className="song-studio__property-title">
              <SlidersHorizontal size={15} />
              <span>Studio Metadata</span>
            </div>
            <div className="song-studio__meta-grid">
              <div>
                <Music2 size={14} />
                <span>Key</span>
                <strong>{keyNote || '-'}</strong>
              </div>
              <div>
                <Clock3 size={14} />
                <span>BPM</span>
                <strong>{tempo || '-'}</strong>
              </div>
              <div>
                <Radio size={14} />
                <span>Birama</span>
                <strong>{timeSignature || '-'}</strong>
              </div>
              <div>
                <CheckCircle2 size={14} />
                <span>Baris</span>
                <strong>{activeLineCount}</strong>
              </div>
            </div>
          </section>

          <section className="song-studio__property-card">
            <div className="song-studio__property-title">
              <MonitorPlay size={15} />
              <span>Output Mapping</span>
              <strong>{routeLabel}</strong>
            </div>
            <div className="song-studio__broadcast-grid">
              <div>
                <span>Program</span>
                <strong>{projectionState}</strong>
              </div>
              <div>
                <span>Lock</span>
                <strong>{programLockState}</strong>
              </div>
              <div>
                <span>Timer</span>
                <strong>{formatRuntime(timerElapsed)}</strong>
              </div>
              <div>
                <span>Screen</span>
                <strong>MAIN 16:9</strong>
              </div>
            </div>
          </section>

          <label className="song-field">
            <span>Catatan (Opsional)</span>
            <input placeholder="Tambahkan catatan untuk slide ini..." />
          </label>
                </div>
              </Panel>
            </PanelGroup>
          </aside>
        </Panel>
      </PanelGroup>

      {showDiscardDialog && (
        <div className="song-studio__modal">
          <div className="song-studio__modal-card">
            <div className="song-studio__modal-icon">
              <AlertTriangle size={22} />
            </div>
            <h3>Perubahan Belum Disimpan</h3>
            <p>Apakah Anda yakin ingin keluar tanpa menyimpan perubahan lagu ini?</p>
            <div className="song-studio__modal-actions">
              <button onClick={() => setShowDiscardDialog(false)}>Lanjutkan Edit</button>
              <button
                className="danger"
                onClick={() => {
                  setShowDiscardDialog(false)
                  setScreen('dashboard')
                }}
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
