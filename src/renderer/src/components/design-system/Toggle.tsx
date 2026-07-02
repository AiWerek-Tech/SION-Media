/**
 * Design System — Toggle (Atom)
 *
 * On/off switch with smooth animation, matching broadcast control aesthetic.
 */

import React from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  id?: string
}

const sizeMap = {
  sm: { track: 'w-7 h-4', thumb: 'w-3 h-3', translate: 'translate-x-3', text: 'text-[11px]' },
  md: { track: 'w-9 h-5', thumb: 'w-3.5 h-3.5', translate: 'translate-x-4', text: 'text-[12px]' }
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = '',
  id
}: ToggleProps): React.JSX.Element {
  const s = sizeMap[size]

  return (
    <label
      className={`
        inline-flex items-center gap-2.5 cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative inline-flex items-center shrink-0 rounded-full
          transition-colors duration-200 ease-in-out
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2
          focus-visible:ring-offset-bg-base
          ${s.track}
          ${checked ? 'bg-brand-primary' : 'bg-white/[0.08] border border-border-default'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-sm
            transition-transform duration-200 ease-in-out
            ${s.thumb}
            ${checked ? s.translate : 'translate-x-0.5'}
          `}
        />
      </button>
      {label && (
        <span
          className={`${s.text} font-medium ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}
        >
          {label}
        </span>
      )}
    </label>
  )
}
