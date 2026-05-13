# Tentang Mode Library

## Overview

Mode Library adalah salah satu dari empat mode utama dalam SION Media (bersama dengan Projection, Management, dan Broadcast Mode). Mode ini berfungsi sebagai pusat manajemen dan eksplorasi koleksi lagu-lagu ibadah.

## Struktur Utama

### File Implementasi

- **LibraryModeRedesigned.tsx** (962 lines) - Implementasi aktif dengan fitur lengkap
  - Lokasi: `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`
  - Ini adalah implementasi yang digunakan saat ini

- **LibraryMode.tsx** (28 lines) - Versi lama sederhana
  - Lokasi: `src/renderer/src/screens/modes/LibraryMode.tsx`
  - Kemungkinan deprecated dan tidak digunakan lagi

## Arsitektur LibraryModeRedesigned

### Workspace Types

Workspace adalah kategori navigasi utama di sidebar:

**Library (Aktif):**
- `all` - Semua lagu dalam database
- `playlist` - Playlist yang dibuat user
- `favorites` - Lagu yang ditandai favorit
- `recent` - Lagu yang baru saja dibuka

**Koleksi (Aktif):**
- `collections` - Collections (coming soon)
- `hymnals` - Daftar buku lagu/hymnal
- `tags` - Tags & Themes

**Latihan (Coming Soon):**
- `practice` - Practice Tools
- `chords` - Chord Charts
- `vocal` - Vocal Guide

**Studio (Coming Soon):**
- `broadcast` - Broadcast Studio
- `ai` - AI Features
- `analytics` - Worship Analytics
- `utilities` - Utilities

### Tab Types

Tab mengatur cara tampilan lagu di area utama:

- `playlist` - Tampilan playlist workspace
- `number` - Tampilan grid nomor lagu
- `title` - Tampilan daftar judul dengan detail

## Komponen Library

### Komponen Navigasi & Layout

**LibrarySidebar.tsx** (497 lines)
- Lokasi: `src/renderer/src/components/library/LibrarySidebar.tsx`
- Fungsi: Sidebar navigasi kiri dengan:
  - Hymnal selector dengan dropdown
  - Pinned hymnals (disimpan di localStorage)
  - Search bar dengan debouncing (250ms)
  - Section tabs: Cari, Terakhir, Favorit
  - Song list dengan virtual scrolling
  - Collapse/expand functionality
  - Compact mode

**LibraryCommandBar.tsx** (151 lines)
- Lokasi: `src/renderer/src/components/library/LibraryCommandBar.tsx`
- Fungsi: Command bar di atas dengan:
  - Hymnal selector
  - Global search trigger (Ctrl+K)
  - Theme toggle (dark/light)
  - Focus mode toggle

**LibraryBrowserPanel.tsx** (105 lines)
- Lokasi: `src/renderer/src/components/library/LibraryBrowserPanel.tsx`
- Fungsi: Panel browser yang mengatur tab switching antara:
  - Number view
  - Title view
  - Playlist workspace

### Komponen Tampilan Lagu

**LibraryNumberView.tsx** (385 lines)
- Lokasi: `src/renderer/src/components/library/LibraryNumberView.tsx`
- Fungsi: Grid view nomor lagu dengan:
  - Virtual scrolling menggunakan @tanstack/react-virtual
  - Responsive grid layout
  - Keyboard navigation
  - Jump to number feature
  - Compact mode

**LibraryTitleView.tsx** (316 lines)
- Lokasi: `src/renderer/src/components/library/LibraryTitleView.tsx`
- Fungsi: List view judul dengan:
  - Virtual scrolling
  - Sorting: number, title, category, favorite
  - Context menu untuk setiap lagu
  - Quick actions (add to playlist, favorite)

**LibraryPlaylistWorkspace.tsx**
- Lokasi: `src/renderer/src/components/library/LibraryPlaylistWorkspace.tsx`
- Fungsi: Workspace untuk playlist aktif

**LibraryPlaylistView.tsx**
- Lokasi: `src/renderer/src/components/library/LibraryPlaylistView.tsx`
- Fungsi: Tampilan daftar playlist

**HighDensitySongGrid.tsx**
- Lokasi: `src/renderer/src/components/library/HighDensitySongGrid.tsx`
- Fungsi: Grid lagu dengan density tinggi

### Komponen Lyrics & Preview

**LibraryLyricsViewer.tsx** (839 lines)
- Lokasi: `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
- Fungsi: Fullscreen lyrics viewer dengan:
  - Atmosphere system support (background visual)
  - Auto-hide UI pada idle (2.5 detik)
  - Title bar dengan hover detection (top 5px edge)
  - Song metadata display
  - Navigation controls (prev/next song)
  - Fullscreen toggle
  - Responsive layout
  - Bottom navigation bar dengan auto-hide

**LibraryLyricsPane.tsx**
- Lokasi: `src/renderer/src/components/library/LibraryLyricsPane.tsx`
- Fungsi: Pane lyrics preview (non-fullscreen)

### Komponen Utility

**LibrarySearchPalette.tsx** (17,606 bytes)
- Lokasi: `src/renderer/src/components/library/LibrarySearchPalette.tsx`
- Fungsi: Palette pencarian global

**SongContextMenu.tsx**
- Lokasi: `src/renderer/src/components/library/SongContextMenu.tsx`
- Fungsi: Context menu untuk aksi lagu

**HymnalTopBar.tsx** (11,386 bytes)
- Lokasi: `src/renderer/src/components/library/HymnalTopBar.tsx`
- Fungsi: Top bar untuk hymnal selector

## Page/Screen yang Terhubung dengan Library Mode

### Screens Utama (dari App.tsx)

Lokasi: `src/renderer/src/App.tsx`

1. **LibraryMode** - Mode library utama
   - Route: `currentMode === 'LIBRARY'`
   - Komponen: LibraryModeRedesigned

2. **SongEditorScreen** - Editor lagu
   - Route: `currentScreen === 'song-editor'`
   - Diakses dari: Library mode (Edit Info button)

3. **SettingsScreen** - Pengaturan aplikasi
   - Route: `currentScreen === 'settings'`
   - Diakses dari: Title bar menu

4. **ImportExportScreen** - Import/export data
   - Route: `currentScreen === 'import-export'`
   - Diakses dari: Settings

5. **BibleScreen** - Tampilan Bible
   - Route: `currentScreen === 'bible'`
   - Diakses dari: Command palette/menu

6. **WelcomeScreen** - Onboarding/welcome screen
   - Route: `isFirstInstall === true`
   - Muncul saat first install

### Mode Lain yang Terintegrasi

1. **ProjectionMode** - Mode presentasi
   - Route: `currentMode === 'PROJECTION'`
   - Diakses dari: Library command bar (Present button)

2. **ManagementMode** - Mode manajemen konten
   - Route: `currentMode === 'MANAGEMENT'`
   - Diakses dari: Library command bar (Content button)

3. **BroadcastMode** - Mode broadcast
   - Route: `currentMode === 'BROADCAST'`
   - Diakses dari: Library command bar (Broadcast button)

### Settings Sub-screens

Lokasi: `src/renderer/src/screens/settings/`

- AboutSettings
- AppThemeSettings
- BackgroundSettings
- BackupSettings
- DisplaySettings
- HymnalSettings
- ShortcutsSettings
- ThemeSettings

## Alur Data & State Management

### Store yang Digunakan

**useAppStore**
- Lokasi: `src/renderer/src/store/useAppStore.ts`
- State yang digunakan:
  - `songs` - Daftar semua lagu
  - `hymnals` - Daftar hymnal
  - `selectedSong` - Lagu yang sedang dipilih
  - `selectedHymnalId` - Hymnal yang aktif
  - `searchQuery` - Query pencarian
  - `isLyricsFullscreen` - Status fullscreen lyrics
  - `setSelectedSong` - Set lagu terpilih
  - `setLyricsFullscreen` - Toggle fullscreen
  - `loadSongs` - Load lagu dari database
  - `loadHymnals` - Load hymnal dari database
  - `searchSongs` - Filter lagu berdasarkan query
  - `setScreen` - Navigasi antar screen
  - `showToast` - Display toast notification

**useModeStore**
- Lokasi: `src/renderer/src/store/useModeStore.ts`
- State yang digunakan:
  - `currentMode` - Mode aktif saat ini
  - `isFirstInstall` - Status first install
  - `setMode` - Switch antar mode

**usePlaylistStore**
- Lokasi: `src/renderer/src/store/usePlaylistStore.ts`
- State yang digunakan:
  - `playlists` - Daftar playlist
  - `activePlaylist` - Playlist yang aktif
  - `playlistItems` - Item dalam playlist aktif
  - `loadPlaylists` - Load playlist dari database
  - `addSongToPlaylist` - Tambah lagu ke playlist

## Fitur Utama Library Mode

### Search & Filter
- **Global search** dengan debouncing (250ms delay)
- **Filter by workspace** - favorites, recent, hymnal-specific
- **Multi-field search** - judul, nomor, penulis, tema, tags
- **Real-time filtering** saat mengetik

### Tampilan & Navigasi
- **Virtual scrolling** untuk performa dengan ribuan lagu
- **Pagination** - 120 lagu per halaman (untuk number view)
- **Responsive grid** - menyesuaikan jumlah kolom berdasarkan lebar
- **Keyboard navigation** - arrow keys, Enter, Escape
- **Compact mode** - tampilan lebih padat

### Sorting
- **Sort by number** - urut berdasarkan nomor lagu
- **Sort by title** - urut berdasarkan judul (A-Z)
- **Sort by category** - urut berdasarkan kategori
- **Sort by favorite** - favorit di atas

### User Experience
- **Fullscreen library mode** (Ctrl+Shift+F) - hide sidebar untuk fokus
- **Lyrics fullscreen** dengan auto-hide UI (2.5 detik idle)
- **Title bar hover detection** - hanya muncul saat mouse di top 5px edge
- **Smooth animations** menggunakan Framer Motion
- **Context menu** untuk quick actions
- **Toast notifications** untuk feedback

### Persistence
- **Pinned hymnals** - disimpan di localStorage
- **Theme preference** - dark/light mode disimpan
- **Recent songs** - tracking lagu yang baru dibuka
- **Search history** - (potensial fitur)

### Keyboard Shortcuts
- `Ctrl+K` - Buka global search
- `Ctrl+Shift+F` - Toggle fullscreen library
- `Escape` - Exit fullscreen / close overlay
- `Arrow keys` - Navigasi dalam grid/list
- `Enter` - Buka lagu terpilih

## Integrasi Antar Page

### Dari Library Mode

**Buka Lagu:**
- Klik lagu → `setSelectedSong(song)` + `setLyricsFullscreen(true)`
- Membuka `LibraryLyricsViewer` sebagai overlay

**Edit Lagu:**
- Klik "Edit Info" di inspector → `setEditingSong(song)` + `setScreen('song-editor')`
- Navigasi ke `SongEditorScreen`

**Settings:**
- Klik menu di title bar → `setScreen('settings')`
- Navigasi ke `SettingsScreen`

**Mode Switch:**
- Klik "Content" → `setMode('MANAGEMENT')`
- Klik "Broadcast" → `setMode('BROADCAST')`
- Klik "Present" → `setMode('PROJECTION')`

### Ke Library Mode

**Dari WelcomeScreen:**
- Setelah onboarding selesai → `setMode('LIBRARY')`

**Dari Mode Lain:**
- Menggunakan mode switcher di command bar
- Menggunakan command palette

**Dari Command Palette:**
- Search "Library" atau navigate ke library mode

## Teknologi & Dependencies

### UI Framework
- **React** - Component library
- **Framer Motion** - Animations dan transitions
- **Lucide React** - Icon library

### Performance
- **@tanstack/react-virtual** - Virtual scrolling untuk list/grid besar
- **React.memo** - Memoization untuk komponen
- **useMemo** - Memoization untuk computed values
- **useCallback** - Stable function references

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Custom CSS classes** - Untuk komponen kompleks

## Catatan Penting

### Status Implementasi
- LibraryModeRedesigned adalah implementasi yang aktif digunakan
- Versi LibraryMode.tsx lama kemungkinan deprecated
- Banyak workspace yang masih "coming soon" menunggu backend implementation

### Performance Considerations
- Virtual scrolling digunakan untuk menangani ribuan lagu
- Debouncing pada search untuk mengurangi re-render
- Pagination pada number view untuk performa

### Known Limitations
- Workspace seperti practice, chords, vocal, broadcast, ai, analytics, utilities belum aktif
- Collections workspace belum diimplementasikan
- Beberapa fitur masih placeholder

### Future Enhancements
- Backend integration untuk workspace yang "coming soon"
- Advanced search dengan filters
- Playlist management yang lebih lengkap
- Offline mode support
- Sync dengan cloud storage

## File Reference Summary

### Mode Implementation
- `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx` - Main implementation
- `src/renderer/src/screens/modes/LibraryMode.tsx` - Old version (deprecated)

### Components
- `src/renderer/src/components/library/LibrarySidebar.tsx`
- `src/renderer/src/components/library/LibraryCommandBar.tsx`
- `src/renderer/src/components/library/LibraryBrowserPanel.tsx`
- `src/renderer/src/components/library/LibraryNumberView.tsx`
- `src/renderer/src/components/library/LibraryTitleView.tsx`
- `src/renderer/src/components/library/LibraryPlaylistWorkspace.tsx`
- `src/renderer/src/components/library/LibraryPlaylistView.tsx`
- `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
- `src/renderer/src/components/library/LibraryLyricsPane.tsx`
- `src/renderer/src/components/library/LibrarySearchPalette.tsx`
- `src/renderer/src/components/library/SongContextMenu.tsx`
- `src/renderer/src/components/library/HighDensitySongGrid.tsx`
- `src/renderer/src/components/library/HymnalTopBar.tsx`

### Stores
- `src/renderer/src/store/useAppStore.ts`
- `src/renderer/src/store/useModeStore.ts`
- `src/renderer/src/store/usePlaylistStore.ts`

### Screens
- `src/renderer/src/App.tsx` - Main routing
- `src/renderer/src/screens/SongEditorScreen.tsx`
- `src/renderer/src/screens/SettingsScreen.tsx`
- `src/renderer/src/screens/ImportExportScreen.tsx`
- `src/renderer/src/screens/BibleScreen.tsx`
- `src/renderer/src/screens/WelcomeScreen.tsx`
- `src/renderer/src/screens/modes/ProjectionMode.tsx`
- `src/renderer/src/screens/modes/ManagementMode.tsx`
- `src/renderer/src/screens/modes/BroadcastMode.tsx`

---

*Dokumentasi ini dibuat berdasarkan analisis codebase per Mei 2026. Untuk informasi terbaru, silakan cek implementasi terbaru di repository.*
