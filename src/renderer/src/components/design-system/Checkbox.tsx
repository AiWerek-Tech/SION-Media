/**
 * Design System — Checkbox (Atom)
 *
 * Accessible checkbox with default, indeterminate, and disabled states.
 */

import React, { useRef, useEffect } from 'react'
import { Check, Minus } from 'lucide-react'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  indeterminate?: boolean
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  id?: string
}

const sizeMap = {
  sm: { box: 'w-3.5 h-3.5', icon: 10, text: 'text-[11px]' },
  md: { box: 'w-4 h-4', icon: 12, text: 'text-[12px]' }
}

export function Checkbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  disabled = false,
  size = 'md',
  className = '',
  id
}: CheckboxProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const s = sizeMap[size]

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const isActive = checked || indeterminate

  return (
    <label
      className={`
        inline-flex items-center gap-2 cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-checked={indeterminate ? 'mixed' : checked}
        />
        <div
          className={`
            ${s.box} rounded border flex items-center justify-center
            transition-all duration-150
            ${
              isActive
                ? 'bg-brand-primary border-brand-primary'
                : 'bg-bg-elevated border-border-default hover:border-border-strong'
            }
            ${disabled ? '' : 'cursor-pointer'}
          `}
        >
          {checked && !indeterminate && (
            <Check size={s.icon} className="text-white" strokeWidth={3} />
          )}
          {indeterminate && <Minus size={s.icon} className="text-white" strokeWidth={3} />}
        </div>
      </div>
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
