import React from 'react'

interface WorkspaceCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8'
}

export function WorkspaceCard({
  children,
  className = '',
  padding = 'md'
}: WorkspaceCardProps): React.JSX.Element {
  return (
    <div
      className={`
        rounded-2xl
        bg-white/5
        border border-white/10
        shadow-[0_10px_40px_rgba(0,0,0,0.25)]
        transition-shadow
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
