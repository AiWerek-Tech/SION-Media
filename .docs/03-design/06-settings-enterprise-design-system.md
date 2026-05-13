# Settings Enterprise Design System

**Versi:** 1.0.0  
**Tanggal:** 2026-05-13  
**Status:** Production Ready

---

## 1. Filosofi Desain

Settings System SION Media dirancang sebagai **enterprise-grade control center** yang konsisten dengan Library Pro dan Management Studio. Setiap halaman settings harus terasa seperti bagian dari satu ekosistem yang sama — bukan halaman terpisah dengan tema sendiri.

**Prinsip utama:**
- **Unified** — satu design language untuk semua 8 halaman
- **Functional** — setiap kontrol tersambung ke real API
- **Cinematic** — dark luxury UI dengan blue glow accents
- **Operator-first** — low cognitive load, fast workflow

---

## 2. Shell Layout

```
┌─────────────────────────────────────────────────────────┐
│  settings-header (56px, glass, drag-area)               │
│  ← Back  │  Pengaturan Sistem  │  Breadcrumb            │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ settings │  settings-content                            │
│ -sidebar │  (scrollable, max-w-760px / max-w-1200px)   │
│ (252px)  │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Header
- Height: 56px
- Background: `rgba(8, 12, 20, 0.72)` + `backdrop-filter: blur(22px)`
- Drag area untuk window movement
- Back button → `setScreen('dashboard')`
- Breadcrumb: "Pengaturan Sistem > {Section Label}"

### Sidebar
- Width: 252px (sama dengan Library Pro sidebar)
- Background: `linear-gradient(180deg, rgba(13,19,31,0.88), rgba(8,12,20,0.94))`
- Search field di atas
- Nav items: icon (34×34) + label + subtitle
- Active state: blue gradient + right-edge indicator (3px)
- Hover state: `rgba(59,130,246,0.07)`

### Content Area
- Background: `rgba(5,8,16,0.2)`
- Padding: 32px 36px
- Max-width: 760px (default) / 1200px (background section)
- Scrollable dengan custom scrollbar

---

## 3. Page Structure Pattern

Setiap halaman settings mengikuti struktur yang sama:

```tsx
<div className="sp-root">
  {/* 1. Page Header */}
  <div className="sp-page-header">
    <h2 className="sp-page-title">Judul Halaman</h2>
    <p className="sp-page-subtitle">Deskripsi singkat.</p>
    {/* Optional: action buttons */}
  </div>

  {/* 2. Sections */}
  <section className="sp-section">
    <div className="sp-section-header">
      <div className="sp-section-eyebrow"><Icon size={13} />Label Section</div>
      <p className="sp-section-desc">Deskripsi section.</p>
    </div>
    {/* Content */}
  </section>

  {/* 3. Optional: Notice/Info */}
  <div className="sp-notice">...</div>
</div>
```

---

## 4. Color System

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| Shell ambient | `radial-gradient(blue 0.18, transparent)` | Background shell |
| Sidebar | `rgba(13,19,31,0.88)` | Sidebar background |
| Content | `rgba(5,8,16,0.2)` | Content area |
| Card | `rgba(255,255,255,0.025)` | Default card |
| Card hover | `rgba(59,130,246,0.04)` | Card hover |

### Accent Colors
| Usage | Color |
|-------|-------|
| Primary action | `#3b82f6` → `#2563eb` gradient |
| Active state | `rgba(37,99,235,0.34)` |
| Danger | `rgba(244,63,94,0.12)` |
| Success | `rgba(52,211,153,0.15)` |
| Glow | `rgba(59,130,246,0.2)` |

### Borders
| Usage | Value |
|-------|-------|
| Default | `rgba(255,255,255,0.07)` |
| Active | `rgba(59,130,246,0.22)` |
| Danger | `rgba(244,63,94,0.25)` |
| Success | `rgba(52,211,153,0.2)` |

---

## 5. Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title | 26px | 850 | `--color-text-primary` |
| Page subtitle | 13px | 400 | `--color-text-secondary` |
| Section eyebrow | 11px | 850 | `rgba(147,197,253,0.72)` |
| Section desc | 13px | 400 | `--color-text-secondary` |
| Card title | 13–14px | 800 | `--color-text-primary` |
| Card desc | 11–12px | 400 | `--color-text-muted` |
| Label | 11px | 800 | `--color-text-muted` (uppercase) |
| Value | 13px | 700 | `--color-text-primary` |

---

## 6. Component Specifications

### sp-btn (Button)

```
Height: 38px
Padding: 0 16px
Border-radius: 12px
Font: 13px / 750
Transition: 160ms ease-out-expo
```

**Variants:**
- `--primary`: blue gradient, glow shadow
- `--ghost`: transparent, border on hover
- `--danger`: red tint, red border

**States:**
- `:hover` → `translateY(-1px)` + stronger shadow
- `:disabled` → `opacity: 0.45`, no transform
- `.sp-btn__spin` → `animation: sp-spin 0.8s linear infinite`

### sp-toggle (Toggle Switch)

```
Width: 44px
Height: 24px
Border-radius: 999px
Thumb: 16×16px, border-radius: 50%
Transition: 200ms ease-out-expo (background) + ease-spring (thumb)
```

**States:**
- Off: `rgba(255,255,255,0.06)` background, thumb at left
- On: `rgba(37,99,235,0.85)` background + blue glow, thumb at right (`translateX(20px)`)

### sp-option-card (Selectable Card)

```
Border-radius: 18px
Padding: 18px
Background: linear-gradient(135deg, rgba(21,28,46,0.72), rgba(10,15,26,0.82))
Transition: 180ms ease-out-expo
```

**States:**
- Default: `border: 1px solid rgba(255,255,255,0.07)`
- Hover: `translateY(-2px)` + blue border
- Active: blue gradient background + check indicator (18px circle, top-right)

### sp-metric-card (Stat Card)

```
Border-radius: 16px
Padding: 16px
```

**Color variants:** `--blue`, `--violet`, `--emerald`, `--rose`

Each variant has:
- Tinted border
- Tinted background
- Icon container with matching tint
- Active state (darker tint)

### sp-kbd (Keyboard Badge)

```
Min-width: 32px
Height: 28px
Border-radius: 8px
Background: rgba(37,99,235,0.1)
Border: 1px solid rgba(59,130,246,0.25)
Color: rgba(147,197,253,0.9)
Font: Inter monospace, 11px, 800
Box-shadow: 0 2px 0 rgba(37,99,235,0.2), inset 0 1px 0 rgba(255,255,255,0.06)
```

---

## 7. Halaman Settings — Ringkasan

### Display
- Monitor cards dengan glow effect
- Toggle proyektor show/hide
- Set monitor output
- 4 behavior toggles
- Identification grid

### Buku Lagu
- Stats row (total, resmi, kustom)
- Hymnal list dengan hover actions
- Import wizard (preserved)
- Modal dengan sp-modal system

### Tampilan
- Theme mode option cards (3)
- Layout workspace option cards (4)
- 6 UI preference toggles
- Workspace name input

### Tema & Font
- Typography controls (font, weight, size, line-height, max-lines, max-chars)
- Color picker + alignment segmented
- Effects toggles + transition duration
- Live preview stage
- 4 style presets

### Background
- Stats row (images, videos, collections, favorites)
- Global settings (presets, color, overlay, logo)
- Media library (asset grid + inspector + collection manager)

### Keyboard
- 5 category metric cards (live, navigation, playlist, library, system)
- Search bar
- Shortcut list dengan condition labels
- 21 shortcuts total (akurat dari useGlobalShortcuts.ts)

### Backup
- 4 metric cards (hymnal, lagu, status DB, memori)
- Backup card dengan custom path
- Restore card
- Integrity check panel
- Info grid (last backup, memory)
- Danger zone

### Tentang
- App identity hero (3-column)
- 3-tab navigation (Info, Changelog, Credits)
- System info dari window.electron.process
- Memory info dari window.api.system.getMemory()
- Live stats dari useAppStore

---

## 8. Light Mode Support

Semua komponen `sp-*` memiliki override via `:root[data-theme='light']`:

```css
:root[data-theme='light'] .sp-option-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.98));
  border-color: var(--color-border-default);
}
```

Komponen yang di-override:
- `sp-option-card`, `sp-toggle-row`, `sp-input`, `sp-select`
- `sp-metric-card`, `sp-action-card`, `sp-hymnal-row`
- `sp-shortcut-row`, `sp-modal`, `sp-dropdown-menu`
- `settings-shell__ambient`, `settings-header`, `settings-sidebar`
- `settings-display-monitor-card`, `settings-display-setting-card`
- `about-hero-card`, `about-tabs`, `about-sys-card`, `about-stack-item`
- `about-feature-card`, `about-release__content`, `about-credit-row`
- `about-license-panel`, `sp-bg-preset-btn`, `sp-chip`, `sp-asset-card`
- `sp-bg-inspector`

---

## 9. Konsistensi dengan Mode Lain

Settings System menggunakan token yang sama dengan Library Pro dan Management Studio:

| Token | Library Pro | Management Studio | Settings |
|-------|-------------|-------------------|----------|
| Background | `#060a12 → #0a0f19` | `var(--color-bg-base)` | `var(--color-bg-base)` |
| Sidebar bg | `rgba(13,19,31,0.88)` | N/A | `rgba(13,19,31,0.88)` |
| Active nav | Blue gradient glow | Blue left border | Blue gradient + right indicator |
| Card surface | `rgba(255,255,255,0.025)` | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.025)` |
| Primary btn | `#3b82f6 → #2563eb` | `#3b82f6 → #2563eb` | `#3b82f6 → #2563eb` |
| Font | Inter + Poppins | Inter + Poppins | Inter + Poppins |

---

## 10. Referensi

- `04-implementation/29-log-impl-settings-system-enterprise-v1.md` — implementation log
- `04-implementation/30-log-impl-lint-typecheck-hardening.md` — lint/typecheck fixes
- `src/renderer/src/assets/main.css` — semua CSS definitions
- `src/renderer/src/screens/SettingsScreen.tsx` — shell component
- `src/renderer/src/screens/settings/` — semua halaman settings
