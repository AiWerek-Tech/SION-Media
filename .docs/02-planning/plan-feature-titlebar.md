# SION Media: Professional Custom Title Bar Blueprint

Tujuan title bar SION Media adalah menjadikannya command center desktop yang benar-benar membantu operator live, bukan sekadar header jendela.

## Target Experience

Saat operator membuka aplikasi, title bar harus langsung memberi konteks:

- status proyeksi live
- kondisi monitor / proyektor
- akses menu desktop
- timer, clock, dan window controls

## Struktur

Layout yang ditargetkan:

```text
[Logo + App] [Menu Desktop] [Song/State/Display Status] [Clock] [Window Controls]
```

Komponen utama:

- identity block
- menu desktop
- projection toggle
- stage display toggle
- state badge `LIVE`, `BLACK`, `FREEZE`, `CLEAR`
- display badge
- FPS
- service timer
- clock
- window controls

## Design Rules

- frameless Electron window
- `-webkit-app-region: drag` pada container utama
- elemen interaktif harus memakai `.no-drag`
- tampil padat, kecil, dan cepat dibaca
- style glass/dark dengan border transparan tipis

## Implementation Status - 2026-05-08

Yang sudah terimplementasi:

- frameless Electron window dengan React custom title bar
- identity block: logo, nama aplikasi, versi, workspace/event
- menu desktop: File, Edit, View, Playlist, Projection, Tools, Help
- status center: projection ON/OFF, stage toggle, state badge, display badge, FPS, timer, clock
- custom window controls minimize, maximize, close
- responsive collapse untuk width kecil
- dukungan `Focus Live Mode` dari menu View dan shortcut `Ctrl+Shift+F`
- badge monitor kini merah saat proyektor eksternal tidak terdeteksi dan menampilkan `PROJECTOR LOST`
- **Modernization V9**: Dropdown menggunakan Glassmorphism 2.0 (blur 16px, shadow-xl) dan sistem class global `.title-bar-dropdown` untuk konsistensi di seluruh menu.

## Alignment Dengan Workflow Broadcast Console

Setelah upgrade renderer:

- title bar tidak lagi hanya memberi status dekoratif, tetapi menjadi indikator operasional penting saat monitor terputus
- cue/program separation di dashboard kini didukung oleh state badge yang lebih jelas
- focus mode dan badge display saling melengkapi untuk live worship

## Catatan Teknis

- styling title bar disimpan permanen di `src/renderer/src/assets/main.css`
- state diambil dari `useAppStore` dan `useProjectionStore`
- perubahan monitor masuk dari event `display:changed` via preload API

## Sisa Peningkatan

- dirty state indicator untuk perubahan playlist yang belum disimpan
- shortcut desktop menu berbasis Alt
- log / diagnostics entry di menu Tools
