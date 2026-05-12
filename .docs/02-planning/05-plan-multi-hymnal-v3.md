# Rencana Implementasi Multi-Hymnal UI/UX V3

**Objective:** Meningkatkan modul Multi-Hymnal menjadi level "Premium Desktop App" bergaya broadcast console (vMix/ProPresenter) dengan global search, navigasi koleksi intuitif, dan playlist campuran yang stabil.

**Tanggal:** 2026-05-08

---

## Analisis Status Terkini

### Apa yang Sudah Ada (Baseline)

| Komponen                                   | Status       | Catatan                                                                                                   |
| ------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------- |
| `SongLibraryPanel.tsx`                     | ✅ Ada       | Hymnal sidebar (w=16, icon-only), search bar, filter tabs, virtualized list via `@tanstack/react-virtual` |
| `SongCard.tsx`                             | ✅ Ada       | Hymnal badge, zebra striping, action affordance (20%/100% opacity), metadata (key, tempo)                 |
| `PlaylistPanel.tsx`                        | ✅ Ada       | DnD via `@dnd-kit`, drag handles, export JSON, empty states                                               |
| `PlaylistItemCard.tsx`                     | ✅ Ada       | Section labels (sudah ada inline edit), hymnal badge, slide count, live indicator                         |
| `useProjectionStore.ts`                    | ✅ Ada       | CUE/PROGRAM deck separation, TAKE workflow, hotSwap                                                       |
| `useAppStore.ts`                           | ✅ Ada       | `hymnals`, `selectedHymnalId`, `loadHymnals`, `searchSongs`                                               |
| `framer-motion`                            | ✅ Installed | v12.38.0 — tersedia tapi belum dipakai di panel management                                                |
| `@tanstack/react-virtual`                  | ✅ Installed | Sudah aktif di SongLibraryPanel                                                                           |
| `@fontsource/inter`, `@fontsource/poppins` | ✅ Installed | Sudah di-load lokal                                                                                       |

### Gap yang Perlu Diisi

| Kebutuhan                                           | Status Saat Ini                                       |
| --------------------------------------------------- | ----------------------------------------------------- |
| Global Search Command Palette (Ctrl+K)              | ❌ Belum ada                                          |
| Collapsible Hymnal Sidebar                          | ⚠️ Ada tapi fixed width (w-16), belum collapsible     |
| Warna aksen unik per buku                           | ⚠️ Semua buku menggunakan `brand-secondary` yang sama |
| Hasil pencarian dikelompokkan per buku              | ❌ Flat list                                          |
| Section Dividers di Playlist ("OPENING", "WORSHIP") | ⚠️ Ada section_label tapi belum ada quick-add presets |
| Framer Motion panel transitions                     | ❌ Belum dipakai                                      |

---

## Proposed Changes

### Komponen 1: `HymnalSidebar.tsx` [NEW]

> Sidebar kiri yang collapsible untuk navigasi koleksi buku lagu.

#### Detail Implementasi:

- **Collapsed Mode** (default, w=16): Hanya icon badge kode buku (LS, SDAH).
- **Expanded Mode** (w=56): Menampilkan nama lengkap buku + jumlah lagu + badge Official/Custom.
- **Toggle**: Chevron button di bagian bawah sidebar, animated via Framer Motion `animate={{ width }}`.
- **Warna Aksen Unik**: Setiap buku mendapat warna dari palette HSL yang di-derive dari index (`hsl(index * 47, 70%, 55%)`).
- **Active Indicator**: Glow bar kiri (4px, warna aksen buku) saat buku terpilih.
- **"Semua Buku"** button tetap di posisi atas.

#### Ekstraksi dari `SongLibraryPanel.tsx`:

Logika hymnal sidebar saat ini (lines 146-181) dipindahkan ke komponen mandiri.

---

### Komponen 2: `CommandPalette.tsx` [NEW]

> Modal pencarian global yang dipicu oleh shortcut `Ctrl+K`.

#### Detail Implementasi:

- **Trigger**: Keyboard shortcut `Ctrl+K` (global listener di `App.tsx`).
- **UI**: Full-width modal overlay dengan input besar, backdrop blur, auto-focus.
- **Hasil Pencarian**:
  - Dikelompokkan berdasarkan asal buku (header: `📖 Lagu Sion Edisi Lengkap — 12 hasil`).
  - Setiap hasil menampilkan: nomor + judul + alternate title + hymnal badge.
  - Highlight match keyword pada judul dan lirik.
- **Navigasi keyboard**: Arrow Up/Down untuk pilih, Enter untuk CUE lagu ke preview, Escape untuk tutup.
- **Data source**: Memanggil `window.api.songs.search(query)` (tanpa filter hymnal, global).
- **Animasi**: Framer Motion `AnimatePresence` untuk mount/unmount, `motion.div` scale-in.

---

### Komponen 3: `SongLibraryPanel.tsx` [MODIFY]

> Refaktor untuk menggunakan `HymnalSidebar` dan menambahkan result count per section.

#### Perubahan:

1. **Ekstraksi sidebar** → `<HymnalSidebar />`.
2. **Header enrichment**: Menampilkan `{filteredSongs.length} lagu` count badge di samping judul.
3. **Improved search bar**: Tambahkan shortcut hint `Ctrl+K` sebagai placeholder suffix.
4. **Framer Motion**: Wrap content area dengan `<AnimatePresence>` untuk transisi smooth saat berpindah hymnal/filter.

---

### Komponen 4: `SongCard.tsx` [MODIFY]

> Peningkatan minor — warna badge dinamis per buku.

#### Perubahan:

- Badge kode buku (`LS`, `SDAH`) sekarang menggunakan warna aksen unik sesuai hymnal (konsisten dengan sidebar).
- Utility function `getHymnalColor(code: string)` di `src/renderer/src/utils/hymnal-colors.ts` [NEW].

---

### Komponen 5: `PlaylistPanel.tsx` [MODIFY]

> Menambahkan section divider presets dan UI count enrichment.

#### Perubahan:

1. **Quick Section Add**: Dropdown button "Tambah Pemisah" dengan preset labels: `OPENING`, `WORSHIP`, `SERMON`, `OFFERING`, `CLOSING`, `CUSTOM...`.
2. **Section Dividers**: Render divider lines di antara item yang memiliki `section_label` berbeda dari item sebelumnya. (Sudah ada di `PlaylistItemCard.tsx`, tinggal tambahkan quick-add UI di header).
3. **Count badge**: Menampilkan total lagu + total slide di Quick Actions Bar.
4. **Framer Motion**: `LayoutGroup` + `motion.div layout` untuk animasi reorder yang smooth.

---

### Komponen 6: `useProjectionStore.ts` [MINOR MODIFY]

> Menambahkan hymnal metadata tracking di CUE dan PROGRAM state.

#### Perubahan:

- Tambahkan field `cuedSongMeta: { hymnalCode: string; hymnalName: string } | null` ke state.
- `setSlides` sekarang juga menerima opsional `meta?: { hymnalCode: string; hymnalName: string }`.
- Metadata ini dipakai oleh `LivePreviewPanel` untuk menampilkan badge asal buku lagu di monitor preview/program.

---

### Komponen 7: `src/renderer/src/utils/hymnal-colors.ts` [NEW]

> Utility untuk menghasilkan warna aksen unik per kode buku lagu.

```typescript
const HYMNAL_COLORS: Record<string, string> = {
  LS: 'hsl(210, 70%, 55%)', // Blue
  SDAH: 'hsl(280, 60%, 55%)', // Purple
  PK: 'hsl(340, 65%, 55%)', // Rose
  LG: 'hsl(160, 60%, 45%)' // Teal
}

export function getHymnalColor(code: string): string {
  if (HYMNAL_COLORS[code]) return HYMNAL_COLORS[code]
  // Deterministic fallback based on hash
  let hash = 0
  for (const char of code) hash = char.charCodeAt(0) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 60%, 52%)`
}
```

---

## State Management Flow

```
┌──────────────────────────────────────────────┐
│ useAppStore (Global)                         │
│  ├── hymnals: Hymnal[]                       │
│  ├── selectedHymnalId: number | null         │
│  ├── songs: Song[] (filtered by hymnal)      │
│  ├── loadHymnals() → IPC                     │
│  ├── loadSongs(hymnalId?) → IPC              │
│  └── searchSongs(query, hymnalId?) → IPC     │
├──────────────────────────────────────────────┤
│ useProjectionStore (Projection Sync)         │
│  ├── slides: SlideData[] (CUE deck)          │
│  ├── programSlides: SlideData[] (LIVE deck)  │
│  ├── cuedSongMeta: { hymnalCode, ... }  NEW │
│  ├── takeCue() → copy CUE → PROGRAM         │
│  └── goToSlide() → send to Projection IPC   │
├──────────────────────────────────────────────┤
│ usePlaylistStore (Playlist)                  │
│  ├── activePlaylist, playlistItems           │
│  ├── addSongToPlaylist()                     │
│  └── reorderItems()                          │
└──────────────────────────────────────────────┘
```

---

## Alur Integrasi Data

1. **User membuka dashboard** → `loadHymnals()` + `loadSongs()` dipanggil.
2. **User klik buku di HymnalSidebar** → `setSelectedHymnalId(id)` → trigger `loadSongs(id)`.
3. **User tekan Ctrl+K** → `CommandPalette` muncul, search global (tanpa filter hymnal).
4. **User pilih lagu dari search/library** → `setSelectedSong(song)` → `generateSlides()` → `setSlides(slides)` (masuk CUE).
5. **User tekan TAKE** → `takeCue()` → slides berpindah dari CUE ke PROGRAM deck → dikirim ke projection window via IPC.

---

## Verification Plan

### Automated Tests

- `npm run typecheck` (Node + Web) — harus 0 error.
- `npm run lint` — harus 0 error, 0 warning.
- `npx electron-vite build` — harus berhasil.

### Manual Verification

- Ctrl+K membuka Command Palette dan pencarian berfungsi.
- Berpindah buku di sidebar memfilter song list secara instan.
- Sidebar collapsible menampilkan animasi transisi smooth.
- Playlist drag-and-drop tetap stabil setelah perubahan.
- Empty states tetap tampil dengan benar.

---

## File Summary

| File                                               | Action     | Deskripsi                              |
| -------------------------------------------------- | ---------- | -------------------------------------- |
| `src/renderer/src/components/HymnalSidebar.tsx`    | **NEW**    | Collapsible sidebar navigasi buku lagu |
| `src/renderer/src/components/CommandPalette.tsx`   | **NEW**    | Global search Ctrl+K                   |
| `src/renderer/src/utils/hymnal-colors.ts`          | **NEW**    | Warna aksen unik per buku              |
| `src/renderer/src/components/SongLibraryPanel.tsx` | **MODIFY** | Ekstraksi sidebar, integration updates |
| `src/renderer/src/components/SongCard.tsx`         | **MODIFY** | Dynamic hymnal badge color             |
| `src/renderer/src/components/PlaylistPanel.tsx`    | **MODIFY** | Section divider presets, count badges  |
| `src/renderer/src/store/useProjectionStore.ts`     | **MODIFY** | Hymnal metadata tracking               |
| `src/renderer/src/App.tsx`                         | **MODIFY** | Ctrl+K listener + CommandPalette mount |
| `.docs/05-logs/log-impl-multi-hymnal-v3.md`        | **NEW**    | Post-implementation log                |
