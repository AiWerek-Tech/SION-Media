# Walkthrough: Peningkatan UI/UX Welcome Screen & Onboarding

Perbaikan dan peningkatan alur layar pembuka (welcome screen) bagi pengguna baru maupun lama di SION Media Desktop telah berhasil diselesaikan. Seluruh tugas dalam checklist [task.md](file:///C:/Users/ADMIN/.gemini/antigravity-ide\brain\cc5ab057-42c9-439b-acb4-e623540f4aa1/task.md) telah selesai dikerjakan.

---

## Ringkasan Perubahan

### 1. Penghilangan Redundansi Booting & Diagnostik untuk Pengguna Baru

- **File**: [App.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/App.tsx)
- **Perubahan**:
  - Menyembunyikan panel diagnostik startup teknis ([RendererBootScreen](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/startup/RendererBootScreen.tsx)) dan panel status sistem ([DiagnosticsPanel](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/startup/DiagnosticsPanel.tsx)) jika `isFirstInstall` bernilai `true`. Pengguna baru kini tidak akan lagi melihat grafik timeline milidetik, status pipeline proyeksi, atau log boot sistem yang membingungkan selama proses onboarding berjalan.
  - **Perbaikan Masalah Kedip/Refresh (Flicker Fix)**: Mengganti key pada komponen pembungkus transisi halaman `<motion.div key={...}>` dari `${currentScreen}-${currentMode}-${phase}` menjadi key kondisional berbasis rute layar asli (`currentScreen !== 'dashboard' ? currentScreen : isFirstInstall ? 'welcome' : currentMode`). Menghilangkan variabel `phase` dari key ini menghentikan siklus bongkar-muat (mount/unmount) berulang yang dipicu setiap kali fase boot sistem berubah, sehingga welcome screen memuat dengan stabil tanpa kedipan/refresh 2-3 kali.

### 2. Carousel Panduan Interaktif Awal (Tutorial)

- **File**: [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx)
- **Perubahan**:
  - Mengganti `IntroPhase` lama (yang memuat progress bar palsu/duplikat dan meminta klik "Mulai Studio" tanpa alasan) dengan slider panduan awal 4 langkah:
    1. **Selamat Datang di SION Media**: Pengenalan umum aplikasi dengan ikon `Sparkles` dan efek glow.
    2. **Kontrol Layar Ganda (Multi-Monitor)**: Visualisasi layar operator vs layar jemaat.
    3. **Produksi Siaran (Broadcast & NDI)**: Penjelasan integrasi live streaming (NDI/OBS).
    4. **Akses Cepat & Keyboard Pintar**: Panduan tombol navigasi (Arrow, Space, Command Palette).
  - **Peningkatan Spasi & Layout**: Melebarkan batas kartu dari `max-w-xl` ke `max-w-2xl` agar teks tidak menumpuk rapat, memperluas padding dalam kartu dari `p-8` menjadi `p-10 md:p-16`, serta menaikkan margin bawah (`mb-10`) antar elemen agar visual terasa lapang dan bernapas.
  - **Penyederhanaan Efek Magnetik**: Menghapus transisi dan properti animasi `initial`/`animate` pada `MagneticButton` yang bertabrakan dengan manipulasi transform `translate` dari Framer Motion. Mengurangi faktor sensitivitas pergeseran magnetik menjadi `0.35` untuk mencegah tombol bergeser keluar/terpotong di sudut batas kartu.

### 3. Preview Tema Real-Time & Sinkronisasi Database

- **File**: [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx)
- **Perubahan**:
  - Mengintegrasikan preview tema instan di Phase 2 (Pemilihan Tampilan). Saat memilih "Celestial Dark (Gelap)", "Sacred Light (Terang)", atau "Ikuti Sistem OS", tema aplikasi langsung berubah secara real-time.
  - Memperbarui database settings Sqlite (`app_theme_mode`) secara permanen melalui IPC API `window.api.settings.update` saat tombol onboarding selesai diklik. Ini mencegah bug di mana tema kembali ke default saat aplikasi dibuka ulang.

### 4. Lokalisasi Bahasa Indonesia, Aksesibilitas, & Penyempurnaan Visual (Adaptive UI)

- **File**: [WelcomeScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/WelcomeScreen.tsx)
- **Perubahan**:
  - Menerjemahkan dan menyederhanakan seluruh judul mode kerja di Bento Grid (Phase 3) dan deskripsinya agar ramah untuk operator pemula/relawan gereja.
  - Menambahkan style `focus-visible:ring-2 focus-visible:ring-brand-primary` di seluruh opsi kartu tema dan mode kerja untuk memudahkan navigasi menggunakan keyboard.
  - **Penyempurnaan Visual & Kontras**: Mengganti warna latar belakang kartu yang sebelumnya di-_hardcode_ gelap dengan token desain CSS variable asli (`bg-bg-elevated/75`, `bg-bg-surface/30`) agar tampilan kartu seleksi adaptif dan bebas dari isu kontras teks rendah saat beralih ke tema Terang (Light Mode).
  - **Efek Glow Premium**: Menambahkan efek gradien glow top (`bg-gradient-to-b from-brand-primary/5`) pada kartu tema aktif, serta bayangan berpendar dinamis (`boxShadow` sesuai warna m.glow) pada bento grid mode kerja yang aktif.
  - **Indikator Slide**: Mengubah warna titik pagination dots agar adaptif menggunakan `bg-text-secondary/20` sehingga terlihat kontras dan jelas di kedua tema.

### 5. Fitur Pemicu Onboarding Ulang bagi Pengguna Lama

- **File**: [AppThemeSettings.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/settings/AppThemeSettings.tsx)
- **Perubahan**: Menambahkan seksi baru "Panduan Pengguna" dengan tombol "Mulai Panduan Awal (Onboarding)" di bagian bawah halaman pengaturan tampilan. Menekan tombol ini akan langsung memicu welcome screen agar pengguna lama dapat mengonfigurasi ulang atau sekadar membaca ulang panduan.

### 6. Verifikasi Linting & Kepatuhan Format Kode

- **Status**: Sukses penuh tanpa error maupun warning.
- **Tindakan**: Menjalankan `npm run lint -- --fix` untuk memformat seluruh berkas baru/modifikasi sesuai aturan Prettier & ESLint proyek. Pengujian ulang linting menghasilkan **0 error dan 0 warning**.

---

## Cara Verifikasi Secara Manual

1. Masuk ke halaman **Pengaturan** -> pilih tab **Tampilan**.
2. Scroll ke bagian paling bawah, lalu klik tombol **Mulai Panduan Awal (Onboarding)**.
3. Anda akan langsung dihadapkan pada layar Onboarding baru yang diawali dengan panduan interaktif 4 slide (gunakan tombol _Lanjutkan_ / _Kembali_ / titik navigasi).
4. Pada langkah pemilihan tema, pastikan seluruh tema berganti seketika di layar Anda saat diklik.
5. Selesaikan alur dengan memilih mode default Anda. Aplikasi akan menyimpan konfigurasi baru dan mengembalikan Anda ke workspace utama.
6. Jalankan `npm run lint` di terminal untuk memastikan tidak ada error/warning baru yang diperkenalkan.
