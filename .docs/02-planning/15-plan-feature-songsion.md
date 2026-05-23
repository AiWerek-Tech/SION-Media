# SION Presenter

# Enterprise Upgrade Blueprint

> **Status:** ✅ IMPLEMENTED — Blueprint ini sudah diimplementasikan sebagai bagian dari enterprise refactor. Lihat `10-enterprise-refactor-system/INDEX.md`

## Fokus: Modul Lagu Sion

Tujuan blueprint ini adalah meningkatkan:
**SION Presenter**
dari: _aplikasi worship projection biasa_
menjadi: **enterprise-grade worship presentation system**
dengan standar mendekati:

- ProPresenter
- EasyWorship
- MediaShout
- vMix (workflow concept)

tetapi tetap:
_offline-first, ringan, stabil, dan mudah dipakai gereja_

---

# TARGET AKHIR V2 ENTERPRISE

Hasil yang ingin dicapai:

✅ UI modern premium
✅ workflow operator sangat cepat
✅ projection engine sangat stabil
✅ scalable ribuan lagu
✅ smooth realtime rendering
✅ siap dipakai ibadah besar
✅ siap dipakai multi monitor
✅ tahan penggunaan live nonstop
✅ professional worship workflow

---

# BAGIAN 1

# UI / UX ENTERPRISE UPGRADE

## EVALUASI UI SAAT INI

Saya lihat arah UI-nya sebenarnya sudah bagus dan sudah mulai terasa seperti software multimedia profesional. Fondasinya sudah ada:

- dark theme,
- dual monitor concept,
- broadcast workflow,
- dense layout,
- operator-focused.

Tetapi saat ini masih terasa **"developer UI"**, belum **"premium enterprise production software"**.
Masalah utamanya bukan fitur, tetapi:

- hierarchy visual,
- spacing,
- information density,
- workflow clarity,
- visual polish,
- dan “live production feel”.

Jadi fokus peningkatan berikutnya adalah membuat operator merasa memakai software broadcast professional mirip:

- ProPresenter
- OBS Studio
- vMix
- Resolume Arena

### Yang Sudah Bagus

✅ dark theme sudah cocok
✅ layout monitor sudah benar
✅ operator/projection concept sudah terasa
✅ panel system sudah ada
✅ control bar sudah cukup jelas
✅ typography sudah lumayan modern
✅ workflow dasar sudah benar

### Masalah UI Saat Ini

1. **Visual Hierarchy Lemah**
   Semua panel terlihat "setara". Padahal harus ada fokus utama. Saat membuka app: mata operator seharusnya langsung tertuju ke PROGRAM + PREVIEW MONITOR.
2. **Border Terlalu Banyak**
   Saat ini UI terasa kotak-kotak kecil. Akibatnya terasa sempit, kurang premium, terasa seperti admin panel biasa.
3. **Spacing Belum Konsisten**
   Ada area terlalu rapat, terlalu kosong, alignment belum stabil.
4. **Control Bar Belum Premium**
   Saat ini tombol (Prev | Next | Black) masih terasa button biasa padahal ini _live production control_ yang harus terasa powerful.
5. **Playlist & Song Library Kurang Hidup**
   Masih terlalu kosong dan flat. Belum terasa _live worship workflow_.
6. **Editor Lagu Masih “Form Biasa”**
   Padahal editor adalah _core production workspace_.
7. **Tidak Ada Depth Layer**
   UI terasa 2D flat total. Kurang elevation, glass, glow, live-state emphasis.

---

# TARGET UI BARU

## A. DESIGN DIRECTION

**Style:** Broadcast Production Console (bukan Dashboard CRUD Application)
**Target Feel:** Saat operator membuka aplikasi, harus terasa seperti control room multimedia gereja.

## B. GLOBAL DESIGN SYSTEM

### 1. New Spacing System

Gunakan sistem konsisten **4px base grid**.
| Type | Size |
| ------- | ---- |
| micro | 4 |
| small | 8 |
| medium | 12 |
| normal | 16 |
| large | 24 |
| section | 32 |

### 2. Border System Rework

Saat ini border terlalu dominan.

- **Revisi:** Gunakan subtle border, soft glow, depth shadow.
- **Hindari:** Garis terang di semua sisi, kotak berlebihan.

### 3. Panel Elevation System

Buat layer depth:

- Layer 1: Main background
- Layer 2: Panels
- Layer 3: Monitor panels
- Layer 4: Active/live controls

### 4. Color System Upgrade

Saat ini terlalu ungu rata.
**Revisi:**

- Base: #0D0F17
- Surface: #151826
- Elevated: #1B2030
- Accent: #5B8CFF

**LIVE STATE COLORS:**

- Program LIVE: RED
- Preview: GREEN
- Projection Active: AMBER

---

# C. MAIN SCREEN REDESIGN

## 1. Layout Baru (Broadcast Standard)

## ``text

## | TOP CONTROL BAR |

## | [PREVIEW MONITOR] | [PROGRAM (LIVE) MONITOR] | [NEXT] |

## | LIVE TRANSPORT / MIXER BAR |

## | SONGS (High-Density) | PLAYLIST (High-Density) |

``
Kenapa PREVIEW & PROGRAM dipisah? Karena ini standar **broadcast production workflow**.

## 2. SYSTEM LAYOUT UTAMA (MONITORS)

Sistem monitor harus meniru tata letak **vMix / OBS**.

- **PREVIEW MONITOR (Kiri):** Tampilan khusus operator untuk meninjau dan menyesuaikan slide/lirik sebelum ditembakkan ke Live. Bingkai **Hijau**.
- **PROGRAM / LIVE MONITOR (Tengah/Kanan):** Tampilan mutlak dari proyektor. Bingkai **Merah** mendominasi (60% ukuran jika memungkinkan) karena ini fokus utama.
- **NEXT PREVIEW (Opsional):** Melalui menu _Pengaturan_, opsi _Shortcut_, atau _View Menu_, pengguna dapat menambahkan 1 layar lagi di sebelah kanan untuk melihat urutan antrian slide berikutnya secara instan tanpa mengganggu Preview utama.

## 3. Top Bar Redesign

Saat ini terlalu kosong.
**Tambahkan:**

- **Left:** logo kecil, current service, current playlist.
- **Center Projection state:** LIVE, BLACK, FREEZE, CLEAR.
- **Right:** display monitor, FPS render, settings, profile.

## 4. Monitor Section Redesign

Ini bagian TERPENTING.
**Revisi Besar:** PROGRAM monitor harus dominan karena itulah yang tampil ke jemaat.

- **Ukuran Baru:** PROGRAM = 60%, PREVIEW = 40%
- **Tambahkan Label Besar:** PROGRAM (warna merah), PREVIEW (warna hijau).
- **Tambahkan Safe Area Overlay:** Agar operator tahu area aman projector.
- **Tambahkan Transition Indicator:** Saat fade muncul visual progress bar.

## 5. Song Library Redesign

Saat ini terlalu kosong.
**Revisi:**

- **Tambahkan Song Card:** Bukan list polos. Isi Song Card: LS 001, Judul, Kategori, Terakhir dipakai, Favorite.
- **Tambahkan Quick Action Hover:** Saat hover muncul opsi project now, preview, add playlist, favorite.
- **Tambahkan Search Global Premium:** Search box besar ala Spotify/VSCode.

## 6. Playlist Redesign

Saat ini masih seperti panel kosong.
**Revisi:**

- **Playlist Item Harus Kaya Informasi:** Isi dengan #01, LS 145, Nama Lagu, Durasi, Jumlah slide.
- **Tambahkan:** drag handle, active glow, projected indicator, section divider.

Contoh:
``text
[OPENING]

---

LS 145
LS 201

## [WORSHIP]

LS 87
LS 211
``

## 7. Live Control Bar Redesign

Ini harus terasa seperti OBS/vMix.
**Layout:**
`text
[PREV] [TAKE] [NEXT]
      [FADE]
[BLACK] [FREEZE] [CLEAR]
`
**TAKE BUTTON:** Harus besar, glowing, center focus.

---

# D. SONG EDITOR REDESIGN

Editor sekarang sebenarnya paling perlu upgrade besar. Target: **Professional Worship Lyric Studio**

## Layout Baru

## ``text

## | SONG INFO | LIVE PREVIEW |

## | LYRICS EDITOR |

## | SLIDE STRIP / TIMELINE |

``

- **LIVE PREVIEW WAJIB BESAR:** Saat edit operator harus langsung lihat hasil projector realtime.
- **SLIDE STRIP VIEW:** Mirip Premiere/ProPresenter. Setiap Slide Jadi Thumbnail (bukan teks biasa). Contoh: [Slide 1] [Slide 2] [Slide 3]
- **SMART EDITOR TOOLS:** Tambahkan toolbar (insert chorus, split slide, merge slide, auto format, duplicate section).
- **AUTO FORMAT PANEL:** Saat klik "Auto Format" muncul setelan max lines, font sizing, balancing.
- **LIVE TYPOGRAPHY PREVIEW:** Realtime font scaling, wrapping, overflow warning.

---

# E. MOTION & MICROINTERACTION

Ini pembeda premium app.
**Tambahkan:**
✅ smooth hover
✅ animated state transition
✅ soft fade
✅ active glow
✅ live pulse indicator

**Hindari:**
❌ animasi ramai
❌ flashy gamer UI

---

# F. PROFESSIONAL TOUCHES

## 1. Live Status Indicator

Contoh: ● LIVE, ● PROJECTING, ● PREVIEW READY

## 2. Performance Status

Tambahkan: FPS, GPU, Display Connected

## 3. Quick Command Palette

Tekan CTRL + P muncul popup: cari lagu, buka playlist, projector settings.

## 4. Keyboard Cheat Sheet

Tekan ? muncul shortcut overlay.

---

# G. TYPOGRAPHY & ICONOGRAPHY

**Typography Improvement:**
Saat ini typography terlalu tipis & kecil.

- Gunakan: Inter, Geist, atau SF Pro style.
- Gunakan font-weight hierarchy.

| Type       | Size  |
| ---------- | ----- |
| Main title | 20-24 |
| Section    | 14-16 |
| Body       | 13-14 |
| Caption    | 11-12 |

**Icon System:**
Gunakan Lucide atau Tabler Icons (modern, clean, enterprise feel).

---

# H. PREMIUM ENTERPRISE FEATURES

- **Workspace Preset:** Operator Mode, Minimal Mode, Live Event Mode.
- **Multi Layout:** Operator bisa resize panel, save layout, restore layout.

---

# I. UX UNTUK LIVE WORSHIP

Ini penting sekali.

1. **ZERO INTERRUPTION UX:** Saat live tidak boleh popup mengganggu, tidak boleh modal besar, tidak boleh blocking UI.
2. **FAST RECOVERY UX:** Jika projector disconnect, _small toast notification only_, bukan popup besar.
3. **ALWAYS VISIBLE LIVE STATE:** Operator harus selalu tahu apa yang sedang tampil ke jemaat.

---

# PRIORITAS IMPLEMENTASI UI

1. **PRIORITAS 1: Layout & hierarchy redesign** (Karena ini paling mempengaruhi professional feel).
2. **PRIORITAS 2: Monitor system redesign** (Karena ini inti aplikasi).
3. **PRIORITAS 3: Song editor redesign** (Karena ini workspace utama).
4. **PRIORITAS 4: Motion & polish** (Agar premium).
5. **PRIORITAS 5: Advanced enterprise UX** (Command palette, workspace, dll).

---

# BAGIAN 2

# BACKEND ENTERPRISE UPGRADE

## A. ARCHITECTURE UPGRADE

Saat ini sudah bagus, tapi untuk enterprise perlu modular lebih dalam.
**Struktur Baru:**
`text
core/
├── projection-engine
├── slide-engine
├── playlist-engine
├── media-engine
├── search-engine
├── sync-engine
├── render-engine
└── backup-engine
`

## B. PROJECTION ENGINE V2

Ini jantung aplikasi. Upgrade Besar:

1. **Render Queue System:** Supaya tidak lag, tidak flicker.
2. **GPU Accelerated Rendering:** Gunakan CSS transform + opacity bukan repaint berat.
3. **Double Buffer Rendering:** Agar transition halus.
4. **Virtual Projection Layer:** Pisahkan render state dan live state.

## C. SLIDE ENGINE V2

- **Smart Layout Engine:** Menentukan otomatis ukuran font, line wrapping, slide balancing.
- **Typography Measurement Engine:** Hitung real pixel rendering, bukan sekadar jumlah karakter.

## D. SEARCH ENGINE V2

Saat ini search biasa. Enterprise Upgrade: Gunakan **SQLite FTS5**.
**Hasil:**
✅ instant search
✅ fuzzy search
✅ typo tolerance
✅ search ribuan lagu cepat

_Contoh: Cari "halelu", langsung muncul "Haleluya"._

## E. DATABASE UPGRADE

Tambahkan tabel/kolom:

- song_usage_history (song_id, used_at, playlist_id)
- song_tags (song_id, tag_id)
- slide_themes (id, name, font, background, animation)

## F. BACKUP ENGINE V2

Tambahkan:
✅ incremental backup
✅ versioned backup
✅ restore point
✅ corruption recovery

## G. CRASH RECOVERY SYSTEM

Wajib untuk live worship.
Simpan realtime: current playlist, current slide, projection state.
Saat crash muncul dialog: _restore live session?_

## H. PERFORMANCE OPTIMIZATION

Sangat penting. Tambahkan:

- **Virtualized Song List:** Untuk ribuan lagu.
- **Lazy Rendering:** Render hanya slide aktif.
- **Background Asset Cache**
- **Memory Pooling**

## I. MULTI DISPLAY ENGINE V2

Upgrade:
✅ projector hot swap
✅ display persistence
✅ monitor profile
✅ resolution profile

## J. LOGGING SYSTEM

Enterprise wajib. Simpan:
projection errors, render errors, database errors, display events.

## K. SETTINGS ENGINE V2

Tambahkan:

- **Workspace Layout Save:** Operator bisa save workspace layout.
- **Contoh:** Operator Mode, Minimal Mode, Livestream Mode.

---

# BAGIAN 3

# ENTERPRISE WORKFLOW FEATURES

## A. SERVICE MODE

Buat Live Service Session yang berisi: playlist, timer, notes, history.

## B. STAGE DISPLAY MODE

Khusus singer/musisi.
Isi:
✅ current lyric
✅ next lyric
✅ countdown
✅ chord

## C. QUICK ACTION SYSTEM

Tekan 1-9 langsung project favorite songs.

## D. HOTKEY PROFILE

Custom keyboard mapping.

## E. LIVE NOTES

Operator bisa simpan catatan seperti: _"ulang chorus"_.

---

# BAGIAN 4

# PREMIUM VISUAL SYSTEM

## A. BACKGROUND ENGINE V2

Tambahkan:
✅ static image
✅ gradient
✅ animated background
✅ motion blur

## B. MEDIA PRELOAD SYSTEM

Agar background bisa instant switch.

## C. TRANSITION SYSTEM V2

Tambahkan:
✅ dissolve
✅ fade through black
✅ smooth blur
✅ crossfade

---

# BAGIAN 5

# ROADMAP IMPLEMENTASI

## PHASE 1 — ENTERPRISE FOUNDATION

✅ redesign UI layout
✅ command palette
✅ inspector panel
✅ program/preview workflow
✅ advanced playlist

## PHASE 2 — ENGINE UPGRADE

✅ projection engine V2
✅ slide engine V2
✅ search engine V2
✅ crash recovery

## PHASE 3 — PERFORMANCE

✅ GPU optimization
✅ virtualization
✅ caching
✅ memory optimization

## PHASE 4 — PROFESSIONAL WORKFLOW

✅ stage display
✅ hotkey profiles
✅ service mode
✅ workspace layout

## PHASE 5 — PREMIUM EXPERIENCE

✅ motion system
✅ transitions
✅ advanced themes
✅ media preload

---

# TARGET HASIL AKHIR

Setelah blueprint ini selesai, **SION Presenter** akan menjadi:
**Professional Worship Presentation System**
yang stabil, cepat, modern, premium, scalable, dan layak dipakai gereja besar maupun event live professional.

---

# IMPLEMENTATION ADDENDUM — 2026-05-07

Audit UI terbaru menambahkan beberapa keputusan implementasi untuk menjaga pengalaman operator tetap profesional:

- **Title Bar Command Center**: Title bar tidak boleh kehilangan CSS custom karena ia adalah kontrol operasional utama aplikasi desktop.
- **Focus Live Mode**: Mode live khusus ditambahkan untuk menyederhanakan layar operator saat ibadah berjalan. Library dan playlist dapat disembunyikan sementara, Program/Preview menjadi fokus utama.
- **Cue/Program Safety**: Pemilihan lagu harus dianggap sebagai cue, bukan output. Output jemaat hanya berubah saat TAKE atau navigasi live.
- **Stage Display Reliability**: Window stage harus selalu memuat entry point React dan menerima snapshot state terakhir saat dibuka.
- **Accessible Icon Actions**: Tombol ikon pada SongCard dan PlaylistItem harus memiliki `aria-label`, focus ring, dan idle visibility minimal agar tidak tersembunyi total dari operator baru.

## Implementation Addendum - 2026-05-08 Broadcast Console Alignment

Pembaruan implementasi terbaru yang sudah sejajar dengan blueprint ini:

- Dashboard renderer sudah memakai layout top-bottom split.
- Monitor `PREVIEW` dan `PROGRAM` memakai rasio 40/60 dengan dominasi program live.
- `useProjectionStore` kini memisahkan cue deck dan live deck.
- `SPACE` dipakai untuk `TAKE`, sedangkan `RIGHT/LEFT` dipakai untuk navigasi slide live.
- `LivePreviewPanel` menampilkan confidence monitor 16:9, state `NO CUE`, badge `LIRIK KOSONG`, dan warning monitor tunggal.
- `ControlBar` sudah berubah menjadi switcher-style mixer bar dengan tombol `TAKE` dominan.
- Song library dan playlist dibuat high-density dengan zebra striping, metadata LS, judul Inggris, nada dasar, tempo, dan action affordance 20% idle / 100% hover.
- Title bar display badge sekarang berfungsi sebagai sinyal kehilangan proyektor.
- Startup mode development membersihkan cache Chromium untuk mengurangi error `disk_cache` pada `npm run dev`.
