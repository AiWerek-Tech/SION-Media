# SION Media Multi-Hymnal Worship Ecosystem Blueprint

## 1. Visi Platform: Enterprise Worship Song Ecosystem

Fokus utama fase awal pengembangan **SION Media** adalah membangun fondasi konten _worship_ yang kuat, khususnya pada modul lagu. Sebelum melangkah ke integrasi _livestream_, OBS, dan _professional production_ (sebagaimana dirancang pada _Multi-Mode Architecture_), hal yang paling esensial adalah mengubah konsep **"Song List Biasa"** menjadi sebuah **"Enterprise Worship Song Ecosystem"**.

Aplikasi ini tidak hanya akan memuat 1 buku lagu, melainkan sebuah **Multi-Hymnal Worship Library System** yang tersentralisasi untuk gereja GMAHK/SDA (Seventh-day Adventist).

### Tujuan Akhir

Membangun platform lagu ibadah yang _scalable, extensible, multi-language, multi-hymnal_, dan _future-proof_. Operator dan jemaat dapat mencari lagu lintas buku, membuat playlist campuran, serta memproyeksikan berbagai _hymnals_ dalam satu ekosistem terpadu.

---

## 2. Struktur Arsitektur Modul Lagu

Sejalan dengan _Shared Core Engine_ pada `arch-multimode-blueprint.md`, Modul Lagu memiliki struktur turunan sebagai berikut:

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

Setiap jenis buku lagu diperlakukan sebagai satu **Hymnal Collection** (Koleksi Mandiri). Sistem memisahkan secara tegas antara **Official Library** (Bawaan sistem/Read-only) dan **Custom Library** (Koleksi tambahan yang bisa diedit via _Content Management Mode_).

### Daftar Koleksi Awal (GMAHK/SDA)

- **Indonesia**: Lagu Sion Edisi Lengkap, Lagu Sion Edisi Lama, LS Toba Baru, LS Toba Lama, Pelangi Kasih, Lagu Gembira, LPMI Malay.
- **Internasional**: SDA Hymnal, Scripture Song.
- **Koleksi Lainnya**: Tidak terbatas, disiapkan untuk _unlimited hymnals_.

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

Semua lagu dari berbagai _hymnals_ disimpan ke dalam satu **Central Song Database**. Karena terpusat, semua lagu bersifat _searchable_ (dapat dicari secara global) dan _reusable_ (bisa dipakai melintasi ke-4 Mode Operasional SION Media).

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

Pada **Library / Personal Mode** dan mode lainnya, UI memiliki _Hymnal Sidebar_ untuk berpindah antar koleksi buku dengan cepat.

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

Menggunakan **SQLite FTS5** (Full Text Search) untuk pencarian yang sangat cepat (_instant search_).

1. **Browse by Number**: (ex: "LS 001", "SDAH 200").
2. **Browse by Title**: Mendukung _fuzzy search_, toleransi _typo_, dan pencarian instan abjad.
3. **Browse by Category/Tags**: (ex: Pujian, Penyembahan, Sabat, Perjamuan).
4. **Browse by Language**: (ex: Indonesia, English, Batak, Malay).
5. **Global Search**: Mencari kata kunci (ex: "kudus") akan memunculkan hasil dari semua _hymnal_ lintas bahasa.

---

## 6. Song Content & Relation System

### A. Lyrics Format & Smart Slide Engine

Lirik disimpan dengan format standar yang mendukung _stanza/chorus tagging_:

```text
[VERSE 1]
Bila badai hidup menerpamu...
[CHORUS]
Hitung berkatmu...
```

Pada saat _Worship Projection Mode_ aktif, **Smart Slide Engine** akan melakukan _auto split_ (memotong slide otomatis) berdasarkan stanza, batas baris, dan melakukan penyesuaian font (_auto font scale_).

### B. Song Relation System

Sistem cerdas di mana satu lagu dapat dihubungkan ke versi bahasa/buku lainnya.

- _Contoh_: Lagu "Kudus, Kudus, Kudus" (LS) -> terhubung otomatis (linked) ke versi "Holy, Holy, Holy" (SDA Hymnal) dan versi Batak.

---

## 7. Playlist System V2 (Mixed Hymnal)

Playlist ibadah (Rundown) bersifat _hymnal-agnostic_ (tidak terikat pada satu buku). Operator dapat membuat daftar lagu campuran dalam satu ibadah.

- _Contoh Rundown_:
  1. LS 145 (Lagu Sion)
  2. SDAH 25 (SDA Hymnal)
  3. PK 12 (Pelangi Kasih)
- Mendukung fitur: _worship order_, _drag-to-reorder_, dan _service templates_ (Preset Ibadah Sabat, Vesper, dll).

---

## 8. Ekstensibilitas & Multi-Language Architecture

### A. Multi-Language Support

Disiapkan secara native (Indonesia, English, Batak, Malay, dan bahasa lokal/Papua di masa depan) mengingat konteks multikultural GMAHK.

### B. Future Expansion & Import System (via Content Management Mode)

Di dalam **Mode 4: Content Management Mode**, administrator dapat:

1. **Manual Input**: Mengetik/menambah lagu custom baru.
2. **Bulk Import**: Mendukung format JSON, CSV, atau TXT.
3. **Future Extensibility**: Integrasi PDF Parser atau OCR scanner di masa depan.
   Arsitektur dibuat bersifat _Plugin-Ready_ untuk koleksi dari denominasi atau komunitas khusus.

---

## 9. Roadmap Implementasi Modul Lagu

Roadmap ini berjalan sinkron dengan _Roadmap Multi-Mode Architecture_:

- **PHASE 1: Core Hymnal System** (Fokus pada database SQLite)
  - Pembuatan entitas _Hymnal_ dan _Song Database_.
  - Injeksi/seeding data Lagu Sion Lengkap & SDA Hymnal.
- **PHASE 2: Song Management & Browsing** (Library Mode & Content Management Mode)
  - Fitur pencarian instan (FTS5), filter kategori, dan multi-hymnal sidebar.
- **PHASE 3: Slide Engine V1** (Worship Projection Mode)
  - Parsing format tag lirik (`[VERSE]`, `[CHORUS]`).
  - Implementasi _Smart auto-split_ saat proyektor aktif.
- **PHASE 4: Advanced System & Expansion** (Future Proofing)
  - Relasi lintas bahasa (Linked songs).
  - Sistem import custom CSV/JSON untuk koleksi gereja lokal.

Dengan berdirinya _Worship Song Ecosystem_ yang solid ini, aplikasi SION Media benar-benar siap menjadi fondasi ekosistem multimedia gereja enterprise.
