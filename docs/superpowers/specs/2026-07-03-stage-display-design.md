# Stage Display Production Design

Stage Display tetap menjadi confidence monitor yang mengutamakan keterbacaan pemusik, pemimpin ibadah, dan pengkhotbah. Konten aktif harus dominan tetapi tidak boleh terpotong; konten berikutnya tetap terlihat tanpa mengambil ruang utama.

## Tampilan

- Header ringkas berisi jam, timer ibadah, dan status `LIVE`, `FREEZE`, `BLACK`, atau `STANDBY`.
- Konten aktif menggunakan tipografi responsif berdasarkan panjang teks dan jumlah baris.
- Lagu memakai identitas musik dan nama bagian. Alkitab memakai identitas buku, referensi, versi, nomor ayat yang bersih, dan footer khusus Alkitab.
- Progress slide ditampilkan sebagai angka dan progress bar.
- Area berikutnya memakai label yang jelas serta pratinjau maksimal beberapa baris.
- Slide terakhir memiliki status yang mudah dipahami.
- Empty state tidak menampilkan pesan lagu ketika konten aktif adalah Alkitab.

## Perilaku

Payload confidence membawa `contentType`, referensi, versi, dan copyright secara eksplisit. Renderer tetap kompatibel dengan channel IPC lama dan memiliki fallback aman. Tidak ada kontrol mutasi di Stage Display.

## Verifikasi

Tes mencakup metadata Alkitab, penghilangan nomor ayat mentah, auto-fit panjang, metadata lagu, progress, NEXT, status runtime, serta fallback kosong.
