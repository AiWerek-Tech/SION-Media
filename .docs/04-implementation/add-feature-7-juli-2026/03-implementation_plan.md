# Implementation Plan — Song Instrument Backing Tracks Support

Mendukung pemutaran instrumen musik pengiring (*backing track*) secara lokal untuk membantu ibadah di gereja yang tidak memiliki pianis/keyboardist. Berkas instrumen tetap berada di folder lokal operator tanpa menyalinnya ke database internal (zero-copy), dan dicocokkan secara otomatis berdasarkan kode buku lagu & nomor lagu (misal: "KJ 10.mp3").

---

## User Review Required

> [!IMPORTANT]
> - Jalur penyimpanan berkas instrumen diatur oleh operator melalui menu **Settings** → tab **Musik & Audio** baru.
> - Nama file instrumen lokal harus menyertakan kode buku lagu dan nomor lagu (misal: `KJ 10.mp3`, `KJ_010.wav`, `NKB 003.mp3`) agar sistem pencocokan pintar (Regex) dapat memetakan berkas secara otomatis.

---

## Decisions & Feedback Incorporated

- **Format Audio**: Berkas instrumen dengan ekstensi `.mp3`, `.wav`, `.m4a`, dan `.ogg` sudah cukup untuk memenuhi seluruh kebutuhan gereja.
- **Mode Pemutaran**: Pemutaran instrumen bersifat **manual** (operator menekan tombol Play secara sadar, tidak memicu otomatisasi saat lirik ditayangkan untuk mencegah ketidaksesuaian waktu mulai ibadah).
- **Dual Audio Output (Operator + Proyeksi)**:
  - Instrumen musik akan diputar secara **simultan (paralel)** baik di PC operator (untuk *monitoring* di meja operator) maupun di layar proyeksi utama (Live Output / *sound system* jemaat).
  - Untuk mencegah echo/flanger yang mengganggu jika keduanya bersumber dari satu soundcard yang sama, kita akan memisahkan kontrol volumenya:
    - Fader **"Instrumen"** pada Mixer Audio sebelah kanan mengontrol volume live proyeksi jemaat.
    - Widget kontroler instrumen di panel tengah memiliki **Monitor Volume Slider** lokal untuk mengubah/membungkam suara pada monitor PC operator tanpa memengaruhi suara utama yang didengar jemaat.

---

## Open Questions

> [!NOTE]
> 1. Apakah ada format instrumen selain `.mp3`, `.wav`, `.m4a`, dan `.ogg` yang ingin didukung?

---

## Proposed Changes

### Component 1: Main Process & Preload API

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts)
- Tambahkan `.mp3`, `.wav`, `.m4a` ke dalam mapping `MIME_TYPES` jika belum terdaftar untuk mendukung range-request byte streaming audio.

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)
- Daftarkan IPC handler baru:
  - `file:scan-instruments`: Membaca direktori terpilih menggunakan `fs.readdir` secara asinkronus, mencocokkan pola nama file via Regex (misal `/([a-zA-Z]+)[-_\s]*0*(\d+)/`), dan mengembalikan daftar instrumen yang terdeteksi beserta path absolutnya.
  - `projection:instrument-control` (dan event listener-nya): Merelai perintah pemutaran instrumen (play, pause, stop, seek, volume, mute) dari operator window ke projection window.
  - `projection:instrument-timeupdate` (dan event listener-nya): Merelai update status waktu putar (`currentTime`, `duration`) dari projection window kembali ke operator window.

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)
- Ekspos fungsi baru ke objek `window.api`:
  - `file.scanInstruments(folderPath)`
  - `projection.instrumentControl(command, value)`
  - `projection.onInstrumentControl(callback)`
  - `projection.instrumentTimeUpdate(currentTime, duration)`
  - `projection.onInstrumentTimeUpdate(callback)`

#### [MODIFY] [index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts)
- Tambahkan deklarasi TypeScript interface untuk fungsi-fungsi API baru di atas.

---

### Component 2: Frontend Stores

#### [NEW] [useInstrumentStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useInstrumentStore.ts)
- Buat store baru untuk mengelola status instrumen musik:
  - `instrumentsMap`: Peta indeks in-memory (`Record<string, string>`, e.g., `{'KJ-10': 'D:/path/KJ 10.mp3'}`).
  - `isPlaying`: Status pemutaran (`boolean`).
  - `currentTime`, `duration`: Status detik berjalan dan durasi total (`number`).
  - `instrumentVolume`, `instrumentMuted`: Nilai volume (0-100) dan status mute untuk Live Output.
  - `monitorVolume`, `monitorMuted`: Nilai volume (0-100) dan status mute untuk monitor PC operator.
  - Actions: `setInstrumentsMap`, `setPlaying`, `setTimeUpdate`, `setVolume`, `setMuted`, `setMonitorVolume`, `setMonitorMuted`, `scanFolder`.

#### [MODIFY] [useProjectionStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useProjectionStore.ts)
- Tambahkan state dan action untuk volume & mute instrumen di level proyeksi agar terintegrasi dengan OBS Audio Mixer.

---

### Component 3: UI Settings Screen

#### [NEW] [AudioSettings.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/AudioSettings.tsx)
- Tambahkan panel pengaturan audio baru yang memuat:
  - Konfigurasi Folder Instrumen Musik (input teks + tombol browse menggunakan `window.api.file.showOpenDialog` dengan opsi `openDirectory`).
  - Informasi status pemindaian folder (menampilkan jumlah instrumen yang berhasil terindeks).

#### [MODIFY] [SettingsScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/SettingsScreen.tsx)
- Daftarkan section `audio` ke daftar menu settings (`SECTIONS`) dan render komponen `AudioSettings` saat tab aktif.

---

### Component 4: Operator & Projection Panel

#### [MODIFY] [LivePreviewPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx)
- **Audio Mixer Update**: Di dalam `<AudioOutputPanel>`, render fader volume tambahan untuk **"Instrumen"** di samping fader "Desktop Audio" lengkap dengan VU meter dan tombol Mute. Fader ini mengontrol volume suara proyektor utama (jemaat).
- Hubungkan event listener `projection.onInstrumentTimeUpdate` untuk meng-update waktu putar secara visual pada layar operator.

#### [MODIFY] [ProjectionApp.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/projection/ProjectionApp.tsx)
- Tambahkan elemen `<audio>` tersembunyi untuk memutar instrumen musik secara lokal di layar proyeksi (Live Output).
- Dengarkan event `projection.onInstrumentControl` untuk mengendalikan elemen `<audio>` (play, pause, stop, seek, volume, mute).
- Kirim status waktu putar berkala (`currentTime`, `duration`) ke operator menggunakan `window.api.projection.instrumentTimeUpdate`.

#### [MODIFY] [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)
- **Instrument Playback Controller**: Jika lagu yang aktif memiliki instrumen yang cocok di `instrumentsMap`:
  - Tampilkan widget kontroler instrumen di bawah panel preview lirik.
  - Sediakan tombol Play/Pause, Stop, progress bar seekable, durasi waktu, serta slider volume untuk **Monitor PC Operator** lokal.
  - Tambahkan elemen `<audio>` lokal untuk memutar suara instrumen di komputer operator, disinkronisasikan sepenuhnya dengan status pemutaran (`isPlaying` & `currentTime`).

---

## Verification Plan

### Automated Tests
- Jalankan pemeriksaan tipe statis untuk memastikan integritas data preload dan store:
  ```bash
  npm run typecheck
  ```

### Manual Verification
1. Buka menu **Settings** → **Musik & Audio** → pilih folder lokal berisi file instrumen (misal `KJ 10.mp3`).
2. Konfirmasi bahwa panel menampilkan informasi jumlah instrumen terindeks.
3. Buka **Projection Mode** → pilih lagu **Kidung Jemaat No. 10**.
4. Pastikan widget audio controller muncul di bawah area lirik.
5. Klik **Play** pada widget, verifikasi audio terputar secara sinkron baik di PC operator maupun di layar proyeksi utama (Live Output).
6. Geser fader volume **Instrumen** pada Mixer Audio kanan dan verifikasi volume di output proyektor berubah.
7. Geser slider volume **Monitor** pada widget kontroler tengah, verifikasi suara di speaker PC operator mengecil/membesar tanpa mengubah suara di output proyektor utama.
