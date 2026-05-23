/**
 * ConfirmDialog — Replaces all window.confirm() calls
 *
 * Usage (async pattern):
 *   const confirmed = await useModalStore.getState().openAsync<boolean>(
 *     'confirm-delete',
 *     'confirm',
 *     { title: 'Hapus Lagu?', description: 'Tindakan ini tidak dapat dibatalkan.', danger: true }
 *   )
 *   if (confirmed) { ... }
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React, { useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'

interface ConfirmDialogProps {
  id: string
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** Async action to run on confirm — shows loading state */
  onConfirm?: () => Promise<void> | void
}

export function ConfirmDialog({
  id,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  danger = false,
  onConfirm
}: ConfirmDialogProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const closeById = useModalStore((s) => s.closeById)

  const handleCancel = (): void => {
    closeById(id, false)
  }

  const handleConfirm = async (): Promise<void> => {
    setError(null)
    if (onConfirm) {
      setLoading(true)
      try {
        await onConfirm()
        closeById(id, true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        setLoading(false)
      }
    } else {
      closeById(id, true)
    }
  }

  const Icon = danger ? AlertTriangle : Info
  const iconColor = danger ? '#f87171' : '#60a5fa'

  return (
    <Modal
      id={id}
      title={title}
      size="sm"
      dismissible={!loading}
      showClose={!loading}
      danger={danger}
      footer={
        <>
          <ModalButton onClick={handleCancel} disabled={loading} variant="secondary">
            {cancelLabel}
          </ModalButton>
          <ModalButton
            onClick={() => void handleConfirm()}
            loading={loading}
            variant={danger ? 'danger' : 'primary'}
          >
            {confirmLabel}
          </ModalButton>
        </>
      }
    >
      <div className="flex gap-4">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)' }}
        >
          <Icon size={20} color={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          {description && <p className="text-sm text-secondary leading-relaxed">{description}</p>}
          {error && (
            <p className="text-xs text-rose-400 mt-3 p-2 rounded-lg bg-rose-500/10">{error}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
