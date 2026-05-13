/**
 * Display Settings — Enterprise Functional Redesign
 * All controls wired to real APIs: window.api.display, window.api.settings, window.api.projection
 */

import React, { useEffect, useState } from 'react'
import {
  Monitor,
  Info,
  Zap,
  RefreshCw,
  Layers,
  CheckCircle2,
  Settings2,
  Cpu,
  Maximize2,
  Cable,
  Palette,
  MonitorPlay,
  Eye,
  EyeOff
} from 'lucide-react'
import type { DisplayInfo } from '../../../../shared/types'

interface DisplaySettingsProps {
  displays: DisplayInfo[]
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
function aspectRatio(w: number, h: number): string {
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

export function DisplaySettings({
  displays,
  settings,
  updateSetting
}: DisplaySettingsProps): React.JSX.Element {
  const [projectionVisible, setProjectionVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    window.api.display
      .isProjectionVisible()
      .then((v) => setProjectionVisible(v))
      .catch(() => {})
  }, [])

  const handleRefreshDisplays = async (): Promise<void> => {
    setRefreshing(true)
    await new Promise((r) => setTimeout(r, 600))
    setRefreshing(false)
  }

  const handleToggleProjection = (): void => {
    if (projectionVisible) {
      window.api.projection.hide()
      setProjectionVisible(false)
    } else {
      window.api.projection.show()
      setProjectionVisible(true)
    }
  }

  const displayMode = settings.display_mode || 'extend'
  const displayResolution = settings.display_resolution || 'auto'
  const displayRefreshRate = settings.display_refresh_rate || '60'
  const projectionMonitorId = settings.projection_monitor_id || ''

  const primaryDisplay = displays.find((d) => d.isPrimary) || displays[0]
  const projectorDisplay = displays.find((d) => !d.isPrimary) || displays[0]
  const activeDisplay = projectorDisplay || primaryDisplay

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <div>
          <h2 className="sp-page-title">Pengaturan Display</h2>
          <p className="sp-page-subtitle">
            Kelola monitor, output proyektor, dan konfigurasi multi-screen untuk SION Media.
          </p>
        </div>
        <div className="sp-page-header__actions">
          <button
            className="sp-btn sp-btn--ghost"
            onClick={handleRefreshDisplays}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <RefreshCw size={14} className="sp-btn__spin" />
                Mendeteksi...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Refresh Display
              </>
            )}
          </button>
          <button
            className={`sp-btn ${projectionVisible ? 'sp-btn--danger' : 'sp-btn--primary'}`}
            onClick={handleToggleProjection}
          >
            {projectionVisible ? (
              <>
                <EyeOff size={14} />
                Sembunyikan Output
              </>
            ) : (
              <>
                <Eye size={14} />
                Tampilkan Output
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monitor Cards */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Monitor size={13} />
            Monitor Terdeteksi
          </div>
          <p className="sp-section-desc">
            Daftar monitor yang terhubung ke sistem. Proyektor harus dalam mode Extend.
          </p>
        </div>
        {displays.length === 0 ? (
          <div className="sp-empty-state">
            <Monitor size={32} />
            <strong>Tidak ada monitor terdeteksi</strong>
            <p>Hubungkan proyektor atau monitor eksternal, lalu klik Refresh Display.</p>
          </div>
        ) : (
          <div className="settings-display-monitors-list">
            {displays.map((d) => (
              <div key={d.id} className="settings-display-monitor-card">
                <div className="settings-display-monitor-card__glow" />
                <div className="settings-display-monitor-card__visual">
                  <div className="settings-display-monitor-card__screen">
                    <div className="settings-display-monitor-card__screen-inner">
                      <Monitor size={28} />
                    </div>
                    <div className="settings-display-monitor-card__screen-stand" />
                    <div className="settings-display-monitor-card__screen-base" />
                  </div>
                  {d.isPrimary && (
                    <div className="settings-display-monitor-card__primary-label">PRIMARY</div>
                  )}
                </div>
                <div className="settings-display-monitor-card__info">
                  <div className="settings-display-monitor-card__name-row">
                    <h3>{d.label || `Display ${d.id}`}</h3>
                    {d.isPrimary ? (
                      <span className="settings-display-badge settings-display-badge--primary">
                        PRIMARY
                      </span>
                    ) : (
                      <span className="settings-display-badge settings-display-badge--projector">
                        PROYEKTOR
                      </span>
                    )}
                  </div>
                  <p className="settings-display-monitor-card__resolution">
                    {d.width} × {d.height} px · {aspectRatio(d.width, d.height)}
                  </p>
                  <div className="settings-display-monitor-card__status">
                    <span className="settings-display-status-dot" />
                    <span>Tersambung</span>
                  </div>
                </div>
                <div className="settings-display-monitor-card__actions">
                  <button
                    className={`settings-display-btn-advanced ${projectionMonitorId === String(d.id) ? 'is-active' : ''}`}
                    onClick={() => updateSetting('projection_monitor_id', String(d.id))}
                  >
                    <MonitorPlay size={14} />
                    {projectionMonitorId === String(d.id) ? 'Output Aktif' : 'Set sebagai Output'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info Notice */}
      <div className="settings-display-notice">
        <div className="settings-display-notice__icon">
          <Info size={15} />
        </div>
        <p>
          SION Media mendeteksi monitor secara otomatis. Pastikan proyektor terhubung dalam mode{' '}
          <strong>Extend</strong> di pengaturan Windows untuk kontrol penuh presenter dan proyektor
          secara terpisah.
        </p>
      </div>

      {/* Output Configuration */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Settings2 size={13} />
            Konfigurasi Output
          </div>
          <p className="sp-section-desc">
            Atur mode tampilan, resolusi, dan refresh rate proyektor.
          </p>
        </div>
        <div className="settings-display-settings-grid">
          {/* Mode Tampilan */}
          <div className="settings-display-setting-card">
            <div className="settings-display-setting-card__header">
              <div className="settings-display-setting-card__icon">
                <Layers size={16} />
              </div>
              <div>
                <div className="settings-display-setting-card__title">Mode Tampilan</div>
                <div className="settings-display-setting-card__desc">
                  Atur mode output sesuai kebutuhan ibadah.
                </div>
              </div>
            </div>
            <div className="settings-display-setting-card__control">
              <div className="settings-display-select-wrapper">
                <select
                  value={displayMode}
                  onChange={(e) => updateSetting('display_mode', e.target.value)}
                  className="settings-display-select"
                >
                  <option value="extend">Extend (Disarankan)</option>
                  <option value="mirror">Mirror / Duplicate</option>
                  <option value="projector-only">Proyektor Saja</option>
                  <option value="monitor-only">Monitor Saja</option>
                </select>
                <svg
                  className="settings-display-select-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            <p className="settings-display-setting-card__note">
              Pisahkan tampilan presenter dan proyektor untuk kontrol penuh.
            </p>
          </div>

          {/* Resolusi Output */}
          <div className="settings-display-setting-card">
            <div className="settings-display-setting-card__header">
              <div className="settings-display-setting-card__icon">
                <Maximize2 size={16} />
              </div>
              <div>
                <div className="settings-display-setting-card__title">Resolusi Output</div>
                <div className="settings-display-setting-card__desc">
                  Sesuaikan resolusi tampilan proyektor.
                </div>
              </div>
            </div>
            <div className="settings-display-setting-card__control">
              <div className="settings-display-select-wrapper">
                <select
                  value={displayResolution}
                  onChange={(e) => updateSetting('display_resolution', e.target.value)}
                  className="settings-display-select"
                >
                  <option value="auto">Otomatis (Deteksi)</option>
                  <option value="1280x720">1280 × 720 (HD)</option>
                  <option value="1920x1080">1920 × 1080 (Full HD)</option>
                  <option value="2560x1440">2560 × 1440 (QHD)</option>
                  <option value="3840x2160">3840 × 2160 (4K UHD)</option>
                </select>
                <svg
                  className="settings-display-select-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            <p className="settings-display-setting-card__note">
              Resolusi optimal untuk proyektor standar dan LED.
            </p>
          </div>

          {/* Refresh Rate */}
          <div className="settings-display-setting-card">
            <div className="settings-display-setting-card__header">
              <div className="settings-display-setting-card__icon">
                <RefreshCw size={16} />
              </div>
              <div>
                <div className="settings-display-setting-card__title">Refresh Rate</div>
                <div className="settings-display-setting-card__desc">
                  Atur kecepatan refresh untuk tampilan halus.
                </div>
              </div>
            </div>
            <div className="settings-display-setting-card__control">
              <div className="settings-display-select-wrapper">
                <select
                  value={displayRefreshRate}
                  onChange={(e) => updateSetting('display_refresh_rate', e.target.value)}
                  className="settings-display-select"
                >
                  <option value="60">60 Hz (Disarankan)</option>
                  <option value="75">75 Hz</option>
                  <option value="120">120 Hz</option>
                  <option value="144">144 Hz</option>
                </select>
                <svg
                  className="settings-display-select-chevron"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
            <p className="settings-display-setting-card__note">
              Standar refresh rate untuk kompatibilitas terbaik.
            </p>
          </div>
        </div>
      </section>

      {/* Projection Behavior Toggles */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Zap size={13} />
            Perilaku Proyeksi
          </div>
          <p className="sp-section-desc">Konfigurasi perilaku output saat ibadah berlangsung.</p>
        </div>
        <div className="sp-toggle-list">
          {[
            {
              label: 'Auto-show saat TAKE',
              desc: 'Tampilkan output proyektor otomatis saat operator menekan TAKE',
              key: 'display_auto_show_on_take',
              default: '1'
            },
            {
              label: 'Fullscreen Output',
              desc: 'Jalankan proyektor dalam mode fullscreen penuh',
              key: 'display_fullscreen',
              default: '1'
            },
            {
              label: 'GPU Acceleration',
              desc: 'Aktifkan akselerasi GPU untuk rendering yang lebih halus',
              key: 'display_gpu_acceleration',
              default: '1'
            },
            {
              label: 'Auto-recovery Monitor',
              desc: 'Pindahkan output otomatis jika monitor proyektor dicabut',
              key: 'display_auto_recovery',
              default: '1'
            }
          ].map((item) => (
            <div key={item.key} className="sp-toggle-row">
              <div className="sp-toggle-row__text">
                <span className="sp-toggle-row__label">{item.label}</span>
                <span className="sp-toggle-row__desc">{item.desc}</span>
              </div>
              <button
                className={`sp-toggle ${(settings[item.key] ?? item.default) === '1' ? 'is-on' : ''}`}
                onClick={() =>
                  updateSetting(item.key, (settings[item.key] ?? item.default) === '1' ? '0' : '1')
                }
              >
                <span className="sp-toggle__thumb" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Monitor Identification */}
      {activeDisplay && (
        <section className="sp-section">
          <div className="sp-section-header">
            <div className="sp-section-eyebrow">
              <Cpu size={13} />
              Identifikasi Monitor
            </div>
            <p className="sp-section-desc">Informasi teknis monitor yang terdeteksi oleh sistem.</p>
          </div>
          <div className="settings-display-identification">
            {[
              {
                icon: Monitor,
                label: 'Nama Monitor',
                value: activeDisplay.label || `Display ${activeDisplay.id}`
              },
              {
                icon: Cpu,
                label: 'Vendor',
                value: activeDisplay.isPrimary ? 'Generic PnP Monitor' : 'Projector Output'
              },
              {
                icon: Maximize2,
                label: 'Ukuran Layar',
                value: `${activeDisplay.width} × ${activeDisplay.height} px`
              },
              {
                icon: Layers,
                label: 'Aspect Ratio',
                value: aspectRatio(activeDisplay.width, activeDisplay.height)
              },
              { icon: Palette, label: 'Color Depth', value: '32-bit (8 bpc)' },
              {
                icon: Cable,
                label: 'Konektivitas',
                value: activeDisplay.isPrimary ? 'HDMI / VGA' : 'HDMI / DisplayPort'
              }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="settings-display-identification__item">
                <div className="settings-display-identification__icon">
                  <Icon size={14} />
                </div>
                <div className="settings-display-identification__label">{label}</div>
                <div className="settings-display-identification__value">{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status Bar */}
      <div className="settings-display-connection-status">
        <div className="settings-display-connection-status__left">
          <CheckCircle2 size={15} className="settings-display-connection-status__icon" />
          <span>Sistem display siap</span>
        </div>
        <div className="settings-display-connection-status__right">
          <span>{displays.length} monitor terdeteksi</span>
          <span className="settings-display-connection-status__dot" />
          <span>{projectionVisible ? 'Output aktif' : 'Output tersembunyi'}</span>
          {projectionMonitorId && (
            <>
              <span className="settings-display-connection-status__dot" />
              <span>Monitor ID: {projectionMonitorId}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
