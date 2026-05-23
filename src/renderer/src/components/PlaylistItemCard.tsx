import React, { useState } from 'react'
import { AlertTriangle, GripVertical, Radio, Tag, X } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { generateSlidesForPlaylistItem } from '@renderer/engine/slideEngine'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import type { PlaylistItem } from '@renderer/types'

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
  const slideCount = generateSlidesForPlaylistItem(item).length
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
              ? 'bg-white/[0.06] ring-1 ring-brand-primary/25 shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
              : isProjected
                ? 'bg-white/[0.04] ring-1 ring-brand-primary/15 shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
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
                ? 'bg-brand-primary/15 text-brand-primary'
                : isProjected
                  ? 'bg-brand-primary/10 text-brand-primary/70'
                  : 'bg-white/[0.04] text-text-muted'
            }`}
          >
            {index + 1}
          </div>
          {isProjected && (
            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-text-primary">
              {item.title}
            </span>
            {isProjected && (
              <span className="flex items-center gap-1 rounded-md bg-brand-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-primary ring-1 ring-brand-primary/15">
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
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
        <form
          onSubmit={handleLabelSubmit}
          className="absolute inset-0 z-10 flex items-center gap-2 rounded-2xl bg-bg-surface/95 px-3 backdrop-blur-sm animate-fade-in ring-1 ring-white/10"
        >
          <input
            autoFocus
            type="text"
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            placeholder="Label (Contoh: Chorus, Ending...)"
            className="flex-1 rounded-lg border border-white/10 bg-bg-base px-3 py-1.5 text-xs outline-none focus:border-brand-primary transition-colors"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors"
            aria-label="Save playlist label"
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => setIsEditingLabel(false)}
            className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Cancel playlist label editing"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  )
}
