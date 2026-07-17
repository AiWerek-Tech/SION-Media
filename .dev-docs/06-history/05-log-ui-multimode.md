# Changelog Implementasi Multi-Mode UI/UX

**Tanggal:** 8 Mei 2026
**Fase:** Phase 4 & 5 (Selesai)
**Ref:** `plan-ui-multimode.md`

## Apa yang telah dilakukan?

Kami telah berhasil mengurai tampilan aplikasi (Dashboard) menjadi antarmuka yang modular menggunakan konsep **Multi-Mode Architecture**. Aplikasi kini memiliki `WelcomeModeSelector` untuk pengguna baru dan 4 _Mode Operasional_ yang dapat diubah melalui `TitleBar`.

### 1. State Management (`useModeStore.ts`)

- **Zustand Store:** Menyimpan `currentMode` dan status `isFirstInstall`.
- Menggunakan `persist` middleware untuk menyimpan mode terakhir yang dipilih agar saat aplikasi dibuka kembali (_Remember Last Mode_), aplikasi akan langsung merestore mode tersebut dari `localStorage`.
- Mengirimkan IPC `system:set-mode` ke Main Process setiap kali ada perubahan mode untuk mengelola _memory footprint_.

### 2. Welcome Mode Selector

- Komponen `WelcomeModeSelector.tsx` dibuat dengan tampilan _onboarding_ layar penuh.
- Memiliki 4 kartu pilihan (Projection, Library, Broadcast, Management) dengan animasi `framer-motion` yang sangat mulus dan _modern_.

### 3. TitleBar Mode Switcher

- Komponen `TitleBarModeSwitcher.tsx` disematkan di sebelah logo pada `TitleBar`.
- Berfungsi sebagai _Dropdown_ cepat bagi pengguna untuk beralih mode kapan saja tanpa harus menghentikan aplikasi.

### 4. Mode Modularization (`src/renderer/src/screens/modes/`)

Tampilan `Dashboard.tsx` lama dirombak menjadi:

- **`ProjectionMode.tsx`**: (Pindahan dari Dashboard lama) Tampilan operator _dual-screen_ dengan _Live Preview_.
- **`LibraryMode.tsx`**: Tampilan _split-screen_ sederhana untuk pencarian lirik dan penyusunan playlist (tanpa _Live Preview_).
- **`ManagementMode.tsx`**: Tampilan _Dashboard Hub_ yang mengarahkan pengguna ke Editor Lagu, Settings, atau Import/Export.
- **`BroadcastMode.tsx`**: Kerangka (placeholder) untuk tahap _beta testing_ integrasi vMix/OBS.

### 5. Window & Memory Management (`index.ts` Main Process)

- Ditambahkan penanganan _handler_ `system:set-mode` di tingkat sistem.
- Saat masuk ke `LIBRARY` atau `MANAGEMENT`, sistem akan **menyembunyikan** `projectionWindow` (jendela eksternal proyektor) secara otomatis untuk menghemat _resource GPU_.
- Saat kembali ke `PROJECTION`, sistem akan memastikan `projectionWindow` berjalan kembali.

### 6. Keyboard Shortcuts Protection

- _Global listener_ (`keydown`) pada `App.tsx` telah disesuaikan. _Hotkeys_ presentasi seperti spasi, `B`, dan `C` kini **hanya merespons** apabila pengguna sedang berada dalam `PROJECTION` atau `BROADCAST` mode, menghindari kesalahan tekan saat bekerja di Library.

## Status Pekerjaan

Semua kode telah lolos kompilasi _TypeScript_ dan telah di-unggah (push) ke GitHub (`feat: implement multi-mode architecture`). Aplikasi SION Media sudah sah menyandang gelar _Worship Platform_!
