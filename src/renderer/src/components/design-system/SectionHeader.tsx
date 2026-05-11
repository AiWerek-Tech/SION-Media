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
    <div className="flex items-center justify-between mb-6 group">
      <div className="space-y-1">
        <h3 className="text-section-title font-bold text-text-primary tracking-tight group-hover:text-brand-primary transition-colors duration-300">
          {title}
        </h3>
        {description && (
          <p className="text-label uppercase tracking-widest text-text-muted font-medium">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}
