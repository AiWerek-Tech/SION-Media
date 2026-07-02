# Welcome Screen Editorial Design

## Goal

Mengganti onboarding tiga tahap dengan satu Welcome Screen profesional yang membawa pengguna langsung ke mode Perpustakaan.

## Accepted visual

Konsep `Editorial Split`: hero produk terbuka di sisi kiri dan rail manfaat di sisi kanan. Tidak ada modal, card besar, pemilihan tema, atau pemilihan mode.

## Behavior

- Tema awal mengikuti sistem (`system`).
- Mode awal adalah `LIBRARY`.
- Tombol `Masuk ke SION Media` dan tombol keyboard `Enter` menjalankan aksi yang sama.
- Preferensi tema disimpan sebelum first-install ditandai selesai.
- Jika penyimpanan gagal, layar tetap terbuka dan menampilkan pesan retry.
- Motion menghormati `prefers-reduced-motion`.

## Visible copy

- `Ruang kerja presentasi ibadah`
- `Siap melayani. Tanpa kerumitan.`
- `Kelola lagu, Alkitab, dan layar jemaat dalam satu ruang kerja yang tenang, cepat, dan dapat diandalkan.`
- `Masuk ke SION Media`
- `Satu tempat untuk seluruh persiapan.`
- `Perpustakaan terpusat`, `Kontrol layar yang aman`, `Fokus pada operator`
- `Tema mengikuti sistem · Mode awal Perpustakaan`

## Layout and accessibility

- Dua kolom pada desktop, satu kolom pada viewport sempit.
- Tidak ada konten utama terpotong pada 1280×720.
- Tombol utama memiliki fokus terlihat, status loading, dan pesan error berperan sebagai alert.

## Verification

Vitest menguji render, klik, Enter, persistence, dan failure path. Gate akhir mencakup lint, typecheck, seluruh test, build, serta perbandingan screenshot konsep dan renderer.
