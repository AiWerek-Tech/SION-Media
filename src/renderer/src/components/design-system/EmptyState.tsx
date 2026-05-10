import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center">
        <Icon size={28} className="opacity-40" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium tracking-wide">{title}</p>
        {description && <p className="text-[11px] text-text-disabled mt-1">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
