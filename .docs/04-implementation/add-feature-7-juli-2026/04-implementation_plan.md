# Implementation Plan — Pilar C: Smart Lyric-Audio Sync & Auto-Advancing (LRC Integration)

Mendukung integrasi format berkas sinkronisasi lirik standar (`.lrc`) dan tag timestamp inline (`[mm:ss.xx]`) pada sistem proyeksi SION-Media. Fitur ini memungkinkan pemutaran musik pengiring (*backing track*) secara otomatis menggerakkan slide lirik (*auto-advancing*) dan memungkinkan operator menyelaraskan kembali pemutar audio secara instan ketika melompati lirik (*smart re-sync*).

---

## User Review Required

> [!IMPORTANT]
> - **Format LRC yang Didukung**: Format timestamp standar `[menit:detik.milidetik]` (misal: `[00:15.50]`) dan format menit-detik `[menit:detik]` (misal: `[01:04]`). Tag metadata non-timing (seperti `[ti:Title]`) akan diabaikan oleh parser.
> - **Penyimpanan Ganda (Inline & Eksternal)**:
>   - **Inline (Database)**: Timestamp disisipkan langsung di depan setiap baris lirik di `lyrics_raw` database (misal: `[00:12.00]Bait 1\n[00:15.50]Gagang kemudi hidupku...`). Ini membuat lirik tersinkronisasi secara otomatis ikut ter-backup saat ekspor/impor database.
>   - **Eksternal (Berkas `.lrc`)**: Ketika instrumen musik dipilih secara manual atau otomatis (misal: `KJ-10.mp3`), sistem mencari berkas `.lrc` dengan nama dasar yang sama (misal: `KJ-10.lrc`) di direktori instrumen. Jika ada, sistem akan membaca waktu sinkronisasinya dari file tersebut.
> - **Perilaku Auto-Advancing**: Jika diaktifkan, slide jemaat akan berpindah secara otomatis sesuai dengan posisi detik audio.
> - **Perilaku Smart Re-Sync (Manual Override)**: Jika penyanyi melompat keluar dari urutan lagu (misal kembali ke Bait 1), operator cukup mengklik slide Bait 1 pada layar. Pemutar audio jemaat + operator akan langsung melompat (*seek*) ke timestamp awal slide tersebut secara otomatis.

---

## Proposed Changes

### Component 1: IPC Handlers & Preload API (Main Process)

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)
- Daftarkan handler IPC baru untuk membaca/menulis berkas `.lrc` di samping audio instrumen:
  - `file:read-lrc`: Menerima path file audio, mendeteksi keberadaan file `.lrc` yang sepadan, dan mengembalikan konten teksnya.
  - `file:write-lrc`: Menerima path file audio dan konten LRC baru, lalu menulis berkas `.lrc` secara lokal.

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)
- Tambahkan API ke objek `window.api.file`:
  - `readLrc: (audioFilePath: string) => Promise<string | null>`
  - `writeLrc: (audioFilePath: string, content: string) => Promise<boolean>`

#### [MODIFY] [index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts)
- Deklarasikan tipe data TypeScript untuk `readLrc` dan `writeLrc` pada interface `FileAPI`.

---

### Component 2: LRC Utility Parser

#### [NEW] [lrcParser.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/lrcParser.ts)
- Buat modul parser LRC yang berisi:
  - `parseLrc(text: string): { time: number; text: string }[]`: Mengurai teks LRC menjadi larik objek timestamp (dalam detik) dan teks bersih.
  - `stripLrcTimestamps(text: string): string`: Menghapus seluruh tag timestamp `[mm:ss.xx]` dari lirik mentah agar bersih saat ditampilkan di komponen UI lain.
  - `hasLrcTimestamps(text: string): boolean`: Memeriksa apakah lirik memiliki tag timestamp untuk mengaktifkan fitur sinkronisasi secara kondisional.

---

### Component 3: Upgraded Slide Engine

#### [MODIFY] [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts)
- Perbarui fungsi `generateSlides` agar:
  - Memeriksa jika ada data timestamp (baik inline dari `lyricsRaw` maupun yang diberikan dari eksternal).
  - Untuk setiap slide yang dihasilkan, pasangkan atribut `startTime` (dalam detik) berdasarkan timestamp baris lirik pertama pada slide tersebut.
  - Hapus tag timestamp dari teks slide sebelum dikirim ke mesin render, sehingga jemaat melihat teks yang bersih tanpa kode timestamp.
  - Tambahkan atribut opsional `startTime` dan `endTime` pada interface `SlideData` di [types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/types.ts).

---

### Component 4: Auto-Advancing & Smart Re-Sync Engine (Projector Mode)

#### [MODIFY] [useInstrumentStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useInstrumentStore.ts)
- Tambahkan state dan action:
  - `autoAdvanceEnabled`: Status apakah slide otomatis berpindah mengikuti pemutar audio (`boolean`, default: `true`).
  - `setAutoAdvanceEnabled: (val: boolean) => void`.
  - `activeLrcLines`: Larik `{ time: number; text: string }` dari lagu yang sedang dimainkan.
  - `setActiveLrcLines: (lines: { time: number; text: string }[]) => void`.

#### [MODIFY] [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)
- Di dalam `InstrumentPlayerWidget`:
  - Saat `activeSong` berubah, muat data LRC (dari inline `lyrics_raw` atau panggil `window.api.file.readLrc` jika ada `instrumentPath`). Simpan ke `useInstrumentStore.activeLrcLines`.
  - Tampilkan tombol switch **"Auto-Advance"** yang mudah diakses oleh operator di dekat tombol pemutar audio.
  - Tambahkan effect `useEffect` yang mendengarkan perubahan `currentTime` dari pemutar audio:
    - Jika `autoAdvanceEnabled` aktif dan `activeLrcLines` memiliki timestamp:
      - Cari slide dengan range `startTime` s/d `endTime` yang mencakup `currentTime` saat ini.
      - Jika slide tersebut berbeda dengan `programSlideIndex` (slide aktif di layar jemaat), kirim perintah transisi slide secara otomatis:
        `useProjectionStore.getState().executeProjectionTransition({ type: 'projection:go-to-slide', payload: { slideIndex: targetIndex } })`.
  - **Smart Re-Sync**: Di dalam penanganan aksi klik slide manual program:
    - Jika operator mengklik slide secara manual *dan* instrumen sedang diputar, dapatkan `startTime` untuk slide tersebut.
    - Jika slide memiliki `startTime` yang valid, lakukan **seek** audio ke waktu tersebut (`currentTime = startTime`). Perintah seek ini akan disinkronkan otomatis baik di monitor PC operator maupun di layar proyeksi utama jemaat.
  - Di dalam `lyricsSections` (parse visual operator), panggil `stripLrcTimestamps` agar operator tidak melihat teks dengan timestamp di grid lirik sebelah kiri.

---

### Component 5: Interactive LRC Editor & Sync Tool (Library Mode)

#### [MODIFY] [LibraryLyricsViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/library/LibraryLyricsViewer.tsx)
- Integrasikan pemutar instrumen audio di dalam viewer lirik penuh perpustakaan jika berkas musik pengiring tersedia.
- Tambahkan tombol **"LRC Sync Tool"** (Sinkronisasi Waktu).
- Ketika Sinkronisasi Waktu aktif:
  - Putar musik pengiring.
  - Render lirik baris-per-baris dengan indikator tombol **"TAP" (Stamp Waktu)** di samping masing-masing baris.
  - Saat lagu berputar, operator cukup mengklik tombol Stamp Waktu pada baris lirik yang sedang dinyanyikan, atau menekan tombol `Space` / `Enter` untuk melakukan stamp pada baris lirik berikutnya secara berurutan.
  - Stamp ini akan langsung menginjeksikan tag timestamp `[mm:ss.xx]` yang akurat di depan baris tersebut pada editor teks.
  - Sediakan tombol **"Save LRC"**:
    - Menyimpan seluruh lirik yang telah ditandai timestamp ke database (`lyrics_raw`) melalui `window.api.songs.update`.
    - Jika lagu memiliki file instrumen lokal, tawarkan untuk menyimpan file `.lrc` eksternal secara fisik melalui `window.api.file.writeLrc`.
  - Tampilkan visualisasi lirik yang berjalan (*karaoke-style scrolling highlight*) saat lagu diputar dalam mode baca biasa untuk kenyamanan bernyanyi.

---

## Verification Plan

### Automated Tests
- Buat test suite baru `lrcParser.test.ts` untuk memvalidasi:
  - Penguraian tag waktu `[mm:ss.xx]` dan `[mm:ss]`.
  - Penghapusan timestamp dari lirik mentah.
  - Konversi timestamp menjadi nilai detik yang akurat.
- Jalankan test suite:
  ```bash
  npm run test
  ```

### Manual Verification
1. **Penyelarasan Manual (LRC Creator)**:
   - Buka **Library Mode** → buka detail lagu (misal: Kidung Jemaat No. 10).
   - Pastikan terdapat pemutar musik pengiring. Klik **LRC Sync Tool**.
   - Putar audio, tekan `Space` secara berurutan saat lirik dinyanyikan untuk membubuhkan timestamp.
   - Klik **Save** dan verifikasi bahwa database/file ter-update dengan tag timestamp yang tepat.
2. **Auto-Advancing Proyeksi**:
   - Pindah ke **Projection Mode** → tayangkan lagu tersebut (pilih untuk go live).
   - Pastikan opsi **Auto-Advance** aktif.
   - Jalankan pemutar instrumen, pastikan slide jemaat berpindah secara otomatis tepat saat musik mencapai baris baru.
3. **Smart Re-Sync**:
   - Saat instrumen sedang diputar, klik slide ke-3 secara manual.
   - Pastikan musik pengiring langsung berpindah (*seek*) ke bagian yang sesuai dengan slide ke-3 tersebut.
