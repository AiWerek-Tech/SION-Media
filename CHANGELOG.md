# Changelog

## Unreleased

- Menambahkan input live SRT dari OBS ke SION Link melalui media gateway MediaMTX bawaan.
- Menambahkan distribusi LL-HLS/WebRTC, audio AAC, auto-start, Stream ID persisten, diagnostik, dan reset manual.
- Menambahkan verifikasi checksum build serta smoke test nyata H.264/AAC dari SRT sampai HLS dan WebRTC.

## 1.1.0-beta.2 - 2026-07-17

- Menyelaraskan versi rilis ekosistem: SION Media Desktop menjadi `1.1.0-beta.2` dan SION Link Desktop menjadi `0.5.0-beta.1`.
- Memperbarui berkas status proyek (`STATUS.md`) untuk mencerminkan status pengujian beta (*Beta Hardening Stage*).
- Menambahkan detail petunjuk fitur PowerPoint Bridge Tahap 2 pada dokumentasi website.

## 1.1.0-beta.1 - 2026-07-13

### Fitur dan peningkatan utama

- Menambahkan SION Link dengan kode viewer dan port persisten, auto-discovery jaringan, smart connection, serta role Pemateri, Operator, Live Viewer, dan Stage.
- Menambahkan OBS Network Output berbasis SRT dengan video 1080p dan audio program.
- Menambahkan impor paket PowerPoint dengan judul slide dan Speaker Notes, termasuk provider PowerPoint, WPS Presentation, dan LibreOffice.
- Menambahkan PowerPoint Presentation Bridge dari SION Link Desktop ke output SION Media.
- Merombak Pengaturan Sistem dan SION Link menjadi layout responsif, modern, dan ramah pemula.
- Menyempurnakan output Live landscape untuk IFP dan layar eksternal.
- Menyempurnakan Stage Display dengan current/next cue, notes, chord, heartbeat, timer, status runtime, dan pemilihan monitor khusus.

### Keandalan dan keamanan

- Menambahkan validasi payload IPC, kebijakan sender per-window, pembatasan origin, dan endpoint discovery terverifikasi.
- Menambahkan cache confidence snapshot agar Stage Display langsung pulih saat baru dibuka.
- Menambahkan fallback konversi presentasi, batas ukuran arsip, timeout, validasi PNG, dan import transaksional.
- Mempertahankan kompatibilitas playlist media lama serta data pengguna saat upgrade installer.

### Status release

- Kanal: **Beta testing**.
- Platform build: Windows x64.
- Build belum ditandatangani sertifikat code-signing publik; Windows SmartScreen dapat menampilkan peringatan.

## 1.0.0-beta.2 - 2026-07-02

### Penyempurnaan utama

- Memperbarui splash screen dan welcome screen dengan antarmuka Electron yang lebih profesional.
- Menyatukan sistem modal agar konsisten, responsif, dapat digulir, dan aman dari clipping.
- Menyempurnakan panel Lagu, Alkitab, Info, timer, playlist, serta navigasi dashboard proyeksi.
- Menambahkan playlist berulang tanpa tanggal dan pemilih seluruh playlist yang tersimpan.
- Menambahkan dukungan Info dan ayat Alkitab ke playlist dengan tampilan Preview/Live yang jelas.
- Menambahkan smart auto-fit untuk ayat panjang tanpa menghilangkan kendali zoom operator.
- Menyamakan logo kosong dan animasi transisi antara monitor operator dan layar proyektor.
- Mempertahankan output proyektor ketika operator berpindah mode aplikasi.
- Menyempurnakan format lirik mengalir dengan pemisah antar bait.
- Memperbarui Setup Wizard Windows dengan branding SION Media, Bahasa Indonesia, dan ikon native multi-resolusi.

### Keandalan dan keamanan

- Mengganti parser Excel yang memiliki kerentanan runtime dengan parser yang lebih aman.
- Membatasi pembukaan URL eksternal ke protokol HTTPS, HTTP, dan mailto.
- Memperbaiki perilaku modal bertumpuk agar Escape hanya menutup modal teratas.
- Menambahkan kontrak style Electron untuk drag region, form field, overflow, dan text selection.
- Menambah cakupan regresi untuk playlist, proyeksi, panel Alkitab, modal, installer, dan backend impor.
