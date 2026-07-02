/**
 * Design System — Kbd (Atom)
 *
 * Keyboard shortcut display with premium styling.
 * Renders key combinations like Ctrl+K, ⌘+P, etc.
 */

import React from 'react'

interface KbdProps {
  keys: string | string[]
  className?: string
  size?: 'xs' | 'sm' | 'md'
}

const sizeMap = {
  xs: 'text-[9px] px-1 py-0 min-w-[16px] h-[16px]',
  sm: 'text-[10px] px-1.5 py-0.5 min-w-[18px] h-[18px]',
  md: 'text-[11px] px-2 py-0.5 min-w-[22px] h-[22px]'
}

export function Kbd({ keys, className = '', size = 'sm' }: KbdProps): React.JSX.Element {
  const keyList = typeof keys === 'string' ? keys.split('+').map((k) => k.trim()) : keys

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keyList.map((key, i) => (
        <React.Fragment key={`${key}-${i}`}>
          {i > 0 && <span className="text-text-disabled text-[9px] mx-0">+</span>}
          <kbd
            className={`
              inline-flex items-center justify-center
              rounded border font-mono font-semibold
              border-white/[0.08] bg-white/[0.04] text-text-muted
              shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]
              ${sizeMap[size]}
            `}
          >
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  )
}
