# SION Media v1.0.0-beta.2

> **Release Type:** Closed Beta  
> **Release Date:** Juli 2026  
> **Platform:** Windows (x64)

---

Rilis beta kedua ini membawa **pembaruan besar** pada sistem Alkitab, playlist campuran (*mixed rundown*), penyempurnaan Stage Display, atmosfer visual animasi CSS dinamis, serta audit kualitas UI/UX secara menyeluruh di seluruh mode aplikasi. Terima kasih kepada para tester beta yang telah memberikan masukan berharga! 🙏

---

## ✨ Fitur Baru & Pembaruan Utama

### 🖥️ Stage Display (Confidence Monitor)
- **Poppins ExtraBold Typography** — Menggunakan tipografi tebal **Poppins ExtraBold** untuk keterbacaan maksimal lirik lagu & ayat Alkitab dari jarak 5–15 meter di atas panggung.
- **Perbaikan Header Timer** — Eliminasi masalah teks overlapping antara label `Durasi ibadah` dan tampilan waktu `00:00`.
- **Slide Counter Akurat (`SLIDE X / Y`)** — Penghitungan counter posisi slide secara tepat berdasarkan total slide aktif.

### 🌌 Dynamic CSS Motion Atmospheres
- **22 Preset Visual Dynamic Motion** — Efek visual latar belakang sinematik yang bergerak mulus 60 FPS (asap panggung volumetrik `stage-smoke`, garis laser `laser-lines`, grid neon `cyber-grid`, bokeh/orba cahaya `cosmic-orbs`, sinar radial `ray-wave`, dll.) tanpa beban pemutaran file video.
- **Smart Lyric Readability Scrim** — Sistem peredam latar belakang otomatis untuk memastikan kontras teks lirik tetap tajam di atas animasi bergerak.

### ⚙️ Pengaturan Sistem Terintegrasi (System Settings)
- **9 Sub-Halaman Settings Terhubung 100%** — Audit menyeluruh pada sub-halaman *Display*, *Buku Lagu*, *Bible Pack Manager*, *Tampilan*, *Tema & Font*, *Background & Atmosphere*, *Keyboard Shortcuts*, *Backup & Restore*, dan *Tentang Aplikasi*.
- **Multi-Monitor & Single-Monitor Preview** — Toggle *Tampilkan Proyeksi* di Display Settings kini responsif dan berfungsi konsisten pada setup 1 monitor (pratinjau) maupun 2+ monitor (output proyektor).
- **Dark Mode Default Enforcement** — UI dikunci pada mode **Dark (Default)** demi kenyamanan mata operator & fokus ibadah.
- **Real-Time Theme & Font Preview** — Pengaturan font (*Poppins*, *Inter*, *Montserrat*, *Playfair Display*), bobot font, warna, bayangan, dan outline tersinkronisasi secara langsung ke layar proyeksi.

### 🏢 Management Studio & Operasional Data
- **Live Song Preview Handler** — Tombol **Pratinjau** di panel detail lagu terhubung langsung ke layar proyeksi (`generateSlidesForSong`).
- **Dynamic Metric Cards** — Kartu metrik *Buku Lagu* dan *Tema* pada header dashboard kini menampilkan data real-time (`X koleksi tersedia` & `Y kategori & tema aktif`).
- **Kebersihan Metadata Baris Tabel** — Penanda fallback `-` untuk lagu tanpa informasi key/tempo.

### 📖 Sistem Bible Content Pack & Database Default
- **Default Bible Bundled** — Alkitab Terjemahan Baru (TB LAI 1974) kini ikut terinstal secara default saat instalasi awal tanpa perlu download atau impor manual.
- **Default Database Pre-populated** — Database default dibundel dengan 525 lagu lengkap (lirik lagu & hymnal).
- **External Bible Pack Manager** — Arsitektur content pack baru untuk mengelola terjemahan Alkitab sebagai file SQLite terpisah (ringan & modular).
- **Bible Reader Mode & Study Inspector** — Mode pembacaan Alkitab interaktif dengan sidebar navigasi kitab, chapter rail, verse card, catatan ayat, dan highlight warna.
- **Dynamic Registry Auto-Update** — Otomatis mendeteksi dan memperbarui lokasi absolut file database Alkitab saat aplikasi dijalankan.

### 📋 Mixed Rundown & Quick Search Tag Adventis
- **Mixed Rundown Support** — Playlist mendukung item campuran: lirik lagu + ayat Alkitab dalam satu rundown ibadah.
- **Quick Search Tag Adventis** — Tag pencarian cepat istilah Adventis di Library Mode (`Pujian`, `Sabat`, `Kasih`, `Pengharapan`, `Doa`, `Penyembahan`, `Persepuluhan`, `Roh Kudus`, `Syukur`).
- **Pembedaan Ikon Sidebar Alkitab** — Penggunaan ikon `Book` untuk Alkitab agar tidak serupa dengan buku lagu `BookOpen`.

---

## 🔧 Peningkatan UI/UX & Infrastruktur

### Projection & Library Mode
- **Workspace Title Anti-Terpotong** — Perluasan `max-width` title bar workspace dari 120px ke 220px agar nama workspace panjang seperti `IBADAH SABAT` tampil utuh.
- **Ikon Timer Panel Proyeksi** — Ikon tombol toggle timer diperbarui dari `Volume2` ke `Clock`.
- **Styling Emergency Buttons** — Tombol darurat `Black` & `Clear` memiliki pembeda visual kontras tinggi (Black: slate pekat + pendaran merah; Clear: warm amber/gold `#fbbf24`).
- **Bible Panel & Presentation Canvas** — Refactoring panel Alkitab, history nav, smart-fit text, dan info panel presentasi.

### Komponen & Utilitas
- **Excel Import** — Migrasi dari `xlsx` ke `read-excel-file` yang lebih ringan dan aman.
- **Keyboard Shortcuts Cheat Sheet** — 100% pemetaan hotkey akurat dari `useGlobalShortcuts.ts` untuk kontrol live (Space, B, F, C, Ctrl+Enter, Ctrl+C).

---

## 🧪 Verification & Test Coverage

Rilis ini didukung oleh **49 file test** dan **356 unit tests** (100% Passed):
- `StageDisplayApp`, `confidencePayloadBuilder`, `TitleBar.settings-navigation`
- `BiblePanel`, `BibleVerseCard`, `BibleStudyInspector`, `BibleAutoFitText`
- `useBibleReader`, `useBibleSearch`, `bibleErrors`, `buildBibleSlides`
- `LiveProjectionCanvas`, `PresentationCanvas`, `ProjectionSurfaceParity`
- `PlaylistPanel.modal`, `PlaylistSelector`, `ProjectionPanelLayout`
- Test Kontrak: `BibleLayoutContract`, `electron-style-contract`, `installer-config`, `release-metadata`, `safe-external-url`, `mode-policy`

**ESLint & Prettier**: 0 errors, 0 warnings.

---

## 🔄 Migrasi Database

Dari beta.1 ke beta.2, database di-upgrade secara otomatis:

| Versi | Nama | Deskripsi |
|---|---|---|
| 18 | `content_packs_registry` | Registry content pack (Bible, hymnal) dengan metadata lengkap |
| 19 | `mixed_rundown_support` | Playlist mendukung item campuran (lagu + Alkitab) |
| 20 | `bible_notes_and_highlights` | Catatan dan highlight ayat Alkitab |

> [!NOTE]
> Migrasi berjalan otomatis saat aplikasi pertama kali dibuka. Data lagu dan playlist yang ada **tidak akan terhapus**.

---

## ⚠️ Known Issues & Panduan Keamanan

### 🔒 Windows SmartScreen Warning

Installer ditandatangani dengan **self-signed certificate** lokal. Windows SmartScreen akan menampilkan peringatan "Windows protected your PC" saat pertama kali install. **Ini bukan virus** — ini perilaku normal Windows untuk aplikasi baru.

**Cara melewati peringatan:**

| Langkah | Aksi |
|---|---|
| 1 | Klik **"More info"** (Informasi selengkapnya) |
| 2 | Klik **"Run anyway"** (Tetap jalankan) |
| 3 | Instalasi berjalan normal ✅ |

---

## 📦 Download & Instalasi

1. Download **`SION-Media-1.0.0-beta.2-Setup.exe`** dari bagian Assets di bawah.
2. Jalankan installer — jika SmartScreen muncul, klik **"More info"** → **"Run anyway"**.
3. Ikuti wizard instalasi.
4. Jalankan SION Media dari shortcut desktop.

---

© 2026 AiWerek Tech — *Dirancang untuk keunggulan dalam ibadah.* ✝️
