# Plan: TitleBar Modernization V9 (Glassmorphism 2.0)

## Objective

Meningkatkan estetika dan profesionalisme _Title Bar_ SION Media dengan mengadopsi bahasa desain **Glassmorphism 2.0** yang lebih modern, konsisten, dan memiliki responsivitas visual yang tinggi (mirip standar MacOS/Linear).

## Perubahan Utama

1.  **Standardisasi CSS Global**:
    - Memperbarui class `.title-bar-dropdown` di `main.css` untuk menggunakan `backdrop-blur-xl` (16px), radius sudut 12px, dan sistem bayangan (_shadow-xl_) yang lebih dalam.
    - Menggunakan variabel warna `--color-glass-bg` dan `--color-glass-highlight` untuk memastikan dukungan tema (Light/Dark) yang sempurna secara otomatis.
2.  **Refaktorisasi `TitleBarModeSwitcher`**:
    - Menghapus gaya _inline_ Tailwind yang tidak konsisten dan menggantinya dengan class `.title-bar-dropdown` dan `.title-bar-dropdown-item`.
    - Meningkatkan keterbacaan dengan _padding_ dan _gap_ yang lebih luas (4px base grid).
    - Menambahkan mikro-animasi pada elemen pemicu (_trigger_) untuk memberikan _feedback_ visual saat menu dibuka.
3.  **Indikator Aktif yang Elegan**:
    - Mengganti penanda teks tebal biasa dengan kombinasi latar belakang `brand-primary/15` dan indikator titik biru dengan efek pendar (_glow shadow_).

## Langkah Kerja

1.  **Audit main.css**: Identifikasi token _glassmorphism_ yang sudah ada dan perbarui untuk kualitas premium.
2.  **Redesain Switcher**: Terapkan struktur `.title-bar-dropdown` pada `TitleBarModeSwitcher.tsx`.
3.  **Animasi**: Gunakan `framer-motion` (jika diperlukan) atau `animate-in` Tailwind untuk transisi _scale_ dan _fade_.
4.  **Verifikasi**: Pastikan tidak ada kebocoran _z-index_ dan dropdown tampil di atas semua elemen UI lainnya.
