# Rencana Implementasi: Sistem Theme Light / Dark / System (Operator UI + Stage Display + Projection)

> **Status:** ✅ IMPLEMENTED — Lihat `04-implementation/04-impl-theme-light-dark-system.md`

Dokumen ini merangkum audit dan rencana implementasi sistem tema aplikasi agar mendukung **3 mode tema**:

- Dark
- Light
- System (mengikuti preferensi OS)

Scope tema berlaku untuk:

- UI Operator (Main Window / Renderer utama)
- Stage Display (window `stageDisplay.html`)
- Projection (window `projection.html`)

---

## 1) Ringkasan Kondisi Saat Ini (Audit)

### 1.1 Design tokens sudah ada, tetapi baru 1 set (Dark)

- Token warna dan UI surface didefinisikan sebagai CSS variables pada:
  - `src/renderer/src/assets/main.css` (blok `@theme`)
- Nilai token yang aktif saat ini bernuansa **dark** (contoh `--color-bg-base: #0d0f17`).
- Komponen UI sudah mengandalkan token via class semacam:
  - `bg-bg-base`, `bg-bg-surface`, `text-text-primary`, dll.

Implikasi:

- Arsitektur UI sudah cocok untuk multi-theme (berbasis tokens).
- Namun karena hanya ada 1 set token, UI akan selalu tampil dark.

### 1.2 State tema sudah ada di store, belum diaplikasikan ke DOM

- Store:
  - `src/renderer/src/store/useModeStore.ts`
  - Memiliki `AppTheme = 'dark' | 'light'` (persist localStorage)
- Onboarding:
  - `WelcomeScreen.tsx` sudah menyediakan pilihan theme, dan menyimpan ke store.

Gap:

- Tidak ada “theme applier” yang mengubah `document`/`body` untuk memilih token set.

### 1.3 Settings “Theme” saat ini adalah theme untuk Projection (bukan app theme)

- `SettingsScreen.tsx` section `ThemeSettings` mengatur projection typography/warna teks proyektor.
- Implementasi:
  - setting disimpan via `window.api.settings.update(...)`
  - tema proyektor disebarkan via `window.api.projection.themeUpdate(...)`

Kesimpulan:

- Kita perlu menambah pengaturan **App Theme** terpisah (Light/Dark/System), tanpa mengganggu `ThemeSettings` untuk projection.

### 1.4 Electron titleBarOverlay (Windows) hardcoded dark

- `src/main/windows.ts` mengunci:
  - `titleBarOverlay.color: '#0b0f17'`
  - `symbolColor: '#cbd5e1'`

Jika UI light, titlebar overlay akan terlihat tidak selaras.

---

## 2) Target UX / UI Design Decisions

### 2.1 Nama opsi tema

- **Dark**: default tampilan gelap (saat ini).
- **Light**: tampilan terang untuk penggunaan siang/ruangan terang.
- **System**: mengikuti preferensi OS (`prefers-color-scheme`).

### 2.2 Perilaku “System”

- Jika `System`:
  - tema efektif = `dark` jika OS dark
  - tema efektif = `light` jika OS light
- Jika OS theme berubah saat aplikasi sedang berjalan:
  - UI operator, Stage Display, Projection ikut update (tanpa restart).

### 2.3 Konsistensi across windows

- Perubahan theme dari Settings harus langsung mempengaruhi:
  - Main Window
  - Stage Display window
  - Projection window

Implementasi akan dilakukan dengan:

- “theme applier” per renderer window (mendeteksi setting saat mount dan subscribe perubahan)
- IPC broadcast dari Main Process sebagai fallback sinkron lintas window

---

## 3) Data Model & Persistensi

### 3.1 Key DB Settings baru

Tambahkan key setting di SQLite settings (melalui mekanisme yang sudah ada `db:update-setting`):

- `app_theme_mode`:
  - nilai: `dark | light | system`

Catatan:

- `useModeStore.theme` saat ini hanya `dark|light`. Akan diubah agar mendukung `system` juga.
- DB menjadi sumber utama, store menjadi cache/UX.

### 3.2 Strategi migrasi

Jika user existing tidak punya `app_theme_mode`:

- Default = `system` (direkomendasikan), atau `dark` jika ingin menjaga tampilan existing.
- Keputusan default yang disarankan:
  - **system**, agar user otomatis mendapatkan theme yang sesuai OS.

---

## 4) Rencana Implementasi (Phases)

### PHASE 1 — Theme Tokens: tambah Light token set

Target:

- Menjadikan `main.css` memiliki 2 set token (dark & light), switchable.

Aksi:

- Refactor token dark existing ke scope selector (pilih salah satu):
  - `:root[data-theme='dark'] { ... }`
  - atau `html[data-theme='dark'] { ... }`
- Tambahkan token light:
  - `:root[data-theme='light'] { ... }`

Checklist token minimal:

- Background & surfaces:
  - `--color-bg-base`, `--color-bg-surface`, `--color-bg-elevated`, `--color-bg-active`
- Text:
  - `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-disabled`
- Border:
  - `--color-border-subtle`, `--color-border-default`, `--color-border-strong`, `--color-border-brand`
- Glass tokens:
  - `--color-glass-bg`, `--color-glass-bg-strong`, `--color-glass-border`, `--color-glass-border-strong`, `--color-glass-highlight`
- Shadows:
  - `--shadow-*` (perlu disesuaikan agar tidak terlalu “berat” di light mode)

Verifikasi:

- Manual test: toggle `data-theme` di devtools harus mengubah seluruh UI.

### PHASE 2 — Theme Engine (Renderer): apply theme berdasarkan setting DB + opsi System

Target:

- Setiap renderer window menerapkan theme efektif (`dark|light`) berdasarkan mode (`dark|light|system`) + preferensi OS.

Aksi:

- Update type theme di store menjadi:
  - `AppThemeMode = 'dark' | 'light' | 'system'`
- Implement “theme resolver”:
  - Input: `mode` dan `prefers-color-scheme`
  - Output: theme efektif `dark|light`
- Implement “theme applier”:
  - Set `document.documentElement.dataset.theme = 'dark'|'light'`
  - Pasang listener jika mode `system`:
    - `matchMedia('(prefers-color-scheme: dark)')` change event

Lokasi implementasi:

- Main renderer: `src/renderer/src/App.tsx` (atau `main.tsx`)
- Stage renderer entry: `src/renderer/src/stageDisplay/main.tsx`
- Projection renderer entry: `src/renderer/src/projection/main.tsx`

Catatan:

- Untuk projection/stage, keputusan desain:
  - Tetap mengikuti theme global app (sesuai scope) walau beberapa layer proyeksi memang dominan gelap.

### PHASE 3 — Persistensi DB: baca/tulis `app_theme_mode`

Target:

- Theme preference tersimpan di DB settings dan menjadi source of truth.

Aksi:

- Saat aplikasi mount:
  - `window.api.settings.getAll()` ambil `app_theme_mode`
  - jika kosong, tulis default (system/dark sesuai keputusan)
- Saat user mengubah theme:
  - `window.api.settings.update('app_theme_mode', value)`

Sinkronisasi ke store:

- Update store value agar mencerminkan DB (dan tidak “berbeda” antara localStorage vs DB).
- Rekomendasi: setelah Phase 3 selesai, store theme dapat menjadi derived dari DB, atau store tetap memegang nilai namun DB selalu di-update.

### PHASE 4 — Settings UI: tambahkan pengaturan tema aplikasi

Target:

- Ada section baru di Settings untuk mengubah tema aplikasi.

Aksi:

- Tambahkan section baru (misalnya):
  - `Tampilan` / `Appearance`
- Control yang disarankan:
  - segmented control atau radio group:
    - System
    - Dark
    - Light
- Saat berubah:
  - update DB setting `app_theme_mode`
  - apply theme langsung (optimistic UI)

Catatan UI design:

- Tampilkan deskripsi singkat:
  - System: mengikuti OS
  - Dark/Light: override

### PHASE 5 — IPC Broadcast theme: sinkron lintas windows + titleBarOverlay

Target:

- Perubahan theme mem-broadcast ke semua window.
- Titlebar overlay Windows menyesuaikan theme efektif.

Aksi:

- Tambahkan IPC channel:
  - renderer -> main: `app:theme-mode-changed` (payload: `dark|light|system`)
  - main -> all windows: `app:theme-updated` (payload: effective `dark|light` dan mode)
- Main process:
  - update `BrowserWindow.setTitleBarOverlay({ color, symbolColor })` sesuai theme efektif

Catatan:

- Untuk Windows overlay:
  - dark: `color #0b0f17`, `symbolColor #cbd5e1`
  - light: `color` putih/abu muda, `symbolColor` gelap

### PHASE 6 — QA & UI Polish (Light Mode audit)

Target:

- Memastikan light mode konsisten di seluruh UI, tidak ada elemen “hilang” atau kontras buruk.

Checklist audit:

- Komponen dengan hardcoded warna:
  - `bg-black`, `text-white`, gradient fixed
- Glass panels:
  - overlay putih di dark perlu versi overlay hitam di light
- Border kontras:
  - `rgba(255,255,255,...)` perlu pasangan `rgba(0,0,0,...)`
- Shadow:
  - kurangi opacity di light
- Preview panels:
  - tentukan apakah preview tetap “monitor-like” (gelap) atau mengikuti theme

---

## 5) Testing Plan

### 5.1 Unit/Logic tests (manual + light automation)

- [ ] Resolver: `system + prefersDark=true` => effective `dark`
- [ ] Resolver: `system + prefersDark=false` => effective `light`
- [ ] Mode `dark` selalu output dark, mode `light` selalu output light

### 5.2 Integrasi (runtime)

- [ ] Ubah theme di Settings -> main window berubah tanpa reload
- [ ] Ubah theme di Settings -> stage display ikut berubah
- [ ] Ubah theme di Settings -> projection ikut berubah
- [ ] Set ke `System`, lalu ubah OS theme -> semua window ikut berubah
- [ ] Restart aplikasi -> theme tersimpan (dibaca dari DB)

### 5.3 Windows titleBarOverlay

- [ ] Saat light theme, overlay tidak kontras buruk (icon terlihat jelas)
- [ ] Saat dark theme, overlay tetap seperti existing

---

## 6) Backward Compatibility & Catatan Risiko

- Risiko utama adalah mismatch antara `useModeStore` (localStorage) dan DB settings.
  - Mitigasi: DB jadi sumber utama; store di-sync dari DB saat startup.
- Light mode berpotensi membuat beberapa elemen “kurang terlihat” karena banyak style glass dan border awalnya didesain untuk dark.
  - Mitigasi: selesaikan Phase 6 sebagai audit polishing.

---

## 7) Deliverables

- Dokumen ini (`.dev-docs/02-planning/plan-theme-light-dark-system.md`)
- Theme tokens:
  - Dark & Light token set di `main.css`
- Theme selector UI di Settings
- Persistensi DB `app_theme_mode`
- IPC broadcast untuk sync lintas window + update titleBarOverlay

---

## 8) Referensi File (indikatif)

- Tokens & base UI:
  - `src/renderer/src/assets/main.css`
- Theme store:
  - `src/renderer/src/store/useModeStore.ts`
- Onboarding theme selection:
  - `src/renderer/src/screens/WelcomeScreen.tsx`
- Settings container:
  - `src/renderer/src/screens/SettingsScreen.tsx`
- Projection theme settings (existing):
  - `src/renderer/src/screens/settings/ThemeSettings.tsx`
- Projection renderer:
  - `src/renderer/src/projection/ProjectionApp.tsx`
- Electron windows + titleBarOverlay:
  - `src/main/windows.ts`
