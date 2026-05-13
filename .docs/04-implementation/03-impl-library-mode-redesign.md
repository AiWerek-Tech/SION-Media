# Library Mode UI/UX Redesign Implementation

**Date:** 2026-05-09
**Status:** Completed
**Target:** Personal Use, Musician Practice, Congregational Use
**Inspiration:** play.lagusion.org (Lagu Sion Web UI)

## Overview

Redesign Library Mode frontend untuk SION Media, terinspirasi dari desain web Lagu Sion (play.lagusion.org) dengan peningkatan premium untuk desktop.

**Elemen dari Web UI yang Diterapkan:**

- Sidebar buku lagu dengan icon unik dan statistik (jumlah lagu, diputar)
- Grid nomor dengan hover preview card (judul + lirik preview)
- Search bar "Tulis judul, lirik, no" dengan toggle grid/list view
- Tab layout: Playlist / Nomor / Judul dengan active tab berwarna
- Section "Terakhir Dibuka / Terakhir Diputar" di sidebar
- Number pad modal untuk pencarian cepat

**Peningkatan di atas Web UI:**

- Warna aksen unik per hymnal koleksi
- FTS5 full-text search dengan highlighting
- Auto-scroll dan font-size slider di lyric viewer
- Linked songs dari hymnal/bahasa lain
- Keyboard-first navigation
- Badge "LIRIK KOSONG" untuk lagu tanpa lirik
- Premium empty states

## Components Created

### 1. MultiHymnalSidebar

**File:** `src/renderer/src/components/library/MultiHymnalSidebar.tsx`

**Features:**

- Sidebar koleksi buku lagu dengan badge per-hymnal
- Icon unik per koleksi (Guitar, BookOpen, Heart, Sun, Globe, Crown)
- Warna aksen unik per koleksi (menggunakan `getHymnalColor()`)
- Header card hymnal aktif dengan icon besar dan statistik (🔊 jumlah, 🎵 jumlah)
- Statistik per buku: jumlah lagu, diputar
- Search bar "Tulis judul, lirik, no" dengan toggle grid/list view
- Section "Terakhir Dibuka / Terakhir Diputar" dengan list lagu terbaru
- Default selection: Lagu Sion Edisi Lengkap (LS)
- Tidak ada opsi "Semua Buku" (sesuai requirement)

**Key Implementation:**

```tsx
// Hymnal color mapping
const HYMNAL_COLORS: Record<string, string> = {
  LS: 'hsl(215, 72%, 56%)', // Royal Blue
  SDAH: 'hsl(270, 60%, 58%)', // Amethyst Purple
  PK: 'hsl(340, 65%, 55%)' // Rose Pink
  // ... etc
}
```

### 2. LibrarySearchPalette

**File:** `src/renderer/src/components/library/LibrarySearchPalette.tsx`

**Features:**

- "Search Everywhere" bar dengan trigger Ctrl+K
- Pencarian simultan: nomor, judul (ID/EN), lirik, tag via FTS5
- Number pad (0-9) untuk input cepat berdasarkan nomor
- Highlight hasil pencarian dengan FTS5
- Keyboard navigation (↑↓ Enter)
- Recent searches disimpan di localStorage

**Search Modes:**

- Semua (default)
- Nomor
- Judul
- Lirik
- Tag

### 3. HighDensitySongGrid

**File:** `src/renderer/src/components/library/HighDensitySongGrid.tsx`

**Features:**

- Grid kartu lagu compact dengan virtual scrolling
- Metadata ditampilkan: Number (LS), Title (ID), Title (EN), Key, Tempo
- Action buttons: Favorite, Add to Playlist
- Opacity affordance: 20% idle, 100% on hover/focus
- Badge "LIRIK KOSONG" untuk lagu tanpa lirik
- Premium empty state dengan filter suggestions

**Note:** Komponen ini dibuat namun tidak digunakan di LibraryMode final karena user mempertahankan tampilan tab-based (Nomor/Judul/Playlist).

### 4. LyricStudioLite

**File:** `src/renderer/src/components/library/LyricStudioLite.tsx`

**Features:**

- Area tampilan lirik dengan auto-scroll
- Font-size slider (14px - 48px)
- Toggle fullscreen (F11)
- Display linked songs dari hymnal/bahasa lain
- Keyboard shortcuts: Space (play/pause auto-scroll), +/- (font size)
- Parsing lirik dengan block labels (Reff, Verse, etc.)

### 5. LibraryNumberView (Updated)

**File:** `src/renderer/src/components/library/LibraryNumberView.tsx`

**Features Updated:**

- Rich hover preview card saat hover pada cell grid nomor
- Preview card menampilkan: header dengan hymnal accent color, icon Music, nomor badge
- Judul lagu, alternate title, dan preview lirik (2 baris pertama)
- Metadata chips: key_note, tempo
- Z-index tinggi agar tidak terpotong oleh container

### 6. LibraryTitleView (Updated)

**File:** `src/renderer/src/components/library/LibraryTitleView.tsx`

**Features Updated:**

- Number badge dengan warna aksen hymnal (bukan generic badge)
- Background dan border badge menggunakan `getHymnalColor()`
- Warna teks nomor sesuai hymnal accent
- Font mono dan bold untuk nomor

### 7. LibraryBrowserPanel (Updated)

**File:** `src/renderer/src/components/library/LibraryBrowserPanel.tsx`

**Features Updated:**

- Tab styling lebih mirip web Lagu Sion dengan warna oranye/merah aktif
- Tab order: Playlist | Nomor | Judul
- Active tab menggunakan warna `hsl(12, 85%, 55%)` (oranye merah)
- Stats badge di pojok kanan atas tabs

### 8. LibraryModeRedesigned

**File:** `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`

**Features:**

- Integrasi semua komponen baru
- Top Command Bar dengan search button dan theme toggle
- Multi-Hymnal Sidebar di kiri
- Tab-based content (Nomor, Judul, Playlist) - mempertahankan struktur sebelumnya
- Search Palette overlay
- Lyric Studio Lite overlay

### 9. LibraryLyricsViewer (Fullscreen Immersive Player)

**File:** `src/renderer/src/components/library/LibraryLyricsViewer.tsx`

**Features:**

- Fullscreen immersive lyric viewer overlay
- **Title Bar (Library Mode)** - Shows on hover at top edge (30px from edge)
  - Logo "S" dengan gradient
  - Label "SION Media Enterprise • Library Mode"
  - Window controls (minimize, maximize, close)
  - Height: 48px
  - Animasi slide dari -20px ke 0px dengan fade
  - Pointer events dikontrol untuk interaksi yang proper
  - Z-index: 30
- **Top Bar (Penampil Lirik)** - Always visible
  - Left: Back button (arrow icon), divider, song number (angka saja)
  - Center: Song title + English title (alternate_title/title_en/hymnal_name)
  - Right: Key, Tempo, Composer, Category metadata
  - Height: 64px
  - Position: top-[48px] (di bawah title bar)
  - Z-index: 20
- **Bottom Footer Bar** - Song navigation
  - Previous Song button (arrow up icon)
  - Play/Pause Auto Slide button (music/square icon)
  - Next Song button (arrow right icon)
  - Floating di bottom-8 dengan auto-hide
  - Glassmorphism styling dengan backdrop blur
  - Z-index: 20
- **Lyric Area**
  - Stanza-based pagination (satu bait per layar)
  - Tipografi besar dengan line-height nyaman
  - Max width: 1200px
  - Top padding: 13vh (adjusted for title + top bar)
- **Right Navigation**
  - Vertical dot navigation sesuai jumlah pages
  - Fraction labels (1/4, 2/4, etc.)
  - Auto-hide dengan idle timer
- **Auto-scroll**
  - Menggunakan `requestAnimationFrame` untuk smooth scrolling
  - Toggle dengan keyboard `Space` atau tombol Play di bottom footer bar
- **Keyboard Navigation**
  - Escape: close overlay
  - ArrowDown / PageDown: next stanza
  - ArrowUp / PageUp: prev stanza
  - Space: toggle auto-scroll
  - Home: first stanza
  - End: last stanza
  - +/-: adjust font size
- **Component Props**
  - `song: Song` - lagu yang ditampilkan
  - `onClose: () => void` - callback untuk menutup viewer
  - `onNextSong?: () => void` - optional callback untuk navigasi ke lagu berikutnya
  - `onPrevSong?: () => void` - optional callback untuk navigasi ke lagu sebelumnya

**Implementation Details:**

- Font size parsing dengan NaN check untuk robustness
- `isMounted` check untuk cleanup yang proper di useEffect
- Hover zone untuk title bar: 30px dari top edge
- Idle timer untuk auto-hide UI elements (2.5 seconds)
- Cinematic background dengan volumetric light effects dan particle motion
- Verse fraction labels di slide indicators dan floating verse label di atas lirik

## Keyboard Navigation

| Shortcut | Action                               |
| -------- | ------------------------------------ |
| Ctrl+K   | Buka Search Palette                  |
| ↑↓       | Navigasi hasil pencarian / grid      |
| ←→       | Navigasi horizontal di grid          |
| Enter    | Buka lagu / pilih                    |
| Escape   | Tutup palette / lyric viewer         |
| Space    | Toggle auto-scroll (di lyric viewer) |
| +/-      | Ubah font size (di lyric viewer)     |
| F11      | Toggle fullscreen (di lyric viewer)  |

## Edge Cases Handled

### No Results

- Empty state premium dengan ikon dan pesan
- Saran untuk mencoba kata kunci lain

### Missing Lyrics

- Badge merah "LIRIK KOSONG" di song cards
- Pesan informatif di lyric viewer

## Performance Optimizations

1. **Virtual Scrolling** - Menggunakan `@tanstack/react-virtual` untuk grid/list dengan ratusan lagu
2. **Debounced Search** - 150ms delay untuk menghindari excessive API calls
3. **FTS5 Full-Text Search** - SQLite FTS5 untuk pencarian cepat <100ms
4. **Framer Motion** - Transisi smooth 0.4s dengan easing `[0.16, 1, 0.3, 1]`

## File Structure

```
src/renderer/src/
├── components/library/
│   ├── MultiHymnalSidebar.tsx      (NEW - sidebar with icons, stats, recent, search)
│   ├── LibrarySearchPalette.tsx     (NEW - Ctrl+K search with number pad)
│   ├── HighDensitySongGrid.tsx      (NEW - not used in final)
│   ├── LyricStudioLite.tsx          (NEW - lyric viewer with auto-scroll)
│   ├── LibraryBrowserPanel.tsx      (MODIFIED - tabs + LyricStudioLite)
│   ├── LibraryNumberView.tsx        (MODIFIED - rich hover preview card)
│   ├── LibraryTitleView.tsx         (MODIFIED - hymnal-colored badges)
│   └── LibraryPlaylistWorkspace.tsx (EXISTING)
├── screens/modes/
│   ├── LibraryModeRedesigned.tsx    (NEW - main entry with web-inspired layout)
│   └── LibraryMode.tsx              (EXISTING - backup)
├── utils/
│   └── hymnal-colors.ts             (EXISTING - used for accent colors)
└── App.tsx                          (MODIFIED - import LibraryModeRedesigned)
```

## Validation Results

- **TypeScript:** ✅ Pass (`npm run typecheck`)
- **ESLint:** ✅ Pass with 0 warnings (`npm run lint`)
- **Build:** ✅ Pass (`npm run build`)

## Code Quality Fixes

- Removed duplicate `LyricStudioLite` render (was in both `LibraryModeRedesigned` and `LibraryBrowserPanel`)
- Fixed `useCallback` dependencies for `handleSelect` in `LibrarySearchPalette`
- Fixed `useCallback` dependencies for `toggleFullscreen` in `LyricStudioLite`
- Removed unused imports (`AnimatePresence` from `LibraryModeRedesigned`)
- All exhaustive-deps warnings resolved

## Future Enhancements

1. **Study Mode** - Fitur untuk mempelajari lagu dengan chord display
2. **Transposition** - Ubah key note secara dinamis
3. **Setlist Builder** - Buat setlist dari koleksi lagu
4. **Print Export** - Export lirik ke PDF/Print

## Notes

- User memilih untuk mempertahankan tampilan tab-based (Nomor, Judul, Playlist) daripada grid view baru
- HighDensitySongGrid tetap dibuat untuk penggunaan masa depan
- Semua komponen mengikuti prinsip offline-first (tidak ada external API dependencies)

## Production-Ready Checklist

### Code Quality

- [x] TypeScript: 0 errors
- [x] ESLint: 0 warnings
- [x] Build: Success
- [x] No TODO/FIXME comments left
- [x] No console.log/debug statements
- [x] No duplicate code or functions
- [x] All useCallback dependencies correct
- [x] All useEffect dependencies correct

### Components Status

- [x] `LibraryModeRedesigned` - Main entry, clean imports
- [x] `MultiHymnalSidebar` - Icons, stats, search, recent songs
- [x] `LibraryBrowserPanel` - Tabs, LyricStudioLite integration
- [x] `LibraryNumberView` - Virtualized grid, hover preview
- [x] `LibraryTitleView` - Hymnal-colored badges
- [x] `LibrarySearchPalette` - FTS5 search, number pad
- [x] `LyricStudioLite` - Auto-scroll, linked songs

### Features Verified

- [x] Keyboard navigation (Ctrl+K, arrows, Enter, Escape)
- [x] Theme toggle (dark/light)
- [x] Focus mode toggle
- [x] Hymnal selection with accent colors
- [x] Song selection from sidebar recent list
- [x] Tab switching (Playlist/Nomor/Judul)
- [x] Lyric viewer with auto-scroll
- [x] Linked songs display
- [x] Fullscreen mode (F11)

### Desktop App Considerations

- [x] No web-specific APIs used
- [x] localStorage for preferences (theme, font size, recent searches)
- [x] Custom DOM events for inter-component communication
- [x] Electron IPC for database operations
- [x] Native fullscreen API
