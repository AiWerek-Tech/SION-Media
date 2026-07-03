/**
 * Tampilan Settings — Enterprise Functional Redesign
 * UI theme, workspace layout, density — all wired to real settings keys
 */

import React, { useEffect, useState } from 'react'
import { Monitor, Moon, Layout, Columns, Maximize2, PanelLeft } from 'lucide-react'
import { useModeStore } from '@renderer/store/useModeStore'
import { logger } from '@renderer/utils/logger'
import {
  applyEffectiveTheme,
  buildThemeSyncPayload,
  isAppThemeMode,
  resolveEffectiveTheme,
  watchSystemThemeChanges,
  type AppThemeMode
} from '@renderer/utils/app-theme'

interface AppThemeSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

const THEME_OPTIONS: {
  mode: AppThemeMode
  label: string
  desc: string
  icon: React.ElementType
}[] = [
  {
    mode: 'dark',
    label: 'Dark (Default)',
    desc: 'Cinematic dark mode untuk fokus maksimal saat ibadah & pelayanan',
    icon: Moon
  }
]

const LAYOUT_OPTIONS = [
  { id: 'default', label: 'Default', desc: 'Sidebar + main content', icon: PanelLeft },
  { id: 'wide', label: 'Wide', desc: 'Full-width workspace', icon: Maximize2 },
  { id: 'split', label: 'Split', desc: 'Dual panel layout', icon: Columns },
  { id: 'compact', label: 'Compact', desc: 'Minimal chrome', icon: Layout }
]

export function AppThemeSettings({
  settings,
  updateSetting
}: AppThemeSettingsProps): React.JSX.Element {
  const setTheme = useModeStore((s) => s.setTheme)
  const [activeMode, setActiveMode] = useState<AppThemeMode>('system')
  const [unwatch, setUnwatch] = useState<(() => void) | null>(null)

  useEffect(() => {
    const raw = settings.app_theme_mode
    const mode: AppThemeMode = isAppThemeMode(raw) ? raw : 'system'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMode(mode)
  }, [settings.app_theme_mode])

  const applyMode = (mode: AppThemeMode): void => {
    if (unwatch) {
      unwatch()
      setUnwatch(null)
    }
    const effective = resolveEffectiveTheme(mode)
    applyEffectiveTheme(effective)
    window.api.appTheme?.setMode(buildThemeSyncPayload(mode))
    if (mode === 'system') {
      const stop = watchSystemThemeChanges((t) => {
        applyEffectiveTheme(t)
        window.api.appTheme?.setMode(buildThemeSyncPayload('system'))
      })
      setUnwatch(() => stop)
    }
  }

  useEffect(() => {
    return () => {
      if (unwatch) unwatch()
    }
  }, [unwatch])

  const onChange = async (mode: AppThemeMode): Promise<void> => {
    setActiveMode(mode)
    setTheme(mode)
    try {
      await updateSetting('app_theme_mode', mode)
    } catch (err) {
      logger.error('Failed to update app theme mode:', err)
    }
    applyMode(mode)
  }

  const activeLayout = settings.ui_layout_mode || 'default'

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Tampilan Aplikasi</h2>
        <p className="sp-page-subtitle">
          Atur tema antarmuka operator, layout workspace, dan preferensi UI.
        </p>
      </div>

      {/* Theme Mode */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Monitor size={13} />
            Mode Tema
          </div>
          <p className="sp-section-desc">
            Pilih skema warna yang sesuai dengan kondisi ruangan ibadah. Versi ini dikunci pada mode
            gelap demi kenyamanan visual ibadah.
          </p>
        </div>
        <div className="sp-option-grid sp-option-grid--3">
          {THEME_OPTIONS.map(({ mode, label, desc, icon: Icon }) => (
            <button
              key={mode}
              className={`sp-option-card ${activeMode === mode ? 'is-active' : ''}`}
              onClick={() => onChange(mode)}
            >
              <div className="sp-option-card__icon">
                <Icon size={20} />
              </div>
              <div className="sp-option-card__label">{label}</div>
              <div className="sp-option-card__desc">{desc}</div>
              {activeMode === mode && <div className="sp-option-card__check" />}
            </button>
          ))}
        </div>
      </section>

      {/* Layout Mode */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Layout size={13} />
            Layout Workspace
          </div>
          <p className="sp-section-desc">
            Konfigurasi tata letak panel dan workspace operator. Berlaku setelah restart.
          </p>
        </div>
        <div className="sp-option-grid sp-option-grid--4">
          {LAYOUT_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
            <button
              key={id}
              className={`sp-option-card ${activeLayout === id ? 'is-active' : ''}`}
              onClick={() => updateSetting('ui_layout_mode', id)}
            >
              <div className="sp-option-card__icon">
                <Icon size={18} />
              </div>
              <div className="sp-option-card__label">{label}</div>
              <div className="sp-option-card__desc">{desc}</div>
              {activeLayout === id && <div className="sp-option-card__check" />}
            </button>
          ))}
        </div>
      </section>

      {/* UI Preferences */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Columns size={13} />
            Preferensi UI
          </div>
          <p className="sp-section-desc">
            Sesuaikan kepadatan dan perilaku elemen antarmuka operator.
          </p>
        </div>
        <div className="sp-toggle-list">
          {[
            {
              label: 'Animasi Transisi',
              desc: 'Aktifkan animasi halaman dan komponen UI',
              key: 'ui_animations',
              default: '1'
            },
            {
              label: 'Sidebar Compact',
              desc: 'Tampilkan sidebar dalam mode ringkas (ikon saja)',
              key: 'ui_sidebar_compact',
              default: '0'
            },
            {
              label: 'Tampilkan Tooltip',
              desc: 'Tampilkan tooltip informatif saat hover elemen',
              key: 'ui_tooltips',
              default: '1'
            },
            {
              label: 'Blur Effects',
              desc: 'Aktifkan efek glassmorphism dan backdrop blur',
              key: 'ui_blur',
              default: '1'
            },
            {
              label: 'Konfirmasi Hapus',
              desc: 'Tampilkan dialog konfirmasi sebelum menghapus data',
              key: 'ui_confirm_delete',
              default: '1'
            },
            {
              label: 'Auto-save Editor',
              desc: 'Simpan otomatis saat mengedit lirik lagu',
              key: 'ui_autosave',
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

      {/* Workspace Name */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Monitor size={13} />
            Identitas Workspace
          </div>
          <p className="sp-section-desc">
            Nama workspace ditampilkan di title bar dan dikirim ke proyektor.
          </p>
        </div>
        <div className="sp-field">
          <label className="sp-field__label">Nama Workspace / Gereja</label>
          <input
            type="text"
            value={settings.workspace_name || ''}
            onChange={(e) => updateSetting('workspace_name', e.target.value)}
            placeholder="Contoh: GBI Bethel Jakarta"
            className="sp-input"
            style={{ maxWidth: 400 }}
          />
          <p style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
            Nama ini akan muncul di title bar dan dikirim ke layar proyektor sebagai identitas.
          </p>
        </div>
      </section>

      {/* Onboarding Restart */}
      <section className="sp-section border-t border-border-subtle/30 pt-6 mt-6">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Monitor size={13} />
            Panduan Pengguna
          </div>
          <p className="sp-section-desc">
            Buka kembali panduan awal interaktif untuk mengonfigurasi tema dan jalur kerja default
            Anda.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              useModeStore.setState({ isFirstInstall: true })
            }}
            className="sp-button"
            style={{
              background: 'var(--color-brand-primary, #3b82f6)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer',
              border: 'none',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = 'var(--color-brand-primary-hover, #2563eb)')
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = 'var(--color-brand-primary, #3b82f6)')
            }
          >
            Mulai Panduan Awal (Onboarding)
          </button>
        </div>
      </section>
    </div>
  )
}
