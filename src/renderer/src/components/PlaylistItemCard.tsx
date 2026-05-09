import React, { useState } from 'react'
import { AlertTriangle, GripVertical, Radio, Tag, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateSlides } from '../engine/slideEngine'
import { usePlaylistStore } from '../store/usePlaylistStore'
import type { PlaylistItem } from '../types'

interface PlaylistItemCardProps {
  item: PlaylistItem
  index: number
  isActive: boolean
  isProjected?: boolean
  onClick: () => void
  onRemove: (e: React.MouseEvent) => void
}

export default function PlaylistItemCard({
  item,
  index,
  isActive,
  isProjected = false,
  onClick,
  onRemove
}: PlaylistItemCardProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id.toString()
  })

  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [tempLabel, setTempLabel] = useState(item.section_label || '')
  const updateItemLabel = usePlaylistStore((s) => s.updateItemLabel)
  const slideCount = generateSlides(item.song_id, item.lyrics_raw || '').length
  const hasEmptyLyrics = !item.lyrics_raw?.trim()
  const meta = [item.key_note ? `Nada ${item.key_note}` : '', item.tempo || ''].filter(Boolean)

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-1 ${isDragging ? 'z-50' : ''}`}
    >
      {item.section_label && !isDragging && (
        <div className="mt-1.5 mb-1 flex items-center gap-2 px-2">
          <div className="h-px flex-1 bg-border-subtle" />
          <span className="whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.08em] text-brand-secondary">
            {item.section_label}
          </span>
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
      )}

      <div
        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-2 transition-all duration-200 hover:scale-[1.02] ${
          isActive
            ? 'border-preview/45 bg-preview/10 shadow-[var(--shadow-elevation-3),var(--shadow-glow-green)]'
            : isProjected
              ? 'border-live-red/30 bg-live-red/5 shadow-[var(--shadow-elevation-2),var(--shadow-glow-red)]'
              : index % 2 === 0
                ? 'border-border-subtle bg-bg-elevated/78 shadow-[var(--shadow-elevation-1)] hover:border-border-strong hover:bg-bg-elevated-hover hover:shadow-[var(--shadow-elevation-2)]'
                : 'border-border-subtle bg-bg-surface/74 shadow-[var(--shadow-elevation-1)] hover:border-border-strong hover:bg-bg-elevated-hover hover:shadow-[var(--shadow-elevation-2)]'
        } ${isDragging ? 'scale-[1.02] border-brand-primary shadow-2xl ring-2 ring-brand-primary/20' : ''}`}
        onClick={onClick}
      >
        <div
          className="cursor-grab p-1 text-text-disabled transition-colors hover:text-text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </div>

        <div className="relative shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded text-[12px] font-black transition-colors ${
              isActive ? 'bg-preview/20 text-preview' : 'bg-bg-surface text-text-muted'
            }`}
          >
            {index + 1}
          </div>
          {isProjected && (
            <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-bg-surface bg-live-red animate-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12px] font-semibold text-text-primary">
              {item.title}
            </span>
            {isProjected && (
              <span className="flex items-center gap-1 rounded border border-live-red/20 bg-live-red/10 px-1.5 py-0.5 text-[12px] font-black uppercase tracking-[0.06em] text-live-red">
                <Radio size={10} className="animate-pulse" />
                Live
              </span>
            )}
            {hasEmptyLyrics && (
              <span className="flex items-center gap-1 rounded border border-status-warning/25 bg-status-warning/12 px-1.5 py-0.5 text-[12px] font-black uppercase text-status-warning">
                <AlertTriangle size={10} />
                Lirik Kosong
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[12px] font-bold text-text-muted">
              {item.hymnal_code || 'LS'} {item.number}
            </span>
            <span className="text-[12px] text-text-disabled">/</span>
            <span className="text-[12px] text-text-disabled">{slideCount} Slides</span>
            {meta.map((itemMeta) => (
              <span
                key={itemMeta}
                className="rounded border border-border-subtle bg-bg-base/35 px-1 py-0.5 text-[12px] font-bold text-text-disabled"
              >
                {itemMeta}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-20 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingLabel(true)
            }}
            className="rounded-md p-1.5 text-text-disabled transition-colors hover:bg-brand-secondary/10 hover:text-brand-secondary"
            title="Set Label"
            aria-label={`Set label for ${item.title}`}
          >
            <Tag size={14} />
          </button>
          <button
            onClick={onRemove}
            className="rounded-md p-1.5 text-text-disabled transition-colors hover:bg-status-error/10 hover:text-status-error"
            title="Remove"
            aria-label={`Remove ${item.title} from playlist`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {isEditingLabel && (
        <form
          onSubmit={handleLabelSubmit}
          className="absolute inset-0 z-10 flex items-center gap-2 rounded-md bg-bg-surface/95 px-3 backdrop-blur-sm animate-fade-in"
        >
          <input
            autoFocus
            type="text"
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            placeholder="Label (Contoh: Chorus, Ending...)"
            className="flex-1 rounded border border-border-default bg-bg-base px-3 py-1.5 text-xs outline-none focus:border-brand-secondary"
          />
          <button
            type="submit"
            className="rounded bg-brand-secondary px-3 py-1.5 text-xs font-bold text-white"
            aria-label="Save playlist label"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setIsEditingLabel(false)}
            className="p-1.5 text-text-muted hover:text-text-primary"
            aria-label="Cancel playlist label editing"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
