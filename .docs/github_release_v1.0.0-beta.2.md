# SION Media v1.0.0-beta.2

> **Release Type:** Closed Beta  
> **Release Date:** Juli 2026  
> **Platform:** Windows (x64)

---

Rilis beta kedua ini membawa **pembaruan besar** pada sistem Alkitab, playlist campuran (mixed rundown), dan peningkatan kualitas UI/UX secara menyeluruh. Terima kasih kepada para tester beta.1 yang telah memberikan masukan berharga! 🙏

---

## ✨ Fitur Baru

### 📖 Sistem Bible Content Pack & Database Default
- **Default Bible Bundled** — Alkitab Terjemahan Baru (TB) kini ikut terinstal secara default saat instalasi awal tanpa perlu download atau impor manual.
- **Default Database Pre-populated** — Database default kini dibundel dengan 525 lagu lengkap (lirik lagu & hymnal) hasil sinkronisasi data pengembangan terbaru.
- **External Bible Pack Manager** — Arsitektur content pack baru untuk mengelola terjemahan Alkitab sebagai file SQLite terpisah (ringan & modular).
- **Bible Reader Mode** — Mode pembacaan Alkitab interaktif dengan sidebar navigasi kitab, chapter rail, dan verse card.
- **Bible Study Inspector** — Panel inspeksi studi Alkitab dengan catatan ayat dan highlight warna.
- **Bible Notes & Highlights** — Simpan catatan dan tandai ayat-ayat penting langsung di dalam aplikasi.
- **Bible FTS5 Search** — Pencarian full-text terindeks untuk menemukan ayat dengan cepat.
- **Bible Reference Parser** — Parser referensi Alkitab pintar (mendukung format "Yoh 3:16", "Kejadian 1:1-3", dll).
- **Bible Auto-Fit Text** — Teks ayat Alkitab yang otomatis menyesuaikan ukuran di layar proyeksi.
- **Dynamic Registry Auto-Update** — Otomatis mendeteksi dan memperbarui lokasi absolut file database Alkitab saat aplikasi dijalankan, memastikan kompatibilitas penuh ketika berpindah folder atau perangkat.

### 📋 Mixed Rundown & Playlist
- **Mixed Rundown Support** — Playlist kini mendukung item campuran: lagu + ayat Alkitab dalam satu rundown ibadah.
- **Bible-to-Playlist** — Tambahkan ayat Alkitab langsung ke playlist sebagai item proyeksi.
- **Playlist Selector Component** — Komponen baru untuk memilih dan berpindah playlist dengan cepat.
- **Playlist Schedule Utility** — Utilitas penjadwalan playlist untuk perencanaan ibadah.

### 🎨 Redesign UI/UX
- **Splash Screen Overhaul** — Splash screen baru dengan animasi yang lebih halus dan sinyal kesiapan yang jelas.
- **Welcome Screen Editorial** — Welcome screen ditulis ulang dengan tampilan editorial yang lebih bersih dan premium.
- **Unified Modal System** — Sistem modal yang distandarisasi dengan animasi, focus trap, dan aksesibilitas yang konsisten.
- **Projection Mode Layout** — Tata letak Projection Mode yang di-refactor dengan panel yang lebih responsif.
- **Live Projection Canvas** — Komponen canvas baru untuk rendering proyeksi live yang presisi.

### 🛠️ Infrastruktur Teknis
- **Content Pack Registry** — Sistem registry pusat untuk mengelola metadata content pack (Bible, hymnal, dll).
- **Lyric Flow Engine** — Engine baru (`lyricFlow.ts`) untuk aliran lirik yang lebih smooth dan natural.
- **Mode Policy System** — Kebijakan mode terpusat untuk mengontrol akses dan transisi antar mode.
- **3 Migrasi Database Baru** — Content pack registry (v18), mixed rundown (v19), bible notes (v20). Total: **20 migrasi**.

---

## 🔧 Peningkatan

### Projection Mode
- **Bible Panel** — Panel Alkitab di Projection Mode diperluas secara signifikan (~1600 baris perubahan): history, layout, dan smart-fit.
- **Notification Panel** — Desain ulang panel notifikasi dengan tampilan yang lebih modern.
- **Announcement Panel** — Penyempurnaan panel pengumuman.
- **Audio Panel** — Perbaikan tampilan dan interaksi panel audio.
- **Lyrics Zoom Control** — Kontrol zoom lirik yang lebih presisi.
- **Presentation Canvas** — Canvas presentasi dengan info panel tambahan.
- **Panel Scroll Revision** — Revisi sistem scroll untuk semua panel proyeksi.

### Library Mode
- **Bible Viewer di Library** — Penambahan viewer Alkitab lengkap di mode Library.
- **Playlist Workspace** — Peningkatan workspace playlist di Library Mode.
- **Song Library Panel** — Penyempurnaan panel perpustakaan lagu.

### Komponen & Utilitas
- **Keyboard Cheat Sheet** — Pembaruan tampilan cheat sheet keyboard.
- **Live Preview Panel** — Peningkatan panel preview langsung.
- **Playlist Item Card** — Kartu item playlist yang mendukung item campuran (lagu + Alkitab).
- **Excel Import** — Migrasi dari `xlsx` ke `read-excel-file` yang lebih ringan dan aman.
- **Crash Recovery Dialog** — Dialog pemulihan crash yang didesain ulang.

### Dialog & Modal
- **Create Playlist Dialog** — Penyempurnaan dialog pembuatan playlist.
- **Export Song Dialog** — Perbaikan dialog ekspor lagu.
- **Integrity Check Dialog** — Peningkatan dialog pemeriksaan integritas database.
- **Song Relations Modal** — Modal relasi lagu yang di-refactor.
- **Scene Config / Tag Manager / Confirm / Duplicate / Playlist Picker** — Penyempurnaan keseluruhan.

---

## 🧪 Test Coverage Baru

Rilis ini menambahkan **25+ file test baru** yang mencakup:

- `BiblePanel`, `BibleVerseCard`, `BibleStudyInspector`, `BibleAutoFitText`
- `useBibleReader`, `useBibleSearch`, `bibleErrors`, `buildBibleSlides`
- `LiveProjectionCanvas`, `PresentationCanvas`, `ProjectionSurfaceParity`
- `PlaylistPanel.modal`, `PlaylistSelector`, `ProjectionPanelLayout`
- `SplashScreen`, `WelcomeScreen`, `Modal`, `SlideEngine` (lyrics & info)
- `AnnouncementPanel`, `AudioPanel`, `NotificationPanel`
- `useSongStore`, `playlistSchedule`, `projectionModeLifecycle`
- Serta test kontrak: `BibleLayoutContract`, `electron-style-contract`, `installer-config`, `release-metadata`, `safe-external-url`, `mode-policy`

---

## 🔄 Migrasi Database

Dari beta.1 ke beta.2, database akan di-upgrade secara otomatis:

| Versi | Nama | Deskripsi |
|---|---|---|
| 18 | `content_packs_registry` | Registry content pack (Bible, hymnal) dengan metadata lengkap |
| 19 | `mixed_rundown_support` | Playlist mendukung item campuran (lagu + Alkitab) |
| 20 | `bible_notes_and_highlights` | Catatan dan highlight ayat Alkitab |

> [!NOTE]
> Migrasi berjalan otomatis saat aplikasi pertama kali dibuka. Data lagu dan playlist yang ada **tidak akan terhapus**.

---

## ⚠️ Known Issues

### 🔒 Windows SmartScreen Warning

Installer ditandatangani dengan **self-signed certificate** (bukan CA terpercaya). Windows SmartScreen akan menampilkan peringatan "Windows protected your PC" saat pertama kali install. **Ini bukan virus** — ini perilaku normal Windows untuk aplikasi baru yang belum memiliki reputasi digital.

**Cara melewati peringatan:**

| Langkah | Aksi |
|---|---|
| 1 | Klik **"More info"** (Informasi selengkapnya) |
| 2 | Klik **"Run anyway"** (Tetap jalankan) |
| 3 | Instalasi berjalan normal ✅ |

> Installer sudah menyertakan halaman panduan SmartScreen di dalam wizard instalasi untuk membantu pengguna baru.

**Verifikasi keaslian:**
- Publisher: **AiWerek Tech**
- App ID: `com.aiwerek.sion-media`
- Website resmi: https://aiwerek-tech.github.io/sion-media-web

### Issue Lainnya
- 🔄 Auto-update **belum tersedia** — Download versi baru secara manual dari halaman GitHub Releases ini.
- 📡 Broadcast Mode **masih disembunyikan** — Dalam pengembangan aktif untuk rilis mendatang.
- 🖥️ Hanya tersedia untuk **Windows** — Build macOS/Linux akan tersedia di versi stabil.

---

## 📦 Instalasi

1. Download **`SION-Media-1.0.0-beta.2-Setup.exe`** dari bagian Assets di bawah.
2. Jalankan installer — jika SmartScreen muncul, klik **"More info"** → **"Run anyway"**.
3. Ikuti wizard instalasi (termasuk halaman panduan keamanan SmartScreen).
4. Pilih lokasi instalasi atau gunakan default.
5. Jalankan SION Media dari shortcut desktop.

> [!IMPORTANT]
> Jika Anda mengupgrade dari beta.1, **data Anda akan tetap aman**. Migrasi database berjalan otomatis.

---

## 🐛 Cara Melaporkan Bug

Kirimkan laporan dengan informasi berikut:
1. **Apa yang terjadi** — Deskripsi masalah
2. **Apa yang seharusnya terjadi** — Perilaku yang diharapkan
3. **Langkah reproduksi** — Cara memicu masalah
4. **Screenshot/video** — Jika memungkinkan
5. **Info sistem** — Versi app (Settings → About), versi Windows, jumlah monitor

Gunakan **Help → Export Debug Info** untuk mengekspor laporan diagnostik.

---

## 🗺️ Roadmap

```
v1.0.0-beta.1   ✅  First Closed Beta
v1.0.0-beta.2   ◀  Beta Polish & Bible System (Rilis Ini)
v1.0.0-beta.3   ▶  Performance & Memory Optimization
v1.0.0-rc.1     ▶  Release Candidate (Feature Freeze)
v1.0.0          ▶  Stable General Availability (GA)
```

---

## ❤️ Terima Kasih

Terima kasih kepada semua tester beta yang telah menggunakan, menguji, dan memberikan feedback untuk SION Media. Masukan Anda langsung membentuk masa depan software ini.

*Dirancang untuk keunggulan dalam ibadah.* ✝️

---

**Full Changelog**: `v1.0.0-beta.1...v1.0.0-beta.2`

© 2026 AiWerek Tech
