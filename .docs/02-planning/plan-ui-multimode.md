# Rancangan Implementasi Sistem Multi-Mode UI/UX SION Media

Berdasarkan *Multi-Mode Architecture Blueprint*, aplikasi ini tidak lagi sekadar menayangkan satu layar (Dashboard) tunggal, melainkan akan memuat 4 mode operasi utama yang dapat diganti sesuai konteks pengguna: **Library, Projection, Broadcast, dan Management**.

Dokumen ini memuat panduan teknis implementasi di sisi *Front-End* (React) dan *Main Process* (Window Management) berdasarkan kesepakatan desain terbaru.

---

## Keputusan Arsitektur & Feedback Pengguna

1. **Startup Flow (First Install vs Returning User)**: 
   * Pada instalasi pertama kali, aplikasi akan menampilkan **Welcome Screen** khusus yang mewajibkan pengguna untuk memilih *Mode Operasional* awal.
   * Pada penggunaan selanjutnya, aplikasi akan menerapkan **Remember Last Mode** (langsung membuka mode terakhir yang digunakan).
2. **Workspace Switcher**: Pengguna tetap dapat berpindah mode kapan saja melalui menu *Dropdown Mode Selector* yang diletakkan di **Title Bar**.
3. **Pemisahan Broadcast Mode**: Untuk *Broadcast Mode* (Fase lanjut), antarmukanya akan dipisahkan 100% dari *Projection Mode*. Hal ini dilakukan agar komponen *heavy-duty* (vMix/OBS API, Multi-Preview) tidak memberatkan memori *Projection Mode* standar.

---

## Tahapan Eksekusi (Proposed Changes)

### PHASE 1: State Management & Mode Router
*Fokus: Membangun fondasi state agar React dan Electron tahu mode apa yang sedang aktif.*

**Aksi Eksekusi:**
1. **Buat `useModeStore.ts`**:
   * *Zustand store* baru untuk mengatur `currentMode`.
   * Tipe Mode: `'LIBRARY' | 'PROJECTION' | 'BROADCAST' | 'MANAGEMENT'`.
   * Fitur *persisted state*: Menyimpan mode terakhir yang dipakai ke `localStorage` atau SQLite `settings`.
   * State `isFirstInstall`: Menyimpan status apakah user baru pertama kali membuka aplikasi.
2. **Perbarui `App.tsx` (Routing Logika Baru)**:
   * Jika `isFirstInstall === true`, render `<WelcomeModeSelector />`.
   * Jika `currentMode === 'LIBRARY'`, render `<LibraryLayout />` (sederhana, layar tunggal, fokus pada pencarian).
   * Jika `currentMode === 'PROJECTION'`, render `<ProjectionLayout />` (Dashboard saat ini dengan kontrol dual-screen).
   * Jika `currentMode === 'BROADCAST'`, render `<BroadcastLayout />` (Terpisah total dari Projection).
   * Jika `currentMode === 'MANAGEMENT'`, render `<ManagementLayout />` (CRUD Lagu & Sinkronisasi DB).

### PHASE 2: First-Time Setup & Title Bar
*Fokus: Mengimplementasikan UI untuk perpindahan mode berdasarkan feedback.*

**Aksi Eksekusi:**
1. **Buat `<WelcomeModeSelector />`**:
   * Layar perkenalan (*onboarding*) layar penuh yang cantik. Menawarkan 3 pilihan besar (Library, Projection, Broadcast) beserta penjelasannya. Saat dipilih, set `isFirstInstall` ke false.
2. **Perbarui `<TitleBar />`**:
   * Tambahkan komponen *Dropdown Menu* di area tengah/kiri *Title Bar* yang menampilkan mode saat ini (misal: "🚀 Projection Mode").
   * Saat di-klik, pengguna dapat beralih ke mode lain, yang langsung memicu pembaruan `currentMode` di *Zustand*.

### PHASE 3: UI Components Splitting (Modular Exposure)
*Fokus: Mengurai komponen Dashboard lama menjadi tata letak yang modular.*

**Aksi Eksekusi:**
1. **Buat Direktori `src/renderer/src/screens/modes/`**:
   * `LibraryMode.tsx`: Menampilkan tabel `SongList` fullscreen, lirik viewer, tanpa panel *preview/program*. Tombol edit disembunyikan.
   * `ProjectionMode.tsx`: Mempertahankan antarmuka `Dashboard` yang sekarang (operator-focused).
   * `ManagementMode.tsx`: Menampilkan antarmuka manajemen (SongEditorScreen dan ImportExportScreen).
   * `BroadcastMode.tsx`: *(Kerangka kosong untuk dikembangkan di fase mendatang).*

### PHASE 4: Multi-Window Management (Electron Main Process)
*Fokus: Mengatur manajemen window agar sistem hemat RAM.*

**Aksi Eksekusi:**
1. **Modifikasi `src/main/index.ts`**:
   * Dengarkan perubahan mode dari *Front-End* melalui IPC (misal: `ipcMain.on('mode-changed', ...)`).
   * **Saat Mode `LIBRARY` atau `MANAGEMENT` aktif**: Sistem harus menghancurkan (*destroy*) atau menyembunyikan (*hide*) jendela sekunder (Projector Window) untuk menghemat memori GPU/RAM.
   * **Saat Mode `PROJECTION` atau `BROADCAST` aktif**: Sistem memanggil fungsi deteksi monitor (`screen.getAllDisplays()`) dan secara otomatis membangun/menampilkan kembali Projector Window di layar kedua.

### PHASE 5: Mode-Specific Keyboard Shortcuts
*Fokus: Menghindari pengguna tanpa sengaja memicu shortcut proyektor.*

**Aksi Eksekusi:**
1. **Update Listener di `App.tsx`**:
   * Jika mode `LIBRARY`, matikan eksekusi tombol `Space` (Next Slide), `B` (Black Screen), atau `C` (Clear).
   * Jika mode `PROJECTION` atau `BROADCAST`, aktifkan seluruh *hotkey* operator.

---

## Rencana Verifikasi (Testing Plan)

### First Install & Mode Switching Verification
- [ ] Menghapus `localStorage` atau cache untuk menyimulasikan instalasi baru, lalu memastikan `WelcomeModeSelector` muncul.
- [ ] Memilih mode "Library", menutup aplikasi, dan membukanya kembali untuk memastikan "Library" langsung terbuka (*Remember Last Mode*).
- [ ] Berpindah dari "Library" ke "Projection" melalui dropdown *Title Bar* dan melihat antarmuka berubah secara instan.

### Resource & UI Consistency Verification
- [ ] Memastikan jendela proyektor (layar hitam/gambar) tertutup/hilang saat berpindah dari mode "Projection" ke "Library".
- [ ] Memeriksa bahwa tombol manipulasi data (Add Song, Edit Song, Import) tidak bisa ditemukan atau diakses saat berada di mode "Library" maupun "Projection".
