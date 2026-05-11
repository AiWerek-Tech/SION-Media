import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Settings,
  UploadCloud,
  Plus,
  Edit3,
  Trash2,
  Search,
  BookOpen,
  Music,
  AlertTriangle,
  CheckCircle,
  X,
  FolderPlus
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Song, Hymnal } from '../../types'
import { logger } from '../../utils/logger'
import { validateKeyNote, formatKeyNote } from '../../utils/metadataValidation'
import { HymnalSidebar } from '../../components/HymnalSidebar'
import { EmptyState } from '../../components/design-system/EmptyState'
import { TwoPanelLayout } from '../../components/design-system'

export function ManagementMode(): React.JSX.Element {
  const {
    setScreen,
    setEditingSong,
    hymnals,
    loadHymnals,
    songs,
    loadSongs,
    showToast,
    selectedHymnalId,
    setSelectedHymnalId
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyEmptyLyrics, setShowOnlyEmptyLyrics] = useState(false)
  const [sortMode, setSortMode] = useState<'number-asc' | 'title-asc'>('number-asc')
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null)
  const [quickEditDraft, setQuickEditDraft] = useState<{
    number: string
    title: string
    alternate_title: string
    category: string
    key_note: string
  } | null>(null)
  const [isQuickSaving, setIsQuickSaving] = useState(false)
  const [quickEditKeyNoteError, setQuickEditKeyNoteError] = useState<string | null>(null)
  const [showNewHymnalDialog, setShowNewHymnalDialog] = useState(false)
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(new Set())
  const [newHymnalData, setNewHymnalData] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: ''
  })

  const [showJsonImportWizard, setShowJsonImportWizard] = useState(false)
  const [jsonImportStep, setJsonImportStep] = useState<1 | 2 | 3>(1)
  const [jsonImportFileName, setJsonImportFileName] = useState<string | null>(null)
  const [jsonImportItems, setJsonImportItems] = useState<
    Array<{
      hymnal_id?: number
      number?: string
      title?: string
      alternate_title?: string
      lyrics_raw?: string
      author?: string
      composer?: string
      key_note?: string
      time_signature?: string
      tempo?: string | number
      category?: string
      tags?: string
    }>
  >([])
  const [jsonImportIsDragging, setJsonImportIsDragging] = useState(false)
  const [jsonImportDefaultHymnalId, setJsonImportDefaultHymnalId] = useState<number | null>(
    selectedHymnalId ?? hymnals[0]?.id ?? null
  )
  const [jsonImportHymnalRemap, setJsonImportHymnalRemap] = useState<Record<number, number>>({})
  const [jsonImportConflictPolicy, setJsonImportConflictPolicy] = useState<
    'skip' | 'overwrite' | 'append'
  >('skip')
  const [jsonImportDryRun, setJsonImportDryRun] = useState(false)
  const [jsonImportReport, setJsonImportReport] = useState<null | {
    total: number
    validated: number
    conflicts: number
    inserted: number
    skipped: number
    updated_overwrite: number
    updated_append: number
    failed: number
    unknownHymnalIds: number[]
    errors: Array<{ index: number; message: string }>
    dryRun?: boolean
  }>(null)
  const [jsonImportPerItemPolicy, setJsonImportPerItemPolicy] = useState<
    Record<string, 'skip' | 'overwrite' | 'append'>
  >({})
  const [jsonImportBusy, setJsonImportBusy] = useState(false)
  const [jsonImportProgressPct, setJsonImportProgressPct] = useState(0)
  const [jsonImportProgressLabel, setJsonImportProgressLabel] = useState<string>('')

  const searchRef = useRef<HTMLInputElement | null>(null)
  const listViewportRef = useRef<HTMLDivElement | null>(null)
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listViewportHeight, setListViewportHeight] = useState(600)
  const [lyricsHasScroll, setLyricsHasScroll] = useState(false)

  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(min-width: 1024px)').matches
  })

  const rowHeight = 56
  const overscan = 8

  useEffect(() => {
    const el = listViewportRef.current
    if (!el) return

    setListViewportHeight(el.clientHeight || 600)
    const ro = new ResizeObserver(() => {
      setListViewportHeight(el.clientHeight || 600)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e: MediaQueryListEvent): void => setIsDesktopLayout(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resetListScroll = useCallback((): void => {
    const el = listViewportRef.current
    if (el) el.scrollTop = 0
    setListScrollTop(0)
  }, [listViewportRef])

  const scrollToIndex = useCallback(
    (idx: number): void => {
      const el = listViewportRef.current
      if (!el) return
      const top = idx * rowHeight
      const bottom = top + rowHeight
      const viewTop = el.scrollTop
      const viewBottom = el.scrollTop + el.clientHeight

      if (top < viewTop) {
        el.scrollTop = top
        setListScrollTop(top)
        return
      }

      if (bottom > viewBottom) {
        const nextTop = Math.max(0, bottom - el.clientHeight)
        el.scrollTop = nextTop
        setListScrollTop(nextTop)
      }
    },
    [rowHeight]
  )

  const resetJsonImportState = useCallback((): void => {
    setJsonImportStep(1)
    setJsonImportFileName(null)
    setJsonImportItems([])
    setJsonImportIsDragging(false)
    setJsonImportDefaultHymnalId(selectedHymnalId ?? hymnals[0]?.id ?? null)
    setJsonImportHymnalRemap({})
    setJsonImportConflictPolicy('skip')
    setJsonImportDryRun(false)
    setJsonImportPerItemPolicy({})
    setJsonImportReport(null)
    setJsonImportBusy(false)
    setJsonImportProgressPct(0)
    setJsonImportProgressLabel('')
  }, [hymnals, selectedHymnalId])

  const normalizeImportNumber = useCallback((input: string): string => {
    const raw = String(input ?? '').trim()
    if (!raw) return raw
    if (/^[0-9]+$/.test(raw)) {
      const trimmed = raw.replace(/^0+/, '')
      return trimmed === '' ? '0' : trimmed
    }
    return raw
  }, [])

  const parseJsonImportFile = useCallback(
    async (file: File): Promise<void> => {
      const MAX_BYTES = 10 * 1024 * 1024
      if (file.size > MAX_BYTES) {
        showToast('File terlalu besar. Maksimum 10MB.', 'error')
        return
      }
      if (!file.name.toLowerCase().endsWith('.json')) {
        showToast('Hanya mendukung file .json', 'error')
        return
      }

      setJsonImportProgressLabel('Membaca file...')
      setJsonImportProgressPct(10)

      const text = await file.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        showToast('JSON tidak valid', 'error')
        return
      }

      const extractItems = (input: unknown): Array<Record<string, unknown>> | null => {
        if (Array.isArray(input)) return input as Array<Record<string, unknown>>
        if (input && typeof input === 'object') {
          const o = input as Record<string, unknown>
          if (Array.isArray(o.songs)) return o.songs as Array<Record<string, unknown>>
          if (Array.isArray(o.items)) return o.items as Array<Record<string, unknown>>
        }
        return null
      }

      const items = extractItems(json)
      if (!items) {
        showToast(
          'Format JSON tidak dikenal. Gunakan array atau wrapper {schema_version, songs:[...]}.',
          'error'
        )
        return
      }
      if (items.length === 0) {
        showToast('JSON kosong', 'error')
        return
      }

      setJsonImportProgressLabel('Menganalisis konten...')
      setJsonImportProgressPct(35)

      const normalizedItems = items.map((it) => ({
        hymnal_id:
          typeof it.hymnal_id === 'number'
            ? it.hymnal_id
            : typeof it.hymnal_id === 'string'
              ? Number(it.hymnal_id)
              : undefined,
        number: it.number !== undefined ? String(it.number) : undefined,
        title: it.title !== undefined ? String(it.title) : undefined,
        alternate_title: it.alternate_title !== undefined ? String(it.alternate_title) : undefined,
        lyrics_raw: it.lyrics_raw !== undefined ? String(it.lyrics_raw) : undefined,
        author: it.author !== undefined ? String(it.author) : undefined,
        composer: it.composer !== undefined ? String(it.composer) : undefined,
        key_note: it.key_note !== undefined ? String(it.key_note) : undefined,
        time_signature: it.time_signature !== undefined ? String(it.time_signature) : undefined,
        tempo:
          typeof it.tempo === 'number'
            ? it.tempo
            : it.tempo !== undefined
              ? String(it.tempo)
              : undefined,
        category: it.category !== undefined ? String(it.category) : undefined,
        tags: it.tags !== undefined ? String(it.tags) : undefined
      }))

      setJsonImportFileName(file.name)
      setJsonImportItems(normalizedItems)
      setJsonImportReport(null)
      setJsonImportProgressLabel('Siap untuk preview')
      setJsonImportProgressPct(60)
      setJsonImportStep(2)
    },
    [showToast]
  )

  const jsonImportUnknownHymnalIds = useMemo(() => {
    const known = new Set(hymnals.map((h) => h.id))
    const unknown = new Set<number>()
    for (const it of jsonImportItems) {
      if (typeof it.hymnal_id === 'number' && Number.isFinite(it.hymnal_id)) {
        if (!known.has(it.hymnal_id)) unknown.add(it.hymnal_id)
      }
    }
    return Array.from(unknown).sort((a, b) => a - b)
  }, [hymnals, jsonImportItems])

  const jsonImportMissingHymnalCount = useMemo(() => {
    return jsonImportItems.filter((it) => it.hymnal_id === undefined || it.hymnal_id === null)
      .length
  }, [jsonImportItems])

  const jsonImportPreviewConflicts = useMemo(() => {
    const defaultHymnal = jsonImportDefaultHymnalId
    const known = new Set(hymnals.map((h) => h.id))
    const existingKeySet = new Set(
      songs.map((s) => `${s.hymnal_id}:${normalizeImportNumber(String(s.number ?? ''))}`)
    )

    const conflicts: Array<{
      key: string
      index: number
      hymnal_id: number
      number: string
      title: string
      existingTitle?: string
    }> = []

    for (let i = 0; i < jsonImportItems.length; i++) {
      const it = jsonImportItems[i]
      const numberRaw = String(it.number ?? '').trim()
      const titleRaw = String(it.title ?? '').trim()
      if (!numberRaw || !titleRaw) continue

      const hymnalBase =
        typeof it.hymnal_id === 'number' && Number.isFinite(it.hymnal_id)
          ? it.hymnal_id
          : defaultHymnal
      if (!hymnalBase) continue
      const hymnalResolved = jsonImportHymnalRemap[hymnalBase] ?? hymnalBase
      if (!known.has(hymnalResolved)) continue

      const normalizedNumber = normalizeImportNumber(numberRaw)
      const key = `${hymnalResolved}:${normalizedNumber}`
      if (existingKeySet.has(key)) {
        const existing = songs.find(
          (s) => `${s.hymnal_id}:${normalizeImportNumber(String(s.number ?? ''))}` === key
        )
        conflicts.push({
          key,
          index: i,
          hymnal_id: hymnalResolved,
          number: normalizedNumber,
          title: titleRaw,
          existingTitle: existing?.title
        })
      }
    }

    return conflicts
  }, [
    hymnals,
    jsonImportDefaultHymnalId,
    jsonImportHymnalRemap,
    jsonImportItems,
    normalizeImportNumber,
    songs
  ])

  const setJsonImportPolicyForAllConflicts = useCallback(
    (policy: 'skip' | 'overwrite' | 'append'): void => {
      setJsonImportPerItemPolicy((prev) => {
        const next = { ...prev }
        for (const c of jsonImportPreviewConflicts) {
          next[c.key] = policy
        }
        return next
      })
    },
    [jsonImportPreviewConflicts]
  )

  const executeJsonImport = useCallback(async (): Promise<void> => {
    if (jsonImportItems.length === 0) {
      showToast('Tidak ada data untuk diimpor', 'error')
      return
    }
    if (jsonImportMissingHymnalCount > 0 && !jsonImportDefaultHymnalId) {
      showToast('Pilih buku lagu target untuk item yang tidak punya hymnal_id', 'error')
      return
    }
    if (jsonImportUnknownHymnalIds.length > 0) {
      const missingMap = jsonImportUnknownHymnalIds.filter((id) => !jsonImportHymnalRemap[id])
      if (missingMap.length > 0) {
        showToast('Mapping hymnal_id tidak dikenal belum lengkap', 'error')
        return
      }
    }

    setJsonImportBusy(true)
    setJsonImportProgressLabel(
      jsonImportDryRun ? 'Validasi dataset...' : 'Mengimpor ke database...'
    )
    setJsonImportProgressPct(20)

    try {
      const payload = {
        items: jsonImportItems,
        defaultHymnalId: jsonImportDefaultHymnalId,
        hymnalIdRemap: jsonImportHymnalRemap,
        conflictPolicy: jsonImportConflictPolicy,
        perItemPolicy: jsonImportPerItemPolicy,
        dryRun: jsonImportDryRun
      }

      setJsonImportStep(3)

      const res = (await window.api.songs.importJson(payload)) as {
        total: number
        validated: number
        conflicts: number
        inserted: number
        skipped: number
        updated_overwrite: number
        updated_append: number
        failed: number
        unknownHymnalIds: number[]
        errors: Array<{ index: number; message: string }>
        dryRun?: boolean
      }

      setJsonImportReport(res)

      setJsonImportProgressPct(85)
      setJsonImportProgressLabel('Menyegarkan library...')

      if (!jsonImportDryRun && selectedHymnalId) {
        await loadSongs(selectedHymnalId)
      }

      setJsonImportProgressPct(100)
      setJsonImportProgressLabel('Selesai')

      const summaryParts = [jsonImportDryRun ? 'Validated' : 'Imported', String(res.inserted)]
      if (res.updated_overwrite > 0) summaryParts.push(`Overwrite ${res.updated_overwrite}`)
      if (res.updated_append > 0) summaryParts.push(`Append ${res.updated_append}`)
      if (res.skipped > 0) summaryParts.push(`Skipped ${res.skipped}`)
      if (res.failed > 0) summaryParts.push(`Failed ${res.failed}`)
      showToast(summaryParts.join(' | '), res.errors?.length ? 'error' : 'success')

      setJsonImportBusy(false)
    } catch (err) {
      logger.error('JSON import failed:', err)
      showToast('Import JSON gagal', 'error')
      setJsonImportBusy(false)
      setJsonImportStep(2)
    }
  }, [
    jsonImportItems,
    jsonImportMissingHymnalCount,
    jsonImportDefaultHymnalId,
    jsonImportUnknownHymnalIds,
    jsonImportHymnalRemap,
    jsonImportConflictPolicy,
    jsonImportPerItemPolicy,
    jsonImportDryRun,
    selectedHymnalId,
    loadSongs,
    showToast
  ])

  const downloadJsonReport = useCallback((): void => {
    if (!jsonImportReport) return
    const dataStr = JSON.stringify(jsonImportReport, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `sion-media-json-import-report-${new Date().toISOString().split('T')[0]}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [jsonImportReport])

  // Load hymnals on mount
  useEffect(() => {
    loadHymnals()
  }, [loadHymnals])

  // Load songs when hymnal is selected
  useEffect(() => {
    if (selectedHymnalId) {
      loadSongs(selectedHymnalId)
    }
  }, [selectedHymnalId, loadSongs])

  // Reset scroll and selection when hymnal changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSongId(null)
    resetListScroll()
  }, [selectedHymnalId, resetListScroll])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId),
    [hymnals, selectedHymnalId]
  )

  const hymnalStats = useMemo(() => {
    const emptyLyricsCount = songs.reduce((count, s) => {
      const hasLyrics = (s.lyrics_raw || '').trim().length > 0
      return count + (hasLyrics ? 0 : 1)
    }, 0)
    const withLyricsCount = songs.length - emptyLyricsCount
    const withLyricsPct = songs.length > 0 ? Math.round((withLyricsCount / songs.length) * 100) : 0
    return { emptyLyricsCount, withLyricsCount, withLyricsPct }
  }, [songs])

  // Global dashboard stats
  const globalStats = useMemo(() => {
    const totalSongs = songs.length
    const totalHymnals = hymnals.length
    const officialHymnals = hymnals.filter((h) => h.is_official === 1).length
    const emptyLyricsGlobal = songs.filter((s) => !(s.lyrics_raw || '').trim()).length
    const coverageGlobal =
      totalSongs > 0 ? Math.round(((totalSongs - emptyLyricsGlobal) / totalSongs) * 100) : 0
    return { totalSongs, totalHymnals, officialHymnals, emptyLyricsGlobal, coverageGlobal }
  }, [songs, hymnals])

  // Filter songs by search query
  const filteredSongs = useMemo(() => {
    let result = songs
    if (showOnlyEmptyLyrics) {
      result = result.filter((s) => (s.lyrics_raw || '').trim().length === 0)
    }
    if (!searchQuery.trim()) return result
    const query = searchQuery.toLowerCase()
    return result.filter(
      (s) =>
        s.number.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        (s.alternate_title && s.alternate_title.toLowerCase().includes(query))
    )
  }, [songs, searchQuery, showOnlyEmptyLyrics])

  const visibleSongs = useMemo(() => {
    const list = [...filteredSongs]
    if (sortMode === 'title-asc') {
      list.sort((a, b) => a.title.localeCompare(b.title))
      return list
    }
    const toNum = (v: string): number => {
      const n = Number(String(v).replace(/[^0-9]/g, ''))
      return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER
    }
    list.sort((a, b) => {
      const an = toNum(a.number)
      const bn = toNum(b.number)
      if (an !== bn) return an - bn
      return a.number.localeCompare(b.number)
    })
    return list
  }, [filteredSongs, sortMode])

  const selectedSong = useMemo(() => {
    if (!selectedSongId) return null
    return songs.find((s) => s.id === selectedSongId) || null
  }, [songs, selectedSongId])

  // Detect if lyrics content is scrollable to show shadows
  useEffect(() => {
    const el = lyricsScrollRef.current
    if (!el) return

    const checkScroll = (): void => {
      const content = el.querySelector('.management-lyrics-content')
      if (content) {
        setLyricsHasScroll(content.scrollHeight > content.clientHeight)
      }
    }

    checkScroll()
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => ro.disconnect()
  }, [selectedSong])

  const quickEditDuplicateMessage = useMemo((): string | null => {
    if (!selectedSong || !quickEditDraft) return null
    const number = quickEditDraft.number.trim().toLowerCase()
    const title = quickEditDraft.title.trim().toLowerCase()

    const hymnalSongs = songs.filter((s) => s.hymnal_id === selectedSong.hymnal_id)
    const duplicateByNumber = hymnalSongs.find(
      (s) => s.id !== selectedSong.id && s.number.trim().toLowerCase() === number
    )
    const duplicateByTitle = hymnalSongs.find(
      (s) => s.id !== selectedSong.id && s.title.trim().toLowerCase() === title
    )

    if (duplicateByNumber && duplicateByTitle) {
      return `Nomor "${quickEditDraft.number}" dan judul "${quickEditDraft.title}" sudah ada di buku ini`
    }
    if (duplicateByNumber) {
      return `Nomor "${quickEditDraft.number}" sudah digunakan oleh "${duplicateByNumber.title}"`
    }
    if (duplicateByTitle) {
      return `Judul "${quickEditDraft.title}" sudah digunakan oleh nomor ${duplicateByTitle.number}`
    }
    return null
  }, [selectedSong, quickEditDraft, songs])

  const virtualRange = useMemo(() => {
    const total = visibleSongs.length
    if (total === 0) {
      return {
        startIndex: 0,
        endIndex: -1,
        topPad: 0,
        bottomPad: 0,
        slice: [] as Song[]
      }
    }
    const rawStart = Math.floor(listScrollTop / rowHeight) - overscan
    const startIndex = Math.max(0, rawStart)
    const visibleCount = Math.ceil(listViewportHeight / rowHeight) + overscan * 2
    const endIndex = Math.min(total - 1, startIndex + visibleCount)
    const topPad = startIndex * rowHeight
    const bottomPad = (total - endIndex - 1) * rowHeight
    return {
      startIndex,
      endIndex,
      topPad,
      bottomPad,
      slice: visibleSongs.slice(startIndex, endIndex + 1)
    }
  }, [visibleSongs, listScrollTop, listViewportHeight])

  const handleEditSong = useCallback(
    (song: Song): void => {
      setEditingSong(song)
      setScreen('song-editor')
    },
    [setEditingSong, setScreen]
  )

  const openQuickEdit = useCallback((): void => {
    if (!selectedSong) return
    setQuickEditDraft({
      number: selectedSong.number || '',
      title: selectedSong.title || '',
      alternate_title: selectedSong.alternate_title || '',
      category: selectedSong.category || '',
      key_note: selectedSong.key_note || ''
    })
  }, [selectedSong])

  const cancelQuickEdit = useCallback((): void => {
    setQuickEditDraft(null)
  }, [])

  const saveQuickEdit = useCallback(async (): Promise<void> => {
    if (!selectedSong || !quickEditDraft) return
    if (!quickEditDraft.number.trim() || !quickEditDraft.title.trim()) {
      showToast('Nomor dan judul wajib diisi', 'error')
      return
    }
    if (quickEditDuplicateMessage) {
      showToast(quickEditDuplicateMessage, 'error')
      return
    }

    // Validate key_note
    const keyNoteValidation = validateKeyNote(quickEditDraft.key_note)
    setQuickEditKeyNoteError(keyNoteValidation.valid ? null : keyNoteValidation.message || null)
    if (!keyNoteValidation.valid) {
      showToast('Format nada dasar tidak valid', 'error')
      return
    }

    setIsQuickSaving(true)
    try {
      const songData = {
        hymnal_id: selectedSong.hymnal_id,
        number: quickEditDraft.number,
        title: quickEditDraft.title,
        alternate_title: quickEditDraft.alternate_title,
        lyrics_raw: selectedSong.lyrics_raw || '',
        category: quickEditDraft.category,
        language: selectedSong.language || 'Indonesia',
        author: selectedSong.author || '',
        composer: selectedSong.composer || '',
        key_note: quickEditDraft.key_note,
        time_signature: selectedSong.time_signature || '',
        tempo: selectedSong.tempo || '',
        tags: selectedSong.tags || ''
      }
      await window.api.songs.update(selectedSong.id, songData)
      await loadSongs(selectedSong.hymnal_id)
      setQuickEditDraft(null)
      showToast('Perubahan disimpan', 'success')
    } catch (err) {
      logger.error('Quick edit save failed:', err)
      showToast('Gagal menyimpan perubahan', 'error')
    } finally {
      setIsQuickSaving(false)
    }
  }, [selectedSong, quickEditDraft, loadSongs, quickEditDuplicateMessage, showToast])

  const selectSongByIndex = useCallback(
    (idx: number): void => {
      const next = visibleSongs[idx]
      if (!next) return
      setSelectedSongId(next.id)
      scrollToIndex(idx)
    },
    [visibleSongs, scrollToIndex]
  )

  const jumpToEmptyLyrics = useCallback(
    (direction: 'next' | 'prev'): void => {
      if (!selectedHymnalId) return
      if (visibleSongs.length === 0) return

      const isEmpty = (s: Song): boolean => (s.lyrics_raw || '').trim().length === 0
      const currentIdx = selectedSongId
        ? visibleSongs.findIndex((s) => s.id === selectedSongId)
        : -1

      const step = direction === 'next' ? 1 : -1
      const start =
        currentIdx === -1 ? (direction === 'next' ? 0 : visibleSongs.length - 1) : currentIdx + step

      const inBounds = (i: number): boolean => i >= 0 && i < visibleSongs.length
      for (let i = start; inBounds(i); i += step) {
        if (isEmpty(visibleSongs[i])) {
          selectSongByIndex(i)
          return
        }
      }

      // Wrap-around
      const wrapStart = direction === 'next' ? 0 : visibleSongs.length - 1
      const wrapEnd = direction === 'next' ? visibleSongs.length : -1
      for (let i = wrapStart; i !== wrapEnd; i += step) {
        if (isEmpty(visibleSongs[i])) {
          selectSongByIndex(i)
          return
        }
      }

      showToast('Tidak ada lagu dengan lirik kosong', 'success')
    },
    [selectedHymnalId, visibleSongs, selectedSongId, selectSongByIndex, showToast]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (e.key === '/' && !isTypingTarget) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (!selectedHymnalId) return
      if (isTypingTarget) return
      if (visibleSongs.length === 0) return

      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        jumpToEmptyLyrics(e.shiftKey ? 'prev' : 'next')
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const currentIdx = selectedSongId
          ? visibleSongs.findIndex((s) => s.id === selectedSongId)
          : -1
        const nextIdx = Math.min(visibleSongs.length - 1, currentIdx + 1)
        selectSongByIndex(Math.max(0, nextIdx))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIdx = selectedSongId
          ? visibleSongs.findIndex((s) => s.id === selectedSongId)
          : visibleSongs.length
        const nextIdx = Math.max(0, currentIdx - 1)
        selectSongByIndex(nextIdx)
        return
      }
      if (e.key === 'Enter') {
        if (!selectedSongId) return
        const song = songs.find((s) => s.id === selectedSongId)
        if (!song) return
        e.preventDefault()
        handleEditSong(song)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    selectedHymnalId,
    visibleSongs,
    selectSongByIndex,
    selectedSongId,
    songs,
    handleEditSong,
    jumpToEmptyLyrics
  ])

  const handleAddNewSong = (): void => {
    // Check if hymnal is selected
    if (!selectedHymnalId) {
      showToast('Pilih buku lagu terlebih dahulu', 'error')
      return
    }
    setEditingSong(null)
    setScreen('song-editor')
  }

  const handleDeleteSong = async (song: Song): Promise<void> => {
    if (!confirm(`Hapus lagu "${song.number} - ${song.title}"?`)) return

    try {
      await window.api.songs.delete(song.id)
      if (selectedSongId === song.id) {
        setSelectedSongId(null)
      }
      setSelectedSongIds((prev) => {
        const next = new Set(prev)
        next.delete(song.id)
        return next
      })
      await loadSongs(selectedHymnalId || undefined)
      showToast('Lagu berhasil dihapus', 'success')
    } catch (err) {
      logger.error('Failed to delete song:', err)
      showToast('Gagal menghapus lagu', 'error')
    }
  }

  const toggleSongSelection = (songId: number): void => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev)
      if (next.has(songId)) {
        next.delete(songId)
      } else {
        next.add(songId)
      }
      return next
    })
  }

  const selectAllVisible = (): void => {
    setSelectedSongIds(new Set(visibleSongs.map((s) => s.id)))
  }

  const clearSelection = (): void => {
    setSelectedSongIds(new Set())
  }

  const handleBulkDelete = async (): Promise<void> => {
    const count = selectedSongIds.size
    if (!confirm(`Hapus ${count} lagu yang dipilih?`)) return
    try {
      for (const id of selectedSongIds) {
        await window.api.songs.delete(id)
      }
      setSelectedSongIds(new Set())
      setSelectedSongId(null)
      await loadSongs(selectedHymnalId || undefined)
      showToast(`${count} lagu berhasil dihapus`, 'success')
    } catch (err) {
      logger.error('Bulk delete failed:', err)
      showToast('Gagal menghapus lagu', 'error')
    }
  }

  const handleCreateHymnal = async (): Promise<void> => {
    if (!newHymnalData.code.trim() || !newHymnalData.name.trim()) {
      showToast('Kode dan nama buku lagu wajib diisi', 'error')
      return
    }

    // Check if code already exists
    if (hymnals.some((h) => h.code.toLowerCase() === newHymnalData.code.toLowerCase())) {
      showToast('Kode buku lagu sudah ada', 'error')
      return
    }

    try {
      const result = await window.api.hymnals.add({
        code: newHymnalData.code.toUpperCase(),
        name: newHymnalData.name,
        language: newHymnalData.language,
        publisher: newHymnalData.publisher,
        region: 'Indonesia',
        version: '1.0',
        is_official: 0
      })
      await loadHymnals()
      setShowNewHymnalDialog(false)
      setNewHymnalData({ code: '', name: '', language: 'Indonesia', publisher: '' })
      // Select the new hymnal
      const newHymnal = result as Hymnal
      if (newHymnal?.id) {
        setSelectedHymnalId(newHymnal.id)
      }
      showToast('Buku lagu berhasil dibuat', 'success')
    } catch (err) {
      logger.error('Failed to create hymnal:', err)
      showToast('Gagal membuat buku lagu', 'error')
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-base text-text-primary overflow-hidden">
      {/* Header - Enterprise Content Hub Bento Grid */}
      <div className="shrink-0 px-6 py-4 border-b border-border-subtle bg-bg-surface/70 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.03),0_4px_12px_rgba(0,0,0,0.12)] sticky top-0 z-30 overflow-y-auto max-h-[280px]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-h2">Library</h1>
            <p className="text-text-muted text-sm">Katalog lagu dan buku lagu</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewHymnalDialog(true)}
              className="btn-premium btn-premium-primary text-xs flex items-center gap-2"
            >
              <FolderPlus size={14} />
              Buku Baru
            </button>
            <button
              onClick={() => {
                setShowJsonImportWizard(true)
                resetJsonImportState()
              }}
              className="btn-premium btn-premium-ghost text-xs flex items-center gap-2"
            >
              <UploadCloud size={14} />
              Import JSON
            </button>
            <button
              onClick={() => setScreen('import-export')}
              className="btn-premium btn-premium-ghost text-xs flex items-center gap-2"
            >
              <UploadCloud size={14} />
              Import/Export
            </button>
            <button
              onClick={() => setScreen('settings')}
              className="btn-premium btn-premium-ghost text-xs flex items-center gap-2"
            >
              <Settings size={14} />
              Pengaturan
            </button>
          </div>
        </div>

        {/* Bento Grid Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Card: Total Hymnals */}
          <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 flex items-center gap-3 hover:bg-white/[0.05] hover:ring-white/15 transition-all duration-200">
            <div className="h-9 w-9 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Buku Lagu
              </div>
              <div className="text-xl font-bold text-text-primary leading-tight tracking-tight">
                {globalStats.totalHymnals}
              </div>
              <div className="text-[10px] text-text-disabled">
                {globalStats.officialHymnals} official
              </div>
            </div>
          </div>

          {/* Card: Total Songs */}
          <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 flex items-center gap-3 hover:bg-white/[0.05] hover:ring-white/15 transition-all duration-200">
            <div className="h-9 w-9 rounded-xl bg-brand-secondary/10 flex items-center justify-center text-brand-secondary shrink-0">
              <Music size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Total Lagu
              </div>
              <div className="text-xl font-bold text-text-primary leading-tight tracking-tight">
                {globalStats.totalSongs}
              </div>
              <div className="text-[10px] text-text-disabled">semua buku</div>
            </div>
          </div>

          {/* Card: Coverage */}
          <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 flex items-center gap-3 hover:bg-white/[0.05] hover:ring-white/15 transition-all duration-200">
            <div className="h-9 w-9 rounded-xl bg-status-success/10 flex items-center justify-center text-status-success shrink-0">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Coverage
              </div>
              <div className="text-xl font-bold text-text-primary leading-tight tracking-tight">
                {globalStats.coverageGlobal}%
              </div>
              <div className="text-[10px] text-text-disabled">
                {globalStats.emptyLyricsGlobal} lirik kosong
              </div>
            </div>
          </div>

          {/* Card: Selected Hymnal Songs */}
          {selectedHymnal && (
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 flex items-center gap-3 hover:bg-white/[0.05] hover:ring-white/15 transition-all duration-200">
              <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <FolderPlus size={18} />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {selectedHymnal.code}
                </div>
                <div className="text-xl font-bold text-text-primary leading-tight tracking-tight">
                  {songs.length}
                </div>
                <div className="text-[10px] text-text-disabled">
                  {hymnalStats.withLyricsPct}% coverage
                </div>
              </div>
            </div>
          )}

          {/* Card: Quick Add */}
          <button
            onClick={handleAddNewSong}
            disabled={!selectedHymnalId}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 flex items-center justify-center gap-2 text-text-muted hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            <span className="text-[11px] font-semibold">Tambah Lagu</span>
          </button>
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0 bg-bg-base/10">
        {/* Sidebar */}
        <HymnalSidebar />

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {selectedHymnal ? (
            <>
              {/* Song List Header - L2 Surface */}
              <div className="shrink-0 px-6 py-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.02)] flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Music size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{selectedHymnal.name}</div>
                    <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
                      <span>
                        {songs.length} lagu · {selectedHymnal.code}
                      </span>
                      <span className="text-text-muted/50">|</span>
                      <span>
                        {hymnalStats.withLyricsCount} lengkap · {hymnalStats.emptyLyricsCount}{' '}
                        kosong
                      </span>
                      <span className="text-text-muted/50">|</span>
                      <span>{hymnalStats.withLyricsPct}% coverage</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden xl:flex items-center bg-bg-elevated/50 p-1 rounded-lg border border-border-subtle">
                    <button
                      onClick={() => setShowOnlyEmptyLyrics((v) => !v)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                        showOnlyEmptyLyrics
                          ? 'bg-status-warning/15 text-status-warning shadow-sm'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-base/50'
                      }`}
                      title="Tampilkan hanya lagu dengan lirik kosong"
                    >
                      {showOnlyEmptyLyrics ? 'Lirik Kosong' : 'Semua Status'}
                    </button>
                    <div className="w-px h-4 bg-border-strong mx-1" />
                    <button
                      onClick={() => jumpToEmptyLyrics('next')}
                      className="px-3 py-1.5 rounded-md text-[11px] font-bold text-text-muted hover:text-text-primary hover:bg-bg-base/50 transition-all"
                      title="Lompat ke lagu berikutnya yang liriknya kosong (E)"
                    >
                      Skip Next
                    </button>
                  </div>

                  <select
                    value={sortMode}
                    onChange={(e) => {
                      setSortMode(e.target.value as 'number-asc' | 'title-asc')
                      resetListScroll()
                    }}
                    className="h-9 px-3 rounded-lg border border-border-default bg-bg-base text-[12px] font-semibold text-text-primary hover:border-border-strong focus:border-brand-primary outline-none transition-all appearance-none cursor-pointer"
                    title="Urutkan daftar lagu"
                  >
                    <option value="number-asc">Urut: Nomor</option>
                    <option value="title-asc">Urut: Judul</option>
                  </select>

                  <div className="w-px h-6 bg-border-subtle mx-1 hidden lg:block" />

                  {/* Search */}
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        resetListScroll()
                      }}
                      placeholder="Cari nomor/judul..."
                      className="h-9 w-56 pl-9 pr-9 rounded-lg bg-bg-base border border-border-default text-sm focus:border-brand-primary outline-none"
                      ref={searchRef}
                    />
                    {searchQuery.trim().length > 0 && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          resetListScroll()
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                        title="Hapus pencarian"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Add Song Button */}
                  <button
                    onClick={handleAddNewSong}
                    className="btn-premium btn-premium-primary text-xs flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Tambah Lagu
                  </button>
                </div>
              </div>

              {/* Song List */}
              <div className="flex-1 min-h-0">
                {isDesktopLayout ? (
                  <TwoPanelLayout
                    layoutKey="managementMain"
                    className="h-full min-h-0"
                    leftClassName="min-w-0 min-h-0"
                    rightClassName="min-w-0 min-h-0"
                    left={
                      <div className="min-h-0 h-full management-list-panel">
                        <div
                          className="h-full overflow-y-auto"
                          ref={listViewportRef}
                          onScroll={(e) => setListScrollTop((e.target as HTMLDivElement).scrollTop)}
                        >
                          {visibleSongs.length === 0 ? (
                            <EmptyState
                              icon={Music}
                              title={
                                searchQuery
                                  ? 'Tidak ada hasil'
                                  : showOnlyEmptyLyrics
                                    ? 'Semua lagu sudah lengkap'
                                    : 'Belum ada lagu'
                              }
                              description={
                                searchQuery
                                  ? 'Coba kata kunci lain, atau hapus pencarian.'
                                  : showOnlyEmptyLyrics
                                    ? 'Tidak ada lagu dengan lirik kosong pada buku ini.'
                                    : 'Tambahkan lagu baru untuk mulai mengisi konten.'
                              }
                              action={
                                <div className="flex items-center gap-2">
                                  {searchQuery && (
                                    <button
                                      onClick={() => setSearchQuery('')}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                                    >
                                      Reset Pencarian
                                    </button>
                                  )}
                                  {showOnlyEmptyLyrics && (
                                    <button
                                      onClick={() => setShowOnlyEmptyLyrics(false)}
                                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transition-colors"
                                    >
                                      Reset Filter
                                    </button>
                                  )}
                                  <button
                                    onClick={handleAddNewSong}
                                    className="px-3 py-1.5 rounded-lg bg-brand-primary/15 text-[11px] font-semibold text-brand-primary ring-1 ring-brand-primary/20 hover:bg-brand-primary/20 transition-colors flex items-center gap-1.5"
                                  >
                                    <Plus size={14} />
                                    Tambah Lagu
                                  </button>
                                </div>
                              }
                            />
                          ) : (
                            <div className="divide-y divide-border-subtle">
                              {/* Bulk Actions Toolbar */}
                              {selectedSongIds.size > 0 && (
                                <div className="sticky top-0 z-20 px-6 py-2 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-accent">
                                      {selectedSongIds.size} lagu dipilih
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={clearSelection}
                                      className="text-[10px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-elevated transition-colors"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      onClick={() => void handleBulkDelete()}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-status-error/10 border border-status-error/20 text-status-error text-[10px] font-bold hover:bg-status-error/20 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-white/5 px-6 py-2.5">
                                <div className="management-row-header grid grid-cols-[32px_64px_1fr_170px_88px] gap-4 text-[10px] font-semibold uppercase tracking-widest text-text-disabled items-center">
                                  <div className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={
                                        selectedSongIds.size > 0 &&
                                        selectedSongIds.size === visibleSongs.length
                                      }
                                      onChange={(e) => {
                                        if (e.target.checked) selectAllVisible()
                                        else clearSelection()
                                      }}
                                      className="cursor-pointer"
                                    />
                                  </div>
                                  <div className="text-center">No</div>
                                  <div>Judul</div>
                                  <div>Status</div>
                                  <div className="text-right">Aksi</div>
                                </div>
                              </div>

                              <div style={{ height: virtualRange.topPad }} />
                              {virtualRange.slice.map((song) => {
                                const hasLyrics = song.lyrics_raw?.trim().length > 0
                                const isSelected = song.id === selectedSongId
                                const isChecked = selectedSongIds.has(song.id)
                                return (
                                  <div
                                    key={song.id}
                                    className={`management-row h-14 px-6 transition-[background-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-premium)] group grid grid-cols-[32px_64px_1fr_170px_88px] gap-4 items-center cursor-pointer ${
                                      isSelected
                                        ? 'bg-white/[0.06] ring-1 ring-brand-primary/25 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                                        : isChecked
                                          ? 'bg-white/[0.03]'
                                          : 'bg-transparent hover:bg-white/[0.03]'
                                    }`}
                                    onClick={() => setSelectedSongId(song.id)}
                                    onDoubleClick={() => handleEditSong(song)}
                                  >
                                    <div
                                      className="flex justify-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSongSelection(song.id)}
                                        className="cursor-pointer"
                                      />
                                    </div>
                                    <div className="shrink-0 text-center">
                                      <span className="text-sm font-bold text-text-primary">
                                        {song.number}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-text-primary truncate">
                                          {song.title}
                                        </span>
                                        {song.alternate_title && (
                                          <span className="secondary-meta text-xs text-text-muted truncate">
                                            ({song.alternate_title})
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {song.category && (
                                          <span className="secondary-meta text-[10px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">
                                            {song.category}
                                          </span>
                                        )}
                                        {song.key_note && (
                                          <span className="secondary-meta text-[10px] text-text-muted">
                                            Nada: {song.key_note}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                      {!hasLyrics && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                                          <AlertTriangle size={10} />
                                          Lirik Kosong
                                        </span>
                                      )}
                                      {hasLyrics && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-1 rounded">
                                          <CheckCircle size={10} />
                                          {song.lyrics_raw.split('\n').length} baris
                                        </span>
                                      )}
                                    </div>

                                    <div className="shrink-0 flex items-center justify-end gap-1 opacity-100">
                                      <div className="row-actions flex items-center justify-end gap-1 opacity-20 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditSong(song)
                                          }}
                                          className="p-2 rounded-lg text-text-muted/80 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                          title="Edit lagu"
                                        >
                                          <Edit3 size={16} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            void handleDeleteSong(song)
                                          }}
                                          className="p-2 rounded-lg text-text-muted/80 hover:text-status-error hover:bg-status-error/10 transition-colors"
                                          title="Hapus lagu"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              <div style={{ height: virtualRange.bottomPad }} />
                            </div>
                          )}
                        </div>
                      </div>
                    }
                    right={
                      <div className="min-h-0 h-full flex bg-bg-surface/30 relative management-inspector-panel">
                        {/* Decorative Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />

                        <div className="flex-1 min-h-0 flex flex-col relative z-10">
                          <div className="shrink-0 px-6 py-5 border-b border-border-subtle/50 bg-bg-base/40 backdrop-blur-md">
                            <div className="flex flex-col gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                                  <div className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                                    Detail Lagu
                                  </div>
                                </div>
                                <div className="management-inspector-title text-xl font-bold text-text-primary leading-tight line-clamp-2">
                                  {selectedSong
                                    ? `${selectedSong.number} — ${selectedSong.title}`
                                    : 'Pilih lagu dari daftar'}
                                </div>
                                {selectedSong?.alternate_title && (
                                  <div className="management-inspector-subtitle text-[12px] font-medium text-text-secondary mt-1 truncate">
                                    {selectedSong.alternate_title}
                                  </div>
                                )}
                              </div>

                              {selectedSong && (
                                <div className="management-inspector-actions flex items-center gap-2 flex-wrap">
                                  {quickEditDraft ? (
                                    <>
                                      <button
                                        onClick={() => void saveQuickEdit()}
                                        disabled={isQuickSaving || !!quickEditDuplicateMessage}
                                        className="btn-premium btn-premium-primary text-[11px] px-4 h-8 gap-2 shadow-brand-primary/20 shadow-lg"
                                      >
                                        {isQuickSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                      </button>
                                      <button
                                        onClick={cancelQuickEdit}
                                        disabled={isQuickSaving}
                                        className="btn-premium btn-premium-ghost text-[11px] px-3 h-8"
                                      >
                                        Batal
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleEditSong(selectedSong)}
                                        className="btn-premium btn-premium-primary text-[11px] px-4 h-8 gap-2 shadow-brand-primary/20 shadow-lg"
                                      >
                                        <Edit3 size={14} />
                                        Full Edit
                                      </button>
                                      <button
                                        onClick={openQuickEdit}
                                        className="btn-premium btn-premium-ghost text-[11px] px-3 h-8 gap-2 bg-bg-elevated/50 border border-border-subtle"
                                      >
                                        Edit Cepat
                                      </button>
                                      <div className="flex-1 management-inspector-spacer" />
                                      <button
                                        onClick={() => void handleDeleteSong(selectedSong)}
                                        className="btn-premium btn-premium-ghost text-[11px] px-3 h-8 text-status-error hover:bg-status-error/10 hover:border-status-error/20 border border-transparent"
                                      >
                                        <Trash2 size={14} />
                                        Hapus
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="management-inspector-body flex-1 min-h-0 overflow-y-auto px-6 py-5">
                            {!selectedSong ? (
                              <div className="management-inspector-empty">
                                <EmptyState
                                  icon={Music}
                                  title="Navigasi Pintar"
                                  description="Pilih lagu dari daftar untuk melihat detail. Gunakan keyboard untuk navigasi cepat."
                                  action={
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-medium text-text-secondary">
                                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center gap-1.5">
                                        <span className="bg-white/[0.05] px-1.5 rounded text-[9px] font-mono font-bold text-text-muted">
                                          /
                                        </span>
                                        Cari
                                      </div>
                                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center gap-1.5">
                                        <span className="bg-white/[0.05] px-1.5 rounded text-[9px] font-mono font-bold text-text-muted">
                                          ⏎
                                        </span>
                                        Edit
                                      </div>
                                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center gap-1.5">
                                        <span className="bg-white/[0.05] px-1.5 rounded text-[9px] font-mono font-bold text-text-muted">
                                          ↑/↓
                                        </span>
                                        Pilih
                                      </div>
                                      <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center gap-1.5">
                                        <span className="bg-white/[0.05] px-1.5 rounded text-[9px] font-mono font-bold text-text-muted">
                                          E
                                        </span>
                                        Kosong
                                      </div>
                                    </div>
                                  }
                                />
                              </div>
                            ) : (
                              <div className="space-y-4 pb-10">
                                {quickEditDraft && (
                                  <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
                                      Quick Edit
                                    </div>
                                    <div className="management-inspector-grid grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                          Nomor
                                        </label>
                                        <input
                                          type="text"
                                          value={quickEditDraft.number}
                                          onChange={(e) =>
                                            setQuickEditDraft((d) =>
                                              d ? { ...d, number: e.target.value } : d
                                            )
                                          }
                                          className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                          Nada
                                        </label>
                                        <input
                                          type="text"
                                          value={quickEditDraft.key_note}
                                          onChange={(e) => {
                                            setQuickEditDraft((d) =>
                                              d ? { ...d, key_note: e.target.value } : d
                                            )
                                            const v = validateKeyNote(e.target.value)
                                            setQuickEditKeyNoteError(
                                              v.valid ? null : v.message || null
                                            )
                                          }}
                                          onBlur={() =>
                                            setQuickEditDraft((d) =>
                                              d ? { ...d, key_note: formatKeyNote(d.key_note) } : d
                                            )
                                          }
                                          className={`w-full bg-bg-base border rounded-lg px-3 py-2 text-sm outline-none ${
                                            quickEditKeyNoteError
                                              ? 'border-status-error focus:border-status-error'
                                              : 'border-border-default focus:border-brand-primary'
                                          }`}
                                        />
                                        {quickEditKeyNoteError && (
                                          <span className="text-[10px] text-status-error mt-1 block">
                                            {quickEditKeyNoteError}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="mt-3">
                                      <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                        Judul
                                      </label>
                                      <input
                                        type="text"
                                        value={quickEditDraft.title}
                                        onChange={(e) =>
                                          setQuickEditDraft((d) =>
                                            d ? { ...d, title: e.target.value } : d
                                          )
                                        }
                                        className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                      />
                                    </div>

                                    <div className="mt-3">
                                      <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                        Sub Judul
                                      </label>
                                      <input
                                        type="text"
                                        value={quickEditDraft.alternate_title}
                                        onChange={(e) =>
                                          setQuickEditDraft((d) =>
                                            d ? { ...d, alternate_title: e.target.value } : d
                                          )
                                        }
                                        className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                      />
                                    </div>

                                    <div className="mt-3">
                                      <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                                        Kategori
                                      </label>
                                      <input
                                        type="text"
                                        value={quickEditDraft.category}
                                        onChange={(e) =>
                                          setQuickEditDraft((d) =>
                                            d ? { ...d, category: e.target.value } : d
                                          )
                                        }
                                        className="w-full bg-bg-base border border-border-default rounded-lg px-3 py-2 text-sm focus:border-brand-primary outline-none"
                                      />
                                    </div>

                                    {quickEditDuplicateMessage && (
                                      <div className="mt-3 text-[11px] font-semibold text-status-error">
                                        {quickEditDuplicateMessage}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="management-inspector-grid grid grid-cols-2 gap-3">
                                  {/* Status Card */}
                                  <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3 opacity-[0.04] transition-opacity group-hover:opacity-[0.08]">
                                      {(selectedSong.lyrics_raw || '').trim().length === 0 ? (
                                        <AlertTriangle size={32} />
                                      ) : (
                                        <CheckCircle size={32} />
                                      )}
                                    </div>
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2.5">
                                      Status Lirik
                                    </div>
                                    <div>
                                      {(selectedSong.lyrics_raw || '').trim().length === 0 ? (
                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-status-warning bg-status-warning/10 border border-status-warning/20 px-2.5 py-1 rounded-md shadow-sm">
                                          <AlertTriangle size={12} />
                                          Lirik Kosong
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-status-success bg-status-success/10 border border-status-success/20 px-2.5 py-1 rounded-md shadow-sm">
                                          <CheckCircle size={12} />
                                          Lengkap
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Statistik Card */}
                                  <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4 relative overflow-hidden">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">
                                      Statistik
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-2xl font-bold text-text-primary tracking-tight">
                                        {(selectedSong.lyrics_raw || '').trim().length === 0
                                          ? '0'
                                          : selectedSong.lyrics_raw.split('\n').length}
                                      </span>
                                      <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                                        baris
                                      </span>
                                    </div>
                                    <div className="text-[10.5px] text-text-secondary mt-0.5">
                                      {(selectedSong.lyrics_raw || '').length} karakter total
                                    </div>
                                  </div>
                                </div>

                                {/* Metadata Card */}
                                <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                                  <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
                                    Informasi Metadata
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                    <div>
                                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                        Kategori
                                      </div>
                                      <div className="text-[12px] text-text-primary font-medium truncate">
                                        {selectedSong.category || (
                                          <span className="text-text-muted/50 italic">
                                            Tidak ada
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">
                                        Nada Dasar
                                      </div>
                                      <div className="text-[12px] text-text-primary font-medium truncate flex items-center gap-1.5">
                                        {selectedSong.key_note ? (
                                          <>
                                            <span className="bg-bg-elevated border border-border-subtle px-1.5 rounded text-[11px] font-bold shadow-sm">
                                              {selectedSong.key_note}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="text-text-muted/50 italic">
                                            Tidak ada
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Preview Lirik */}
                                <div className="management-lyrics-preview rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex flex-col overflow-hidden">
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                                      Tinjauan Lirik
                                    </div>
                                    <button
                                      onClick={() => handleEditSong(selectedSong)}
                                      className="btn-premium btn-premium-ghost h-6 px-2.5 text-[10px] font-bold gap-1.5 text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary/20"
                                    >
                                      <Edit3 size={12} />
                                      Buka Editor
                                    </button>
                                  </div>
                                  <div
                                    ref={lyricsScrollRef}
                                    className={`management-lyrics-scroll-wrapper p-3.5 bg-bg-base/50 relative${lyricsHasScroll ? ' has-scroll' : ''}`}
                                  >
                                    <pre className="management-lyrics-content font-sans text-[11.5px] leading-relaxed whitespace-pre-wrap text-text-primary/90 overflow-y-auto custom-scrollbar">
                                      {(selectedSong.lyrics_raw || '').trim().length === 0
                                        ? 'Lagu ini belum memiliki teks lirik.'
                                        : selectedSong.lyrics_raw}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    }
                  />
                ) : (
                  <div className="h-full min-h-0">
                    <div
                      className="h-full overflow-y-auto"
                      ref={listViewportRef}
                      onScroll={(e) => setListScrollTop((e.target as HTMLDivElement).scrollTop)}
                    >
                      {visibleSongs.length === 0 ? (
                        <EmptyState
                          icon={Music}
                          title={
                            searchQuery
                              ? 'Tidak ada hasil'
                              : showOnlyEmptyLyrics
                                ? 'Semua lagu sudah lengkap'
                                : 'Belum ada lagu'
                          }
                          description={
                            searchQuery
                              ? 'Coba kata kunci lain, atau hapus pencarian.'
                              : showOnlyEmptyLyrics
                                ? 'Tidak ada lagu dengan lirik kosong pada buku ini.'
                                : 'Tambahkan lagu baru untuk mulai mengisi konten.'
                          }
                        />
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {/* Bulk Actions Toolbar */}
                          {selectedSongIds.size > 0 && (
                            <div className="sticky top-0 z-20 px-6 py-2 bg-accent/10 border-b border-accent/20 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-accent">
                                  {selectedSongIds.size} lagu dipilih
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={clearSelection}
                                  className="text-[10px] font-bold text-text-muted hover:text-text-primary px-2 py-1 rounded hover:bg-bg-elevated transition-colors"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={() => void handleBulkDelete()}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-status-error/10 border border-status-error/20 text-status-error text-[10px] font-bold hover:bg-status-error/20 transition-colors"
                                >
                                  <Trash2 size={12} />
                                  Hapus
                                </button>
                              </div>
                            </div>
                          )}
                          <div className="sticky top-0 z-10 bg-bg-base/80 backdrop-blur-md border-b border-white/5 px-6 py-2.5">
                            <div className="grid grid-cols-[32px_64px_1fr_170px_88px] gap-4 text-[10px] font-semibold uppercase tracking-widest text-text-disabled items-center">
                              <div className="flex justify-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedSongIds.size > 0 &&
                                    selectedSongIds.size === visibleSongs.length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) selectAllVisible()
                                    else clearSelection()
                                  }}
                                  className="cursor-pointer"
                                />
                              </div>
                              <div className="text-center">No</div>
                              <div>Judul</div>
                              <div>Status</div>
                              <div className="text-right">Aksi</div>
                            </div>
                          </div>

                          <div style={{ height: virtualRange.topPad }} />
                          {virtualRange.slice.map((song) => {
                            const hasLyrics = song.lyrics_raw?.trim().length > 0
                            const isSelected = song.id === selectedSongId
                            const isChecked = selectedSongIds.has(song.id)
                            return (
                              <div
                                key={song.id}
                                className={`h-14 px-6 transition-[background-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-premium)] group grid grid-cols-[32px_64px_1fr_170px_88px] gap-4 items-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-white/[0.06] ring-1 ring-brand-primary/25 shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
                                    : isChecked
                                      ? 'bg-white/[0.03]'
                                      : 'bg-transparent hover:bg-white/[0.03]'
                                }`}
                                onClick={() => setSelectedSongId(song.id)}
                                onDoubleClick={() => handleEditSong(song)}
                              >
                                <div
                                  className="flex justify-center"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSongSelection(song.id)}
                                    className="cursor-pointer"
                                  />
                                </div>
                                <div className="shrink-0 text-center">
                                  <span className="text-sm font-bold text-text-primary">
                                    {song.number}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary truncate">
                                      {song.title}
                                    </span>
                                    {song.alternate_title && (
                                      <span className="text-xs text-text-muted truncate">
                                        ({song.alternate_title})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {song.category && (
                                      <span className="text-[10px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded">
                                        {song.category}
                                      </span>
                                    )}
                                    {song.key_note && (
                                      <span className="text-[10px] text-text-muted">
                                        Nada: {song.key_note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                  {!hasLyrics && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning bg-status-warning/10 px-2 py-1 rounded">
                                      <AlertTriangle size={10} />
                                      Lirik Kosong
                                    </span>
                                  )}
                                  {hasLyrics && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-1 rounded">
                                      <CheckCircle size={10} />
                                      {song.lyrics_raw.split('\n').length} baris
                                    </span>
                                  )}
                                </div>
                                <div className="shrink-0 flex items-center justify-end gap-1 opacity-100">
                                  <div className="flex items-center justify-end gap-1 opacity-20 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditSong(song)
                                      }}
                                      className="p-2 rounded-lg text-text-muted/80 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                      title="Edit lagu"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void handleDeleteSong(song)
                                      }}
                                      className="p-2 rounded-lg text-text-muted/80 hover:text-status-error hover:bg-status-error/10 transition-colors"
                                      title="Hapus lagu"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          <div style={{ height: virtualRange.bottomPad }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State - No Hymnal Selected */
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={BookOpen}
                title="Pilih Buku Lagu"
                description="Pilih buku lagu dari sidebar untuk mengelola daftar lagu, atau buat buku lagu baru."
                action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowNewHymnalDialog(true)}
                      className="px-4 py-2 rounded-xl bg-brand-primary/15 text-[12px] font-semibold text-brand-primary ring-1 ring-brand-primary/20 hover:bg-brand-primary/20 transition-colors flex items-center gap-2"
                    >
                      <FolderPlus size={16} />
                      Buku Lagu Baru
                    </button>
                    <button
                      onClick={() => setScreen('import-export')}
                      className="px-4 py-2 rounded-xl bg-white/[0.03] text-[12px] font-semibold text-text-secondary ring-1 ring-white/10 hover:bg-white/[0.05] hover:text-text-primary transition-colors flex items-center gap-2"
                    >
                      <UploadCloud size={16} />
                      Import/Export
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* New Hymnal Dialog */}
      {showNewHymnalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="glass-panel-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3">Buat Buku Lagu Baru</h2>
              <button
                onClick={() => setShowNewHymnalDialog(false)}
                className="btn-premium btn-premium-ghost btn-premium-icon"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                  Kode Buku (Singkatan) *
                </label>
                <input
                  type="text"
                  value={newHymnalData.code}
                  onChange={(e) =>
                    setNewHymnalData((d) => ({ ...d, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="Contoh: LS, SDAH, PK"
                  className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={newHymnalData.name}
                  onChange={(e) => setNewHymnalData((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Contoh: Lagu Sion Edisi Lengkap"
                  className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Bahasa
                  </label>
                  <input
                    type="text"
                    value={newHymnalData.language}
                    onChange={(e) => setNewHymnalData((d) => ({ ...d, language: e.target.value }))}
                    placeholder="Indonesia"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary font-semibold mb-1.5 block">
                    Penerbit
                  </label>
                  <input
                    type="text"
                    value={newHymnalData.publisher}
                    onChange={(e) => setNewHymnalData((d) => ({ ...d, publisher: e.target.value }))}
                    placeholder="GMAHK"
                    className="w-full bg-bg-base border border-border-default rounded-lg px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewHymnalDialog(false)}
                className="btn-premium btn-premium-ghost text-xs h-9 px-4"
              >
                Batal
              </button>
              <button
                onClick={handleCreateHymnal}
                className="btn-premium btn-premium-primary text-xs h-9 px-4"
              >
                Buat Buku Lagu
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showJsonImportWizard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !jsonImportBusy) {
                setShowJsonImportWizard(false)
                resetJsonImportState()
              }
            }}
          >
            <motion.div
              className="w-[min(920px,92vw)] max-h-[86vh] overflow-hidden rounded-2xl bg-bg-surface border border-border-default shadow-2xl"
              initial={{ y: 12, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Import Lagu via JSON</div>
                  <div className="text-xs text-text-muted">
                    {jsonImportFileName ? jsonImportFileName : 'Pilih file JSON (maks. 10MB)'}
                  </div>
                </div>
                <button
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  onClick={() => {
                    if (jsonImportBusy) return
                    setShowJsonImportWizard(false)
                    resetJsonImportState()
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 py-3 border-b border-border-subtle bg-bg-base/40">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[11px] text-text-muted font-semibold">
                    Step {jsonImportStep}/3
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full bg-brand-primary"
                      animate={{ width: `${Math.max(0, Math.min(100, jsonImportProgressPct))}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                  <div className="text-[11px] text-text-muted font-semibold whitespace-nowrap">
                    {jsonImportProgressLabel}
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(86vh-140px)]">
                {jsonImportStep === 1 && (
                  <div className="space-y-4">
                    <div
                      className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                        jsonImportIsDragging
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border-default hover:border-brand-primary/40 hover:bg-brand-primary/5'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setJsonImportIsDragging(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        setJsonImportIsDragging(false)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setJsonImportIsDragging(false)
                        const f = e.dataTransfer.files?.[0]
                        if (f) void parseJsonImportFile(f)
                      }}
                      onClick={() => {
                        const el = document.getElementById(
                          'json-import-file-input'
                        ) as HTMLInputElement | null
                        el?.click()
                      }}
                    >
                      <UploadCloud size={44} className="mx-auto text-brand-primary mb-4" />
                      <div className="text-sm font-bold">Drag & drop JSON di sini</div>
                      <div className="text-xs text-text-muted mt-1">
                        atau klik untuk memilih file
                      </div>
                      <input
                        id="json-import-file-input"
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void parseJsonImportFile(f)
                        }}
                      />
                    </div>

                    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                      <div className="text-[11px] font-bold text-text-primary mb-1">
                        Field wajib
                      </div>
                      <div className="text-[11px] text-text-muted">
                        number, title, lyrics_raw, hymnal_id (atau pilih Default Hymnal)
                      </div>
                    </div>
                  </div>
                )}

                {jsonImportStep === 2 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                          Total
                        </div>
                        <div className="text-2xl font-bold mt-1">{jsonImportItems.length}</div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                          Konflik (preview)
                        </div>
                        <div className="text-2xl font-bold mt-1">
                          {jsonImportPreviewConflicts.length}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                          Missing hymnal_id
                        </div>
                        <div className="text-2xl font-bold mt-1">
                          {jsonImportMissingHymnalCount}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                          <div className="text-[11px] font-bold">
                            Default Hymnal (untuk item tanpa hymnal_id)
                          </div>
                          <div className="text-[11px] text-text-muted">
                            Ini juga dipakai untuk proses preview konflik.
                          </div>
                        </div>
                        <select
                          value={jsonImportDefaultHymnalId ?? ''}
                          onChange={(e) =>
                            setJsonImportDefaultHymnalId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="input-premium"
                        >
                          <option value="">(Tidak dipilih)</option>
                          {hymnals.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.code} - {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {jsonImportUnknownHymnalIds.length > 0 && (
                      <div className="rounded-2xl bg-status-warning/10 border border-status-warning/20 p-4">
                        <div className="text-[11px] font-bold text-status-warning">
                          hymnal_id tidak dikenal terdeteksi
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {jsonImportUnknownHymnalIds.map((unknownId) => (
                            <div
                              key={unknownId}
                              className="rounded-xl bg-bg-surface border border-border-subtle p-3 flex items-center justify-between gap-3"
                            >
                              <div className="text-[11px] text-text-primary font-semibold">
                                hymnal_id {unknownId}
                              </div>
                              <select
                                value={jsonImportHymnalRemap[unknownId] ?? ''}
                                onChange={(e) => {
                                  const target = e.target.value ? Number(e.target.value) : NaN
                                  setJsonImportHymnalRemap((prev) =>
                                    Number.isFinite(target)
                                      ? { ...prev, [unknownId]: target }
                                      : prev
                                  )
                                }}
                                className="input-premium"
                              >
                                <option value="">Pilih mapping</option>
                                {hymnals.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.code} - {h.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[11px] font-bold">Default Conflict Policy</div>
                          <div className="text-[11px] text-text-muted">
                            Berlaku untuk konflik yang tidak di-override per item.
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-[11px] text-text-muted font-semibold">
                            <input
                              type="checkbox"
                              checked={jsonImportDryRun}
                              onChange={(e) => setJsonImportDryRun(e.target.checked)}
                            />
                            Dry Run (Validate Only)
                          </label>
                          <select
                            value={jsonImportConflictPolicy}
                            onChange={(e) =>
                              setJsonImportConflictPolicy(
                                e.target.value as 'skip' | 'overwrite' | 'append'
                              )
                            }
                            className="input-premium"
                          >
                            <option value="skip">SKIP</option>
                            <option value="overwrite">OVERWRITE</option>
                            <option value="append">APPEND</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {jsonImportPreviewConflicts.length > 0 && (
                      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="text-[11px] font-bold">Conflict Resolution</div>
                            <div className="text-[11px] text-text-muted">
                              Konflik berbasis (hymnal_id, number) setelah normalisasi.
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="btn-premium btn-premium-ghost text-xs"
                              onClick={() => setJsonImportPolicyForAllConflicts('skip')}
                            >
                              SKIP all
                            </button>
                            <button
                              className="btn-premium btn-premium-ghost text-xs"
                              onClick={() => setJsonImportPolicyForAllConflicts('overwrite')}
                            >
                              OVERWRITE all
                            </button>
                            <button
                              className="btn-premium btn-premium-ghost text-xs"
                              onClick={() => setJsonImportPolicyForAllConflicts('append')}
                            >
                              APPEND all
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-bg-surface">
                              <tr className="border-b border-border-subtle">
                                <th className="p-3">Key</th>
                                <th className="p-3">Incoming</th>
                                <th className="p-3">Existing</th>
                                <th className="p-3 w-40">Policy</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jsonImportPreviewConflicts.map((c) => (
                                <tr key={c.key} className="border-b border-border-subtle">
                                  <td className="p-3 font-mono text-[11px] text-text-muted">
                                    {c.key}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-semibold">{c.number}</div>
                                    <div className="text-text-muted text-[11px]">{c.title}</div>
                                  </td>
                                  <td className="p-3 text-[11px] text-text-muted">
                                    {c.existingTitle ? c.existingTitle : '—'}
                                  </td>
                                  <td className="p-3">
                                    <select
                                      value={jsonImportPerItemPolicy[c.key] ?? ''}
                                      onChange={(e) => {
                                        const v = e.target.value as
                                          | 'skip'
                                          | 'overwrite'
                                          | 'append'
                                          | ''
                                        setJsonImportPerItemPolicy((prev) => {
                                          const next = { ...prev }
                                          if (!v) delete next[c.key]
                                          else next[c.key] = v
                                          return next
                                        })
                                      }}
                                      className="input-premium w-full"
                                    >
                                      <option value="">(Default)</option>
                                      <option value="skip">SKIP</option>
                                      <option value="overwrite">OVERWRITE</option>
                                      <option value="append">APPEND</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        className="btn-premium btn-premium-ghost"
                        disabled={jsonImportBusy}
                        onClick={() => {
                          setJsonImportStep(1)
                          setJsonImportReport(null)
                        }}
                      >
                        Kembali
                      </button>
                      <button
                        className="btn-premium btn-premium-primary"
                        disabled={jsonImportBusy}
                        onClick={() => void executeJsonImport()}
                      >
                        {jsonImportDryRun ? 'Validate' : 'Import'}
                      </button>
                    </div>
                  </div>
                )}

                {jsonImportStep !== 1 && jsonImportStep !== 2 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
                      <div className="text-sm font-bold">
                        {jsonImportBusy
                          ? jsonImportDryRun
                            ? 'Validasi berjalan...'
                            : 'Import berjalan...'
                          : 'Selesai'}
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        {jsonImportBusy
                          ? 'Jangan tutup aplikasi sampai proses selesai.'
                          : 'Kamu bisa mengunduh report untuk audit/debugging.'}
                      </div>
                    </div>

                    {jsonImportReport && (
                      <div className="rounded-2xl bg-bg-base/40 border border-border-subtle p-4 space-y-2">
                        <div className="text-[11px] font-bold">Import Session Report</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                          <div>
                            <div className="text-text-muted">Total</div>
                            <div className="font-bold">{jsonImportReport.total}</div>
                          </div>
                          <div>
                            <div className="text-text-muted">Validated</div>
                            <div className="font-bold">{jsonImportReport.validated}</div>
                          </div>
                          <div>
                            <div className="text-text-muted">Conflicts</div>
                            <div className="font-bold">{jsonImportReport.conflicts}</div>
                          </div>
                          <div>
                            <div className="text-text-muted">Failed</div>
                            <div className="font-bold">{jsonImportReport.failed}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                          <div className="text-[11px] text-text-muted">
                            Persisted sebagai `last_json_import_report` di `app_state`.
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="btn-premium btn-premium-ghost"
                              onClick={downloadJsonReport}
                            >
                              Download Report
                            </button>
                            <button
                              className="btn-premium btn-premium-primary"
                              onClick={() => {
                                setShowJsonImportWizard(false)
                                resetJsonImportState()
                              }}
                            >
                              Selesai
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
