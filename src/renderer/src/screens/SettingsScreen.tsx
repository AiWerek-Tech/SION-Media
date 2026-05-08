import React, { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Monitor,
  Palette,
  Keyboard,
  Database,
  Info,
  Image,
  FolderOpen,
  ExternalLink,
  BookOpen,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { mediaEngine } from '../engine/mediaEngine'
import type { Hymnal } from '../types'

type SettingsSection =
  | 'display'
  | 'hymnals'
  | 'theme'
  | 'background'
  | 'shortcuts'
  | 'backup'
  | 'about'

const SECTIONS: { key: SettingsSection; label: string; icon: React.JSX.Element }[] = [
  { key: 'display', label: 'Display', icon: <Monitor size={15} /> },
  { key: 'hymnals', label: 'Buku Lagu', icon: <BookOpen size={15} /> },
  { key: 'theme', label: 'Tema & Font', icon: <Palette size={15} /> },
  { key: 'background', label: 'Background', icon: <Image size={15} /> },
  { key: 'shortcuts', label: 'Keyboard', icon: <Keyboard size={15} /> },
  { key: 'backup', label: 'Backup', icon: <Database size={15} /> },
  { key: 'about', label: 'Tentang', icon: <Info size={15} /> }
]

const LEGACY_SHORTCUTS = [
  { key: 'Space / →', action: 'Slide berikutnya' },
  { key: '←', action: 'Slide sebelumnya' },
  { key: 'B', action: 'Black Screen' },
  { key: 'F', action: 'Freeze Screen' },
  { key: 'C / Esc', action: 'Clear Screen' },
  { key: 'Ctrl+F', action: 'Cari lagu' },
  { key: 'Ctrl+N', action: 'Lagu baru' },
  { key: 'Ctrl+P', action: 'Command Palette' },
  { key: '?', action: 'Daftar Shortcut' }
]

void LEGACY_SHORTCUTS

const SHORTCUTS = [
  { key: 'Space', action: 'TAKE cue ke Program' },
  { key: 'Right / PageDown', action: 'Slide live berikutnya' },
  { key: 'Left / PageUp', action: 'Slide live sebelumnya' },
  { key: 'B', action: 'Black Screen' },
  { key: 'F', action: 'Freeze Screen' },
  { key: 'C / Esc', action: 'Clear Screen' },
  { key: 'Ctrl+F', action: 'Cari lagu' },
  { key: 'Ctrl+Shift+F', action: 'Focus Live Mode' },
  { key: 'Ctrl+N', action: 'Lagu baru' },
  { key: 'Ctrl+P', action: 'Command Palette' },
  { key: '?', action: 'Daftar Shortcut' }
]

interface FileWithMetadata extends File {
  path: string
}

export function SettingsScreen(): React.JSX.Element {
  const { setScreen, hymnals, loadHymnals, showToast } = useAppStore()
  const [activeSection, setActiveSection] = useState<SettingsSection>('display')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isReseeding, setIsReseeding] = useState(false)
  const [displays, setDisplays] = useState<
    { id: number; label: string; width: number; height: number; isPrimary: boolean }[]
  >([])

  // Hymnal Modal/Form State
  const [showHymnalModal, setShowHymnalModal] = useState(false)
  const [editingHymnal, setEditingHymnal] = useState<Hymnal | null>(null)
  const [hymnalForm, setHymnalForm] = useState({
    code: '',
    name: '',
    language: 'Indonesia',
    publisher: '',
    is_official: 0
  })

  const bgInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isMounted = true
    const init = async (): Promise<void> => {
      const s = (await window.api.settings.getAll()) as Record<string, string>
      if (isMounted) setSettings(s)
      const d = (await window.api.display.getAll()) as {
        id: number
        label: string
        width: number
        height: number
        isPrimary: boolean
      }[]
      if (isMounted) setDisplays(d)
      await loadHymnals()
    }
    init()
    return (): void => {
      isMounted = false
    }
  }, [loadHymnals])

  const handleSaveHymnal = async (): Promise<void> => {
    if (!hymnalForm.code || !hymnalForm.name) return
    try {
      if (editingHymnal) {
        await window.api.hymnals.update(editingHymnal.id, hymnalForm)
        showToast('Buku lagu diperbarui', 'success')
      } else {
        await window.api.hymnals.add(hymnalForm)
        showToast('Buku lagu baru ditambahkan', 'success')
      }
      await loadHymnals()
      setShowHymnalModal(false)
      setEditingHymnal(null)
      setHymnalForm({ code: '', name: '', language: 'Indonesia', publisher: '', is_official: 0 })
    } catch {
      showToast('Gagal menyimpan buku lagu', 'error')
    }
  }

  const handleDeleteHymnal = async (id: number): Promise<void> => {
    if (confirm('Hapus buku lagu ini beserta SEMUA lagunya? Tindakan ini tidak bisa dibatalkan.')) {
      try {
        await window.api.hymnals.delete(id)
        showToast('Buku lagu dihapus', 'success')
        await loadHymnals()
      } catch {
        showToast('Gagal menghapus buku lagu', 'error')
      }
    }
  }

  const openHymnalModal = (hymnal?: Hymnal): void => {
    if (hymnal) {
      setEditingHymnal(hymnal)
      setHymnalForm({
        code: hymnal.code,
        name: hymnal.name,
        language: hymnal.language,
        publisher: hymnal.publisher,
        is_official: hymnal.is_official
      })
    } else {
      setEditingHymnal(null)
      setHymnalForm({ code: '', name: '', language: 'Indonesia', publisher: '', is_official: 0 })
    }
    setShowHymnalModal(true)
  }

  const updateSetting = async (key: string, value: string): Promise<void> => {
    await window.api.settings.update(key, value)
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    window.api.projection.themeUpdate(newSettings)

    // Preload if it's a background image
    if (key === 'projection_bg_image' && value) {
      if (value.match(/\.(mp4|webm)$/i)) {
        mediaEngine.preloadVideo(value).catch(console.error)
      } else {
        mediaEngine.preloadImage(value).catch(console.error)
      }
    }
  }

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] as FileWithMetadata | undefined
    if (file?.path) {
      updateSetting(key, file.path)
    }
  }

  const handleBackup = async (): Promise<void> => {
    try {
      setIsBackingUp(true)
      const path = (await window.api.system.createBackup()) as string
      showToast('Backup berhasil: ' + path, 'success')
    } catch {
      showToast('Backup gagal', 'error')
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0] as FileWithMetadata | undefined
    if (!file) return
    if (!file.name.endsWith('.db')) {
      showToast('Hanya file .db yang didukung', 'error')
      return
    }

    try {
      setIsRestoring(true)
      const filePath = file.path
      if (!filePath) {
        showToast('File path tidak ditemukan.', 'error')
        return
      }
      if (confirm('Aplikasi akan memuat ulang setelah restore. Lanjutkan?')) {
        await window.api.system.restoreBackup(filePath)
        showToast('Restore berhasil', 'success')
        window.location.reload()
      }
    } catch {
      showToast('Restore gagal', 'error')
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
        await window.api.system.reseed()
        await useAppStore.getState().loadSongs()
        showToast('Database lagu berhasil diatur ulang', 'success')
      } catch (err) {
        console.error('Reseed error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Kesalahan database'
        showToast(`Gagal: ${errorMessage}`, 'error')
      } finally {
        setIsReseeding(false)
      }
    }
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
            {activeSection === 'display' && (
              <div className="space-y-6 animate-slide-up">
                <div className="flex flex-col gap-1">
                  <h2 className="text-h2">Pengaturan Display</h2>
                  <p className="text-caption">Kelola monitor dan output proyektor.</p>
                </div>

                <div className="grid gap-4">
                  {displays.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl border border-border-default bg-bg-surface flex items-center justify-between group hover:border-brand-primary/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${d.isPrimary ? 'bg-brand-primary/10 text-brand-primary' : 'bg-bg-elevated text-text-muted'}`}
                        >
                          <Monitor size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary">
                            {d.label || `Display ${d.id}`}
                            {d.isPrimary && (
                              <span className="ml-3 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-wider">
                                Primary
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-muted mt-1">
                            {d.width} × {d.height} px · 60Hz
                          </p>
                        </div>
                      </div>
                      {!d.isPrimary && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-live-green/10 text-live-green border border-live-green/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-live-green animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            Active Output
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-status-info/5 border border-status-info/10 flex gap-3">
                  <Info size={18} className="text-status-info shrink-0" />
                  <p className="text-xs text-text-secondary leading-relaxed">
                    SION Media mendeteksi monitor secara otomatis. Pastikan proyektor terhubung
                    dalam mode &quot;Extend&quot; di pengaturan Windows untuk hasil terbaik.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'hymnals' && (
              <div className="space-y-6 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-h2">Koleksi Buku Lagu</h2>
                    <p className="text-caption">Kelola daftar buku lagu (Hymnals) dalam library.</p>
                  </div>
                  <button onClick={() => openHymnalModal()} className="btn btn-primary h-9 px-4">
                    <Plus size={16} />
                    Buku Baru
                  </button>
                </div>

                <div className="grid gap-4">
                  {hymnals.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 rounded-2xl border border-border-default bg-bg-surface flex items-center justify-between group hover:border-brand-primary/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-sm ${
                            h.is_official
                              ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20'
                              : 'bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20'
                          }`}
                        >
                          {h.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-text-primary">{h.name}</p>
                            {h.is_official === 1 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-bg-elevated border border-border-subtle text-[9px] font-black text-text-disabled uppercase">
                                Official
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-1">
                            {h.language} · {h.publisher || 'Tanpa Penerbit'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {h.is_official === 0 && (
                          <>
                            <button
                              onClick={() => openHymnalModal(h)}
                              className="p-2 rounded-lg text-text-muted hover:bg-bg-active hover:text-text-primary"
                              title="Edit Metadata"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteHymnal(h.id)}
                              className="p-2 rounded-lg text-text-muted hover:bg-status-error/10 hover:text-status-error"
                              title="Hapus Buku"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'theme' && (
              <div className="space-y-8 animate-slide-up">
                <div className="flex flex-col gap-1">
                  <h2 className="text-h2">Tema & Tipografi</h2>
                  <p className="text-caption">Kustomisasi tampilan teks pada layar proyektor.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-micro text-text-muted mb-2 block">
                        Jenis Huruf (Font)
                      </label>
                      <select
                        value={settings.projection_font_family || 'Poppins'}
                        onChange={(e) => updateSetting('projection_font_family', e.target.value)}
                        className="w-full bg-bg-surface border border-border-default rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none transition-all appearance-none"
                      >
                        <option value="Poppins">Poppins (Modern)</option>
                        <option value="Inter">Inter (Clean)</option>
                        <option value="Arial">Arial (Standard)</option>
                        <option value="Georgia">Georgia (Serif)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-micro text-text-muted mb-2 block flex justify-between">
                        Ukuran Font <span>{settings.projection_font_size || '48'}px</span>
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="120"
                        value={settings.projection_font_size || '48'}
                        onChange={(e) => updateSetting('projection_font_size', e.target.value)}
                        className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-micro text-text-muted mb-2 block">Warna Teks</label>
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-bg-surface border border-border-default">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-strong shadow-inner">
                          <input
                            type="color"
                            value={settings.projection_text_color || '#ffffff'}
                            onChange={(e) => updateSetting('projection_text_color', e.target.value)}
                            className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-0"
                          />
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: settings.projection_text_color || '#ffffff' }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                            {settings.projection_text_color || '#ffffff'}
                          </span>
                          <span className="text-[10px] text-text-muted">Klik kotak untuk ubah</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-micro text-text-muted mb-2 block">Efek Visual</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center justify-between p-3 rounded-xl bg-bg-surface border border-border-default cursor-pointer hover:bg-bg-elevated transition-colors">
                          <span className="text-xs font-medium text-text-primary">
                            Bayangan Teks (Shadow)
                          </span>
                          <input
                            type="checkbox"
                            checked={settings.projection_text_shadow === '1'}
                            onChange={(e) =>
                              updateSetting('projection_text_shadow', e.target.checked ? '1' : '0')
                            }
                            className="w-5 h-5 rounded border-border-default text-brand-primary focus:ring-brand-primary bg-bg-base"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview of Settings */}
                <div className="space-y-3">
                  <label className="text-micro text-text-muted block">Pratinjau Hasil</label>
                  <div className="aspect-video w-full rounded-2xl bg-black border-4 border-bg-surface shadow-2xl flex items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-bg-elevated to-bg-base opacity-40" />
                    <div
                      className="relative z-10 text-center transition-all duration-300"
                      style={{
                        fontFamily: settings.projection_font_family || 'Poppins',
                        color: settings.projection_text_color || '#ffffff',
                        fontSize: `${Math.min(parseInt(settings.projection_font_size || '48') / 2, 40)}px`,
                        textShadow:
                          settings.projection_text_shadow === '1'
                            ? '2px 4px 12px rgba(0,0,0,0.8)'
                            : 'none',
                        fontWeight: '600'
                      }}
                    >
                      Kudus, Kudus, Kuduslah Tuhan
                      <br />
                      Allah Semesta Alam
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'background' && (
              <div className="space-y-8 animate-slide-up">
                <div className="flex flex-col gap-1">
                  <h2 className="text-h2">Latar Belakang (Background)</h2>
                  <p className="text-caption">Kelola media dan tampilan standby proyektor.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-micro text-text-muted mb-2 block">Warna Dasar</label>
                      <div className="flex items-center gap-4 p-3 rounded-xl bg-bg-surface border border-border-default">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border-strong">
                          <input
                            type="color"
                            value={settings.projection_bg_color || '#0a0c12'}
                            onChange={(e) => updateSetting('projection_bg_color', e.target.value)}
                            className="absolute -inset-2 w-14 h-14 cursor-pointer opacity-0"
                          />
                          <div
                            className="w-full h-full"
                            style={{ backgroundColor: settings.projection_bg_color || '#0a0c12' }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                            {settings.projection_bg_color || '#0a0c12'}
                          </span>
                          <span className="text-[10px] text-text-muted">Warna dasar output</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-micro text-text-muted mb-2 block">
                        Media (Gambar/Video)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.projection_bg_image || ''}
                          onChange={(e) => updateSetting('projection_bg_image', e.target.value)}
                          placeholder="C:\\Path\\ke\\media..."
                          className="flex-1 bg-bg-base border border-border-default rounded-xl px-4 py-3 text-sm focus:border-brand-primary outline-none transition-all"
                        />
                        <button
                          onClick={() => bgInputRef.current?.click()}
                          className="p-3 rounded-xl bg-bg-elevated border border-border-default hover:bg-bg-active text-brand-primary transition-all"
                          title="Pilih File"
                        >
                          <FolderOpen size={18} />
                        </button>
                        <input
                          ref={bgInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,video/*"
                          onChange={(e) => handleFileSelect('projection_bg_image', e)}
                        />
                      </div>
                      <p className="text-[10px] text-text-disabled mt-2">
                        Mendukung .jpg, .png, .mp4, .webm. Kosongkan untuk warna solid.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-micro text-text-muted mb-2 block flex justify-between">
                        Gelapkan Latar (Overlay){' '}
                        <span>
                          {Math.round(parseFloat(settings.projection_bg_opacity || '0.7') * 100)}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.projection_bg_opacity || '0.7'}
                        onChange={(e) => updateSetting('projection_bg_opacity', e.target.value)}
                        className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-bg-surface border border-border-default space-y-4">
                      <h4 className="text-micro text-text-primary">Logo Jemaat (Standby)</h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.projection_logo || ''}
                          onChange={(e) => updateSetting('projection_logo', e.target.value)}
                          placeholder="Path ke logo..."
                          className="flex-1 bg-bg-base border border-border-default rounded-lg px-3 py-2 text-xs focus:border-brand-primary outline-none transition-all"
                        />
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="p-2 rounded-lg bg-bg-elevated border border-border-default hover:bg-bg-active text-brand-primary transition-all"
                        >
                          <FolderOpen size={14} />
                        </button>
                        <input
                          ref={logoInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileSelect('projection_logo', e)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={settings.projection_logo_position || 'bottom-right'}
                          onChange={(e) =>
                            updateSetting('projection_logo_position', e.target.value)
                          }
                          className="w-full bg-bg-base border border-border-default rounded-lg px-2 py-2 text-[10px] font-bold outline-none"
                        >
                          <option value="center">Tengah</option>
                          <option value="bottom-right">Kanan Bawah</option>
                          <option value="top-left">Kiri Atas</option>
                        </select>
                        <div className="flex items-center justify-center text-[10px] text-text-muted font-bold bg-bg-base rounded-lg border border-border-subtle">
                          Posisi Logo
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'shortcuts' && (
              <div className="space-y-8 animate-slide-up">
                <div className="flex flex-col gap-1">
                  <h2 className="text-h2">Pintasan Keyboard (Shortcuts)</h2>
                  <p className="text-caption">
                    Gunakan keyboard untuk kendali lebih cepat saat live.
                  </p>
                </div>

                <div className="grid gap-3">
                  {SHORTCUTS.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-bg-base text-text-muted group-hover:text-brand-primary transition-colors">
                          <Keyboard size={16} />
                        </div>
                        <span className="text-sm font-medium text-text-primary">{s.action}</span>
                      </div>
                      <kbd className="min-w-[40px] px-3 py-1.5 rounded-lg bg-bg-base border border-border-strong text-[11px] font-mono font-black text-brand-primary shadow-sm">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'backup' && (
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
                        Impor file cadangan untuk mengembalikan data lagu yang telah disimpan
                        sebelumnya.
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
                    Tombol di bawah akan menghapus seluruh lagu kustom dan mengembalikan database ke
                    daftar lagu standar bawaan SION Media.
                  </p>
                  <button
                    onClick={handleReseed}
                    disabled={isReseeding}
                    className="px-4 py-2 rounded-lg border border-status-error/30 text-status-error text-xs font-bold hover:bg-status-error hover:text-white transition-all"
                  >
                    {isReseeding ? 'Mereset...' : 'Reset Database ke Standar'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-10 animate-slide-up py-4">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-brand-primary to-brand-secondary shadow-2xl flex items-center justify-center p-5">
                    <div className="w-full h-full rounded-full border-4 border-white/20 flex items-center justify-center">
                      <span className="text-white text-4xl font-black italic">S</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-text-primary">
                      SION Media
                    </h2>
                    <p className="text-xs text-brand-primary font-black tracking-[0.3em] uppercase">
                      Version 3.0.0 &quot;Aurora&quot;
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center text-center gap-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Platform
                    </span>
                    <span className="text-sm font-bold text-text-primary">Electron + React</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center text-center gap-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Database
                    </span>
                    <span className="text-sm font-bold text-text-primary">SQLite 3</span>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                    SION Media adalah solusi proyeksi lagu modern yang dirancang untuk mendukung
                    kelancaran ibadah dan acara live production.
                  </p>
                  <div className="flex justify-center gap-4">
                    <a
                      href="https://sion-media.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
                    >
                      Website <ExternalLink size={10} />
                    </a>
                    <a
                      href="https://docs.sion-media.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
                    >
                      Dokumentasi <ExternalLink size={10} />
                    </a>
                    <a
                      href="https://github.com/sion-media/app"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
                    >
                      GitHub <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hymnal Modal */}
      {showHymnalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-elevated/50">
              <h3 className="font-bold text-text-primary">
                {editingHymnal ? 'Edit Buku Lagu' : 'Tambah Buku Lagu Baru'}
              </h3>
              <button
                onClick={() => setShowHymnalModal(false)}
                className="p-1 rounded-md hover:bg-bg-active text-text-muted"
              >
                <ArrowLeft size={18} className="rotate-90" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-micro text-text-muted mb-1.5 block">
                  Kode Buku (Singkat)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={hymnalForm.code}
                  onChange={(e) =>
                    setHymnalForm({ ...hymnalForm, code: e.target.value.toUpperCase() })
                  }
                  placeholder="E.g. LS, SDAH, PK"
                  className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>
              <div>
                <label className="text-micro text-text-muted mb-1.5 block">Nama Lengkap Buku</label>
                <input
                  type="text"
                  value={hymnalForm.name}
                  onChange={(e) => setHymnalForm({ ...hymnalForm, name: e.target.value })}
                  placeholder="E.g. Lagu Sion Edisi Lengkap"
                  className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-micro text-text-muted mb-1.5 block">Bahasa</label>
                  <input
                    type="text"
                    value={hymnalForm.language}
                    onChange={(e) => setHymnalForm({ ...hymnalForm, language: e.target.value })}
                    className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-micro text-text-muted mb-1.5 block">Penerbit</label>
                  <input
                    type="text"
                    value={hymnalForm.publisher}
                    onChange={(e) => setHymnalForm({ ...hymnalForm, publisher: e.target.value })}
                    className="w-full bg-bg-base border border-border-default rounded-xl px-4 py-2.5 text-sm focus:border-brand-primary outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-bg-elevated/50 border-t border-border-default flex gap-3">
              <button
                onClick={() => setShowHymnalModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border-strong text-sm font-bold text-text-secondary hover:bg-bg-active"
              >
                Batal
              </button>
              <button
                onClick={handleSaveHymnal}
                disabled={!hymnalForm.code || !hymnalForm.name}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-sm font-bold text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
