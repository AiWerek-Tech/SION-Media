/**
 * Background Settings Section
 * Handles background media, colors, logos, and the Atmosphere Media Library
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckSquare,
  Film,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Layers3,
  Save,
  Search,
  Square,
  Star,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import { DEFAULT_GLOBAL_ATMOSPHERE, DEFAULT_SCENE_PRESETS } from '../../atmosphere/presets'
import type {
  AtmosphereConfig,
  MediaAssetRecord,
  MediaCollectionRecord
} from '../../atmosphere/types'

interface BackgroundSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

const ALL_COLLECTIONS = '__all__'
const UNASSIGNED_COLLECTIONS = '__unassigned__'

function toFileUrl(path?: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `file://${path.replace(/\\/g, '/')}`
}

function parseAtmosphereConfig(raw?: string): AtmosphereConfig | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AtmosphereConfig
  } catch {
    return null
  }
}

function buildCurrentAtmosphere(settings: Record<string, string>): AtmosphereConfig {
  return (
    parseAtmosphereConfig(settings.projection_default_atmosphere) || {
      ...DEFAULT_GLOBAL_ATMOSPHERE,
      solidColor: settings.projection_bg_color || DEFAULT_GLOBAL_ATMOSPHERE.solidColor,
      media: settings.projection_bg_image
        ? {
            path: settings.projection_bg_image,
            fit: 'cover',
            loop: true,
            muted: true
          }
        : undefined
    }
  )
}

function removeMediaFromAtmosphere(config: AtmosphereConfig): AtmosphereConfig {
  const nextConfig: AtmosphereConfig = {
    ...config,
    media: undefined
  }

  if (nextConfig.mode === 'image' || nextConfig.mode === 'video') {
    if (nextConfig.gradient?.stops?.length) {
      nextConfig.mode = 'gradient'
    } else if (nextConfig.motion) {
      nextConfig.mode = 'motion'
    } else {
      nextConfig.mode = 'solid'
      nextConfig.solidColor = nextConfig.solidColor || DEFAULT_GLOBAL_ATMOSPHERE.solidColor
    }
  }

  return nextConfig
}

function buildAssetAtmosphere(asset: MediaAssetRecord, base: AtmosphereConfig): AtmosphereConfig {
  return {
    ...base,
    id: base.id || 'global-default',
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

export function BackgroundSettings({
  settings,
  updateSetting
}: BackgroundSettingsProps): React.JSX.Element {
  const bgInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  const [assets, setAssets] = useState<MediaAssetRecord[]>([])
  const [collections, setCollections] = useState<MediaCollectionRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video' | 'favorites'>('all')
  const [collectionFilterId, setCollectionFilterId] = useState<string>(ALL_COLLECTIONS)
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set())
  const [assetNameDraft, setAssetNameDraft] = useState('')
  const [assetCategoryDraft, setAssetCategoryDraft] = useState('')
  const [assetTagsDraft, setAssetTagsDraft] = useState('')
  const [collectionNameDraft, setCollectionNameDraft] = useState('')
  const [collectionDescriptionDraft, setCollectionDescriptionDraft] = useState('')
  const [bulkCategoryDraft, setBulkCategoryDraft] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [draggingCollectionAssetId, setDraggingCollectionAssetId] = useState<string | null>(null)
  const [dragOverCollectionAssetId, setDragOverCollectionAssetId] = useState<string | null>(null)

  const activeAssetId = useMemo(() => {
    const config = parseAtmosphereConfig(settings.projection_default_atmosphere)
    return config?.media?.assetId || ''
  }, [settings.projection_default_atmosphere])

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  )

  const selectedCollection = useMemo(
    () =>
      collections.find((collection) => collection.id === collectionFilterId) ||
      collections.find((collection) => collection.id === selectedAsset?.collectionIds?.[0]) ||
      null,
    [collectionFilterId, collections, selectedAsset]
  )

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (typeFilter === 'favorites' && !asset.isFavorite) return false
      if (typeFilter !== 'all' && typeFilter !== 'favorites' && asset.type !== typeFilter)
        return false

      if (collectionFilterId === UNASSIGNED_COLLECTIONS && (asset.collectionIds || []).length > 0) {
        return false
      }
      if (
        collectionFilterId !== ALL_COLLECTIONS &&
        collectionFilterId !== UNASSIGNED_COLLECTIONS &&
        !(asset.collectionIds || []).includes(collectionFilterId)
      ) {
        return false
      }

      if (!searchQuery.trim()) return true
      const haystack = `${asset.name} ${asset.category || ''} ${(asset.tags || []).join(' ')}`
      return haystack.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [assets, searchQuery, typeFilter, collectionFilterId])

  useEffect(() => {
    const loadLibrary = async (): Promise<void> => {
      const [assetData, collectionData] = await Promise.all([
        window.api.media.getAll(),
        window.api.media.getCollections()
      ])
      const nextAssets = assetData as MediaAssetRecord[]
      setAssets(nextAssets)
      setCollections(collectionData as MediaCollectionRecord[])
      if (nextAssets.length === 0) {
        setSelectedAssetId('')
        return
      }
      setSelectedAssetId((currentId) =>
        nextAssets.some((asset) => asset.id === currentId) ? currentId : nextAssets[0]?.id || ''
      )
    }

    void loadLibrary()
  }, [])

  useEffect(() => {
    if (!selectedAsset) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssetNameDraft(selectedAsset.name)

    setAssetCategoryDraft(selectedAsset.category || '')

    setAssetTagsDraft((selectedAsset.tags || []).join(', '))
  }, [selectedAsset])

  const reloadLibrary = async (preferredId?: string): Promise<void> => {
    const [assetData, collectionData] = await Promise.all([
      window.api.media.getAll(),
      window.api.media.getCollections()
    ])
    const nextAssets = assetData as MediaAssetRecord[]
    const nextCollections = collectionData as MediaCollectionRecord[]
    setAssets(nextAssets)
    setCollections(nextCollections)
    setSelectedAssetIds((current) => {
      const validIds = new Set(nextAssets.map((asset) => asset.id))
      return new Set(Array.from(current).filter((id) => validIds.has(id)))
    })
    if (
      collectionFilterId !== ALL_COLLECTIONS &&
      collectionFilterId !== UNASSIGNED_COLLECTIONS &&
      !nextCollections.some((collection) => collection.id === collectionFilterId)
    ) {
      setCollectionFilterId(ALL_COLLECTIONS)
    }
    const nextSelected =
      (preferredId && nextAssets.find((item) => item.id === preferredId)?.id) ||
      nextAssets.find((item) => item.id === selectedAssetId)?.id ||
      nextAssets[0]?.id ||
      ''
    setSelectedAssetId(nextSelected)
  }

  const handleApplyAtmospherePreset = async (presetId: string): Promise<void> => {
    const preset = DEFAULT_SCENE_PRESETS.find((item) => item.id === presetId)
    if (!preset) return

    await updateSetting('projection_default_atmosphere', JSON.stringify(preset.config))
    await updateSetting('projection_bg_image', '')
    await updateSetting(
      'projection_bg_color',
      preset.config.solidColor || preset.config.gradient?.stops?.[0]?.color || '#090b14'
    )
    if (preset.config.overlay) {
      await updateSetting('projection_bg_opacity', preset.config.overlay.dim.toString())
    }
  }

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file && 'path' in file) {
      const filePath = (file as File & { path: string }).path
      void updateSetting(key, filePath)
    }
  }

  const handleLibraryImport = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const filePaths = Array.from(event.target.files || [])
      .map((file) => ('path' in file ? (file as File & { path: string }).path : ''))
      .filter(Boolean)

    if (filePaths.length === 0) return

    setIsBusy(true)
    try {
      const imported = (await window.api.media.importAssets({ filePaths })) as MediaAssetRecord[]
      await reloadLibrary(imported[0]?.id)
    } finally {
      setIsBusy(false)
      event.target.value = ''
    }
  }

  const handleSaveAssetMeta = async (): Promise<void> => {
    if (!selectedAsset) return
    setIsBusy(true)
    try {
      await window.api.media.update(selectedAsset.id, {
        name: assetNameDraft,
        category: assetCategoryDraft,
        tags: assetTagsDraft
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
      await reloadLibrary(selectedAsset.id)
    } finally {
      setIsBusy(false)
    }
  }

  const handleToggleFavorite = async (asset: MediaAssetRecord): Promise<void> => {
    await window.api.media.update(asset.id, { isFavorite: !asset.isFavorite })
    await reloadLibrary(asset.id)
  }

  const handleDeleteAsset = async (asset: MediaAssetRecord): Promise<void> => {
    const confirmed = window.confirm(`Hapus asset "${asset.name}" dari Media Library?`)
    if (!confirmed) return

    if (asset.id === activeAssetId) {
      const currentConfig = buildCurrentAtmosphere(settings)
      const nextConfig = removeMediaFromAtmosphere(currentConfig)
      await updateSetting('projection_default_atmosphere', JSON.stringify(nextConfig))
      await updateSetting('projection_bg_image', '')
    }

    await window.api.media.delete(asset.id)
    await reloadLibrary()
  }

  const handleApplyAsset = async (asset: MediaAssetRecord): Promise<void> => {
    const currentConfig = buildCurrentAtmosphere(settings)
    const nextConfig = buildAssetAtmosphere(asset, currentConfig)
    await updateSetting('projection_default_atmosphere', JSON.stringify(nextConfig))
    await updateSetting('projection_bg_image', asset.localPath)
    await window.api.media.incrementUsage(asset.id)
    await reloadLibrary(asset.id)
  }

  const toggleAssetSelection = (assetId: string): void => {
    setSelectedAssetIds((current) => {
      const next = new Set(current)
      if (next.has(assetId)) next.delete(assetId)
      else next.add(assetId)
      return next
    })
  }

  const handleBulkFavorite = async (isFavorite: boolean): Promise<void> => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) return
    setIsBusy(true)
    try {
      await window.api.media.bulkUpdate({
        ids,
        isFavorite
      })
      await reloadLibrary(selectedAssetId)
    } finally {
      setIsBusy(false)
    }
  }

  const handleBulkCategoryUpdate = async (): Promise<void> => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0 || !bulkCategoryDraft.trim()) return
    setIsBusy(true)
    try {
      await window.api.media.bulkUpdate({
        ids,
        category: bulkCategoryDraft.trim()
      })
      await reloadLibrary(selectedAssetId)
      setBulkCategoryDraft('')
    } finally {
      setIsBusy(false)
    }
  }

  const handleBulkDelete = async (): Promise<void> => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) return
    const confirmed = window.confirm(`Hapus ${ids.length} asset terpilih dari Media Library?`)
    if (!confirmed) return
    setIsBusy(true)
    try {
      await window.api.media.bulkDelete(ids)
      setSelectedAssetIds(new Set())
      await reloadLibrary()
    } finally {
      setIsBusy(false)
    }
  }

  const handleCreateCollection = async (): Promise<void> => {
    if (!collectionNameDraft.trim()) return
    setIsBusy(true)
    try {
      const collection = (await window.api.media.addCollection({
        name: collectionNameDraft.trim(),
        description: collectionDescriptionDraft.trim(),
        assetIds: Array.from(selectedAssetIds)
      })) as MediaCollectionRecord | null
      await reloadLibrary(selectedAssetId)
      setCollectionNameDraft('')
      setCollectionDescriptionDraft('')
      if (collection?.id) setCollectionFilterId(collection.id)
    } finally {
      setIsBusy(false)
    }
  }

  const handleDeleteCollection = async (collection: MediaCollectionRecord): Promise<void> => {
    const confirmed = window.confirm(`Hapus koleksi "${collection.name}"?`)
    if (!confirmed) return
    setIsBusy(true)
    try {
      await window.api.media.deleteCollection(collection.id)
      if (collectionFilterId === collection.id) setCollectionFilterId(ALL_COLLECTIONS)
      await reloadLibrary(selectedAssetId)
    } finally {
      setIsBusy(false)
    }
  }

  const handleAddSelectionToCollection = async (collectionId: string): Promise<void> => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) return
    setIsBusy(true)
    try {
      await window.api.media.addAssetsToCollection(collectionId, ids)
      await reloadLibrary(selectedAssetId)
    } finally {
      setIsBusy(false)
    }
  }

  const handleRemoveSelectionFromCollection = async (collectionId: string): Promise<void> => {
    const ids = Array.from(selectedAssetIds)
    if (ids.length === 0) return
    setIsBusy(true)
    try {
      await window.api.media.removeAssetsFromCollection(collectionId, ids)
      await reloadLibrary(selectedAssetId)
    } finally {
      setIsBusy(false)
    }
  }

  const handleSetCollectionCover = async (
    collection: MediaCollectionRecord,
    asset: MediaAssetRecord
  ): Promise<void> => {
    setIsBusy(true)
    try {
      await window.api.media.updateCollection(collection.id, { coverAssetId: asset.id })
      await reloadLibrary(asset.id)
    } finally {
      setIsBusy(false)
    }
  }

  const handleReorderCollectionItems = async (
    collectionId: string,
    nextAssetIds: string[]
  ): Promise<void> => {
    if (!collectionId) return
    if (nextAssetIds.length === 0) return
    setCollections((current) =>
      current.map((collection) =>
        collection.id === collectionId
          ? { ...collection, assetIds: nextAssetIds, assetCount: nextAssetIds.length }
          : collection
      )
    )
    setIsBusy(true)
    try {
      await window.api.media.reorderCollectionItems(collectionId, nextAssetIds)
      await reloadLibrary(selectedAssetId)
    } finally {
      setIsBusy(false)
    }
  }

  const reorderAssetIds = useCallback(
    (assetIds: string[], draggedId: string, targetId: string): string[] => {
      if (draggedId === targetId) return assetIds
      const fromIndex = assetIds.indexOf(draggedId)
      const toIndex = assetIds.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return assetIds
      const next = assetIds.slice()
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedId)
      return next
    },
    []
  )

  return (
    <div className="sp-root">
      {/* ── Page Header ── */}
      <div className="sp-page-header">
        <div>
          <h2 className="sp-page-title">Background &amp; Atmosphere</h2>
          <p className="sp-page-subtitle">
            Kelola media library, atmosphere presets, koleksi asset, dan binding background
            proyektor.
          </p>
        </div>
        <div className="sp-page-header__actions">
          <button
            onClick={() => libraryInputRef.current?.click()}
            disabled={isBusy}
            className="sp-btn sp-btn--primary"
          >
            <Upload size={14} />
            Import Asset
          </button>
          <input
            ref={libraryInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/mp4,video/webm"
            onChange={(e) => void handleLibraryImport(e)}
          />
        </div>
      </div>

      {/* ── Stats ── */}
      <section className="sp-section">
        <div className="sp-metric-grid sp-metric-grid--4">
          <div className="sp-metric-card sp-metric-card--blue">
            <div className="sp-metric-card__icon">
              <ImageIcon size={16} />
            </div>
            <div className="sp-metric-card__value">
              {assets.filter((a) => a.type === 'image').length}
            </div>
            <div className="sp-metric-card__label">Images</div>
          </div>
          <div className="sp-metric-card sp-metric-card--violet">
            <div className="sp-metric-card__icon">
              <Film size={16} />
            </div>
            <div className="sp-metric-card__value">
              {assets.filter((a) => a.type === 'video').length}
            </div>
            <div className="sp-metric-card__label">Videos</div>
          </div>
          <div className="sp-metric-card sp-metric-card--emerald">
            <div className="sp-metric-card__icon">
              <Layers3 size={16} />
            </div>
            <div className="sp-metric-card__value">{collections.length}</div>
            <div className="sp-metric-card__label">Koleksi</div>
          </div>
          <div className="sp-metric-card sp-metric-card--rose">
            <div className="sp-metric-card__icon">
              <Star size={16} />
            </div>
            <div className="sp-metric-card__value">{assets.filter((a) => a.isFavorite).length}</div>
            <div className="sp-metric-card__label">Favorit</div>
          </div>
        </div>
      </section>

      {/* ── Global Settings ── */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <ImageIcon size={13} />
            Pengaturan Global
          </div>
          <p className="sp-section-desc">
            Atmosphere preset, warna dasar, overlay, dan logo jemaat.
          </p>
        </div>
        <div className="sp-bg-global-grid">
          {/* Left col */}
          <div className="sp-bg-global-col">
            <div className="sp-field">
              <label className="sp-field__label">Atmosphere Presets</label>
              <div className="sp-bg-preset-grid">
                {DEFAULT_SCENE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => void handleApplyAtmospherePreset(preset.id)}
                    className="sp-bg-preset-btn"
                    title={preset.description}
                  >
                    <strong>{preset.name}</strong>
                    <span>{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="sp-field">
              <label className="sp-field__label">Warna Dasar</label>
              <div className="sp-color-picker-row">
                <div
                  className="sp-color-swatch"
                  style={{ background: settings.projection_bg_color || '#0a0c12' }}
                >
                  <input
                    type="color"
                    value={settings.projection_bg_color || '#0a0c12'}
                    onChange={(e) => void updateSetting('projection_bg_color', e.target.value)}
                    className="sp-color-input"
                  />
                </div>
                <div className="sp-color-info">
                  <span className="sp-color-hex">
                    {(settings.projection_bg_color || '#0a0c12').toUpperCase()}
                  </span>
                  <span className="sp-color-hint">Warna dasar output proyektor</span>
                </div>
              </div>
            </div>
            <div className="sp-field">
              <label className="sp-field__label">Media Manual (Fallback)</label>
              <div className="sp-bg-file-row">
                <input
                  type="text"
                  value={settings.projection_bg_image || ''}
                  onChange={(e) => void updateSetting('projection_bg_image', e.target.value)}
                  placeholder="C:\Path\ke\media..."
                  className="sp-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => bgInputRef.current?.click()}
                  className="sp-icon-btn"
                  title="Pilih File"
                >
                  <FolderOpen size={16} />
                </button>
                <input
                  ref={bgInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => handleFileSelect('projection_bg_image', e)}
                />
              </div>
              <p className="sp-field-hint">
                Digunakan sebagai fallback kompatibilitas untuk workflow lama.
              </p>
            </div>
          </div>
          {/* Right col */}
          <div className="sp-bg-global-col">
            <div className="sp-field">
              <label className="sp-field__label sp-field__label--between">
                <span>Gelapkan Latar (Overlay)</span>
                <span className="sp-field__value-badge">
                  {Math.round(parseFloat(settings.projection_bg_opacity || '0.7') * 100)}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.projection_bg_opacity || '0.7'}
                onChange={(e) => void updateSetting('projection_bg_opacity', e.target.value)}
                className="sp-range"
              />
              <div className="sp-range-labels">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="sp-bg-logo-panel">
              <div className="sp-section-eyebrow" style={{ marginBottom: 10 }}>
                <ImageIcon size={12} />
                Logo Jemaat (Standby)
              </div>
              <div className="sp-bg-file-row">
                <input
                  type="text"
                  value={settings.projection_logo || ''}
                  onChange={(e) => void updateSetting('projection_logo', e.target.value)}
                  placeholder="Path ke logo..."
                  className="sp-input"
                  style={{ flex: 1 }}
                />
                <button onClick={() => logoInputRef.current?.click()} className="sp-icon-btn">
                  <FolderOpen size={15} />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileSelect('projection_logo', e)}
                />
              </div>
              <div className="sp-field" style={{ marginTop: 10 }}>
                <label className="sp-field__label">Posisi Logo</label>
                <div className="sp-select-wrap">
                  <select
                    value={settings.projection_logo_position || 'bottom-right'}
                    onChange={(e) => void updateSetting('projection_logo_position', e.target.value)}
                    className="sp-select"
                  >
                    <option value="center">Tengah</option>
                    <option value="bottom-right">Kanan Bawah</option>
                    <option value="top-left">Kiri Atas</option>
                    <option value="top-right">Kanan Atas</option>
                    <option value="bottom-left">Kiri Bawah</option>
                  </select>
                  <svg
                    className="sp-select-chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Media Library ── */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Layers3 size={13} />
            Atmosphere Media Library
          </div>
          <p className="sp-section-desc">
            CRUD asset, thumbnail persistence, preset collections, song-ready background binding,
            dan bulk actions operator.
          </p>
        </div>

        {/* Collection filter chips + create */}
        <div className="sp-bg-collection-bar">
          <div className="sp-bg-collection-chips">
            <button
              onClick={() => setCollectionFilterId(ALL_COLLECTIONS)}
              className={`sp-chip ${collectionFilterId === ALL_COLLECTIONS ? 'is-active' : ''}`}
            >
              Semua ({assets.length})
            </button>
            <button
              onClick={() => setCollectionFilterId(UNASSIGNED_COLLECTIONS)}
              className={`sp-chip ${collectionFilterId === UNASSIGNED_COLLECTIONS ? 'is-active' : ''}`}
            >
              Unassigned ({assets.filter((a) => (a.collectionIds || []).length === 0).length})
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => setCollectionFilterId(col.id)}
                className={`sp-chip ${collectionFilterId === col.id ? 'is-active' : ''}`}
              >
                <Layers3 size={11} />
                {col.name} ({col.assetCount})
              </button>
            ))}
          </div>
          <div className="sp-bg-collection-create">
            <input
              value={collectionNameDraft}
              onChange={(e) => setCollectionNameDraft(e.target.value)}
              placeholder="Nama koleksi baru"
              className="sp-input"
              style={{ width: 180 }}
            />
            <input
              value={collectionDescriptionDraft}
              onChange={(e) => setCollectionDescriptionDraft(e.target.value)}
              placeholder="Deskripsi"
              className="sp-input"
              style={{ width: 160 }}
            />
            <button
              onClick={() => void handleCreateCollection()}
              disabled={isBusy || !collectionNameDraft.trim()}
              className="sp-btn sp-btn--ghost"
            >
              <FolderPlus size={14} />
              Buat{selectedAssetIds.size > 0 ? ` (${selectedAssetIds.size})` : ''}
            </button>
            {selectedCollection && (
              <>
                <button
                  onClick={() => void handleAddSelectionToCollection(selectedCollection.id)}
                  disabled={isBusy || selectedAssetIds.size === 0}
                  className="sp-btn sp-btn--ghost"
                >
                  + Koleksi Aktif
                </button>
                <button
                  onClick={() => void handleRemoveSelectionFromCollection(selectedCollection.id)}
                  disabled={isBusy || selectedAssetIds.size === 0}
                  className="sp-btn sp-btn--ghost"
                >
                  Lepas
                </button>
                <button
                  onClick={() => void handleDeleteCollection(selectedCollection)}
                  disabled={isBusy}
                  className="sp-btn sp-btn--danger"
                >
                  Hapus Koleksi
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedAssetIds.size > 0 && (
          <div className="sp-bg-bulk-bar">
            <span className="sp-bg-bulk-bar__count">{selectedAssetIds.size} asset dipilih</span>
            <button
              onClick={() => void handleBulkFavorite(true)}
              disabled={isBusy}
              className="sp-btn sp-btn--ghost"
            >
              <Star size={13} />
              Favoritkan
            </button>
            <button
              onClick={() => void handleBulkFavorite(false)}
              disabled={isBusy}
              className="sp-btn sp-btn--ghost"
            >
              Lepas Favorit
            </button>
            <input
              value={bulkCategoryDraft}
              onChange={(e) => setBulkCategoryDraft(e.target.value)}
              placeholder="Set kategori bulk"
              className="sp-input"
              style={{ width: 180 }}
            />
            <button
              onClick={() => void handleBulkCategoryUpdate()}
              disabled={isBusy || !bulkCategoryDraft.trim()}
              className="sp-btn sp-btn--ghost"
            >
              Apply Kategori
            </button>
            <button
              onClick={() => void handleBulkDelete()}
              disabled={isBusy}
              className="sp-btn sp-btn--danger"
            >
              <Trash2 size={13} />
              Hapus
            </button>
            <button onClick={() => setSelectedAssetIds(new Set())} className="sp-btn sp-btn--ghost">
              <X size={13} />
              Clear
            </button>
          </div>
        )}

        {/* Asset grid + inspector */}
        <div className="sp-bg-workspace">
          {/* Left: search + grid */}
          <div className="sp-bg-browser">
            {/* Search + type filter */}
            <div className="sp-bg-browser__toolbar">
              <div className="sp-search-bar" style={{ flex: 1 }}>
                <Search size={14} className="sp-search-bar__icon" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari asset, kategori, atau tag..."
                  className="sp-search-bar__input"
                />
              </div>
              {(['all', 'image', 'video', 'favorites'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setTypeFilter(v)}
                  className={`sp-chip ${typeFilter === v ? 'is-active' : ''}`}
                >
                  {v === 'all'
                    ? 'Semua'
                    : v === 'image'
                      ? 'Images'
                      : v === 'video'
                        ? 'Videos'
                        : 'Favorit'}
                </button>
              ))}
            </div>

            {/* Asset grid */}
            <div className="sp-bg-asset-grid">
              {filteredAssets.length === 0 && (
                <div className="sp-empty-state" style={{ gridColumn: '1/-1' }}>
                  <ImageIcon size={28} />
                  <strong>Belum ada asset</strong>
                  <p>Import image/video atau ubah filter koleksi untuk lanjut.</p>
                </div>
              )}
              {filteredAssets.map((asset) => {
                const isActive = asset.id === selectedAssetId
                const isApplied = asset.id === activeAssetId
                const isSelected = selectedAssetIds.has(asset.id)
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`sp-asset-card ${isActive ? 'is-active' : ''}`}
                  >
                    <div className="sp-asset-card__thumb">
                      {asset.thumbnailPath ? (
                        <img
                          src={toFileUrl(asset.thumbnailPath)}
                          alt={asset.name}
                          className="sp-asset-card__img"
                        />
                      ) : (
                        <div className="sp-asset-card__placeholder">
                          {asset.type === 'video' ? <Film size={22} /> : <ImageIcon size={22} />}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleAssetSelection(asset.id)
                        }}
                        className="sp-asset-card__select"
                      >
                        {isSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      </button>
                      <div className="sp-asset-card__type-badge">
                        {asset.type === 'video' ? <Film size={9} /> : <ImageIcon size={9} />}
                        {asset.type}
                      </div>
                      {isApplied && <div className="sp-asset-card__active-badge">Active</div>}
                    </div>
                    <div className="sp-asset-card__body">
                      <div className="sp-asset-card__name-row">
                        <strong className="sp-asset-card__name">{asset.name}</strong>
                        {asset.isFavorite && (
                          <Star size={12} className="sp-asset-card__star" fill="currentColor" />
                        )}
                      </div>
                      <span className="sp-asset-card__cat">
                        {asset.category || 'Uncategorized'}
                      </span>
                      <div className="sp-asset-card__tags">
                        {(asset.tags || []).slice(0, 2).map((tag) => (
                          <span key={`${asset.id}-${tag}`} className="sp-asset-card__tag">
                            {tag}
                          </span>
                        ))}
                        {(asset.collectionIds || []).slice(0, 1).map((cid) => {
                          const col = collections.find((c) => c.id === cid)
                          return col ? (
                            <span
                              key={`${asset.id}-${cid}`}
                              className="sp-asset-card__tag sp-asset-card__tag--blue"
                            >
                              {col.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: inspector */}
          <div className="sp-bg-inspector">
            {!selectedAsset ? (
              <div className="sp-empty-state" style={{ height: '100%' }}>
                <ImageIcon size={28} />
                <strong>Pilih asset</strong>
                <p>Preview, metadata, dan aksi akan tampil di sini.</p>
              </div>
            ) : (
              <>
                <div className="sp-bg-inspector__preview">
                  {selectedAsset.type === 'video' ? (
                    <video
                      src={toFileUrl(selectedAsset.localPath)}
                      className="sp-bg-inspector__media"
                      muted
                      autoPlay
                      loop
                    />
                  ) : (
                    <img
                      src={toFileUrl(selectedAsset.localPath)}
                      alt={selectedAsset.name}
                      className="sp-bg-inspector__media"
                    />
                  )}
                </div>
                <div className="sp-bg-inspector__stats">
                  <div className="sp-info-item">
                    <div className="sp-info-item__label">Type</div>
                    <div className="sp-info-item__value">{selectedAsset.type}</div>
                  </div>
                  <div className="sp-info-item">
                    <div className="sp-info-item__label">Usage</div>
                    <div className="sp-info-item__value">{selectedAsset.usageCount || 0}</div>
                  </div>
                </div>
                <div className="sp-field">
                  <label className="sp-field__label">Nama Asset</label>
                  <input
                    value={assetNameDraft}
                    onChange={(e) => setAssetNameDraft(e.target.value)}
                    className="sp-input"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field__label">Kategori</label>
                  <input
                    value={assetCategoryDraft}
                    onChange={(e) => setAssetCategoryDraft(e.target.value)}
                    placeholder="Worship Packs / Seasonal / Prayer"
                    className="sp-input"
                  />
                </div>
                <div className="sp-field">
                  <label className="sp-field__label">Tags</label>
                  <input
                    value={assetTagsDraft}
                    onChange={(e) => setAssetTagsDraft(e.target.value)}
                    placeholder="worship, blue, christmas, ambient"
                    className="sp-input"
                  />
                </div>
                <button
                  onClick={() => void handleApplyAsset(selectedAsset)}
                  disabled={isBusy}
                  className="sp-btn sp-btn--primary"
                  style={{ width: '100%' }}
                >
                  {selectedAsset.type === 'video' ? <Film size={14} /> : <ImageIcon size={14} />}
                  Apply ke Global Atmosphere
                </button>
                <button
                  onClick={() => void handleSaveAssetMeta()}
                  disabled={isBusy}
                  className="sp-btn sp-btn--ghost"
                  style={{ width: '100%' }}
                >
                  <Save size={14} />
                  Simpan Metadata
                </button>
                <div className="sp-bg-inspector__secondary">
                  <button
                    onClick={() => void handleToggleFavorite(selectedAsset)}
                    className="sp-btn sp-btn--ghost"
                    style={{ flex: 1 }}
                  >
                    <Star size={13} fill={selectedAsset.isFavorite ? 'currentColor' : 'none'} />
                    {selectedAsset.isFavorite ? 'Favorit' : 'Tambah Favorit'}
                  </button>
                  <button
                    onClick={() => void handleDeleteAsset(selectedAsset)}
                    className="sp-btn sp-btn--danger"
                  >
                    <Trash2 size={13} />
                    Hapus
                  </button>
                </div>
                <div className="sp-bg-inspector__info-block">
                  <div className="sp-bg-inspector__info-title">Collections</div>
                  <div className="sp-bg-inspector__tags">
                    {(selectedAsset.collectionIds || []).length === 0 && (
                      <span className="sp-bg-inspector__empty-tag">Belum masuk koleksi</span>
                    )}
                    {(selectedAsset.collectionIds || []).map((cid) => {
                      const col = collections.find((c) => c.id === cid)
                      return col ? (
                        <span
                          key={`${selectedAsset.id}-${cid}`}
                          className="sp-asset-card__tag sp-asset-card__tag--blue"
                        >
                          {col.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
                <div className="sp-bg-inspector__info-block">
                  <div className="sp-bg-inspector__info-title">Storage Path</div>
                  <div className="sp-bg-inspector__path">{selectedAsset.localPath}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Collection Manager */}
        {selectedCollection && (
          <div className="sp-bg-collection-manager">
            <div className="sp-bg-collection-manager__header">
              <div>
                <div className="sp-bg-collection-manager__title">{selectedCollection.name}</div>
                <div className="sp-bg-collection-manager__desc">
                  {selectedCollection.description || 'Tanpa deskripsi'} ·{' '}
                  {selectedCollection.assetCount} assets
                </div>
              </div>
              <div className="sp-bg-collection-manager__actions">
                {selectedAsset && (
                  <>
                    <button
                      onClick={() => void handleAddSelectionToCollection(selectedCollection.id)}
                      disabled={isBusy || selectedAssetIds.size === 0}
                      className="sp-btn sp-btn--ghost"
                    >
                      + Tambah Selection
                    </button>
                    <button
                      onClick={() =>
                        void handleRemoveSelectionFromCollection(selectedCollection.id)
                      }
                      disabled={isBusy || selectedAssetIds.size === 0}
                      className="sp-btn sp-btn--ghost"
                    >
                      Lepas Selection
                    </button>
                    <button
                      onClick={() =>
                        void handleSetCollectionCover(selectedCollection, selectedAsset)
                      }
                      disabled={isBusy}
                      className="sp-btn sp-btn--ghost"
                    >
                      Set Cover
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="sp-section-eyebrow" style={{ marginBottom: 8 }}>
              <Layers3 size={12} />
              Asset Ordering (Drag &amp; Drop)
            </div>
            <div className="sp-bg-order-grid">
              {selectedCollection.assetIds.length === 0 && (
                <div className="sp-empty-state" style={{ gridColumn: '1/-1', padding: '24px' }}>
                  <Layers3 size={20} />
                  <strong>Koleksi kosong</strong>
                </div>
              )}
              {selectedCollection.assetIds.map((assetId) => {
                const asset = assets.find((a) => a.id === assetId)
                const isDragging = draggingCollectionAssetId === assetId
                const isDragOver = dragOverCollectionAssetId === assetId
                const thumbUrl = asset?.thumbnailPath ? toFileUrl(asset.thumbnailPath) : ''
                return (
                  <div
                    key={assetId}
                    draggable={!isBusy}
                    onDragStart={(e) => {
                      setDraggingCollectionAssetId(assetId)
                      e.dataTransfer.setData('text/plain', assetId)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => {
                      setDraggingCollectionAssetId(null)
                      setDragOverCollectionAssetId(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragOverCollectionAssetId !== assetId)
                        setDragOverCollectionAssetId(assetId)
                      e.dataTransfer.dropEffect = 'move'
                    }}
                    onDragLeave={() => {
                      if (dragOverCollectionAssetId === assetId) setDragOverCollectionAssetId(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedId = e.dataTransfer.getData('text/plain')
                      setDragOverCollectionAssetId(null)
                      if (!draggedId) return
                      const nextOrder = reorderAssetIds(
                        selectedCollection.assetIds,
                        draggedId,
                        assetId
                      )
                      if (nextOrder === selectedCollection.assetIds) return
                      void handleReorderCollectionItems(selectedCollection.id, nextOrder)
                    }}
                    className={`sp-bg-order-item ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-dragover' : ''}`}
                    title={asset ? `${asset.name} (${asset.type})` : assetId}
                  >
                    <div className="sp-bg-order-item__thumb">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={asset?.name || assetId}
                          className="sp-bg-order-item__img"
                          draggable={false}
                        />
                      ) : (
                        <Layers3 size={14} />
                      )}
                    </div>
                    <div className="sp-bg-order-item__info">
                      <div className="sp-bg-order-item__name">{asset?.name || 'Unknown'}</div>
                      <div className="sp-bg-order-item__meta">
                        {asset?.category || asset?.type || assetId}
                      </div>
                    </div>
                    <div className="sp-bg-order-item__index">
                      {selectedCollection.assetIds.indexOf(assetId) + 1}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
