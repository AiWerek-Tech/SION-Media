# SION Media Documentation Hub

Dokumentasi ini disusun untuk memberikan panduan yang jelas bagi AI Agent dan Developer dalam memahami arsitektur, perencanaan, dan riwayat implementasi SION Media.

## Struktur Direktori

```text
.docs/
├── 01-architecture/      # Arsitektur sistem, alur aplikasi, dan laporan audit backend
├── 02-planning/          # Roadmap, rencana fitur, dan strategi upgrade per versi
├── 03-implementation/    # Riwayat implementasi dan teknis per versi
├── 04-guides/            # Referensi data (daftar lagu) dan panduan operasional
├── 05-logs/              # Catatan pembaruan, laporan audit, dan scratchpad history
└── assets/               # Aset desain, branding, dan workspace
```

## Konvensi Penamaan File

Untuk menjaga kerapian, gunakan format penamaan berikut untuk file baru:

- **Architecture**: `arch-[topic].md` (contoh: `arch-database-schema.md`)
- **Planning**: `plan-[topic]-[vX].md` (contoh: `plan-feature-bible-v3.md`)
- **Implementation**: `impl-[topic]-[vX].md` (contoh: `impl-obs-integration-v2.md`)
- **Guides**: `guide-[topic].md` (contoh: `guide-user-manual.md`)
- **Logs**: `log-[type]-[date/vX].md` (contoh: `log-update-20240101.md`)

## Prinsip Dokumentasi

1. **Pembaruan Wajib**: Setiap perubahan pada fitur atau logika kode **WAJIB** diikuti dengan pembaruan dokumentasi pada folder yang relevan.
2. **Developer-First**: Dokumentasi harus mudah dibaca oleh manusia dan diurai oleh AI.
3. **Historical Context**: Gunakan file `impl-history-*` atau `plan-roadmap-*` untuk melacak progres jangka panjang.
4. **Isolated**: Seluruh isi folder ini **TIDAK** disertakan dalam build produksi.

---

_Terakhir diperbarui: 2026-05-10_

## Current Implementation Snapshot (2026-05-10)

### TitleBar Modernization v9
TitleBar kini memiliki estetika premium dengan sistem Glassmorphism 2.0:
- **Global Dropdown Style**: Blur 16px, border radius 12px, dan shadow-xl yang konsisten di semua menu (File, Edit, Mode Switcher).
- **Mode Switcher Enhancements**: Mikro-animasi pada pemicu, indikator aktif berupa pendaran (glow), dan skema warna yang lebih berani.
- **Performance**: Pembersihan z-index redundan dan optimalisasi transisi CSS.

### Library Perfection v8
Audit 360 derajat dan refaktorisasi pada Library Mode untuk standar produksi:
- **Action Affordance**: Tombol aksi (Favorite, Playlist, dll) kini memiliki opacity 20% saat idle dan 100% saat hover, menghilangkan re-render tiba-tiba.
- **Zebra Striping**: List view di `LibraryTitleView` kini memiliki baris selang-seling untuk meningkatkan scanability.
- **Grid Consistency**: Standarisasi toolbar height (56px) dan padding berbasis 4px grid.
- **Type Safety**: Pembersihan unused variables dan peningkatan keamanan data `Song`.

### Library Immersive Player v6
Library Mode kini menggunakan **full-width immersive lyrics overlay** menggantikan split-pane layout sebelumnya:
- Klik lagu -> langsung masuk ke viewer full-screen overlay dengan animasi smooth.
- **Stanza-based pagination**: 1 bait per layar dengan vertical dot navigation.
- **Keyboard navigation**: Escape (close), Arrow/Page keys (navigasi bait), Space (play/pause auto-scroll).
- **Responsive typography**: Slider font 14-48px, persist ke localStorage.
- **Glassmorphism design**: Background blur, dynamic gradient overlay.

### Song Number Normalization (Migration v9)
Nomor lagu dinormalisasi agar **tidak menampilkan leading zeros**:
- `001` -> `1`, `010` -> `10`, `001A` -> `1A`
- Migrasi DB v9 mengupdate semua nomor di database.
- Write-path normalization di `addSong/updateSong` mencegah regresi.
- UI tolerance untuk data lama yang mungkin masih memiliki leading zeros.
- FTS5 search konsisten dengan nomor yang dinormalisasi.

### Bug Fixes
- **Scroll jump fix**: Klik nomor lagu tidak lagi menyebabkan scroll melompat.
- **Lint fixes**: React hooks set-state-in-effect errors resolved.
- **Hook dependency**: ResizeObserver untuk grid width calculation.

### Verifikasi
- `npm run typecheck`: ✅
- `npm run lint`: ✅ (0 errors, 0 warnings)
- `npm run build`: ✅

Dokumen yang perlu dirujuk untuk perubahan ini:
- `log-impl-library-immersive-player-v6.md`
- `log-impl-library-perfection-v8.md`
- `log-impl-titlebar-modernization-v9.md`
- `plan-library-immersive-player-v6.md`
- `plan-library-perfection-v8.md`
- `plan-titlebar-modernization-v9.md`
- `plan-song-number-normalization.md`

---

## Historical Snapshot (2026-05-08)

Perombakan renderer terbaru mendorong SION Presenter lebih dekat ke model operasi broadcast console untuk ibadah live.

- Dashboard sekarang memakai layout top-bottom split: monitor PREVIEW/PROGRAM di atas, mixer bar di tengah, song library dan playlist di bawah.
- Workflow live sekarang eksplisit `CUE/PREVIEW -> TAKE -> PROGRAM`. Memilih lagu dari library atau playlist hanya mengubah cue, bukan output jemaat.
- `useProjectionStore` memisahkan `slides` untuk cue deck dan `programSlides`/`programSlide` untuk live deck, sehingga navigasi live tetap stabil saat operator mengganti cue lain.
- Monitor PREVIEW dan PROGRAM memakai rasio 40/60 dengan simulasi confidence monitor 16:9, badge `LIRIK KOSONG`, dan warning monitor tunggal.
- `ControlBar` berubah menjadi switcher-style transport bar dengan tombol **TAKE** dominan, fade selector, live navigation, black, freeze, dan clear.
- Song Library dan Playlist sudah lebih padat dengan zebra striping, metadata `LS`, judul Indonesia/Inggris, nada dasar, tempo, dan action affordance 20% idle / 100% hover.
- Custom Title Bar tetap menjadi command center desktop dan kini juga menampilkan badge merah saat proyektor eksternal tidak terdeteksi.
- Dev startup menambahkan pembersihan cache Chromium khusus mode development untuk mengurangi error `disk_cache` saat menjalankan `npm run dev`.

Dokumen yang perlu dirujuk untuk perubahan ini:

- `05-logs/log-update-20260507.md`
- `06-design/ui-ux-audit.md`
- `02-planning/plan-feature-titlebar.md`
- `02-planning/plan-feature-songsion.md`
- `03-implementation/impl-history-v2.md`
