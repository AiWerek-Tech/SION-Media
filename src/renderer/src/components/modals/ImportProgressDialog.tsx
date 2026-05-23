/**
 * Phase 3 — ImportProgressDialog (MM-005)
 *
 * Displays progress and result summary for JSON / SION imports.
 */

import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useAppStore } from '../../store/useAppStore'

interface ImportProgressDialogProps {
  id: string
  /** Raw file text content */
  rawText: string
  targetHymnalId: number
}

interface ImportReport {
  inserted: number
  skipped: number
  failed: number
  errors: string[]
}

export function ImportProgressDialog({
  id,
  rawText,
  targetHymnalId
}: ImportProgressDialogProps): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const loadSongs = useAppStore((s) => s.loadSongs)

  const [status, setStatus] = useState<'parsing' | 'importing' | 'success' | 'error'>('parsing')
  const [report, setReport] = useState<ImportReport | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true
    const runImport = async (): Promise<void> => {
      try {
        const parsed = JSON.parse(rawText) as unknown
        const items = Array.isArray(parsed)
          ? parsed
          : parsed &&
              typeof parsed === 'object' &&
              Array.isArray((parsed as { songs?: unknown[] }).songs)
            ? (parsed as { songs: unknown[] }).songs
            : []

        if (items.length === 0) {
          if (isMounted) {
            setStatus('error')
            setErrorMessage('Format JSON tidak berisi array lagu yang valid.')
          }
          return
        }

        if (isMounted) setStatus('importing')

        const result = await window.api.songs.importJson({
          items,
          defaultHymnalId: targetHymnalId,
          conflictPolicy: 'skip',
          dryRun: false
        })

        if (isMounted) {
          setReport({
            inserted: result.inserted,
            skipped: result.skipped,
            failed: result.failed || 0,
            errors: (result.errors || []).map((e: unknown) =>
              typeof e === 'string' ? e : (e as { message?: string }).message || 'Unknown error'
            )
          })
          setStatus('success')
          loadSongs(targetHymnalId)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error('Gagal mengimpor file.')
          setStatus('error')
          setErrorMessage(error.message)
        }
      }
    }

    runImport()
    return () => {
      isMounted = false
    }
  }, [rawText, targetHymnalId, loadSongs])

  return (
    <Modal
      id={id}
      title="Import Lagu"
      size="sm"
      dismissible={status === 'success' || status === 'error'}
      showClose={status === 'success' || status === 'error'}
      footer={
        (status === 'success' || status === 'error') && (
          <ModalButton variant="primary" onClick={() => closeById(id, status === 'success')}>
            Tutup
          </ModalButton>
        )
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {status === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
            <p className="text-[13px] font-medium text-text-secondary">Menganalisis file JSON...</p>
          </div>
        )}

        {status === 'importing' && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
            <p className="text-[13px] font-medium text-text-primary">Menyimpan ke database...</p>
            <p className="text-[11px] text-text-muted">
              Proses ini mungkin memakan waktu beberapa detik.
            </p>
          </div>
        )}

        {status === 'success' && report && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-text-primary mb-1">Import Selesai</h3>
              <p className="text-[12px] text-text-secondary">
                Database telah diperbarui dengan data baru.
              </p>
            </div>

            <div className="w-full bg-white/[0.02] border border-border-subtle rounded-xl p-4 flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-emerald-400">
                  Berhasil Disimpan
                </span>
                <span className="text-[13px] font-bold text-text-primary">{report.inserted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-amber-400">
                  Dilewati (Duplikat)
                </span>
                <span className="text-[13px] font-bold text-text-primary">{report.skipped}</span>
              </div>
              {report.failed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-danger">Gagal</span>
                  <span className="text-[13px] font-bold text-danger">{report.failed}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-2">
              <XCircle size={24} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-text-primary mb-1">Import Gagal</h3>
              <p className="text-[12px] text-text-secondary text-danger leading-relaxed max-w-[250px]">
                {errorMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
