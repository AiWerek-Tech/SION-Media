/**
 * Phase 8 — MediaLibrarySection
 *
 * Browsable media asset library for Management Mode.
 * Shows images and videos from the atmosphere/backgrounds system
 * with preview thumbnails and usage stats.
 *
 * Additive component — does not modify atmosphere or background logic.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Film, HardDrive, Image as ImageIcon, LoaderCircle, Search, Upload, X } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import type { MediaAssetRecord, MediaCollectionRecord } from '@renderer/atmosphere/types'
import { toLocalMediaUrl } from '@renderer/utils/localMediaUrl'

type MediaFilter = 'all' | 'image' | 'video'
type ImportProgress = {
  completed: number
  total: number
  phase: 'preparing' | 'thumbnail' | 'committing' | 'complete'
  fileName: string
}

function toFileUrl(path?: string): string {
  return toLocalMediaUrl(path)
}

export function MediaLibrarySection(): React.JSX.Element {
  const { showToast } = useAppStore()
  const [assets, setAssets] = useState<MediaAssetRecord[]>([])
  const [collections, setCollections] = useState<MediaCollectionRecord[]>([])
  const [filter, setFilter] = useState<MediaFilter>('all')
  const [query, setQuery] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)

  // Load assets on mount
  useEffect(() => {
    const loadMedia = async (): Promise<void> => {
      try {
        const [nextAssets, nextCollections] = await Promise.all([
          window.api.media.getAll(),
          window.api.media.getCollections()
        ])
        setAssets(nextAssets as MediaAssetRecord[])
        setCollections(nextCollections as MediaCollectionRecord[])
      } catch {
        // Backgrounds API may not be fully available yet
        setAssets([])
        setCollections([])
      }
    }
    loadMedia().catch(() => {})
  }, [])

  useEffect(() => window.api.media.onImportProgress(setImportProgress), [])

  const filteredAssets = useMemo(() => {
    let result = assets
    if (filter !== 'all') result = result.filter((a) => a.type === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(q))
    }
    return result
  }, [assets, filter, query])

  const stats = useMemo(() => {
    const images = assets.filter((a) => a.type === 'image').length
    const videos = assets.filter((a) => a.type === 'video').length
    const totalSize = assets.length // approximate — no size field available yet
    return { images, videos, totalSize, collections: collections.length }
  }, [assets, collections])

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || null

  const handleImport = useCallback(async () => {
    try {
      const selection = (await window.api.file.showOpenDialog({
        title: 'Pilih media untuk diimpor',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Media',
            extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'mkv', 'pdf']
          }
        ]
      })) as { canceled: boolean; filePaths: string[] }
      if (selection.canceled || selection.filePaths.length === 0) return
      setIsImporting(true)
      setImportProgress({
        completed: 0,
        total: selection.filePaths.length,
        phase: 'preparing',
        fileName: ''
      })
      const imported = (await window.api.media.importAssets({
        filePaths: selection.filePaths
      })) as MediaAssetRecord[]
      setAssets((current) => {
        const byId = new Map(current.map((asset) => [asset.id, asset]))
        for (const asset of imported) byId.set(asset.id, asset)
        return Array.from(byId.values())
      })
      showToast(`${imported.length} media berhasil diimpor`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import media gagal'
      showToast(message.includes('dibatalkan') ? 'Import media dibatalkan' : message, 'error')
    } finally {
      setIsImporting(false)
      setImportProgress(null)
    }
  }, [showToast])

  const handleCancelImport = useCallback(() => {
    void window.api.media.cancelImport()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle">
        <div>
          <h2 className="text-[15px] font-black text-text-primary">Media Library</h2>
          <p className="text-[11px] text-text-muted mt-0.5">{assets.length} aset</p>
        </div>
        <button
          type="button"
          onClick={isImporting ? handleCancelImport : handleImport}
          className="
            inline-flex items-center gap-2 h-8 px-3 rounded-lg
            bg-brand-primary text-white text-[12px] font-semibold
            hover:bg-brand-primary-hover transition-colors
          "
        >
          {isImporting ? <LoaderCircle size={14} className="animate-spin" /> : <Upload size={14} />}
          {isImporting ? 'Batalkan' : 'Import Media'}
        </button>
      </div>

      {isImporting && importProgress && (
        <div className="border-b border-border-subtle px-5 py-2" role="status" aria-live="polite">
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-text-muted">
            <span className="truncate">
              {importProgress.phase === 'committing'
                ? 'Menyimpan ke library...'
                : importProgress.fileName || 'Menyiapkan import...'}
            </span>
            <span>
              {importProgress.completed}/{importProgress.total}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-brand-primary transition-[width] duration-200"
              style={{
                width: `${importProgress.total > 0 ? Math.round((importProgress.completed / importProgress.total) * 100) : 0}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border-subtle text-[10px]">
        <span className="flex items-center gap-1.5 text-text-muted">
          <ImageIcon size={12} /> {stats.images} gambar
        </span>
        <span className="flex items-center gap-1.5 text-text-muted">
          <Film size={12} /> {stats.videos} video
        </span>
        <span className="flex items-center gap-1.5 text-text-muted">
          <HardDrive size={12} /> {stats.totalSize} aset total
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border-subtle">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari media..."
            className="
              w-full h-7 pl-8 pr-3 rounded-md border border-border-default
              bg-bg-elevated text-[11px] text-text-primary
              placeholder:text-text-disabled outline-none
              focus:ring-1 focus:ring-brand-primary/40
            "
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border-default p-0.5">
          {(['all', 'image', 'video'] as MediaFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`
                px-2 py-1 rounded text-[10px] font-semibold transition-colors
                ${filter === f ? 'bg-white/[0.08] text-text-primary' : 'text-text-muted hover:text-text-primary'}
              `}
            >
              {f === 'all' ? 'Semua' : f === 'image' ? 'Gambar' : 'Video'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
              <ImageIcon size={36} className="opacity-20" />
              <span className="text-[12px]">
                {assets.length === 0 ? 'Belum ada media asset' : 'Tidak ada hasil'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`
                    group relative rounded-lg overflow-hidden border
                    transition-all duration-200
                    ${
                      selectedAssetId === asset.id
                        ? 'border-brand-primary ring-1 ring-brand-primary/30'
                        : 'border-border-default hover:border-border-strong'
                    }
                  `}
                >
                  <div className="aspect-video bg-bg-elevated flex items-center justify-center">
                    {asset.thumbnailPath || asset.localPath ? (
                      <img
                        src={toFileUrl(asset.thumbnailPath || asset.localPath)}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-text-disabled">
                        {asset.type === 'video' ? <Film size={24} /> : <ImageIcon size={24} />}
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-semibold text-text-primary truncate">
                      {asset.name}
                    </p>
                    <p className="text-[9px] text-text-muted">{asset.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail sidebar */}
        {selectedAsset && (
          <aside className="w-[240px] border-l border-border-subtle p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
                Detail
              </span>
              <button
                type="button"
                onClick={() => setSelectedAssetId(null)}
                className="p-0.5 rounded text-text-muted hover:text-text-primary"
              >
                <X size={12} />
              </button>
            </div>

            <div className="aspect-video rounded-lg bg-bg-elevated mb-3 overflow-hidden">
              {selectedAsset.localPath ? (
                <img
                  src={toFileUrl(selectedAsset.localPath)}
                  alt={selectedAsset.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-text-disabled">
                  <ImageIcon size={32} />
                </div>
              )}
            </div>

            <h4 className="text-[12px] font-bold text-text-primary">{selectedAsset.name}</h4>

            <div className="mt-3 flex flex-col gap-1.5 text-[10px]">
              {(
                [
                  ['Tipe', selectedAsset.type],
                  [
                    'Koleksi',
                    collections.find((c) => selectedAsset.collectionIds?.includes(c.id))?.name ||
                      '-'
                  ],
                  ['ID', selectedAsset.id]
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-text-primary font-semibold truncate max-w-[130px]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
