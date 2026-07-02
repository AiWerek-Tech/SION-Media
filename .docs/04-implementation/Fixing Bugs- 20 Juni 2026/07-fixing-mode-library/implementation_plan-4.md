# Bible Interaktif — Premium UI Redesign

Merombak UI Alkitab Interaktif di Library Mode agar **persis mengikuti mockup dashboard premium** yang dilampirkan, tanpa merusak fungsionalitas yang sudah ada.

---

## User Review Required

> [!IMPORTANT]
> Redesain ini adalah perombakan visual besar-besaran (~2000+ baris JSX + ~500 baris CSS baru) pada workspace Alkitab di Library Mode. **Semua fitur fungsional dijamin tetap utuh** — yang berubah hanyalah tampilan visual dan struktur layout.

> [!WARNING]
> File `LibraryModeRedesigned.tsx` saat ini sudah sangat besar (~2998 baris). Rencana ini **memecah** seluruh rendering workspace Alkitab ke 6 komponen baru yang lebih kecil dan maintainable. Ini mengurangi ~600 baris inline dari file utama.

---

## Proposed Changes

### Komponen Baru — `src/renderer/src/features/bible/components/library/`

#### [NEW] [BibleBookSidebar.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleBookSidebar.tsx)
- Sidebar kitab premium 280px, glassmorphism card, search input.
- Section headers "PERJANJIAN LAMA" / "PERJANJIAN BARU" dengan blue accent.
- Book items dengan icon, nama kitab, chapter count pill, active glow border left, hover state lembut.
- Props: `books`, `otBooks`, `ntBooks`, `selectedBookCode`, `onSelectBook`, `bookSearchQuery`, `onBookSearchChange`.

#### [NEW] [BibleHeroHeader.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleHeroHeader.tsx)
- Hero area besar "Alkitab Interaktif" + subtitle "Alkitab Terjemahan Baru (TB)".
- Cosmic blue gradient background via CSS pseudo-element (no external images).
- Version badge (square rounded `TB`), chapter selector dropdown/pill `Kejadian 1` dengan chevron left/right, tombol "Membaca Layar Penuh".
- Props: `selectedBook`, `selectedChapter`, `selectedVersion`, `versions`, `onSelectVersion`, `onPrevChapter`, `onNextChapter`, `onFullscreen`.

#### [NEW] [BibleChapterRail.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleChapterRail.tsx)
- Horizontal pill numbers rail: active chapter blue glow, dark pills for rest.
- Horizontal scroll dengan gradient fade kiri/kanan via CSS mask-image.
- Prev/next chapter tetap tersedia.
- Props: `totalChapters`, `selectedChapter`, `onSelectChapter`.

#### [NEW] [BibleVerseCard.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleVerseCard.tsx)
- Individual verse card: rounded-2xl, glassmorphism, border subtle.
- Verse number badge (blue gradient circle), verse text (14-15px, serif, line-height 1.7).
- Right quick actions (Preview / Live / + Playlist / ⋮) muncul saat hover.
- Gold/amber highlight border untuk selected verse.
- Note badge "CATATAN" dan color dot marker.
- Replace plain checkbox with styled verse badge that toggles check state.
- Props: `verse`, `isSelected`, `highlightColor`, `hasNote`, `onClickVerse`, `onInspect`, `onPreview`, `onLive`, `onAddPlaylist`.

#### [NEW] [BibleStudyInspector.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleStudyInspector.tsx)
- Right panel 390px, glass card rounded-3xl, tabs (Bandingkan / Catatan Belajar / Aksi Cepat).
- **Tab Bandingkan**: "AYAT TERPILIH" gold quote card premium + comparison version cards + "Tambah Versi Lain" button.
- **Tab Catatan Belajar**: Reference card, highlight color palette compact (6 warna circular), textarea catatan, save button.
- **Tab Aksi Cepat**: Grid 2×4 icon action cards (Copy Ayat, Bagikan, Simpan, Sorot Ayat, Buat Catatan, Tambah ke Playlist, Bandingkan Versi, Cari Topik).
- Empty state: card kosong premium "Pilih ayat untuk melihat perbandingan..."
- Memindahkan semua Bible-specific logic dan state dari `RightInspector` ke komponen ini.
- Props: menggantikan semua Bible-related props di `RightInspector`.

#### [NEW] [BibleNoteModal.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/components/library/BibleNoteModal.tsx)
- Premium modal overlay (bg-black/70, backdrop-blur-md).
- Width 640px, rounded-3xl, deep navy glass.
- Header: icon Sparkles, reference verse, close button.
- Gold accent quote card (italic/serif).
- 6 circular highlight colors + "Hapus Highlight".
- Textarea min-h-[150px], rounded-2xl, bg-black/20.
- Footer: Batal + Simpan Catatan.
- Keyboard: Escape close, Ctrl+Enter save.
- Toast setelah simpan.
- Props: `verse`, `isOpen`, `onClose`, `onSave`, `initialNote`, `initialColor`.

---

### Modifikasi File Existing

#### [MODIFY] [LibraryModeRedesigned.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/LibraryModeRedesigned.tsx)
- **Sembunyikan `<LibraryOverview>` stats** saat `workspace === 'bible'` (line ~2018).
- **Ganti render block `workspace === 'bible'`** (lines ~2122-2558) → import dan render 6 komponen baru sebagai layout 3 kolom.
- **Extract Bible RightInspector logic** dari `RightInspector` function ke `BibleStudyInspector`.
- `RightInspector` render block `workspace === 'bible'` → delegate ke `<BibleStudyInspector />`.
- Update search placeholder saat Bible workspace aktif: "Cari ayat, topik, penulis, tema..."
- Total net reduction: ~500 baris dari file utama dipindahkan ke komponen baru.

#### [MODIFY] [LibraryBibleViewer.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/library/LibraryBibleViewer.tsx)
- Update fullscreen reader styling agar lebih premium:
  - max-width 920px, mx-auto.
  - Default font-size 26-28px, line-height 1.8.
  - Verse numbers sebagai superscript amber/blue.
  - Better theme selection UI.
  - Clickable verse opens note modal inline.
- Pastikan TitleBar global tetap hidden saat active.

#### [MODIFY] [main.css](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/styles/main.css) (atau CSS file yang digunakan)
- Tambahkan CSS classes baru untuk Bible workspace premium:
  - `.bible-workspace` — 3-column layout
  - `.bible-sidebar` — glass sidebar
  - `.bible-hero` — cosmic gradient header
  - `.bible-chapter-rail` — horizontal scroll dengan fade masks
  - `.bible-verse-card` — premium verse card styles
  - `.bible-inspector` — right panel glass
  - `.bible-note-modal` — premium modal
  - Semua menggunakan design tokens yang sudah ada (`--color-brand-primary`, `--color-bg-surface`, dll).

---

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit
npm run test
npm run build
```

### Manual Verification
1. Buka Library Mode → masuk workspace Alkitab → pastikan layout 3 kolom sesuai mockup.
2. Pilih Kejadian 1, Mazmur 23, Yohanes 3 — pastikan semua navigasi bekerja.
3. Klik ayat → inspector menampilkan ayat terpilih.
4. Preview / Live / + Playlist semua bekerja.
5. Highlight warna + catatan simpan/hapus berfungsi.
6. Tab Bandingkan / Catatan Belajar / Aksi Cepat.
7. Fullscreen reader — TitleBar hilang, font size, auto-scroll, themes.
8. Kembali ke Library — catatan dan highlight tetap tampil.
9. Test resolusi 1366x768 dan 1920x1080.
10. Mode lagu, playlist, projection, mini Bible tidak terpengaruh.
