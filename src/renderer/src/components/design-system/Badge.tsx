/**
 * Phase 5 — Design System: Badge
 *
 * Status badges, count badges, and label badges.
 * Variants: success, warning, error, info, neutral, live, draft
 * Sizes: sm, md, lg
 */

import React from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'live' | 'draft'

export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  /** Show pulsing dot indicator */
  dot?: boolean
  /** Animate dot (for LIVE state) */
  pulse?: boolean
  children: React.ReactNode
  className?: string
}

const VARIANT_STYLES: Record<
  BadgeVariant,
  { bg: string; text: string; border: string; dot: string }
> = {
  success: {
    bg: 'rgba(34,197,94,0.10)',
    text: '#4ade80',
    border: 'rgba(34,197,94,0.20)',
    dot: '#22c55e'
  },
  warning: {
    bg: 'rgba(245,158,11,0.10)',
    text: '#fbbf24',
    border: 'rgba(245,158,11,0.20)',
    dot: '#f59e0b'
  },
  error: {
    bg: 'rgba(239,68,68,0.10)',
    text: '#f87171',
    border: 'rgba(239,68,68,0.20)',
    dot: '#ef4444'
  },
  info: {
    bg: 'rgba(59,130,246,0.10)',
    text: '#60a5fa',
    border: 'rgba(59,130,246,0.20)',
    dot: '#3b82f6'
  },
  neutral: {
    bg: 'rgba(255,255,255,0.06)',
    text: 'rgba(255,255,255,0.5)',
    border: 'rgba(255,255,255,0.08)',
    dot: 'rgba(255,255,255,0.4)'
  },
  live: {
    bg: 'rgba(255,59,48,0.12)',
    text: '#ff6b6b',
    border: 'rgba(255,59,48,0.25)',
    dot: '#ff3b30'
  },
  draft: {
    bg: 'rgba(100,116,139,0.10)',
    text: '#94a3b8',
    border: 'rgba(100,116,139,0.15)',
    dot: '#64748b'
  }
}

const SIZE_STYLES: Record<
  BadgeSize,
  { padding: string; fontSize: number; dotSize: number; gap: number; radius: number }
> = {
  sm: { padding: '1px 6px', fontSize: 10, dotSize: 5, gap: 4, radius: 4 },
  md: { padding: '2px 8px', fontSize: 11, dotSize: 6, gap: 5, radius: 5 },
  lg: { padding: '3px 10px', fontSize: 12, dotSize: 7, gap: 6, radius: 6 }
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  className = ''
}: BadgeProps): React.JSX.Element {
  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.03em',
        color: v.text,
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: s.radius,
        lineHeight: 1.4,
        whiteSpace: 'nowrap' as const
      }}
    >
      {dot && (
        <span
          style={{
            width: s.dotSize,
            height: s.dotSize,
            borderRadius: '50%',
            background: v.dot,
            flexShrink: 0,
            animation: pulse ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined
          }}
        />
      )}
      {children}
    </span>
  )
}
