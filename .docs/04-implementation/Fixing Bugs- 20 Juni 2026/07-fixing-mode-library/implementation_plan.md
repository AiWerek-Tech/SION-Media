# Rencana Implementasi — Library Mode: Personal Worship & Study Hub

Rencana ini merinci transformasi desing **Library Mode** menjadi Pusat Studi & Penyembahan Pribadi (Personal Worship & Study Hub) dengan menambahkan modul Alkitab Interaktif (Bible Study), penyimpanan catatan belajar Alkitab versi-independen, integrasi multi terjemahan berdampingan, serta penataan ulang navigasi sidebar untuk multi-buku lagu.

---

## User Review Required

> [!IMPORTANT]
> * **Navigasi Sidebar Baru**: Pengelompokan sidebar diatur menjadi `STUDI PRIBADI` (Lagu & Alkitab) dan `PERSIAPAN & PLAYLIST` (Rundown, Favorit, Tema) untuk memberikan alur kerja yang fokus pada pembelajaran.
> * **Skema Database Baru (V20)**: Menambahkan tabel `bible_notes` untuk menyimpan catatan belajar Alkitab per ayat tunggal serta **highlight warna ayat** (multicolor). Catatan dan highlight ini bersifat *versi-independen* (ditautkan ke kode kitab, pasal, dan ayat, sehingga catatan/highlight yang ditulis di terjemahan TB tetap muncul saat membuka terjemahan KJV).
> * **Right Inspector Polimorfik**: Panel informasi di sebelah kanan akan beradaptasi secara otomatis. Jika pengguna memilih lagu, panel menampilkan detail lagu & chords. Jika memilih ayat Alkitab, panel menampilkan perbandingan teks dari seluruh versi terjemahan yang terinstal, catatan pribadi, dan pintasan rundown.

---

## Keputusan Desain (Resolved)

* **Bible study notes**: Catatan belajar disimpan **per ayat tunggal** (misal Yohanes 3:16). Jika pengguna memilih rentang ayat di UI, catatan ditampilkan secara terakumulasi.
* **Verse highlighting**: Setiap ayat dapat ditandai dengan **highlight warna** (multicolor) dari palet warna yang telah ditentukan (kuning, hijau, biru, merah muda, oranye, ungu). Warna highlight disimpan per ayat di kolom `highlight_color` pada tabel `bible_notes`.

---

## Rencana Perubahan

### 1. Database & IPC Layer (Backend)

#### [MODIFY] [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts)
* Tambahkan migrasi baru `v20` (`bible_notes_support`):
  ```sql
  CREATE TABLE IF NOT EXISTS bible_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_code TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    note_text TEXT NOT NULL DEFAULT '',
    highlight_color TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bible_notes_ref ON bible_notes(book_code, chapter, verse);
  ```

#### [MODIFY] [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts)
* Tambahkan fungsi pembacaan dan penulisan catatan & highlight Alkitab:
  * `getBibleNote(bookCode: string, chapter: number, verse: number): { note_text: string, highlight_color: string }`
  * `updateBibleNote(bookCode: string, chapter: number, verse: number, noteText: string, highlightColor: string): void`
  * `getBibleNotesForChapter(bookCode: string, chapter: number): Array<{ verse: number, note_text: string, highlight_color: string }>`

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)
* Daftarkan handler IPC baru:
  * `db:get-bible-note`
  * `db:update-bible-note`
  * `db:get-bible-notes-for-chapter`

---

### 2. Preload & Types

#### [MODIFY] [index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts)
* Perbarui interface `BiblePackAPI` untuk menyertakan fungsi catatan:
  ```typescript
  getNote: (bookCode: string, chapter: number, verse: number) => Promise<{ note_text: string; highlight_color: string }>
  updateNote: (bookCode: string, chapter: number, verse: number, noteText: string, highlightColor: string) => Promise<void>
  getNotesForChapter: (bookCode: string, chapter: number) => Promise<Array<{ verse: number; note_text: string; highlight_color: string }>>
  ```

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)
* Expose handler catatan Alkitab ke renderer di bawah objek `biblePack`.

---

### 3. Renderer (Frontend UI/UX)

#### [MODIFY] [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
* **Sidebar Restructuring**:
  * Ubah `NAV_GROUPS` untuk menyusun ulang menu:
    * **STUDI PRIBADI**:
      * `all` (Lagu & Pujian)
      * `bible` (Alkitab Interaktif)
      * `my-notes` (Ringkasan Catatan Saya)
    * **PERSIAPAN & PLAYLIST**:
      * `playlist` (Rundown Ibadah)
      * `favorites` (Lagu Favorit)
      * `recent` (Baru Dibuka)
      * `tags` (Tag & Tema)
* **Bible Workspace (`workspace === 'bible'`)**:
  * Implementasikan antarmuka selektor Kitab, Pasal, dan Ayat menggunakan sistem grid yang elegan.
  * Tambahkan kolom pencarian kata kunci dan deteksi referensi instan menggunakan hook `useBibleSearch`.
  * Integrasikan card Spotlight Preview dengan opsi Preview (CUE) / Live (Proyeksi) / Add to Playlist.
  * Sediakan tampilan daftar ayat yang nyaman dibaca dengan checkbox range-selection.
* **Polymorphic Right Inspector**:
  * Buat komponen `RightInspector` mendeteksi konteks aktif (`workspace`):
    * Jika `workspace === 'bible'`, render tab Alkitab:
      * **Bandingkan Terjemahan**: Memanggil `window.api.biblePack.getVerseRange` secara paralel untuk semua terjemahan yang terinstal, merender teks ayat berdampingan.
      * **Catatan Belajar**: Textarea untuk mengisi refleksi pribadi/catatan tafsir ayat yang disimpan secara instan ke database SQLite.
      * **Aksi Cepat**: Tombol salin teks referensi, proyeksi layar, dan tambah ke rundown.
* **Fullscreen Bible Study Viewer**:
  * Integrasikan pemutar layar penuh `LibraryBibleViewer` (adaptasi dari mesin rendering slide Alkitab) agar pengguna dapat membaca Alkitab dalam resolusi tinggi, auto-scroll, dan memilih latar belakang.

---

## Rencana Verifikasi

### Automated Tests
* Jalankan `npm run typecheck` untuk memastikan kompatibilitas TypeScript.
* Jalankan `npm run test` untuk memastikan regression safety pada suite pengujian.
* Jalankan `npm run build` untuk mengonfirmasi kelayakan paket produksi.

### Manual Verification
1. **Navigasi Sidebar**: Klik setiap menu baru dan pastikan perpindahan workspace berjalan instan tanpa lag.
2. **Pencarian Alkitab**: Ketik kata kunci (misal: "kasih") dan referensi (misal: "Yoh 3:16") di kolom pencarian Alkitab Library, pastikan hasil pencarian & Spotlight Card muncul dengan tepat.
3. **Catatan Belajar**: Simpan catatan di ayat Kejadian 1:1. Ganti versi Alkitab ke KJV, dan verifikasi catatan yang sama tetap muncul di panel kanan (versi-independen).
4. **Perbandingan Versi**: Pastikan tab "Bandingkan" menampilkan ayat yang bersangkutan dalam versi Indonesia (TB) dan versi lain (jika ada) secara simultan.
5. **Rundown Integration**: Tambahkan ayat dari Alkitab Library ke Playlist, buka tab Rundown, dan pastikan item tipe `bible` muncul lengkap dengan referensi dan cuplikan ayatnya.
