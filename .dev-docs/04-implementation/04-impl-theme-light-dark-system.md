# Implementation: Theme Light / Dark / System (Operator UI + Stage Display + Projection)

Dokumen ini mencatat implementasi sistem tema aplikasi dengan 3 mode:

- `dark`
- `light`
- `system` (mengikuti preferensi OS)

Scope tema berlaku untuk:

- UI Operator (main window)
- Stage Display window
- Projection window

---

## Ringkasan Hasil

- Menambahkan **token light mode** berbasis CSS variables sehingga UI dapat switch tema tanpa refactor class di seluruh komponen.
- Menambahkan **pengaturan tema aplikasi** di Settings (section baru `Tampilan`).
- Menambahkan **persistensi ke DB settings** dengan key `app_theme_mode`.
- Menambahkan **sync lintas window** melalui IPC (`app:theme-mode-set` dan `app:theme-updated`).
- Menambahkan **update Windows titleBarOverlay** agar warna caption area selaras dengan tema efektif.

---

## Database / Migration

### Default setting baru

- Key: `app_theme_mode`
- Value default: `system`

### File

- `src/main/migrations.ts`
  - Menambah migration v8: `default_app_theme_mode_setting`

---

## Design Tokens (CSS)

### Strategi

- Dark mode tetap menjadi default tokens (existing).
- Light mode diimplementasikan sebagai override tokens via selector:

- `:root[data-theme='light'] { ... }`

Sehingga switching dilakukan dengan:

- `document.documentElement.dataset.theme = 'dark' | 'light'`

### File

- `src/renderer/src/assets/main.css`
  - Tambah token light untuk:
    - background/surfaces
    - text colors
    - borders
    - glass tokens
    - shadow tokens

---

## Theme Engine (Renderer)

### Tujuan

- Membaca mode tema dari DB settings (`app_theme_mode`).
- Resolve tema efektif:
  - jika `system`, gunakan `prefers-color-scheme`.
- Apply ke DOM dengan `data-theme`.
- Saat `system`, listen perubahan OS theme dan apply ulang.

### File baru

- `src/renderer/src/utils/app-theme.ts`
  - `AppThemeMode` dan `EffectiveTheme`
  - `resolveEffectiveTheme(mode)`
  - `applyEffectiveTheme(theme)`
  - `watchSystemThemeChanges(...)`
  - `buildThemeSyncPayload(mode)` untuk IPC

### Entry points yang diupdate

- `src/renderer/src/main.tsx`
- `src/renderer/src/stageDisplay/main.tsx`
- `src/renderer/src/projection/main.tsx`

Perilaku:

- Startup: baca `window.api.settings.getAll()` lalu apply.
- Mode `system`: pasang listener OS theme.
- Semua window juga listen event IPC `app:theme-updated` untuk sinkron lintas window.

---

## Settings UI (Pengaturan Tema Aplikasi)

### Implementasi UI

- Menambah section Settings baru: `Tampilan`
- Opsi:
  - System
  - Dark
  - Light

### File baru

- `src/renderer/src/screens/settings/AppThemeSettings.tsx`

### Integrasi

- `src/renderer/src/screens/settings/index.ts`
  - export `AppThemeSettings`
- `src/renderer/src/screens/SettingsScreen.tsx`
  - tambah section `appearance`
  - render `<AppThemeSettings settings={settings} updateSetting={updateSetting} />`

### Persistensi

- Setting disimpan ke DB via:
  - `updateSetting('app_theme_mode', mode)`

---

## Onboarding (Welcome Screen)

### Perubahan

- Menambah opsi `System` pada phase pemilihan tema.
- Default onboarding theme menjadi `system`.

### File

- `src/renderer/src/screens/WelcomeScreen.tsx`

---

## IPC Sync (Lintas Window) + Windows TitleBarOverlay

### IPC channels

- Renderer -> Main:
  - `app:theme-mode-set` (payload: `{ mode, effective }`)
- Main -> All windows:
  - `app:theme-updated` (payload: `{ mode, effective }`)

### Main process

- `src/main/ipc-handlers.ts`
  - handle `app:theme-mode-set`
  - update titleBar overlay (Windows)
  - broadcast ke semua window

- `src/main/windows.ts`
  - `broadcastAppTheme(...)`
  - `updateTitleBarOverlayForTheme(...)`

### Preload API

- `src/preload/index.ts`
  - tambah namespace `appTheme`
- `src/preload/index.d.ts`
  - update typing untuk `appTheme`

---

## Files Changed (Checklist)

- `src/main/migrations.ts`
- `src/main/ipc-handlers.ts`
- `src/main/windows.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/assets/main.css`
- `src/renderer/src/utils/app-theme.ts` (baru)
- `src/renderer/src/main.tsx`
- `src/renderer/src/stageDisplay/main.tsx`
- `src/renderer/src/projection/main.tsx`
- `src/renderer/src/screens/WelcomeScreen.tsx`
- `src/renderer/src/screens/settings/AppThemeSettings.tsx` (baru)
- `src/renderer/src/screens/settings/index.ts`
- `src/renderer/src/screens/SettingsScreen.tsx`
- `src/renderer/src/store/useModeStore.ts`

---

## UI Polish — Light Mode (Library Mode)

Setelah QA visual, ditemukan masalah di `LibraryModeRedesigned` saat light mode aktif:

- **`.number-cell`** (grid nomor lagu) masih menggunakan hardcoded dark gradient, sehingga teks tidak terbaca di light mode.
  - Fix: tambah `:root[data-theme='light'] .number-cell` override di `main.css` dengan background terang, border `border-default`, dan shadow soft.
- **`.pill-tab-active`** tidak terlihat di light mode karena background `rgba(255,255,255,0.06)` hampir transparan di atas background terang.
  - Fix: tambah light mode override untuk `.pill-tabs`, `.pill-tab:hover`, dan `.pill-tab-active`.
- **`LibraryModeRedesigned.tsx`** memiliki `useEffect` yang overwrite `document.documentElement.dataset.theme` dari `useModeStore` (default `'dark'`), sehingga tema dari DB settings (light/system) selalu ditimpa jadi dark saat masuk library mode.
  - Fix: hapus `useEffect` overwrite. Tombol toggle theme di top bar diperbarui agar menggunakan `app-theme.ts` utility (`applyEffectiveTheme`, `buildThemeSyncPayload`, `resolveEffectiveTheme`) sehingga perubahan langsung apply ke DOM, persist ke DB, dan broadcast via IPC.
- **Title bar custom** (`.title-bar`) memakai hardcoded dark gradient sehingga tetap gelap di light mode dan tidak kontras.
  - Fix: tambah light mode override `:root[data-theme='light'] .title-bar` dengan background terang (`#ffffff → #f8fafc`), border `border-default`, dan shadow ringan. Turunan (menu trigger hover, dropdown, toggle btn) juga di-override agar readable.
- **Glass panel** (`.glass-panel`, `.glass-panel-strong`) memakai hardcoded dark background (`rgba(17,19,28,0.92)`), sehingga di light mode kotak "Playlist Workspace" dan dialog lain terlihat gelap dan teks tidak kontras.
  - Fix: tambah light mode override untuk `.glass-panel` (background `rgba(255,255,255,0.92)`) dan `.glass-panel-strong` (background `rgba(255,255,255,0.96)`) dengan border `border-default` dan shadow soft.

### UI Polish — Light Mode (Projection Mode)

Setelah QA visual di Projection Mode, ditemukan masalah:

- **Preview section background** (`ProjectionMode.tsx`) memakai hardcoded dark gradient (`rgba(21,24,38,0.72) → rgba(13,15,23,0.96)`), sehingga area preview terlihat gelap di light mode.
  - Fix: tambah CSS class `.preview-section-bg` dengan light mode override menggunakan gradient terang (`rgba(241,245,249,0.90) → rgba(226,232,240,0.95)`).
- **Modal overlays** di beberapa komponen (`PlaylistPanel`, `HymnalSettings`, `ManagementMode`, `LibrarySearchPalette`, `CommandPalette`, `LibraryPlaylistWorkspace`) memakai `bg-black/60` yang terlihat terlalu gelap di light mode.
  - Fix: tambah CSS utility `.modal-overlay` dengan light mode override (`rgba(15,23,42,0.40)`), dan replace semua `bg-black/60` dengan class ini.
- **Border colors** di beberapa elemen menggunakan `border-white/[0.06]` yang tidak terlihat di light mode.
  - Fix: replace dengan `border-border-subtle` atau `border-border-default` yang theme-aware.
- **Number pad dan footer** di `LibrarySearchPalette.tsx` menggunakan `bg-black/20`, `bg-black/40`, dan `border-white/5`.
  - Fix: replace dengan `bg-bg-base/40` dan `border-border-subtle` yang theme-aware.

## Catatan

- Untuk memastikan `app_theme_mode` pasti tersedia untuk semua user existing, migration v8 memasukkan default `system` dengan `INSERT OR IGNORE`.
- Beberapa komponen (preview/monitor-like UI) masih memang sengaja memakai background gelap untuk simulasi layar. Itu bukan blocker, tapi bisa dipoles lagi jika ingin tampilan light mode yang lebih konsisten.
- Reload aplikasi (Ctrl+R) mungkin diperlukan agar HMR pickup perubahan CSS token dan preload API.
