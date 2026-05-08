/**
 * Theme Settings Section
 * Handles font, color, and text styling for projection
 */

import React from 'react'

interface ThemeSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

export function ThemeSettings({ settings, updateSetting }: ThemeSettingsProps): React.JSX.Element {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Tema & Tipografi</h2>
        <p className="text-caption">Kustomisasi tampilan teks pada layar proyektor.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-micro text-text-muted mb-2 block">Jenis Huruf (Font)</label>
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
                settings.projection_text_shadow === '1' ? '2px 4px 12px rgba(0,0,0,0.8)' : 'none',
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
  )
}
