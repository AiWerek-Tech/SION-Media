---
title: Plan — Library Immersive Player v6 (Player-First)
phase: implemented
status: done
---

> **Status:** ✅ IMPLEMENTED — Lihat `04-implementation/12-log-impl-library-immersive-player-v6.md`

# Goal

Mengubah pola interaksi **Library Mode** dari _split-pane lyric viewer_ (kanan 400px via `LyricStudioLite` di `LibraryBrowserPanel`) menjadi **Full-Width Immersive Viewer overlay** (100vw/100vh) yang muncul ketika lagu dipilih dari tab **Playlist / Nomor / Judul**, serupa `play.lagusion.org`.

# Current Baseline (as-is)

- `LibraryModeRedesigned.tsx`
  - Merender `LibraryBrowserPanel` sebagai area konten utama.
  - `handleSelectSong(song)` hanya memanggil `useAppStore.setSelectedSong(song)`.
- `LibraryBrowserPanel.tsx`
  - Layout `flex` dua kolom:
    - Kiri: list/grid songs sesuai tab.
    - Kanan: panel detail `w-[400px]` yang merender `LyricStudioLite` saat `selectedSong` ada.
- `useAppStore.ts`
  - Memiliki `selectedSong: Song | null`.
  - Memiliki `isLyricsFullscreen` (dipakai untuk DOM Fullscreen API) tetapi belum ada state untuk overlay immersive.

# Target Architecture (to-be)

## 1) State Orchestration

Tambahkan state baru di `useAppStore`:

- `isLyricsFullscreen: boolean` (tetap ada; sekarang dipakai untuk overlay immersive _UI fullscreen_).
- `setLyricsFullscreen(isFullscreen: boolean)` (tetap ada).

Tambahan/Perubahan:

- `isLyricsFullscreen` akan berarti: **overlay immersive lyrics player sedang terbuka**.
- `selectedSong` tetap menjadi sumber kebenaran lagu yang sedang dilihat.

### State transitions

- **Select song** (dari list/grid/playlist/search palette)
  - `setSelectedSong(song)`
  - `setLyricsFullscreen(true)`
  - Opsional: bersihkan pencarian jika diperlukan untuk menghindari “kembali” dalam state filter yang membingungkan:
    - `setSearchQuery('')`
    - `setActiveFilter('all')` (hanya jika memang dipakai di Library Mode redesigned)
- **Close immersive player**
  - `setLyricsFullscreen(false)`
  - Opsional: `setSelectedSong(null)` (recommended agar library kembali “clean” dan tidak memicu render detail apapun)

### Invariants

- `isLyricsFullscreen === true` mengimplikasikan overlay player terlihat.
- Overlay player hanya merender jika `selectedSong != null`.
- Jika `selectedSong == null`, paksa `isLyricsFullscreen` menjadi `false` (defensive) atau overlay tidak merender.

## 2) Component Overlay Structure

### Global overlay host (Library Mode scope)

Di `LibraryModeRedesigned.tsx`, tambahkan overlay layer di atas `LibraryBrowserPanel`:

- `LibraryBrowserPanel` tetap menjadi background.
- `LibraryLyricsViewer` (refactor) menjadi komponen **fullscreen overlay**.

Struktur render (skema):

- `<div className="... relative">`
  - `<LibraryBrowserPanel ... />`
  - `<AnimatePresence>` - `{isLyricsFullscreen && selectedSong && (
  <LibraryLyricsViewer song={selectedSong} onClose={...} />
)}`
  - `</AnimatePresence>`

Catatan performance:

- Overlay dipasang di level `LibraryModeRedesigned` sehingga `LibraryBrowserPanel` tidak perlu lagi mengandung `LyricStudioLite`.
- Gunakan selector zustand yang minimal agar perubahan `index/fontSize/autoScroll` di overlay tidak memaksa list rerender.

## 3) Refactor Plan per File

### A) `LibraryBrowserPanel.tsx`

- Hapus panel kanan (400px) dan import `LyricStudioLite`.
- Tetap expose `onSelectSong` via store seperti sekarang, tetapi _on select_ juga harus membuka overlay (melalui store):
  - `setSelectedSong(song)`
  - `setLyricsFullscreen(true)`

### B) `LibraryModeRedesigned.tsx`

- Subscribe `selectedSong`, `isLyricsFullscreen`.
- Saat menerima event `sion:select-song` atau dari `LibrarySearchPalette`:
  - set selected
  - set overlay open
- Render overlay `LibraryLyricsViewer` full screen (AnimatePresence) di atas konten.

### C) `LibraryLyricsViewer.tsx` (Total refactor)

Ubah menjadi komponen **Immersive Fullscreen Player**:

#### Component Props

```typescript
{
  song: Song
  onClose: () => void
  onNextSong?: () => void  // Optional: navigate to next song
  onPrevSong?: () => void  // Optional: navigate to previous song
}
```

#### Layout hierarchy

- **Background layer**
  - gradient abstrak + blur / noise halus.
  - optionally: jika ada art/cover di masa depan, fallback ke gradient.
- **Title Bar (Library Mode) - Shows on hover at top edge**
  - Logo "S" dengan gradient
  - Label "SION Media Enterprise • Library Mode"
  - Window controls (minimize, maximize, close)
  - Height: 48px
  - Hover zone: 30px from top edge
  - Animation: slide from -20px to 0px with fade
  - Pointer events controlled for proper interaction
- **Top Bar (Lyric Display) - Always visible**
  - Left: Back button (arrow icon), divider, song number (angka saja)
  - Center: Song title + English title (alternate_title/title_en/hymnal_name)
  - Right: Key, Tempo, Composer, Category metadata
  - Height: 64px
  - Position: top-[48px] (below title bar)
- **Center**
  - stanza page (satu bait per layar)
  - tipografi besar + line-height nyaman.
  - Max width: 1200px
  - Top padding: 13vh (adjusted for title + top bar)
- **Right navigation**
  - vertical dot navigation sesuai jumlah pages.
  - Fraction labels (1/4, 2/4, etc.)
  - Auto-hide with idle timer
- **Bottom Footer Bar - Song Navigation**
  - Previous Song button (arrow up icon)
  - Play/Pause Auto Slide button (music/square icon)
  - Next Song button (arrow right icon)
  - Floating at bottom-8 with auto-hide
  - Glassmorphism styling with backdrop blur

#### Animation spec (Framer Motion)

- Mount (enter): `scale-up + fade-in`
  - `initial: { opacity: 0, scale: 0.98 }`
  - `animate: { opacity: 1, scale: 1 }`
- Unmount (exit): `slide-down + fade-out`
  - `exit: { opacity: 0, y: 24 }`
- Transition:
  - duration `0.4`
  - ease `[0.22, 1, 0.36, 1]`

#### Keyboard behaviors

- `Escape`: close overlay.
- `ArrowDown` / `PageDown`: next stanza.
- `ArrowUp` / `PageUp`: prev stanza.
- `Space`: toggle auto-scroll Play/Pause.

#### Pagination logic (stanza-based)

- Gunakan `buildStanzaPages()` yang sudah ada (dipakai versi lama) sebagai basis.
- One page == one stanza (atau stanza + chorus jika parser mendukung; jika tidak, keep stanza-only terlebih dahulu).
- Dot navigation memetakan `index` (0..pages-1).

#### Responsive typography

- Simpan `fontSize` (14..48) di localStorage.
- Optional auto-scaling:
  - `clamp(18px, 2.4vw, 44px)` sebagai baseline, lalu dikalikan faktor slider.

#### Auto-scroll

- Menggunakan `requestAnimationFrame` untuk smooth scrolling (bukan `setInterval`)
- Scroll container di-reset ke atas ketika index berubah
- Toggle dengan keyboard `Space` atau tombol Play di bottom footer bar
- State `autoScroll` disimpan di component state

#### Empty lyrics state

- Jika `song.lyrics_raw` kosong:
  - tampilkan empty state yang artistik (headline + subtext + CTA “Edit/Sync lyrics” jika ada action).

## 4) Title Bar / Immersive Mode

Kebutuhan: “mengunci/menyembunyikan Menu Title Bar kecuali window controls”.

**Implementasi Terkini (v6.1):**

- **Title Bar (Library Mode)** - Bar terpisah yang hanya muncul saat hover di area atas (30px dari edge)
  - Menampilkan logo "S" dengan gradient
  - Label "SION Media Enterprise • Library Mode"
  - Window controls (minimize, maximize, close)
  - Height: 48px
  - Animasi slide dari -20px ke 0px dengan fade
  - Pointer events dikontrol untuk interaksi yang proper
  - Z-index: 30 (di atas semua elemen lain)

- **Top Bar (Penampil Lirik)** - Bar khusus konten lirik yang selalu tampil
  - Left: Tombol back (icon panah kiri), divider, nomor lagu (angka saja)
  - Center: Judul lagu + judul bahasa Inggris
  - Right: Key, Tempo, Composer, Category metadata
  - Height: 64px
  - Position: top-[48px] (di bawah title bar)
  - Z-index: 20

- **Bottom Footer Bar** - Bar navigasi lagu yang floating di bawah
  - Previous Song button (icon panah kiri atas)
  - Play/Pause Auto Slide button (icon musik/kotak)
  - Next Song button (icon panah kanan)
  - Floating di bottom-8 dengan auto-hide
  - Glassmorphism styling dengan backdrop blur
  - Z-index: 20

Plan implementasi (bertahap):

- **Phase v6**: overlay menutup seluruh viewport renderer (`fixed inset-0`) sehingga secara visual _clean_.
- **Phase v6.1**: implementasi title bar terpisah yang show/hide pada hover, top bar selalu tampil, dan bottom footer bar untuk navigasi lagu.
- Jika aplikasi punya IPC untuk toggle menu/titlebar, tambahkan hook di overlay open/close:
  - on open: `window.api?.window?.setImmersiveMode?.(true)`
  - on close: `...false`

Catatan: langkah IPC ini hanya dilakukan jika API sudah tersedia. Jika belum ada, overlay tetap memenuhi kriteria UX di area content.

# Risks / Edge Cases

- `selectedSong` bisa berubah ketika overlay sudah terbuka (mis. user klik lagu lain cepat):
  - overlay harus update content tanpa flicker (gunakan `key={selectedSong.id}` untuk stanza index reset + animate crossfade ringan jika perlu).
- Dot navigation panjang (pages banyak):
  - perlu scrollable dot rail atau minified dots.
- Prevent background scroll & focus trap:
  - set `document.body.style.overflow='hidden'` saat overlay open (cleanup on close).

# Implementation Checklist (Phase 1)

- Update store semantics untuk `isLyricsFullscreen` sebagai overlay state.
- `LibraryBrowserPanel`: hapus split-pane, onSelectSong buka overlay.
- `LibraryModeRedesigned`: render `LibraryLyricsViewer` via AnimatePresence.
- Refactor `LibraryLyricsViewer` jadi overlay immersive player.
- Pastikan keyboard nav stabil & tidak konflik dengan search palette.

# Implementation Checklist (Phase 1.1 - UI Refinements)

- Implementasi Title Bar (Library Mode) yang show/hide pada hover di area atas (30px dari edge)
- Implementasi Top Bar (Penampil Lirik) yang selalu tampil dengan:
  - Left: Back button, divider, song number
  - Center: Song title + English title
  - Right: Key, Tempo, Composer, Category metadata
- Implementasi Bottom Footer Bar untuk navigasi lagu:
  - Previous Song button
  - Play/Pause Auto Slide button
  - Next Song button
- Tambahkan props `onNextSong` dan `onPrevSong` untuk navigasi lagu
- Perbaiki auto-scroll dengan `requestAnimationFrame` (bukan `setInterval`)
- Tambahkan `isMounted` check untuk cleanup yang proper
- Perbaiki font size parsing dengan NaN check
- Adjust lyric area padding untuk mengakomodasi title bar + top bar (13vh)

# Acceptance Mapping

- (1) Klik lagu dari mana saja membuka overlay: achieved via store open on selection.
- (2) Tidak ada split: achieved by removing right panel in `LibraryBrowserPanel`.
- (3) Transisi halus: achieved via AnimatePresence spec.
- (4) Metadata presisi: render header metadata fields.
- (5) Keyboard stable: single keydown handler in overlay (active only when open).
