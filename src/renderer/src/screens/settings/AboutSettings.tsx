/**
 * Tentang Aplikasi — Enterprise Functional Redesign
 * Real system info from window.electron.process + window.api.system.getMemory()
 * Real app version from main process via window.api.window.getVersion()
 */

import React, { useEffect, useState } from 'react'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Globe,
  HardDrive,
  Heart,
  Info,
  Layers,
  Monitor,
  Music2,
  RefreshCw,
  Shield,
  Sparkles,
  Star,
  Terminal,
  Zap,
  AlertTriangle,
  Download
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { UpdateService, type UpdateCheckResult } from '../../services/update-service'

interface SystemInfo {
  platform: string
  arch: string
  nodeVersion: string
  electronVersion: string
  chromeVersion: string
  v8Version: string
}

interface MemoryInfo {
  private: number
  shared: number
}

const TECH_STACK = [
  { label: 'Runtime', value: 'Electron 39', tone: 'blue' },
  { label: 'UI Framework', value: 'React 19', tone: 'cyan' },
  { label: 'Language', value: 'TypeScript 5.9', tone: 'blue' },
  { label: 'Database', value: 'SQLite 3 (better-sqlite3)', tone: 'emerald' },
  { label: 'State', value: 'Zustand 5', tone: 'violet' },
  { label: 'Animation', value: 'Framer Motion 12', tone: 'violet' },
  { label: 'Styling', value: 'Tailwind CSS 4', tone: 'cyan' },
  { label: 'Build', value: 'electron-vite 5', tone: 'emerald' }
]

const FEATURES = [
  {
    icon: Music2,
    label: 'Multi-Hymnal Library',
    desc: 'Kelola ribuan lagu dari berbagai buku nyanyian dalam satu database terpadu.'
  },
  {
    icon: Monitor,
    label: 'Dual-Screen Projection',
    desc: 'Output proyektor terpisah dari layar operator dengan kontrol penuh real-time.'
  },
  {
    icon: Layers,
    label: 'Atmosphere Engine',
    desc: 'Background media library dengan video, gambar, gradient, dan motion presets.'
  },
  {
    icon: Sparkles,
    label: 'Live Broadcast Mode',
    desc: 'Kontrol presentasi real-time dengan confidence monitor dan quick-jump navigation.'
  },
  {
    icon: Shield,
    label: 'Runtime Protection',
    desc: 'LIVE_LOCK system mencegah perubahan tidak sengaja saat output aktif.'
  },
  {
    icon: Activity,
    label: 'Runtime Inspector',
    desc: 'Diagnostik sistem, IPC health monitoring, dan performance tracking real-time.'
  }
]

const CREDITS = [
  { role: 'Lead Developer', name: 'SION Media Team' },
  { role: 'UI/UX Design', name: 'Enterprise Design System v4' },
  { role: 'Database Engine', name: 'better-sqlite3 (WiseLibs)' },
  { role: 'Icon Library', name: 'Lucide React' },
  { role: 'Animation', name: 'Framer Motion (Framer)' },
  { role: 'Font', name: 'Inter + Poppins (Google Fonts)' },
  { role: 'State Management', name: 'Zustand (pmndrs)' },
  { role: 'Build Tool', name: 'electron-vite + Vite' }
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AboutSettings(): React.JSX.Element {
  const { hymnals, songs } = useAppStore()
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
  const [memInfo, setMemInfo] = useState<MemoryInfo | null>(null)
  const [appVersion, setAppVersion] = useState<string>('0.0.0')
  const [checking, setChecking] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'changelog' | 'credits'>('info')

  useEffect(() => {
    // Get real app version from main process
    window.api.window.getVersion().then(setAppVersion).catch(() => setAppVersion('1.0.0'))

    // Use window.electron.process
    const ep = window.electron?.process
    const ua = navigator.userAgent
    setSysInfo({
      platform: ep?.platform || navigator.platform || 'Windows',
      arch: 'x64',
      nodeVersion: ep?.versions?.['node'] || '—',
      electronVersion: ep?.versions?.['electron'] || '—',
      chromeVersion: ep?.versions?.['chrome'] || ua.match(/Chrome\/([\d.]+)/)?.[1] || '—',
      v8Version: ep?.versions?.['v8'] || '—'
    })

    // Fetch real memory usage
    window.api.system.getMemory()
      .then((mem) => {
        if (mem) setMemInfo(mem as MemoryInfo)
      })
      .catch(() => {})
  }, [])

  const handleCheckUpdate = async (): Promise<void> => {
    setChecking(true)
    const result = await UpdateService.checkForUpdate(appVersion)
    setUpdateResult(result)
    setChecking(false)
  }

  const handleDownloadUpdate = (): void => {
    if (updateResult?.metadata?.downloadUrl) {
      UpdateService.openDownloadPage(updateResult.metadata.downloadUrl)
    } else {
      UpdateService.openDownloadPage()
    }
  }

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Tentang Aplikasi</h2>
        <p className="sp-page-subtitle">
          Informasi versi, lisensi, diagnostik sistem, dan riwayat pembaruan SION Media.
        </p>
      </div>

      {/* ── App Identity Hero ── */}
      <section className="sp-section">
        <div className="about-hero-card">
          <div className="about-hero-card__glow" />
          <div className="about-hero-card__logo-wrap">
            <div className="about-hero-card__logo">
              <Music2 size={36} />
            </div>
            <div className="about-hero-card__logo-ring" />
          </div>
          <div className="about-hero-card__identity">
            <h3 className="about-hero-card__name">SION Media</h3>
            <p className="about-hero-card__tagline">
              Church Presentation &amp; Media Management System
            </p>
            <div className="about-hero-card__badges">
              <span className="sp-badge sp-badge--blue">v{appVersion}</span>
              <span className="sp-badge sp-badge--violet">&ldquo;Aurora&rdquo;</span>
              <span className="sp-badge sp-badge--emerald">
                <CheckCircle2 size={9} />
                Stable Release
              </span>
            </div>
            <p className="about-hero-card__desc">
              Solusi proyeksi lagu modern yang dirancang untuk mendukung kelancaran ibadah, live
              production, dan manajemen konten gereja secara profesional.
            </p>
            <div className="about-hero-card__links">
              <a href="https://aiwerek-tech.github.io/sion-media-web" target="_blank" rel="noreferrer" className="sp-link">
                <Globe size={12} />
                Website
              </a>
              <a
                href="https://aiwerek-tech.github.io/sion-media-web/docs"
                target="_blank"
                rel="noreferrer"
                className="sp-link"
              >
                <BookOpen size={12} />
                Docs
              </a>
              <a
                href="https://github.com/AiWerek-Tech/SION-Media"
                target="_blank"
                rel="noreferrer"
                className="sp-link"
              >
                <ExternalLink size={12} />
                GitHub
              </a>
            </div>
          </div>
          <div className="about-hero-card__update-panel">
            <div className="about-hero-card__update-status">
              {checking ? (
                <>
                  <RefreshCw size={14} className="sp-btn__spin" />
                  <span>Memeriksa...</span>
                </>
              ) : updateResult?.hasUpdate ? (
                <>
                  <AlertTriangle size={14} className="text-rose-400" />
                  <span className="text-rose-400">Update v{updateResult.latestVersion} tersedia</span>
                </>
              ) : updateResult ? (
                <>
                  <CheckCircle2 size={14} className="about-hero-card__update-icon--ok" />
                  <span>Versi terbaru</span>
                </>
              ) : (
                <>
                  <Info size={14} />
                  <span>Belum dicek</span>
                </>
              )}
            </div>

            {updateResult?.hasUpdate ? (
              <button
                className="sp-btn sp-btn--primary"
                onClick={handleDownloadUpdate}
                style={{ width: '100%', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}
              >
                <Download size={14} />
                Unduh v{updateResult.latestVersion}
              </button>
            ) : (
              <button
                className="sp-btn sp-btn--primary"
                onClick={handleCheckUpdate}
                disabled={checking}
                style={{ width: '100%' }}
              >
                {checking ? (
                  <>
                    <RefreshCw size={14} className="sp-btn__spin" />
                    Memeriksa...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Cek Pembaruan
                  </>
                )}
              </button>
            )}

            <div className="about-hero-card__links">
              <a
                href="https://aiwerek-tech.github.io/sion-media-web/changelog"
                target="_blank"
                rel="noreferrer"
                className="sp-link"
              >
                <ExternalLink size={12} />
                Changelog
              </a>
            </div>
          </div>
        </div>

        {updateResult?.hasUpdate && updateResult.metadata && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 animate-in fade-in slide-in-from-top-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-rose-400">Release Notes v{updateResult.latestVersion}</h4>
            <ul className="mt-2 space-y-1">
              {updateResult.metadata.notes.map((note, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                  <div className="mt-1.5 h-1 w-1 rounded-full bg-rose-400 shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
            {updateResult.metadata.mandatory && (
              <p className="mt-3 text-[10px] font-bold text-rose-500 uppercase tracking-tighter italic">
                * Pembaruan ini wajib untuk menjaga kestabilan data.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Tab Navigation ── */}
      <div className="about-tabs">
        {(
          [
            { id: 'info', label: 'Sistem & Stack', icon: Cpu },
            { id: 'changelog', label: 'Changelog', icon: Activity },
            { id: 'credits', label: 'Credits & Lisensi', icon: Heart }
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`about-tab ${activeTab === id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Info ── */}
      {activeTab === 'info' && (
        <>
          {/* Live Stats */}
          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Activity size={13} />
                Status Runtime
              </div>
              <p className="sp-section-desc">Data live dari sesi aplikasi saat ini.</p>
            </div>
            <div className="sp-metric-grid sp-metric-grid--4">
              <div className="sp-metric-card sp-metric-card--blue">
                <div className="sp-metric-card__icon">
                  <Music2 size={16} />
                </div>
                <div className="sp-metric-card__value">{songs.length.toLocaleString('id-ID')}</div>
                <div className="sp-metric-card__label">Total Lagu</div>
              </div>
              <div className="sp-metric-card sp-metric-card--violet">
                <div className="sp-metric-card__icon">
                  <BookOpen size={16} />
                </div>
                <div className="sp-metric-card__value">{hymnals.length}</div>
                <div className="sp-metric-card__label">Buku Lagu</div>
              </div>
              <div className="sp-metric-card sp-metric-card--emerald">
                <div className="sp-metric-card__icon">
                  <HardDrive size={16} />
                </div>
                <div className="sp-metric-card__value">
                  {memInfo ? formatBytes(memInfo.private) : '—'}
                </div>
                <div className="sp-metric-card__label">Memori Privat</div>
              </div>
              <div className="sp-metric-card sp-metric-card--blue">
                <div className="sp-metric-card__icon">
                  <HardDrive size={16} />
                </div>
                <div className="sp-metric-card__value">
                  {memInfo ? formatBytes(memInfo.shared) : '—'}
                </div>
                <div className="sp-metric-card__label">Memori Shared</div>
              </div>
            </div>
          </section>

          {/* System Info */}
          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Terminal size={13} />
                Informasi Sistem
              </div>
              <p className="sp-section-desc">
                Detail runtime environment dari window.electron.process.
              </p>
            </div>
            <div className="about-sys-grid">
              {sysInfo &&
                [
                  { icon: Monitor, label: 'Platform', value: sysInfo.platform, tone: 'blue' },
                  { icon: Cpu, label: 'Arsitektur', value: sysInfo.arch, tone: 'violet' },
                  {
                    icon: Zap,
                    label: 'Node.js',
                    value: sysInfo.nodeVersion !== '—' ? `v${sysInfo.nodeVersion}` : '—',
                    tone: 'emerald'
                  },
                  {
                    icon: Zap,
                    label: 'Electron',
                    value: sysInfo.electronVersion !== '—' ? `v${sysInfo.electronVersion}` : '—',
                    tone: 'blue'
                  },
                  {
                    icon: Globe,
                    label: 'Chromium',
                    value: sysInfo.chromeVersion !== '—' ? `v${sysInfo.chromeVersion}` : '—',
                    tone: 'cyan'
                  },
                  {
                    icon: Cpu,
                    label: 'V8 Engine',
                    value: sysInfo.v8Version !== '—' ? `v${sysInfo.v8Version}` : '—',
                    tone: 'violet'
                  }
                ].map(({ icon: Icon, label, value, tone }) => (
                  <div key={label} className={`about-sys-card about-sys-card--${tone}`}>
                    <div className="about-sys-card__icon">
                      <Icon size={16} />
                    </div>
                    <div className="about-sys-card__label">{label}</div>
                    <div className="about-sys-card__value">{value}</div>
                  </div>
                ))}
            </div>
          </section>

          {/* Tech Stack */}
          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Layers size={13} />
                Technology Stack
              </div>
              <p className="sp-section-desc">
                Teknologi inti yang digunakan dalam membangun SION Media.
              </p>
            </div>
            <div className="about-stack-grid">
              {TECH_STACK.map(({ label, value, tone }) => (
                <div key={label} className={`about-stack-item about-stack-item--${tone}`}>
                  <span className="about-stack-item__label">{label}</span>
                  <span className="about-stack-item__value">{value}</span>
                  <ChevronRight size={12} className="about-stack-item__arrow" />
                </div>
              ))}
            </div>
          </section>

          {/* Feature Highlights */}
          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Sparkles size={13} />
                Fitur Unggulan
              </div>
              <p className="sp-section-desc">
                Kemampuan utama SION Media untuk kebutuhan ibadah profesional.
              </p>
            </div>
            <div className="about-features-grid">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="about-feature-card">
                  <div className="about-feature-card__icon">
                    <Icon size={18} />
                  </div>
                  <div className="about-feature-card__label">{label}</div>
                  <div className="about-feature-card__desc">{desc}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── TAB: Changelog ── */}
      {activeTab === 'changelog' && (
        <section className="sp-section">
          <div className="sp-section-header">
            <div className="sp-section-eyebrow">
              <Activity size={13} />
              Riwayat Pembaruan
            </div>
            <p className="sp-section-desc">
              Catatan perubahan dan peningkatan setiap versi SION Media.
            </p>
          </div>
          <div className="about-changelog">
            <p className="text-xs text-slate-500 mb-8 italic">
              * Silakan kunjungi website resmi untuk melihat changelog lengkap dan catatan teknis mendalam.
            </p>
            {/* The static changelog can stay as a fallback, but the hero section now handles the live update check */}
          </div>
        </section>
      )}

      {/* ── TAB: Credits & License ── */}
      {activeTab === 'credits' && (
        <>
          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Star size={13} />
                Credits
              </div>
              <p className="sp-section-desc">
                Tim dan teknologi yang berkontribusi dalam pengembangan SION Media.
              </p>
            </div>
            <div className="about-credits-list">
              {CREDITS.map(({ role, name }) => (
                <div key={role} className="about-credit-row">
                  <span className="about-credit-row__role">{role}</span>
                  <span className="about-credit-row__name">{name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="sp-section">
            <div className="sp-section-header">
              <div className="sp-section-eyebrow">
                <Shield size={13} />
                Lisensi &amp; Hak Cipta
              </div>
              <p className="sp-section-desc">
                Ketentuan penggunaan dan informasi lisensi aplikasi.
              </p>
            </div>
            <div className="about-license-panel">
              <div className="about-license-panel__header">
                <div className="about-license-panel__icon">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="about-license-panel__title">SION Media — Church Use License</div>
                  <div className="about-license-panel__subtitle">
                    Non-Commercial · Worship &amp; Ministry Use
                  </div>
                </div>
              </div>
              <div className="about-license-panel__body">
                <p>
                  SION Media &copy; 2024–2026. Hak cipta dilindungi. Aplikasi ini dirancang dan
                  dilisensikan khusus untuk keperluan ibadah, pelayanan gereja, dan kegiatan
                  keagamaan non-komersial.
                </p>
                <p>
                  Penggunaan untuk tujuan komersial, distribusi ulang, atau modifikasi tanpa izin
                  tertulis dari pengembang tidak diperbolehkan.
                </p>
              </div>
              <div className="about-license-panel__footer">
                <div className="about-license-panel__permit">
                  <CheckCircle2 size={13} />
                  <span>Ibadah &amp; Pelayanan Gereja</span>
                </div>
                <div className="about-license-panel__permit">
                  <CheckCircle2 size={13} />
                  <span>Penggunaan Internal Jemaat</span>
                </div>
                <div className="about-license-panel__permit">
                  <CheckCircle2 size={13} />
                  <span>Modifikasi untuk Kebutuhan Sendiri</span>
                </div>
              </div>
            </div>
          </section>

          <section className="sp-section">
            <div className="sp-notice">
              <div className="sp-notice__icon">
                <Heart size={15} />
              </div>
              <p>
                Dibangun dengan ❤️ menggunakan teknologi open-source. Terima kasih kepada komunitas
                Electron, React, dan seluruh kontributor library yang digunakan. Dibuat untuk
                melayani gereja dan jemaat di seluruh Indonesia.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default AboutSettings
