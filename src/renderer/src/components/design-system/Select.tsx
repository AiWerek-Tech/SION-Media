/**
 * Design System — Select (Atom)
 *
 * Custom dropdown select component matching the enterprise design tokens.
 * Supports native + custom rendering.
 */

import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  id?: string
}

const sizeMap = {
  sm: 'h-7 text-[11px] pl-2.5 pr-7',
  md: 'h-8 text-[12px] pl-3 pr-8',
  lg: 'h-9 text-[13px] pl-3.5 pr-9'
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  label,
  error,
  disabled = false,
  size = 'md',
  className = '',
  id
}: SelectProps): React.JSX.Element {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[11px] font-semibold text-text-secondary" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full rounded-lg border appearance-none cursor-pointer
            font-medium transition-all duration-150
            ${sizeMap[size]}
            ${
              error
                ? 'border-rose-500/40 bg-rose-500/[0.06] text-rose-300'
                : disabled
                  ? 'border-border-default bg-bg-base text-text-disabled cursor-not-allowed'
                  : 'border-border-default bg-bg-elevated text-text-primary hover:border-border-strong focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/40'
            }
            outline-none
          `}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>
      {error && <p className="text-[10px] text-rose-400 mt-0.5">{error}</p>}
    </div>
  )
}
