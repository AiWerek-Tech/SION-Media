/**
 * Design System — StatusBadge (Molecule)
 *
 * Dot + label badge for song/content status.
 * Matches the Management Mode status badge design.
 */

import React from 'react'

type StatusTone = 'published' | 'draft' | 'review' | 'archived' | 'live' | 'pending'

interface StatusBadgeProps {
  status: StatusTone
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

const statusConfig: Record<StatusTone, { label: string; dotClass: string; badgeClass: string }> = {
  published: {
    label: 'Diterbitkan',
    dotClass: 'bg-emerald-400',
    badgeClass: 'border-emerald-400/15 bg-emerald-400/10 text-emerald-300'
  },
  draft: {
    label: 'Draft',
    dotClass: 'bg-sky-400',
    badgeClass: 'border-sky-400/15 bg-sky-400/10 text-sky-300'
  },
  review: {
    label: 'Perlu Review',
    dotClass: 'bg-orange-400',
    badgeClass: 'border-orange-400/15 bg-orange-400/10 text-orange-300'
  },
  archived: {
    label: 'Arsip',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-white/10 bg-white/[0.04] text-slate-400'
  },
  live: {
    label: 'LIVE',
    dotClass: 'bg-red-500 animate-pulse',
    badgeClass: 'border-red-500/20 bg-red-500/10 text-red-400'
  },
  pending: {
    label: 'Menunggu',
    dotClass: 'bg-amber-400',
    badgeClass: 'border-amber-400/15 bg-amber-400/10 text-amber-300'
  }
}

const sizeMap = {
  sm: { badge: 'px-2 py-0.5 text-[9px]', dot: 'w-1.5 h-1.5' },
  md: { badge: 'px-2.5 py-1 text-[10px]', dot: 'w-2 h-2' }
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  className = ''
}: StatusBadgeProps): React.JSX.Element {
  const config = statusConfig[status]
  const s = sizeMap[size]

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-bold
        ${s.badge} ${config.badgeClass} ${className}
      `}
    >
      <span className={`rounded-full shrink-0 ${s.dot} ${config.dotClass}`} />
      {label || config.label}
    </span>
  )
}
