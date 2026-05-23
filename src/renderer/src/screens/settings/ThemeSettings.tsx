/**
 * Tema & Font Settings — Enterprise Functional Redesign
 * All controls wired to real settings keys with live projection preview
 */

import React, { useEffect, useRef } from 'react'
import { Type, Palette, Sliders, Eye, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface ThemeSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

const FONT_OPTIONS = [
  { value: 'Poppins', label: 'Poppins', meta: 'Modern Geometric' },
  { value: 'Inter', label: 'Inter', meta: 'Clean Sans-Serif' },
  { value: 'Montserrat', label: 'Montserrat', meta: 'Bold Display' },
  { value: 'Playfair Display', label: 'Playfair Display', meta: 'Elegant Serif' },
  { value: 'Arial', label: 'Arial', meta: 'Standard' },
  { value: 'Georgia', label: 'Georgia', meta: 'Classic Serif' }
]

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'ExtraBold' },
  { value: '900', label: 'Black' }
]

const STYLE_PRESETS = [
  {
    label: 'Worship Classic',
    font: 'Poppins',
    size: '52',
    weight: '700',
    color: '#ffffff',
    align: 'center',
    lh: '1.4'
  },
  {
    label: 'Modern Bold',
    font: 'Montserrat',
    size: '60',
    weight: '900',
    color: '#f0f9ff',
    align: 'center',
    lh: '1.3'
  },
  {
    label: 'Elegant Serif',
    font: 'Playfair Display',
    size: '48',
    weight: '600',
    color: '#fef9c3',
    align: 'center',
    lh: '1.5'
  },
  {
    label: 'Clean Minimal',
    font: 'Inter',
    size: '44',
    weight: '500',
    color: '#e2e8f0',
    align: 'center',
    lh: '1.6'
  }
]

const PREVIEW_TEXT = 'Kudus, Kudus, Kuduslah Tuhan\nAllah Semesta Alam'

export function ThemeSettings({ settings, updateSetting }: ThemeSettingsProps): React.JSX.Element {
  const previewRef = useRef<HTMLDivElement>(null)

  const fontFamily = settings.projection_font_family || 'Poppins'
  const fontSize = parseInt(settings.projection_font_size || '48')
  const fontWeight = settings.projection_font_weight || '600'
  const textColor = settings.projection_text_color || '#ffffff'
  const textAlign = settings.projection_text_align || 'center'
  const textShadow = settings.projection_text_shadow === '1'
  const textOutline = settings.projection_text_outline === '1'
  const lineHeight = parseFloat(settings.projection_line_height || '1.4')
  const fadeEnabled = (settings.projection_fade ?? '1') === '1'
  const transitionType = settings.transition_type || 'smooth-blur'
  const maxLines = parseInt(settings.projection_max_lines || '4')
  const maxChars = parseInt(settings.projection_max_chars || '40')

  // Sync changes to projection window in real-time
  useEffect(() => {
    window.api.projection.themeUpdate({
      projection_font_family: fontFamily,
      projection_text_color: textColor,
      projection_text_align: textAlign,
      projection_text_shadow: textShadow,
      projection_text_outline: textOutline,
      projection_font_size: fontSize,
      projection_font_weight: fontWeight,
      projection_line_height: lineHeight,
      transition_duration: parseFloat(settings.transition_duration || '0.5'),
      transition_type: transitionType
    })
  }, [
    fontFamily,
    textColor,
    textAlign,
    textShadow,
    textOutline,
    fontSize,
    fontWeight,
    lineHeight,
    settings.transition_duration,
    transitionType
  ])

  const applyPreset = (preset: (typeof STYLE_PRESETS)[0]): void => {
    updateSetting('projection_font_family', preset.font)
    updateSetting('projection_font_size', preset.size)
    updateSetting('projection_font_weight', preset.weight)
    updateSetting('projection_text_color', preset.color)
    updateSetting('projection_text_align', preset.align)
    updateSetting('projection_line_height', preset.lh)
  }

  const transitionDuration = parseFloat(settings.transition_duration || '0.5')

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Tema &amp; Font</h2>
        <p className="sp-page-subtitle">
          Kustomisasi tipografi, warna, dan efek visual tampilan proyektor.
        </p>
      </div>

      {/* Typography */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Type size={13} />
            Tipografi
          </div>
          <p className="sp-section-desc">
            Atur jenis huruf, ukuran, bobot, dan spasi teks pada layar proyektor.
          </p>
        </div>
        <div className="sp-form-grid sp-form-grid--2">
          <div className="sp-field">
            <label className="sp-field__label">Jenis Huruf (Font)</label>
            <div className="sp-select-wrap">
              <select
                value={fontFamily}
                onChange={(e) => updateSetting('projection_font_family', e.target.value)}
                className="sp-select"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label} — {f.meta}
                  </option>
                ))}
              </select>
              <svg
                className="sp-select-chevron"
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
          <div className="sp-field">
            <label className="sp-field__label">Font Weight</label>
            <div className="sp-select-wrap">
              <select
                value={fontWeight}
                onChange={(e) => updateSetting('projection_font_weight', e.target.value)}
                className="sp-select"
              >
                {WEIGHT_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
              <svg
                className="sp-select-chevron"
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
          <div className="sp-field">
            <label className="sp-field__label sp-field__label--between">
              <span>Ukuran Font</span>
              <span className="sp-field__value-badge">{fontSize}px</span>
            </label>
            <input
              type="range"
              min="24"
              max="120"
              value={fontSize}
              onChange={(e) => updateSetting('projection_font_size', e.target.value)}
              className="sp-range"
            />
            <div className="sp-range-labels">
              <span>24px</span>
              <span>120px</span>
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-field__label sp-field__label--between">
              <span>Line Height</span>
              <span className="sp-field__value-badge">{lineHeight.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.1"
              value={lineHeight}
              onChange={(e) => updateSetting('projection_line_height', e.target.value)}
              className="sp-range"
            />
            <div className="sp-range-labels">
              <span>1.0</span>
              <span>2.0</span>
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-field__label sp-field__label--between">
              <span>Maks. Baris per Slide</span>
              <span className="sp-field__value-badge">{maxLines}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={maxLines}
              onChange={(e) => updateSetting('projection_max_lines', e.target.value)}
              className="sp-range"
            />
            <div className="sp-range-labels">
              <span>1</span>
              <span>8</span>
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-field__label sp-field__label--between">
              <span>Maks. Karakter per Baris</span>
              <span className="sp-field__value-badge">{maxChars}</span>
            </label>
            <input
              type="range"
              min="20"
              max="80"
              value={maxChars}
              onChange={(e) => updateSetting('projection_max_chars', e.target.value)}
              className="sp-range"
            />
            <div className="sp-range-labels">
              <span>20</span>
              <span>80</span>
            </div>
          </div>
        </div>
      </section>

      {/* Color & Alignment */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Palette size={13} />
            Warna &amp; Perataan
          </div>
          <p className="sp-section-desc">
            Atur warna teks dan perataan konten pada layar proyektor.
          </p>
        </div>
        <div className="sp-form-grid sp-form-grid--2">
          <div className="sp-field">
            <label className="sp-field__label">Warna Teks</label>
            <div className="sp-color-picker-row">
              <div className="sp-color-swatch" style={{ background: textColor }}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => updateSetting('projection_text_color', e.target.value)}
                  className="sp-color-input"
                />
              </div>
              <div className="sp-color-info">
                <span className="sp-color-hex">{textColor.toUpperCase()}</span>
                <span className="sp-color-hint">Klik untuk ubah warna teks</span>
              </div>
            </div>
          </div>
          <div className="sp-field">
            <label className="sp-field__label">Perataan Teks</label>
            <div className="sp-segmented">
              {[
                { value: 'left', icon: AlignLeft, label: 'Kiri' },
                { value: 'center', icon: AlignCenter, label: 'Tengah' },
                { value: 'right', icon: AlignRight, label: 'Kanan' }
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  className={`sp-segmented__btn ${textAlign === value ? 'is-active' : ''}`}
                  onClick={() => updateSetting('projection_text_align', value)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Effects & Transitions */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Sliders size={13} />
            Efek &amp; Transisi
          </div>
          <p className="sp-section-desc">Konfigurasi efek visual dan animasi transisi slide.</p>
        </div>
        <div className="sp-toggle-list">
          {[
            {
              label: 'Bayangan Teks (Shadow)',
              desc: 'Drop shadow untuk meningkatkan keterbacaan di atas background',
              key: 'projection_text_shadow',
              default: '1'
            },
            {
              label: 'Outline Teks',
              desc: 'Outline tipis di sekitar teks untuk kontras lebih tinggi',
              key: 'projection_text_outline',
              default: '0'
            },
            {
              label: 'Animasi Fade Slide',
              desc: 'Transisi fade halus saat pergantian slide',
              key: 'projection_fade',
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
        {fadeEnabled && (
          <div className="sp-field" style={{ marginTop: 14 }}>
            <label className="sp-field__label">Tipe Transisi</label>
            <div className="sp-select-wrap mb-4">
              <select
                value={transitionType}
                onChange={(e) => updateSetting('transition_type', e.target.value)}
                className="sp-select"
              >
                <option value="dissolve">Fade (Dissolve)</option>
                <option value="crossfade">Crossfade</option>
                <option value="fast-cut">Fast Cut</option>
                <option value="slide">Slide Up</option>
                <option value="smooth-blur">Smooth Blur (Premium)</option>
                <option value="premium-slide">Premium Slide</option>
              </select>
              <svg
                className="sp-select-chevron"
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
            <label className="sp-field__label sp-field__label--between">
              <span>Durasi Transisi</span>
              <span className="sp-field__value-badge">{transitionDuration.toFixed(1)}s</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={transitionDuration}
              onChange={(e) => updateSetting('transition_duration', e.target.value)}
              className="sp-range"
            />
            <div className="sp-range-labels">
              <span>0.1s (Cepat)</span>
              <span>2.0s (Lambat)</span>
            </div>
          </div>
        )}
      </section>

      {/* Live Preview */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Eye size={13} />
            Pratinjau Langsung
          </div>
          <p className="sp-section-desc">
            Preview tampilan teks pada layar proyektor secara real-time.
          </p>
        </div>
        <div className="sp-preview-stage">
          <div className="sp-preview-stage__screen" ref={previewRef}>
            <div className="sp-preview-stage__scanlines" />
            <div
              className="sp-preview-stage__text"
              style={{
                fontFamily,
                fontSize: `${Math.min(fontSize / 2.2, 36)}px`,
                fontWeight,
                color: textColor,
                textAlign: textAlign as 'left' | 'center' | 'right',
                lineHeight,
                textShadow: textShadow ? '2px 4px 16px rgba(0,0,0,0.9)' : 'none',
                WebkitTextStroke: textOutline ? `1px rgba(0,0,0,0.6)` : 'none'
              }}
            >
              {PREVIEW_TEXT.split('\n').map((line, i) => (
                <span key={i} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </div>
            <div className="sp-preview-stage__label">
              PROYEKTOR OUTPUT · {fontSize}px {fontFamily}
            </div>
          </div>
        </div>
      </section>

      {/* Style Presets */}
      <section className="sp-section">
        <div className="sp-section-header">
          <div className="sp-section-eyebrow">
            <Sliders size={13} />
            Preset Gaya
          </div>
          <p className="sp-section-desc">
            Terapkan preset gaya teks yang sudah dikurasi untuk ibadah.
          </p>
        </div>
        <div className="sp-preset-grid">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="sp-preset-card"
              onClick={() => applyPreset(preset)}
            >
              <div
                className="sp-preset-card__preview"
                style={{ fontFamily: preset.font, fontWeight: preset.weight, color: preset.color }}
              >
                Aa
              </div>
              <div className="sp-preset-card__label">{preset.label}</div>
              <div className="sp-preset-card__meta">
                {preset.font} · {preset.size}px
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
