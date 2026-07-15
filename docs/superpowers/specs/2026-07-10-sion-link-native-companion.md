# SION Link Native Companion Spec

## Keputusan Produk

SION Link dikembangkan dengan pendekatan PWA-first. Browser lokal tetap menjadi fondasi utama karena langsung bekerja di HP, laptop, tablet, dan smart TV selama berada di jaringan WiFi yang sama dengan laptop operator. Aplikasi native desktop/mobile kemudian dapat memakai protokol yang sama sehingga tidak perlu membuat dua sistem remote yang berbeda.

Nama produk utama: **SION Link**.

Nama paket installer yang disiapkan:

- **SION Link Mobile** untuk Android/iOS wrapper.
- **SION Link Desktop** untuk Windows/macOS/Linux companion.

## Peran Akses

SION Link memakai satu alamat portal dan kode berbeda untuk setiap peran.

- **Pemateri**: melihat layar saat ini dan berikutnya, hanya tombol Prev dan Next.
- **Operator**: kontrol penuh, termasuk Prev, Next, Clear, Black, Logo, dan Freeze.
- **Live Viewer**: hanya menampilkan layar live untuk jemaat, laptop, HP, atau smart TV.
- **Stage Display**: confidence display untuk panggung, singer, musisi, dan pemateri.

Kode menentukan peran. User tidak memilih role secara manual agar akses tetap sederhana dan aman.

## Flow Aplikasi Native Companion

Layar koneksi pertama:

```text
Operator IP
Port
Code
Remember this device
Connect
```

Setelah connect:

- App memanggil `GET /api/session?code=...`.
- Server mengembalikan role dan path.
- App membuka webview internal ke path role tersebut.
- Jika `Remember this device` aktif, IP, port, dan kode disimpan lokal di device user.

## Protokol Minimal

- `GET /api/session?code=CODE`: validasi role.
- `GET /events?code=CODE`: stream snapshot via SSE.
- `POST /api/command?code=CODE`: kirim command sesuai izin role.
- `GET /media?code=CODE&path=...`: ambil media lokal yang sedang tampil.

## Prioritas Implementasi

1. Web/PWA role-based access di aplikasi utama.
2. Portal kode tunggal yang bisa dibuka dari HP/laptop/smart TV.
3. UI role khusus: presenter, operator, viewer, dan stage.
4. QR code per role di Settings agar mudah dipindai HP.
5. Native wrappers memakai protokol yang sama.

## Risiko dan Mitigasi

- Jaringan gereja bisa berubah: tampilkan semua alamat jaringan dan portal utama.
- Smart TV browser berbeda-beda: live viewer harus memakai HTML/CSS sederhana dan tidak bergantung pada API modern yang rapuh.
- Kode operator sangat sensitif: tampilkan peringatan keamanan dan pisahkan dari kode presenter/viewer.
- Native app belum wajib untuk MVP: PWA-first sudah menutup kebutuhan operasional langsung tanpa instalasi tambahan.
