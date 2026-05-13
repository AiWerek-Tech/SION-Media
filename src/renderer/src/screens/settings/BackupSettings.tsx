/**
 * Backup Settings — Enterprise Functional Redesign
 * All controls wired to real APIs: createBackup, restoreBackup, reseed, checkIntegrity, getMemory
 */

import React, { useEffect, useState } from 'react'
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  ChevronDown,
  Clock,
  CheckCircle2,
  FolderOpen,
  Activity
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface BackupSettingsProps {
  onBackup?: () => Promise<void>
  onRestore: (filePath: string) => Promise<void>
  onReseed: () => Promise<void>
}

interface MemoryInfo {
  private: number
  shared: number
}

export function BackupSettings({ onRestore, onReseed }: BackupSettingsProps): React.JSX.Element {
  const { showToast, hymnals, songs } = useAppStore()
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isReseeding, setIsReseeding] = useState(false)
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false)
  const [integrityHymnalId, setIntegrityHymnalId] = useState<number | undefined>(undefined)
  const [showHymnalDropdown, setShowHymnalDropdown] = useState(false)
  const [lastBackupPath, setLastBackupPath] = useState<string>('')
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null)
  const [customBackupPath, setCustomBackupPath] = useState('')

  useEffect(() => {
    window.api.system
      .getMemory()
      .then((mem) => {
        if (mem) setMemoryInfo(mem as MemoryInfo)
      })
      .catch(() => {})
  }, [])

  const handleBackup = async (): Promise<void> => {
    try {
      setIsBackingUp(true)
      const path = (await window.api.system.createBackup(customBackupPath || undefined)) as string
      setLastBackupPath(path)
      showToast(`Backup berhasil: ${path}`, 'success')
    } catch {
      showToast('Backup gagal', 'error')
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
      const name = `sion-media-integrity-report-${new Date().toISOString().split('T')[0]}.json`
      const a = document.createElement('a')
      a.setAttribute('href', dataUri)
      a.setAttribute('download', name)
      a.click()
      showToast('Integrity report berhasil dibuat', 'success')
    } catch {
      showToast('Integrity check gagal', 'error')
    } finally {
      setIsCheckingIntegrity(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file || !file.name.endsWith('.db')) return
    try {
      setIsRestoring(true)
      const filePath = (file as File & { path?: string }).path
      if (!filePath) return
      if (
        confirm(
          'Aplikasi akan memuat ulang setelah restore. Semua perubahan yang belum disimpan akan hilang. Lanjutkan?'
        )
      ) {
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
        'Hapus semua lagu kustom dan kembalikan ke data standar SION Media? Tindakan ini TIDAK DAPAT DIBATALKAN.'
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

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Backup &amp; Pemulihan</h2>
        <p className="sp-page-subtitle">
          Amankan database lagu, pengaturan, dan kelola restore points sistem SION Media.
        </p>
      </div>

      {/* Storage Overview */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <HardDrive size={13} />
            Status Sistem
          </div>
          <p className="sp-section-desc">Ringkasan kondisi database dan penggunaan memori.</p>
        </div>
        <div className="sp-metric-grid sp-metric-grid--4">
          <div className="sp-metric-card sp-metric-card--blue">
            <div className="sp-metric-card__icon">
              <Database size={18} />
            </div>
            <div className="sp-metric-card__value">{hymnals.length}</div>
            <div className="sp-metric-card__label">Buku Lagu</div>
          </div>
          <div className="sp-metric-card sp-metric-card--violet">
            <div className="sp-metric-card__icon">
              <Database size={18} />
            </div>
            <div className="sp-metric-card__value">{songs.length.toLocaleString('id-ID')}</div>
            <div className="sp-metric-card__label">Total Lagu</div>
          </div>
          <div className="sp-metric-card sp-metric-card--emerald">
            <div className="sp-metric-card__icon">
              <CheckCircle2 size={18} />
            </div>
            <div className="sp-metric-card__value">OK</div>
            <div className="sp-metric-card__label">Status DB</div>
          </div>
          <div className="sp-metric-card sp-metric-card--blue">
            <div className="sp-metric-card__icon">
              <Activity size={18} />
            </div>
            <div className="sp-metric-card__value">
              {memoryInfo ? formatBytes(memoryInfo.private) : '—'}
            </div>
            <div className="sp-metric-card__label">Memori Privat</div>
          </div>
        </div>
      </section>

      {/* Backup */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Database size={13} />
            Cadangan Data
          </div>
          <p className="sp-section-desc">
            Ekspor database ke file cadangan (.db) yang dapat dipulihkan kapan saja.
          </p>
        </div>
        <div className="sp-action-card sp-action-card--blue">
          <div className="sp-action-card__icon">
            <Download size={22} />
          </div>
          <div className="sp-action-card__body">
            <h4 className="sp-action-card__title">Buat Backup Database</h4>
            <p className="sp-action-card__desc">
              Ekspor seluruh database lagu, playlist, pengaturan, dan media metadata ke file
              cadangan.
            </p>
            <div className="sp-bg-file-row" style={{ marginTop: 12 }}>
              <input
                type="text"
                value={customBackupPath}
                onChange={(e) => setCustomBackupPath(e.target.value)}
                placeholder="Lokasi backup (opsional, default: folder Dokumen)"
                className="sp-input"
                style={{ flex: 1 }}
              />
            </div>
            {lastBackupPath && (
              <p style={{ marginTop: 8, fontSize: 11, color: 'var(--color-emerald-400)' }}>
                ✓ Terakhir disimpan: {lastBackupPath}
              </p>
            )}
          </div>
          <button className="sp-btn sp-btn--primary" onClick={handleBackup} disabled={isBackingUp}>
            {isBackingUp ? (
              <>
                <RefreshCw size={14} className="sp-btn__spin" />
                Memproses...
              </>
            ) : (
              <>
                <Download size={14} />
                Buat Backup
              </>
            )}
          </button>
        </div>
      </section>

      {/* Restore */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Upload size={13} />
            Pulihkan Data
          </div>
          <p className="sp-section-desc">
            Impor file cadangan (.db) untuk mengembalikan data. Aplikasi akan restart otomatis.
          </p>
        </div>
        <div className="sp-action-card sp-action-card--violet">
          <div className="sp-action-card__icon">
            <Upload size={22} />
          </div>
          <div className="sp-action-card__body">
            <h4 className="sp-action-card__title">Pulihkan dari File Backup</h4>
            <p className="sp-action-card__desc">
              Pilih file .db yang sebelumnya dibuat oleh SION Media. Data saat ini akan digantikan
              sepenuhnya.
            </p>
          </div>
          <label className="sp-btn sp-btn--ghost" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              className="hidden"
              onChange={handleRestore}
              disabled={isRestoring}
              accept=".db"
            />
            {isRestoring ? (
              <>
                <RefreshCw size={14} className="sp-btn__spin" />
                Memulihkan...
              </>
            ) : (
              <>
                <FolderOpen size={14} />
                Pilih File Backup
              </>
            )}
          </label>
        </div>
      </section>

      {/* Integrity Check */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <ShieldCheck size={13} />
            Integrity Check
          </div>
          <p className="sp-section-desc">
            Periksa duplikat nomor/judul per hymnal dan orphan records. Laporan diunduh sebagai
            JSON.
          </p>
        </div>
        <div className="sp-integrity-panel">
          <div className="sp-integrity-panel__left">
            <div className="sp-integrity-panel__icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="sp-integrity-panel__title">Multi-Hymnal Integrity Report</div>
              <div className="sp-integrity-panel__desc">
                Deteksi duplikat nomor lagu, judul ganda, dan orphan records per buku lagu.
              </div>
            </div>
          </div>
          <div className="sp-integrity-panel__right">
            <div className="sp-dropdown-wrap">
              <button
                className="sp-dropdown-btn"
                onClick={() => setShowHymnalDropdown(!showHymnalDropdown)}
              >
                {integrityHymnalId
                  ? hymnals.find((h) => h.id === integrityHymnalId)?.code
                  : 'Semua Hymnal'}
                <ChevronDown size={13} />
              </button>
              {showHymnalDropdown && (
                <div className="sp-dropdown-menu">
                  <button
                    className={`sp-dropdown-item ${!integrityHymnalId ? 'is-active' : ''}`}
                    onClick={() => {
                      setIntegrityHymnalId(undefined)
                      setShowHymnalDropdown(false)
                    }}
                  >
                    Semua Hymnal
                  </button>
                  {hymnals.map((h) => (
                    <button
                      key={h.id}
                      className={`sp-dropdown-item ${integrityHymnalId === h.id ? 'is-active' : ''}`}
                      onClick={() => {
                        setIntegrityHymnalId(h.id)
                        setShowHymnalDropdown(false)
                      }}
                    >
                      {h.code} — {h.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="sp-btn sp-btn--ghost"
              onClick={handleIntegrityCheck}
              disabled={isCheckingIntegrity}
            >
              {isCheckingIntegrity ? (
                <>
                  <RefreshCw size={14} className="sp-btn__spin" />
                  Memeriksa...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Last Backup Info */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Clock size={13} />
            Riwayat Backup
          </div>
          <p className="sp-section-desc">Informasi backup terakhir yang dibuat dalam sesi ini.</p>
        </div>
        <div className="sp-info-grid">
          {[
            {
              label: 'Backup Terakhir',
              value: lastBackupPath
                ? new Date().toLocaleString('id-ID')
                : 'Belum ada backup sesi ini'
            },
            { label: 'Lokasi File', value: lastBackupPath || '—' },
            { label: 'Total Lagu', value: songs.length.toLocaleString('id-ID') },
            { label: 'Total Hymnal', value: hymnals.length.toString() },
            { label: 'Memori Privat', value: memoryInfo ? formatBytes(memoryInfo.private) : '—' },
            { label: 'Memori Shared', value: memoryInfo ? formatBytes(memoryInfo.shared) : '—' }
          ].map(({ label, value }) => (
            <div key={label} className="sp-info-item">
              <div className="sp-info-item__label">{label}</div>
              <div className="sp-info-item__value" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow sp-section-eyebrow--danger">
            <AlertTriangle size={13} />
            Zona Berbahaya
          </div>
          <p className="sp-section-desc">
            Tindakan ini tidak dapat dibatalkan. Buat backup terlebih dahulu sebelum melanjutkan.
          </p>
        </div>
        <div className="sp-danger-panel">
          <div className="sp-danger-panel__left">
            <div className="sp-danger-panel__icon">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="sp-danger-panel__title">Reset Database ke Standar</div>
              <div className="sp-danger-panel__desc">
                Hapus semua lagu kustom dan kembalikan ke daftar lagu standar bawaan SION Media.
                Semua playlist dan riwayat akan dihapus.
              </div>
            </div>
          </div>
          <button className="sp-btn sp-btn--danger" onClick={handleReseed} disabled={isReseeding}>
            {isReseeding ? (
              <>
                <RefreshCw size={14} className="sp-btn__spin" />
                Mereset...
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                Reset Database
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}
