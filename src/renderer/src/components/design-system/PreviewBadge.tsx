import React from 'react'

interface PreviewBadgeProps {
  label: string
  variant?: 'default' | 'live' | 'resolution' | 'aspect'
  pulse?: boolean
}

const variantMap = {
  default: 'bg-black/40 ring-white/[0.08] text-white/50',
  live: 'bg-brand-primary/15 ring-brand-primary/20 text-brand-primary/90',
  resolution: 'bg-black/40 ring-white/[0.08] text-white/45 font-mono',
  aspect: 'bg-black/40 ring-white/[0.08] text-white/40 font-mono'
}

export function PreviewBadge({
  label,
  variant = 'default',
  pulse = false
}: PreviewBadgeProps): React.JSX.Element {
  return (
    <div
      className={`
        flex items-center gap-1.5
        px-2.5 py-1
        rounded-md
        backdrop-blur-xl
        ring-1
        text-[9px] font-semibold tracking-wider
        ${variantMap[variant]}
      `}
    >
      {pulse && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />}
      <span>{label}</span>
    </div>
  )
}
