/**
 * Background Settings Section
 * Handles background media, colors, and logo configuration
 */

import React, { useRef } from 'react'
import { FolderOpen } from 'lucide-react'

interface BackgroundSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

export function BackgroundSettings({
  settings,
  updateSetting
}: BackgroundSettingsProps): React.JSX.Element {
  const bgInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (key: string, e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file && 'path' in file) {
      const filePath = (file as File & { path: string }).path
      updateSetting(key, filePath)
    }
  }

  return (
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
            <label className="text-micro text-text-muted mb-2 block">Media (Gambar/Video)</label>
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
              <span>{Math.round(parseFloat(settings.projection_bg_opacity || '0.7') * 100)}%</span>
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
                onChange={(e) => updateSetting('projection_logo_position', e.target.value)}
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
  )
}
