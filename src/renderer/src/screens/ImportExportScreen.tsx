import React, { useState, useRef } from 'react'
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useCacheStore } from '../store/useCacheStore'
import type { Song } from '../types'

export function ImportExportScreen(): React.JSX.Element {
  const { setScreen, songs, hymnals, loadSongs, showToast } = useAppStore()
  const {
    parsedItems: importedData,
    playlistMeta: importedPlaylistMeta,
    setParsedItems,
    clearCache
  } = useCacheStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [duplicates, setDuplicates] = useState<number[]>([]) // Indices of duplicates
  const [importing, setImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [targetHymnalId, setTargetHymnalId] = useState<number>(hymnals[0]?.id || 1)
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
      } catch {
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
        } catch {
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
    const dupes: number[] = []
    items.forEach((item, index) => {
      const isDupe = songs.some((s) => s.title === item.title || s.number === item.number)
      if (isDupe) dupes.push(index)
    })

    setParsedItems(items, playlistMeta)
    setDuplicates(dupes)
    setStep(2)
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

  const handleImport = async (skipDuplicates: boolean): Promise<void> => {
    setImporting(true)
    let successCount = 0

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
        if (skipDuplicates && duplicates.includes(i)) {
          if (newPlaylistId) {
            const existingSong = songs.find(
              (s) => s.title === importedData[i].title || s.number === importedData[i].number
            )
            if (existingSong) {
              await window.api.playlists.addItem({
                playlist_id: newPlaylistId,
                song_id: existingSong.id,
                sort_order: i
              })
            }
          }
          continue
        }

        const item = importedData[i]
        const newSongId = await window.api.songs.add({
          hymnal_id: targetHymnalId,
          number: item.number || '000',
          title: item.title || 'Untitled',
          lyrics_raw: item.lyrics_raw || '',
          category: item.category || '',
          language: item.language || 'Indonesia',
          author: item.author || '',
          composer: item.composer || '',
          key_note: item.key_note || '',
          tempo: item.tempo || '',
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

      if (importedPlaylistMeta) {
        showToast(`Berhasil mengimpor ${successCount} lagu beserta metadata playlist`, 'success')
      } else {
        showToast(`Berhasil mengimpor ${successCount} lagu`, 'success')
      }

      await loadSongs()
      clearCache()
      setScreen('dashboard')
    } catch {
      showToast('Terjadi kesalahan saat mengimpor', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-base overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setScreen('dashboard')}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
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
              className={`flex-1 glass-panel p-10 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer rounded-xl h-80 ${
                isDragging
                  ? 'border-accent bg-accent/10 scale-105 shadow-xl'
                  : 'border-border hover:border-accent/50 hover:bg-accent/5'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={48} className="text-accent mb-6" />
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
              className="flex-1 glass-panel p-10 flex flex-col items-center justify-center text-center border border-border hover:border-live/50 hover:bg-live/5 transition-colors cursor-pointer rounded-xl h-80"
              onClick={handleExport}
            >
              <Download size={48} className="text-live mb-6" />
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
              <div className="mb-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-md inline-block">
                <span className="text-xs text-accent font-medium">
                  📦 Playlist Pack: {importedPlaylistMeta.name}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-text-muted">
                Ditemukan {importedData.length} lagu. {duplicates.length} lagu memiliki judul/nomor
                duplikat.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-muted whitespace-nowrap">
                    Impor ke Buku:
                  </span>
                  <select
                    value={targetHymnalId}
                    onChange={(e) => setTargetHymnalId(Number(e.target.value))}
                    className="bg-bg-elevated border border-border-default rounded px-2 py-1 text-xs outline-none focus:border-brand-primary"
                  >
                    {hymnals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.code} - {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setStep(1)} className="btn-ghost text-xs py-1 px-3">
                  Batal
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-surface/30 mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-elevated sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-text-muted">Status</th>
                    <th className="p-3 font-semibold text-text-muted">No</th>
                    <th className="p-3 font-semibold text-text-muted">Judul</th>
                    <th className="p-3 font-semibold text-text-muted">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {importedData.map((item, index) => {
                    const isDupe = duplicates.includes(index)
                    return (
                      <tr
                        key={index}
                        className={`border-t border-border ${isDupe ? 'bg-warning/10' : ''}`}
                      >
                        <td className="p-3">
                          {isDupe ? (
                            <span className="flex items-center gap-1.5 text-warning text-xs font-medium">
                              <AlertCircle size={14} /> Duplikat
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-live text-xs font-medium">
                              <CheckCircle2 size={14} /> Baru
                            </span>
                          )}
                        </td>
                        <td className="p-3">{item.number}</td>
                        <td className="p-3 font-medium">{item.title}</td>
                        <td className="p-3 text-text-muted">{item.category}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 justify-end shrink-0">
              <button
                onClick={() => handleImport(true)}
                disabled={importing || duplicates.length === importedData.length}
                className="btn-ghost py-2 px-6"
              >
                {importing ? 'Mengimpor...' : 'Skip Duplikat'}
              </button>
              <button
                onClick={() => handleImport(false)}
                disabled={importing}
                className="btn-primary py-2 px-6"
              >
                {importing ? 'Mengimpor...' : 'Impor Semua (Timpa)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
