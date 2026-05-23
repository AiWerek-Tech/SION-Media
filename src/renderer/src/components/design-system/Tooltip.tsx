/**
 * Design System — Tooltip (Atom)
 *
 * Hover tooltip with configurable delay and placement.
 * Uses Floating UI if available, otherwise CSS-only positioning.
 */

import React, { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  placement?: TooltipPlacement
  delay?: number
  disabled?: boolean
  className?: string
}

const placementStyles: Record<TooltipPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5'
}

const originMap: Record<TooltipPlacement, string> = {
  top: 'origin-bottom',
  bottom: 'origin-top',
  left: 'origin-right',
  right: 'origin-left'
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 400,
  disabled = false,
  className = ''
}: TooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => setVisible(true), delay)
  }, [delay, disabled])

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {visible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={`
              absolute z-[500] pointer-events-none
              ${placementStyles[placement]}
              ${originMap[placement]}
            `}
          >
            <div
              className="
                px-2.5 py-1.5 rounded-md text-[11px] font-medium
                bg-slate-800 text-slate-200 border border-white/[0.08]
                shadow-[0_4px_16px_rgba(0,0,0,0.4)]
                whitespace-nowrap max-w-[240px]
              "
            >
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
