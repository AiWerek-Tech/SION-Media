# Walkthrough — Song Instrument Backing Tracks Support

Kami telah berhasil mengimplementasikan fitur pemutar instrumen musik pengiring (*backing tracks*) yang terintegrasi secara profesional dan terverifikasi 100% bebas dari kesalahan tipe data (*typecheck clean*).

---

## Perubahan yang Dilakukan

### 1. Main Process & Preload API
- **[MIME_TYPES](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts#L37-L44)**: Menambahkan format `.mp3`, `.wav`, dan `.m4a` agar didukung oleh range-request stream (`local-media://`).
- **[IPC Handlers](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts#L254-L270)**:
  - `file:scan-instruments`: Memindai folder instrumen secara asinkronus menggunakan Regex pintar untuk mencocokkan nomor lagu anywhere dalam filename (misal: `Salinan LSEL 095.mp3`, `KJ 10 - Copy.wav`, `NKB_003.wav`). Mendukung normalisasi otomatis kode seperti `LSEL`, `LS`, `LAGUSION`, dan `LAGUSIONEDISILENGKAP` ke format database `'LSEL'`.
  - `projection:instrument-control`: Meneruskan perintah kontrol audio (play, pause, stop, seek, volume, mute) dari operator ke layar Live.
  - `projection:instrument-timeupdate`: Menyelaraskan status progres detik berjalan (`currentTime`, `duration`) ke layar operator.
- **[Preload & Types](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts#L79-L95)**: Mengekspos dan mendeklarasikan interface TypeScript untuk API di atas.

### 2. Frontend Stores & Settings
- **[useInstrumentStore](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useInstrumentStore.ts)**: Mengatur pemetaan memori lagu-ke-instrumen (`instrumentsMap`) serta status pemutaran lokal/monitoring.
- **[useProjectionStore](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useProjectionStore.ts#L1360-L1371)**: Menambahkan volume/mute level proyeksi untuk integrasi Mixer Audio.
- **[AudioSettings](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/AudioSettings.tsx)**: Panel pengaturan baru untuk memilih direktori musik lokal dan menampilkan status hasil indeks instrumen secara real-time.

### 3. Panel Kontrol Operator & Layar Live Proyeksi
- **[LivePreviewPanel (OBS Audio Mixer)](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/LivePreviewPanel.tsx#L740-L807)**: Menambahkan fader volume dan tombol Mute untuk **"Instrumen"** di sebelah Desktop Audio lengkap dengan indikator VU Meter interaktif.
- **[ProjectionApp (Live Output)](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/projection/ProjectionApp.tsx#L100-L142)**: Menambahkan elemen `<audio>` tersembunyi yang menerima stream `local-media://` dan merelai status waktu main.
- **[ProjectionMode (Widget Playback)](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx#L85-L174)**:
  - Menampilkan widget pengendali instrumen di bawah preview lirik lagu saat instrumen terdeteksi.
  - Menyediakan tombol Play/Pause/Stop manual, seek bar, indikator waktu, dan **Monitor Volume Slider** lokal.
  - Menambahkan elemen `<audio>` monitor lokal sehingga suara instrumen terdengar di laptop operator dengan level desibel yang bisa disesuaikan secara mandiri tanpa memengaruhi output sound system jemaat.

---

## Verifikasi & Hasil Pengujian

Kami telah menjalankan verifikasi statis menyeluruh terhadap seluruh kode Node.js dan browser:
```bash
npm run typecheck
```

### Hasil Log:
- **Typecheck Node**: `tsc --noEmit -p tsconfig.node.json` → **EXIT CODE 0 (SUKSES)**
- **Typecheck Web**: `tsc --noEmit -p tsconfig.web.build.json` → **EXIT CODE 0 (SUKSES)**

Seluruh file dan store terintegrasi dengan sempurna.
