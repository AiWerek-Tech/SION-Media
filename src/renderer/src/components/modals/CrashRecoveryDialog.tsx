/**
 * CrashRecoveryDialog — MM-003
 *
 * Shown on app startup when needsRecovery = true.
 * Triggered by useCrashRecovery hook via useModalStore.
 *
 * @see implementation-master-order-v1.md §3.4 Phase 3
 */

import React from 'react'
import { ShieldAlert, Music2, ListMusic, Layers } from 'lucide-react'
import { Modal, ModalButton } from './Modal'
import { useModalStore } from '../../store/useModalStore'
import { useAppStore } from '../../store/useAppStore'
import type { RecoveryState } from '../../types'

interface CrashRecoveryDialogProps {
  id: string
  recoveryState: RecoveryState
  onRestore: () => void
  onDismiss: () => void
}

export function CrashRecoveryDialog({
  id,
  recoveryState,
  onRestore,
  onDismiss
}: CrashRecoveryDialogProps): React.JSX.Element {
  const closeById = useModalStore((s) => s.closeById)
  const songs = useAppStore((s) => s.songs)

  const song = recoveryState.songId ? songs.find((s) => s.id === recoveryState.songId) : null

  const handleRestore = (): void => {
    onRestore()
    closeById(id, true)
  }

  const handleDismiss = (): void => {
    onDismiss()
    closeById(id, false)
  }

  return (
    <Modal
      id={id}
      title="Pulihkan sesi sebelumnya?"
      subtitle="SION Media Crash Recovery System"
      size="md"
      dismissible={false}
      showClose={false}
      footer={
        <>
          <ModalButton onClick={handleDismiss} variant="secondary">
            Mulai Baru
          </ModalButton>
          <ModalButton onClick={handleRestore} variant="primary">
            Pulihkan Sesi
          </ModalButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Alert Banner / Shield Integration */}
        <div className="sp-recovery-banner">
          <div className="sp-modal-icon-wrap sp-modal-icon-wrap--warning">
            <ShieldAlert size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-200">
              Aplikasi tidak ditutup dengan benar
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Sesi ibadah sebelumnya terdeteksi. Pulihkan sekarang untuk melanjutkan presentasi dan
              playlist dari titik terakhir Anda aktif.
            </p>
          </div>
        </div>

        {/* Data to Restore Section */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.12em] opacity-80 mx-1">
            Data yang akan dipulihkan
          </p>

          <div className="sp-modal-card flex flex-col gap-3.5">
            {recoveryState.playlistId && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <ListMusic size={14} className="text-text-muted" />
                  <span className="font-medium">Playlist Aktif</span>
                </div>
                <span className="font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded text-[11px] border border-brand-primary/15">
                  ID: {recoveryState.playlistId}
                </span>
              </div>
            )}

            {recoveryState.songId && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Music2 size={14} className="text-text-muted" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-muted">Lagu Terakhir</span>
                    <span className="font-semibold text-slate-200 text-[13px]">
                      {song ? song.title : 'Lagu Sion'}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded text-[11px] border border-brand-primary/15">
                  {song
                    ? `${song.hymnal_code || 'LS'} No. ${song.number}`
                    : `ID: ${recoveryState.songId}`}
                </span>
              </div>
            )}

            {recoveryState.slideIndex !== undefined && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Layers size={14} className="text-text-muted" />
                  <span className="font-medium">Slide Terakhir</span>
                </div>
                <span className="font-semibold text-slate-200 bg-white/5 px-2 py-0.5 rounded text-[11px] border border-white/10">
                  Slide #{(recoveryState.slideIndex ?? 0) + 1}
                </span>
              </div>
            )}

            {recoveryState.projectionState && recoveryState.projectionState !== 'CLEAR' && (
              <div className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      recoveryState.projectionState === 'LIVE'
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]'
                        : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                    }`}
                  />
                  <span className="font-medium">Status Proyektor</span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    recoveryState.projectionState === 'LIVE'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/15'
                  }`}
                >
                  {recoveryState.projectionState}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
