# Implementation Plan: Smart Worship Navigation

## Overview

Implementasi fitur Smart Worship Navigation dilakukan secara bertahap dengan urutan dependensi yang ketat: type definitions → Navigation Flow Engine (pure functions) → modifikasi store → komponen UI → pengujian. Setiap tahap membangun di atas tahap sebelumnya, dan tidak ada kode yang dibiarkan tergantung tanpa diintegrasikan.

## Tasks

- [x] 1. Tambahkan Type Definitions ke `types.ts`
  - [x] 1.1 Tambahkan tipe `SectionType`, `NavigationFlowStep`, `NavigationFlow`, `NavigationMode`, dan `SectionBoundary` ke file `types.ts` yang sudah ada
    - Tambahkan `SectionType = 'verse' | 'chorus' | 'bridge' | 'intro' | 'ending' | 'other'`
    - Tambahkan interface `NavigationFlowStep` dengan field: `sectionType`, `sectionLabel`, `firstSlideIndex`, `lastSlideIndex`, `badgeLabel`
    - Tambahkan interface `NavigationFlow` dengan field: `steps: NavigationFlowStep[]`, `isSmartMode: boolean`
    - Tambahkan `NavigationMode = 'SMART' | 'LINEAR'`
    - Tambahkan interface `SectionBoundary` dengan field: `sectionLabel`, `sectionType`, `firstSlideIndex`, `lastSlideIndex`
    - _Requirements: 1.1, 2.1, 2.2, 5.1, 6.1_

- [ ] 2. Implementasi Navigation Flow Engine
  - [ ] 2.1 Buat file `src/renderer/src/core/projection/navigationFlowEngine.ts` dan implementasikan fungsi `classifySectionLabel`
    - Implementasikan algoritma prioritas keyword matching (case-insensitive): `verse` → `chorus`/`reff`/`refrain` → `bridge` → `intro` → `ending`/`outro`/`tag` → `other`
    - Pastikan fungsi adalah pure function tanpa side effects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [ ]\* 2.2 Tulis property test untuk `classifySectionLabel`
    - **Property 1: Klasifikasi Section Komprehensif**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10**
    - Install `fast-check` sebagai dev dependency: `npm install --save-dev fast-check`
    - Buat file `src/renderer/src/core/projection/__tests__/navigationFlowEngine.property.test.ts`
    - Test: untuk setiap string, hasil selalu salah satu dari enam tipe valid
    - Test: case-insensitivity untuk semua kata kunci (`VERSE`, `Verse`, `verse` → semua `verse`)
    - Tag komentar: `// Feature: smart-worship-navigation, Property 1: Klasifikasi Section Komprehensif`

  - [~] 2.3 Implementasikan fungsi `extractSectionBoundaries` dan `generateBadgeLabel` di `navigationFlowEngine.ts`
    - `extractSectionBoundaries`: iterasi slides, deteksi perubahan `sectionLabel`, catat `firstSlideIndex`/`lastSlideIndex`, klasifikasikan dengan `classifySectionLabel`
    - `generateBadgeLabel`: `verse` → `V{n}`, `chorus` → `C`, `bridge` → `B`, `intro` → `I`, `ending` → `E`, `other` → 2 karakter pertama uppercase atau `X`
    - _Requirements: 1.1, 6.1_

  - [~] 2.4 Implementasikan fungsi `resolveNavigationFlow` (termasuk `resolveLinearFlow` dan `resolveSmartFlow`) di `navigationFlowEngine.ts`
    - Guard: input null/undefined/kosong → return `{ steps: [], isSmartMode: false }` tanpa exception
    - `resolveLinearFlow`: map boundaries ke steps dalam urutan asli
    - `resolveSmartFlow`: bangun pola I → V1 → C → V2 → C → B → Vn → C → E sesuai algoritma desain
    - Gunakan `canonicalChorus` (chorus pertama) yang diulang dalam flow
    - Pastikan immutable — tidak memodifikasi array input
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 8.1, 8.2, 8.3_

  - [ ]\* 2.5 Tulis property test untuk `resolveNavigationFlow`
    - **Property 2: Determinisme dan Idempotence Navigation Flow Engine**
    - **Validates: Requirements 1.9, 2.7, 8.2, 8.7**
    - **Property 3: Deteksi Mode Berdasarkan Keberadaan Chorus**
    - **Validates: Requirements 2.1, 2.2, 2.6**
    - **Property 4: Invariant Struktural Smart_Mode Flow**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - **Property 8: Immutability dan Robustness Navigation Flow Engine**
    - **Validates: Requirements 2.9, 8.1, 8.2, 8.3, 10.6**
    - Tambahkan ke file `navigationFlowEngine.property.test.ts`
    - Buat arbitrary generators: `arbitrarySlideDataArray()`, `arbitrarySlideDataArrayWithChorus()`

  - [~] 2.6 Implementasikan fungsi `resolveFlowPosition`, `computeSmartNext`, `computeSmartPrev`, dan `computeSmartNextSlideData` di `navigationFlowEngine.ts`
    - `resolveFlowPosition`: cari step terakhir di mana `firstSlideIndex <= slideIndex <= lastSlideIndex`; fallback ke 0 jika tidak ditemukan; return -1 untuk input tidak valid
    - `computeSmartNext`: jika bukan slide terakhir dalam section → `currentIndex + 1`; jika slide terakhir → `firstSlideIndex` dari step berikutnya; jika akhir flow → `null`
    - `computeSmartPrev`: jika bukan slide pertama dalam section → `currentIndex - 1`; jika slide pertama → `firstSlideIndex` dari step sebelumnya; jika awal flow → `null`
    - `computeSmartNextSlideData`: gunakan `computeSmartNext` untuk mendapatkan index, return `slides[index]` atau `null`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4, 8.4, 8.5_

  - [ ]\* 2.7 Tulis property test untuk `computeSmartNext`, `computeSmartPrev`, dan `resolveFlowPosition`
    - **Property 5: Konsistensi Navigasi Smart Next/Prev**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 7.1, 7.2, 7.3, 8.4**
    - **Property 7: Konsistensi `flowPosition` Setelah Setiap Operasi Navigasi**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5**
    - Tambahkan ke file `navigationFlowEngine.property.test.ts`
    - Buat arbitrary generator: `arbitraryNavigationScenario()`
    - Test: `nextIndex` yang dihasilkan selalu dalam rentang `[0, slides.length - 1]` atau `null`
    - Test: `flowPosition` yang dihasilkan `resolveFlowPosition` selalu valid

  - [ ]\* 2.8 Tulis unit test untuk edge cases Navigation Flow Engine
    - Buat file `src/renderer/src/core/projection/__tests__/navigationFlowEngine.unit.test.ts`
    - Test: array kosong → flow kosong
    - Test: null input → tidak melempar exception, return flow kosong
    - Test: lagu tanpa chorus → Linear_Mode, steps = jumlah section unik
    - Test: `computeSmartNext` di akhir flow → return `null`
    - Test: `computeSmartPrev` di awal flow → return `null`
    - _Requirements: 2.9, 3.6, 4.4, 8.3_

- [~] 3. Checkpoint — Pastikan semua tes Navigation Flow Engine lulus
  - Pastikan semua tes lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [ ] 4. Modifikasi `useProjectionStore` — State dan `setSlides`/`takeCue`
  - [~] 4.1 Tambahkan state baru `navigationFlow`, `flowPosition`, `isSmartMode` ke `useProjectionStore` dan modifikasi `setSlides`
    - Tambahkan ke interface store: `navigationFlow: NavigationFlow | null`, `flowPosition: number`, `isSmartMode: boolean`
    - Set initial values: `navigationFlow: null`, `flowPosition: -1`, `isSmartMode: false`
    - Modifikasi `setSlides`: panggil `resolveNavigationFlow(slides)` setelah `buildSectionIndexMap`, simpan `navigationFlow` dan `isSmartMode` ke state
    - _Requirements: 5.1, 5.7, 8.6_

  - [~] 4.2 Modifikasi action `takeCue` di `useProjectionStore`
    - Setelah menentukan `slideIndex`, hitung `flowPosition` menggunakan `resolveFlowPosition(slides, slideIndex, navigationFlow)`
    - Simpan `flowPosition` baru ke state bersama state existing yang sudah ada
    - _Requirements: 5.2_

- [ ] 5. Modifikasi `useProjectionStore` — Navigasi Smart
  - [~] 5.1 Modifikasi action `nextSlide` di `useProjectionStore`
    - Jika `isSmartMode && navigationFlow`: gunakan `computeSmartNext` untuk menentukan `nextIndex`; jika `null` → return early (akhir lagu)
    - Jika bukan smart mode: pertahankan logika linear existing
    - Perbarui `flowPosition` menggunakan `resolveFlowPosition` setelah perpindahan
    - Pertahankan semua invariant existing: `programLockState`, IPC broadcast `projection:slide-update`, `computeNextState()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 8.8_

  - [~] 5.2 Modifikasi action `prevSlide` di `useProjectionStore`
    - Jika `isSmartMode && navigationFlow`: gunakan `computeSmartPrev` untuk menentukan `prevIndex`; jika `null` → return early (awal lagu)
    - Jika bukan smart mode: pertahankan logika linear existing
    - Perbarui `flowPosition` menggunakan `resolveFlowPosition` setelah perpindahan
    - Pertahankan semua invariant existing: `programLockState`, IPC broadcast `projection:slide-update`, `computeNextState()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.8_

  - [~] 5.3 Modifikasi action `computeNextState` di `useProjectionStore`
    - Jika `isSmartMode && navigationFlow`: gunakan `computeSmartNextSlideData` untuk menghitung `nextSlideData`
    - Jika bukan smart mode: pertahankan logika linear existing (`programSlideIndex + 1`)
    - Pastikan `nextSlideText` yang dikirim via IPC mencerminkan hasil Smart Navigation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]\* 5.4 Tulis property test untuk guard state navigasi
    - **Property 6: Guard State — Navigasi Diabaikan di Luar LIVE/FREEZE**
    - **Validates: Requirements 3.8, 4.6**
    - Buat file `src/renderer/src/store/__tests__/useProjectionStore.smart-nav.test.ts`
    - Test: untuk setiap `projectionState` bukan `LIVE`/`FREEZE`, `nextSlide`/`prevSlide` tidak mengubah state apapun

- [ ] 6. Modifikasi `useProjectionStore` — Navigasi Manual dan Lifecycle
  - [~] 6.1 Modifikasi action `goToLiveSlide` di `useProjectionStore`
    - Setelah transisi slide berhasil, hitung ulang `flowPosition` menggunakan `resolveFlowPosition`
    - Panggil `computeNextState()` setelah memperbarui `flowPosition`
    - _Requirements: 5.4, 9.1_

  - [~] 6.2 Modifikasi action `goToLiveSection` di `useProjectionStore`
    - Setelah berpindah ke slide pertama section, hitung ulang `flowPosition`
    - _Requirements: 9.2_

  - [~] 6.3 Modifikasi action `goToLiveAddress` di `useProjectionStore`
    - Setelah menyelesaikan address dan berpindah slide, hitung ulang `flowPosition`
    - _Requirements: 9.3_

  - [~] 6.4 Modifikasi action `hotSwapSlides` di `useProjectionStore`
    - Jika `programSlide?.songId === songId`: hitung ulang `navigationFlow` dengan `resolveNavigationFlow(newSlides)`
    - Hitung ulang `flowPosition` berdasarkan `programSlideIndex` saat ini (clamp ke `newSlides.length - 1`)
    - Perbarui `isSmartMode` dari `navigationFlow` baru
    - _Requirements: 5.7, 8.6_

  - [~] 6.5 Modifikasi action `clearScreen` di `useProjectionStore`
    - Tambahkan `flowPosition: -1` ke state yang di-reset saat `clearScreen` dipanggil
    - _Requirements: 5.5_

  - [ ]\* 6.6 Tulis unit test integrasi store untuk Smart Navigation
    - Tambahkan ke file `useProjectionStore.smart-nav.test.ts`
    - Test: `setSlides` menghitung `navigationFlow` secara otomatis
    - Test: `nextSlide` dalam Smart_Mode melompat ke chorus setelah verse terakhir dalam section
    - Test: `flowPosition` selalu valid setelah `goToLiveSlide` ke index acak
    - Test: navigasi manual tidak mengubah `navigationFlow` — hanya `flowPosition` yang berubah
    - Test: `hotSwapSlides` menghitung ulang `navigationFlow` tanpa desync
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 9.1, 9.2, 9.3, 9.4, 9.5_

- [~] 7. Checkpoint — Pastikan semua tes store lulus
  - Pastikan semua tes lulus, tanyakan kepada pengguna jika ada pertanyaan.

- [ ] 8. Implementasi Komponen `WorshipFlowIndicator`
  - [~] 8.1 Buat file `src/renderer/src/components/projection/WorshipFlowIndicator.tsx` dan implementasikan komponen
    - Definisikan interface props: `navigationFlow`, `flowPosition`, `isSmartMode`, `projectionState`, `onBadgeClick`
    - Render state kosong (tanpa badge) jika `projectionState === 'CLEAR'` atau `navigationFlow === null`
    - Render badge strip horizontal: satu `<button>` per step dalam `navigationFlow.steps`
    - Terapkan class CSS per tipe section: `flow-badge--verse`, `flow-badge--chorus`, `flow-badge--bridge`, `flow-badge--intro`, `flow-badge--ending`, `flow-badge--other`
    - Terapkan `flow-badge--active` untuk `index === flowPosition` dan `flow-badge--next` untuk `index === flowPosition + 1`
    - Tambahkan `aria-current="step"` pada badge aktif
    - Implementasikan scroll horizontal dengan `overflow-x: auto` dan sembunyikan scrollbar
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9_

  - [ ]\* 8.2 Tulis unit test untuk `WorshipFlowIndicator`
    - Buat file `src/renderer/src/components/projection/__tests__/WorshipFlowIndicator.test.tsx`
    - Test: menampilkan badge untuk setiap step dalam flow
    - Test: badge aktif memiliki `aria-current="step"`
    - Test: state kosong saat `projectionState === 'CLEAR'`
    - Test: klik badge memanggil `onBadgeClick` dengan step dan index yang benar
    - _Requirements: 6.1, 6.4, 6.6, 6.9_

- [ ] 9. Integrasi `WorshipFlowIndicator` ke `LivePreviewPanel`
  - [~] 9.1 Modifikasi `LivePreviewPanel.tsx` untuk menambahkan `WorshipFlowIndicator` di dalam `scene-strip`
    - Baca state `navigationFlow`, `flowPosition`, `isSmartMode`, `projectionState` dari `useProjectionStore`
    - Tambahkan zone baru `scene-strip__zone--flow` di antara Zone Left dan Zone Center
    - Render `<WorshipFlowIndicator>` di dalam zone baru tersebut
    - Sambungkan `onBadgeClick` ke `goToLiveSection(step.sectionLabel)`
    - Pastikan tidak ada perubahan pada layout utama `ProjectionMode.tsx`
    - _Requirements: 6.8, 6.9_

- [ ] 10. Property Test Round-Trip Parsing
  - [ ]\* 10.1 Tulis property test round-trip parsing section labels
    - **Property 9: Round-Trip Parsing Section Labels**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
    - Buat file `src/renderer/src/core/projection/__tests__/slideEngine.property.test.ts`
    - Buat arbitrary generator `arbitraryLyricsWithMarkers()` yang menghasilkan `lyrics_raw` dengan section markers `[SECTION_NAME]`
    - Test: parsing `lyrics_raw → SlideData[] → ekstrak unique sectionLabels` menghasilkan set yang ekuivalen dengan marker names dalam `lyrics_raw`
    - Tag komentar: `// Feature: smart-worship-navigation, Property 9: Round-Trip Parsing Section Labels`

- [~] 11. Checkpoint Akhir — Pastikan semua tes lulus
  - Pastikan semua tes lulus, tanyakan kepada pengguna jika ada pertanyaan.

## Notes

- Tugas yang ditandai `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap tugas mereferensikan requirements spesifik untuk keterlacakan
- Checkpoint memastikan validasi inkremental di setiap tahap utama
- Property tests memvalidasi invariant universal menggunakan `fast-check` (minimum 100 iterasi per property)
- Unit tests memvalidasi edge cases spesifik dan integrasi komponen
- Navigation Flow Engine adalah pure functions — mudah diuji secara independen sebelum integrasi store
- Semua modifikasi store bersifat additive — tidak merombak arsitektur projection runtime yang sudah ada

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4"] },
    { "id": 4, "tasks": ["2.5", "2.6"] },
    { "id": 5, "tasks": ["2.7", "2.8", "4.1"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["5.1", "5.2"] },
    { "id": 8, "tasks": ["5.3", "5.4"] },
    { "id": 9, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 10, "tasks": ["6.6", "8.1"] },
    { "id": 11, "tasks": ["8.2", "9.1"] },
    { "id": 12, "tasks": ["10.1"] }
  ]
}
```
