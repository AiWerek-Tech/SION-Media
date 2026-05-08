# SION Media Scratchpad History

Dokumen ini berisi catatan brainstorming, ide-ide mentah, dan coretan teknis selama proses pengembangan.

---

_Note: This is a consolidated historical scratchpad._

## Scratchpad — 2026-05-07 UI Regression

- Screenshot menunjukkan titlebar raw/unstyled: menu text menyatu, status menumpuk, window controls tidak memiliki hit area.
- Penyebab utama: custom class titlebar belum lengkap di `main.css`, bukan kegagalan React component.
- Perbaikan dipilih: pulihkan CSS design system titlebar, bukan refactor komponen besar.
- Fitur tambahan yang masuk: Focus Live Mode untuk memperbesar Program/Preview saat ibadah.

## Scratchpad - 2026-05-08 Broadcast Console

- Renderer perlu terasa seperti switcher video, bukan dashboard admin.
- `SPACE` lebih cocok menjadi `TAKE`; `RIGHT/LEFT` tetap untuk live navigation.
- Cue deck dan live deck harus dipisah di store agar operator aman saat memilih lagu berikutnya.
- Warning monitor tunggal harus muncul di dua tempat: title bar dan live preview.
- Error `Failing CreateMapBlock` saat `npm run dev` dibaca sebagai masalah cache Chromium dev, bukan kegagalan aplikasi.
