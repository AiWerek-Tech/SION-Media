/**
 * Phase 5 — Design System: MetricCard
 *
 * Dashboard metric card with icon, label, value, trend, and mini bar chart.
 * Used in: Management Mode summary grid.
 *
 * Replaces the inline metric card implementation in ManagementMode.tsx.
 * Accepts real data — no hardcoded values.
 */

import React from 'react'

interface MetricCardProps {
  /** Card label */
  label: string
  /** Primary value to display */
  value: string
  /** Secondary metadata line */
  meta?: string
  /** Trend label (e.g. "+12%", "stable", "aktif") */
  trend?: string
  /** Gradient class for the icon background (Tailwind) */
  tone?: string
  /** Icon node */
  icon?: React.ReactNode
  /** Mini bar chart data (0-100 values, 5-8 bars) */
  bars?: number[]
  /** Loading state — shows skeleton */
  loading?: boolean
  className?: string
}

export function MetricCard({
  label,
  value,
  meta,
  trend,
  tone = 'from-blue-400 to-cyan-300',
  icon,
  bars = [],
  loading = false,
  className = ''
}: MetricCardProps): React.JSX.Element {
  const maxBar = Math.max(...bars, 1)

  if (loading) {
    return (
      <div
        className={`management-summary-card ${className}`}
        style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              height: 12,
              width: '60%',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4
            }}
          />
          <div
            style={{
              height: 20,
              width: '40%',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 4
            }}
          />
          <div
            style={{
              height: 10,
              width: '80%',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 4
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`management-summary-card ${className}`}>
      <div className="management-summary-card__top">
        {/* Icon */}
        {icon && (
          <div
            className={`management-summary-card__icon bg-gradient-to-br ${tone}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        {/* Trend badge */}
        {trend && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              color: 'var(--color-text-muted, #64748b)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '1px 5px',
              marginLeft: 'auto'
            }}
          >
            {trend}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="management-summary-card__value">{value}</div>

      {/* Label */}
      <div className="management-summary-card__label">{label}</div>

      {/* Meta */}
      {meta && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--color-text-disabled, #475569)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 2,
            lineHeight: 1.4
          }}
        >
          {meta}
        </div>
      )}

      {/* Mini bar chart */}
      {bars.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            height: 20,
            marginTop: 8
          }}
          aria-hidden="true"
        >
          {bars.map((bar, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.round((bar / maxBar) * 100)}%`,
                minHeight: 2,
                background:
                  i === bars.length - 1
                    ? 'var(--color-brand-primary, #3b82f6)'
                    : 'rgba(255,255,255,0.10)',
                borderRadius: 2,
                transition: 'height 0.3s ease'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
