/**
 * Hymnal Settings Section
 * Manages hymnal (song book) collection
 */

import React, { useRef, useState } from 'react'
import { Plus, Trash2, Edit2, Download, Upload } from 'lucide-react'
import type { Hymnal } from '../../types'
import type { Song } from '../../types'
import { useAppStore } from '../../store/useAppStore'

interface HymnalSettingsProps {
  hymnals: Hymnal[]
  onAdd: (hymnal: Partial<Hymnal>) => Promise<void>
  onUpdate: (id: number, hymnal: Partial<Hymnal>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export function HymnalSettings({
  hymnals,
  onAdd,
  onUpdate,
  onDelete
}: HymnalSettingsProps): React.JSX.Element {
  const { songs, loadSongs, loadHymnals, showToast } = useAppStore()
  const [showModal, setShowModal] = useState(false)
  const [editingHymnal, setEditingHymnal] = useState<Hymnal | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importTargetHymnalId, setImportTargetHymnalId] = useState<number | null>(null)
  const [wizardSearch, setWizardSearch] = useState('')
  const [wizardFilterConfidence, setWizardFilterConfidence] = useState<
    'all' | 'exact' | 'probable' | 'weak'
  >('all')
  const [wizardFilterAction, setWizardFilterAction] = useState<
    'all' | 'skip' | 'overwrite' | 'copy' | 'merge'
  >('all')
  const [importPackage, setImportPackage] = useState<{
    hymnal: Partial<Hymnal>
    songs: Partial<Song>[]
  } | null>(null)
  const [conflicts, setConflicts] = useState<
    Array<{
      index: number
      incoming: Partial<Song>
      existing: Song
      confidence: 'exact' | 'probable' | 'weak'
      reason: string
      action: 'skip' | 'overwrite' | 'copy' | 'merge'
    }>
  >([])
  const [applyAllAction, setApplyAllAction] = useState<'skip' | 'overwrite' | 'copy' | 'merge'>(
    'skip'
  )
  const [applyAllScope, setApplyAllScope] = useState<'all' | 'exact' | 'probable' | 'weak'>('all')
  const [showAllItems, setShowAllItems] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: '',
    is_official: 0
  })

  const normalizeText = (val: unknown): string => {
    return (val ?? '').toString().toLowerCase().replace(/\s+/g, ' ').trim()
  }

  const normalizeTitle = (val: unknown): string => {
    return normalizeText(val)
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const normalizeLyrics = (val: unknown): string => {
    return normalizeText(val)
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[^a-z0-9\n\s]/g, '')
      .replace(/[ \t]+/g, ' ')
      .trim()
  }

  const fnv1a32 = (str: string): string => {
    let hash = 0x811c9dc5
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i)
      hash = (hash * 0x01000193) >>> 0
    }
    return hash.toString(16).padStart(8, '0')
  }

  const lyricsFingerprint = (lyricsRaw: unknown): string => {
    const normalized = normalizeLyrics(lyricsRaw)
    if (!normalized) return ''
    return fnv1a32(normalized)
  }

  const mergeMetadata = (existing: Song, incoming: Partial<Song>): Partial<Song> => {
    const merged: Partial<Song> = {}
    const fields: Array<keyof Song> = [
      'alternate_title',
      'category',
      'language',
      'author',
      'composer',
      'key_note',
      'tempo',
      'tags',
      'theme',
      'scripture_reference'
    ]
    for (const f of fields) {
      const current = (existing as unknown as Record<string, unknown>)[f as string]
      const next = (incoming as unknown as Record<string, unknown>)[f as string]
      if ((current === null || current === undefined || current === '') && next) {
        ;(merged as unknown as Record<string, unknown>)[f as string] = next
      }
    }

    if (!existing.lyrics_raw?.trim() && incoming.lyrics_raw) {
      merged.lyrics_raw = incoming.lyrics_raw
    }
    return merged
  }

  const exportHymnalPackage = (hymnal: Hymnal): void => {
    const hymnalSongs = songs.filter((s) => s.hymnal_id === hymnal.id)
    const payload = {
      isSionHymnalPackage: true,
      version: 1,
      hymnal: {
        code: hymnal.code,
        name: hymnal.name,
        language: hymnal.language,
        region: hymnal.region,
        version: hymnal.version,
        publisher: hymnal.publisher
      },
      songs: hymnalSongs.map((s) => ({
        number: s.number,
        title: s.title,
        alternate_title: s.alternate_title,
        lyrics_raw: s.lyrics_raw,
        category: s.category,
        language: s.language,
        author: s.author,
        composer: s.composer,
        key_note: s.key_note,
        tempo: s.tempo,
        tags: s.tags,
        theme: s.theme,
        scripture_reference: s.scripture_reference
      }))
    }

    const dataStr = JSON.stringify(payload, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `sion-media-hymnal-${hymnal.code}-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    showToast(`Export hymnal ${hymnal.code} berhasil`, 'success')
  }

  const buildConflicts = (
    targetHymnalId: number,
    packageSongs: Partial<Song>[]
  ): Array<{
    index: number
    incoming: Partial<Song>
    existing: Song
    confidence: 'exact' | 'probable' | 'weak'
    reason: string
    action: 'skip' | 'overwrite' | 'copy' | 'merge'
  }> => {
    const existingSongs = songs.filter((s) => s.hymnal_id === targetHymnalId)

    const byNumber = new Map<string, Song>()
    const byTitle = new Map<string, Song>()
    const byFingerprint = new Map<string, Song>()
    for (const s of existingSongs) {
      if (s.number) byNumber.set(normalizeText(s.number), s)
      if (s.title) byTitle.set(normalizeTitle(s.title), s)
      const fp = lyricsFingerprint(s.lyrics_raw)
      if (fp) byFingerprint.set(fp, s)
    }

    const found: Array<{
      index: number
      incoming: Partial<Song>
      existing: Song
      confidence: 'exact' | 'probable' | 'weak'
      reason: string
      action: 'skip' | 'overwrite' | 'copy' | 'merge'
    }> = []

    for (let i = 0; i < packageSongs.length; i++) {
      const incoming = packageSongs[i]
      const incNumber = normalizeText(incoming.number)
      const incTitle = normalizeTitle(incoming.title)
      const incFp = lyricsFingerprint(incoming.lyrics_raw)

      const matchByNumber = incNumber ? byNumber.get(incNumber) : undefined
      const matchByTitle = incTitle ? byTitle.get(incTitle) : undefined
      const matchByFp = incFp ? byFingerprint.get(incFp) : undefined

      let existing: Song | undefined
      let confidence: 'exact' | 'probable' | 'weak' | null = null
      let reason = ''

      if (
        (matchByNumber && matchByFp && matchByNumber.id === matchByFp.id) ||
        (matchByTitle && matchByFp && matchByTitle.id === matchByFp.id)
      ) {
        existing = matchByFp
        confidence = 'exact'
        reason = 'Fingerprint + number/title match'
      } else if (matchByNumber || matchByTitle) {
        existing = matchByNumber || matchByTitle
        confidence = 'probable'
        reason = matchByNumber ? 'Number match' : 'Title match'
      } else if (matchByFp) {
        existing = matchByFp
        confidence = 'weak'
        reason = 'Lyrics fingerprint match'
      }

      if (existing && confidence) {
        found.push({
          index: i,
          incoming,
          existing,
          confidence,
          reason,
          action: 'skip'
        })
      }
    }
    return found
  }

  const importHymnalPackageFromFile = async (file: File): Promise<void> => {
    if (!file.name.endsWith('.json')) {
      showToast('Hanya mendukung file JSON', 'error')
      return
    }

    // Basic hardening: limit file size
    const MAX_MB = 10
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`File terlalu besar. Maksimum ${MAX_MB}MB`, 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as {
          isSionHymnalPackage?: boolean
          hymnal?: Partial<Hymnal>
          songs?: Partial<Song>[]
        }

        const packageHymnal = json.hymnal
        const packageSongs = Array.isArray(json.songs) ? json.songs : []

        if (!json.isSionHymnalPackage || !packageHymnal?.code || !packageHymnal?.name) {
          showToast('Format paket hymnal tidak valid', 'error')
          return
        }

        // Create hymnal if not exists
        const existing = hymnals.find((h) => h.code === packageHymnal.code)
        let targetHymnalId = existing?.id

        if (!targetHymnalId) {
          await onAdd({
            code: packageHymnal.code,
            name: packageHymnal.name,
            language: packageHymnal.language || 'Indonesia',
            publisher: packageHymnal.publisher || '',
            is_official: 0
          })
          await loadHymnals()
          const refreshed = (await window.api.hymnals.getAll()) as Hymnal[]
          targetHymnalId = refreshed.find((h) => h.code === packageHymnal.code)?.id
        }

        if (!targetHymnalId) {
          showToast('Gagal membuat hymnal target', 'error')
          return
        }

        await loadSongs(targetHymnalId)

        const MAX_SONGS = 10000
        const limitedSongs = packageSongs.slice(0, MAX_SONGS)

        setImportTargetHymnalId(targetHymnalId)
        setImportPackage({ hymnal: packageHymnal, songs: limitedSongs })
        setConflicts(buildConflicts(targetHymnalId, limitedSongs))
        setApplyAllAction('skip')
        setApplyAllScope('all')
        setShowAllItems(false)
        setShowImportWizard(true)
      } catch (err) {
        console.error('Import hymnal package failed:', err)
        showToast('Gagal mengimpor paket hymnal', 'error')
      }
    }

    reader.readAsText(file)
  }

  const applyToAll = (): void => {
    setConflicts((prev) =>
      prev.map((c) => {
        if (applyAllScope === 'all' || c.confidence === applyAllScope) {
          return { ...c, action: applyAllAction }
        }
        return c
      })
    )
  }

  const exportConflictReport = (): void => {
    if (!importPackage) return
    const payload = {
      isSionHymnalImportReport: true,
      generatedAt: new Date().toISOString(),
      targetHymnal: importPackage.hymnal,
      totalItems: importPackage.songs.length,
      conflicts
    }

    const dataStr = JSON.stringify(payload, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `sion-media-hymnal-import-report-${importPackage.hymnal.code || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const executeImport = async (): Promise<void> => {
    if (!importPackage || !importTargetHymnalId) return

    setImporting(true)
    setImportProgress({ done: 0, total: importPackage.songs.length })

    try {
      const existingSongs = songs.filter((s) => s.hymnal_id === importTargetHymnalId)
      const byId = new Map<number, Song>()
      const byNumber = new Map<string, Song>()
      const byTitle = new Map<string, Song>()
      const byFingerprint = new Map<string, Song>()
      for (const s of existingSongs) {
        byId.set(s.id, s)
        if (s.number) byNumber.set(normalizeText(s.number), s)
        if (s.title) byTitle.set(normalizeTitle(s.title), s)
        const fp = lyricsFingerprint(s.lyrics_raw)
        if (fp) byFingerprint.set(fp, s)
      }

      const conflictByIndex = new Map<number, (typeof conflicts)[number]>()
      for (const c of conflicts) conflictByIndex.set(c.index, c)

      let imported = 0
      let skipped = 0
      let overwritten = 0
      let copied = 0
      let merged = 0

      for (let i = 0; i < importPackage.songs.length; i++) {
        const item = importPackage.songs[i]
        const number = (item.number || '').toString()
        const title = (item.title || '').toString()
        const lyrics_raw = (item.lyrics_raw || '').toString()
        if (!number || !title) {
          skipped++
          setImportProgress({ done: i + 1, total: importPackage.songs.length })
          continue
        }

        const conflict = conflictByIndex.get(i)

        if (!conflict) {
          const dupeByNumber = byNumber.get(normalizeText(number))
          const dupeByTitle = byTitle.get(normalizeTitle(title))
          const dupeByFp = lyricsFingerprint(lyrics_raw)
            ? byFingerprint.get(lyricsFingerprint(lyrics_raw))
            : undefined
          if (dupeByNumber || dupeByTitle || dupeByFp) {
            skipped++
            setImportProgress({ done: i + 1, total: importPackage.songs.length })
            continue
          }

          const newSongId = (await window.api.songs.add({
            hymnal_id: importTargetHymnalId,
            number,
            title,
            alternate_title: item.alternate_title || '',
            lyrics_raw,
            category: item.category || '',
            language: item.language || importPackage.hymnal.language || 'Indonesia',
            author: item.author || '',
            composer: item.composer || '',
            key_note: item.key_note || '',
            tempo: item.tempo || '',
            tags: item.tags || '',
            theme: item.theme || '',
            scripture_reference: item.scripture_reference || ''
          })) as number

          const created: Song = {
            id: newSongId,
            hymnal_id: importTargetHymnalId,
            number,
            title,
            alternate_title: (item.alternate_title || '').toString(),
            lyrics_raw,
            category: (item.category || '').toString(),
            language: (item.language || importPackage.hymnal.language || 'Indonesia').toString(),
            author: (item.author || '').toString(),
            composer: (item.composer || '').toString(),
            key_note: (item.key_note || '').toString(),
            time_signature: (item.time_signature || '').toString(),
            tempo: (item.tempo || '').toString(),
            tags: (item.tags || '').toString(),
            theme: (item.theme || '').toString(),
            scripture_reference: (item.scripture_reference || '').toString(),
            is_favorite: 0,
            created_at: '',
            updated_at: ''
          }
          byId.set(created.id, created)
          byNumber.set(normalizeText(created.number), created)
          byTitle.set(normalizeTitle(created.title), created)
          const fp = lyricsFingerprint(created.lyrics_raw)
          if (fp) byFingerprint.set(fp, created)

          imported++
          setImportProgress({ done: i + 1, total: importPackage.songs.length })
          continue
        }

        const existing = conflict.existing
        const action = conflict.action
        if (action === 'skip') {
          skipped++
          setImportProgress({ done: i + 1, total: importPackage.songs.length })
          continue
        }

        if (action === 'overwrite') {
          await window.api.songs.update(existing.id, {
            hymnal_id: importTargetHymnalId,
            number,
            title,
            alternate_title: item.alternate_title || '',
            lyrics_raw,
            category: item.category || '',
            language:
              item.language || importPackage.hymnal.language || existing.language || 'Indonesia',
            author: item.author || '',
            composer: item.composer || '',
            key_note: item.key_note || '',
            tempo: item.tempo || '',
            tags: item.tags || '',
            theme: item.theme || '',
            scripture_reference: item.scripture_reference || ''
          })
          overwritten++

          const updated: Song = { ...existing, ...byId.get(existing.id), number, title, lyrics_raw }
          byId.set(existing.id, updated)
          byNumber.set(normalizeText(updated.number), updated)
          byTitle.set(normalizeTitle(updated.title), updated)
          const fp = lyricsFingerprint(updated.lyrics_raw)
          if (fp) byFingerprint.set(fp, updated)
        } else if (action === 'merge') {
          const latestExisting = byId.get(existing.id) || existing
          const updates = mergeMetadata(latestExisting, {
            ...item,
            number,
            title,
            lyrics_raw
          })
          if (Object.keys(updates).length > 0) {
            await window.api.songs.update(existing.id, updates)
            merged++
            const updated: Song = {
              ...latestExisting,
              ...(updates as unknown as Partial<Song>)
            } as Song
            byId.set(existing.id, updated)
          } else {
            skipped++
          }
        } else if (action === 'copy') {
          const baseTitle = title
          let copyTitle = `${baseTitle} (Copy)`
          let attempt = 1
          const titleKey = (): string => normalizeTitle(copyTitle)
          while (byTitle.has(titleKey()) && attempt < 50) {
            attempt++
            copyTitle = `${baseTitle} (Copy ${attempt})`
          }

          let copyNumber = number
          let numAttempt = 1
          const numberKey = (): string => normalizeText(copyNumber)
          while (byNumber.has(numberKey()) && numAttempt < 50) {
            numAttempt++
            copyNumber = `${number}-${numAttempt}`
          }

          const newSongId = (await window.api.songs.add({
            hymnal_id: importTargetHymnalId,
            number: copyNumber,
            title: copyTitle,
            alternate_title: item.alternate_title || '',
            lyrics_raw,
            category: item.category || '',
            language: item.language || importPackage.hymnal.language || 'Indonesia',
            author: item.author || '',
            composer: item.composer || '',
            key_note: item.key_note || '',
            tempo: item.tempo || '',
            tags: item.tags || '',
            theme: item.theme || '',
            scripture_reference: item.scripture_reference || ''
          })) as number

          const created: Song = {
            id: newSongId,
            hymnal_id: importTargetHymnalId,
            number: copyNumber,
            title: copyTitle,
            alternate_title: (item.alternate_title || '').toString(),
            lyrics_raw,
            category: (item.category || '').toString(),
            language: (item.language || importPackage.hymnal.language || 'Indonesia').toString(),
            author: (item.author || '').toString(),
            composer: (item.composer || '').toString(),
            key_note: (item.key_note || '').toString(),
            time_signature: (item.time_signature || '').toString(),
            tempo: (item.tempo || '').toString(),
            tags: (item.tags || '').toString(),
            theme: (item.theme || '').toString(),
            scripture_reference: (item.scripture_reference || '').toString(),
            is_favorite: 0,
            created_at: '',
            updated_at: ''
          }
          byId.set(created.id, created)
          byNumber.set(normalizeText(created.number), created)
          byTitle.set(normalizeTitle(created.title), created)
          const fp = lyricsFingerprint(created.lyrics_raw)
          if (fp) byFingerprint.set(fp, created)

          copied++
        }

        setImportProgress({ done: i + 1, total: importPackage.songs.length })
      }

      await loadSongs(importTargetHymnalId)
      showToast(
        `Import selesai: +${imported}, overwrite ${overwritten}, copy ${copied}, merge ${merged}, skip ${skipped}`,
        'success'
      )
      setShowImportWizard(false)
      setImportPackage(null)
      setConflicts([])
      setImportTargetHymnalId(null)
    } catch (err) {
      console.error('Execute import failed:', err)
      showToast('Gagal menjalankan import', 'error')
    } finally {
      setImporting(false)
    }
  }

  const openModal = (hymnal?: Hymnal): void => {
    if (hymnal) {
      setEditingHymnal(hymnal)
      setForm({
        code: hymnal.code,
        name: hymnal.name,
        language: hymnal.language,
        publisher: hymnal.publisher,
        is_official: hymnal.is_official
      })
    } else {
      setEditingHymnal(null)
      setForm({ code: '', name: '', language: 'Indonesia', publisher: '', is_official: 0 })
    }
    setShowModal(true)
  }

  const handleSave = async (): Promise<void> => {
    if (!form.code || !form.name) return
    try {
      if (editingHymnal) {
        await onUpdate(editingHymnal.id, form)
      } else {
        await onAdd(form)
      }
      setShowModal(false)
      setEditingHymnal(null)
      setForm({ code: '', name: '', language: 'Indonesia', publisher: '', is_official: 0 })
    } catch {
      // Error handled by parent
    }
  }

  const handleDelete = async (id: number): Promise<void> => {
    if (confirm('Hapus buku lagu ini beserta SEMUA lagunya? Tindakan ini tidak bisa dibatalkan.')) {
      await onDelete(id)
    }
  }

  return (
    <>
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">Koleksi Buku Lagu</h2>
            <p className="text-caption">Kelola daftar buku lagu (Hymnals) dalam library.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importHymnalPackageFromFile(file)
                if (importInputRef.current) importInputRef.current.value = ''
              }}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="btn btn-secondary h-9 px-4"
            >
              <Upload size={16} />
              Import Paket
            </button>
            <button onClick={() => openModal()} className="btn btn-primary h-9 px-4">
              <Plus size={16} />
              Buku Baru
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {hymnals.map((h) => (
            <div
              key={h.id}
              className="p-4 rounded-2xl border border-border-default bg-bg-surface flex items-center justify-between group hover:border-brand-primary/30 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                    h.is_official
                      ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                      : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                  }`}
                >
                  {h.code}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary">{h.name}</p>
                    {h.is_official === 1 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-bg-elevated border border-border-subtle text-[9px] font-black text-text-disabled uppercase">
                        Official
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {h.language} · {h.publisher || 'Tanpa Penerbit'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {h.is_official === 0 && (
                  <>
                    <button
                      onClick={() => exportHymnalPackage(h)}
                      className="p-2 rounded-lg text-text-muted hover:bg-bg-active hover:text-text-primary"
                      title="Export Paket Hymnal"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => openModal(h)}
                      className="p-2 rounded-lg text-text-muted hover:bg-bg-active hover:text-text-primary"
                      title="Edit Metadata"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="p-2 rounded-lg text-text-muted hover:bg-status-error/10 hover:text-status-error"
                      title="Hapus Buku"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showImportWizard && importPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-5xl bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-elevated/50">
              <div className="flex flex-col">
                <h3 className="font-bold text-text-primary">Wizard Import Paket Hymnal</h3>
                <p className="text-xs text-text-muted">
                  Target: {importPackage.hymnal.code} · {importPackage.hymnal.name} · Total item:{' '}
                  {importPackage.songs.length}
                </p>
              </div>
              <button
                onClick={() => {
                  if (importing) return
                  setShowImportWizard(false)
                  setImportPackage(null)
                  setConflicts([])
                  setImportTargetHymnalId(null)
                }}
                className="p-1 rounded-md hover:bg-bg-active text-text-muted"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-6 gap-3">
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">Conflicts</div>
                  <div className="text-2xl font-black text-text-primary">{conflicts.length}</div>
                </div>
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">
                    Default Action
                  </div>
                  <div className="text-sm font-bold text-text-primary">Skip (aman)</div>
                </div>
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">Progress</div>
                  <div className="text-sm font-bold text-text-primary">
                    {importing ? `${importProgress.done}/${importProgress.total}` : 'Belum mulai'}
                  </div>
                </div>
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">Exact</div>
                  <div className="text-2xl font-black text-text-primary">
                    {conflicts.filter((c) => c.confidence === 'exact').length}
                  </div>
                </div>
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">Probable</div>
                  <div className="text-2xl font-black text-text-primary">
                    {conflicts.filter((c) => c.confidence === 'probable').length}
                  </div>
                </div>
                <div className="rounded-xl border border-border-default bg-bg-base p-3">
                  <div className="text-[11px] font-black text-text-muted uppercase">Weak</div>
                  <div className="text-2xl font-black text-text-primary">
                    {conflicts.filter((c) => c.confidence === 'weak').length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-bold text-text-muted">Apply to all:</div>
                <select
                  value={applyAllScope}
                  onChange={(e) => setApplyAllScope(e.target.value as typeof applyAllScope)}
                  className="rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm"
                  disabled={importing}
                >
                  <option value="all">All conflicts</option>
                  <option value="exact">Exact only</option>
                  <option value="probable">Probable only</option>
                  <option value="weak">Weak only</option>
                </select>
                <select
                  value={applyAllAction}
                  onChange={(e) => setApplyAllAction(e.target.value as typeof applyAllAction)}
                  className="rounded-lg border border-border-default bg-bg-base px-3 py-2 text-sm"
                  disabled={importing}
                >
                  <option value="skip">Skip</option>
                  <option value="overwrite">Overwrite selected</option>
                  <option value="copy">Create copy</option>
                  <option value="merge">Merge metadata</option>
                </select>
                <button
                  onClick={applyToAll}
                  disabled={importing || conflicts.length === 0}
                  className="btn btn-secondary h-9 px-4"
                >
                  Apply
                </button>
                <button
                  onClick={exportConflictReport}
                  disabled={importing || conflicts.length === 0}
                  className="btn btn-secondary h-9 px-4"
                >
                  Export Report
                </button>
                <button
                  onClick={() => setShowAllItems((v) => !v)}
                  disabled={importing}
                  className="btn btn-secondary h-9 px-4"
                >
                  {showAllItems ? 'Show Conflicts Only' : 'Show All (Limited)'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-bold text-text-muted">Filter:</div>
                <input
                  value={wizardSearch}
                  onChange={(e) => setWizardSearch(e.target.value)}
                  disabled={importing}
                  placeholder="Cari nomor / judul..."
                  className="h-9 w-56 rounded-lg border border-border-default bg-bg-base px-3 text-sm"
                />
                <select
                  value={wizardFilterConfidence}
                  onChange={(e) =>
                    setWizardFilterConfidence(e.target.value as typeof wizardFilterConfidence)
                  }
                  className="h-9 rounded-lg border border-border-default bg-bg-base px-3 text-sm"
                  disabled={importing}
                >
                  <option value="all">All confidence</option>
                  <option value="exact">Exact</option>
                  <option value="probable">Probable</option>
                  <option value="weak">Weak</option>
                </select>
                <select
                  value={wizardFilterAction}
                  onChange={(e) =>
                    setWizardFilterAction(e.target.value as typeof wizardFilterAction)
                  }
                  className="h-9 rounded-lg border border-border-default bg-bg-base px-3 text-sm"
                  disabled={importing}
                >
                  <option value="all">All actions</option>
                  <option value="skip">Skip</option>
                  <option value="overwrite">Overwrite</option>
                  <option value="copy">Copy</option>
                  <option value="merge">Merge</option>
                </select>
              </div>

              <div className="max-h-[360px] overflow-auto rounded-xl border border-border-default">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-bg-elevated/80 backdrop-blur border-b border-border-default">
                    <tr>
                      <th className="px-3 py-2 text-xs font-black uppercase text-text-muted">#</th>
                      <th className="px-3 py-2 text-xs font-black uppercase text-text-muted">
                        Incoming
                      </th>
                      <th className="px-3 py-2 text-xs font-black uppercase text-text-muted">
                        Existing
                      </th>
                      <th className="px-3 py-2 text-xs font-black uppercase text-text-muted">
                        Confidence
                      </th>
                      <th className="px-3 py-2 text-xs font-black uppercase text-text-muted">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const search = wizardSearch.trim().toLowerCase()
                      const passesSearch = (incoming: Partial<Song>): boolean => {
                        if (!search) return true
                        const n = (incoming.number || '').toString().toLowerCase()
                        const t = (incoming.title || '').toString().toLowerCase()
                        return n.includes(search) || t.includes(search)
                      }

                      const passesConfidence = (
                        c: (typeof conflicts)[number] | undefined
                      ): boolean => {
                        if (wizardFilterConfidence === 'all') return true
                        return c?.confidence === wizardFilterConfidence
                      }

                      const passesAction = (c: (typeof conflicts)[number] | undefined): boolean => {
                        if (wizardFilterAction === 'all') return true
                        return c?.action === wizardFilterAction
                      }

                      const rows = showAllItems
                        ? importPackage.songs.slice(0, 200).map((incoming, idx) => {
                            const conflict = conflicts.find((c) => c.index === idx)
                            return { idx, incoming, conflict }
                          })
                        : conflicts
                            .slice(0, 200)
                            .map((c) => ({ idx: c.index, incoming: c.incoming, conflict: c }))

                      return rows
                        .filter((r) => passesSearch(r.incoming))
                        .filter((r) => passesConfidence(r.conflict))
                        .filter((r) => passesAction(r.conflict))
                        .map((row) => {
                          const c = row.conflict
                          const incomingLabel = `${row.incoming.number || ''} · ${row.incoming.title || ''}`
                          const existingLabel = c
                            ? `${c.existing.number} · ${c.existing.title}`
                            : '—'
                          const confidence = c ? c.confidence : '—'

                          return (
                            <tr
                              key={row.idx}
                              className="border-b border-border-subtle hover:bg-bg-base/40"
                            >
                              <td className="px-3 py-2 text-xs text-text-muted">{row.idx + 1}</td>
                              <td className="px-3 py-2">
                                <div className="font-bold text-text-primary">{incomingLabel}</div>
                                {c && <div className="text-xs text-text-muted">{c.reason}</div>}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs text-text-secondary">{existingLabel}</div>
                              </td>
                              <td className="px-3 py-2">
                                {c ? (
                                  <span
                                    className={`text-xs font-black uppercase px-2 py-1 rounded-lg border ${
                                      c.confidence === 'exact'
                                        ? 'border-status-success/30 bg-status-success/10 text-status-success'
                                        : c.confidence === 'probable'
                                          ? 'border-status-warning/30 bg-status-warning/10 text-status-warning'
                                          : 'border-border-strong bg-bg-base text-text-muted'
                                    }`}
                                  >
                                    {confidence}
                                  </span>
                                ) : (
                                  <span className="text-xs text-text-muted">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {c ? (
                                  <select
                                    value={c.action}
                                    onChange={(e) => {
                                      const next = e.target
                                        .value as (typeof conflicts)[number]['action']
                                      setConflicts((prev) =>
                                        prev.map((x) =>
                                          x.index === c.index ? { ...x, action: next } : x
                                        )
                                      )
                                    }}
                                    disabled={importing}
                                    className="rounded-lg border border-border-default bg-bg-base px-2 py-1.5 text-sm"
                                  >
                                    <option value="skip">Skip</option>
                                    <option value="overwrite">Overwrite selected</option>
                                    <option value="copy">Create copy</option>
                                    <option value="merge">Merge metadata</option>
                                  </select>
                                ) : (
                                  <span className="text-xs text-text-muted">Import</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-text-muted">
                  {showAllItems
                    ? 'Menampilkan maksimal 200 item (performance safety)'
                    : 'Menampilkan maksimal 200 konflik (performance safety)'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (importing) return
                      setShowImportWizard(false)
                      setImportPackage(null)
                      setConflicts([])
                      setImportTargetHymnalId(null)
                    }}
                    disabled={importing}
                    className="btn btn-secondary h-9 px-4"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => void executeImport()}
                    disabled={importing}
                    className="btn btn-primary h-9 px-4"
                  >
                    {importing ? 'Mengimpor...' : 'Jalankan Import'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hymnal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-elevated/50">
              <h3 className="font-bold text-text-primary">
                {editingHymnal ? 'Edit Buku Lagu' : 'Tambah Buku Lagu Baru'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md hover:bg-bg-active text-text-muted"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-micro text-text-muted mb-1.5 block">
                  Kode Buku (Singkat)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="E.g. LS, SDAH, PK"
                  className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>
              <div>
                <label className="text-micro text-text-muted mb-1.5 block">Nama Lengkap Buku</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="E.g. Lagu Sion Edisi Lengkap"
                  className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-micro text-text-muted mb-1.5 block">Bahasa</label>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-micro text-text-muted mb-1.5 block">Penerbit</label>
                  <input
                    type="text"
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                    className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-bg-elevated/50 border-t border-border-default flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-strong text-sm font-bold text-text-secondary hover:bg-bg-active"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.code || !form.name}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-sm font-bold text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
