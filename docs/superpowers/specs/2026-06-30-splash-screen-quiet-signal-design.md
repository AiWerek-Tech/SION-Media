# Splash Screen Quiet Signal Design

## Goal

Mengganti splash teknis berbentuk panel dengan layar startup minimal yang selaras dengan Welcome Screen.

## Accepted visual

Konsep `Quiet Signal`: identitas SION Media berada di tengah layar full-bleed, diikuti tagline, progress tipis, satu status aktual, dan persentase boot.

## Behavior

- Splash tampil pada fase `native`, `renderer`, `critical`, `shell`, dan `optional`.
- Progress menggunakan rata-rata nilai progress seluruh boot task, bukan jumlah task selesai.
- Status menampilkan label task yang sedang berjalan; fallback-nya `Menyiapkan ruang kerja`.
- Tips berganti, panel status, dan badge GPU dihapus.
- Splash keluar halus ketika boot beralih ke fase berikutnya; reduced motion menonaktifkan animasi berulang.
- Layar diagnostik `RendererBootScreen` tetap menangani fase `failed`.

## Verification

Vitest menguji identitas, progress, status, penghilangan noise teknis, dan fase hide. Gate akhir mencakup lint, typecheck, seluruh test, build, serta screenshot Electron pada viewport startup.
