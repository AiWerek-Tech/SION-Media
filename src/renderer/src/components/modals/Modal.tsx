/**
 * Modal — Base Component
 *
 * Foundation for all modal dialogs in SION Media.
 * Provides: backdrop, focus trap, Escape key, size variants, animation.
 *
 * Rules:
 *   - Escape closes TOP modal only (handled by useModalStore)
 *   - Backdrop click: dismissible modals only
 *   - Focus trap: first focusable element on open
 *   - z-index: z-[1350] backdrop, z-[1400] container
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useModalStore } from '../../store/useModalStore'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'w-full max-w-sm',
  md: 'w-full max-w-md',
  lg: 'w-full max-w-lg',
  xl: 'w-full max-w-2xl'
}

interface ModalProps {
  /** Modal ID — used to close this specific modal */
  id: string
  /** Title shown in header */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Size variant */
  size?: ModalSize
  /** Whether backdrop click closes the modal */
  dismissible?: boolean
  /** Whether to show the X close button */
  showClose?: boolean
  /** Whether this is a destructive action (red accent) */
  danger?: boolean
  /** Content */
  children: React.ReactNode
  /** Optional footer content */
  footer?: React.ReactNode
}

export function Modal({
  id,
  title,
  subtitle,
  size = 'md',
  dismissible = true,
  showClose = true,
  danger = false,
  children,
  footer
}: ModalProps): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => {
    closeById(id)
  }, [closeById, id])

  // Focus trap — focus first focusable element on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    if (first) {
      // Small delay to allow animation to start
      const t = setTimeout(() => first.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [])

  // Escape key — close top modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [handleClose])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="sp-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={dismissible ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Container */}
      <div
        className="fixed inset-0 z-[1400] flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`modal-title-${id}`}
      >
        <motion.div
          ref={containerRef}
          className={`sp-modal pointer-events-auto ${SIZE_CLASSES[size]} relative flex flex-col`}
          style={{
            border: danger ? '1px solid rgba(239,68,68,0.35)' : undefined
          }}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sp-modal__header flex items-start justify-between">
            <div>
              <h2
                id={`modal-title-${id}`}
                className="sp-modal__title"
                style={{ fontFamily: 'Poppins, Inter, sans-serif' }}
              >
                {title}
              </h2>
              {subtitle && <p className="text-xs text-slate-400 mt-1 leading-normal">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={handleClose}
                className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="sp-modal__body flex-1 overflow-y-auto min-h-0">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="sp-modal__footer flex items-center justify-end gap-3">{footer}</div>
          )}
        </motion.div>
      </div>
    </>
  )
}

/** Reusable button variants for modal footers */
export function ModalButton({
  onClick,
  disabled,
  loading,
  variant = 'secondary',
  children
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}): React.JSX.Element {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-brand-primary, #3b82f6)',
      color: '#fff',
      border: 'none'
    },
    secondary: {
      background: 'rgba(255,255,255,0.06)',
      color: 'var(--color-text-secondary, rgba(255,255,255,0.7))',
      border: '1px solid rgba(255,255,255,0.08)'
    },
    danger: {
      background: 'rgba(239,68,68,0.15)',
      color: '#f87171',
      border: '1px solid rgba(239,68,68,0.3)'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        padding: '8px 16px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'opacity 0.15s, background 0.15s',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {loading ? 'Memproses...' : children}
    </button>
  )
}
