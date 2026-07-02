import React, { useState } from 'react'
import {
  BookOpen,
  FolderOpen,
  Trash2,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  Info
} from 'lucide-react'
import { useBiblePacks, BiblePackPreview } from '../hooks/useBiblePacks'
import { Modal, ModalButton } from '../../../components/modals/Modal'

// ============================================================================
// Preview Dialog
// ============================================================================

function PreviewDialog({
  folderPath,
  preview,
  onInstall,
  onCancel,
  installing
}: {
  folderPath: string
  preview: BiblePackPreview
  onInstall: () => void
  onCancel: () => void
  installing: boolean
}): React.JSX.Element {
  const [showBooks, setShowBooks] = useState(false)

  const otCount = preview.books.filter((b) => b.testament === 'OT').length
  const ntCount = preview.books.filter((b) => b.testament === 'NT').length

  return (
    <Modal
      id="bible-pack-preview"
      title={preview.valid ? 'Bible Pack Valid' : 'Validasi Gagal'}
      subtitle={folderPath}
      size="lg"
      danger={!preview.valid}
      dismissible={!installing}
      showClose={!installing}
      onClose={onCancel}
      footer={
        <>
          <ModalButton onClick={onCancel} disabled={installing}>
            Batal
          </ModalButton>
          {preview.valid && (
            <ModalButton variant="primary" onClick={onInstall} loading={installing}>
              {installing ? 'Menginstall...' : 'Install Pack'}
            </ModalButton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className={`sp-modal-card flex items-center gap-3 ${preview.valid ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {preview.valid ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-semibold">
            {preview.valid ? 'Paket siap dipasang' : 'Periksa kembali isi paket'}
          </span>
        </div>

        {/* Errors */}
        {preview.errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            {preview.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-400">
                • {err}
              </p>
            ))}
          </div>
        )}

        {/* Manifest Info */}
        {preview.manifest && (
          <div className="mb-4 space-y-2">
            <div className="rounded-lg bg-bg-elevated p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Informasi Pack
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-text-muted">Nama</span>
                <span className="font-medium">{preview.manifest.version_name}</span>
                <span className="text-text-muted">Kode</span>
                <span className="font-mono font-medium uppercase">
                  {preview.manifest.short_name}
                </span>
                <span className="text-text-muted">Bahasa</span>
                <span>{preview.manifest.language.toUpperCase()}</span>
                <span className="text-text-muted">Penerbit</span>
                <span>{preview.manifest.publisher}</span>
                <span className="text-text-muted">Kitab</span>
                <span>{preview.manifest.books} kitab</span>
                <span className="text-text-muted">Pasal</span>
                <span>{preview.manifest.chapters.toLocaleString()}</span>
                <span className="text-text-muted">Ayat</span>
                <span>{preview.manifest.verses.toLocaleString()}</span>
                <span className="text-text-muted">FTS5 Search</span>
                <span
                  className={preview.manifest.fts5_created ? 'text-emerald-400' : 'text-yellow-400'}
                >
                  {preview.manifest.fts5_created ? '✓ Siap' : '✗ Tidak tersedia'}
                </span>
              </div>
            </div>

            {/* Copyright */}
            {preview.manifest.copyright && (
              <div className="flex items-start gap-2 rounded-lg bg-bg-elevated p-3">
                <Info size={14} className="mt-0.5 shrink-0 text-text-muted" />
                <p className="text-xs text-text-muted">{preview.manifest.copyright}</p>
              </div>
            )}
          </div>
        )}

        {/* Books toggle */}
        {preview.books.length > 0 && (
          <button
            onClick={() => setShowBooks(!showBooks)}
            className="mb-4 flex w-full items-center justify-between rounded-lg bg-bg-elevated px-4 py-2 text-sm text-text-secondary hover:bg-bg-elevated/80"
          >
            <span>
              {otCount} Kitab PL + {ntCount} Kitab PB = {preview.books.length} total
            </span>
            {showBooks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        {showBooks && preview.books.length > 0 && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded-lg bg-bg-elevated p-3">
            <div className="flex flex-wrap gap-1.5">
              {preview.books.map((b) => (
                <span
                  key={b.code}
                  className={`rounded px-1.5 py-0.5 text-xs ${b.testament === 'OT' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ============================================================================
// Pack Card
// ============================================================================

function PackCard({
  pack,
  onSetDefault,
  onRemove,
  busy
}: {
  pack: ReturnType<typeof useBiblePacks>['packs'][number]
  onSetDefault: () => void
  onRemove: () => void
  busy: boolean
}): React.JSX.Element {
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <div
      className={`relative rounded-xl border p-4 transition-colors ${pack.is_default ? 'border-accent-primary/60 bg-accent-primary/5' : 'border-border-default bg-bg-elevated'}`}
    >
      {pack.is_default && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium text-accent-primary">
          <Star size={10} fill="currentColor" />
          Default
        </span>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10">
          <BookOpen size={18} className="text-accent-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-text-primary">{pack.name}</h4>
          <div className="flex items-center gap-2">
            <span className="rounded bg-bg-surface px-1.5 py-0.5 font-mono text-xs text-text-muted">
              {pack.short_name}
            </span>
            <span className="text-xs text-text-muted">{pack.language.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-bg-surface p-2 text-center text-xs">
        <div>
          <div className="font-semibold text-text-primary">{pack.books_count}</div>
          <div className="text-text-muted">Kitab</div>
        </div>
        <div>
          <div className="font-semibold text-text-primary">
            {pack.chapters_count.toLocaleString()}
          </div>
          <div className="text-text-muted">Pasal</div>
        </div>
        <div>
          <div className="font-semibold text-text-primary">
            {pack.verses_count.toLocaleString()}
          </div>
          <div className="text-text-muted">Ayat</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${pack.validation_ok ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}
        >
          <CheckCircle size={10} />
          {pack.validation_ok ? 'Data Valid' : 'Data Invalid'}
        </span>
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${pack.fts5_created ? 'bg-blue-500/15 text-blue-400' : 'bg-yellow-500/15 text-yellow-400'}`}
        >
          <Package size={10} />
          {pack.fts5_created ? 'FTS5 Ready' : 'No FTS5'}
        </span>
      </div>

      {pack.publisher && <p className="mb-3 text-xs text-text-muted">Penerbit: {pack.publisher}</p>}

      <div className="flex gap-2">
        {!pack.is_default && (
          <button
            onClick={onSetDefault}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
          >
            <Star size={12} />
            Set Default
          </button>
        )}

        {confirmRemove ? (
          <>
            <button
              onClick={() => setConfirmRemove(false)}
              className="rounded-lg border border-border-default px-3 py-1.5 text-xs hover:bg-bg-elevated"
            >
              Batal
            </button>
            <button
              onClick={onRemove}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/80 px-3 py-1.5 text-xs text-white hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 size={12} />
              Hapus Sekarang
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            disabled={busy}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs text-text-muted hover:border-red-500 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Hapus
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface BiblePackManagerProps {
  className?: string
}

export function BiblePackManager({ className = '' }: BiblePackManagerProps): React.JSX.Element {
  const { packs, loading, error, install, remove, setDefault, selectAndPreviewFolder } =
    useBiblePacks()

  const [previewState, setPreviewState] = useState<{
    folderPath: string
    preview: BiblePackPreview
  } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [busyPackId, setBusyPackId] = useState<string | null>(null)

  const handleSelectFolder = async (): Promise<void> => {
    try {
      const result = await selectAndPreviewFolder()
      if (!result) return // User cancelled
      setPreviewState(result)
    } catch (err) {
      console.error('Preview failed:', err)
    }
  }

  const handleInstall = async (): Promise<void> => {
    if (!previewState) return
    setInstalling(true)
    try {
      const pack = await install(previewState.folderPath)
      setPreviewState(null)
      setSuccessMsg(`"${pack.name}" berhasil diinstall!`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch {
      // error already set in hook
    } finally {
      setInstalling(false)
    }
  }

  const handleSetDefault = async (packId: string): Promise<void> => {
    setBusyPackId(packId)
    try {
      await setDefault(packId)
    } finally {
      setBusyPackId(null)
    }
  }

  const handleRemove = async (packId: string): Promise<void> => {
    setBusyPackId(packId)
    try {
      await remove(packId)
    } finally {
      setBusyPackId(null)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">Bible Content Pack</h3>
          <p className="text-xs text-text-muted">
            Kelola file Alkitab yang diinstall. Data tidak disimpan ke database utama.
          </p>
        </div>
        <button
          onClick={handleSelectFolder}
          disabled={loading || installing}
          className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-60"
        >
          <FolderOpen size={16} />
          Import Folder Pack
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !previewState && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      )}

      {/* Empty state */}
      {!loading && packs.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-default py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-elevated">
            <BookOpen size={24} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-text-secondary">Belum ada Bible pack</p>
            <p className="mt-1 text-xs text-text-muted">
              Klik &ldquo;Import Folder Pack&rdquo; dan pilih folder{' '}
              <code className="rounded bg-bg-elevated px-1 font-mono">out_tb</code>
            </p>
          </div>
        </div>
      )}

      {/* Pack list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {packs.map((pack) => (
          <PackCard
            key={pack.pack_id}
            pack={pack}
            onSetDefault={() => handleSetDefault(pack.pack_id)}
            onRemove={() => handleRemove(pack.pack_id)}
            busy={busyPackId === pack.pack_id}
          />
        ))}
      </div>

      {/* Preview dialog */}
      {previewState && (
        <PreviewDialog
          folderPath={previewState.folderPath}
          preview={previewState.preview}
          onInstall={handleInstall}
          onCancel={() => setPreviewState(null)}
          installing={installing}
        />
      )}
    </div>
  )
}
