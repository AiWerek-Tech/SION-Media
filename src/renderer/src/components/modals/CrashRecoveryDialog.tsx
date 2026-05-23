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
      <div
        className="flex flex-col gap-5"
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Alert Banner / Shield Integration */}
        <div
          className="flex gap-4 items-start p-4 rounded-xl"
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'start',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.1)'
          }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}
          >
            <ShieldAlert size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div
            className="space-y-1"
            style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
          >
            <h4
              className="text-sm font-semibold text-slate-200"
              style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}
            >
              Aplikasi tidak ditutup dengan benar
            </h4>
            <p
              className="text-xs text-slate-400 leading-relaxed"
              style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.625', margin: 0 }}
            >
              Sesi ibadah sebelumnya terdeteksi. Pulihkan sekarang untuk melanjutkan presentasi dan
              playlist dari titik terakhir Anda aktif.
            </p>
          </div>
        </div>

        {/* Data to Restore Section */}
        <div
          className="space-y-3"
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <p
            className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em] opacity-80"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              opacity: 0.8,
              margin: '0 4px'
            }}
          >
            Data yang akan dipulihkan
          </p>

          <div
            className="rounded-xl p-4 flex flex-col gap-3.5"
            style={{
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.02)'
            }}
          >
            {recoveryState.playlistId && (
              <div
                className="flex items-center justify-between text-xs p-1.5 rounded-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '6px'
                }}
              >
                <div
                  className="flex items-center gap-2.5 text-slate-300"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}
                >
                  <ListMusic size={14} style={{ color: '#64748b' }} />
                  <span className="font-medium" style={{ fontWeight: 500 }}>
                    Playlist Aktif
                  </span>
                </div>
                <span
                  className="font-semibold"
                  style={{
                    fontWeight: 600,
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(99, 102, 241, 0.15)'
                  }}
                >
                  ID: {recoveryState.playlistId}
                </span>
              </div>
            )}

            {recoveryState.songId && (
              <div
                className="flex items-center justify-between text-xs p-1.5 rounded-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '6px'
                }}
              >
                <div
                  className="flex items-center gap-2.5 text-slate-300"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}
                >
                  <Music2 size={14} style={{ color: '#64748b' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      className="text-[10px] text-slate-500"
                      style={{ fontSize: '10px', color: '#64748b' }}
                    >
                      Lagu Terakhir
                    </span>
                    <span
                      className="font-semibold text-slate-200"
                      style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}
                    >
                      {song ? song.title : 'Lagu Sion'}
                    </span>
                  </div>
                </div>
                <span
                  className="font-semibold"
                  style={{
                    fontWeight: 600,
                    color: '#818cf8',
                    background: 'rgba(99, 102, 241, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(99, 102, 241, 0.15)'
                  }}
                >
                  {song
                    ? `${song.hymnal_code || 'LS'} No. ${song.number}`
                    : `ID: ${recoveryState.songId}`}
                </span>
              </div>
            )}

            {recoveryState.slideIndex !== undefined && (
              <div
                className="flex items-center justify-between text-xs p-1.5 rounded-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '6px'
                }}
              >
                <div
                  className="flex items-center gap-2.5 text-slate-300"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}
                >
                  <Layers size={14} style={{ color: '#64748b' }} />
                  <span className="font-medium" style={{ fontWeight: 500 }}>
                    Slide Terakhir
                  </span>
                </div>
                <span
                  className="font-semibold"
                  style={{
                    fontWeight: 600,
                    color: '#cbd5e1',
                    background: '#1e293b',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #334155'
                  }}
                >
                  Slide #{(recoveryState.slideIndex ?? 0) + 1}
                </span>
              </div>
            )}

            {recoveryState.projectionState && recoveryState.projectionState !== 'CLEAR' && (
              <div
                className="flex items-center justify-between text-xs p-1.5 rounded-lg"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '6px'
                }}
              >
                <div
                  className="flex items-center gap-2.5 text-slate-300"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)',
                      background: recoveryState.projectionState === 'LIVE' ? '#22c55e' : '#f59e0b'
                    }}
                  />
                  <span className="font-medium" style={{ fontWeight: 500 }}>
                    Status Proyektor
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    color: recoveryState.projectionState === 'LIVE' ? '#34d399' : '#fbbf24',
                    background:
                      recoveryState.projectionState === 'LIVE'
                        ? 'rgba(52, 211, 153, 0.1)'
                        : 'rgba(251, 191, 36, 0.1)',
                    border:
                      recoveryState.projectionState === 'LIVE'
                        ? '1px solid rgba(52, 211, 153, 0.15)'
                        : '1px solid rgba(251, 191, 36, 0.15)'
                  }}
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
