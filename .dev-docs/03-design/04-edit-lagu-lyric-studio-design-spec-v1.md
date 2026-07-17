# Design Spec — Edit Lagu (Professional Lyric Studio)

> **Status:** ✅ IMPLEMENTED — SongEditorScreen sudah diimplementasikan sesuai spec ini.

**Product**: SION Media (Electron Desktop)

**Scope**: Halaman **Edit Lagu** / **SongEditorScreen**

**Design Vibe**:

- 70% **Linear / Arc**: premium modern desktop app, clean, spacious, layered surfaces
- 30% **ProPresenter**: workflow AV/worship (slide strip + live preview + operator context)

**Non-goals (v1)**:

- Resizable panels
- Rebuild total design system
- Perubahan arsitektur state/engine

---

## 1. Design Principles

### 1.1 Clean + Premium

- Minim “admin dashboard feel”
- Minim “gaming UI”
- Mengutamakan whitespace, rhythm, dan readability

### 1.2 Layering over Borders

Kurangi border 60–70%.

Ganti dengan:

- perbedaan background surface (contrast halus)
- elevation (shadow lembut)
- blur/opacity layer (glass ringan)

### 1.3 Typography Hierarchy jelas

Hierarki visual wajib terasa dari jarak pandang normal.

Target sistem typography (Tailwind) untuk halaman editor:

- **Page Title**
  - size: 28–32px
  - weight: 700
- **Section Title**
  - size: 18–20px
  - weight: 600
- **Label**
  - size: 11–12px
  - weight: 600
  - uppercase _hanya untuk badge/indicator kecil_, bukan semua heading
- **Input Text**
  - size: 14–15px
  - weight: 500
- **Secondary Text**
  - size: 12–13px
  - weight: 400

### 1.4 Spacing System (8pt grid)

- Panel padding: 24px
- Antar input: 16px
- Antar section: 28–36px
- Toolbar height: 56–64px

---

## 2. Layout Model

3 kolom tetap dipertahankan karena sudah sesuai workflow:

1. **Song Details / Metadata + Lyrics Editor**
2. **Slide Strip**
3. **Live Preview (16:9) + Info**

Tujuan: panel terasa lapang, tidak “padat”, dan jelas hierarchy-nya.

---

## 3. Component Spec

### 3.1 Header / Topbar

**Goals**:

- Lebih “workspace aware”
- Lebih premium (tidak sekadar bar + border)

**Elements**:

- Back button
- Page title
- Context subtitle (hymnal code + number + title)
- Status chips:
  - warnings (baris panjang)
  - duplicate
  - dirty state
- Primary actions:
  - Cancel
  - Save

**Visual**:

- Border bottom sangat subtle atau diganti shadow halus
- Background layered (semi-transparent) + blur ringan

### 3.2 Left Panel — Card-based Metadata Sections

Panel kiri harus terasa seperti **creative workspace**, bukan form admin.

**Section cards** (v1):

- Informasi Dasar
  - Hymnal
  - Number
  - Title
  - Alternate title
  - Category
- Musik
  - Key Note
  - Time Signature
  - Tempo

**Card style guidelines**:

- `bg-white/5`
- `border border-white/10` (subtle)
- `rounded-2xl`
- `shadow-[0_10px_40px_rgba(0,0,0,0.35)]` (optional, use sparingly)

**Input style guidelines**:

- Height 44–48px
- Surface semi-transparent
- Focus state glow halus

Suggested Tailwind token:

```
bg-white/5
border border-white/10
focus:border-blue-500/50
focus:ring-4
focus:ring-blue-500/10
rounded-xl
transition
```

### 3.3 Lyrics Editor

**Goals**:

- Editor terasa “studio”
- Toolbar terasa seperti tool palette modern

**Rules**:

- Toolbar surface lebih halus (kurangi border)
- Buttons memiliki hover/active microinteraction (120–220ms)
- Textarea readability:
  - line-height nyaman
  - font mono tetap ok, tapi ukuran tidak terlalu kecil

### 3.4 Slide Strip

**Goals**:

- Terasa seperti editor profesional
- Thumbnail punya “timeline feeling”

**Spec**:

- Thumbnail 16:9 mini
- Slide number visible
- Active state:
  - subtle glow
  - slightly scaled
- Hover:
  - opacity naik
  - background zoom halus

### 3.5 Live Preview

**Goals**:

- Terasa seperti output proyektor sungguhan
- Ada context overlay (LIVE OUTPUT, 16:9, resolution)

**Spec**:

- Monitor frame + subtle vignette
- Overlay badges:
  - `LIVE OUTPUT`
  - `1920×1080`
  - `16:9`
- Typography preview besar, readable
- Metadata overlay (Nada/Birama/Tempo) tetap ditampilkan sebagai pill badges

---

## 4. Interaction Spec

### 4.1 Microinteractions

- Hover: 120–220ms
- Active press: scale ringan
- Focus ring: glow halus

### 4.2 Dirty State

- Badge "Belum Disimpan" jelas
- Exit confirmation dialog tetap dipertahankan

---

## 5. Implementation Priorities (v1)

1. Typography hierarchy
2. Spacing & breathing room
3. Card-based sections
4. Border reduction
5. Better slide strip
6. Live preview polish
7. Smooth microinteraction

---

## 6. Rollout Strategy

- Implement v1 hanya untuk `SongEditorScreen`
- Setelah stabil, extract reusable tokens/components untuk modul lain (Lagu, Alkitab, Renungan, Presentasi)
