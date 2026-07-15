# Walkthrough - Fix Video Playback (NotSupportedError)

## Akar Masalah

Video gagal diputar dengan error `NotSupportedError: The element has no supported sources` karena **Content Security Policy (CSP)** di ketiga file HTML aplikasi **tidak memiliki directive `media-src`**.

### Penjelasan Teknis

CSP pada file HTML sebelumnya:
```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' file: data: https:; font-src 'self' data:;
connect-src 'self' ws: wss: https://aiwerek-tech.github.io;
```

Masalah:
- **`img-src`** sudah mengizinkan `file:` → gambar tampil normal ✅
- **`media-src`** TIDAK ADA → fallback ke `default-src 'self'` → **memblokir** semua `<video>` dan `<audio>` dari sumber selain origin aplikasi (termasuk `local-media://` protocol) ❌

Meskipun protokol `local-media` sudah didaftarkan dengan `bypassCSP: true`, directive CSP dari meta tag HTML tetap berlaku sebagai lapisan keamanan tambahan yang diperiksa oleh Chromium saat memuat elemen `<video>`.

## Perubahan yang Dilakukan

### CSP Fix — 3 File HTML

#### [MODIFY] [index.html](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/index.html)
Ditambahkan `media-src 'self' file: local-media:;` dan `local-media:` ke `img-src`.

#### [MODIFY] [projection.html](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/projection.html)
Ditambahkan directive `media-src` dan `local-media:` yang sama.

#### [MODIFY] [stageDisplay.html](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/stageDisplay.html)
Ditambahkan directive `media-src` dan `local-media:` yang sama.

### Protocol Handler Cleanup

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/index.ts)
- Membersihkan handler `local-media` protocol (menghapus diagnostic logging).
- Menggunakan `net.fetch(pathToFileURL(filePath))` untuk menyajikan file lokal — ini memungkinkan Electron menangani range requests, MIME detection, dan streaming secara otomatis.

## Verifikasi

- ✅ TypeScript typecheck lulus (`npm run typecheck`) tanpa error.
- 🔄 Perlu restart aplikasi dan uji manual pemutar video.
