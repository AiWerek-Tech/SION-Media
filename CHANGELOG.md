# Changelog

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
