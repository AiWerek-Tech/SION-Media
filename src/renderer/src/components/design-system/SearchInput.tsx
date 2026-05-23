/**
 * Phase 5 — Design System: SearchInput
 *
 * Search input with leading icon, clear button, and optional keyboard hint.
 * Used in: Library Mode, Management Mode, Bible Screen, Command Palette.
 *
 * Replaces duplicated search input implementations across modes.
 */

import React, { forwardRef, useRef, useImperativeHandle } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Current search value */
  value: string
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Called when clear button clicked */
  onClear?: () => void
  /** Keyboard shortcut hint (e.g. "Ctrl+F") */
  kbdHint?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Full width */
  fullWidth?: boolean
}

const SIZE_MAP = {
  sm: { height: 28, fontSize: 11, iconSize: 13, padding: '0 8px 0 28px', iconLeft: 8 },
  md: { height: 32, fontSize: 12, iconSize: 14, padding: '0 10px 0 32px', iconLeft: 9 },
  lg: { height: 36, fontSize: 13, iconSize: 15, padding: '0 12px 0 36px', iconLeft: 10 }
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    onClear,
    kbdHint,
    size = 'md',
    fullWidth = false,
    placeholder = 'Cari...',
    className = '',
    ...props
  },
  ref
) {
  const innerRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => innerRef.current!)

  const s = SIZE_MAP[size]
  const hasValue = value.length > 0

  const handleClear = (): void => {
    onClear?.()
    innerRef.current?.focus()
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: fullWidth ? '100%' : undefined
      }}
    >
      {/* Search icon */}
      <Search
        size={s.iconSize}
        style={{
          position: 'absolute',
          left: s.iconLeft,
          color: 'var(--color-text-muted, #64748b)',
          pointerEvents: 'none',
          flexShrink: 0
        }}
        aria-hidden="true"
      />

      {/* Input */}
      <input
        ref={innerRef}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: fullWidth ? '100%' : undefined,
          height: s.height,
          fontSize: s.fontSize,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          color: 'var(--color-text-primary, #f8fafc)',
          background: 'var(--color-bg-elevated, #1b2031)',
          border: '1px solid var(--color-border-default, rgba(255,255,255,0.08))',
          borderRadius: 8,
          padding: s.padding,
          paddingRight: hasValue || kbdHint ? 60 : 10,
          outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s'
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'
          e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.12)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-default, rgba(255,255,255,0.08))'
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...props}
      />

      {/* Right side: clear button or kbd hint */}
      <div
        style={{
          position: 'absolute',
          right: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}
      >
        {hasValue && onClear && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              height: 16,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted, #64748b)',
              padding: 0,
              transition: 'background 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }}
          >
            <X size={10} />
          </button>
        )}
        {!hasValue && kbdHint && (
          <kbd
            style={{
              fontSize: 9,
              fontFamily: 'Inter, monospace',
              fontWeight: 700,
              color: 'var(--color-text-disabled, #475569)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '1px 4px',
              lineHeight: 1.4,
              whiteSpace: 'nowrap'
            }}
          >
            {kbdHint}
          </kbd>
        )}
      </div>
    </div>
  )
})
