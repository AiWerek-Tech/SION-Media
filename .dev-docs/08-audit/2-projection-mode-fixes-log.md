# Projection Mode — Fix Implementation Log

**Tanggal:** 19 Mei 2026
**Status:** ✅ Selesai — 0 TypeScript errors, 0 ESLint errors
**Cakupan:** 27 dari 29 temuan audit diselesaikan (2 ditunda — butuh sprint tersendiri)

---

## Status Lengkap Semua Temuan Audit

| ID      | Severity      | Status     | File yang Diubah                                  |
| ------- | ------------- | ---------- | ------------------------------------------------- |
| BUG-01  | 🔴 Kritis     | ✅ Fixed   | `useProjectionStore.ts`                           |
| BUG-02  | 🔴 Kritis     | ✅ Fixed   | `guards/index.ts`, `useProjectionStore.ts`        |
| BUG-03  | 🔴 Kritis     | ✅ Fixed   | `useProjectionStore.ts`                           |
| BUG-04  | 🔴 Kritis     | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| BUG-05  | 🔴 Kritis     | ✅ Fixed   | `integration-adapter.ts`                          |
| BUG-06  | 🔴 Kritis     | ✅ Fixed   | `integration-adapter.ts`, `useProjectionStore.ts` |
| BUG-07  | 🟠 Signifikan | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| BUG-08  | 🟠 Signifikan | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| BUG-09  | 🟠 Signifikan | ✅ Fixed   | `integration-adapter.ts`                          |
| BUG-10  | 🟠 Signifikan | ✅ Fixed   | `reducers/index.ts`                               |
| BUG-11  | 🟠 Signifikan | ✅ Fixed   | `AtmosphereRenderer.tsx`                          |
| BUG-12  | 🟠 Signifikan | ✅ Fixed   | `AtmosphereRenderer.tsx`                          |
| BUG-13  | 🟠 Signifikan | ✅ Fixed   | `LivePreviewPanel.tsx`, `useGlobalShortcuts.ts`   |
| UX-01   | 🟡 Medium     | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| UX-02   | 🟡 Medium     | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| UX-03   | 🟡 Medium     | ✅ Fixed   | `EmergencyPanel.tsx`                              |
| UX-04   | 🟡 Medium     | ✅ Fixed   | `BiblePanel.tsx`                                  |
| UX-05   | 🟡 Medium     | ✅ Fixed   | `ControlBar.tsx`                                  |
| UX-06   | 🟡 Medium     | ✅ Fixed   | `ControlBar.tsx`                                  |
| UX-07   | 🟡 Medium     | ✅ Fixed   | `ProjectionMode.tsx`                              |
| UX-08   | 🟡 Medium     | ✅ Fixed   | `LivePreviewPanel.tsx`                            |
| UX-09   | 🟡 Medium     | ⏳ Ditunda | Butuh data model chord di database                |
| UX-10   | 🟡 Medium     | ✅ Fixed   | `useGlobalShortcuts.ts`                           |
| ARCH-01 | 🔵 Arsitektur | ⏳ Ditunda | Refactor besar, tidak aman dilakukan sekarang     |
| ARCH-02 | 🔵 Arsitektur | ✅ Fixed   | `useProjectionStore.ts`                           |
| ARCH-03 | 🔵 Arsitektur | ✅ Fixed   | `ipc-handlers.ts`                                 |
| ARCH-04 | 🔵 Arsitektur | ✅ Fixed   | `ipc-channels.ts`, `preload/index.ts`             |
| ARCH-05 | 🔵 Arsitektur | ✅ Fixed   | `useAtmosphereStore.ts`                           |
| ARCH-06 | 🔵 Arsitektur | ✅ Fixed   | `integration-adapter.ts`                          |

---

## File yang Diubah

| File                                                               | Bug/Issue yang Diperbaiki                           |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| `src/renderer/src/store/useProjectionStore.ts`                     | BUG-01, BUG-02, BUG-03, ARCH-02                     |
| `src/renderer/src/core/projection/integration-adapter.ts`          | BUG-05, BUG-06, BUG-09, ARCH-06                     |
| `src/renderer/src/core/projection/state-machine/guards/index.ts`   | BUG-02                                              |
| `src/renderer/src/core/projection/state-machine/reducers/index.ts` | BUG-10                                              |
| `src/renderer/src/components/LivePreviewPanel.tsx`                 | BUG-04, BUG-07, BUG-08, BUG-13, UX-01, UX-02, UX-08 |
| `src/renderer/src/components/ControlBar.tsx`                       | UX-06                                               |
| `src/renderer/src/components/projection/EmergencyPanel.tsx`        | UX-03                                               |
| `src/renderer/src/screens/modes/ProjectionMode.tsx`                | UX-07                                               |
| `src/renderer/src/atmosphere/AtmosphereRenderer.tsx`               | BUG-11, BUG-12                                      |
| `src/renderer/src/store/useAtmosphereStore.ts`                     | ARCH-05                                             |
| `src/renderer/src/hooks/useGlobalShortcuts.ts`                     | BUG-13                                              |
| `src/main/ipc-handlers.ts`                                         | ARCH-03                                             |
| `src/shared/ipc-channels.ts`                                       | ARCH-04                                             |
| `src/preload/index.ts`                                             | ARCH-04                                             |

---

## Detail Perbaikan

### 🔴 BUG-01 — `toggleBlack()` tidak bisa toggle kembali ke LIVE

**File:** `useProjectionStore.ts` → `executeProjectionTransition` (legacy path `projection:black`)

**Sebelum:** `set({ projectionState: 'BLACK' })` — selalu set ke BLACK, tidak ada toggle.

**Sesudah:** Cek state saat ini. Jika sudah BLACK → restore ke LIVE + broadcast IPC `slideUpdate`. Jika bukan BLACK → set ke BLACK + broadcast IPC `stateChange`.

---

### 🔴 BUG-02 — `goToLiveSlide()` diblokir guard yang salah

**File:** `guards/index.ts` + `useProjectionStore.ts`

**Sebelum:**

- `canGoToSlide()` menggunakan `state.slides` (CUE) bukan `state.programSlides` (LIVE)
- Guard memblokir navigasi ketika `programLockState === 'LIVE_LOCK'`
- `goToLiveSlide()` di store juga punya guard `LIVE_LOCK` yang sama

**Sesudah:**

- `canGoToSlide()` menggunakan `programSlides` saat state LIVE/FREEZE
- Semua guard `LIVE_LOCK` yang memblokir navigasi live dihapus
- `goToLiveSection()` dan `goToLiveAddress()` juga dibersihkan dari guard yang salah

---

### 🔴 BUG-03 — Legacy path bypass FSM, tidak broadcast IPC

**File:** `useProjectionStore.ts` → `executeProjectionTransition`

**Sebelum:** Semua action `projection:*` masuk ke legacy path yang hanya memanggil `set()` tanpa IPC broadcast. Jendela proyektor tidak pernah menerima update state.

**Sesudah:** Setiap legacy action sekarang:

- `projection:black` → toggle dengan IPC `stateChange` + `slideUpdate` (restore)
- `projection:freeze` → toggle dengan IPC `stateChange` + `slideUpdate` (restore)
- `projection:clear` → reset state + IPC `stateChange` + `computeNextState()`
- `projection:go-to-slide` → update `programSlideIndex` + `programSlide` + IPC `stateChange` + `slideUpdate`

---

### 🔴 BUG-04 — Timer interval duplikat (timer 2× lebih cepat)

**File:** `LivePreviewPanel.tsx` → `AudioOutputPanel`

**Sebelum:** `AudioOutputPanel` membuat `setInterval(timerTick, 1000)` sendiri, padahal `useTimerTick()` di `App.tsx` sudah membuat interval yang sama.

**Sesudah:** `useEffect` interval dihapus dari `AudioOutputPanel`. Komponen hanya membaca `timerElapsed` dari store (read-only consumer).

---

### 🔴 BUG-05 — `PROJ_FREEZE` tidak punya handler di command bus

**File:** `integration-adapter.ts`

**Sebelum:** `PROJ_FREEZE: null` di map, tidak ada handler di `handleSpecialCommand()`. Command bus mengembalikan error "No handler registered".

**Sesudah:** Handler terdaftar di `registerCommandHandlers()` yang memanggil `store.toggleFreeze()`. Juga tersedia di `handleSpecialCommand()` untuk backward-compat.

---

### 🔴 BUG-06 — `PROTECTION_UPDATE_LIVE` & `PROTECTION_DISCARD` tidak punya handler

**File:** `integration-adapter.ts`

**Sebelum:** Kedua command `null` di map, tidak ada handler. Tombol "Update Live" dan "Discard" di UI serta shortcut `Ctrl+Enter`/`Ctrl+Esc` tidak berfungsi.

**Sesudah:** Handler terdaftar yang memanggil `store.updateLive()` dan `store.discardChanges()`. `updateLive()` juga sekarang broadcast `slideUpdate` IPC setelah commit.

---

### 🟠 BUG-07 — `cutCue()` mengubah fade speed secara permanen

**File:** `LivePreviewPanel.tsx` → `TransitionColumn`

**Sebelum:** `cutCue()` memanggil `setFadeSpeed(0.1)` yang menyimpan ke database dan mengubah setting permanen.

**Sesudah:** `cutCue()` mengirim one-shot `themeUpdate({ transition_duration: '0.1' })` ke projection window tanpa menyentuh `fadeSpeed` store. Setelah transisi, fade speed asli di-restore via `requestAnimationFrame`.

---

### 🟠 BUG-08 — `isCueSameAsProgram` check tidak akurat

**File:** `LivePreviewPanel.tsx` → `TransitionColumn`

**Sebelum:** Hanya membandingkan `songId` dan `slideIndex`. Dua lagu berbeda dengan `slideIndex` yang sama bisa menghasilkan false positive.

**Sesudah:** Tambah perbandingan `text` (konten lirik) sebagai tiebreaker ketiga.

---

### 🟠 BUG-09 — `NAV_CUE_PREV` dan `NAV_CUE_NEXT` tidak punya handler

**File:** `integration-adapter.ts`

**Sebelum:** Kedua command `null` di map. Tombol transport SkipBack/SkipForward di `TransitionColumn` dan shortcut `Shift+←/→` tidak berfungsi.

**Sesudah:** Handler terdaftar yang memanggil `store.cuePrevSlide()` dan `store.cueNextSlide()`.

---

### 🟠 BUG-10 — `reduceBlack()` tidak menyimpan state sebelumnya

**File:** `reducers/index.ts`

**Sebelum:** Reducer hanya set `projectionState: 'BLACK'` tanpa menyimpan state sebelumnya.

**Sesudah:** Reducer menyimpan `previousProjectionState: state.projectionState` sehingga restore dari BLACK bisa kembali ke state yang tepat (LIVE atau FREEZE).

---

### 🟠 BUG-11 — `AtmosphereRenderer` tidak menangani `mode: 'motion'`

**File:** `AtmosphereRenderer.tsx`

**Sebelum:** Mode `'motion'` tidak ada di `backgroundStyle` switch, jatuh ke fallback `backgroundColor: '#000'` tanpa motion layer.

**Sesudah:** Mode `'motion'` ditangani eksplisit — menggunakan `solidColor` sebagai base background sehingga `MotionEngine` di atasnya terlihat dengan benar.

---

### 🟠 BUG-12 — `ReadabilityGuard` blur diterapkan ke seluruh canvas

**File:** `AtmosphereRenderer.tsx`

**Sebelum:** `backdropFilter: blur(4px)` pada div full-canvas memblur seluruh background. `filter: contrast()` pada div kosong tidak berpengaruh.

**Sesudah:** Diganti dengan gradient scrim yang fokus di lower-third (area lirik), dengan opacity yang dikontrol oleh `contrastBoost`. Tidak ada blur global yang merusak visual background.

---

### 🟡 UX-01 — Tombol "Auto" identik dengan "Take"

**File:** `LivePreviewPanel.tsx` → `TransitionColumn`

**Sebelum:** Tombol "Auto" memanggil `takeCue()` — persis sama dengan tombol "Take".

**Sesudah:** Tombol "Auto" diubah menjadi "Cut" yang memanggil `cutCue()` (instant transition tanpa fade). Label dan tooltip diperbarui untuk membedakan fungsinya.

---

### 🟡 UX-02 — Audio meters adalah data statis/hardcoded

**File:** `LivePreviewPanel.tsx` → `AudioOutputPanel`

**Sebelum:** Tiga audio meter dengan nilai hardcoded (`0.0 dB`, `-3.2 dB`, `-6.1 dB`) yang terlihat seperti data real-time.

**Sesudah:** Diganti dengan placeholder "Audio monitoring — Tidak tersedia" yang jelas, sehingga operator tidak disesatkan.

---

### 🟡 UX-03 — EmergencyPanel tidak menutup otomatis setelah deaktivasi

**File:** `EmergencyPanel.tsx`

**Sebelum:** Setelah menekan "DEACTIVATE OVERRIDE", panel tetap terbuka. Operator harus menutup manual.

**Sesudah:** `handleToggle()` memanggil `onClose()` secara otomatis ketika `willActivate === false`.

---

### 🟡 UX-06 — ControlBar tidak menampilkan nama lagu yang live

**File:** `ControlBar.tsx`

**Sebelum:** Program pill hanya menampilkan `Live X/Y` tanpa nama lagu atau section.

**Sesudah:** Pill menampilkan `[HymnalName] X/Y · [SectionLabel]` untuk CUE dan Program. Menggunakan `cuedSongMeta`, `programSongMeta`, dan `sectionLabel` dari slide.

---

### 🟡 UX-07 — Focus mode tidak ada animasi transisi

**File:** `ProjectionMode.tsx`

**Sebelum:** Toggle `isFocusMode` hanya mengubah CSS class — layout berubah instan/jarring.

**Sesudah:** Management section dibungkus `AnimatePresence` + `motion.div` dengan fade+slide animation (250ms, ease premium). Import `AnimatePresence` dan `motion` dari `framer-motion` ditambahkan.

---

### 🔵 ARCH-02 — `mapUIStateToFSMState` kehilangan informasi BLACK/LOGO

**File:** `useProjectionStore.ts`

**Sebelum:** BLACK dan LOGO keduanya di-map ke `'PAUSED'`. Setelah round-trip FSM, keduanya menjadi `'FREEZE'`.

**Sesudah:** BLACK dan LOGO di-map ke string literal `'BLACK'` dan `'LOGO'` yang dipreserve melalui round-trip. `mapFSMStateToUIState` menangani keduanya secara eksplisit.

---

### 🔵 ARCH-03 — Confidence payload dikirim ke projection window, bukan stage display

**File:** `ipc-handlers.ts`

**Sebelum:** `getProjectionWindow()` — confidence data tampil di layar penonton.

**Sesudah:** `getStageDisplayWindow()` — confidence data dikirim ke layar musisi/singer.

---

### 🔵 ARCH-04 — Channel name tidak konsisten (`display_get-all` vs `display:get-all`)

**File:** `ipc-channels.ts`

**Sebelum:** `IPC_DISPLAY.GET_ALL = 'display_get-all'` (underscore).

**Sesudah:** `IPC_DISPLAY.GET_ALL = 'display:get-all'` (colon, konsisten dengan semua channel lain). Handler lama di `ipc-handlers.ts` tetap ada sebagai alias backward-compat.

---

### 🔵 ARCH-05 — AtmosphereStore tidak persist ke database

**File:** `useAtmosphereStore.ts`

**Sebelum:** `setGlobalAtmosphere()` hanya update state in-memory dan broadcast ke projection window. Perubahan hilang setelah restart.

**Sesudah:** `setGlobalAtmosphere()` juga memanggil `window.api.settings.update('projection_default_atmosphere', ...)` untuk persist ke database.

---

### 🔵 ARCH-06 — `registerProjectionHandlers()` mengeksekusi commands saat init

**File:** `integration-adapter.ts`

**Sebelum:** `registerProjectionHandlers()` memanggil `executeRuntimeCommand()` — ini mengeksekusi NAV_NEXT_SLIDE, NAV_PREV_SLIDE, PROJ_TAKE_CUE, PROJ_CLEAR saat startup.

**Sesudah:** Diganti dengan `registerCommandHandlers()` yang mendaftarkan handler functions ke command bus tanpa mengeksekusi apapun.

---

### 🟡 UX-08 — Badge "PROJECTOR LOST" tidak ada di monitor frame

**File:** `LivePreviewPanel.tsx` → `MonitorFrame`

**Sebelum:** `isProjectorLost` dihitung di `LivePreviewPanel` tapi tidak diteruskan ke `MonitorFrame`. Tidak ada indikator visual di frame monitor program.

**Sesudah:**

- Tambah prop `isProjectorLost?: boolean` ke `MonitorFrameProps`
- Badge "No Output" (amber, dengan ikon AlertTriangle) ditampilkan di header Program monitor ketika `isProjectorLost === true`
- Prop diteruskan dari `LivePreviewPanel` ke `MonitorFrame` program

---

### 🟠 BUG-13 — LOGO mode tidak bisa diaktifkan dari UI

**File:** `LivePreviewPanel.tsx` + `useGlobalShortcuts.ts`

**Sebelum:** State `LOGO` ada di type system dan state machine, tapi tidak ada tombol atau shortcut untuk mengaktifkannya. Operator tidak bisa menggunakan fitur standby logo.

**Sesudah:**

- Tombol "Logo" ditambahkan di scene strip `LivePreviewPanel` (di antara Safe Mode dan Black Out)
- Tombol menampilkan state aktif ketika `projectionState === 'LOGO'`
- Shortcut keyboard `L` ditambahkan di `useGlobalShortcuts.ts`:
  - `L` → aktifkan LOGO mode (dari state non-CLEAR)
  - `L` saat sudah LOGO → kembali ke CLEAR (toggle off)
- IPC `stateChange('LOGO')` dikirim ke projection window

---

### 🟡 UX-04 — BiblePanel tidak menggunakan database Bible

**File:** `BiblePanel.tsx` — full rewrite

**Sebelum:** Panel hanya menyediakan input teks manual. Database Bible yang sudah ada (IPC `db:get-bible-translations`, `db:search-bible-verses`) tidak digunakan sama sekali.

**Sesudah:**

- Load translations dari database saat mount via `window.api.bible.getTranslations()`
- Jika ada translations → tampilkan mode pencarian DB dengan debounced search (350ms)
- Hasil pencarian ditampilkan sebagai kartu yang bisa diklik langsung untuk kirim ke Preview
- Selector translation muncul jika ada lebih dari 1 terjemahan
- Toggle tab "Cari DB" / "Manual" untuk beralih antara mode
- Jika DB kosong → otomatis fallback ke manual input
- Manual input tetap tersedia sebagai fallback
- Riwayat ayat dipertahankan di kedua mode

---

### 🟡 UX-05 — Tidak ada konfirmasi sebelum Clear saat LIVE

**File:** `ControlBar.tsx` — `SafeClearButton` component baru

**Sebelum:** Tombol Clear langsung mengeksekusi `PROJ_CLEAR` tanpa konfirmasi, bahkan saat sedang LIVE.

**Sesudah:** Komponen `SafeClearButton` dengan double-click guard:

- Saat **tidak LIVE**: klik langsung clear (tidak ada hambatan)
- Saat **LIVE**: klik pertama → tombol berubah ke state "armed" (merah, animasi pulse, tooltip "Klik lagi untuk konfirmasi") selama 2 detik
- Klik kedua dalam 2 detik → eksekusi clear
- Jika tidak ada klik kedua → reset otomatis
- Tidak ada modal, tidak mengganggu alur kerja operator

---

### 🟡 UX-10 — Shortcut `Ctrl+B` konflik antara Bible dan Black Out

**File:** `useGlobalShortcuts.ts`

**Sebelum:** `Ctrl+B` membuka Bible screen di semua mode, termasuk Projection Mode di mana `B` sudah dipakai untuk Black Out. Operator yang menekan `Ctrl+B` di Projection Mode akan membuka Bible screen secara tidak sengaja.

**Sesudah:**

- `Ctrl+B` hanya membuka Bible screen ketika **bukan** di Projection/Broadcast mode
- Di Projection/Broadcast mode: `Ctrl+B` diabaikan (tidak ada aksi)
- `Ctrl+Shift+B` selalu membuka Bible screen di semua mode (shortcut alternatif yang aman)
- `B` (tanpa modifier) tetap toggle Black Out di Projection mode

---

## Issue yang Tidak Diperbaiki (Perlu Pekerjaan Lebih Besar)

| ID      | Alasan Ditunda                                                                               |
| ------- | -------------------------------------------------------------------------------------------- |
| UX-09   | Chord tab — memerlukan data model chord baru di database dan UI editor chord                 |
| ARCH-01 | Unifikasi tiga jalur command — refactor besar yang berisiko regresi, perlu sprint tersendiri |
