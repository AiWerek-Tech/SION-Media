# SION Media Multi-Hymnal Worship Ecosystem Blueprint

## 1. Visi Platform: Enterprise Worship Song Ecosystem
Fokus utama fase awal pengembangan **SION Media** adalah membangun fondasi konten *worship* yang kuat, khususnya pada modul lagu. Sebelum melangkah ke integrasi *livestream*, OBS, dan *professional production* (sebagaimana dirancang pada *Multi-Mode Architecture*), hal yang paling esensial adalah mengubah konsep **"Song List Biasa"** menjadi sebuah **"Enterprise Worship Song Ecosystem"**.

Aplikasi ini tidak hanya akan memuat 1 buku lagu, melainkan sebuah **Multi-Hymnal Worship Library System** yang tersentralisasi untuk gereja GMAHK/SDA (Seventh-day Adventist).

### Tujuan Akhir
Membangun platform lagu ibadah yang *scalable, extensible, multi-language, multi-hymnal*, dan *future-proof*. Operator dan jemaat dapat mencari lagu lintas buku, membuat playlist campuran, serta memproyeksikan berbagai *hymnals* dalam satu ekosistem terpadu.

---

## 2. Struktur Arsitektur Modul Lagu

Sejalan dengan *Shared Core Engine* pada `arch-multimode-blueprint.md`, Modul Lagu memiliki struktur turunan sebagai berikut:

```text
Song Ecosystem Core
│
├── Hymnal Library System (Pengelola Buku Lagu)
├── Song Metadata System (Database Master Lagu)
├── Lyrics Engine (Parsing format lirik)
├── Slide Engine (Rendering presentasi)
├── Song Classification System (Tag & Kategori)
├── Multi-Language System (Sistem multi-bahasa)
├── Playlist System V2 (Manajemen urutan ibadah)
├── Projection System (Penghubung ke Layar Ganda)
└── Future Expansion System (Import & Plugin)
```

---

## 3. Hymnal Library System

Setiap jenis buku lagu diperlakukan sebagai satu **Hymnal Collection** (Koleksi Mandiri). Sistem memisahkan secara tegas antara **Official Library** (Bawaan sistem/Read-only) dan **Custom Library** (Koleksi tambahan yang bisa diedit via *Content Management Mode*).

### Daftar Koleksi Awal (GMAHK/SDA)
* **Indonesia**: Lagu Sion Edisi Lengkap, Lagu Sion Edisi Lama, LS Toba Baru, LS Toba Lama, Pelangi Kasih, Lagu Gembira, LPMI Malay.
* **Internasional**: SDA Hymnal, Scripture Song.
* **Koleksi Lainnya**: Tidak terbatas, disiapkan untuk *unlimited hymnals*.

### Struktur Entitas Hymnal
```graphql
Hymnal {
  id: string
  code: string (contoh: "LS", "SDAH")
  name: string
  language: string
  region: string
  version: string
  publisher: string
  songCount: number
  isOfficial: boolean (true = read-only, false = user editable)
}
```

---

## 4. Song Master System

Semua lagu dari berbagai *hymnals* disimpan ke dalam satu **Central Song Database**. Karena terpusat, semua lagu bersifat *searchable* (dapat dicari secara global) dan *reusable* (bisa dipakai melintasi ke-4 Mode Operasional SION Media).

### Struktur Entitas Lagu
```graphql
Song {
  id: string
  hymnalId: string (relasi ke Hymnal)
  number: string (mendukung nomor dengan huruf, ex: 100A)
  title: string
  alternateTitle: string
  language: string
  category: string
  author: string
  composer: string
  lyrics: text
  tags: string[]
  theme: string
  scriptureReference: string
}
```

---

## 5. Multi-Hymnal UX & Search System

### A. Konsep Navigasi
Pada **Library / Personal Mode** dan mode lainnya, UI memiliki *Hymnal Sidebar* untuk berpindah antar koleksi buku dengan cepat.

```text
-------------------------------------------------
| HYMNAL SIDEBAR | SONG LIST | SONG PREVIEW     |
-------------------------------------------------
| 📖 Semua Lagu  | 001       | [Lirik Tampil]   |
| 📖 Lagu Sion   | 002       |                  |
| 📖 SDA Hymnal  | 003       |                  |
| 📖 Toba Baru   |           |                  |
-------------------------------------------------
```

### B. Song Browsing & Search Engine V2
Menggunakan **SQLite FTS5** (Full Text Search) untuk pencarian yang sangat cepat (*instant search*).
1. **Browse by Number**: (ex: "LS 001", "SDAH 200").
2. **Browse by Title**: Mendukung *fuzzy search*, toleransi *typo*, dan pencarian instan abjad.
3. **Browse by Category/Tags**: (ex: Pujian, Penyembahan, Sabat, Perjamuan).
4. **Browse by Language**: (ex: Indonesia, English, Batak, Malay).
5. **Global Search**: Mencari kata kunci (ex: "kudus") akan memunculkan hasil dari semua *hymnal* lintas bahasa.

---

## 6. Song Content & Relation System

### A. Lyrics Format & Smart Slide Engine
Lirik disimpan dengan format standar yang mendukung *stanza/chorus tagging*:
```text
[VERSE 1]
Bila badai hidup menerpamu...
[CHORUS]
Hitung berkatmu...
```
Pada saat *Worship Projection Mode* aktif, **Smart Slide Engine** akan melakukan *auto split* (memotong slide otomatis) berdasarkan stanza, batas baris, dan melakukan penyesuaian font (*auto font scale*).

### B. Song Relation System
Sistem cerdas di mana satu lagu dapat dihubungkan ke versi bahasa/buku lainnya.
* *Contoh*: Lagu "Kudus, Kudus, Kudus" (LS) -> terhubung otomatis (linked) ke versi "Holy, Holy, Holy" (SDA Hymnal) dan versi Batak.

---

## 7. Playlist System V2 (Mixed Hymnal)
Playlist ibadah (Rundown) bersifat *hymnal-agnostic* (tidak terikat pada satu buku). Operator dapat membuat daftar lagu campuran dalam satu ibadah.
* *Contoh Rundown*: 
  1. LS 145 (Lagu Sion)
  2. SDAH 25 (SDA Hymnal)
  3. PK 12 (Pelangi Kasih)
* Mendukung fitur: *worship order*, *drag-to-reorder*, dan *service templates* (Preset Ibadah Sabat, Vesper, dll).

---

## 8. Ekstensibilitas & Multi-Language Architecture

### A. Multi-Language Support
Disiapkan secara native (Indonesia, English, Batak, Malay, dan bahasa lokal/Papua di masa depan) mengingat konteks multikultural GMAHK.

### B. Future Expansion & Import System (via Content Management Mode)
Di dalam **Mode 4: Content Management Mode**, administrator dapat:
1. **Manual Input**: Mengetik/menambah lagu custom baru.
2. **Bulk Import**: Mendukung format JSON, CSV, atau TXT.
3. **Future Extensibility**: Integrasi PDF Parser atau OCR scanner di masa depan.
Arsitektur dibuat bersifat *Plugin-Ready* untuk koleksi dari denominasi atau komunitas khusus.

---

## 9. Roadmap Implementasi Modul Lagu

Roadmap ini berjalan sinkron dengan *Roadmap Multi-Mode Architecture*:

* **PHASE 1: Core Hymnal System** (Fokus pada database SQLite)
  * Pembuatan entitas *Hymnal* dan *Song Database*.
  * Injeksi/seeding data Lagu Sion Lengkap & SDA Hymnal.
* **PHASE 2: Song Management & Browsing** (Library Mode & Content Management Mode)
  * Fitur pencarian instan (FTS5), filter kategori, dan multi-hymnal sidebar.
* **PHASE 3: Slide Engine V1** (Worship Projection Mode)
  * Parsing format tag lirik (`[VERSE]`, `[CHORUS]`).
  * Implementasi *Smart auto-split* saat proyektor aktif.
* **PHASE 4: Advanced System & Expansion** (Future Proofing)
  * Relasi lintas bahasa (Linked songs).
  * Sistem import custom CSV/JSON untuk koleksi gereja lokal.

Dengan berdirinya *Worship Song Ecosystem* yang solid ini, aplikasi SION Media benar-benar siap menjadi fondasi ekosistem multimedia gereja enterprise.
