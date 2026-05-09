/**
 * Settings Screen
 * Main settings container that orchestrates all settings sections
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
  BookOpen
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { mediaEngine } from '../engine/mediaEngine'
import { logger } from '../utils/logger'
import type { Hymnal } from '../types'
import type { DisplayInfo } from '../../../shared/types'
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

const SECTIONS: { key: SettingsSection; label: string; icon: React.JSX.Element }[] = [
  { key: 'display', label: 'Display', icon: <Monitor size={15} /> },
  { key: 'hymnals', label: 'Buku Lagu', icon: <BookOpen size={15} /> },
  { key: 'appearance', label: 'Tampilan', icon: <SunMoon size={15} /> },
  { key: 'theme', label: 'Tema & Font', icon: <Palette size={15} /> },
  { key: 'background', label: 'Background', icon: <Image size={15} /> },
  { key: 'shortcuts', label: 'Keyboard', icon: <Keyboard size={15} /> },
  { key: 'backup', label: 'Backup', icon: <Database size={15} /> },
  { key: 'about', label: 'Tentang', icon: <Info size={15} /> }
]

export function SettingsScreen(): React.JSX.Element {
  const { setScreen, hymnals, loadHymnals, showToast } = useAppStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('display')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [displays, setDisplays] = useState<DisplayInfo[]>([])

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

    // Preload if it's a background image
    if (key === 'projection_bg_image' && value) {
      if (value.match(/\.(mp4|webm)$/i)) {
        mediaEngine.preloadVideo(value).catch((err) => logger.error('Video preload error:', err))
      } else {
        mediaEngine.preloadImage(value).catch((err) => logger.error('Image preload error:', err))
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

  // Backup handlers
  const handleBackup = async (): Promise<void> => {
    const path = (await window.api.system.createBackup()) as string
    showToast('Backup berhasil: ' + path, 'success')
  }

  const handleRestore = async (filePath: string): Promise<void> => {
    await window.api.system.restoreBackup(filePath)
    showToast('Restore berhasil', 'success')
  }

  const handleReseed = async (): Promise<void> => {
    await window.api.system.reseed()
    await useAppStore.getState().loadSongs()
    showToast('Database lagu berhasil diatur ulang', 'success')
  }

  return (
    <div className="h-full w-full flex flex-col bg-bg-base overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="h-14 flex items-center px-6 border-b border-border-default bg-bg-surface/50 backdrop-blur-md shrink-0 gap-4">
        <button
          onClick={() => setScreen('dashboard')}
          className="p-2 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-h3 text-text-primary leading-tight">Pengaturan Sistem</h1>
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
            Konfigurasi Tampilan & Database
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <div className="w-[240px] border-r border-border-default bg-bg-surface/30 p-4 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeSection === section.key
                  ? 'bg-brand-primary/10 text-brand-primary shadow-sm border border-brand-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
              onClick={() => setActiveSection(section.key)}
            >
              <div
                className={`${activeSection === section.key ? 'text-brand-primary' : 'text-text-muted'}`}
              >
                {section.icon}
              </div>
              {section.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-bg-base/20">
          <div className="max-w-2xl mx-auto space-y-10">
            {activeSection === 'display' && <DisplaySettings displays={displays} />}
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
        </div>
      </div>
    </div>
  )
}
