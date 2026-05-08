# SION Media

# Integrated Worship Multimedia Platform for GMAHK/SDA

## Platform Vision

SION Media adalah platform multimedia gereja berbasis desktop offline-first untuk kebutuhan ibadah GMAHK/SDA.

Fokus implementasi saat ini adalah `SION Presenter`, dengan target pengalaman operator yang menyerupai software broadcast console: stabil, padat informasi, dan aman untuk live worship.

---

## Brand Structure

```text
SION Media
|
+-- SION Presenter
|   +-- Lagu Sion
|   +-- Dual Screen Projection
|   +-- Worship Playlist
|   +-- Multimedia Projection
|
+-- SION Bible
+-- SION Sermon
+-- SION Stream
+-- SION Remote
```

---

## Fokus Versi Pertama

Versi pertama difokuskan pada:

```text
proyeksi lagu ibadah dengan sistem dual screen projector
```

sebagai pengganti PowerPoint, slide manual, dan presentasi lagu biasa.

---

## Konsep Utama Sistem

### Offline-First Worship System

- tetap berjalan tanpa internet
- semua data tersimpan lokal
- cepat
- ringan
- stabil saat ibadah

### Broadcast Console Workflow

SION Presenter sekarang memakai model operasi:

```text
CUE / PREVIEW -> TAKE -> PROGRAM / LIVE
```

Artinya:

- memilih lagu dari library atau playlist hanya mengubah preview operator
- layar jemaat hanya berubah saat operator menekan `TAKE`
- navigasi slide live berjalan terpisah dari deck cue

---

## Arsitektur Utama Platform

```text
SION Media Platform
|
+-- Projection Engine
+-- Slide Engine
+-- Playlist Engine
+-- Media Engine
+-- Sync Engine
+-- Song Management System
+-- Projection System
+-- Worship Playlist System
+-- Theme & Display System
+-- Offline Database System
+-- Backup & Recovery System
```

---

## Core Application Flow

### Flow 1 - Application Startup

```text
User membuka aplikasi
-> Load SQLite local database
-> Load saved settings
-> Detect connected display/projector
-> Initialize projection engine
-> Masuk ke Operator Dashboard
```

### Flow 2 - Display Detection

```text
System detect monitor HDMI/display
-> Display 1 = Operator Screen
-> Display 2 = Projection Screen
-> Projection window otomatis pindah
-> Fullscreen projector standby
```

Jika hanya satu monitor terdeteksi:

- title bar menampilkan badge merah `PROJECTOR LOST`
- dashboard tetap mengizinkan simulasi preview/program

### Flow 3 - Worship Preparation

```text
Operator mencari lagu
-> Tambah lagu ke playlist ibadah
-> Atur urutan lagu
-> Simpan service session
```

### Flow 4 - Live Projection

```text
Operator pilih lagu
-> Preview tampil di dashboard
-> Lagu masuk ke status CUE
-> Operator tekan TAKE
-> Projection screen tampil fullscreen
-> Operator kontrol slide live
```

### Flow 5 - Slide Navigation

```text
Operator tekan RIGHT / LEFT
-> Projection Engine update slide live
-> Program monitor update realtime
-> Cue deck tetap aman sampai operator memilih cue lain
```

### Flow 6 - Black / Freeze Screen

```text
Operator tekan Black / Freeze
-> Projection screen berubah
-> Operator dashboard tetap aktif
```

### Flow 7 - Emergency Recovery

```text
Projector disconnect
-> System detect perubahan display
-> Projection window dipindahkan ke display tersisa
-> Badge merah tampil di title bar
-> Aplikasi tetap berjalan
```

---

## Core Features

### 1. Song Management System

Fungsi:

- daftar lagu
- pencarian cepat
- nomor lagu
- kategori lagu
- bahasa lagu
- favorite songs
- recent songs
- edit lagu
- delete lagu

Pencarian menggunakan SQLite FTS5 dan tetap instan pada database 525 lagu.

### 2. Dual Screen Projection System

Operator screen menampilkan:

- preview cue
- program live
- search lagu
- playlist
- kontrol projector

Projection screen menampilkan:

- fullscreen lyric
- background image/video
- transition
- overlays

### 3. Projection Engine

Fungsi:

- fullscreen projector
- realtime rendering
- multi-display handling
- instant update
- transition effect
- sync antar window via IPC

### 4. Slide Engine

Fungsi:

- auto split slide
- manual split slide dengan `---`
- smart line wrapping
- balancing antar slide
- cache hasil slide generation

Slide engine dipisahkan dari UI renderer agar concern tetap bersih.

### 5. Worship Playlist System

Fungsi:

- drag and drop playlist
- save / load playlist
- reorder song
- section label
- projected indicator

### 6. Live Preview System

Preview area sekarang menampilkan:

- monitor PREVIEW / CUE
- monitor PROGRAM / LIVE
- rasio 16:9 confidence simulation
- badge state live
- badge `LIRIK KOSONG`

### 7. Theme & Display System

Fungsi:

- font family
- font size
- text color
- text shadow
- background image
- overlay opacity
- alignment
- transition duration

### 8. Keyboard Shortcut System

```text
SPACE = TAKE
RIGHT = Next Live Slide
LEFT = Previous Live Slide
B = Black Screen
F = Freeze Screen
ESC = Clear Output
CTRL+F = Search Song
CTRL+SHIFT+F = Focus Live Mode
```

### 9. Offline Database System

Teknologi:

- SQLite
- FTS5
- better-sqlite3
- WAL mode

Data yang disimpan:

- songs
- playlists
- settings
- history
- session data

### 10. Backup & Recovery System

Fungsi:

- auto backup
- manual backup
- restore database
- session recovery
- WAL checkpoint sebelum backup

---

## User Interface Structure

### Operator Dashboard

```text
------------------------------------------------
| PREVIEW (40%) | PROGRAM / LIVE (60%)         |
|               |                              |
|               |                              |
------------------------------------------------
| CUE NAV | TAKE | LIVE NAV | BLACK | FREEZE  |
------------------------------------------------
| SONG LIBRARY (dense) | PLAYLIST (dense)      |
------------------------------------------------
```

### Song Library

- search
- filter tabs
- high-density song cards
- zebra striping
- quick actions

### Playlist

- worship playlist
- drag and drop queue
- active glow
- projected indicator
- section label

### Mixer / Control Bar

```text
Cue Prev | TAKE | Live Next | Black | Freeze | Clear
```

---

## Technology Stack

### Desktop Framework

- Electron

### Frontend

- React
- TypeScript
- TailwindCSS v4
- Framer Motion

### State Management

- Zustand
  - `useAppStore`
  - `usePlaylistStore`
  - `useProjectionStore`

### Performance

- `@tanstack/react-virtual` untuk library lagu

### Fonts

- `@fontsource/poppins`
- `@fontsource/inter`

Semua aset UI utama dibundle lokal untuk kebutuhan offline.

---

## Implementation Update - 2026-05-08 Broadcast Console Alignment

Perubahan implementasi terbaru:

- renderer dashboard diubah ke layout top-bottom split bergaya broadcast production
- `useProjectionStore` memisahkan cue deck dan program deck
- tombol `TAKE` menjadi gerbang tunggal dari cue ke output live
- `LivePreviewPanel` memakai dual monitor ratio 40/60 dengan simulasi 16:9
- `SongLibraryPanel` dan `PlaylistPanel` dibuat lebih padat dengan zebra rows, metadata kaya, dan affordance aksi samar saat idle
- `Focus Live Mode` memperbesar monitor dan menyembunyikan panel bawah saat ibadah berjalan
- title bar menampilkan badge merah saat proyektor eksternal tidak terdeteksi
- mode development membersihkan cache Chromium untuk mengurangi error `disk_cache` pada `npm run dev`
