/**
 * Settings Screen — Premium Enterprise Redesign
 * Consistent with Library Pro & Management Studio design language
 */

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Monitor,
  SunMoon,
  Palette,
  Keyboard,
  Database,
  Info,
  Image,
  BookOpen,
  Search
} from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useModalStore } from '@renderer/store/useModalStore'
import { mediaEngine } from '@renderer/engine/mediaEngine'
import { logger } from '@renderer/utils/logger'
import type { Hymnal } from '@renderer/types'
import type { DisplayInfo } from '@shared/types'
import {
  DisplaySettings,
  AppThemeSettings,
  ThemeSettings,
  BackgroundSettings,
  ShortcutsSettings,
  HymnalSettings,
  BackupSettings,
  AboutSettings
} from './settings'

type SettingsSection =
  | 'display'
  | 'hymnals'
  | 'appearance'
  | 'theme'
  | 'background'
  | 'shortcuts'
  | 'backup'
  | 'about'

interface SectionDef {
  key: SettingsSection
  label: string
  subtitle: string
  icon: React.ElementType
}

const SECTIONS: SectionDef[] = [
  { key: 'display', label: 'Display', subtitle: 'Monitor & Proyektor', icon: Monitor },
  { key: 'hymnals', label: 'Buku Lagu', subtitle: 'Kategori & Koleksi', icon: BookOpen },
  { key: 'appearance', label: 'Tampilan', subtitle: 'UI/UX & Layout', icon: SunMoon },
  { key: 'theme', label: 'Tema & Font', subtitle: 'Warna & Tipografi', icon: Palette },
  { key: 'background', label: 'Background', subtitle: 'Wallpaper & Visual', icon: Image },
  { key: 'shortcuts', label: 'Keyboard', subtitle: 'Shortcut & Hotkey', icon: Keyboard },
  { key: 'backup', label: 'Backup', subtitle: 'Cadangan & Restore', icon: Database },
  { key: 'about', label: 'Tentang', subtitle: 'Informasi Aplikasi', icon: Info }
]

export function SettingsScreen(): React.JSX.Element {
  const { setScreen, hymnals, loadHymnals, showToast } = useAppStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('display')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [sidebarSearch, setSidebarSearch] = useState('')

  // Load initial data
  useEffect(() => {
    let isMounted = true
    const init = async (): Promise<void> => {
      try {
        const s = (await window.api.settings.getAll()) as Record<string, string>
        if (isMounted) setSettings(s)

        const d = (await window.api.display.getAll()) as DisplayInfo[]
        if (isMounted) setDisplays(d)

        await loadHymnals()
      } catch (err) {
        logger.error('Failed to init settings screen:', err)
        showToast('Gagal memuat pengaturan', 'error')
      }
    }
    init()
    return (): void => {
      isMounted = false
    }
  }, [loadHymnals, showToast])

  // Settings update handler
  const updateSetting = async (key: string, value: string): Promise<void> => {
    try {
      await window.api.settings.update(key, value)
    } catch (err) {
      logger.error('Failed to update setting:', err)
      showToast('Gagal menyimpan pengaturan', 'error')
      return
    }
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    window.api.projection.themeUpdate(newSettings)

    if (key === 'projection_bg_image' && value) {
      if (value.match(/\.(mp4|webm)$/i)) {
        mediaEngine.preloadVideo(value).catch((err) => logger.error('Video preload error:', err))
      } else {
        mediaEngine.preloadImage(value).catch((err) => logger.error('Image preload error:', err))
      }
    }

    if (key === 'projection_default_atmosphere' && value) {
      try {
        const config = JSON.parse(value) as { media?: { path?: string } }
        const mediaPath = config.media?.path
        if (mediaPath?.match(/\.(mp4|webm)$/i)) {
          mediaEngine
            .preloadVideo(mediaPath)
            .catch((err) => logger.error('Video preload error:', err))
        } else if (mediaPath) {
          mediaEngine
            .preloadImage(mediaPath)
            .catch((err) => logger.error('Image preload error:', err))
        }
      } catch (err) {
        logger.error('Invalid projection_default_atmosphere payload:', err)
      }
    }
  }

  // Hymnal CRUD handlers
  const handleAddHymnal = async (hymnal: Partial<Hymnal>): Promise<void> => {
    try {
      await window.api.hymnals.add(hymnal)
      showToast('Buku lagu baru ditambahkan', 'success')
      await loadHymnals()
    } catch {
      showToast('Gagal menyimpan buku lagu', 'error')
      throw new Error('Failed to add hymnal')
    }
  }

  const handleUpdateHymnal = async (id: number, hymnal: Partial<Hymnal>): Promise<void> => {
    try {
      await window.api.hymnals.update(id, hymnal)
      showToast('Buku lagu diperbarui', 'success')
      await loadHymnals()
    } catch {
      showToast('Gagal menyimpan buku lagu', 'error')
      throw new Error('Failed to update hymnal')
    }
  }

  const handleDeleteHymnal = async (id: number): Promise<void> => {
    try {
      await window.api.hymnals.delete(id)
      showToast('Buku lagu dihapus', 'success')
      await loadHymnals()
    } catch {
      showToast('Gagal menghapus buku lagu', 'error')
      throw new Error('Failed to delete hymnal')
    }
  }

  const handleBackup = async (): Promise<void> => {
    const path = (await window.api.system.createBackup()) as string
    showToast('Backup berhasil: ' + path, 'success')
  }

  const handleRestore = async (filePath: string): Promise<void> => {
    await window.api.system.restoreBackup(filePath)
    showToast('Restore berhasil', 'success')
  }

  const handleReseed = async (): Promise<void> => {
    const confirmed = await useModalStore
      .getState()
      .openAsync<boolean>('confirm-reseed', 'confirm', {
        title: 'Reset Database Lagu?',
        description:
          'Semua lagu, hymnal, dan playlist akan dihapus dan diganti dengan data default. Tindakan ini tidak dapat dibatalkan.',
        confirmLabel: 'Reset Database',
        danger: true
      })
    if (!confirmed) return
    await window.api.system.reseed()
    await useAppStore.getState().loadSongs()
    showToast('Database lagu berhasil diatur ulang', 'success')
  }

  const filteredSections = SECTIONS.filter(
    (s) =>
      !sidebarSearch.trim() ||
      s.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      s.subtitle.toLowerCase().includes(sidebarSearch.toLowerCase())
  )

  const activeSection_ = SECTIONS.find((s) => s.key === activeSection)

  return (
    <div className="settings-shell">
      {/* ── Ambient background ── */}
      <div className="settings-shell__ambient" />

      {/* ── Header ── */}
      <header className="settings-header drag-area">
        <div className="settings-header__left no-drag-area">
          <button
            onClick={() => setScreen('dashboard')}
            className="settings-header__back"
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="settings-header__title-block">
            <h1>Pengaturan Sistem</h1>
            <p>Konfigurasi Tampilan &amp; Database</p>
          </div>
        </div>

        {/* Breadcrumb */}
        {activeSection_ && (
          <div className="settings-header__breadcrumb no-drag-area">
            <span>Pengaturan Sistem</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="settings-header__breadcrumb-active">{activeSection_.label}</span>
          </div>
        )}
      </header>

      {/* ── Body ── */}
      <div className="settings-body">
        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          {/* Search */}
          <div className="settings-sidebar__search-wrap">
            <Search size={14} className="settings-sidebar__search-icon" />
            <input
              type="text"
              placeholder="Cari pengaturan..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="settings-sidebar__search"
            />
            {sidebarSearch && <kbd className="settings-sidebar__search-kbd">Ctrl K</kbd>}
          </div>

          {/* Nav items */}
          <nav className="settings-sidebar__nav">
            {filteredSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.key
              return (
                <button
                  key={section.key}
                  className={`settings-sidebar__item ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveSection(section.key)}
                >
                  <div className="settings-sidebar__item-icon">
                    <Icon size={18} />
                  </div>
                  <div className="settings-sidebar__item-text">
                    <span className="settings-sidebar__item-label">{section.label}</span>
                    <span className="settings-sidebar__item-subtitle">{section.subtitle}</span>
                  </div>
                  {isActive && <div className="settings-sidebar__item-indicator" />}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="settings-content">
          <div
            className={`settings-content__inner ${
              activeSection === 'background' ? 'settings-content__inner--wide' : ''
            }`}
          >
            {activeSection === 'display' && (
              <DisplaySettings
                displays={displays}
                settings={settings}
                updateSetting={updateSetting}
              />
            )}
            {activeSection === 'hymnals' && (
              <HymnalSettings
                hymnals={hymnals}
                onAdd={handleAddHymnal}
                onUpdate={handleUpdateHymnal}
                onDelete={handleDeleteHymnal}
              />
            )}
            {activeSection === 'appearance' && (
              <AppThemeSettings settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'theme' && (
              <ThemeSettings settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'background' && (
              <BackgroundSettings settings={settings} updateSetting={updateSetting} />
            )}
            {activeSection === 'shortcuts' && <ShortcutsSettings />}
            {activeSection === 'backup' && (
              <BackupSettings
                onBackup={handleBackup}
                onRestore={handleRestore}
                onReseed={handleReseed}
              />
            )}
            {activeSection === 'about' && <AboutSettings />}
          </div>
        </main>
      </div>
    </div>
  )
}
