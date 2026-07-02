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
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useModalStore } from '../../store/useModalStore'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'sp-modal--sm',
  md: 'sp-modal--md',
  lg: 'sp-modal--lg',
  xl: 'sp-modal--xl'
}

let bodyScrollLockCount = 0
let bodyOverflowBeforeLock = ''

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
  /** Controlled close handler. Store-backed dialogs may omit this. */
  onClose?: () => void
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
  onClose,
  children,
  footer
}: ModalProps): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const isTopModal = useModalStore((s) => s.stack.length === 0 || s.stack.at(-1)?.id === id)
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
  )

  const handleClose = useCallback(() => {
    if (onClose) onClose()
    else closeById(id)
  }, [closeById, id, onClose])

  // Focus trap — focus first focusable element on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstContentControl = container.querySelector<HTMLElement>(
      '[data-modal-autofocus], [autofocus]'
    )
    const first = firstContentControl ?? focusable[0]
    if (first) {
      // Small delay to allow animation to start
      const t = setTimeout(() => first.focus(), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [])

  useEffect(() => {
    const previouslyFocused = previouslyFocusedRef.current
    if (bodyScrollLockCount === 0) {
      bodyOverflowBeforeLock = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    bodyScrollLockCount += 1

    return () => {
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
      if (bodyScrollLockCount === 0) document.body.style.overflow = bodyOverflowBeforeLock
      previouslyFocused?.focus()
    }
  }, [])

  // Escape key — close top modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (!dismissible || !isTopModal) return
        e.preventDefault()
        e.stopPropagation()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [dismissible, handleClose, isTopModal])

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return
    const container = containerRef.current
    if (!container) return
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true')
    if (focusable.length === 0) {
      event.preventDefault()
      container.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        className="sp-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={dismissible && isTopModal ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Container */}
      <div
        className="sp-modal-viewport"
        role="dialog"
        aria-modal={isTopModal}
        aria-hidden={!isTopModal}
        inert={!isTopModal}
        aria-labelledby={`modal-title-${id}`}
        onKeyDown={handleDialogKeyDown}
      >
        <motion.div
          ref={containerRef}
          className={`sp-modal ${SIZE_CLASSES[size]}`}
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
          <div className="sp-modal__header">
            <div className="sp-modal__heading">
              <h2
                id={`modal-title-${id}`}
                className="sp-modal__title"
                style={{ fontFamily: 'Poppins, Inter, sans-serif' }}
              >
                {title}
              </h2>
              {subtitle && <p className="sp-modal__subtitle">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={handleClose}
                className="sp-modal__close"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="sp-modal__body">{children}</div>

          {/* Footer */}
          {footer && <div className="sp-modal__footer">{footer}</div>}
        </motion.div>
      </div>
    </>,
    document.body
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`sp-modal-btn sp-modal-btn--${variant}`}
    >
      {loading ? 'Memproses...' : children}
    </button>
  )
}
