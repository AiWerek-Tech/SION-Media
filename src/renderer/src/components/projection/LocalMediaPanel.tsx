import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  FileImage,
  FileVideo,
  FolderOpen,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  FileStack,
  Loader2,
  Minimize2,
  Maximize2,
  Play,
  Plus,
  Trash2,
  X
} from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { Button, SearchInput, SegmentedControl, Select } from '@renderer/components/design-system'
import type { SlideData } from '@renderer/types'
import {
  getPdfPageCount,
  getPdfDocument,
  getCachedPdfPageImage,
  setCachedPdfPageImage
} from '@renderer/utils/pdfUtils'
import { toLocalMediaUrl } from '@renderer/utils/localMediaUrl'
import {
  getMediaKindCapability,
  getMediaKindLabel,
  getProjectionMediaMode,
  isPagedMediaKind,
  resolveMediaKind,
  type LocalMediaKind
} from '../../../../shared/media-kind'

interface LocalMediaAsset {
  id: string
  type: 'image' | 'video' | 'pdf'
  name: string
  originalPath: string
  localPath: string
  thumbnailPath?: string
  category?: string
  createdAt?: string
  metadata?: {
    presentationPackage?: {
      version: number
      manifestPath: string
      sourceSha256: string
      slideCount: number
      conversionProvider?: 'powerpoint' | 'wps' | 'libreoffice'
      outputMode?: 'pdf' | 'images'
      warnings?: string[]
      slides: Array<{ index: number; title: string; notes: string; imagePath: string }>
    }
  }
}

type MediaTypeFilter = 'all' | 'image' | 'video' | 'pdf'

type PresentationImportStep =
  | 'parsing'
  | 'converting'
  | 'generating'
  | 'finishing'
  | 'done'
  | 'failed'

interface PresentationImportStatus {
  fileName: string
  percent: number
  step: PresentationImportStep
  isMinimized: boolean
  fileIndex: number
  fileTotal: number
  startedAt: number
  error?: string
}

const PRESENTATION_IMPORT_COPY: Record<
  Exclude<PresentationImportStep, 'done' | 'failed'>,
  { title: string; detail: string }
> = {
  parsing: {
    title: 'Menganalisis struktur PPTX',
    detail: 'Membaca jumlah slide, judul, dan catatan pemateri.'
  },
  converting: {
    title: 'Menyiapkan mesin konversi',
    detail: 'SION memilih PowerPoint, WPS, atau LibreOffice yang tersedia.'
  },
  generating: {
    title: 'Mengekspor slide',
    detail: 'Membuat PDF dan gambar slide agar tampil cepat di Preview, Program, dan SION Link.'
  },
  finishing: {
    title: 'Menyimpan ke Media Lokal',
    detail: 'Mendaftarkan presentasi ke pustaka media dan menyiapkan thumbnail.'
  }
}

interface PdfThumbnailProps {
  pdfPath: string
  alt: string
}

function PdfThumbnail({ pdfPath, alt }: PdfThumbnailProps): React.JSX.Element {
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => {
    return getCachedPdfPageImage(pdfPath, 1, 0.2) || null
  })
  const [error, setError] = useState(false)

  useEffect(() => {
    if (thumbUrl) return

    let active = true
    const generateThumbnail = async (): Promise<void> => {
      try {
        const pdf = await getPdfDocument(pdfPath)
        if (!active) return

        const page = await pdf.getPage(1)
        if (!active) return

        // Render at 0.2x scale for thumbnail preview size
        const viewport = page.getViewport({ scale: 0.2 })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (!context) return

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        if (active) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
          setCachedPdfPageImage(pdfPath, 1, 0.2, dataUrl)
          setThumbUrl(dataUrl)
        }
      } catch (err) {
        console.error('Failed to generate PDF thumbnail:', pdfPath, err)
        if (active) {
          setError(true)
        }
      }
    }

    generateThumbnail()
    return () => {
      active = false
    }
  }, [pdfPath, thumbUrl])

  if (thumbUrl && !error) {
    return <img src={thumbUrl} alt={alt} className="w-full h-full object-cover" loading="lazy" />
  }

  // Fallback generic PDF icon if generating or error
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-gradient-to-br from-red-500/10 to-red-600/5 w-full h-full justify-center">
      <svg
        className="text-red-500 opacity-80"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
      <span className="text-[9px] text-red-400 uppercase font-extrabold tracking-wider">PDF</span>
    </div>
  )
}

function MediaFallback({ type }: { type: 'image' | 'video' }): React.JSX.Element {
  const Icon = type === 'video' ? FileVideo : FileImage
  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
      <Icon
        size={20}
        className={
          type === 'video' ? 'text-emerald-400 opacity-60' : 'text-brand-primary opacity-60'
        }
      />
      <span className="text-[9px] text-text-disabled uppercase font-bold">
        {type === 'video' ? 'Video' : 'Gambar'}
      </span>
    </div>
  )
}

export function LocalMediaPanel(): React.JSX.Element {
  const [assets, setAssets] = useState<LocalMediaAsset[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<MediaTypeFilter>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [pptNoticeCount, setPptNoticeCount] = useState(0)
  const [previewErrors, setPreviewErrors] = useState<Record<string, true>>({})
  const [presentationOutputMode, setPresentationOutputMode] = useState<'auto' | 'pdf' | 'images'>(
    'auto'
  )
  const [importStatus, setImportStatus] = useState<PresentationImportStatus | null>(null)
  const [importNow, setImportNow] = useState(() => Date.now())

  const activeImportResolver = React.useRef<(() => void) | null>(null)

  const { showToast } = useAppStore()
  const { setSlides } = useProjectionStore()
  const addMediaToPlaylist = usePlaylistStore((state) => state.addMediaToPlaylist)
  const importStartedAt = importStatus?.startedAt
  const importStep = importStatus?.step

  const handleCloseImportError = (): void => {
    setImportStatus(null)
    activeImportResolver.current?.()
  }

  useEffect(() => {
    if (!importStartedAt || importStep === 'failed') return
    const timer = window.setInterval(() => setImportNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [importStartedAt, importStep])

  useEffect(() => {
    if (!window.api.media.onPresentationImportProgress) return

    const unsubscribe = window.api.media.onPresentationImportProgress((progress) => {
      const fileName = progress.filePath.split(/[\\/]/).pop() ?? ''
      if (progress.step === 'failed') {
        setImportStatus((prev) => ({
          fileName,
          percent: 100,
          step: 'failed',
          isMinimized: false,
          fileIndex: prev?.fileIndex ?? 1,
          fileTotal: prev?.fileTotal ?? 1,
          startedAt: prev?.startedAt ?? Date.now(),
          error: progress.errorMessage || 'Gagal mengimpor file'
        }))
      } else if (progress.step === 'done') {
        setImportStatus(null)
        activeImportResolver.current?.()
      } else {
        setImportStatus((prev) => {
          if (!prev) return null
          return {
            ...prev,
            fileName,
            percent: progress.percent,
            step: progress.step,
            error: undefined
          }
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Fetch all local media assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true)
    try {
      // Query all media assets from the library
      const allAssets = await window.api.media.getAll()
      // Filter only those belonging to Local Media categories
      const localAssets = (allAssets as LocalMediaAsset[]).filter(
        (asset) =>
          asset.category === 'Local Media' ||
          (asset.category && asset.category.startsWith('Local - '))
      )
      setAssets(localAssets)
    } catch (err) {
      console.error('Failed to load local media assets:', err)
      showToast('Gagal memuat daftar media lokal', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    void Promise.resolve().then(fetchAssets)
  }, [fetchAssets])

  // Get unique categories list dynamically
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>()
    // Add default category
    cats.add('Local Media')
    assets.forEach((asset) => {
      if (asset.category && asset.category.startsWith('Local - ')) {
        cats.add(asset.category)
      }
    })
    customCategories.forEach((cat) => cats.add(cat))
    return Array.from(cats)
  }, [assets, customCategories])

  // Category Dropdown options
  const categoryOptions = useMemo(() => {
    const options = [
      { value: 'all', label: 'Semua Folder' },
      ...dynamicCategories.map((cat) => ({
        value: cat,
        label: cat === 'Local Media' ? 'Default' : cat.slice(8)
      })),
      { value: 'new_folder', label: '+ Buat Folder Baru...' }
    ]
    return options
  }, [dynamicCategories])

  // Handle changing category
  const handleCategoryChange = (val: string): void => {
    if (val === 'new_folder') {
      setIsCreatingFolder(true)
    } else {
      setSelectedCategory(val)
    }
  }

  const handleCreateFolder = (): void => {
    const folderName = newFolderName.trim()
    if (!folderName) return
    const fullCat = `Local - ${folderName}`
    setCustomCategories((prev) => (prev.includes(fullCat) ? prev : [...prev, fullCat]))
    setSelectedCategory(fullCat)
    setNewFolderName('')
    setIsCreatingFolder(false)
    showToast(`Folder "${folderName}" berhasil dibuat.`, 'success')
  }
  // Handle adding local files
  const handleAddFiles = async (): Promise<void> => {
    try {
      const dialogResult = await window.api.file.showOpenDialog({
        title: 'Pilih File Media (Gambar, Video, atau PDF)',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Media & Dokumen',
            extensions: [
              'jpg',
              'jpeg',
              'png',
              'gif',
              'webp',
              'mp4',
              'webm',
              'mov',
              'mkv',
              'pdf',
              'ppt',
              'pptx'
            ]
          }
        ]
      })

      if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
        return
      }

      const pptxFiles = dialogResult.filePaths.filter((p) => p.toLowerCase().endsWith('.pptx'))
      const legacyPptFiles = dialogResult.filePaths.filter((p) => p.toLowerCase().endsWith('.ppt'))
      const validFiles = dialogResult.filePaths.filter(
        (p) => !p.toLowerCase().endsWith('.ppt') && !p.toLowerCase().endsWith('.pptx')
      )

      setPptNoticeCount(legacyPptFiles.length)

      // Determine category to write into the database
      const categoryToWrite = selectedCategory === 'all' ? 'Local Media' : selectedCategory

      if (validFiles.length > 0) {
        setIsLoading(true)
        await window.api.media.addLocalExternalMedia({
          filePaths: validFiles,
          category: categoryToWrite
        })
        setIsLoading(false)
      }

      if (pptxFiles.length > 0) {
        const runPptxImports = async (): Promise<void> => {
          for (const [index, filePath] of pptxFiles.entries()) {
            const fileName = filePath.split(/[\\/]/).pop() ?? ''
            const startedAt = Date.now()
            setImportNow(startedAt)
            setImportStatus({
              fileName,
              percent: 0,
              step: 'parsing',
              isMinimized: false,
              fileIndex: index + 1,
              fileTotal: pptxFiles.length,
              startedAt
            })

            let resolveCompleted: () => void = () => {}
            const completedPromise = new Promise<void>((resolve) => {
              resolveCompleted = resolve
            })

            activeImportResolver.current = resolveCompleted

            try {
              const imported = (await window.api.media.importPresentation({
                filePath,
                category: categoryToWrite,
                outputMode: presentationOutputMode
              })) as LocalMediaAsset
              const packageInfo = imported.metadata?.presentationPackage
              if (packageInfo?.warnings?.length) {
                showToast(packageInfo.warnings.join(' '), 'info')
              }
              resolveCompleted()
            } catch (err) {
              console.error('Failed to import presentation:', filePath, err)
              showToast(`Gagal mengimpor "${fileName}"`, 'error')
            }

            await completedPromise
          }
          showToast(`${pptxFiles.length} presentasi berhasil diproses`, 'success')
          await fetchAssets()
        }
        void runPptxImports()
      } else {
        if (validFiles.length > 0) {
          showToast(`${validFiles.length} media berhasil dimasukkan`, 'success')
        }
        await fetchAssets()
      }
    } catch (err) {
      console.error('Failed to add local media files:', err)
      showToast('Gagal menambahkan file media', 'error')
    }
  }

  // Handle projecting (going live with) the media
  const handleProjectMedia = useCallback(
    async (asset: LocalMediaAsset) => {
      const mediaKind = resolveMediaKind({
        path: asset.localPath,
        hasPresentationPackage: Boolean(asset.metadata?.presentationPackage)
      })
      const projectionMode = getProjectionMediaMode(mediaKind)
      const isPagedMedia = isPagedMediaKind(mediaKind)
      let slides: SlideData[] = [
        {
          contentType: 'media',
          songId: null,
          playlistItemId: null,
          slideIndex: 0,
          text: '',
          sectionLabel: asset.name,
          visualImagePath: projectionMode === 'image' ? asset.localPath : undefined,
          mediaKind,
          mediaSourcePath: asset.localPath,
          mediaPageNumber: projectionMode === 'pdf' ? 1 : undefined
        }
      ]

      if (isPagedMedia) {
        try {
          const pageCount = await getPdfPageCount(asset.localPath)
          const presentationSlides = asset.metadata?.presentationPackage?.slides ?? []
          const useSlideImages = asset.metadata?.presentationPackage?.outputMode === 'images'
          slides = Array.from({ length: pageCount }).map((_, idx) => {
            const slideImagePath = useSlideImages ? presentationSlides[idx]?.imagePath : undefined
            return {
              contentType: 'media',
              songId: null,
              playlistItemId: null,
              slideIndex: idx,
              text: '',
              sectionLabel: presentationSlides[idx]?.title || `Halaman ${idx + 1}`,
              pdfPath: slideImagePath ? undefined : asset.localPath,
              visualImagePath: slideImagePath || undefined,
              speakerNotes: presentationSlides[idx]?.notes || undefined,
              mediaKind,
              mediaSourcePath: asset.localPath,
              mediaPageNumber: idx + 1
            }
          })
        } catch (err) {
          console.error('Failed to get PDF page count:', err)
          showToast('Gagal memproses file PDF', 'error')
          return
        }
      }

      const mediaConfig = JSON.stringify({
        mode: projectionMode,
        media: {
          path: asset.localPath
        },
        opacity: 100,
        blur: 0
      })

      setSlides(slides, {
        hymnalCode: isPagedMedia ? 'PDF' : 'MEDIA',
        hymnalName: asset.name,
        songBackgroundConfig: mediaConfig
      })

      showToast(`Media "${asset.name}" masuk ke Preview. Tekan TAKE untuk menayangkan.`, 'success')
    },
    [setSlides, showToast]
  )

  // Handle adding media to rundown
  const handleAddToPlaylist = useCallback(
    async (asset: LocalMediaAsset) => {
      try {
        await addMediaToPlaylist({
          title: asset.name,
          path: asset.localPath,
          ...(asset.metadata?.presentationPackage
            ? {
                presentation: {
                  slides: asset.metadata.presentationPackage.slides.map(
                    ({ index, title, notes, imagePath }) => ({
                      index,
                      title,
                      notes,
                      ...(imagePath ? { imagePath } : {})
                    })
                  )
                }
              }
            : {})
        })
      } catch {
        // usePlaylistStore already shows toast/handles errors
      }
    },
    [addMediaToPlaylist]
  )

  // Handle deleting local media asset reference
  const handleDeleteMedia = async (e: React.MouseEvent, asset: LocalMediaAsset): Promise<void> => {
    e.stopPropagation()
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus "${asset.name}" dari daftar aplikasi? (File asli di komputer tetap aman)`
    )
    if (!confirmDelete) return

    try {
      const deleted = await window.api.media.delete(asset.id)
      if (deleted) {
        showToast('Media dihapus dari daftar', 'success')
        await fetchAssets()
      } else {
        showToast('Gagal menghapus media', 'error')
      }
    } catch (err) {
      console.error('Failed to delete media asset:', err)
      showToast('Gagal menghapus media', 'error')
    }
  }

  // Filter assets based on search, type, and category selectors
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Search Query filter
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
      // 2. Type filter
      const matchesType = selectedType === 'all' || asset.type === selectedType
      // 3. Category/Folder filter
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory

      return matchesSearch && matchesType && matchesCategory
    })
  }, [assets, searchQuery, selectedType, selectedCategory])

  return (
    <aside className="projection-song-info-panel projection-media-panel flex flex-col h-full min-h-0 bg-transparent">
      {/* Header Row: Search + Add */}
      <div className="flex items-center gap-2 p-3 pb-2 border-b border-white/[0.04] bg-white/[0.01] shrink-0">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Cari media lokal..."
            size="sm"
            fullWidth
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<FolderOpen size={11} />}
          onClick={handleAddFiles}
          disabled={isLoading}
          className="font-bold text-[11px] h-7 shrink-0"
        >
          Tambah
        </Button>
      </div>

      {/* Filter Row: Type Tabs + Folder Selector */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b border-white/[0.04] bg-white/[0.005] shrink-0">
        <div className="grid grid-cols-[1fr_minmax(145px,0.7fr)] items-end gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] p-2">
          <div>
            <div className="text-[10px] font-bold text-text-secondary">Format impor presentasi</div>
            <div className="mt-0.5 text-[9px] leading-relaxed text-text-disabled">
              Auto memilih PowerPoint, WPS, atau LibreOffice yang tersedia.
            </div>
          </div>
          <Select
            value={presentationOutputMode}
            onChange={(value) => setPresentationOutputMode(value as 'auto' | 'pdf' | 'images')}
            options={[
              { value: 'auto', label: 'Otomatis (disarankan)' },
              { value: 'pdf', label: 'PDF kompatibel' },
              { value: 'images', label: 'Gambar per slide' }
            ]}
            size="sm"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          {/* Type Tabs */}
          <div className="flex-1">
            <SegmentedControl
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'image', label: 'Gambar' },
                { value: 'video', label: 'Video' },
                { value: 'pdf', label: 'PDF' }
              ]}
              value={selectedType}
              onChange={(val) => setSelectedType(val as MediaTypeFilter)}
              size="sm"
              fullWidth
              layoutId="media-type-filter"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-[110px] shrink-0">
            <Select
              options={categoryOptions}
              value={selectedCategory}
              onChange={handleCategoryChange}
              size="sm"
              className="w-full text-[10px]"
            />
          </div>
        </div>
        {isCreatingFolder && (
          <div className="flex items-center gap-1.5">
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateFolder()
                if (event.key === 'Escape') {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Nama folder baru"
              className="min-w-0 flex-1 h-7 rounded-md bg-black/30 border border-white/[0.08] px-2 text-[10px] text-text-primary outline-none focus:border-brand-primary/50"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="h-7 px-2 rounded-md bg-brand-primary text-white text-[10px] font-bold disabled:opacity-40"
            >
              Buat
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(false)
                setNewFolderName('')
              }}
              className="h-7 w-7 rounded-md bg-white/5 text-text-muted hover:text-text-primary flex items-center justify-center"
              title="Batal"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {pptNoticeCount > 0 && (
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-[10px] leading-relaxed text-amber-100">
            {pptNoticeCount} file PowerPoint format lama (.ppt) dilewati. Simpan ulang sebagai .pptx
            agar slide dan Speaker Notes dapat diimpor dengan aman.
          </div>
        )}
      </div>

      {/* Media Grid / List */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {isLoading && assets.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[11px] text-text-disabled animate-pulse">
            Memuat file media...
          </div>
        ) : filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredAssets.map((asset) => {
              const isVideo = asset.type === 'video'
              const mediaKind: LocalMediaKind = resolveMediaKind({
                path: asset.localPath,
                hasPresentationPackage: Boolean(asset.metadata?.presentationPackage)
              })
              const mediaLabel = getMediaKindLabel(mediaKind)
              const mediaCapability = getMediaKindCapability(mediaKind)
              const normalizedSrc = toLocalMediaUrl(asset.localPath)
              const thumbnailSrc = toLocalMediaUrl(asset.thumbnailPath || asset.localPath)
              const hasPreviewError = Boolean(previewErrors[asset.id])

              return (
                <div
                  key={asset.id}
                  onDoubleClick={() => handleProjectMedia(asset)}
                  className="
                    group relative flex flex-col gap-1.5 p-2 rounded-xl
                    bg-white/[0.02] border border-white/[0.04]
                    hover:bg-white/[0.05] hover:border-white/[0.08]
                    cursor-pointer transition-all duration-200
                  "
                >
                  {/* Thumbnail Container */}
                  <div
                    className="
                      relative aspect-video rounded-lg overflow-hidden
                      bg-black/40 flex items-center justify-center border border-white/[0.02]
                    "
                  >
                    {asset.type === 'pdf' ? (
                      <PdfThumbnail pdfPath={asset.localPath} alt={asset.name} />
                    ) : isVideo && !hasPreviewError ? (
                      <video
                        src={normalizedSrc}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        onError={() =>
                          setPreviewErrors((current) => ({ ...current, [asset.id]: true }))
                        }
                      />
                    ) : !isVideo && asset.localPath && !hasPreviewError ? (
                      <img
                        src={thumbnailSrc}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() =>
                          setPreviewErrors((current) => ({ ...current, [asset.id]: true }))
                        }
                      />
                    ) : (
                      <MediaFallback type={isVideo ? 'video' : 'image'} />
                    )}

                    {/* Premium Control Overlay - Large, clear buttons filling overlay */}
                    <div
                      className="
                        absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100
                        flex flex-col items-center justify-between p-2 transition-opacity duration-200
                      "
                    >
                      {/* 1. Large Circular Play Button in center */}
                      <button
                        onClick={() => handleProjectMedia(asset)}
                        title="Muat media ini ke Preview"
                        className="
                          min-w-20 h-10 rounded-full bg-brand-primary px-3 text-white
                          hover:bg-brand-primary-hover hover:scale-110
                          flex items-center justify-center gap-1.5 transition-all duration-150
                          shadow-lg active:scale-90 mt-1
                        "
                      >
                        <Play size={16} fill="currentColor" className="ml-0.5" />
                        <span className="text-[10px] font-black">Preview</span>
                      </button>

                      {/* 2. Playlist & Delete actions at bottom */}
                      <div className="flex gap-1.5 w-full">
                        <button
                          onClick={() => handleAddToPlaylist(asset)}
                          title="Tambah ke Playlist"
                          className="
                            flex-1 h-6.5 rounded-md bg-white/10 text-white hover:bg-white/20
                            flex items-center justify-center gap-1 font-bold text-[9px]
                            transition-all active:scale-95
                          "
                        >
                          <Plus size={9} />
                          <span>Rundown</span>
                        </button>
                        <button
                          onClick={(e) => handleDeleteMedia(e, asset)}
                          title="Hapus dari daftar"
                          className="
                            flex-1 h-6.5 rounded-md bg-status-error/15 text-status-error hover:bg-status-error/25
                            flex items-center justify-center gap-1 font-bold text-[9px]
                            transition-all active:scale-95
                          "
                        >
                          <Trash2 size={9} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 px-0.5">
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="rounded-md border border-brand-primary/20 bg-brand-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-sky-200">
                        {mediaLabel}
                      </span>
                      <span className="truncate text-[8px] font-bold text-text-disabled">
                        {mediaCapability}
                      </span>
                    </div>
                    <p
                      title={asset.name}
                      className="truncate text-[10px] font-semibold leading-tight text-text-secondary group-hover:text-text-primary"
                    >
                      {asset.name}
                    </p>
                    <p className="mt-0.5 truncate text-[9px] text-text-disabled opacity-60">
                      Folder:{' '}
                      {asset.category && asset.category.startsWith('Local - ')
                        ? asset.category.slice(8)
                        : 'Default'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-text-disabled">
            <ImageIcon size={24} className="opacity-30" />
            <p className="text-[11px]">
              {searchQuery ? 'Tidak ada media yang cocok' : 'Belum ada media lokal'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleAddFiles}
                className="text-[11px] font-semibold text-brand-primary hover:underline mt-1"
              >
                Pilih file sekarang
              </button>
            )}
          </div>
        )}
      </div>

      {/* PPTX Import Progress Modal */}
      {importStatus && (
        <>
          {/* Modal Dialog (when NOT minimized) */}
          {!importStatus.isMinimized && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-300">
              <div className="w-[min(520px,100%)] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 shadow-2xl shadow-black/50">
                <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                          importStatus.step === 'failed'
                            ? 'border-red-400/30 bg-red-500/10 text-red-200'
                            : 'border-sky-300/25 bg-sky-400/10 text-sky-200'
                        }`}
                      >
                        {importStatus.step === 'failed' ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <FileStack size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-black tracking-tight text-white">
                          {importStatus.step === 'failed'
                            ? 'Import PPT lokal gagal'
                            : 'Mengimpor PPT lokal'}
                        </h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {importStatus.fileTotal > 1
                            ? `File ${importStatus.fileIndex} dari ${importStatus.fileTotal}`
                            : 'Menyiapkan presentasi untuk Media Lokal, Preview, Program, dan SION Link.'}
                        </p>
                      </div>
                    </div>
                    {importStatus.step !== 'failed' && (
                      <button
                        onClick={() =>
                          setImportStatus((prev) => (prev ? { ...prev, isMinimized: true } : null))
                        }
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                        title="Minimalkan ke pojok kanan"
                        aria-label="Minimalkan progress import"
                      >
                        <Minimize2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-5 px-5 py-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      File presentasi
                    </div>
                    <div className="mt-1 truncate text-[13px] font-bold text-white">
                      {importStatus.fileName}
                    </div>
                  </div>

                  {importStatus.step === 'failed' ? (
                    <>
                      <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-[12px] font-semibold leading-relaxed text-red-100">
                        {importStatus.error || 'Terjadi kesalahan saat mengimpor presentasi.'}
                      </div>
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-[11px] leading-relaxed text-amber-100">
                        Coba buka file di PowerPoint lalu simpan ulang sebagai{' '}
                        <strong>.pptx</strong>. Jika masih gagal, gunakan mode{' '}
                        <strong>PDF kompatibel</strong> atau ekspor manual ke PDF.
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-black text-white">
                              {PRESENTATION_IMPORT_COPY[importStatus.step].title}
                            </div>
                            <div className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                              {PRESENTATION_IMPORT_COPY[importStatus.step].detail}
                            </div>
                          </div>
                          <span className="shrink-0 text-[20px] font-black tabular-nums text-sky-300">
                            {importStatus.percent}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 shadow-[0_0_24px_rgba(56,189,248,.35)] transition-all duration-300 ease-out"
                            style={{ width: `${Math.max(3, importStatus.percent)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {(['parsing', 'converting', 'generating', 'finishing'] as const).map(
                          (step) => {
                            const steps = ['parsing', 'converting', 'generating', 'finishing']
                            const currentIndex = steps.indexOf(importStatus.step)
                            const stepIndex = steps.indexOf(step)
                            const complete = stepIndex < currentIndex
                            const active = step === importStatus.step
                            return (
                              <div
                                key={step}
                                className={`rounded-xl border px-2 py-2 text-center ${
                                  active
                                    ? 'border-sky-300/35 bg-sky-400/10 text-sky-100'
                                    : complete
                                      ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100'
                                      : 'border-white/10 bg-white/[0.025] text-slate-500'
                                }`}
                              >
                                <div className="mb-1 flex justify-center">
                                  {complete ? (
                                    <CheckCircle2 size={13} />
                                  ) : active ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : (
                                    <span className="h-[13px] w-[13px] rounded-full border border-current/40" />
                                  )}
                                </div>
                                <div className="text-[9px] font-black uppercase tracking-wide">
                                  {step === 'parsing' && 'Baca'}
                                  {step === 'converting' && 'Mesin'}
                                  {step === 'generating' && 'Export'}
                                  {step === 'finishing' && 'Simpan'}
                                </div>
                              </div>
                            )
                          }
                        )}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-[11px] leading-relaxed text-slate-400">
                        <span className="font-bold text-slate-300">Tips:</span> Anda boleh
                        minimalkan proses ini dan tetap menyiapkan lagu lain. Jangan tutup aplikasi
                        sampai import selesai.
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-4">
                  <span className="text-[10px] font-semibold text-slate-500">
                    Berjalan {Math.max(1, Math.round((importNow - importStatus.startedAt) / 1000))}d
                  </span>
                  {importStatus.step === 'failed' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCloseImportError}
                      className="font-bold text-xs"
                    >
                      Tutup
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setImportStatus((prev) => (prev ? { ...prev, isMinimized: true } : null))
                      }
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-white/[0.08]"
                    >
                      Jalankan di latar belakang
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Minimized Floating Badge */}
          {importStatus.isMinimized && (
            <div
              onClick={() =>
                setImportStatus((prev) => (prev ? { ...prev, isMinimized: false } : null))
              }
              className="group fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-3.5 rounded-2xl border border-sky-300/20 bg-slate-950/92 p-3.5 shadow-2xl backdrop-blur-md transition-all hover:border-sky-300/40"
            >
              {/* Circular Progress Indicator */}
              <div className="relative flex h-8 w-8 items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    className="text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="transparent"
                    r="13"
                    cx="16"
                    cy="16"
                  />
                  <circle
                    className="text-brand-primary transition-all duration-300"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 13}
                    strokeDashoffset={2 * Math.PI * 13 * (1 - importStatus.percent / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="13"
                    cx="16"
                    cy="16"
                  />
                </svg>
                <span className="absolute text-[9px] font-black text-white tabular-nums">
                  {importStatus.percent}%
                </span>
              </div>

              {/* Progress Copy */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PPT {importStatus.fileIndex}/{importStatus.fileTotal} ·{' '}
                  {
                    PRESENTATION_IMPORT_COPY[
                      importStatus.step === 'failed' || importStatus.step === 'done'
                        ? 'finishing'
                        : importStatus.step
                    ].title
                  }
                </span>
                <span className="mt-0.5 max-w-[220px] truncate text-xs font-bold leading-tight text-white transition-colors group-hover:text-sky-200">
                  {importStatus.fileName}
                </span>
              </div>

              {/* Maximize Icon */}
              <div className="rounded-lg p-1 text-slate-400 transition-all hover:bg-white/5 hover:text-white">
                <Maximize2 size={14} />
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
