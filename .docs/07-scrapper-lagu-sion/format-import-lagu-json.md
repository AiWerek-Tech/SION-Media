## Struktur File JSON yang Bisa Di‑Import SION Media (Enterprise Standard)

File yang di‑import **wajib** berupa **array JSON** (top-level `[]`), di mana setiap elemen adalah 1 objek lagu.

### 1) Skema (Field yang Didukung)

#### Field wajib
- **`number`**: `string`  
  - Contoh: `"1"`, `"001"`, `"100A"`  
  - Catatan: kalau digit-only seperti `"001"`, sistem akan normalisasi menjadi `"1"`.
- **`title`**: `string`
- **`lyrics_raw`**: `string`  
  - Gunakan `\n` untuk baris baru, dan `\n\n` untuk pemisah bait.
  - Tag stanza seperti `[VERSE]`, `[CHORUS]`, dll dianjurkan.
- **`hymnal_id`**: `number` *(boleh tidak ada per item)*  
  - Jika ada item yang **tidak punya `hymnal_id`**, operator harus memilih **Default Hymnal** di Wizard.
  - Jika `hymnal_id` tidak ditemukan di database, akan diminta mapping ke hymnal yang tersedia.

#### Field metadata (opsional, tapi didukung penuh)
- **`alternate_title`**: `string` (English / alternatif)
- **`author`**: `string`
- **`composer`**: `string`
- **`key_note`**: `string` (contoh `"D"`, `"Ab"`)
- **`time_signature`**: `string` (contoh `"4/4"`)
- **`tempo`**: `number | string` (contoh `100` atau `"100"`)
- **`category`**: `string`
- **`tags`**: `string` (comma-separated)

---

## 2) Contoh File JSON (SIAP IMPORT)

Simpan sebagai misalnya: `songs-import.json`

```json
[
  {
    "hymnal_id": 1,
    "number": "001",
    "title": "Di Hadapan Hadirat-Mu",
    "alternate_title": "Before Jehovah's Awful Throne",
    "author": "Isaac Watts",
    "composer": "John Hatton",
    "key_note": "D",
    "time_signature": "4/4",
    "tempo": 100,
    "category": "Pujian",
    "lyrics_raw": "[VERSE]\nDi hadapan hadirat-Mu\nKami umat-Mu menyembah\nMengakui Engkau Tuhan\nAllah kekal, Maha kuasa.\n\n[CHORUS]\nSembah sujud, puji Dia\nSelamanya.",
    "tags": "pembukaan, agung"
  },
  {
    "hymnal_id": 1,
    "number": "100A",
    "title": "Kasih Surga Yang Terindah",
    "alternate_title": "Love Divine",
    "author": "Charles Wesley",
    "composer": "John Zundel",
    "key_note": "Ab",
    "time_signature": "4/4",
    "tempo": 90,
    "category": "Kasih Allah",
    "lyrics_raw": "[VERSE]\nKasih Surga yang terindah\nTurunlah pada kami\nDalam kami bertakhtalah\nDan sucikanlah hati.",
    "tags": "kasih, penyerahan"
  },
  {
    "number": "5",
    "title": "Contoh Tanpa hymnal_id",
    "lyrics_raw": "[VERSE]\nIni contoh item tanpa hymnal_id.\n\n[CHORUS]\nNanti operator pilih Default Hymnal di Wizard.",
    "category": "Contoh"
  }
]
```

---

## 3) Catatan Penting Agar Import Lancar

- **Ukuran file maksimal**: 10MB.
- **Top-level harus array**: bukan `{ "songs": [...] }`.
- **Nomor lagu**:
  - `"001"` otomatis jadi `"1"` (digit-only).
  - `"100A"` tetap `"100A"` (tidak akan dipotong nol/diubah aneh-aneh).
- **Konflik data** (nomor lagu sudah ada di hymnal yang sama):
  - Wizard akan mendeteksi konflik berbasis `(hymnal_id, number)` lalu kamu pilih:
    - `SKIP`, `OVERWRITE`, atau `APPEND`.

Kalau kamu mau, aku bisa tambahkan bagian ini juga ke [/.docs/log-impl-json-import-v11.md](cci:7://file:///d:/my_dev/SION-Media/.docs/log-impl-json-import-v11.md:0:0-0:0) supaya dokumentasi internalnya lengkap dan konsisten.