# Bible Panel History Layout Design

## Goal

Menjaga daftar ayat sebagai konten utama panel Alkitab pada semua ukuran panel Electron, meskipun Riwayat berisi banyak item.

## Design

- Body panel tetap memakai satu kolom flex dengan `min-height: 0`.
- Cari, Browse, dan Manual mengisi ruang utama serta memiliki scroll internal masing-masing.
- Riwayat menjadi footer ringkas yang default-nya tertutup, menampilkan jumlah item, dan dapat dibuka pengguna.
- Saat dibuka, daftar Riwayat memiliki tinggi maksimum dan scroll sendiri; daftar tidak pernah tumbuh mengikuti jumlah item.
- Baris Riwayat hanya satu baris dengan ellipsis, fokus keyboard, dan target klik yang konsisten.
- Pada panel pendek, batas tinggi Riwayat diperkecil agar daftar ayat tetap terlihat.

## Verification

- Regression test memastikan Riwayat tertutup secara default dan daftar hanya dirender setelah toggle.
- QA Electron menguji Browse, daftar ayat, Riwayat banyak item, scroll, serta perpindahan Cari/Browse/Manual.
