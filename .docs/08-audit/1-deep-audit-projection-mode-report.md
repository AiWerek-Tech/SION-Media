# 🔍 Laporan Audit Mendalam: Projection Mode — SION Media Desktop

> **Status:** ✅ AUDIT SELESAI — 27/29 temuan sudah diperbaiki. Lihat `2-projection-mode-fixes-log.md`

**Tanggal Audit:** 19 Mei 2026
**Scope:** UI/UX, Fungsionalitas Tombol, Backend/IPC, State Machine, Keyboard Shortcuts

---

## 🔴 BUG KRITIS (Harus Diperbaiki Segera)

---

### BUG-01 — `toggleBlack()` Tidak Bisa Toggle Kembali ke LIVE

**File:** `useProjectionStore.ts` — fungsi `toggleBlack()`
**Severity:** 🔴 Kritis

**Masalah:**

```typescript
toggleBlack: () => {
  const { projectionState } = get()
  if (projectionState === 'CLEAR') return // ✅ Guard ini benar

  executeProjectionTransition({ type: 'projection:black', payload: {} }, set, get)
}
```

Di `executeProjectionTransition`, action `projection:black` hanya memanggil `set({ projectionState: 'BLACK' })` — **tidak ada toggle**. Jika state sudah `BLACK`, menekan B lagi tetap set ke `BLACK`. Tidak ada logika untuk kembali ke `LIVE`.

Sementara itu, `reduceBlack()` di reducers juga hanya:

```typescript
export function reduceBlack(state): ProjectionSnapshot {
  return Object.freeze({ ...state, projectionState: 'BLACK' })
}
```

Tidak ada toggle. Operator tidak bisa keluar dari BLACK kecuali menekan Clear atau Freeze.

**Rekomendasi:**

```typescript
toggleBlack: () => {
  const { projectionState } = get()
  if (projectionState === 'CLEAR') return
  if (projectionState === 'BLACK') {
    // Restore ke LIVE
    set({ projectionState: 'LIVE' })
    window.api.projection.stateChange('LIVE')
    if (get().programSlide) window.api.projection.slideUpdate(get().programSlide)
  } else {
    set({ projectionState: 'BLACK' })
    window.api.projection.stateChange('BLACK')
  }
}
```

---

### BUG-02 — `goToLiveSlide()` Diblokir oleh Guard yang Salah

**File:** `guards/index.ts` — `canGoToSlide()`
**Severity:** 🔴 Kritis

**Masalah:**

```typescript
export function canGoToSlide(state, slideIndex): boolean {
  return (
    slideIndex >= 0 && slideIndex < state.slides.length && state.programLockState !== 'LIVE_LOCK'
  )
}
```

Guard ini menggunakan `state.slides` (CUE/preview slides), bukan `state.programSlides`. Ketika operator sedang LIVE dan ingin jump ke slide tertentu di program, `state.slides` mungkin berbeda dari `state.programSlides`. Selain itu, guard memblokir navigasi ketika `programLockState === 'LIVE_LOCK'` — padahal justru saat LIVE_LOCK itulah operator perlu navigasi live.

Di `useProjectionStore.ts`, `goToLiveSlide()` juga punya guard yang sama:

```typescript
if (programLockState === 'LIVE_LOCK') {
  logger.warn('[Quick Jump] Cannot navigate live while LIVE_LOCK is active')
  return
}
```

Ini **salah logika** — LIVE_LOCK berarti sedang live, dan navigasi live seharusnya diizinkan.

**Rekomendasi:**

- Guard `canGoToSlide` untuk live navigation harus menggunakan `programSlides` dan **mengizinkan** LIVE_LOCK
- Hapus guard `programLockState === 'LIVE_LOCK'` dari `goToLiveSlide()`

---

### BUG-03 — `executeProjectionTransition` Tidak Menangani FSM Events dengan Benar

**File:** `useProjectionStore.ts` — `executeProjectionTransition()`
**Severity:** 🔴 Kritis

**Masalah:** Ada dua jalur eksekusi yang tidak konsisten:

```typescript
// Jalur 1: Legacy (bypass FSM)
if (type.startsWith('projection:')) {
  if (type === 'projection:go-to-slide') {
    set({ currentSlideIndex: ... })  // Hanya update CUE, tidak program!
  } else if (type === 'projection:black') {
    set({ projectionState: 'BLACK' })  // Tidak broadcast IPC!
  }
  return
}

// Jalur 2: FSM (tidak pernah tercapai untuk projection: events)
const result = requestTransition(currentFSMState, transitionRequest)
```

Semua action `projection:*` masuk ke jalur legacy dan **bypass FSM sepenuhnya**. Akibatnya:

- `projection:black` tidak mengirim IPC `stateChange` ke jendela proyektor
- `projection:go-to-slide` hanya update `currentSlideIndex` (CUE), bukan `programSlideIndex` (LIVE)
- `projection:freeze` tidak mengirim IPC

**Rekomendasi:** Hapus jalur legacy atau pastikan setiap action legacy juga mengirim IPC yang diperlukan.

---

### BUG-04 — `AudioOutputPanel` Membuat Timer Interval Duplikat

**File:** `LivePreviewPanel.tsx` — `AudioOutputPanel` component
**Severity:** 🔴 Kritis

**Masalah:**

```typescript
function AudioOutputPanel(): React.JSX.Element {
  const { timerRunning, timerTick } = useProjectionStore()

  useEffect(() => {
    if (!timerRunning) return undefined
    const interval = window.setInterval(timerTick, 1000)  // ← DUPLIKAT!
    return () => window.clearInterval(interval)
  }, [timerRunning, timerTick])
```

`useTimerTick` hook di `App.tsx` **sudah** membuat interval 1 detik yang memanggil `timerTick()`. `AudioOutputPanel` membuat interval **kedua** yang juga memanggil `timerTick()`. Hasilnya timer berjalan **2x lebih cepat** dari yang seharusnya.

**Rekomendasi:** Hapus `useEffect` timer dari `AudioOutputPanel`. Cukup tampilkan `timerElapsed` dari store.

---

### BUG-05 — `PROJ_FREEZE` Command Tidak Terdaftar di Command Bus

**File:** `integration-adapter.ts` + `runtimeCommandBus.ts`
**Severity:** 🔴 Kritis

**Masalah:** Di `COMMAND_TO_EVENT_MAP`:

```typescript
PROJ_FREEZE: null, // Freeze is UI state, not FSM state
```

Dan di `handleSpecialCommand()`, `PROJ_FREEZE` tidak ada dalam switch case. Ketika `executeRuntimeCommand('PROJ_FREEZE', ...)` dipanggil dari `ControlBar.tsx` atau keyboard shortcut, command bus tidak punya handler → event `ERROR: No handler registered for command: PROJ_FREEZE`.

Namun di `useProjectionStore`, `toggleFreeze()` ada dan berfungsi. Masalahnya adalah command bus tidak pernah memanggil `store.toggleFreeze()`.

**Rekomendasi:** Tambahkan handler untuk `PROJ_FREEZE` dan `PROJ_BLACK` di integration adapter atau daftarkan handler langsung di command bus.

---

### BUG-06 — `PROTECTION_UPDATE_LIVE` dan `PROTECTION_DISCARD` Tidak Punya Handler

**File:** `integration-adapter.ts`
**Severity:** 🔴 Kritis

**Masalah:** Di `COMMAND_TO_EVENT_MAP`:

```typescript
PROTECTION_UPDATE_LIVE: null,
PROTECTION_DISCARD: null,
```

Tidak ada handler di `handleSpecialCommand()` untuk kedua command ini. Tombol "Update Live" dan "Discard" di `LivePreviewPanel.tsx` dan keyboard shortcut `Ctrl+Enter`/`Ctrl+Esc` tidak akan berfungsi.

**Rekomendasi:** Tambahkan handler:

```typescript
case 'PROTECTION_UPDATE_LIVE':
  useProjectionStore.getState().updateLive()
  return true
case 'PROTECTION_DISCARD':
  useProjectionStore.getState().discardChanges()
  return true
```

---

## 🟠 BUG SIGNIFIKAN

---

### BUG-07 — `cutCue()` di `TransitionColumn` Mengubah Fade Speed Secara Permanen

**File:** `LivePreviewPanel.tsx` — `TransitionColumn`
**Severity:** 🟠 Signifikan

**Masalah:**

```typescript
const cutCue = (): void => {
  setFadeSpeed(0.1) // ← Mengubah fade speed global secara permanen!
  takeCue()
}
```

`setFadeSpeed(0.1)` menyimpan nilai ke database (`window.api.settings.update('transition_duration', ...)`). Setelah operator menekan "Cut", fade speed akan tetap 0.1s bahkan setelah restart aplikasi.

**Rekomendasi:** Gunakan fade speed sementara hanya untuk satu transisi tanpa menyimpan ke settings.

---

### BUG-08 — `isCueSameAsProgram` Check Tidak Akurat

**File:** `LivePreviewPanel.tsx` — `TransitionColumn`
**Severity:** 🟠 Signifikan

**Masalah:**

```typescript
const isCueSameAsProgram =
  hasCue &&
  hasProgram &&
  previewSlide?.songId === programSlide?.songId &&
  previewSlide?.slideIndex === programSlide?.slideIndex
```

Check ini menggunakan `slideIndex` dari `SlideData` (yang merupakan index dalam lagu), bukan posisi dalam array. Jika dua lagu berbeda memiliki slide dengan `slideIndex` yang sama (misalnya keduanya punya slide index 0), check ini bisa memberikan false positive dan memblokir TAKE yang seharusnya valid.

**Rekomendasi:** Tambahkan perbandingan `songId` yang lebih ketat, atau gunakan referensi objek langsung.

---

### BUG-09 — `NAV_CUE_PREV` dan `NAV_CUE_NEXT` Tidak Punya Handler

**File:** `integration-adapter.ts`
**Severity:** 🟠 Signifikan

**Masalah:** Di `COMMAND_TO_EVENT_MAP`:

```typescript
NAV_CUE_NEXT: null,
NAV_CUE_PREV: null,
```

Tombol transport `SkipBack` di `TransitionColumn` memanggil `executeRuntimeCommand('NAV_CUE_PREV', ...)` — tidak ada handler. Keyboard shortcut `Shift+←` dan `Shift+→` juga tidak berfungsi.

**Rekomendasi:** Tambahkan handler yang memanggil `store.cuePrevSlide()` dan `store.cueNextSlide()`.

---

### BUG-10 — `reduceBlack()` Tidak Mempertahankan State Sebelumnya untuk Restore

**File:** `reducers/index.ts`
**Severity:** 🟠 Signifikan

**Masalah:**

```typescript
export function reduceBlack(state): ProjectionSnapshot {
  return Object.freeze({ ...state, projectionState: 'BLACK' })
}
```

Tidak ada penyimpanan state sebelumnya (`previousState`). Ketika operator keluar dari BLACK, tidak ada cara untuk mengetahui apakah harus kembali ke LIVE atau FREEZE. Arsitektur dokumen menyebutkan "LIVE from BLACK restores previous slide" tapi implementasinya tidak ada.

---

### BUG-11 — `AtmosphereRenderer` Tidak Menangani `mode: 'motion'`

**File:** `AtmosphereRenderer.tsx`
**Severity:** 🟠 Signifikan

**Masalah:**

```typescript
const backgroundStyle = useMemo(() => {
  if (mode === 'solid') return { backgroundColor: solidColor || '#000' }
  if (mode === 'gradient' && gradient) return { background: getGradientCss(gradient) }
  return { backgroundColor: '#000' } // ← Fallback untuk 'motion', 'image', 'video'
}, [mode, solidColor, gradient])
```

Mode `'motion'` tidak ditangani di `backgroundStyle`. Jika atmosphere config memiliki `mode: 'motion'`, background akan hitam polos tanpa motion effect (karena `MotionEngine` hanya dirender jika `motionConfig` ada, bukan berdasarkan `mode`).

---

### BUG-12 — `ReadabilityGuard` Menggunakan `backdropFilter` pada Seluruh Canvas

**File:** `AtmosphereRenderer.tsx` — `ReadabilityGuard`
**Severity:** 🟠 Signifikan

**Masalah:**

```typescript
const ReadabilityGuard: React.FC<{ config: ReadabilityConfig }> = ({ config }) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backdropFilter: blurBehindLyrics ? 'blur(4px)' : 'none',
        filter: `contrast(${1 + contrastBoost})`
      }}
    />
  )
}
```

`backdropFilter: blur(4px)` diterapkan ke **seluruh canvas** (1920×1080), bukan hanya di belakang teks lirik. Ini akan memblur seluruh background termasuk area yang tidak ada teksnya, dan `filter: contrast()` pada div kosong tidak akan berpengaruh pada konten di bawahnya.

---

### BUG-13 — `ProjectionApp.tsx` Tidak Menangani State `LOGO`

**File:** `ProjectionApp.tsx`
**Severity:** 🟠 Signifikan

**Masalah:** `ProjectionApp` menerima `projectionState` dari IPC dan meneruskannya ke `PresentationCanvas`. Di `PresentationCanvas`:

```typescript
const showLogo = Boolean(
  projectionState === 'LOGO' || (projectionState === 'CLEAR' && theme.projection_logo)
)
```

Namun `ProjectionState` type di `shared/types.ts` mencakup `'LOGO'`, dan state machine mendukungnya, tapi tidak ada tombol atau shortcut untuk mengaktifkan LOGO mode di UI. Operator tidak bisa menggunakan fitur ini.

---

## 🟡 MASALAH UI/UX

---

### UX-01 — Tombol "Auto" di TransitionColumn Identik dengan "Take"

**File:** `LivePreviewPanel.tsx`
**Severity:** 🟡 Medium

**Masalah:**

```typescript
<button className="transition-rack__auto" onClick={takeCue} ...>
  <span>Auto</span>
  <strong>{fadeSpeed.toFixed(1)}s</strong>
</button>
```

Tombol "Auto" memanggil fungsi yang **sama persis** dengan tombol "Take" (`takeCue()`). Tidak ada perbedaan fungsional. Operator akan bingung mengapa ada dua tombol dengan fungsi identik.

**Rekomendasi:** Implementasikan auto-advance timer yang sesungguhnya, atau hapus tombol "Auto" dan ganti dengan indikator fade speed saja.

---

### UX-02 — Audio Meters di `AudioOutputPanel` Adalah Data Statis/Hardcoded

**File:** `LivePreviewPanel.tsx` — `AudioOutputPanel`
**Severity:** 🟡 Medium

**Masalah:**

```typescript
const meters = [
  { label: 'Master', value: '0.0 dB', level: '92%' },
  { label: 'Mic / Aux', value: '-3.2 dB', level: '76%' },
  { label: 'BGM', value: '-6.1 dB', level: '64%' }
]
```

Nilai audio meter adalah **hardcoded** dan tidak berubah. Ini menyesatkan operator yang mungkin mengira ini adalah level audio real-time. Tidak ada koneksi ke audio system apapun.

**Rekomendasi:** Hapus audio meters atau beri label jelas "Simulasi" / "Tidak Tersedia", atau implementasikan integrasi audio yang nyata.

---

### UX-03 — `EmergencyPanel` Tidak Menutup Otomatis Saat Emergency Dinonaktifkan

**File:** `EmergencyPanel.tsx`
**Severity:** 🟡 Medium

**Masalah:** Setelah operator menekan "DEACTIVATE OVERRIDE", panel tetap terbuka. Operator harus menutup manual dengan tombol X atau Escape. Dalam situasi darurat, setiap langkah ekstra bisa krusial.

**Rekomendasi:** Panggil `onClose()` secara otomatis setelah deaktivasi berhasil.

---

### UX-04 — `BiblePanel` Tidak Menggunakan Database Bible yang Ada

**File:** `BiblePanel.tsx`
**Severity:** 🟡 Medium

**Masalah:** Panel Bible hanya menyediakan input teks manual. Padahal ada IPC handlers lengkap untuk Bible (`db:get-bible-translations`, `db:get-bible-books`, `db:get-bible-verses`, `db:search-bible-verses`). Operator harus mengetik teks ayat secara manual alih-alih mencari dari database.

**Rekomendasi:** Integrasikan `window.api.bible.searchVerses()` untuk pencarian ayat dari database.

---

### UX-05 — Tidak Ada Konfirmasi Sebelum `clearScreen()` Saat LIVE

**File:** `ControlBar.tsx`, `LivePreviewPanel.tsx`
**Severity:** 🟡 Medium

**Masalah:** Tombol "Clear" dan shortcut `Esc`/`C` langsung menghapus output tanpa konfirmasi apapun, bahkan saat sedang LIVE. Ini bisa menyebabkan layar proyektor tiba-tiba kosong di depan jemaat.

**Rekomendasi:** Tambahkan konfirmasi singkat (misalnya double-press atau hold) untuk Clear saat state LIVE.

---

### UX-06 — `ControlBar` Tidak Menampilkan Nama Lagu yang Sedang Live

**File:** `ControlBar.tsx`
**Severity:** 🟡 Medium

**Masalah:** Program status pill hanya menampilkan `Live X/Y` (nomor slide). Tidak ada informasi nama lagu atau section label. Operator harus melihat monitor untuk mengetahui lagu apa yang sedang diproyeksikan.

**Rekomendasi:** Tambahkan nama lagu dan section label di Program status pill.

---

### UX-07 — Focus Mode Tidak Memiliki Animasi Transisi

**File:** `ProjectionMode.tsx`
**Severity:** 🟡 Medium

**Masalah:** Toggle focus mode (`isFocusMode`) hanya mengubah CSS class `projection-layout--focus` tanpa animasi. Layout berubah secara instan/jarring. Dokumen perencanaan v9 dan v9.1 sudah mengidentifikasi ini sebagai masalah dan merekomendasikan Framer Motion, tapi belum diimplementasikan.

**Rekomendasi:** Implementasikan `AnimatePresence` + `motion.section` untuk management panel.

---

### UX-08 — Tidak Ada Indikator Visual "PROJECTOR LOST" di Monitor Frame

**File:** `LivePreviewPanel.tsx` — `MonitorFrame`
**Severity:** 🟡 Medium

**Masalah:** `isProjectorLost` dihitung di `LivePreviewPanel` tapi tidak diteruskan ke `MonitorFrame` sebagai prop. Dokumen v9.1 merekomendasikan badge "PROJECTOR LOST" di Program monitor frame, tapi prop `isProjectorLost` tidak ada di `MonitorFrameProps`.

---

### UX-09 — `SongInfoPanel` Chord Tab Tidak Fungsional

**File:** `ProjectionMode.tsx` — `SongInfoPanel`
**Severity:** 🟡 Medium

**Masalah:**

```typescript
{activeTab === 'chord' && (
  <div>
    <div className="font-mono whitespace-pre text-left overflow-x-auto">
      {activeSong.key_note
        ? `[${activeSong.key_note}]\nTidak ada chord sheet yang tersimpan...`
        : 'Metadata nada dasar belum diatur.'}
    </div>
  </div>
)}
```

Tab Chord hanya menampilkan pesan "tidak ada chord sheet" untuk semua lagu. Tidak ada data chord yang tersimpan di database dan tidak ada UI untuk menambahkannya.

---

### UX-10 — Keyboard Shortcut `Ctrl+B` Konflik

**File:** `useGlobalShortcuts.ts`
**Severity:** 🟡 Medium

**Masalah:**

```typescript
// DUI-003: Ctrl+B opens Bible screen (global, all modes)
if (e.ctrlKey && e.code === 'KeyB') {
  e.preventDefault()
  setScreen('bible')
  return
}
```

`Ctrl+B` membuka Bible screen. Namun di bawahnya:

```typescript
case 'KeyB':
  e.preventDefault()
  executeRuntimeCommand('PROJ_BLACK', undefined, 'KEYBOARD')
  break
```

`B` (tanpa Ctrl) toggle Black. Ini tidak konflik secara langsung, tapi `Ctrl+B` di Projection Mode akan membuka Bible screen alih-alih melakukan Black Out, yang mungkin tidak intuitif bagi operator yang terbiasa dengan `B` untuk Black.

---

## 🔵 MASALAH ARSITEKTUR & TEKNIS

---

### ARCH-01 — Dua Jalur Eksekusi Command yang Tidak Konsisten

**File:** `useProjectionStore.ts` + `integration-adapter.ts`
**Severity:** 🔵 Arsitektur

**Masalah:** Ada tiga cara berbeda untuk mengeksekusi projection commands:

1. `executeRuntimeCommand()` → command bus → integration adapter → store
2. `executeProjectionCommand()` → integration adapter langsung → store
3. `store.action()` langsung (misalnya `store.takeCue()`)

Tidak ada konsistensi. Beberapa komponen menggunakan cara 1, beberapa cara 2, beberapa cara 3. Ini membuat debugging sangat sulit.

---

### ARCH-02 — `mapUIStateToFSMState` Kehilangan Informasi State

**File:** `useProjectionStore.ts`
**Severity:** 🔵 Arsitektur

**Masalah:**

```typescript
function mapUIStateToFSMState(uiState: ProjectionState) {
  switch (uiState) {
    case 'BLACK':
      return 'PAUSED'
    case 'LOGO':
      return 'PAUSED' // ← BLACK dan LOGO diperlakukan sama!
  }
}
```

BLACK dan LOGO keduanya di-map ke `'PAUSED'`. Ketika FSM state dikembalikan ke UI state:

```typescript
function mapFSMStateToUIState(fsmState) {
  case 'PAUSED': return 'FREEZE'  // ← BLACK dan LOGO hilang!
}
```

Setelah round-trip melalui FSM, state BLACK atau LOGO akan menjadi FREEZE. Informasi state hilang.

---

### ARCH-03 — `confidence:update` IPC Dikirim ke Projection Window, Bukan Stage Display

**File:** `ipc-handlers.ts`
**Severity:** 🔵 Arsitektur

**Masalah:**

```typescript
ipcMain.on('confidence:update', (_event, payload) => {
  const stageWindow = getProjectionWindow() // ← Ini projection window, bukan stage display!
  if (stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.webContents.send('confidence:update', payload)
  }
})
```

Confidence payload dikirim ke `projectionWindow` (layar penonton), bukan ke `stageDisplayWindow` (layar musisi). Ini adalah bug logika yang serius — data confidence monitor (next slide, timer) akan tampil di layar penonton.

**Rekomendasi:** Ganti `getProjectionWindow()` dengan `getStageDisplayWindow()`.

---

### ARCH-04 — `display_get-all` vs `display:get-all` — Channel Name Tidak Konsisten

**File:** `ipc-handlers.ts` + `ipc-channels.ts`
**Severity:** 🔵 Arsitektur

**Masalah:**

```typescript
// ipc-handlers.ts
ipcMain.handle('display_get-all', () => getAllDisplays()) // underscore
ipcMain.handle('display:get-all', () => getAllDisplays()) // colon (duplikat!)

// ipc-channels.ts
IPC_DISPLAY.GET_ALL = 'display_get-all' // underscore
```

Ada dua handler untuk channel yang berbeda (`display_get-all` dan `display:get-all`) yang melakukan hal yang sama. Ini adalah duplikasi yang bisa menyebabkan kebingungan.

---

### ARCH-05 — `AtmosphereStore` Tidak Persist ke Database

**File:** `useAtmosphereStore.ts`
**Severity:** 🔵 Arsitektur

**Masalah:** `syncProjectionThemePayload()` hanya mengirim ke projection window via IPC, tidak menyimpan ke database. Jika operator mengubah atmosphere dan restart aplikasi, perubahan hilang. `hydrateFromSettings()` membaca dari settings, tapi `setGlobalAtmosphere()` tidak menyimpan ke settings.

---

### ARCH-06 — `registerProjectionHandlers()` di Integration Adapter Salah Implementasi

**File:** `integration-adapter.ts`
**Severity:** 🔵 Arsitektur

**Masalah:**

```typescript
private registerProjectionHandlers(): void {
  // Navigation commands that map to FSM events
  executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'AUTOMATION')  // ← Ini MENGEKSEKUSI command!
  executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'AUTOMATION')  // ← Bukan mendaftarkan handler!
  executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'AUTOMATION')
  executeRuntimeCommand('PROJ_CLEAR', undefined, 'AUTOMATION')
}
```

Fungsi ini seharusnya **mendaftarkan handler** ke command bus, tapi malah **mengeksekusi command** saat inisialisasi. Ini berarti setiap kali `initializeProjectionAdapter()` dipanggil, command NAV_NEXT_SLIDE, NAV_PREV_SLIDE, PROJ_TAKE_CUE, dan PROJ_CLEAR akan dieksekusi secara otomatis — yang bisa menyebabkan slide bergerak atau projection state berubah saat startup.

---

## 📋 RINGKASAN TEMUAN

| ID      | Kategori   | Severity      | Deskripsi Singkat                                                   |
| ------- | ---------- | ------------- | ------------------------------------------------------------------- |
| BUG-01  | Fungsional | 🔴 Kritis     | `toggleBlack()` tidak bisa toggle kembali ke LIVE                   |
| BUG-02  | Fungsional | 🔴 Kritis     | `goToLiveSlide()` diblokir guard yang salah                         |
| BUG-03  | Fungsional | 🔴 Kritis     | Legacy path bypass FSM, tidak broadcast IPC                         |
| BUG-04  | Fungsional | 🔴 Kritis     | Timer interval duplikat — timer 2x lebih cepat                      |
| BUG-05  | Fungsional | 🔴 Kritis     | `PROJ_FREEZE` tidak punya handler di command bus                    |
| BUG-06  | Fungsional | 🔴 Kritis     | `PROTECTION_UPDATE_LIVE` & `PROTECTION_DISCARD` tidak punya handler |
| BUG-07  | Fungsional | 🟠 Signifikan | `cutCue()` mengubah fade speed secara permanen                      |
| BUG-08  | Fungsional | 🟠 Signifikan | `isCueSameAsProgram` check tidak akurat                             |
| BUG-09  | Fungsional | 🟠 Signifikan | `NAV_CUE_PREV/NEXT` tidak punya handler                             |
| BUG-10  | Fungsional | 🟠 Signifikan | `reduceBlack()` tidak menyimpan state sebelumnya                    |
| BUG-11  | Rendering  | 🟠 Signifikan | `AtmosphereRenderer` tidak menangani `mode: 'motion'`               |
| BUG-12  | Rendering  | 🟠 Signifikan | `ReadabilityGuard` blur diterapkan ke seluruh canvas                |
| BUG-13  | Fungsional | 🟠 Signifikan | LOGO mode tidak bisa diaktifkan dari UI                             |
| UX-01   | UI/UX      | 🟡 Medium     | Tombol "Auto" identik dengan "Take"                                 |
| UX-02   | UI/UX      | 🟡 Medium     | Audio meters adalah data statis/hardcoded                           |
| UX-03   | UI/UX      | 🟡 Medium     | EmergencyPanel tidak menutup otomatis setelah deaktivasi            |
| UX-04   | UI/UX      | 🟡 Medium     | BiblePanel tidak menggunakan database Bible                         |
| UX-05   | UI/UX      | 🟡 Medium     | Tidak ada konfirmasi sebelum Clear saat LIVE                        |
| UX-06   | UI/UX      | 🟡 Medium     | ControlBar tidak menampilkan nama lagu yang live                    |
| UX-07   | UI/UX      | 🟡 Medium     | Focus mode tidak ada animasi transisi                               |
| UX-08   | UI/UX      | 🟡 Medium     | Badge "PROJECTOR LOST" tidak ada di monitor frame                   |
| UX-09   | UI/UX      | 🟡 Medium     | Chord tab tidak fungsional                                          |
| UX-10   | UI/UX      | 🟡 Medium     | Shortcut `Ctrl+B` konflik antara Bible dan Black                    |
| ARCH-01 | Arsitektur | 🔵            | Tiga jalur eksekusi command yang tidak konsisten                    |
| ARCH-02 | Arsitektur | 🔵            | `mapUIStateToFSMState` kehilangan informasi BLACK/LOGO              |
| ARCH-03 | Arsitektur |
