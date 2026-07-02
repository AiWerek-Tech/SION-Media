## 📋 **KONSEP LYRICS ZOOM CONTROL**

> **Status:** ✅ IMPLEMENTED — `LyricsZoomControl.tsx` ada di `src/renderer/src/components/projection/LyricsZoomControl.tsx` dan sudah dipasang di `LivePreviewPanel.tsx`

### **1️⃣ KOMPONEN UI**

```
┌─────────────────────────────────────────────────────────┐
│  PROJECTION MODE TOOLBAR                          [A- 100% A+]  ◄─── Kontrol Zoom
├─────────────────────────────────────────────────────────┤
│  PREVIEW                               │ PROGRAM        │
│  (Tampil Lirik dengan 100% ukuran)   │ (Sama ukuran)  │
│                                        │                │
│  [Verse 1]                             │ [Verse 1]     │
│  Amazing grace how sweet...            │ Amazing grace │
│  ...                                    │ ...            │
└─────────────────────────────────────────────────────────┘
```

**Lokasi Kontrol:** Di toolbar atas, sebelah kanan (mirip placement audio panel)

### **2️⃣ FITUR KONTROL**

| Elemen        | Fungsi                        | Trigger               |
| ------------- | ----------------------------- | --------------------- |
| **A- Button** | Perkecil lirik -10%           | Click atau Ctrl+Minus |
| **Slider**    | Drag untuk set zoom 70-150%   | Mouse drag            |
| **% Display** | Tampil ukuran sekarang (100%) | Real-time             |
| **A+ Button** | Perbesar lirik +10%           | Click atau Ctrl+Plus  |
| **Reset**     | Kembali ke 100%               | Ctrl+0                |

### **3️⃣ STATE MANAGEMENT (Zustand)**

```typescript
interface ProjectionStore {
  // ... existing states

  // Lyrics Zoom
  lyricsFontSizePercent: number // 70-150, default 100
  setLyricsFontSize: (percent: number) => void
  increaseLyricsFontSize: () => void // +10%
  decreaseLyricsFontSize: () => void // -10%
  resetLyricsFontSize: () => void // back to 100%
}
```

### **4️⃣ IMPLEMENTASI TEKNIS**

**A. State Persistence**

- Global preference disimpan di Zustand store
- Tidak tied ke specific lagu (berlaku global untuk semua lagu)
- Optional: bisa localStorage untuk persist antar session

**B. CSS Application**

```css
/* Applied ke lyrics container di Preview dan Live */
.lyrics-display {
  transform: scale(var(--lyrics-zoom)); /* --lyrics-zoom: 1.0 (100%) */
  transform-origin: top left;
  transition: transform 0.2s ease-in-out;
}
```

**C. Keyboard Shortcuts**

```
Ctrl++ (Plus)  → setLyricsFontSize(current + 10)
Ctrl+- (Minus) → setLyricsFontSize(current - 10)
Ctrl+0 (Zero)  → setLyricsFontSize(100)
```

### **5️⃣ SINKRONISASI PREVIEW ← → LIVE**

- **Auto-sync**: Kedua screen selalu gunakan `lyricsFontSizePercent` yang sama
- **Why**: Operatorakan lihat di Preview apa yang akan ditampil di Live
- **No deviation**: Ukuran never berbeda antara preview vs live

### **6️⃣ USER FLOW**

```
Operator membuka Projection Mode
    ↓
Lirik ditampilkan dengan ukuran default (100%)
    ↓
Jika teks kecil:
  • Klik A+ button (atau Ctrl++) → lirik naik ke 110%
  • Atau drag slider ke kanan → ubah ke 130%
    ↓
Preview dan Live sama-sama berubah ukuran secara real-time
    ↓
Jika terlalu besar:
  • Klik A- button (atau Ctrl--) → turun 10%
    ↓
Settings tersimpan global untuk session ini
```

### **7️⃣ VISUAL MOCKUP KONTROL**

```
┌─────────────────────────────────┐
│ A- │[━━━━━━●━━━━━━]│ 100% │ A+ │  ◄─ Zoom control group
└─────────────────────────────────┘
 ▲    ▲                    ▲      ▲
 │    │                    │      └─ Increment button
 │    │                    └─ Persentase display
 │    └─ Slider dengan thumb
 └─ Decrement button
```

---

## ✅ **BENEFITS KONSEP INI:**

✨ **Fleksibel** - Operator bisa adjust ukuran sesuai ruangan/kondisi matanya  
⚡ **Real-time** - Perubahan langsung terlihat di Preview dan Live  
🎯 **Intuitif** - A+/A- mudah dimengerti, mirip ukuran font di aplikasi lain  
⌨️ **Power User** - Keyboard shortcuts untuk operator yang gesit  
💾 **Konsisten** - Satu setting global, tidak kebingungan per-lagu  
🚀 **Performance** - CSS transform lebih efficient daripada mengubah font-size

---

## 🤔 **PERTANYAAN KONFIRMASI:**

1. **Apakah ini sesuai dengan visi Anda?**
2. **Ada yang ingin dimodifikasi atau ditambahkan?**
3. **Siap untuk mulai implementasi, atau ada detail lain yang perlu didiskusikan?**

Mari saya tahu feedback Anda sebelum kita mulai coding! 🚀
