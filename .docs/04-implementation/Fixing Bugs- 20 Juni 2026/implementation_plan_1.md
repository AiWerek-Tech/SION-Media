# Audit & Peningkatan UI/UX Welcome Screen

Dokumen ini berisi hasil audit mendalam mengenai layar pembuka (Welcome/Onboarding Screen) pada aplikasi SION Media Desktop, serta usulan perbaikan teknis untuk meningkatkan pengalaman pengguna (UI/UX) baik untuk pengguna baru maupun lama.

---

## Hasil Audit Welcome Screen

Berdasarkan analisis kode pada [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx), [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx), dan [bootStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/startup/bootStore.ts), ditemukan beberapa masalah UI/UX (bugs, gaps, dan inefisiensi):

### 1. Kelelahan Startup & Redundansi (Critical UX Gap)

Bagi pengguna baru (first install), alur booting sangat berulang:

1. **Layar 1 (SplashScreen)**: Memperlihatkan logo SION Media dengan progress bar meluncur dan status GPU.
2. **Layar 2 (RendererBootScreen)**: Memperlihatkan box dialog diagnostik startup (trace timeline, cold start ms, task list). Ini sangat teknis dan membingungkan untuk pengguna pemula.
3. **Layar 3 (WelcomeScreen - IntroPhase)**: Menampilkan kembali logo SION Media dengan progress bar _loading database_ dll, lalu meminta user klik tombol "Mulai Studio".
   > [!WARNING]
   > Pengguna baru harus melewati tiga layar loading/splash berturut-turut sebelum masuk ke pilihan tema. Ini membuat aplikasi terkesan lambat dan membingungkan.

### 2. Ketiadaan Preview Tema secara Real-Time (UI/UX Gap)

Pada Phase 2 (Pilihan Tema), ketika pengguna mengklik "Celestial Dark" atau "Sacred Light", warna tampilan aplikasi tidak berubah secara langsung di layar. Tema baru baru benar-benar tersimpan dan diterapkan setelah pengguna menyelesaikan seluruh onboarding di Phase 3.

> [!IMPORTANT]
> Tanpa preview real-time, pengguna tidak bisa membedakan secara visual bagaimana wujud tema "Celestial Dark" versus "Sacred Light".

### 3. Penggunaan Jargon & Bahasa yang Tidak Konsisten (UX Gap)

- Navigasi utama menggunakan Bahasa Indonesia (misal: "Pilih Tampilan", "Lanjutkan", "Kembali", "Fokus maksimal...").
- Namun nama kartu tema menggunakan Bahasa Inggris ("System", "Celestial Dark", "Sacred Light") dan mode bento grid menggunakan jargon teknis Inggris ("Library Mode", "Projection Mode", "Broadcast Mode", "Management Mode").
- Istilah teknis seperti "NDI/OBS", "Bento Grid", "Dual-Monitor", "GPU warming" bisa menakutkan bagi operator gereja pemula.

### 4. Kurangnya Aksesibilitas (A11y Gap)

Kartu-kartu pilihan tema dan mode di [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx) tidak memiliki focus ring (`focus-visible`) yang jelas, sehingga menyulitkan navigasi jika pengguna menggunakan keyboard atau keyboard clicker.

### 5. Tidak Ada Onboarding Ulang untuk Pengguna Lama (UX Gap)

Pengguna lama langsung masuk ke workspace. Jika mereka ingin mengubah jalur kerja default dengan panduan interaktif, melihat tutorial awal, atau mencoba kembali onboarding, tidak ada menu/tombol yang memfasilitasi hal tersebut.

---

## User Review Required

> [!IMPORTANT]
> **Keputusan Desain Alur Pengguna Baru:**
> Kami mengusulkan untuk **menghilangkan layar diagnostik teknis** ([RendererBootScreen](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/startup/RendererBootScreen.tsx)) dan **menghilangkan IntroPhase** pada [WelcomeScreen](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx) jika aplikasi dijalankan untuk pertama kali.
> Dengan demikian, alurnya menjadi:
> `Booting/Loading (Single Splash Screen yang Cantik) -> Masuk ke Pilihan Tema (dengan ucapan selamat datang) -> Pilihan Mode -> Masuk Workspace.`
> Mohon konfirmasinya apakah alur ringkas ini disetujui.

---

## Open Questions

Ada beberapa pertanyaan terkait detail implementasi:

1. **Tutorial untuk Pengguna Baru**: Apakah kita perlu menambahkan slide panduan interaktif singkat (3-4 langkah cara pakai dasar) sebelum masuk ke pemilihan mode, agar lebih ramah bagi operator pemula?
2. **Pemicu Onboarding Ulang**: Di bagian mana sebaiknya kita menaruh tombol "Ulangi Panduan Awal (Onboarding)" untuk pengguna lama? Usulan kami adalah di [AppThemeSettings.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/AppThemeSettings.tsx) pada bagian bawah.

---

## Proposed Changes

### [Welcome Screen Component]

#### [MODIFY] [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx)

- Menghilangkan `IntroPhase` (Phase 1) atau menggabungkannya sehingga langsung membuka pilihan tema dengan teks penyambutan yang ramah bagi pemula.
- Mengintegrasikan preview tema real-time menggunakan fungsi `applyEffectiveTheme` dan `watchSystemThemeChanges` dari [app-theme.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/app-theme.ts) saat opsi tema diklik.
- Menambahkan focus ring pada tombol pilihan tema dan mode untuk keyboard navigation.
- Menyederhanakan deskripsi mode (Bento Grid) menggunakan bahasa Indonesia yang ramah pemula.
- Menambahkan visual glow premium, gradasi warna HSL yang lebih hidup, dan mikro-animasi pada hover bento grid.

#### [MODIFY] [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)

- Menyesuaikan agar jika `isFirstInstall` aktif, kita menyembunyikan `<RendererBootScreen />` yang berisi statistik teknis berat, dan hanya menampilkan splash screen minimal yang transisi mulus ke welcome onboarding screen.

#### [MODIFY] [AppThemeSettings.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/AppThemeSettings.tsx)

- Menambahkan opsi di bagian bawah halaman pengaturan untuk memicu kembali onboarding (mengatur `isFirstInstall` ke `true` di store, agar pengguna bisa melihat alur onboarding kembali).

---

## Verification Plan

### Automated Tests

- Menjalankan `npm run test` jika ada test suite yang menguji store atau UI rendering.

### Manual Verification

1. Bersihkan localStorage atau set `isFirstInstall` ke `true` melalui konsol devtools untuk memicu onboarding baru.
2. Verifikasi alur transisi dari booting ke pemilihan tema bebas dari kedipan (flashing) atau duplikasi progress bar.
3. Verifikasi apakah perubahan pilihan tema (Light/Dark/System) langsung mengubah tema UI secara real-time sebelum tombol selesai diklik.
4. Verifikasi navigasi menggunakan keyboard (tombol Tab, Space, dan Enter) pada kartu tema dan mode.
5. Verifikasi tombol "Ulangi Panduan Awal" pada halaman pengaturan berfungsi membawa pengguna kembali ke welcome screen.
