# Walkthrough — Pilar C: Smart Lyric-Audio Sync & Auto-Advancing (LRC Integration)

## Ringkasan Implementasi

Telah diimplementasikan fitur **Pilar C: Smart Lyric-Audio Sync & Auto-Advancing (LRC Integration)** dengan tingkat kestabilan tinggi pada mode Proyektor (*Projector Mode*) dan mode Perpustakaan (*Library Mode*). Fitur ini mengintegrasikan lirik terstempel waktu (*LRC timestamps*) secara mulus dengan pemutaran lagu pengiring (*backing track/minus-one*) untuk kenyamanan operator dan pengalaman jemaat yang profesional.

---

## Detail Perubahan Kode

### 1. IPC Handlers & Preload API (Main Process)
- **File**: [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts) & [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)
- **Deskripsi**: Menambahkan handler IPC `file:read-lrc` dan `file:write-lrc` untuk membaca dan menulis berkas fisik `.lrc` di folder yang sama dengan file audio backing track secara aman. Fungsi ini diexpose melalui preload API di `window.api.file.readLrc` dan `window.api.file.writeLrc`.

### 2. Utilitas LRC Parser
- **File**: [lrcParser.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/lrcParser.ts)
- **Deskripsi**: Membuat fungsi parser untuk mengurai teks LRC/stempel waktu `[mm:ss.xx]` ke detik, mendeteksi keberadaan stempel waktu (`hasLrcTimestamps`), dan membersihkan tag stempel waktu dari baris lirik (`stripLrcTimestamps`).

### 3. Integrasi Mesin Slide (Slide Engine)
- **File**: [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts)
- **Deskripsi**: Memperluas objek `SlideData` dengan opsi `startTime` dan `endTime`. `generateSlides` sekarang mengekstrak stempel waktu per baris lirik, memetakannya ke slide yang sesuai (dengan memperhitungkan baris yang dibungkus/*wrapped*), menyetel interval waktu tayang slide, dan menyajikan teks bersih tanpa tag stempel waktu ke jemaat.

### 4. Sinkronisasi & Auto-Advancing (Projector Mode)
- **File**: [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)
- **Deskripsi**: 
  - Membaca data LRC secara otomatis saat lagu dimuat (mencari tag inline di database SQLite `lyrics_raw`, dengan fallback membaca file fisik `.lrc` eksternal jika ada).
  - Menambahkan tombol premium **"Auto Slide"** di samping kontrol player audio operator. Jika diaktifkan, slide proyeksi akan berpindah secara otomatis mengikuti `currentTime` lagu pengiring.
  - **Smart Re-Sync**: Jika operator mengeklik slide secara manual ketika musik sedang berjalan, audio player akan langsung melompat (*seek*) ke waktu mulai slide tersebut agar suara dan teks tetap sinkron dengan sempurna tanpa jeda.

### 5. Editor LRC Interaktif & Sync Tool (Library Mode)
- **File**: [LibraryLyricsViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/library/LibraryLyricsViewer.tsx)
- **Deskripsi**:
  - Mengintegrasikan pemutar audio lokal di bagian bawah footer viewer lirik layar penuh.
  - Membuat panel editor **LRC Sync Tool** yang sangat interaktif di sisi kanan.
  - Operator cukup memutar musik pengiring dan menekan tombol **TAP** atau tombol **Spacebar** / **Enter** untuk menempelkan stempel waktu saat baris lirik dinyanyikan.
  - Tombol **Simpan LRC** akan memperbarui kolom `lyrics_raw` di SQLite dan menulis file fisik `.lrc` di sebelah file musik pengiring.
  - Menambahkan **Karaoke-style Highlighting**: Saat lagu diputar, baris lirik yang sedang aktif akan menyala terang (glow white) sementara baris lainnya meredup, menciptakan panduan visual yang menakjubkan bagi operator dan pembawa pujian.

---

## Status Verifikasi

- [x] **Parser Unit Tests**: Seluruh test case parser di `lrcParser.test.ts` berhasil dilewati dengan sempurna (vitest pass).
- [x] **Slide Generation Tests**: Seluruh 372 property/unit tests pada slide generator lulus tanpa regresi.
- [x] **Typecheck Compilation**: Bebas dari segala bentuk error compiler TypeScript (`tsc` exit 0).
- [x] **Build & Packaging**: Berhasil dibuild dengan lancar untuk distribusi Windows.
