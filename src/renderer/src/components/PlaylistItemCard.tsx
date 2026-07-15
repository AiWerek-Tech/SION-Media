import React, { useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  GripVertical,
  Megaphone,
  Pencil,
  Radio,
  RefreshCw,
  Tag,
  X,
  Image as ImageIcon
} from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateSlidesForPlaylistItem } from '@renderer/engine/slideEngine'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import type { PlaylistItem } from '@renderer/types'
import { parseMediaPlaylistDescriptor } from '../../../shared/media-playlist'
import { Modal, ModalButton } from '@renderer/components/modals/Modal'

interface PlaylistItemCardProps {
  item: PlaylistItem
  index: number
  isActive: boolean
  isProjected?: boolean
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
  onReplace?: (item: PlaylistItem) => void
}

export default function PlaylistItemCard({
  item,
  index,
  isActive,
  isProjected = false,
  onClick,
  onRemove,
  onReplace
}: PlaylistItemCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id.toString()
  })

  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [tempLabel, setTempLabel] = useState(item.section_label || '')
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [tempInfoTitle, setTempInfoTitle] = useState(item.title || '')
  const [tempInfoBody, setTempInfoBody] = useState(item.notes || '')
  const updateItemLabel = usePlaylistStore((s) => s.updateItemLabel)
  const updateInfoItem = usePlaylistStore((s) => s.updateInfoItem)
  const slideCount = generateSlidesForPlaylistItem(item).length
  const isBible = item.item_type === 'bible'
  const isInfo = item.item_type === 'info'
  const isMedia = item.item_type === 'media'
  const mediaDescriptor = isMedia ? parseMediaPlaylistDescriptor(item.notes) : null
  const mediaPath = mediaDescriptor?.path || ''
  const mediaFileName = mediaPath.split(/[\\/]/).pop() || mediaPath
  const hasEmptyLyrics = !isBible && !isInfo && !isMedia && !item.lyrics_raw?.trim()
  const meta = [item.key_note ? `Nada ${item.key_note}` : '', item.tempo || ''].filter(Boolean)

  let snippet = ''
  if (isBible && item.bible_text_json) {
    try {
      const parsed = JSON.parse(item.bible_text_json)
      if (Array.isArray(parsed) && parsed.length > 0) {
        snippet = parsed[0].text
        if (snippet.length > 50) {
          snippet = snippet.slice(0, 50) + '...'
        }
      }
    } catch {
      // ignore
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: isDragging ? ('relative' as const) : undefined
  }

  const handleLabelSubmit = (e?: React.FormEvent): void => {
    e?.preventDefault()
    updateItemLabel(item.id, tempLabel)
    setIsEditingLabel(false)
  }

  const handleInfoSubmit = (e?: React.FormEvent): void => {
    e?.preventDefault()
    updateInfoItem(item.id, { title: tempInfoTitle, body: tempInfoBody }).catch(() => {
      setTempInfoTitle(item.title || '')
      setTempInfoBody(item.notes || '')
    })
    setIsEditingInfo(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-1 ${isDragging ? 'z-50' : ''}`}
    >
      {item.section_label && !isDragging && (
        <div className="my-2 flex items-center gap-3 px-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-brand-secondary/80">
            {item.section_label}
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
      )}

      <div
        className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-[background-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-premium)] ${
          isDragging
            ? 'bg-white/[0.08] ring-2 ring-brand-primary/30 shadow-[0_16px_48px_rgba(0,0,0,0.35)] scale-[1.02]'
            : isActive
              ? isBible
                ? 'bg-white/[0.06] ring-1 ring-indigo-500/45 shadow-[0_4px_20px_rgba(99,102,241,0.15)]'
                : 'bg-white/[0.06] ring-1 ring-brand-primary/25 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
              : isProjected
                ? isBible
                  ? 'bg-white/[0.04] ring-1 ring-indigo-500/25 shadow-[0_2px_12px_rgba(99,102,241,0.1)]'
                  : 'bg-white/[0.04] ring-1 ring-brand-primary/15 shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                : 'bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10'
        }`}
        onClick={onClick}
      >
        <div
          className="cursor-grab p-1 text-text-disabled/50 transition-colors hover:text-text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>

        <div className="relative shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums transition-colors ${
              isActive
                ? isBible
                  ? 'bg-indigo-500/25 text-indigo-400'
                  : 'bg-brand-primary/15 text-brand-primary'
                : isProjected
                  ? isBible
                    ? 'bg-indigo-500/15 text-indigo-400/80'
                    : 'bg-brand-primary/10 text-brand-primary/70'
                  : 'bg-white/[0.04] text-text-muted'
            }`}
          >
            {index + 1}
          </div>
          {isProjected && (
            <div
              className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full animate-pulse ${isBible ? 'bg-indigo-400' : 'bg-brand-primary'}`}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isBible && <BookOpen size={13} className="text-indigo-400/80 shrink-0" />}
            {isInfo && <Megaphone size={13} className="shrink-0 text-cyan-400/80" />}
            {isMedia && <ImageIcon size={13} className="shrink-0 text-emerald-400/80" />}
            <span className="truncate text-[13px] font-semibold text-text-primary">
              {item.title}
            </span>
            {isProjected && (
              <span
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                  isBible
                    ? 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/20'
                    : isMedia
                      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/15'
                      : 'bg-brand-primary/10 text-brand-primary ring-brand-primary/15'
                }`}
              >
                <Radio size={8} className="animate-pulse" />
                Live
              </span>
            )}
            {hasEmptyLyrics && (
              <span className="flex items-center gap-1 rounded-md bg-status-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-status-warning ring-1 ring-status-warning/15">
                <AlertTriangle size={8} />
                Kosong
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {isBible ? (
              <>
                <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">
                  {item.bible_version_short_name || item.bible_version_code || 'Alkitab'}
                </span>
                <span className="text-[10px] text-text-disabled">·</span>
                <span className="text-[11px] text-text-muted">{slideCount} slide</span>
                {snippet && (
                  <>
                    <span className="text-[10px] text-text-disabled">·</span>
                    <span className="truncate text-[11px] text-text-disabled italic max-w-[200px]">
                      &ldquo;{snippet}&rdquo;
                    </span>
                  </>
                )}
              </>
            ) : isInfo ? (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-400">
                  Info
                </span>
                <span className="text-[10px] text-text-disabled">·</span>
                <span className="text-[11px] text-text-muted">{slideCount} slide</span>
                {item.notes && (
                  <>
                    <span className="text-[10px] text-text-disabled">·</span>
                    <span className="max-w-[200px] truncate text-[11px] text-text-disabled">
                      {item.notes}
                    </span>
                  </>
                )}
              </>
            ) : isMedia ? (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                  Media
                </span>
                <span className="text-[10px] text-text-disabled">·</span>
                <span className="text-[11px] text-text-muted">
                  {/\.(mp4|webm|mov|mkv)$/i.test(mediaPath)
                    ? 'Video'
                    : mediaPath.toLowerCase().endsWith('.pdf')
                      ? mediaDescriptor?.presentation
                        ? 'Presentasi'
                        : 'PDF'
                      : 'Gambar'}
                </span>
                {mediaFileName && (
                  <>
                    <span className="text-[10px] text-text-disabled">·</span>
                    <span className="max-w-[200px] truncate text-[11px] text-text-disabled">
                      {mediaFileName}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium text-text-muted">
                  {item.hymnal_code || 'LS'} {item.number}
                </span>
                <span className="text-[10px] text-text-disabled">·</span>
                <span className="text-[11px] text-text-disabled">{slideCount} slide</span>
                {meta.map((itemMeta) => (
                  <span
                    key={itemMeta}
                    className="text-[10px] font-medium text-text-disabled bg-white/[0.03] px-1.5 py-0.5 rounded-md"
                  >
                    {itemMeta}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {!isBible && !isInfo && !isMedia && onReplace && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReplace(item)
              }}
              className="rounded-lg p-1.5 text-text-disabled transition-all hover:bg-brand-primary/10 hover:text-brand-primary"
              title="Ganti lagu tanpa mengubah posisi rundown"
              aria-label={`Ganti lagu ${item.title}`}
            >
              <RefreshCw size={14} />
            </button>
          )}
          {isInfo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setTempInfoTitle(item.title || '')
                setTempInfoBody(item.notes || '')
                setIsEditingInfo(true)
              }}
              className="rounded-lg p-1.5 text-text-disabled transition-all hover:bg-white/[0.06] hover:text-cyan-300"
              title="Edit Info"
              aria-label={`Edit info ${item.title}`}
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingLabel(true)
            }}
            className="rounded-lg p-1.5 text-text-disabled transition-all hover:bg-white/[0.06] hover:text-text-secondary"
            title="Set Label"
            aria-label={`Set label for ${item.title}`}
          >
            <Tag size={14} />
          </button>
          <button
            onClick={onRemove}
            className="rounded-lg p-1.5 text-text-disabled transition-all hover:bg-status-error/10 hover:text-status-error"
            title="Remove"
            aria-label={`Remove ${item.title} from playlist`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {isEditingLabel && (
        <Modal
          id={`playlist-label-${item.id}`}
          title="Ubah Label Rundown"
          subtitle="Label membantu operator mengenali bagian ibadah tanpa mengubah lagu."
          size="sm"
          onClose={() => setIsEditingLabel(false)}
          footer={
            <>
              <ModalButton onClick={() => setIsEditingLabel(false)}>Batal</ModalButton>
              <ModalButton variant="primary" onClick={() => handleLabelSubmit()}>
                Simpan Label
              </ModalButton>
            </>
          }
        >
          <form onSubmit={handleLabelSubmit} className="sp-field">
            <label className="sp-field__label" htmlFor={`playlist-label-input-${item.id}`}>
              Nama label
            </label>
            <input
              id={`playlist-label-input-${item.id}`}
              autoFocus
              type="text"
              value={tempLabel}
              onChange={(e) => setTempLabel(e.target.value)}
              placeholder="Contoh: Lagu Pembuka"
              className="sp-input"
            />
          </form>
        </Modal>
      )}

      {isEditingInfo && (
        <Modal
          id={`playlist-info-${item.id}`}
          title="Edit Info Rundown"
          subtitle="Perubahan disimpan pada item ini dan langsung tersedia saat ditayangkan."
          size="md"
          onClose={() => setIsEditingInfo(false)}
          footer={
            <>
              <ModalButton onClick={() => setIsEditingInfo(false)}>Batal</ModalButton>
              <ModalButton
                variant="primary"
                disabled={!tempInfoTitle.trim() && !tempInfoBody.trim()}
                onClick={() => handleInfoSubmit()}
              >
                Simpan Perubahan
              </ModalButton>
            </>
          }
        >
          <form onSubmit={handleInfoSubmit} className="playlist-modal-form">
            <div className="sp-field">
              <label className="sp-field__label" htmlFor={`playlist-info-title-${item.id}`}>
                Judul
              </label>
              <input
                id={`playlist-info-title-${item.id}`}
                autoFocus
                type="text"
                value={tempInfoTitle}
                onChange={(e) => setTempInfoTitle(e.target.value)}
                placeholder="Judul Info"
                className="sp-input"
              />
            </div>
            <div className="sp-field">
              <label className="sp-field__label" htmlFor={`playlist-info-body-${item.id}`}>
                Isi informasi
              </label>
              <textarea
                id={`playlist-info-body-${item.id}`}
                value={tempInfoBody}
                onChange={(e) => setTempInfoBody(e.target.value)}
                placeholder="Isi Info"
                rows={6}
                className="sp-input min-h-[140px] resize-y py-3"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
