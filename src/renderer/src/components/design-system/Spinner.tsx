/**
 * Design System — Spinner (Atom)
 *
 * Loading indicator with multiple sizes and optional label.
 */

import React from 'react'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  label?: string
  className?: string
  color?: string
}

const sizeMap = {
  xs: 'w-3 h-3 border-[1.5px]',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[2.5px]'
}

const textMap = {
  xs: 'text-[9px]',
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-[12px]'
}

export function Spinner({
  size = 'md',
  label,
  className = '',
  color = 'border-brand-primary'
}: SpinnerProps): React.JSX.Element {
  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <div
        className={`
          rounded-full animate-spin
          border-transparent border-t-current
          ${sizeMap[size]}
          ${color}
        `}
        style={{ borderTopColor: 'currentColor' }}
      />
      {label && <span className={`${textMap[size]} font-medium text-text-muted`}>{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )
}
