/**
 * Phase 5 — Design System: SegmentedControl
 *
 * Tab-like filter/selector buttons with animated active indicator.
 * Used in: Library Mode workspace tabs, Management Mode filters,
 *          Bible Screen testament selector.
 *
 * Replaces ad-hoc tab implementations across modes.
 */

import React from 'react'
import { motion } from 'framer-motion'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: string
  /** Optional icon node */
  icon?: React.ReactNode
  /** Optional count badge */
  count?: number
  /** Disable this option */
  disabled?: boolean
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md' | 'lg'
  /** Full width — each option takes equal space */
  fullWidth?: boolean
  className?: string
  /** Unique ID for the animated indicator (required when multiple on page) */
  layoutId?: string
}

const SIZE_MAP = {
  sm: { height: 26, fontSize: 10, px: 8, gap: 4, radius: 6, outerRadius: 8 },
  md: { height: 30, fontSize: 11, px: 10, gap: 5, radius: 7, outerRadius: 9 },
  lg: { height: 34, fontSize: 12, px: 12, gap: 6, radius: 8, outerRadius: 10 }
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
  layoutId = 'segmented-indicator'
}: SegmentedControlProps<T>): React.JSX.Element {
  const s = SIZE_MAP[size]

  return (
    <div
      className={className}
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: 3,
        background: 'var(--color-bg-elevated, #1b2031)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: s.outerRadius,
        width: fullWidth ? '100%' : undefined
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: s.gap,
              height: s.height,
              padding: `0 ${s.px}px`,
              fontSize: s.fontSize,
              fontWeight: isActive ? 700 : 500,
              fontFamily: 'Inter, sans-serif',
              color: isActive
                ? 'var(--color-text-primary, #f8fafc)'
                : 'var(--color-text-muted, #64748b)',
              background: 'transparent',
              border: 'none',
              borderRadius: s.radius,
              cursor: opt.disabled ? 'not-allowed' : 'pointer',
              opacity: opt.disabled ? 0.4 : 1,
              transition: 'color 0.15s',
              flex: fullWidth ? 1 : undefined,
              whiteSpace: 'nowrap',
              zIndex: 1
            }}
            onMouseEnter={(e) => {
              if (!isActive && !opt.disabled) {
                e.currentTarget.style.color = 'var(--color-text-secondary, #94a3b8)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--color-text-muted, #64748b)'
              }
            }}
          >
            {/* Animated active background */}
            {isActive && (
              <motion.span
                layoutId={layoutId}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--color-bg-active, #2d3450)',
                  borderRadius: s.radius,
                  border: '1px solid rgba(255,255,255,0.08)',
                  zIndex: -1
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}

            {/* Icon */}
            {opt.icon && (
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {opt.icon}
              </span>
            )}

            {/* Label */}
            {opt.label}

            {/* Count badge */}
            {opt.count !== undefined && (
              <span
                style={{
                  fontSize: s.fontSize - 1,
                  fontWeight: 700,
                  color: isActive
                    ? 'var(--color-text-secondary, #94a3b8)'
                    : 'var(--color-text-disabled, #475569)',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 4,
                  padding: '0 4px',
                  lineHeight: 1.6,
                  minWidth: 16,
                  textAlign: 'center'
                }}
              >
                {opt.count > 999 ? '999+' : opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
