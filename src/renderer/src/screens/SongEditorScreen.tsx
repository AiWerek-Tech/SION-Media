import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Film,
  Image as ImageIcon,
  MonitorPlay,
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
import { DEFAULT_SCENE_PRESETS } from '../atmosphere/presets'
import type { AtmosphereConfig, MediaAssetRecord, MediaCollectionRecord } from '../atmosphere/types'

function formatRuntime(seconds: number): string {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

function toFileUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

interface SlideInspectorSettings {
  transition: 'Fade' | 'Dissolve' | 'Cut'
  duration: string
  background: 'Theme' | 'Ambient' | 'Black'
  note: string
}

const DEFAULT_SLIDE_SETTINGS: SlideInspectorSettings = {
  transition: 'Fade',
  duration: '5.0',
  background: 'Theme',
  note: ''
}

function resolveSongAtmosphereState(raw?: string): {
  mode: 'inherit-global' | 'scene-preset' | 'library-asset'
  presetId: string
  assetId: string
  raw: string
} {
  if (!raw) {
    return {
      mode: 'inherit-global',
      presetId: DEFAULT_SCENE_PRESETS[0]?.id || 'worship',
      assetId: '',
      raw: ''
    }
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string; name?: string; media?: { assetId?: string } }
    if (parsed.media?.assetId) {
      return {
        mode: 'library-asset',
        presetId: DEFAULT_SCENE_PRESETS[0]?.id || 'worship',
        assetId: parsed.media.assetId,
        raw
      }
    }

    const matchedPreset = DEFAULT_SCENE_PRESETS.find(
      (preset) =>
        preset.id === parsed.id ||
        preset.config.id === parsed.id ||
        preset.name === parsed.name ||
        preset.config.name === parsed.name
    )

    return {
      mode: 'scene-preset',
      presetId: matchedPreset?.id || DEFAULT_SCENE_PRESETS[0]?.id || 'worship',
      assetId: '',
      raw
    }
  } catch {
    return {
      mode: 'inherit-global',
      presetId: DEFAULT_SCENE_PRESETS[0]?.id || 'worship',
      assetId: '',
      raw: ''
    }
  }
}

function buildSongAssetAtmosphere(asset: MediaAssetRecord): AtmosphereConfig {
  return {
    id: `song-asset-${asset.id}`,
    name: asset.name,
    mode: asset.type === 'video' ? 'video' : 'image',
    media: {
      assetId: asset.id,
      path: asset.localPath,
      fit: 'cover',
      loop: true,
      muted: true
    }
  }
}

export function SongEditorScreen(): React.JSX.Element {
  const { editingSong, hymnals, songs, setScreen, loadSongs, showToast } = useAppStore()
  const isEditing = !!editingSong
  const initialAtmosphereState = resolveSongAtmosphereState(editingSong?.song_background_config)
  const projectionState = useProjectionStore((state) => state.projectionState)
  const programLockState = useProjectionStore((state) => state.programLockState)
  const hasPendingLiveChanges = useProjectionStore((state) => state.hasPendingLiveChanges)
  const timerElapsed = useProjectionStore((state) => state.timerElapsed)
  const timerRunning = useProjectionStore((state) => state.timerRunning)
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
  const [songAtmosphereMode, setSongAtmosphereMode] = useState<
    'inherit-global' | 'scene-preset' | 'library-asset'
  >(initialAtmosphereState.mode)
  const [songAtmospherePresetId, setSongAtmospherePresetId] = useState(
    initialAtmosphereState.presetId
  )
  const [songAtmosphereAssetId, setSongAtmosphereAssetId] = useState(initialAtmosphereState.assetId)
  const [songAtmosphereCollectionId, setSongAtmosphereCollectionId] = useState<string>('')
  const [songAtmosphereAssetSearch, setSongAtmosphereAssetSearch] = useState('')
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([])
  const [mediaCollections, setMediaCollections] = useState<MediaCollectionRecord[]>([])
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<'preview' | 'properties'>('preview')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [pendingFocusLastSlide, setPendingFocusLastSlide] = useState(false)
  const [slideSettingsByIndex, setSlideSettingsByIndex] = useState<
    Record<number, SlideInspectorSettings>
  >({})
  const saveMenuRef = useRef<HTMLDivElement | null>(null)

  const [initialSnapshot, setInitialSnapshot] = useState({
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
    tempo: editingSong?.tempo || '',
    songBackgroundConfig: editingSong?.song_background_config || ''
  })

  const selectedAtmospherePreset = useMemo(
    () =>
      DEFAULT_SCENE_PRESETS.find((preset) => preset.id === songAtmospherePresetId) ||
      DEFAULT_SCENE_PRESETS[0],
    [songAtmospherePresetId]
  )

  const orderedMediaAssets = useMemo(() => {
    if (!songAtmosphereCollectionId) return mediaAssets
    const collection = mediaCollections.find((item) => item.id === songAtmosphereCollectionId)
    if (!collection) {
      return mediaAssets.filter((asset) =>
        (asset.collectionIds || []).includes(songAtmosphereCollectionId)
      )
    }

    const byId = new Map(mediaAssets.map((asset) => [asset.id, asset]))
    const ordered: MediaAssetRecord[] = []
    for (const assetId of collection.assetIds) {
      const asset = byId.get(assetId)
      if (asset) ordered.push(asset)
    }
    return ordered
  }, [mediaAssets, mediaCollections, songAtmosphereCollectionId])

  const filteredMediaAssets = useMemo(() => {
    const base = songAtmosphereCollectionId ? orderedMediaAssets : mediaAssets
    const query = songAtmosphereAssetSearch.trim().toLowerCase()
    if (!query) return base
    return base.filter((asset) => {
      const haystack =
        `${asset.name} ${asset.category || ''} ${(asset.tags || []).join(' ')}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [mediaAssets, orderedMediaAssets, songAtmosphereAssetSearch, songAtmosphereCollectionId])

  const selectedMediaAsset = useMemo(
    () => mediaAssets.find((asset) => asset.id === songAtmosphereAssetId) || null,
    [mediaAssets, songAtmosphereAssetId]
  )

  const songBackgroundConfig =
    songAtmosphereMode === 'inherit-global'
      ? ''
      : songAtmosphereMode === 'scene-preset'
        ? selectedAtmospherePreset
          ? JSON.stringify(selectedAtmospherePreset.config)
          : ''
        : selectedMediaAsset
          ? JSON.stringify(buildSongAssetAtmosphere(selectedMediaAsset))
          : ''

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
      tempo !== initialSnapshot.tempo ||
      songBackgroundConfig !== initialSnapshot.songBackgroundConfig
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
    songBackgroundConfig,
    initialSnapshot
  ])

  useEffect(() => {
    window.api.settings
      .getAll()
      .then(setTheme)
      .catch((err) => logger.error('Failed to load theme:', err))
  }, [])

  useEffect(() => {
    Promise.all([window.api.media.getAll(), window.api.media.getCollections()])
      .then(([assets, collections]) => {
        setMediaAssets(assets as MediaAssetRecord[])
        setMediaCollections(collections as MediaCollectionRecord[])
      })
      .catch((err) => logger.error('Failed to load media library for song editor:', err))
  }, [])

  useEffect(() => {
    if (!songAtmosphereCollectionId) return
    if (orderedMediaAssets.some((asset) => asset.id === songAtmosphereAssetId)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSongAtmosphereAssetId(orderedMediaAssets[0]?.id || '')
  }, [orderedMediaAssets, songAtmosphereAssetId, songAtmosphereCollectionId])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (!saveMenuRef.current?.contains(event.target as Node)) {
        setSaveMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const previewSlides: SlideData[] = useMemo(() => {
    return generateSlides(editingSong?.id || 0, lyricsRaw, undefined, {
      keyNote: keyNote || undefined,
      timeSignature: timeSignature || undefined,
      tempo: tempo || undefined
    })
  }, [lyricsRaw, editingSong, keyNote, timeSignature, tempo])

  const checkDuplicate = useCallback((): string | null => {
    if (!songNumber.trim() || !title.trim()) return null

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDuplicateWarning(checkDuplicate())
  }, [checkDuplicate])

  useEffect(() => {
    if (previewSlides.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (activeSlideIdx !== 0) setActiveSlideIdx(0)
      return
    }

    if (pendingFocusLastSlide) {
      setActiveSlideIdx(previewSlides.length - 1)
      setPendingFocusLastSlide(false)
      return
    }

    if (activeSlideIdx > previewSlides.length - 1) {
      setActiveSlideIdx(previewSlides.length - 1)
    }
  }, [activeSlideIdx, pendingFocusLastSlide, previewSlides.length])

  const handleSave = useCallback(
    async (options?: { closeAfterSave?: boolean }): Promise<void> => {
      if (!songNumber.trim() || !title.trim()) return

      const closeAfterSave = options?.closeAfterSave ?? !isEditing

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
          tags: editingSong?.tags || '',
          song_background_config: songBackgroundConfig
        }
        if (isEditing && editingSong) {
          await window.api.songs.update(editingSong.id, songData)
          const newSlides = generateSlides(editingSong.id, lyricsRaw, undefined, {
            keyNote: keyNote || undefined,
            timeSignature: timeSignature || undefined,
            tempo: tempo || undefined
          })
          useProjectionStore.getState().hotSwapSlides(editingSong.id, newSlides)
          if (isCurrentSongLive) {
            window.api.projection.themeUpdate({
              song_background_config: songBackgroundConfig
            })
          }
        } else {
          await window.api.songs.add(songData)
        }
        await loadSongs()
        setInitialSnapshot({
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
          songBackgroundConfig
        })
        setDuplicateWarning(null)
        setSaveMenuOpen(false)

        if (closeAfterSave) {
          setScreen('dashboard')
          showToast(isEditing ? 'Lagu berhasil diperbarui' : 'Lagu berhasil ditambahkan', 'success')
          return
        }

        showToast('Perubahan lagu berhasil disimpan', 'success')
      } catch (err) {
        logger.error('Save error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Gagal menyimpan lagu'
        showToast(errorMessage, 'error')
      } finally {
        setIsSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
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
    ]
  )

  useEffect(() => {
    const handler = (): void => {
      void handleSave({ closeAfterSave: false })
    }
    document.addEventListener('sion:save-song', handler)
    return () => document.removeEventListener('sion:save-song', handler)
  }, [handleSave])

  const handleBack = (): void => {
    setSaveMenuOpen(false)
    if (isDirty && !showDiscardDialog) {
      setShowDiscardDialog(true)
      return
    }
    setScreen('dashboard')
  }

  const handleAutoFormat = (): void => {
    setLyricsRaw(autoFormatLyrics(lyricsRaw))
  }

  const handleAddSlide = (): void => {
    if (!lyricsRaw.trim()) {
      showToast('Tambahkan minimal satu baris lirik sebelum membuat slide baru', 'info')
      return
    }

    setLyricsRaw((prev) => `${prev.trimEnd()}\n\n---\n`)
    setPendingFocusLastSlide(true)
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
  const activeSlideSettings = slideSettingsByIndex[activeSlideIdx] || DEFAULT_SLIDE_SETTINGS
  const selectedHymnal = hymnals.find((h) => h.id === hymnalId)
  const isCurrentSongLive = Boolean(editingSong?.id && programSlide?.songId === editingSong.id)
  const canSave = !isSaving && !!songNumber.trim() && !!title.trim()
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

  const updateActiveSlideSettings = (patch: Partial<SlideInspectorSettings>): void => {
    setSlideSettingsByIndex((prev) => ({
      ...prev,
      [activeSlideIdx]: {
        ...(prev[activeSlideIdx] || DEFAULT_SLIDE_SETTINGS),
        ...patch
      }
    }))
  }

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
          <div className="song-studio__save-actions" ref={saveMenuRef}>
            <button
              className="song-studio__primary-action"
              onClick={() => void handleSave({ closeAfterSave: false })}
              disabled={!canSave}
            >
              <Save size={16} />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button
              className="song-studio__primary-action song-studio__primary-action--menu"
              onClick={() => setSaveMenuOpen((prev) => !prev)}
              disabled={!canSave}
              aria-label="Opsi simpan"
              aria-expanded={saveMenuOpen}
            >
              <ChevronDown size={14} />
            </button>
            {saveMenuOpen && (
              <div className="song-studio__save-menu">
                <button onClick={() => void handleSave({ closeAfterSave: false })}>
                  Simpan dan lanjut edit
                </button>
                <button onClick={() => void handleSave({ closeAfterSave: true })}>
                  Simpan dan tutup
                </button>
              </div>
            )}
          </div>
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
                <button onClick={handleAddSlide}>
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
                      <span className="song-studio__slide-order">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="song-studio__section-badge">
                        {slide.sectionLabel || 'Slide'}
                      </span>
                      <span className="song-studio__slide-copy">{excerpt || 'Slide kosong'}</span>
                      <span className="song-studio__line-count">{lineCount} baris</span>
                      <span className="song-studio__slide-state">
                        {isActive ? 'Aktif' : 'Pilih'}
                      </span>
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

                  {inspectorTab === 'preview' ? (
                    <>
                      <div className="song-studio__preview-frame">
                        <div className="song-studio__preview-tally">
                          <span className={projectionState === 'LIVE' ? 'is-live' : ''} />
                          {projectionState === 'LIVE' ? 'PROGRAM LIVE' : 'PREVIEW'}
                        </div>
                        <div
                          className="song-studio__preview-bg"
                          style={{
                            backgroundColor:
                              activeSlideSettings.background === 'Black' ? '#020617' : bgColor,
                            backgroundImage:
                              activeSlideSettings.background === 'Theme' &&
                              theme.projection_bg_image
                                ? `url(${theme.projection_bg_image})`
                                : undefined,
                            opacity: activeSlideSettings.background === 'Black' ? 1 : bgOpacity
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
                        <span>
                          {activeSlideSettings.transition} {activeSlideSettings.duration}s
                        </span>
                        <span>{isCurrentSongLive ? 'Confidence linked' : 'Preview safe'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="song-studio__inspector-summary">
                      <div>
                        <span>Slide Aktif</span>
                        <strong>
                          #{activeSlideIdx + 1} · {activeSlide?.sectionLabel || 'Slide'}
                        </strong>
                      </div>
                      <div>
                        <span>Transisi</span>
                        <strong>{activeSlideSettings.transition}</strong>
                      </div>
                      <div>
                        <span>Durasi</span>
                        <strong>{activeSlideSettings.duration}s</strong>
                      </div>
                      <div>
                        <span>Background</span>
                        <strong>{activeSlideSettings.background}</strong>
                      </div>
                      <div>
                        <span>Status Output</span>
                        <strong>{outputLabel}</strong>
                      </div>
                      <div className="song-studio__inspector-summary--wide">
                        <span>Catatan Operator</span>
                        <strong>
                          {activeSlideSettings.note || 'Belum ada catatan untuk slide ini'}
                        </strong>
                      </div>
                    </div>
                  )}
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
                          <select
                            value={activeSlideSettings.transition}
                            onChange={(e) =>
                              updateActiveSlideSettings({
                                transition: e.target.value as SlideInspectorSettings['transition']
                              })
                            }
                          >
                            <option>Fade</option>
                            <option>Dissolve</option>
                            <option>Cut</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </label>
                      <label className="song-field">
                        <span>Durasi (Detik)</span>
                        <input
                          value={activeSlideSettings.duration}
                          onChange={(e) =>
                            updateActiveSlideSettings({
                              duration:
                                e.target.value.replace(/[^0-9.]/g, '') ||
                                DEFAULT_SLIDE_SETTINGS.duration
                            })
                          }
                        />
                      </label>
                      <label className="song-field">
                        <span>Background</span>
                        <div className="song-select-wrap">
                          <select
                            value={activeSlideSettings.background}
                            onChange={(e) =>
                              updateActiveSlideSettings({
                                background: e.target.value as SlideInspectorSettings['background']
                              })
                            }
                          >
                            <option value="Theme">Theme</option>
                            <option value="Ambient">Ambient</option>
                            <option value="Black">Black</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </label>
                    </div>
                  </section>

                  <section className="song-studio__property-card">
                    <div className="song-studio__property-title">
                      <Sparkles size={15} />
                      <span>Atmosfer Lagu</span>
                      <strong>
                        {songAtmosphereMode === 'inherit-global' ? 'Global' : 'Preset'}
                      </strong>
                    </div>
                    <div className="song-studio__settings-grid">
                      <label className="song-field">
                        <span>Mode</span>
                        <div className="song-select-wrap">
                          <select
                            value={songAtmosphereMode}
                            onChange={(e) =>
                              setSongAtmosphereMode(
                                e.target.value as
                                  | 'inherit-global'
                                  | 'scene-preset'
                                  | 'library-asset'
                              )
                            }
                          >
                            <option value="inherit-global">Inherit Global</option>
                            <option value="scene-preset">Preset Lagu</option>
                            <option value="library-asset">Asset Library</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </label>
                      {songAtmosphereMode === 'scene-preset' && (
                        <label className="song-field">
                          <span>Preset</span>
                          <div className="song-select-wrap">
                            <select
                              value={songAtmospherePresetId}
                              onChange={(e) => setSongAtmospherePresetId(e.target.value)}
                            >
                              {DEFAULT_SCENE_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} />
                          </div>
                        </label>
                      )}
                      {songAtmosphereMode === 'library-asset' && (
                        <>
                          <label className="song-field">
                            <span>Koleksi</span>
                            <div className="song-select-wrap">
                              <select
                                value={songAtmosphereCollectionId}
                                onChange={(e) => {
                                  setSongAtmosphereCollectionId(e.target.value)
                                  setSongAtmosphereAssetSearch('')
                                }}
                              >
                                <option value="">Semua Asset</option>
                                {mediaCollections.map((collection) => (
                                  <option key={collection.id} value={collection.id}>
                                    {collection.name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} />
                            </div>
                          </label>
                          <label className="song-field">
                            <span>Cari Asset</span>
                            <input
                              value={songAtmosphereAssetSearch}
                              onChange={(e) => setSongAtmosphereAssetSearch(e.target.value)}
                              placeholder="Cari nama, kategori, tag..."
                            />
                          </label>
                        </>
                      )}
                    </div>

                    {songAtmosphereMode === 'library-asset' && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {filteredMediaAssets.length === 0 ? (
                          <div className="col-span-full rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4 text-sm text-slate-400">
                            Tidak ada asset pada filter ini.
                          </div>
                        ) : (
                          filteredMediaAssets.map((asset) => {
                            const isSelected = asset.id === songAtmosphereAssetId
                            const thumbUrl = asset.thumbnailPath
                              ? toFileUrl(asset.thumbnailPath)
                              : ''
                            return (
                              <button
                                key={asset.id}
                                type="button"
                                onClick={() => setSongAtmosphereAssetId(asset.id)}
                                className={`group overflow-hidden rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-blue-400/40 bg-blue-500/10 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]'
                                    : 'border-white/[0.06] bg-white/[0.02] hover:border-blue-400/25 hover:bg-blue-500/5'
                                }`}
                                title={`${asset.name}${asset.type === 'video' ? ' (Video)' : ' (Image)'}`}
                              >
                                <div className="relative aspect-video bg-black/30">
                                  {thumbUrl ? (
                                    <img
                                      src={thumbUrl}
                                      alt={asset.name}
                                      className="h-full w-full object-cover"
                                      draggable={false}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                      {asset.type === 'video' ? (
                                        <Film size={18} />
                                      ) : (
                                        <ImageIcon size={18} />
                                      )}
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-bold text-blue-200">
                                      Selected
                                    </div>
                                  )}
                                </div>
                                <div className="px-3 py-2">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {asset.name}
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="truncate">
                                      {asset.category || 'Uncategorized'}
                                    </span>
                                    <span className="opacity-60">·</span>
                                    <span className="whitespace-nowrap">
                                      {asset.type === 'video' ? 'Video' : 'Image'}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}
                    <div className="song-studio__content-box">
                      <div>
                        <span>Resolved Atmosphere</span>
                        <strong>
                          {songAtmosphereMode === 'inherit-global'
                            ? 'Mengikuti default service'
                            : songAtmosphereMode === 'scene-preset'
                              ? selectedAtmospherePreset?.name || 'Preset'
                              : selectedMediaAsset?.name || 'Asset Library'}
                        </strong>
                      </div>
                      <p>
                        {songAtmosphereMode === 'inherit-global'
                          ? 'Lagu ini memakai default atmosphere dari Settings dan tetap bisa dioverride saat live.'
                          : songAtmosphereMode === 'scene-preset'
                            ? selectedAtmospherePreset?.description
                            : selectedMediaAsset
                              ? `Asset ${selectedMediaAsset.type} dari Media Library akan dibind langsung ke lagu ini.`
                              : 'Pilih asset image atau video dari Media Library untuk background lagu ini.'}
                      </p>
                    </div>
                    {songAtmosphereMode === 'library-asset' && selectedMediaAsset && (
                      <div className="song-studio__content-box">
                        <div>
                          <span>Binding Asset</span>
                          <strong>{selectedMediaAsset.category || 'Uncategorized'}</strong>
                        </div>
                        <p>
                          {(selectedMediaAsset.tags || []).join(', ') || 'Tanpa tag'} · Usage{' '}
                          {selectedMediaAsset.usageCount || 0}
                        </p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                          {selectedMediaAsset.type === 'video' ? (
                            <Film size={14} />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                          <span>{selectedMediaAsset.localPath}</span>
                        </div>
                      </div>
                    )}
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
                    <input
                      value={activeSlideSettings.note}
                      onChange={(e) => updateActiveSlideSettings({ note: e.target.value })}
                      placeholder="Tambahkan catatan untuk slide ini..."
                    />
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
