# SION Media Multi-Mode Architecture Blueprint

## 1. Executive Summary & Visi Platform

**SION Media** bukan sekadar aplikasi lagu proyektor biasa, melainkan sebuah **Platform Multimedia Gereja Bertingkat (Multi-Tier Worship Multimedia Ecosystem)**.

Platform ini dirancang menggunakan arsitektur **One Platform, Multiple Worship Workflows**. Terdapat 4 Operational Modes yang berjalan di atas satu shared worship engine. Pendekatan ini mirip dengan software produksi kelas atas seperti OBS Studio, vMix, atau ProPresenter yang menyediakan workflow berbeda sesuai dengan kebutuhan operator, spesifikasi perangkat keras, dan hak akses pengelolaan data.

### Keuntungan Utama Model Ini:

1. **Scalable UX**: Pengguna awam atau pemula tidak bingung dengan fitur rumit.
2. **Performance Adaptive**: Dapat berjalan sangat ringan di laptop spesifikasi rendah untuk mode standar.
3. **Progressive Learning**: Operator dapat belajar dari mode paling sederhana hingga perlahan menguasai mode profesional.
4. **Enterprise Positioning**: SION Media diposisikan sebagai software presentasi berkelas profesional.
5. **Future-Proof Architecture**: Memungkinkan pengembangan modul-modul lanjutan tanpa merombak ulang inti aplikasi.

---

## 2. Global System Architecture

Semua mode menggunakan inti (core) yang sama, namun memaparkan (expose) UI dan workflow yang berbeda melalui sistem _Feature Flag_.

```text
SION Media
│
├── Shared Core Engine
│   ├── Multi-Hymnal Song Engine (Pencarian lintas buku, filter, database SQLite)
│   ├── Slide Engine (Pagination, rendering lirik)
│   ├── Theme Engine (Warna, font, background)
│   ├── Database Engine (SQLite & sinkronisasi data)
│   └── Render Engine
│
├── Mode 1: Library / Personal Mode
│
├── Mode 2: Worship Projection Mode
│
├── Mode 3: Broadcast Studio Mode
│
└── Mode 4: Content Management Mode
```

**Konsep Penting**:
1 Aplikasi (Single App), 1 Database, 1 Engine — Namun memiliki Multi-Interface sesuai kebutuhan.

---

## 3. MODE 1: Library / Personal Mode (Standard View)

_Mode untuk penggunaan pribadi & operasional ringan._

### Tujuan

- Belajar lagu dan latihan pribadi (singer, pemusik).
- Pencarian lagu cepat oleh jemaat biasa.
- Penggunaan di gereja kecil atau ibadah komsel tanpa proyektor ganda.

### Karakteristik UI & Teknis

- Fokus pada antarmuka ringan, cepat, sederhana, dan offline-first.
- Tidak ada output projector (dual screen), overlay, atau live output.
- Mendukung Fullscreen tunggal (pada layar utama) dan responsif.

### Core Features

#### Navigasi & Tab 1 — Berdasarkan Nomor (Grid/Tabel)

- **Hymnal Sidebar**: Sidebar untuk memilih koleksi buku lagu (Lagu Sion, SDA Hymnal, dll).
- Model tabel/grid fullscreen dengan _virtualized list_ untuk hemat RAM.
- Fitur _Jump to number_ dan _Quick search_ berdasarkan nomor per _hymnal_.
- Menampilkan Nomor, Judul, Hymnal Badge, Kategori, dan status Favorit.

#### Tab 2 — Berdasarkan Judul (Advanced Filter)

- **Sorting**: Berdasarkan Nomor, Alfabet, Kategori, Terbaru, Sering Dipakai.
- **Filter Profesional**: Kategori lagu, tempo, jenis ibadah, bahasa, dll.
- **Global Search Engine**: FTS5 realtime search, _typo-tolerant_, dan mencari lintas buku lagu maupun multi-bahasa.

#### Tab 3 — Mixed-Hymnal Playlist

- Playlist yang bersifat _hymnal-agnostic_ (bisa menggabungkan LS, SDAH, dll dalam satu daftar ibadah).
- Playlist pribadi, playlist ibadah, otomatis, dan riwayat.
- _Drag & drop_ urutan lagu.
- Simpan _preset_ urutan ibadah, export/import, dan sinkronisasi offline.

#### Lyrics Viewer

- Mode lirik layar penuh (single monitor), auto scroll, font resize.
- Pilihan _Light / Dark Theme_.

---

## 4. MODE 2: Worship Projection Mode

_Mode khusus operator multimedia gereja sebagai Core Projection Engine._

### Tujuan

Digunakan saat ibadah utama, KKR, doa malam, event, dan _live worship_. Sistem ini menerapkan presentasi ibadah _dual screen_.

### Arsitektur Tampilan Layar Ganda

1. **Operator Screen (Control Panel)**:
   - Previews, Program (Live), Playlist, Kontrol Lagu.
   - Shortcut Keyboard, Timer.
2. **Audience Screen (Projector)**:
   - Tampilan bersih hanya berisi lirik, background, ayat, dan animasi (tanpa UI kontrol).

### Core Features

- **Lyrics Engine**: Mendukung baris otomatis, _smart pagination_, ayat per ayat, dan auto-split slide.
- **Background System**: Solid color, image, video background, dan motion background.
- **Theme Engine**: Preset (Dark Worship, Bright Hall, Minimal Clean).
- **Animation System**: Transisi Fade, Slide, Smooth Dissolve.
- **Worship Tools**: Jam (Clock), Countdown, Pengumuman (Lower Third, Running Text), Ayat Alkitab.
- **Control System**: Hotkeys (Space = Next, B = Black Screen, T = Transparent) dan kesiapan remote control di masa depan (HP/Tablet).

---

## 5. MODE 3: Broadcast Studio Mode

_Level "Production & Streaming" yang menjadikan aplikasi sebagai Worship Presentation Ecosystem._

### Tujuan

Untuk gereja besar, _live streaming_ (YouTube/Facebook), produksi studio, dan _hybrid worship_. Memadukan konsep aplikasi proyektor dan konsol siaran (seperti vMix/OBS).

### Integrasi Eksternal

- **OBS Integration**: Browser Source, WebSocket API, Virtual Display, auto scene-change.
- **vMix Integration**: Title Input, GT Title, TCP/API Control untuk update lirik secara langsung.
- **Multi-Output Engine**:
  - NDI Output.
  - Transparan (Alpha Channel) & Chroma Key Mode.

### Core Features

- **Multi-Display Output**: Pengaturan independen untuk Projector Hall, Livestream Output, Operator Preview, dan Confidence Monitor.
- **Stage Display / Confidence Monitor**: Layar khusus singer/worship leader dengan chord, lirik berikutnya (Next Lyric), timer, dan cues.
- **Broadcast Workflow**: Tombol `TAKE`, `CUT/FADE`, dan transition engine antar _scenes_.
- **Live API**: Dukungan masa depan untuk REST API, WebSocket, MIDI trigger, dan Elgato Stream Deck.

---

## 6. MODE 4: Content Management Mode (Database Admin)

_Mode khusus untuk administrator data guna mengelola master data, pustaka lagu, dan struktur kategori._

### Tujuan

Dikhususkan bagi pengelola database (Librarian/Administrator) untuk menambah, mengubah, dan mengelola konten aplikasi. Dengan dipisahkannya fungsi ini, _Mode 1 (Personal Mode)_ bersifat _read-only_ murni (tidak bisa menambah/edit lagu) sehingga sangat aman digunakan oleh jemaat awam tanpa risiko merusak data.

### Core Features

- **Hymnal & Song Management**: Mendukung manajemen _Multi-Hymnal Collections_ (Official vs Custom). Tambah lagu baru, edit lirik lagu (_stanza tagging_), dan atur metadata.
- **Category Management**: Menambahkan atau mengedit struktur Kategori/Bahasan baru dari modul yang sudah tersedia.
- **Database Maintenance**: Backup, restore, sinkronisasi, serta _Bulk Import_ (CSV/JSON) untuk pustaka lagu/koleksi lokal.
- **Secure Access**: Berfungsi sebagai "Developer/Admin Mode" yang mengunci fitur pengeditan dari mode standar.

---

## 7. Engineering Architecture & Recommendations

Jangan membuat 4 aplikasi berbeda! Sistem harus dibangun di atas 1 engine dengan desain _modular feature exposure_.

**Struktur Folder Logis:**

```text
src/
├── core/       # Database, rendering engine, sync engine
├── shared/     # Komponen UI dasar, utils
├── features/   # Song library, playlist logic, themes
└── modes/      # UI Layout spesifik untuk tiap mode
    ├── basic/
    ├── projection/
    ├── broadcast/
    └── management/
```

**Sistem Flag:**
Jika `mode = "basic"`, maka engine proyeksi ganda dan integrasi broadcast tidak dirender sama sekali untuk menghemat penggunaan memori.

---

## 8. Roadmap Implementasi

Mengingat tech-stack yang sudah ada, tahapan pengerjaan diusulkan sebagai berikut:

- **PHASE 1: Content Management & Library Mode**
  - Membangun _Core Database_ dan Multi-Hymnal Song Engine.
  - Membangun UI pengeditan master data (Content Management Mode) & fitur Import.
  - Membangun UI pencarian _read-only_, _Hymnal Sidebar_, dan virtualisasi data (Library / Personal Mode).
- **PHASE 2: Worship Projection Mode**
  - Pengembangan Dual Screen Display Management.
  - Membangun sistem Render Lirik adaptif (Slide Engine).
  - Menambahkan Themes dan Background System.
- **PHASE 3: Broadcast Studio Mode**
  - Membangun OBS/vMix bridge (WebSocket/Browser Sources).
  - NDI support (jika memungkinkan secara native) dan Stage Display.
- **PHASE 4: Live API & Ecosystem**
  - Rilis kontrol remote, MIDI Integration, Stream Deck Support.
