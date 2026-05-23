import React, { useState, useRef, useMemo } from 'react'
import {
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Merge,
  SkipForward,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useCacheStore } from '@renderer/store/useCacheStore'
import type { Song } from '@renderer/types'
import { logger } from '@renderer/utils/logger'
import {
  validateKeyNote,
  validateTempo,
  formatKeyNote,
  formatTempo
} from '@renderer/utils/metadataValidation'

type ConflictResolution = 'pending' | 'skip' | 'overwrite' | 'merge'

export function ImportExportScreen(): React.JSX.Element {
  const { setScreen, songs, hymnals, loadSongs, showToast } = useAppStore()
  const {
    parsedItems: importedData,
    playlistMeta: importedPlaylistMeta,
    setParsedItems,
    clearCache
  } = useCacheStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<number, ConflictResolution>
  >({})
  const [importing, setImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [targetHymnalId, setTargetHymnalId] = useState<number>(hymnals[0]?.id || 1)
  const [showMergePreview, setShowMergePreview] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File): Promise<void> => {
    if (file.name.endsWith('.xlsx')) {
      try {
        const filePath = (file as unknown as { path: string }).path
        if (!filePath) {
          showToast('File path tidak ditemukan. Coba gunakan fitur upload file.', 'error')
          return
        }

        const items = (await window.api.file.parseExcel(filePath)) as Partial<Song>[]
        if (items.length === 0) {
          showToast('File Excel kosong atau format tidak sesuai', 'error')
          return
        }

        processImportedItems(items)
      } catch (err) {
        logger.error('Failed to parse Excel:', err)
        showToast('Gagal mem-parsing file Excel', 'error')
      }
      return
    }

    if (file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          const items = Array.isArray(json) ? json : json.songs || []

          let playlistMeta = null
          if (json.isSionPlaylist) {
            playlistMeta = json.playlist
          }

          if (items.length === 0) {
            showToast('File JSON tidak valid atau kosong', 'error')
            return
          }
          processImportedItems(items, playlistMeta)
        } catch (err) {
          logger.error('Failed to parse JSON:', err)
          showToast('Gagal mem-parsing file JSON', 'error')
        }
      }
      reader.readAsText(file)
    } else {
      showToast('Hanya mendukung file JSON dan Excel (.xlsx)', 'error')
    }
  }

  const processImportedItems = (
    items: Partial<Song>[],
    playlistMeta: { name: string; service_date: string } | null = null
  ): void => {
    const resolutions: Record<number, ConflictResolution> = {}
    items.forEach((item, index) => {
      const isDupe = songs.some((s) => s.title === item.title || s.number === item.number)
      if (isDupe) resolutions[index] = 'pending'
    })

    setParsedItems(items, playlistMeta)
    setConflictResolutions(resolutions)
    setStep(2)
  }

  // Get duplicate info for a specific index
  const getDuplicateSong = (index: number): Song | undefined => {
    const item = importedData[index]
    if (!item) return undefined
    return songs.find((s) => s.title === item.title || s.number === item.number)
  }

  // Check if all conflicts are resolved
  const allConflictsResolved = useMemo(() => {
    const conflictIndices = Object.keys(conflictResolutions).map(Number)
    return conflictIndices.every((idx) => conflictResolutions[idx] !== 'pending')
  }, [conflictResolutions])

  // Set resolution for a specific conflict
  const setResolution = (index: number, resolution: ConflictResolution): void => {
    setConflictResolutions((prev) => ({ ...prev, [index]: resolution }))
  }

  // Set all pending conflicts to a specific resolution
  const setAllResolutions = (resolution: ConflictResolution): void => {
    setConflictResolutions((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((key) => {
        const idx = Number(key)
        if (updated[idx] === 'pending') {
          updated[idx] = resolution
        }
      })
      return updated
    })
  }

  // Generate merged lyrics preview
  const getMergedLyricsPreview = (index: number): string => {
    const item = importedData[index]
    const existing = getDuplicateSong(index)
    if (!item || !existing) return ''

    // Append new lyrics to existing with separator
    const separator = '\n\n--- [IMPORTED CONTENT] ---\n\n'
    return existing.lyrics_raw + separator + (item.lyrics_raw || '')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleExport = (): void => {
    const dataStr = JSON.stringify(songs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `sion-media-songs-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
    showToast('Berhasil mengekspor lagu', 'success')
  }

  const handleImport = async (): Promise<void> => {
    if (!allConflictsResolved && Object.keys(conflictResolutions).length > 0) {
      showToast('Harap selesaikan semua konflik duplikat terlebih dahulu', 'error')
      return
    }

    setImporting(true)
    let successCount = 0
    let skipCount = 0
    let mergeCount = 0
    let overwriteCount = 0

    try {
      let newPlaylistId: number | null = null
      if (importedPlaylistMeta) {
        const result = await window.api.playlists.add({
          name: importedPlaylistMeta.name || 'Imported Playlist',
          service_date: importedPlaylistMeta.service_date || ''
        })
        newPlaylistId = result as number
      }

      for (let i = 0; i < importedData.length; i++) {
        const item = importedData[i]
        const resolution = conflictResolutions[i]
        const existingSong = resolution ? getDuplicateSong(i) : undefined

        // Handle conflicts based on resolution
        if (resolution === 'skip') {
          // Add to playlist if exists, but don't modify song
          if (newPlaylistId && existingSong) {
            await window.api.playlists.addItem({
              playlist_id: newPlaylistId,
              song_id: existingSong.id,
              sort_order: i
            })
          }
          skipCount++
          continue
        }

        if (resolution === 'overwrite' && existingSong) {
          // Overwrite existing song
          const overwriteKeyNote = item.key_note
            ? formatKeyNote(item.key_note)
            : existingSong.key_note
          const overwriteTempo = item.tempo ? formatTempo(item.tempo) : existingSong.tempo
          await window.api.songs.update(existingSong.id, {
            hymnal_id: targetHymnalId,
            number: item.number || existingSong.number,
            title: item.title || existingSong.title,
            lyrics_raw: item.lyrics_raw || existingSong.lyrics_raw,
            category: item.category || existingSong.category,
            language: item.language || existingSong.language,
            author: item.author || existingSong.author,
            composer: item.composer || existingSong.composer,
            key_note: overwriteKeyNote,
            tempo: overwriteTempo,
            tags: item.tags || existingSong.tags
          })
          overwriteCount++
          successCount++

          if (newPlaylistId) {
            await window.api.playlists.addItem({
              playlist_id: newPlaylistId,
              song_id: existingSong.id,
              sort_order: i
            })
          }
          continue
        }

        if (resolution === 'merge' && existingSong) {
          // Merge: append lyrics and update metadata
          const mergedLyrics = getMergedLyricsPreview(i)
          const mergeKeyNote = item.key_note ? formatKeyNote(item.key_note) : existingSong.key_note
          const mergeTempo = item.tempo ? formatTempo(item.tempo) : existingSong.tempo
          await window.api.songs.update(existingSong.id, {
            lyrics_raw: mergedLyrics,
            // Keep existing metadata but add new if available
            category: item.category || existingSong.category,
            language: item.language || existingSong.language,
            author: item.author || existingSong.author,
            composer: item.composer || existingSong.composer,
            key_note: mergeKeyNote,
            tempo: mergeTempo,
            tags: item.tags ? `${existingSong.tags || ''}, ${item.tags}` : existingSong.tags
          })
          mergeCount++
          successCount++

          if (newPlaylistId) {
            await window.api.playlists.addItem({
              playlist_id: newPlaylistId,
              song_id: existingSong.id,
              sort_order: i
            })
          }
          continue
        }

        // No conflict - add new song
        // Validate and format metadata
        const importKeyNote = formatKeyNote(item.key_note || '')
        const importTempo = formatTempo(item.tempo || '')
        if (item.key_note && !validateKeyNote(importKeyNote).valid) {
          logger.warn(`Skipping invalid key_note during import: ${item.key_note}`)
        }
        if (item.tempo && !validateTempo(importTempo).valid) {
          logger.warn(`Skipping invalid tempo during import: ${item.tempo}`)
        }

        const newSongId = await window.api.songs.add({
          hymnal_id: targetHymnalId,
          number: item.number || '000',
          title: item.title || 'Untitled',
          lyrics_raw: item.lyrics_raw || '',
          category: item.category || '',
          language: item.language || 'Indonesia',
          author: item.author || '',
          composer: item.composer || '',
          key_note: importKeyNote,
          tempo: importTempo,
          tags: item.tags || ''
        })

        if (newPlaylistId) {
          await window.api.playlists.addItem({
            playlist_id: newPlaylistId,
            song_id: newSongId as number,
            sort_order: i
          })
        }

        successCount++
      }

      // Build summary message
      let summary = `Berhasil mengimpor ${successCount} lagu`
      if (skipCount > 0) summary += `, ${skipCount} dilewati`
      if (overwriteCount > 0) summary += `, ${overwriteCount} ditimpa`
      if (mergeCount > 0) summary += `, ${mergeCount} digabung`

      if (importedPlaylistMeta) {
        summary += ' beserta metadata playlist'
      }

      showToast(summary, 'success')
      await loadSongs()
      clearCache()
      setScreen('dashboard')
    } catch (err) {
      logger.error('Import failed:', err)
      showToast('Terjadi kesalahan saat mengimpor', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-base overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border-default bg-bg-surface/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen('dashboard')}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold">Import / Export Lagu</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-8 overflow-y-auto">
        {step === 1 ? (
          <div className="flex gap-8 h-full items-center justify-center">
            {/* Import Card */}
            <div
              className={`flex-1 bg-bg-surface rounded-xl shadow-md p-10 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer h-80 ${
                isDragging
                  ? 'border-accent-primary bg-accent-primary/10 scale-105 shadow-xl'
                  : 'border-border-default hover:border-accent-primary/50 hover:bg-accent-primary/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={48} className="text-accent-primary mb-6" />
              <h2 className="text-xl font-semibold mb-2">Import JSON / Excel</h2>
              <p className="text-sm text-text-muted max-w-[250px]">
                Impor database lagu dari file JSON atau Excel (.xlsx).
              </p>
              <input
                type="file"
                accept=".json,.xlsx"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            {/* Export Card */}
            <div
              className="flex-1 bg-bg-surface rounded-xl shadow-md cursor-pointer p-10 flex flex-col items-center justify-center text-center border border-border-default hover:border-status-success/50 hover:bg-status-success/5 transition-colors h-80"
              onClick={handleExport}
            >
              <Download size={48} className="text-status-success mb-6" />
              <h2 className="text-xl font-semibold mb-2">Export Library</h2>
              <p className="text-sm text-text-muted max-w-[250px]">
                Ekspor seluruh lagu di library Anda ke dalam file JSON untuk di-backup atau
                dipindahkan ke PC lain.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full animate-fadeIn">
            <h2 className="text-xl font-semibold mb-2">Preview Import</h2>
            {importedPlaylistMeta && (
              <div className="mb-2 px-3 py-1.5 bg-accent-primary/10 border border-accent-primary/20 rounded-md inline-block">
                <span className="text-xs text-accent-primary font-medium">
                  📦 Playlist Pack: {importedPlaylistMeta.name}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-text-muted">
                  Ditemukan{' '}
                  <span className="font-bold text-text-primary">{importedData.length}</span> lagu.
                  {Object.keys(conflictResolutions).length > 0 && (
                    <>
                      {' '}
                      <span className="font-bold text-status-warning">
                        {Object.keys(conflictResolutions).length}
                      </span>{' '}
                      konflik duplikat terdeteksi.
                    </>
                  )}
                </p>
                {Object.keys(conflictResolutions).length > 0 && !allConflictsResolved && (
                  <p className="text-xs text-status-warning">
                    ⚠ Selesaikan semua konflik sebelum melanjutkan import.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted whitespace-nowrap">
                    Impor ke Buku:
                  </span>
                  <select
                    value={targetHymnalId}
                    onChange={(e) => setTargetHymnalId(Number(e.target.value))}
                    className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent-primary"
                  >
                    {hymnals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.code} - {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="rounded-md border border-border-default px-3 py-1.5 text-sm hover:bg-bg-elevated text-text-secondary"
                >
                  Batal
                </button>
              </div>
            </div>

            {/* Bulk Resolution Buttons */}
            {Object.keys(conflictResolutions).length > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-bg-elevated/50 rounded-lg border border-border-subtle">
                <span className="text-xs text-text-muted">Atur semua konflik:</span>
                <button
                  onClick={() => setAllResolutions('skip')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-bg-surface border border-border-default hover:bg-status-warning/10 hover:border-status-warning/30 hover:text-status-warning transition-colors"
                >
                  <SkipForward size={12} /> Skip Semua
                </button>
                <button
                  onClick={() => setAllResolutions('overwrite')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-bg-surface border border-border-default hover:bg-status-success/10 hover:border-status-success/30 hover:text-status-success transition-colors"
                >
                  <RefreshCw size={12} /> Timpa Semua
                </button>
                <button
                  onClick={() => setAllResolutions('merge')}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-bg-surface border border-border-default hover:bg-accent-primary/10 hover:border-accent-primary/30 hover:text-accent-primary transition-colors"
                >
                  <Merge size={12} /> Gabung Semua
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto border border-border-default rounded-lg bg-bg-surface/30 mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-bg-elevated sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-text-muted w-32">Status</th>
                    <th className="p-3 font-semibold text-text-muted w-20">No</th>
                    <th className="p-3 font-semibold text-text-muted">Judul</th>
                    <th className="p-3 font-semibold text-text-muted w-28">Kategori</th>
                    <th className="p-3 font-semibold text-text-muted w-40">Resolusi</th>
                  </tr>
                </thead>
                <tbody>
                  {importedData.map((item, index) => {
                    const isConflict = conflictResolutions[index] !== undefined
                    const resolution = conflictResolutions[index]
                    const existingSong = isConflict ? getDuplicateSong(index) : undefined

                    return (
                      <tr
                        key={index}
                        className={`border-t border-border-default ${isConflict ? 'bg-status-warning/5' : ''}`}
                      >
                        <td className="p-3">
                          {isConflict ? (
                            <span className="flex items-center gap-1.5 text-status-warning text-xs font-medium">
                              <AlertCircle size={14} /> Konflik
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-status-success text-xs font-medium">
                              <CheckCircle2 size={14} /> Baru
                            </span>
                          )}
                        </td>
                        <td className="p-3">{item.number}</td>
                        <td className="p-3 font-medium">
                          <div className="flex flex-col">
                            <span>{item.title}</span>
                            {isConflict && existingSong && (
                              <span className="text-[10px] text-text-muted mt-0.5">
                                Existing: {existingSong.number} - {existingSong.title}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-text-muted">{item.category}</td>
                        <td className="p-3">
                          {isConflict ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setResolution(index, 'skip')}
                                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${
                                    resolution === 'skip'
                                      ? 'bg-status-warning/20 text-status-warning border border-status-warning/40'
                                      : 'bg-bg-surface border border-border-default hover:bg-status-warning/10 hover:text-status-warning'
                                  }`}
                                >
                                  <SkipForward size={10} /> Skip
                                </button>
                                <button
                                  onClick={() => setResolution(index, 'overwrite')}
                                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${
                                    resolution === 'overwrite'
                                      ? 'bg-status-success/20 text-status-success border border-status-success/40'
                                      : 'bg-bg-surface border border-border-default hover:bg-status-success/10 hover:text-status-success'
                                  }`}
                                >
                                  <RefreshCw size={10} /> Timpa
                                </button>
                                <button
                                  onClick={() => setResolution(index, 'merge')}
                                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${
                                    resolution === 'merge'
                                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                                      : 'bg-bg-surface border border-border-default hover:bg-accent-primary/10 hover:text-accent-primary'
                                  }`}
                                >
                                  <Merge size={10} /> Gabung
                                </button>
                              </div>
                              {resolution === 'merge' && (
                                <button
                                  onClick={() =>
                                    setShowMergePreview(showMergePreview === index ? null : index)
                                  }
                                  className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors"
                                >
                                  {showMergePreview === index ? (
                                    <EyeOff size={10} />
                                  ) : (
                                    <Eye size={10} />
                                  )}
                                  {showMergePreview === index ? 'Sembunyikan' : 'Preview'} Gabungan
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Merge Preview Panel */}
              {showMergePreview !== null && importedData[showMergePreview] && (
                <div className="border-t border-border-default p-4 bg-bg-elevated/50">
                  <h4 className="text-xs font-bold text-accent-primary mb-2">
                    Preview Lirik Gabungan:
                  </h4>
                  <pre className="text-[10px] text-text-muted whitespace-pre-wrap font-mono bg-bg-surface p-3 rounded border border-border-default max-h-40 overflow-y-auto">
                    {getMergedLyricsPreview(showMergePreview)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-end shrink-0">
              <button
                onClick={handleImport}
                disabled={
                  importing ||
                  (!allConflictsResolved && Object.keys(conflictResolutions).length > 0)
                }
                className="rounded-lg bg-accent-primary px-6 py-2 text-sm font-semibold text-white hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing
                  ? 'Mengimpor...'
                  : `Impor ${importedData.length - Object.keys(conflictResolutions).filter((i) => conflictResolutions[Number(i)] === 'skip').length} Lagu`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
