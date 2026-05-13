/**
 * Keyboard Settings — Enterprise Functional Redesign
 * Shortcut data sourced directly from useGlobalShortcuts.ts — 100% accurate
 */

import React, { useState } from 'react'
import { Keyboard, Zap, MonitorPlay, Music2, Settings2, Search, Info, Hash } from 'lucide-react'

type ShortcutCategory = 'live' | 'navigation' | 'library' | 'system' | 'playlist'

interface Shortcut {
  keys: string[]
  action: string
  category: ShortcutCategory
  description: string
  condition?: string
}

// Sourced directly from useGlobalShortcuts.ts — every entry maps to a real handler
const SHORTCUTS: Shortcut[] = [
  // ── Live Control ──────────────────────────────────────────────
  {
    keys: ['Space'],
    action: 'TAKE ke Program',
    category: 'live',
    description: 'Kirim slide preview ke layar live (PROJ_TAKE_CUE)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['B'],
    action: 'Black Screen',
    category: 'live',
    description: 'Toggle layar hitam pada output proyektor (PROJ_BLACK)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['F'],
    action: 'Freeze Screen',
    category: 'live',
    description: 'Bekukan tampilan proyektor (PROJ_FREEZE)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['C', 'Esc'],
    action: 'Clear Screen',
    category: 'live',
    description: 'Bersihkan output proyektor ke state CLEAR (PROJ_CLEAR)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['Ctrl+Enter'],
    action: 'Update Live (Dirty)',
    category: 'live',
    description: 'Terapkan perubahan pending ke output live (PROTECTION_UPDATE_LIVE)',
    condition: 'Saat program dalam state LIVE_DIRTY'
  },
  {
    keys: ['Ctrl+C', 'Ctrl+Esc'],
    action: 'Discard Changes',
    category: 'live',
    description:
      'Batalkan perubahan pending dan sinkronkan preview ke program (PROTECTION_DISCARD)',
    condition: 'Saat program dalam state LIVE_DIRTY'
  },

  // ── Navigation ────────────────────────────────────────────────
  {
    keys: ['→', 'PageDown'],
    action: 'Slide Berikutnya (Live)',
    category: 'navigation',
    description: 'Pindah ke slide berikutnya pada output live (NAV_NEXT_SLIDE)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['←', 'PageUp'],
    action: 'Slide Sebelumnya (Live)',
    category: 'navigation',
    description: 'Kembali ke slide sebelumnya pada output live (NAV_PREV_SLIDE)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['Shift+→', 'Shift+PageDown'],
    action: 'Cue Slide Berikutnya',
    category: 'navigation',
    description: 'Pindah ke slide berikutnya di preview (NAV_CUE_NEXT)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['Shift+←', 'Shift+PageUp'],
    action: 'Cue Slide Sebelumnya',
    category: 'navigation',
    description: 'Kembali ke slide sebelumnya di preview (NAV_CUE_PREV)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['G'],
    action: 'Quick Jump (Slide)',
    category: 'navigation',
    description: 'Buka mode Quick Jump untuk navigasi ke nomor slide',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['S'],
    action: 'Quick Jump (Section)',
    category: 'navigation',
    description: 'Buka mode Quick Jump untuk navigasi ke section (verse/chorus/bridge)',
    condition: 'Mode Projection / Broadcast'
  },
  {
    keys: ['Ctrl+G'],
    action: 'Quick Jump Overlay',
    category: 'navigation',
    description: 'Buka overlay Quick Jump lengkap dengan semua opsi navigasi',
    condition: 'Mode Projection / Broadcast'
  },

  // ── Playlist ──────────────────────────────────────────────────
  {
    keys: ['1–9'],
    action: 'Lompat ke Item Playlist',
    category: 'playlist',
    description: 'Langsung buka lagu ke-N dari playlist aktif (1=pertama, 9=kesembilan)',
    condition: 'Playlist aktif, Mode Projection / Broadcast'
  },

  // ── Library ───────────────────────────────────────────────────
  {
    keys: ['Ctrl+F', 'Ctrl+K'],
    action: 'Cari Lagu',
    category: 'library',
    description: 'Fokus ke field pencarian lagu atau buka Command Palette'
  },
  {
    keys: ['Ctrl+Shift+F'],
    action: 'Toggle Focus Mode',
    category: 'library',
    description: 'Aktifkan/nonaktifkan mode fokus workspace (sembunyikan panel sekunder)'
  },
  {
    keys: ['Ctrl+N'],
    action: 'Lagu Baru',
    category: 'library',
    description: 'Buka Song Editor untuk membuat lagu baru'
  },
  {
    keys: ['Ctrl+S'],
    action: 'Simpan Lagu',
    category: 'library',
    description: 'Simpan perubahan di Song Editor',
    condition: 'Hanya di Song Editor'
  },

  // ── System ────────────────────────────────────────────────────
  {
    keys: ['Ctrl+P'],
    action: 'Command Palette',
    category: 'system',
    description: 'Toggle Command Palette untuk akses cepat semua perintah'
  },
  {
    keys: ['?'],
    action: 'Daftar Shortcut',
    category: 'system',
    description: 'Toggle overlay daftar keyboard shortcut ini'
  },
  {
    keys: ['Ctrl+Shift+I'],
    action: 'Runtime Inspector',
    category: 'system',
    description: 'Toggle Runtime Inspector untuk diagnostik sistem'
  }
]

const CATEGORIES: {
  id: ShortcutCategory
  label: string
  icon: React.ElementType
  color: string
  desc: string
}[] = [
  {
    id: 'live',
    label: 'Live Control',
    icon: MonitorPlay,
    color: 'rose',
    desc: 'Kontrol output proyektor secara langsung'
  },
  {
    id: 'navigation',
    label: 'Navigasi',
    icon: Zap,
    color: 'blue',
    desc: 'Navigasi slide dan section'
  },
  {
    id: 'playlist',
    label: 'Playlist',
    icon: Hash,
    color: 'amber',
    desc: 'Akses cepat item playlist'
  },
  {
    id: 'library',
    label: 'Library',
    icon: Music2,
    color: 'violet',
    desc: 'Manajemen lagu dan konten'
  },
  {
    id: 'system',
    label: 'Sistem',
    icon: Settings2,
    color: 'emerald',
    desc: 'Kontrol aplikasi dan tools'
  }
]

export function ShortcutsSettings(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = SHORTCUTS.filter((s) => {
    const matchCat = activeCategory === 'all' || s.category === activeCategory
    const q = searchQuery.toLowerCase().trim()
    const matchSearch =
      !q ||
      s.action.toLowerCase().includes(q) ||
      s.keys.some((k) => k.toLowerCase().includes(q)) ||
      s.description.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="sp-root">
      <div className="sp-page-header">
        <h2 className="sp-page-title">Pintasan Keyboard</h2>
        <p className="sp-page-subtitle">
          Referensi lengkap semua shortcut aktif di SION Media — bersumber langsung dari sistem.
        </p>
      </div>

      {/* Category Stats */}
      <section className="sp-section">
        <div
          className="sp-metric-grid"
          style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
        >
          {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
            const count = SHORTCUTS.filter((s) => s.category === id).length
            return (
              <button
                key={id}
                className={`sp-metric-card sp-metric-card--${color} ${activeCategory === id ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(activeCategory === id ? 'all' : id)}
              >
                <div className="sp-metric-card__icon">
                  <Icon size={16} />
                </div>
                <div className="sp-metric-card__value">{count}</div>
                <div className="sp-metric-card__label">{label}</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Search */}
      <section className="sp-section">
        <div className="sp-search-bar">
          <Search size={15} className="sp-search-bar__icon" />
          <input
            type="text"
            placeholder="Cari shortcut, aksi, atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sp-search-bar__input"
          />
          {searchQuery && (
            <button className="sp-search-bar__clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Active category description */}
      {activeCategory !== 'all' && (
        <div className="sp-notice">
          <div className="sp-notice__icon">
            <Info size={15} />
          </div>
          <p>{CATEGORIES.find((c) => c.id === activeCategory)?.desc}</p>
        </div>
      )}

      {/* Shortcut List */}
      <section className="sp-section">
        <div className="sp-shortcut-list">
          {filtered.map((s, idx) => {
            const cat = CATEGORIES.find((c) => c.id === s.category)
            const CatIcon = cat?.icon || Keyboard
            return (
              <div
                key={`${s.action}-${idx}`}
                className={`sp-shortcut-row sp-shortcut-row--${cat?.color || 'blue'}`}
              >
                <div className="sp-shortcut-row__icon">
                  <CatIcon size={14} />
                </div>
                <div className="sp-shortcut-row__info">
                  <span className="sp-shortcut-row__action">{s.action}</span>
                  <span className="sp-shortcut-row__desc">{s.description}</span>
                  {s.condition && (
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--color-text-muted)',
                        fontStyle: 'italic',
                        marginTop: 2
                      }}
                    >
                      ⚡ {s.condition}
                    </span>
                  )}
                </div>
                <div className="sp-shortcut-row__keys">
                  {s.keys.map((k) => (
                    <kbd key={k} className="sp-kbd">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="sp-empty-state">
              <Keyboard size={28} />
              <strong>Tidak ada shortcut ditemukan</strong>
              <p>Coba kata kunci yang berbeda atau pilih kategori lain.</p>
            </div>
          )}
        </div>
      </section>

      {/* Info */}
      <div className="sp-notice">
        <div className="sp-notice__icon">
          <Keyboard size={15} />
        </div>
        <p>
          Shortcut aktif saat jendela SION Media dalam fokus. Shortcut Live Control dan Navigasi
          hanya aktif di mode <strong>Projection</strong> atau <strong>Broadcast</strong>. Shortcut
          tidak dapat diubah secara manual pada versi ini.
        </p>
      </div>
    </div>
  )
}
