/**
 * Backup Settings Section
 * Handles database backup, restore, and reseed operations
 */

import React, { useState } from 'react'
import { Database, Info, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface BackupSettingsProps {
  onBackup: () => Promise<void>
  onRestore: (filePath: string) => Promise<void>
  onReseed: () => Promise<void>
}

export function BackupSettings({
  onBackup,
  onRestore,
  onReseed
}: BackupSettingsProps): React.JSX.Element {
  const { showToast, hymnals } = useAppStore()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isReseeding, setIsReseeding] = useState(false)
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false)
  const [integrityHymnalId, setIntegrityHymnalId] = useState<number | undefined>(undefined)
  const [showHymnalDropdown, setShowHymnalDropdown] = useState(false)

  const handleBackup = async (): Promise<void> => {
    try {
      setIsBackingUp(true)
      await onBackup()
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleIntegrityCheck = async (): Promise<void> => {
    try {
      setIsCheckingIntegrity(true)
      const report = await window.api.system.checkMultiHymnalIntegrity(integrityHymnalId)

      const dataStr = JSON.stringify(report, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
      const exportFileDefaultName = `sion-media-integrity-report-${new Date().toISOString().split('T')[0]}.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()

      showToast('Integrity report berhasil dibuat', 'success')
    } catch (err) {
      console.error('Integrity check failed:', err)
      showToast('Integrity check gagal', 'error')
    } finally {
      setIsCheckingIntegrity(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.db')) {
      return
    }

    try {
      setIsRestoring(true)
      const filePath = (file as File & { path?: string }).path
      if (!filePath) {
        return
      }
      if (confirm('Aplikasi akan memuat ulang setelah restore. Lanjutkan?')) {
        await onRestore(filePath)
        window.location.reload()
      }
    } finally {
      setIsRestoring(false)
    }
  }

  const handleReseed = async (): Promise<void> => {
    if (
      confirm(
        'Hapus semua lagu dan masukkan ulang data dari Daftar-Lagu-Sion.md? Ini akan menghapus lagu kustom Anda.'
      )
    ) {
      try {
        setIsReseeding(true)
        await onReseed()
      } finally {
        setIsReseeding(false)
      }
    }
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Backup & Pemulihan</h2>
        <p className="text-caption">Amankan database lagu dan pengaturan Anda.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-bg-surface border border-border-default space-y-4 flex flex-col">
          <div className="p-3 rounded-2xl bg-brand-primary/10 text-brand-primary w-fit">
            <Database size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-text-primary mb-1">Cadangkan Data</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Ekspor seluruh database lagu dan pengaturan ke dalam file cadangan (.db).
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="btn btn-primary w-full py-3"
          >
            {isBackingUp ? 'Memproses...' : 'Buat Backup Sekarang'}
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-bg-surface border border-border-default space-y-4 flex flex-col">
          <div className="p-3 rounded-2xl bg-brand-secondary/10 text-brand-secondary w-fit">
            <Info size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-text-primary mb-1">Pulihkan Data</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Impor file cadangan untuk mengembalikan data lagu yang telah disimpan sebelumnya.
            </p>
          </div>
          <label className="btn btn-ghost border-border-strong w-full py-3 cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleRestore}
              disabled={isRestoring}
              accept=".db"
            />
            {isRestoring ? 'Memulihkan...' : 'Pilih File Backup'}
          </label>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-status-error/20 bg-status-error/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-status-error/10 text-status-error">
            <Database size={20} />
          </div>
          <h4 className="text-sm font-bold text-status-error">Zona Berbahaya</h4>
        </div>
        <p className="text-xs text-text-secondary">
          Tombol di bawah akan menghapus seluruh lagu kustom dan mengembalikan database ke daftar
          lagu standar bawaan SION Media.
        </p>
        <button
          onClick={handleReseed}
          disabled={isReseeding}
          className="px-4 py-2 rounded-lg border border-status-error/30 text-status-error text-xs font-bold hover:bg-status-error hover:text-white transition-all"
        >
          {isReseeding ? 'Mereset...' : 'Reset Database ke Standar'}
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-bg-surface border border-border-default space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-text-primary">Integrity Check (Multi-Hymnal)</h4>
            <p className="text-xs text-text-muted leading-relaxed mt-1">
              Buat laporan duplikat nomor/judul per hymnal dan cek orphan records. Laporan akan
              diunduh sebagai JSON.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Hymnal selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowHymnalDropdown(!showHymnalDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-base text-xs text-text-secondary hover:bg-bg-elevated transition-colors"
              >
                {integrityHymnalId
                  ? hymnals.find((h) => h.id === integrityHymnalId)?.code
                  : 'Semua'}
                <ChevronDown size={12} />
              </button>
              {showHymnalDropdown && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border-strong bg-bg-surface/98 shadow-lg py-1">
                  <button
                    onClick={() => {
                      setIntegrityHymnalId(undefined)
                      setShowHymnalDropdown(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs ${
                      integrityHymnalId === undefined
                        ? 'text-brand-primary font-semibold bg-brand-primary/10'
                        : 'text-text-secondary hover:bg-bg-elevated'
                    }`}
                  >
                    Semua Hymnal
                  </button>
                  {hymnals.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setIntegrityHymnalId(h.id)
                        setShowHymnalDropdown(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs ${
                        integrityHymnalId === h.id
                          ? 'text-brand-primary font-semibold bg-brand-primary/10'
                          : 'text-text-secondary hover:bg-bg-elevated'
                      }`}
                    >
                      {h.code} - {h.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleIntegrityCheck}
              disabled={isCheckingIntegrity}
              className="btn btn-secondary h-9 px-4"
            >
              {isCheckingIntegrity ? 'Memeriksa...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
