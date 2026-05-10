import React from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function SectionHeader({
  title,
  description,
  action
}: SectionHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h3 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h3>
        {description && <p className="text-[12px] text-text-muted mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
