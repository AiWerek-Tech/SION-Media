# SION Media — Enterprise Redesign System v1.0
## Complete Application Analysis, Validation & Modernization Blueprint

---

## PART 1: REVERSE-ENGINEERED APPLICATION ARCHITECTURE

### 1.1 Tech Stack (Confirmed from Source)

| Layer | Technology |
|---|---|
| Runtime | Electron 39 + Node.js |
| UI Framework | React 19 + TypeScript 5.9 |
| Styling | Tailwind CSS v4 + custom CSS design system |
| State Management | Zustand v5 (persist middleware) |
| Animation | Framer Motion v12 |
| Database | better-sqlite3 (WAL mode, FTS5 search) |
| IPC | Electron contextBridge (fully isolated) |
| Build | electron-vite v5 |
| i18n | i18next (EN + ID) |
| DnD | @dnd-kit/core + sortable |
| Virtualization | @tanstack/react-virtual |
| Floating UI | @floating-ui/react |

### 1.2 Window Architecture (3 Windows)

```
┌─────────────────────────────────────────────────────────────┐
│  MAIN WINDOW (1280×800, frameless, titleBarOverlay Win32)   │
│  → Hosts: App.tsx → TitleBar + Mode Router                  │
│  → Modes: LIBRARY | PROJECTION | MANAGEMENT | BROADCAST     │
│  → Overlays: CommandPalette, QuickJump, RuntimeInspector    │
└─────────────────────────────────────────────────────────────┘
         │ IPC: projection:slide-update
         │ IPC: projection:state-change
         │ IPC: projection:theme-update
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PROJECTION WINDOW (fullscreen, external display)           │
│  → Hosts: ProjectionApp.tsx → PresentationCanvas            │
│  → Receives: SlideData, ProjectionState, Theme              │
│  → States: LIVE | BLACK | FREEZE | CLEAR | LOGO             │
└─────────────────────────────────────────────────────────────┘
         │ IPC: projection:slide-update (mirrored)
         ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE DISPLAY WINDOW (3rd monitor, windowed)               │
│  → Hosts: StageDisplayApp.tsx                               │
│  → Shows: current slide + next slide for musicians          │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Application Mode Router

```
App.tsx
├── SplashScreen (loading gate)
├── WelcomeScreen (first install onboarding)
├── TitleBar (always visible, hidden in fullscreen)
│   ├── TitleBarIdentity (logo + app name)
│   ├── TitleBarMenu (File/Edit/View/Playlist/Projection/Tools/Help)
│   ├── TitleBarModeSwitcher (LIBRARY/PROJECTION/MANAGEMENT/BROADCAST)
│   ├── TitleBarStatus (live indicator, display count, timer, clock)
│   ├── TitleBarUtilityButtons (theme, settings, notifications)
│   └── TitleBarControls (minimize/maximize/close)
└── Mode Content Area (AnimatePresence)
    ├── LIBRARY → LibraryModeRedesigned.tsx
    ├── PROJECTION → ProjectionMode.tsx
    ├── MANAGEMENT → ManagementMode.tsx
    ├── BROADCAST → BroadcastMode.tsx
    └── Overlay Screens (z-50, slide over modes)
        ├── song-editor → SongEditorScreen.tsx
        ├── settings → SettingsScreen.tsx
        ├── import-export → ImportExportScreen.tsx
        └── bible → BibleScreen.tsx
```

### 1.4 State Management Architecture

```
Zustand Stores:
├── useAppStore          — songs, hymnals, screen routing, display, toast
├── useModeStore         — currentMode, theme, isFirstInstall (persisted)
├── useProjectionStore   — slides, programSlide, projectionState, NEXT state
├── usePlaylistStore     — playlists, playlistItems, activePlaylist
├── useAtmosphereStore   — atmosphere config, presets
├── useAnnouncementStore — custom slides, slide groups
├── useCacheStore        — media cache
├── useHealthStore       — IPC health monitoring
└── usePanelLayoutStore  — resizable panel sizes
```

### 1.5 Database Schema (SQLite, WAL mode)

```sql
Tables:
├── hymnals          — id, code, name, language, region, version, publisher, is_official
├── songs            — id, hymnal_id, number, title, alternate_title, title_en,
│                      lyrics_raw, category, language, author, composer,
│                      key_note, time_signature, tempo, tags, theme,
│                      scripture_reference, is_favorite, song_background_config
├── songs_fts        — FTS5 virtual table (number, title, alternate_title, lyrics_raw, tags, category)
├── playlists        — id, name, service_date, description
├── playlist_items   — id, playlist_id, song_id, sort_order, section_label
├── song_relations   — id, source_song_id, target_song_id, relation_type
├── song_history     — id, song_id, played_at
├── media_assets     — id (UUID), name, type, localPath, category, tags, isFavorite, usageCount
├── media_collections — id (UUID), name, description, coverAssetId, assetIds[]
├── bible_translations — id, code, name, language, source, is_default
├── bible_books      — id, translation_id, book_number, short_name, long_name, testament
├── bible_verses     — id, translation_id, book_id, chapter, verse, text
├── custom_slides    — id, title, content, slide_type, background_color, text_color, font_size
├── slide_groups     — id, name, description, loop_interval, is_active
├── slide_group_items — id, group_id, slide_id, sort_order
├── settings         — key, value (key-value store)
└── app_state        — key, value (session/recovery state)
```

### 1.6 IPC Channel Map (Complete)

```
Window Controls:    window:minimize/maximize/close/is-maximized
System:             system:get-memory, system:set-mode
Projection:         projection:slide-update, state-change, theme-update, show, hide
Stage:              stage:show, stage:hide
Confidence:         confidence:update, timer-start/stop/reset
Display:            display_get-all, display:is-projection-visible, display:changed
Hymnals:            db:get/add/update/delete-hymnal
Songs:              db:get/search/add/import-json/update/delete-song, toggle-favorite
                    db:bulk-assign-song-background, clear-lyrics, get/add/delete-song-relations
Media:              db:get/import/update/delete-media-assets, get/add/update/delete-media-collections
                    db:add/remove/reorder-assets-in-collection, bulk-update/delete-media-assets
Playlists:          db:get/add/update/delete-playlist, get/add/update/delete/reorder-playlist-items
Settings:           db:get-settings, db:update-setting
History:            db:log-history, db:get-recent-songs
Recovery:           db:save-session, get-recovery-state, mark-clean-exit
Backup:             db:create-backup, db:restore-backup, db:reseed
Bible:              db:get/add/delete-bible-translations, get/add-bible-books
                    db:get/add/search-bible-verses, get-bible-verse-range
Custom Slides:      db:get/add/update/delete-custom-slides, get-slides-by-type
                    db:get/add/update/delete-slide-groups, get/add/remove/reorder-group-slides
File:               file:parse-excel, file:show-save-dialog, file:write-json
Health:             health:heartbeat, health:get-status, health:status-update
App Theme:          app:theme-mode-set, app:theme-updated
```

---

## PART 2: TITLE BAR SYSTEM — COMPLETE ANALYSIS & REDESIGN

### 2.1 Current Title Bar Structure

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO] SION Media │ File  Edit  View  [Playlist]  [Projection]  [Tools]  Help │ [ModeSwitcher] │
│                   │                                                             │               │
│ ← title-bar-left  │ ← title-bar-menu (context-sensitive)                       │ ← center      │
│                                                                                               │
│                                    [Status: ● LIVE | 🖥️ 2 | ⏱ 00:00 | 🕐 14:32] [🌙 ⚙ 🔔] [─ □ ✕] │
│                                    ← title-bar-right                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Title Bar Menu — Detected Items & Context Rules

| Menu | Always Shown | PROJECTION Only | MANAGEMENT Only | Items |
|---|---|---|---|---|
| File | ✓ | | | New Playlist, Import/Export, Backup Database, Exit |
| Edit | ✓ | | | Search Song (Ctrl+F), Preferences |
| View | ✓ | | | Command Palette (Ctrl+P), Focus Live Mode*, Settings |
| Playlist | | ✓ | | Next Song (Ctrl+→), Previous Song (Ctrl+←) |
| Projection | | ✓ | | Projector ON/OFF, Black Screen (B), Freeze (F), Clear (Esc) |
| Tools | | ✓ | ✓ | Song Manager (Ctrl+N), Reseed Database |
| Help | ✓ | | | Keyboard Shortcuts (?), About SION Media |

*Focus Live Mode only shown in PROJECTION mode

### 2.3 Title Bar Status Indicators (TitleBarStatus.tsx)

Detected from store subscriptions and IPC:
- **Live Indicator**: `● LIVE` (red pulse) when projectionState === 'LIVE'
- **Display Count**: `🖥️ N` — number of connected displays
- **Service Timer**: `⏱ HH:MM:SS` — elapsed service time
- **Clock**: `🕐 HH:MM` — real-time clock

### 2.4 Title Bar Gaps & Issues Found

1. **Notifications button** — wired to UI but has no backend. No notification system exists.
2. **Theme button (Moon icon)** — opens nothing. Should open theme picker or toggle dark/light.
3. **"New Playlist" in File menu** — action is empty (`/* Will be wired */`). Dead UI.
4. **Playlist menu items** — disabled when no activePlaylist, but no visual feedback explaining why.
5. **Tools > Reseed Database** — destructive action with no confirmation dialog in menu (only browser confirm()).
6. **No Media menu** — media library operations have no title bar entry point.
7. **No Window menu** — no way to manage projection/stage windows from menu bar.
8. **Mode switcher** — dropdown only, no keyboard shortcut to switch modes.
9. **Status bar** — timer has no start/stop/reset controls in the title bar itself.

### 2.5 Redesigned Title Bar System

```
REDESIGNED TITLE BAR LAYOUT:
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [◈ SION] │ File  Edit  View  Media  Presentation  Window  Help │ [◉ PROJECTION ▾] │             │
│          │                                                      │                  │             │
│          │                                                      │ Mode Switcher    │             │
│                                                                                                  │
│                                    [● LIVE] [🖥 2] [⏱ 00:00 ▶] [14:32] │ [🌙] [⚙] [🔔 3] │ ─ □ ✕ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Redesigned Menu Structure:**

```
File
├── New Playlist...          Ctrl+N    → Opens CreatePlaylistDialog
├── Open Playlist...         Ctrl+O    → Opens PlaylistPickerDialog
├── Close Playlist                     → Clears active playlist
├── ─────────────────────────────────
├── Import Songs...          Ctrl+I    → setScreen('import-export')
├── Export Library...                  → Export dialog
├── ─────────────────────────────────
├── Backup Database...                 → createBackup() with path picker
├── Restore from Backup...             → restoreBackup() with file picker
├── ─────────────────────────────────
└── Exit                     Alt+F4    → window.close()

Edit
├── Search Songs             Ctrl+F    → Focus search input
├── Find in Lyrics           Ctrl+Shift+F → Lyrics search
├── ─────────────────────────────────
├── New Song...              Ctrl+Shift+N → setScreen('song-editor')
├── Edit Selected Song       Ctrl+E    → Edit current selectedSong
├── Delete Selected Song     Del       → Delete with confirmation
├── ─────────────────────────────────
└── Preferences              Ctrl+,    → setScreen('settings')

View
├── Command Palette          Ctrl+P    → Toggle CommandPalette
├── Keyboard Shortcuts       ?         → Toggle KeyboardCheatSheet
├── ─────────────────────────────────
├── Library Mode             Ctrl+1    → setMode('LIBRARY')
├── Projection Mode          Ctrl+2    → setMode('PROJECTION')
├── Management Mode          Ctrl+3    → setMode('MANAGEMENT')
├── Broadcast Mode           Ctrl+4    → setMode('BROADCAST')
├── ─────────────────────────────────
├── Focus Live Mode          Ctrl+Shift+L → toggleFocusMode() [PROJECTION only]
├── Fullscreen Library       Ctrl+Shift+F → [LIBRARY only]
├── ─────────────────────────────────
├── Runtime Inspector        Ctrl+Shift+I → toggleRuntimeInspector
└── Stage Display            Ctrl+Shift+S → stage:show/hide

Media
├── Import Media Assets...             → media.importAssets()
├── Open Media Library                 → Navigate to media workspace
├── ─────────────────────────────────
├── New Collection...                  → media.addCollection()
├── Manage Collections...              → Navigate to collections
├── ─────────────────────────────────
└── Clear Media Cache                  → mediaEngine.clearCache()

Presentation  [PROJECTION mode only]
├── Go Live                  Space     → goToSlide(currentSlideIndex)
├── Next Slide               →         → nextSlide()
├── Previous Slide           ←         → prevSlide()
├── ─────────────────────────────────
├── Black Screen             B         → toggleBlack()
├── Freeze Screen            F         → toggleFreeze()
├── Clear Screen             Esc       → clearScreen()
├── ─────────────────────────────────
├── Next Song in Playlist    Ctrl+→    → playlist next
├── Previous Song            Ctrl+←    → playlist prev
├── ─────────────────────────────────
├── Show Projector Window              → projection:show
├── Hide Projector Window              → projection:hide
└── Show Stage Display                 → stage:show

Window
├── Minimize                 Ctrl+M    → window.minimize()
├── Maximize / Restore       Ctrl+Shift+M → window.maximize()
├── ─────────────────────────────────
├── Projection Window → Show           → projection:show
├── Projection Window → Hide           → projection:hide
├── Stage Display → Show               → stage:show
├── Stage Display → Hide               → stage:hide
└── ─────────────────────────────────
    Bring All to Front                 → focus main window

Help
├── Keyboard Shortcuts       ?         → KeyboardCheatSheet
├── Quick Jump Guide                   → QuickJumpOverlay help
├── ─────────────────────────────────
├── Runtime Inspector        Ctrl+Shift+I
├── IPC Health Monitor                 → healthStore panel
├── ─────────────────────────────────
├── Check for Updates                  → (future)
├── Report Issue                       → (future)
└── About SION Media                   → AboutSettings modal
```

**Redesigned Status Bar (right side):**
```
[● LIVE / ○ CLEAR]  [🖥 2 displays]  [⏱ 00:00 ▶ ■ ↺]  [14:32:05]  [🌙 theme]  [⚙ settings]  [🔔 notifications]  [─ □ ✕]
```
- Live indicator: clickable → toggles projection show/hide
- Display count: clickable → opens Display Settings
- Timer: ▶ start, ■ stop, ↺ reset — inline controls
- Clock: shows HH:MM:SS
- Theme: cycles dark/light/system
- Settings: opens SettingsScreen
- Notifications: opens notification panel (new system needed)

---

## PART 3: LIBRARY MODE — COMPLETE ANALYSIS & REDESIGN

### 3.1 Current Library Mode Structure

**File:** `LibraryModeRedesigned.tsx`

```
LibraryMode
├── Ambient background layer
├── Sidebar (library-pro-sidebar)
│   ├── Brand mark (SION Media / Library v3.0)
│   ├── Navigation Groups
│   │   ├── Library: Semua Lagu, Playlist Saya, Favorit, Recently Opened
│   │   ├── Koleksi: Collections (soon), Hymnals, Tags & Themes
│   │   ├── Latihan: Practice Tools (soon), Chord Charts (soon), Vocal Guide (soon)
│   │   └── Studio: Broadcast Studio (soon), AI Features (soon), Analytics (soon), Utilities (soon)
│   └── Footer: Operator profile + DB status
├── Main Content Area
│   ├── Command Bar (mode pill, search, action buttons)
│   ├── Library Overview (stat cards: songs, hymnals, playlists, favorites, tags)
│   ├── Browser Panel
│   │   ├── Header (title, count, filter, tabs: Playlist/Nomor/Judul, fullscreen toggle)
│   │   ├── Content Views:
│   │   │   ├── ComingSoonWorkspace (for locked workspaces)
│   │   │   ├── Playlist View (rundown rows)
│   │   │   ├── Number View (number tiles grid, paginated 120/page)
│   │   │   └── Title View (SongMediaCard grid)
│   │   └── Pagination (for number view)
│   └── Right Inspector (song detail, chord, notes tabs)
│       ├── Empty state
│       ├── Song artwork
│       ├── Song title/subtitle
│       ├── Primary actions (Buka Lagu, Tambah Playlist)
│       ├── Metadata table (9 fields)
│       └── Quick actions (Favorit, Edit Info, Chord, More)
└── LibraryLyricsViewer (fullscreen overlay when isLyricsFullscreen)
```

### 3.2 Library Mode — Detected Issues

**Dead UI / Disconnected:**
1. `Collections` workspace — marked "Coming Soon", no backend
2. `Practice Tools`, `Chord Charts`, `Vocal Guide` — all "Coming Soon"
3. `Broadcast Studio`, `AI Features`, `Analytics`, `Utilities` — all "Coming Soon"
4. Inspector tabs "Chord" and "Notes" — render nothing, no backend
5. Favorite button in SongMediaCard — `onClick` only stops propagation, doesn't call `toggleFavorite`
6. Filter button "Semua Kategori" — opens nothing, no dropdown
7. "Content" button in command bar → `setMode('MANAGEMENT')` — works but misleading label
8. "Broadcast" button → `setMode('BROADCAST')` — works

**Missing Workflows:**
1. No way to create a new playlist from Library Mode
2. No drag-and-drop from song grid to playlist
3. No multi-select in song grid
4. No context menu on song cards (right-click)
5. No hymnal filter in Library Mode (only in Management)
6. No sort options in Title view
7. No export from Library Mode
8. Pagination only on Number view, not Title view (could be slow with 1000+ songs)

**Backend Gaps:**
1. `toggleFavorite` IPC exists but not called from Library Mode song card star button
2. `logHistory` called on `setSelectedSong` in store — works correctly
3. `addSongToPlaylist` requires `activePlaylist` — no way to create playlist inline

### 3.3 Redesigned Library Mode Architecture

```
LIBRARY MODE — REDESIGNED LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR                                                                                   │
├──────────────┬──────────────────────────────────────────────────────────┬───────────────────┤
│              │  COMMAND BAR                                             │                   │
│  SIDEBAR     │  [🔍 Search...  Ctrl+K]  [Filter ▾] [Sort ▾] [+ New]   │  RIGHT INSPECTOR  │
│  (240px)     ├──────────────────────────────────────────────────────────┤  (320px)          │
│              │  CONTENT AREA                                            │                   │
│  ─ Library   │  ┌─────────────────────────────────────────────────────┐│  [Song Detail]    │
│  ● All Songs │  │  OVERVIEW STATS (collapsible)                       ││  [Chord]          │
│  ○ Playlists │  │  Songs: 1,234  Hymnals: 8  Playlists: 12  Favs: 45 ││  [Notes]          │
│  ○ Favorites │  └─────────────────────────────────────────────────────┘│                   │
│  ○ Recent    │                                                          │  [Artwork]        │
│              │  [Playlist | Number | Title]  [120/page ▾]  [⛶]        │  [Title]          │
│  ─ Koleksi   │  ┌─────────────────────────────────────────────────────┐│  [Metadata]       │
│  ○ Hymnals   │  │                                                     ││  [Actions]        │
│  ○ Tags      │  │  SONG GRID / LIST / TILES                           ││                   │
│  ○ Collections│  │  (virtualized, context menu on right-click)         ││  [Quick Actions]  │
│              │  │                                                     ││                   │
│  ─ Latihan   │  └─────────────────────────────────────────────────────┘│                   │
│  ○ Practice  │                                                          │                   │
│  ○ Chords    │                                                          │                   │
│              │                                                          │                   │
│  ─ Studio    │                                                          │                   │
│  ○ Analytics │                                                          │                   │
│              │                                                          │                   │
│  [Operator]  │                                                          │                   │
│  [DB Status] │                                                          │                   │
└──────────────┴──────────────────────────────────────────────────────────┴───────────────────┘
```

### 3.4 Library Mode — All Pages & Subpages

| Workspace | Status | Backend | Description |
|---|---|---|---|
| All Songs | ✅ Live | `getSongs()` | Full song database, 3 view modes |
| Playlist Saya | ✅ Live | `getPlaylists()` + `getPlaylistItems()` | Worship rundown builder |
| Favorit | ✅ Live | `songs.filter(is_favorite)` | Filtered from loaded songs |
| Recently Opened | ✅ Live | `song_history` table | Songs with last_played |
| Hymnals | ✅ Live | `getHymnals()` | Hymnal browser with song counts |
| Tags & Themes | ✅ Live | Derived from song.tags/category | Tag cloud + filtered view |
| Collections | ⚠️ Stub | `getMediaCollections()` | Media collections (needs UI) |
| Practice Tools | 🔴 Planned | None | Future: metronome, key trainer |
| Chord Charts | 🔴 Planned | None | Future: chord display per song |
| Vocal Guide | 🔴 Planned | None | Future: audio playback |
| Broadcast Studio | 🔴 Planned | None | Future: streaming controls |
| AI Features | 🔴 Planned | None | Future: AI lyric suggestions |
| Analytics | 🔴 Planned | None | Future: usage analytics |
| Utilities | 🔴 Planned | None | Future: batch operations |

### 3.5 Library Mode — Modals & Dialogs Required

| Modal | Trigger | Backend | Status |
|---|---|---|---|
| CreatePlaylistDialog | File > New Playlist, + button | `addPlaylist()` | ❌ Missing |
| PlaylistPickerDialog | Open Playlist | `getPlaylists()` | ❌ Missing |
| SongContextMenu | Right-click on song card | Multiple | ⚠️ Partial (SongContextMenu.tsx exists) |
| HymnalFilterDropdown | Filter button | `getHymnals()` | ❌ Missing |
| SortOptionsDropdown | Sort button | Client-side | ❌ Missing |
| AddToPlaylistDialog | + button on song | `addPlaylistItem()` | ❌ Missing (uses active playlist only) |
| LyricsViewer | Double-click / Buka | Client-side | ✅ Exists (LibraryLyricsViewer) |
| SongEditorScreen | Edit Info | `updateSong()` | ✅ Exists (overlay screen) |
| DeleteConfirmDialog | Delete song | `deleteSong()` | ❌ Missing (uses browser confirm) |
| TagFilterPanel | Tags workspace | Client-side | ❌ Missing |

### 3.6 Library Mode — Context Menu (Right-Click on Song)

```
SongContextMenu (right-click on any song card/tile/row):
├── Open Song (Lyrics Viewer)
├── Add to Active Playlist
├── Add to Playlist... → submenu of playlists
├── ─────────────────────────────
├── Edit Song Info
├── Edit Lyrics
├── ─────────────────────────────
├── Toggle Favorite ★
├── Copy Song Number
├── Copy Song Title
├── ─────────────────────────────
├── View Song Relations
├── ─────────────────────────────
└── Delete Song... (with confirmation)
```

### 3.7 Library Mode — Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+K | Focus search |
| Ctrl+Shift+F | Toggle fullscreen library |
| Ctrl+N | New playlist |
| Ctrl+E | Edit selected song |
| Enter | Open selected song (lyrics viewer) |
| Space | Preview selected song in projection |
| ↑/↓ | Navigate song list |
| F | Toggle favorite on selected song |
| Delete | Delete selected song (with confirm) |
| Escape | Close fullscreen / close overlay |
| 1/2/3 | Switch tabs (Playlist/Number/Title) |

---

## PART 4: PROJECTION MODE — COMPLETE ANALYSIS & REDESIGN

### 4.1 Current Projection Mode Structure

**File:** `ProjectionMode.tsx`

```
ProjectionMode
├── Scene preset system (1-4, via custom event)
├── Focus Mode toggle (Ctrl+Shift+F)
├── Top Section (LivePreviewPanel)
│   └── LivePreviewPanel.tsx
│       ├── Preview panel (cued slide)
│       ├── Program panel (live slide)
│       ├── Slide navigation controls
│       ├── Projection state controls (LIVE/BLACK/FREEZE/CLEAR)
│       └── Transition speed control
└── Bottom Section (3-column workspace)
    ├── SongLibraryPanel.tsx (left)
    │   ├── Hymnal selector
    │   ├── Search input
    │   ├── Filter tabs (All/Favorites/Recent/Category)
    │   └── Song list (virtualized)
    ├── PlaylistPanel.tsx (center)
    │   ├── Playlist selector
    │   ├── Playlist items (drag-reorderable)
    │   └── Add/remove controls
    └── SongInfoPanel (right, inline in ProjectionMode.tsx)
        ├── Tabs: Song Info / Lirik / Notes
        ├── Song artwork + title
        ├── Metadata table (8 fields)
        └── Actions: Preview, Edit Lirik, Chord
```

### 4.2 Projection Mode — Runtime State Machine

```
ProjectionState:
  CLEAR  → No output (default, safe state)
  LIVE   → Active slide displayed on projector
  BLACK  → Black screen (projector on, no content)
  FREEZE → Last frame frozen (no slide updates)
  LOGO   → Logo/splash displayed

ProgramLockState:
  UNLOCKED   → Program can be modified
  LIVE_LOCK  → Program immutable while live
  LIVE_DIRTY → Pending changes need confirmation

PreviewSyncState (derived):
  SYNCED      → Preview matches program
  AHEAD       → Preview is ahead (ready to TAKE)
  INDEPENDENT → Preview has different content

NextReadyState:
  EMPTY       → No next content
  SLIDE_READY → Next slide exists in current song
  SONG_QUEUED → Next song pre-loaded
  BOTH_READY  → Both next slide and next song available
```

### 4.3 Projection Mode — Detected Issues

**Critical Functional Gaps:**
1. **SongInfoPanel tabs "Lirik" and "Notes"** — render nothing. Dead UI.
2. **Chord button** — shows toast "Panel chord akan mengikuti metadata lagu ini" — no actual chord panel.
3. **Scene presets (1-4)** — wired to CSS classes only, no actual scene configuration UI.
4. **No Quick Jump UI** — QuickJumpOverlay exists but only accessible via keyboard shortcut.
5. **No announcement/custom slide integration** — CustomSlides exist in DB but not in Projection Mode.
6. **No Bible verse projection** — BibleScreen exists but not integrated into Projection Mode workflow.
7. **No lower thirds / overlay system** — no text overlay controls.
8. **No timer display in Projection Mode** — timer exists in store but not shown in operator view.
9. **Stage Display controls** — accessible via menu but no visual indicator in Projection Mode.
10. **No confidence monitor view** — ConfidencePayload built but no display in operator UI.

**UX Issues:**
1. Bottom workspace has no resize handles — fixed 3-column layout.
2. SongLibraryPanel and PlaylistPanel are separate components with duplicate search logic.
3. No visual indication of which song is currently LIVE vs PREVIEW.
4. No "TAKE" button — operator must click slide in preview to go live.
5. No emergency controls (panic button, instant black).

### 4.4 Redesigned Projection Mode Layout

```
PROJECTION MODE — REDESIGNED LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR (with live indicator, timer, display count)                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ OPERATOR TOOLBAR                                                                            │
│ [● LIVE] [○ BLACK] [❄ FREEZE] [✕ CLEAR] [🖼 LOGO]  │  [⚡ TAKE]  │  [Scene 1▾] [⚙ Theme]  │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  PREVIEW PANEL (cued content)          │  PROGRAM PANEL (live output)                  │ │
│  │  ┌──────────────────────────────────┐  │  ┌──────────────────────────────────────────┐ │ │
│  │  │  [Slide preview thumbnail]       │  │  │  [Live slide thumbnail]                  │ │ │
│  │  │  "Bait 1 / 4"                    │  │  │  "Bait 2 / 4"  ● LIVE                   │ │ │
│  │  └──────────────────────────────────┘  │  └──────────────────────────────────────────┘ │ │
│  │  [◀ Prev]  Slide 3 of 8  [Next ▶]     │  [◀ Prev]  Slide 4 of 8  [Next ▶]            │ │
│  │  NEXT: "Bait 4 — Yesus Tuhan..."       │  Transition: [━━━●━━━] 0.4s                  │ │
│  └─────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  ┌──────────────────────────┐  │
│  │  SONG LIBRARY    │  │  PLAYLIST / RUNDOWN              │  │  SONG INFO / INSPECTOR   │  │
│  │  (resizable)     │  │  (resizable)                     │  │  (resizable)             │  │
│  │                  │  │                                  │  │                          │  │
│  │  [Hymnal ▾]      │  │  [Playlist ▾]  [+ New]          │  │  [Info] [Lirik] [Notes]  │  │
│  │  [🔍 Search]     │  │  ─────────────────────────────  │  │                          │  │
│  │  [All|Fav|Recent]│  │  01 ● Tuhan Yesus Kristus       │  │  [Artwork]               │  │
│  │  ─────────────── │  │  02   Bersyukurlah               │  │  [Title + Number]        │  │
│  │  Song list       │  │  03   Kau Setia                  │  │  [Metadata table]        │  │
│  │  (virtualized)   │  │  04   Haleluya                   │  │  [Actions]               │  │
│  │                  │  │  ─────────────────────────────  │  │                          │  │
│  │                  │  │  [+ Add Song]  [Reorder]         │  │  [Confidence Monitor]    │  │
│  └──────────────────┘  └──────────────────────────────────┘  └──────────────────────────┘  │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Projection Mode — All Panels & Controls

| Panel | Purpose | Backend | Status |
|---|---|---|---|
| LivePreviewPanel | Preview + Program dual view | projectionStore | ✅ Exists |
| SongLibraryPanel | Song browser for cueing | getSongs(), searchSongs() | ✅ Exists |
| PlaylistPanel | Worship rundown | getPlaylistItems() | ✅ Exists |
| SongInfoPanel | Song metadata inspector | Client-side | ✅ Exists (partial) |
| QuickJumpOverlay | Semantic slide navigation | projectionStore | ✅ Exists |
| ControlBar | Projection state controls | projection IPC | ✅ Exists |
| AnnouncementPanel | Custom slides | getCustomSlides() | ❌ Missing |
| BiblePanel | Bible verse projection | getBibleVerses() | ❌ Missing (BibleScreen exists separately) |
| LowerThirdsPanel | Text overlays | Custom slides | ❌ Missing |
| ConfidenceMonitor | Stage-facing display | ConfidencePayload | ⚠️ Built, not shown |
| TimerPanel | Service timer | projectionStore.timerElapsed | ⚠️ Built, not shown in UI |
| ScenePresetsPanel | Background/atmosphere | atmosphereStore | ⚠️ CSS only |
| StageDisplayControl | Stage window toggle | stage IPC | ⚠️ Menu only |

### 4.6 Projection Mode — Modals & Dialogs

| Modal | Trigger | Backend | Status |
|---|---|---|---|
| QuickJumpOverlay | Ctrl+J / keyboard | projectionStore | ✅ Exists |
| CreatePlaylistDialog | + New in playlist panel | addPlaylist() | ❌ Missing |
| SceneConfigDialog | Scene preset editor | atmosphereStore | ❌ Missing |
| ThemeEditorDialog | Theme button | settings IPC | ⚠️ In Settings only |
| AnnouncementEditor | Custom slide creation | addCustomSlide() | ❌ Missing |
| BiblePickerDialog | Bible verse selection | getBibleVerses() | ❌ Missing |
| EmergencyPanel | Panic/emergency controls | projection IPC | ❌ Missing |
| SongRelationsPanel | Related songs | getSongRelations() | ❌ Missing |

### 4.7 Projection Mode — Keyboard Shortcuts (Complete)

| Shortcut | Action | Source |
|---|---|---|
| Space / Enter | Go to slide (TAKE) | useGlobalShortcuts |
| → / PageDown | Next slide | useGlobalShortcuts |
| ← / PageUp | Previous slide | useGlobalShortcuts |
| B | Toggle Black | useGlobalShortcuts |
| F | Toggle Freeze | useGlobalShortcuts |
| Esc | Clear screen | useGlobalShortcuts |
| Ctrl+→ | Next song in playlist | TitleBarMenu |
| Ctrl+← | Previous song in playlist | TitleBarMenu |
| Ctrl+J | Quick Jump overlay | useGlobalShortcuts |
| Ctrl+Shift+F | Focus Live Mode | TitleBarMenu |
| Ctrl+P | Command Palette | useGlobalShortcuts |
| ? | Keyboard shortcuts | useGlobalShortcuts |
| Ctrl+Shift+I | Runtime Inspector | useGlobalShortcuts |

---

## PART 5: MANAGEMENT MODE — COMPLETE ANALYSIS & REDESIGN

### 5.1 Current Management Mode Structure

**File:** `ManagementMode.tsx`

```
ManagementMode
├── Ambient background
├── Header
│   ├── Eyebrow: "Worship Content Operations Studio"
│   ├── Title: "Dashboard"
│   ├── Subtitle
│   └── Action buttons: Lagu Baru, Import Lagu, Import JSON, Export Data, More, Focus
├── Summary Grid (6 metric cards)
│   ├── Total Lagu (songs.length)
│   ├── Buku Lagu (hymnals.length)
│   ├── Penulis/Komposer (unique authors)
│   ├── Tema (unique categories)
│   ├── Total Lirik (lyric line count)
│   └── Penyimpanan (hardcoded "28.4 GB" — FAKE)
├── Workspace Grid (2 columns)
│   ├── Left: Song Browser
│   │   ├── Command Bar (status filter, hymnal selector, search, sort, layout toggle)
│   │   ├── Song List (table rows with: checkbox, number, title/meta, status badge, atmosphere, actions)
│   │   └── Footer (count, bulk actions)
│   └── Right: Song Inspector
│       ├── Header (title, count)
│       ├── Artwork + title block
│       ├── Status badge + hymnal badge
│       ├── Actions: Edit Lirik, Preview, Edit Info, Delete
│       ├── Metadata section (dl table)
│       ├── Stats (verses, lines, words, chars)
│       ├── Atmosphere section
│       └── Quick actions: Favorit, Duplikat, Relasi, Export
└── Dialogs (inline state)
    ├── New Hymnal Dialog
    └── Bulk Background Assignment Dialog
```

### 5.2 Management Mode — Detected Issues

**Fake/Hardcoded Data:**
1. **Storage metric** — hardcoded "28.4 GB / 28% dari 100 GB" — not real
2. **Metric trend bars** — hardcoded arrays `[38, 54, 42, 68, 58, 78, 86]` — not real data
3. **Metric trends** — "+12%", "aktif", "curated", "tagged", "stable" — all hardcoded strings
4. **Copyright field** — hardcoded "SION Media" in inspector

**Dead UI:**
1. **Layout toggle button** (Grid2X2 icon) — no action wired
2. **Filter button** — no dropdown, no action
3. **"Duplikat" quick action** — no backend (no duplicate song IPC)
4. **"Relasi" quick action** — no UI (getSongRelations IPC exists but no modal)
5. **"Export" quick action** — no per-song export (only full library export)
6. **"Chord" in inspector** — no chord display
7. **Bell notification button** in header — no action
8. **PanelRight button** — no action

**Missing Pages/Sections:**
1. No Media Library management page (media assets exist in DB but no management UI)
2. No Bible management page (bible IPC exists but no management UI)
3. No Custom Slides management page
4. No User/Operator management
5. No System Diagnostics page
6. No Performance Analytics page
7. No Cloud Sync page
8. No Permissions management

**Backend Gaps:**
1. Storage metric needs `system:get-memory` + file system stats
2. Duplicate song needs new IPC handler
3. Song relations modal needs UI

### 5.3 Redesigned Management Mode Architecture

```
MANAGEMENT MODE — REDESIGNED LAYOUT:
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR                                                                                   │
├──────────────┬──────────────────────────────────────────────────────────────────────────────┤
│              │  HEADER: "Content Operations Studio"  [+ New Song] [Import ▾] [Export] [⋯]  │
│  SIDEBAR     ├──────────────────────────────────────────────────────────────────────────────┤
│  (220px)     │                                                                              │
│              │  CONTENT AREA (changes per section)                                         │
│  ─ Content   │                                                                              │
│  ● Songs     │                                                                              │
│  ○ Hymnals   │                                                                              │
│  ○ Media     │                                                                              │
│  ○ Bible     │                                                                              │
│  ○ Slides    │                                                                              │
│  ○ Playlists │                                                                              │
│              │                                                                              │
│  ─ System    │                                                                              │
│  ○ Settings  │                                                                              │
│  ○ Backup    │                                                                              │
│  ○ Diagnostics│                                                                             │
│  ○ Analytics │                                                                              │
│              │                                                                              │
│  ─ About     │                                                                              │
│  ○ About     │                                                                              │
│              │                                                                              │
└──────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Management Mode — All Sections (Redesigned)

| Section | Purpose | Backend | Status |
|---|---|---|---|
| **Songs** | Song CRUD, bulk ops, metadata | getSongs, CRUD | ✅ Exists (current main view) |
| **Hymnals** | Hymnal management | getHymnals, CRUD | ⚠️ Dialog only (in current mode) |
| **Media Library** | Image/video asset management | getMediaAssets, CRUD | ❌ Missing dedicated page |
| **Bible** | Bible translation management | getBibleTranslations, CRUD | ❌ Missing (BibleScreen is separate) |
| **Custom Slides** | Announcement/liturgy slides | getCustomSlides, CRUD | ❌ Missing |
| **Playlists** | Playlist management | getPlaylists, CRUD | ❌ Missing (only in Projection) |
| **Settings** | System configuration | getSettings, updateSetting | ⚠️ Separate SettingsScreen |
| **Backup** | Database backup/restore | createBackup, restoreBackup | ⚠️ In Settings only |
| **Diagnostics** | System health, IPC health | health IPC, getMemory | ⚠️ RuntimeInspector only |
| **Analytics** | Usage statistics | song_history, counts | ❌ Missing |
| **About** | App info | Static | ⚠️ In Settings only |

### 5.5 Management Mode — Songs Section (Detailed)

**Current columns in song table:**
- Checkbox (multi-select)
- Number (song number)
- Title + alternate title + hymnal badge
- Status badge (published/draft/review/archived)
- Atmosphere summary
- Actions (edit, preview, delete)

**Missing columns:**
- Last updated date
- Lyric coverage indicator
- Favorite indicator
- Category/theme

**Bulk Operations (current):**
- Bulk background assignment (dialog exists)
- Bulk delete (exists)
- Select all visible (exists)

**Missing bulk operations:**
- Bulk status change
- Bulk category assignment
- Bulk hymnal move
- Bulk export

### 5.6 Management Mode — Modals & Dialogs

| Modal | Trigger | Backend | Status |
|---|---|---|---|
| NewHymnalDialog | + Hymnal button | addHymnal() | ✅ Exists (inline) |
| BulkBackgroundDialog | Bulk background button | bulkAssignBackground() | ✅ Exists (inline) |
| SongRelationsModal | Relasi quick action | getSongRelations() | ❌ Missing |
| DuplicateSongDialog | Duplikat quick action | addSong() | ❌ Missing |
| MediaImportDialog | Import media | importMediaAssets() | ❌ Missing |
| BibleImportDialog | Import bible | addBibleVersesBatch() | ❌ Missing |
| CustomSlideEditor | New/edit slide | addCustomSlide() | ❌ Missing |
| DiagnosticsPanel | System health | health IPC | ⚠️ RuntimeInspector exists |
| AnalyticsDashboard | Usage stats | song_history | ❌ Missing |
| DeleteConfirmDialog | Delete song | deleteSong() | ⚠️ Uses browser confirm() |
| IntegrityCheckDialog | Check integrity | checkMultiHymnalIntegrity() | ❌ Missing UI |

---

## PART 6: OVERLAY SCREENS — COMPLETE ANALYSIS

### 6.1 Song Editor Screen

**File:** `SongEditorScreen.tsx`
**Trigger:** `setScreen('song-editor')` from any mode
**Backend:** `addSong()`, `updateSong()`

```
SongEditorScreen
├── Top bar (back button, title, save state, broadcast rack, actions)
├── Left panel: Metadata form
│   ├── Hymnal selector
│   ├── Song number
│   ├── Title (Indonesian)
│   ├── Alternate title
│   ├── English title
│   ├── Category
│   ├── Language
│   ├── Author
│   ├── Composer
│   ├── Key note
│   ├── Time signature
│   ├── Tempo
│   ├── Tags
│   ├── Theme
│   └── Scripture reference
├── Center panel: Lyrics editor (textarea)
│   ├── Toolbar (format helpers)
│   └── Live preview
└── Right panel: Preview / Atmosphere
    ├── Slide preview
    └── Background config
```

**Issues:**
1. Broadcast rack shows live status indicators — good, but "LIVE" state is hardcoded display
2. No autosave — only manual save
3. No version history
4. No lyrics format validation
5. No duplicate detection before save

### 6.2 Settings Screen

**File:** `SettingsScreen.tsx`
**Trigger:** `setScreen('settings')` or Settings button
**Backend:** `getSettings()`, `updateSetting()`

**Sections:**
| Section | Key | Backend | Status |
|---|---|---|---|
| Display | display | getAll displays, settings | ✅ |
| Buku Lagu | hymnals | getHymnals, CRUD | ✅ |
| Tampilan | appearance | updateSetting (theme) | ✅ |
| Tema & Font | theme | updateSetting (projection theme) | ✅ |
| Background | background | updateSetting (bg image/video) | ✅ |
| Keyboard | shortcuts | Static display | ✅ |
| Backup | backup | createBackup, restoreBackup, reseed | ✅ |
| Tentang | about | Static | ✅ |

**Issues:**
1. Settings is a separate full-screen overlay — should be accessible as a panel/modal too
2. No search within settings (sidebar search exists but only filters nav items)
3. Reseed Database in Backup section — uses `window.confirm()` not a proper dialog
4. No import/export of settings
5. No settings sync across sessions (settings are in DB, but no cloud sync)

### 6.3 Import/Export Screen

**File:** `ImportExportScreen.tsx`
**Trigger:** `setScreen('import-export')` or File > Import/Export
**Backend:** `parseExcel()`, `importSongsFromJson()`, `writeJson()`

**Detected capabilities:**
- Excel import (XLSX, max 10MB, max 5000 rows)
- JSON import (with conflict policy: skip/overwrite/append)
- JSON export (full library or filtered)
- Dry run mode for JSON import

**Issues:**
1. No progress indicator for large imports
2. No import history/log display
3. No per-row conflict resolution UI (only global policy)
4. No CSV support
5. No import from URL

### 6.4 Bible Screen

**File:** `BibleScreen.tsx`
**Trigger:** `setScreen('bible')` (no menu entry — dead navigation)
**Backend:** `getBibleTranslations()`, `getBibleBooks()`, `getBibleVerses()`, `searchBibleVerses()`

**Issues:**
1. **No menu entry** — BibleScreen is unreachable from any menu or button in the current UI
2. Bible projection not integrated into Projection Mode
3. No way to add Bible translations from UI (IPC exists)

### 6.5 Welcome Screen / Onboarding

**File:** `WelcomeScreen.tsx`
**Trigger:** `isFirstInstall === true` (persisted in localStorage)
**Backend:** `finishOnboarding()` in useModeStore

**Detected phases (from App.tsx comments):**
- IntroPhase (splash handled by onboarding)
- Theme selection
- Mode selection
- Completion

---

## PART 7: MODAL & DIALOG SYSTEM — COMPLETE AUDIT

### 7.1 Existing Modals/Overlays

| Component | Type | Trigger | Status |
|---|---|---|---|
| CommandPalette | Full overlay | Ctrl+P | ✅ Functional |
| KeyboardCheatSheet | Modal | ? key | ✅ Functional |
| QuickJumpOverlay | Floating panel | Ctrl+J | ✅ Functional |
| RuntimeInspector | Side panel | Ctrl+Shift+I | ✅ Functional |
| Toast | Notification | showToast() | ✅ Functional |
| TitleBarMenu dropdowns | Dropdown | Click menu item | ✅ Functional |
| TitleBarModeSwitcher | Dropdown | Click mode | ✅ Functional |
| SongContextMenu | Context menu | Right-click | ⚠️ Partial |
| NewHymnalDialog | Inline modal | Management Mode | ✅ Functional |
| BulkBackgroundDialog | Inline modal | Management Mode | ✅ Functional |

### 7.2 Missing Modals (Required for Production)

| Modal | Priority | Backend | Description |
|---|---|---|---|
| CreatePlaylistDialog | 🔴 Critical | addPlaylist() | Create new worship playlist |
| PlaylistPickerDialog | 🔴 Critical | getPlaylists() | Select/switch active playlist |
| AddToPlaylistDialog | 🔴 Critical | addPlaylistItem() | Add song to specific playlist |
| DeleteConfirmDialog | 🔴 Critical | deleteSong/Hymnal/etc | Replace browser confirm() |
| SongRelationsModal | 🟡 High | getSongRelations() | View/manage song relations |
| BiblePickerDialog | 🟡 High | getBibleVerses() | Select Bible verse for projection |
| AnnouncementEditor | 🟡 High | addCustomSlide() | Create/edit custom slides |
| MediaImportDialog | 🟡 High | importMediaAssets() | Import media files |
| IntegrityCheckDialog | 🟡 High | checkMultiHymnalIntegrity() | DB integrity report |
| SceneConfigDialog | 🟡 High | atmosphereStore | Configure scene presets |
| NotificationPanel | 🟡 High | New system | App notifications |
| DuplicateSongDialog | 🟠 Medium | addSong() | Duplicate a song |
| ExportSongDialog | 🟠 Medium | writeJson() | Export single song |
| SongHistoryPanel | 🟠 Medium | getRecentSongs() | Song play history |
| AnalyticsDashboard | 🟠 Medium | song_history | Usage analytics |
| TagManagerDialog | 🟠 Medium | Client-side | Manage tags/categories |
| HymnalIntegrityDialog | 🟠 Medium | checkMultiHymnalIntegrity() | Per-hymnal integrity |
| ImportProgressDialog | 🟠 Medium | importSongsFromJson() | Import progress + report |
| BackupProgressDialog | 🟠 Medium | createBackup() | Backup progress |
| EmergencyControlPanel | 🟠 Medium | projection IPC | Panic/emergency controls |

### 7.3 Modal Design Standards

All modals MUST follow these standards:

```
Modal Structure:
├── Backdrop (rgba overlay, click to dismiss for non-critical)
├── Modal Container
│   ├── Header
│   │   ├── Icon (contextual)
│   │   ├── Title
│   │   ├── Subtitle/description
│   │   └── Close button (X)
│   ├── Body (scrollable if needed)
│   │   ├── Content
│   │   └── Form fields (if applicable)
│   └── Footer
│       ├── Secondary action (Cancel/Back)
│       └── Primary action (Confirm/Save/Create)
└── Loading state overlay (spinner + message)

Accessibility:
- Focus trap within modal
- Escape key closes modal
- ARIA role="dialog", aria-modal="true"
- aria-labelledby pointing to title
- First focusable element receives focus on open
- Return focus to trigger on close

States:
- Default
- Loading (form submission)
- Error (validation errors shown inline)
- Success (brief success state before close)
- Destructive (red primary button for delete actions)
```

---

## PART 8: UNIFIED DESIGN SYSTEM — SPECIFICATION

### 8.1 Design Language

**Target Aesthetic:** Ultra-premium dark desktop software
- Adobe Creative Cloud quality
- ProPresenter professionalism
- Linear.app precision
- Broadcast control system aesthetic

**Core Visual Principles:**
1. Deep navy/graphite base (`#0d0f17` → `#151826` → `#1b2031`)
2. Glassmorphism surfaces with backdrop-blur
3. Thin luminous borders (`rgba(255,255,255,0.06-0.12)`)
4. Soft blue ambient glow (`rgba(59,130,246,0.08-0.25)`)
5. Layered depth through shadow system
6. Elegant floating cards with subtle gradients

### 8.2 Design Tokens (Current — Confirmed from main.css)

```css
/* Surface Colors */
--color-bg-base:          #0d0f17   /* Deepest background */
--color-bg-surface:       #151826   /* Card/panel background */
--color-bg-elevated:      #1b2031   /* Elevated surfaces */
--color-bg-elevated-hover:#23293f   /* Hover state */
--color-bg-active:        #2d3450   /* Active/selected */

/* Brand Colors */
--color-brand-primary:    #3b82f6   /* Blue — primary actions */
--color-brand-secondary:  #8b5cf6   /* Violet — secondary */
--color-brand-accent:     #f59e0b   /* Amber — accent/warning */
--color-accent:           #38bdf8   /* Cyan — highlights */

/* Live/Broadcast Colors */
--color-live-red:         #ff3b30   /* LIVE indicator */
--color-live-green:       #34c759   /* Active/connected */
--color-program:          #ff3b30   /* Program output */
--color-preview:          #34c759   /* Preview output */
--color-next-blue:        #38bdf8   /* NEXT state */

/* Text */
--color-text-primary:     #f8fafc
--color-text-secondary:   #94a3b8
--color-text-muted:       #64748b
--color-text-disabled:    #475569

/* Typography */
--font-heading: 'Poppins', system-ui, sans-serif
--font-ui:      'Inter', system-ui, sans-serif
```

### 8.3 Component Library — Required Components

**Atoms:**
```
Button          — primary, secondary, ghost, danger, icon-only
                  sizes: sm, md, lg
                  states: default, hover, active, disabled, loading
Badge           — status, count, label
                  variants: success, warning, error, info, neutral
Input           — text, search, number
                  states: default, focus, error, disabled
Select          — native + custom dropdown
Checkbox        — default, indeterminate, disabled
Toggle          — on/off switch
Tooltip         — hover tooltip with delay
Kbd             — keyboard shortcut display
Spinner         — loading indicator
Avatar          — user/operator avatar
Divider         — horizontal separator
```

**Molecules:**
```
SearchInput     — icon + input + clear button + kbd hint
StatusBadge     — dot + label (published/draft/review/archived)
MetricCard      — icon + label + value + trend + mini bars
SongArtwork     — gradient card with hymnal code + number
ActionButton    — icon + label button (management actions)
SegmentedControl — tab-like filter buttons
ContextMenu     — right-click menu with keyboard nav
Dropdown        — floating dropdown with search
FormField       — label + input + error message
```

**Organisms:**
```
TitleBar        — complete title bar system
Sidebar         — collapsible navigation sidebar
CommandBar      — search + filters + actions toolbar
DataTable       — sortable, filterable, selectable table
SongCard        — song media card (library view)
NumberTile      — compact number tile (number view)
RundownRow      — playlist item row
InspectorPanel  — right-side detail panel
Modal           — base modal with header/body/footer
ConfirmDialog   — destructive action confirmation
Toast           — notification toast
EmptyState      — empty state with icon + message + action
```

### 8.4 Interaction Standards

**Hover States:**
```css
/* Standard hover: lift + border glow */
transform: translateY(-1px);
border-color: rgba(59, 130, 246, 0.25);
background: rgba(59, 130, 246, 0.08);
transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
```

**Focus States:**
```css
/* Keyboard focus: ring */
outline: 2px solid rgba(59, 130, 246, 0.6);
outline-offset: 2px;
```

**Active/Selected States:**
```css
/* Selected row/card */
border-color: rgba(59, 130, 246, 0.24);
background: linear-gradient(90deg, rgba(37,99,235,0.18), rgba(59,130,246,0.06));
box-shadow: 0 0 0 1px rgba(59,130,246,0.08), 0 18px 44px rgba(37,99,235,0.12);
/* Left accent bar */
::before { width: 3px; background: var(--color-brand-primary); }
```

**Loading States:**
```css
/* Skeleton loading */
background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
animation: skeleton-shimmer 1.5s infinite;
```

**Error States:**
```css
border-color: rgba(239, 68, 68, 0.4);
background: rgba(239, 68, 68, 0.06);
color: #fca5a5;
```

**Success States:**
```css
border-color: rgba(16, 185, 129, 0.4);
background: rgba(16, 185, 129, 0.06);
color: #6ee7b7;
```

### 8.5 Animation System

```css
/* Page transitions */
--ease-premium: cubic-bezier(0.22, 1, 0.36, 1);
--duration-slow: 300ms;

/* Micro-interactions */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 150ms;

/* Spring animations (Framer Motion) */
type: "spring", stiffness: 400, damping: 30

/* Mode transitions (AnimatePresence) */
initial: { opacity: 0 }
animate: { opacity: 1 }
exit: { opacity: 0 }
transition: { duration: 0.5 }
```

### 8.6 Layout Grid System

```
Application Shell:
├── TitleBar: 40px fixed height
├── Content Area: flex-1 (fills remaining height)
│   ├── Sidebar: 220-280px (collapsible to 64px icon-only)
│   ├── Main: flex-1 (fills remaining width)
│   └── Inspector: 320-380px (collapsible)

Panel Sizing:
├── Sidebar: 240px default, 64px collapsed
├── Inspector: 320px default, 380px wide variant
├── Command Bar: 48-56px height
├── Table row: 56-66px height
├── Card: 180-220px height
├── Modal: 480-640px width, auto height

Spacing Scale (8pt grid):
├── xs: 4px
├── sm: 8px
├── md: 12px
├── lg: 16px
├── xl: 20px
├── 2xl: 24px
├── 3xl: 32px
└── 4xl: 40px
```

---

## PART 9: BACKEND VALIDATION — FUNCTIONAL COMPLETENESS AUDIT

### 9.1 IPC Handler Coverage

Every UI action must map to a real IPC handler. Audit result:

| UI Action | IPC Channel | Handler | Status |
|---|---|---|---|
| Load songs | db:get-songs | getSongs() | ✅ |
| Search songs | db:search-songs | searchSongs() (FTS5) | ✅ |
| Add song | db:add-song | addSong() | ✅ |
| Update song | db:update-song | updateSong() | ✅ |
| Delete song | db:delete-song | deleteSong() | ✅ |
| Toggle favorite | db:toggle-favorite | toggleFavorite() | ✅ |
| Import JSON | db:import-json | importSongsFromJson() | ✅ |
| Import Excel | file:parse-excel | xlsx parse | ✅ |
| Bulk background | db:bulk-assign-song-background | bulkAssignSongBackground() | ✅ |
| Load hymnals | db:get-hymnals | getHymnals() | ✅ |
| Add hymnal | db:add-hymnal | addHymnal() | ✅ |
| Update hymnal | db:update-hymnal | updateHymnal() | ✅ |
| Delete hymnal | db:delete-hymnal | deleteHymnal() | ✅ |
| Load playlists | db:get-playlists | getPlaylists() | ✅ |
| Add playlist | db:add-playlist | addPlaylist() | ✅ |
| Update playlist | db:update-playlist | updatePlaylist() | ✅ |
| Delete playlist | db:delete-playlist | deletePlaylist() | ✅ |
| Load playlist items | db:get-playlist-items | getPlaylistItems() | ✅ |
| Add playlist item | db:add-playlist-item | addPlaylistItem() | ✅ |
| Reorder playlist | db:reorder-playlist-items | reorderPlaylistItems() | ✅ |
| Get settings | db:get-settings | getSettings() | ✅ |
| Update setting | db:update-setting | updateSetting() | ✅ |
| Create backup | db:create-backup | createBackup() | ✅ |
| Restore backup | db:restore-backup | restoreBackup() | ✅ |
| Reseed DB | db:reseed | reseedDatabase() | ✅ |
| Get displays | display_get-all | getAllDisplays() | ✅ |
| Show projection | projection:show | showProjectionWindow() | ✅ |
| Hide projection | projection:hide | hideProjectionWindow() | ✅ |
| Slide update | projection:slide-update | updateSlideData() | ✅ |
| State change | projection:state-change | updateProjectionState() | ✅ |
| Theme update | projection:theme-update | updateTheme() | ✅ |
| Show stage | stage:show | showStageDisplayWindow() | ✅ |
| Hide stage | stage:hide | hideStageDisplayWindow() | ✅ |
| Get media assets | db:get-media-assets | getMediaAssets() | ✅ |
| Import media | db:import-media-assets | importMediaAssets() | ✅ |
| Update media | db:update-media-asset | updateMediaAsset() | ✅ |
| Delete media | db:delete-media-asset | deleteMediaAsset() | ✅ |
| Get collections | db:get-media-collections | getMediaCollections() | ✅ |
| Add collection | db:add-media-collection | addMediaCollection() | ✅ |
| Bible translations | db:get-bible-translations | getBibleTranslations() | ✅ |
| Bible books | db:get-bible-books | getBibleBooks() | ✅ |
| Bible verses | db:get-bible-verses | getBibleVerses() | ✅ |
| Search bible | db:search-bible-verses | searchBibleVerses() | ✅ |
| Custom slides | db:get-custom-slides | getCustomSlides() | ✅ |
| Add custom slide | db:add-custom-slide | addCustomSlide() | ✅ |
| Slide groups | db:get-slide-groups | getSlideGroups() | ✅ |
| Song relations | db:get-song-relations | getSongRelations() | ✅ |
| Add relation | db:add-song-relation | addSongRelation() | ✅ |
| Log history | db:log-history | logSongHistory() | ✅ |
| Recent songs | db:get-recent-songs | getRecentSongs() | ✅ |
| Save session | db:save-session | saveSessionState() | ✅ |
| Recovery state | db:get-recovery-state | getRecoveryState() | ✅ |
| Mark clean exit | db:mark-clean-exit | markCleanExit() | ✅ |
| Integrity check | db:check-multi-hymnal-integrity | checkMultiHymnalIntegrity() | ✅ |
| Get memory | system:get-memory | process.getProcessMemoryInfo() | ✅ |
| Set mode | system:set-mode | window management | ✅ |
| IPC health | health:* | setupIPCHealth() | ✅ |
| **Duplicate song** | **None** | **None** | ❌ Missing |
| **Export single song** | **file:write-json** | **writeJson()** | ⚠️ Partial |
| **Clear media cache** | **None** | **None** | ❌ Missing |
| **Get storage stats** | **None** | **None** | ❌ Missing |
| **Notification system** | **None** | **None** | ❌ Missing |

### 9.2 State Management Validation

| Store | Persisted | Hydration | Issues |
|---|---|---|---|
| useAppStore | ❌ No | On mount (loadSongs, loadHymnals) | Songs lost on refresh (by design) |
| useModeStore | ✅ Yes (localStorage) | Automatic | currentMode, isFirstInstall, theme |
| useProjectionStore | ❌ No | On mount (IPC snapshot) | Projection state lost on refresh |
| usePlaylistStore | ❌ No | On mount (loadPlaylists) | Active playlist lost on refresh |
| useAtmosphereStore | ❌ No | From settings | OK |
| useAnnouncementStore | ❌ No | On demand | OK |
| useCacheStore | ❌ No | In-memory | OK |
| useHealthStore | ❌ No | IPC events | OK |
| usePanelLayoutStore | ❌ No | Default sizes | Panel sizes reset on refresh |

**Recommendation:** Persist `usePanelLayoutStore` and `usePlaylistStore.activePlaylist` to localStorage.

### 9.3 Crash Recovery System

**Existing implementation:**
- `saveSessionState()` — saves playlistId, songId, slideIndex, projectionState to `app_state`
- `getRecoveryState()` — reads recovery state on startup
- `markCleanExit()` — called on `window-all-closed`
- `useCrashRecovery` hook — reads recovery state and offers restore

**Gaps:**
1. Recovery state not saved on every slide change (only on explicit save)
2. No recovery UI shown to user (hook exists but no dialog)
3. Recovery only covers playlist/song/slide — not mode, theme, or panel layout

### 9.4 Security Validation

| Security Concern | Status | Notes |
|---|---|---|
| Context isolation | ✅ Enabled | `contextIsolation: true` |
| Node integration | ✅ Disabled | `nodeIntegration: false` |
| Web security | ✅ Enabled | `webSecurity: true` |
| Navigation prevention | ✅ | `will-navigate` blocked |
| External links | ✅ | `shell.openExternal` only |
| Excel file validation | ✅ | Size, extension, row/col limits |
| JSON import validation | ✅ | Size limit, field validation |
| Backup path validation | ✅ | Absolute path, .db extension |
| Reseed confirmation | ✅ | Token required |
| Destructive audit log | ✅ | `auditDestructiveAction()` |
| SQL injection | ✅ | Parameterized queries throughout |
| XSS | ✅ | React escaping + no dangerouslySetInnerHTML |
| Sandbox | ⚠️ | Optional via env var, not default |
| Webview tag | ✅ Disabled | `webviewTag: false` |

---

## PART 10: UX STANDARDS — INTERACTION QUALITY AUDIT

### 10.1 Navigation Consistency Audit

| Navigation Pattern | Library | Projection | Management | Settings | Status |
|---|---|---|---|---|---|
| Back button | ❌ (sidebar) | ❌ (mode switch) | ❌ (mode switch) | ✅ | Inconsistent |
| Breadcrumb | ❌ | ❌ | ❌ | ✅ | Only in Settings |
| Mode indicator | ✅ (pill) | ✅ (focus mode) | ✅ (eyebrow) | ❌ | Mostly consistent |
| Search | ✅ | ✅ | ✅ | ✅ | Consistent |
| Empty states | ✅ | ✅ | ✅ | N/A | Consistent |
| Loading states | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Partial |
| Error states | ⚠️ (toast) | ⚠️ (toast) | ⚠️ (toast) | ⚠️ (toast) | Toast only |
| Keyboard nav | ✅ | ✅ | ⚠️ | ⚠️ | Partial |

### 10.2 Accessibility Audit

| WCAG Criterion | Status | Notes |
|---|---|---|
| Color contrast (text) | ⚠️ | Some muted text may fail AA |
| Focus indicators | ⚠️ | Custom CSS, needs verification |
| Keyboard navigation | ⚠️ | Partial — menus have keyboard nav, grids don't |
| ARIA labels | ⚠️ | Some buttons missing aria-label |
| Screen reader | ❌ | Not tested |
| Reduced motion | ❌ | No `prefers-reduced-motion` support |
| Font size | ✅ | 11-14px base, readable |
| Touch targets | ✅ | 32-40px minimum |

### 10.3 Performance Considerations

| Area | Current | Recommendation |
|---|---|---|
| Song list rendering | ✅ Virtualized (@tanstack/react-virtual) | Good |
| Song search | ✅ FTS5 with BM25 ranking | Good |
| Image loading | ⚠️ No lazy loading | Add lazy loading |
| Media preview | ✅ mediaEngine preload | Good |
| Bundle size | Unknown | Run analysis |
| DB queries | ✅ Prepared statements | Good |
| IPC overhead | ✅ Minimal (direct handlers) | Good |
| Animation | ✅ Framer Motion (GPU) | Good |
| Memory | ⚠️ No cleanup on mode switch | Add cleanup |

### 10.4 Operator Workflow Analysis

**Worship Service Workflow (Primary Use Case):**

```
Pre-Service Preparation:
1. Open SION Media → Library Mode
2. Browse/search songs → select songs for service
3. Create new playlist (File > New Playlist)
4. Add songs to playlist (drag or + button)
5. Reorder playlist items
6. Switch to Projection Mode
7. Load playlist
8. Preview each song (cue in preview panel)
9. Configure backgrounds/atmosphere

During Service:
1. Operator in Projection Mode
2. Click song in playlist → loads slides in preview
3. Press Space/Enter → TAKE to live
4. Navigate slides with → / ←
5. Use B for black screen between songs
6. Use Esc to clear between sections
7. Switch to next song in playlist (Ctrl+→)
8. Use Quick Jump (Ctrl+J) for emergency navigation

Post-Service:
1. Press Esc → CLEAR
2. Hide projection window
3. Export playlist/report (future)
```

**Critical Workflow Gaps:**
1. Step 3 (Create playlist) — no dialog exists, must go to Management Mode
2. Step 4 (Add songs) — requires active playlist, no inline creation
3. Step 8 (Preview each song) — no batch preview mode
4. Step 9 (Configure backgrounds) — requires going to Settings

---

## PART 11: IMPLEMENTATION PRIORITY MATRIX

### 11.1 Critical Fixes (Must Fix — Breaks Core Workflow)

| # | Issue | File | Effort |
|---|---|---|---|
| 1 | Favorite button in Library Mode doesn't call toggleFavorite | LibraryModeRedesigned.tsx | XS |
| 2 | "New Playlist" in File menu has empty action | TitleBarMenu.tsx | S |
| 3 | Bible Screen unreachable (no menu entry) | TitleBarMenu.tsx | XS |
| 4 | Storage metric is hardcoded fake data | ManagementMode.tsx | S |
| 5 | Metric trend bars are hardcoded | ManagementMode.tsx | M |
| 6 | Theme button (Moon) opens nothing | TitleBar.tsx | S |
| 7 | Notifications button opens nothing | TitleBar.tsx | M |
| 8 | Layout toggle button has no action | ManagementMode.tsx | S |
| 9 | Filter button has no dropdown | ManagementMode.tsx | M |
| 10 | Inspector tabs "Chord" and "Notes" render nothing | Multiple | M |

### 11.2 High Priority (Should Fix — Improves Core UX)

| # | Feature | Effort | Backend Ready |
|---|---|---|---|
| 1 | CreatePlaylistDialog | M | ✅ addPlaylist() |
| 2 | DeleteConfirmDialog (replace browser confirm) | S | ✅ existing |
| 3 | SongContextMenu (right-click) | M | ✅ existing |
| 4 | HymnalFilterDropdown in Library Mode | S | ✅ getHymnals() |
| 5 | SongRelationsModal | M | ✅ getSongRelations() |
| 6 | IntegrityCheckDialog | M | ✅ checkMultiHymnalIntegrity() |
| 7 | AnnouncementPanel in Projection Mode | L | ✅ getCustomSlides() |
| 8 | BiblePickerDialog in Projection Mode | L | ✅ getBibleVerses() |
| 9 | Media Library management page | L | ✅ getMediaAssets() |
| 10 | Timer controls in title bar | S | ✅ projectionStore |

### 11.3 Medium Priority (Nice to Have — Enhances Quality)

| # | Feature | Effort | Backend Ready |
|---|---|---|---|
| 1 | Resizable panels in Projection Mode | M | ✅ react-resizable-panels |
| 2 | Drag-and-drop songs to playlist in Library Mode | M | ✅ @dnd-kit |
| 3 | Multi-select in Library Mode song grid | M | Client-side |
| 4 | Import progress dialog | M | ✅ importSongsFromJson() |
| 5 | Panel layout persistence | S | ✅ usePanelLayoutStore |
| 6 | Reduced motion support | S | CSS |
| 7 | Keyboard navigation in song grids | M | Client-side |
| 8 | Custom Slides management page | L | ✅ getCustomSlides() |
| 9 | Analytics dashboard | L | ✅ song_history |
| 10 | Notification system | L | New |

### 11.4 Low Priority (Future — Planned Features)

| # | Feature | Notes |
|---|---|---|
| 1 | Practice Tools | Metronome, key trainer |
| 2 | Chord Charts | Per-song chord display |
| 3 | Vocal Guide | Audio playback |
| 4 | Broadcast Studio | Streaming controls |
| 5 | AI Features | Lyric suggestions |
| 6 | Cloud Sync | Settings/library sync |
| 7 | Mobile companion app | Remote control |
| 8 | Multi-user support | Operator roles |
| 9 | Version history | Song edit history |
| 10 | Autosave | Song editor autosave |

---

## PART 12: SYSTEM ENGINEERING VALIDATION

### 12.1 Scalability Assessment

| Concern | Current State | Recommendation |
|---|---|---|
| Song count | FTS5 handles 10k+ songs | Good for 100k+ |
| Playlist size | No limit | Add soft limit (500 items) |
| Media assets | UUID-based, no limit | Add storage quota |
| Bible verses | Batch import supported | Good |
| Multi-hymnal | Fully supported | Good |
| Concurrent users | Single-user desktop | By design |
| DB size | WAL mode, checkpointing | Good |

### 12.2 Maintainability Assessment

| Concern | Current State | Score |
|---|---|---|
| Component modularity | Good — separate files per component | 8/10 |
| State management | Good — Zustand stores well-organized | 8/10 |
| IPC organization | Good — centralized in ipc-handlers.ts | 9/10 |
| Type safety | Good — TypeScript throughout | 8/10 |
| CSS organization | Mixed — some inline Tailwind, some CSS classes | 6/10 |
| Error handling | Good — safeIpcHandle wrapper | 8/10 |
| Logging | Good — logger utility | 7/10 |
| Testing | Minimal — vitest configured but few tests | 3/10 |
| Documentation | Good — JSDoc comments in key files | 7/10 |
| Dead code | Some — BroadcastMode stub, old LibraryMode.tsx | 6/10 |

### 12.3 Fail-Safe Operation

| Scenario | Current Handling | Status |
|---|---|---|
| DB corruption | Legacy backup on schema mismatch | ✅ |
| Crash recovery | saveSessionState + getRecoveryState | ✅ |
| Clean exit | markCleanExit() on window-all-closed | ✅ |
| IPC failure | safeIpcHandle catches + logs | ✅ |
| Render crash | ErrorBoundary component | ✅ |
| Projection window crash | Recreated on next show | ✅ |
| Network loss | Offline-first (local DB) | ✅ |
| Large import | Timeout + size limits | ✅ |
| Concurrent DB writes | WAL mode + transactions | ✅ |
| Memory leak | No cleanup on mode switch | ⚠️ |

### 12.4 Component Reusability Audit

**Well-reused components:**
- `Surface` — used throughout ManagementMode
- `IconButton` — used throughout ManagementMode
- `StatusBadge` — used in song table
- `LibraryArtwork` — used in Library Mode
- Design system components (EditorShell, SurfacePanel, etc.)

**Components that should be extracted:**
- `DeleteConfirmDialog` — currently browser `confirm()` everywhere
- `MetadataTable` — duplicated in Library Inspector and Projection SongInfoPanel
- `SongArtwork` — similar to LibraryArtwork but different implementation
- `EmptyState` — exists in design-system but not used consistently
- `SearchInput` — duplicated across modes

---

## PART 13: COMPLETE PAGE & WORKFLOW REGISTRY

### 13.1 All Pages (Complete List)

| Page | Route/Trigger | Mode | Backend | Status |
|---|---|---|---|---|
| SplashScreen | App startup | — | isLoading | ✅ |
| WelcomeScreen | isFirstInstall | — | useModeStore | ✅ |
| LibraryMode | currentMode=LIBRARY | LIBRARY | songs, hymnals, playlists | ✅ |
| ProjectionMode | currentMode=PROJECTION | PROJECTION | projectionStore, playlists | ✅ |
| ManagementMode | currentMode=MANAGEMENT | MANAGEMENT | songs, hymnals, media | ✅ |
| BroadcastMode | currentMode=BROADCAST | BROADCAST | None (stub) | ⚠️ |
| SongEditorScreen | currentScreen=song-editor | Overlay | songs CRUD | ✅ |
| SettingsScreen | currentScreen=settings | Overlay | settings, hymnals | ✅ |
| ImportExportScreen | currentScreen=import-export | Overlay | songs import/export | ✅ |
| BibleScreen | currentScreen=bible | Overlay | bible CRUD | ⚠️ (unreachable) |
| ProjectionApp | projection.html | Window | projection IPC | ✅ |
| StageDisplayApp | stageDisplay.html | Window | projection IPC | ✅ |

### 13.2 All Workflows (Complete List)

| Workflow | Entry Point | Steps | Status |
|---|---|---|---|
| Add new song | Management > + Lagu Baru | Open editor → fill form → save | ✅ |
| Edit song | Management > Edit / Library > Edit Info | Open editor → modify → save | ✅ |
| Delete song | Management > Delete | Confirm → delete → reload | ⚠️ (browser confirm) |
| Import songs (Excel) | Import/Export screen | Select file → parse → review → import | ✅ |
| Import songs (JSON) | Import/Export screen | Select file → parse → set policy → import | ✅ |
| Export library | Management > Export Data | Select path → write JSON | ✅ |
| Create playlist | File > New Playlist | ❌ No dialog | ❌ |
| Add song to playlist | Library > + / Projection > + | Select playlist → add | ⚠️ (requires active playlist) |
| Reorder playlist | Projection > PlaylistPanel | Drag items | ✅ |
| Present song | Projection Mode | Select song → cue → TAKE | ✅ |
| Navigate slides | Projection Mode | → / ← / Space | ✅ |
| Black screen | Projection Mode | B key / button | ✅ |
| Freeze screen | Projection Mode | F key / button | ✅ |
| Clear screen | Projection Mode | Esc / button | ✅ |
| Quick jump | Projection Mode | Ctrl+J | ✅ |
| Add hymnal | Settings > Buku Lagu / Management | Fill form → save | ✅ |
| Configure theme | Settings > Tema & Font | Adjust settings → apply | ✅ |
| Configure background | Settings > Background | Select image/video → apply | ✅ |
| Backup database | File > Backup / Settings > Backup | Select path → backup | ✅ |
| Restore database | Settings > Backup | Select file → restore | ✅ |
| Reseed database | Settings > Backup / Tools > Reseed | Confirm → reseed | ✅ |
| Toggle favorite | Library > ★ button | Click → toggle | ⚠️ (button broken) |
| Search songs | Any mode | Type in search | ✅ |
| Switch mode | TitleBar ModeSwitcher | Click → select mode | ✅ |
| Show projection | Projection menu / button | projection:show | ✅ |
| Show stage display | View > Stage Display | stage:show | ✅ |
| Onboarding | First install | Welcome screen flow | ✅ |
| Crash recovery | App startup after crash | Recovery dialog | ⚠️ (hook exists, no UI) |
| Integrity check | Tools menu | checkMultiHymnalIntegrity | ⚠️ (IPC exists, no UI) |
| Bible projection | Bible screen | ❌ Unreachable | ❌ |
| Custom slide projection | Announcement panel | ❌ No panel | ❌ |
| Media management | Management > Media | ❌ No page | ❌ |

---

## PART 14: REDESIGN SPECIFICATIONS — ACTIONABLE IMPLEMENTATION GUIDE

### 14.1 Title Bar — Implementation Spec

**File to modify:** `src/renderer/src/components/titlebar/TitleBarMenu.tsx`

**Changes required:**

1. **Add Media menu** (always visible):
```typescript
{
  id: 'media',
  label: 'Media',
  items: [
    { label: 'Import Media Assets...', action: () => { /* open media import dialog */ } },
    { label: 'Open Media Library', action: () => setMode('MANAGEMENT') },
    { separator: true },
    { label: 'New Collection...', action: () => { /* open collection dialog */ } },
  ]
}
```

2. **Add Window menu** (always visible):
```typescript
{
  id: 'window',
  label: 'Window',
  items: [
    { label: 'Minimize', shortcut: 'Ctrl+M', action: () => window.api.window.minimize() },
    { label: 'Maximize', action: () => window.api.window.maximize() },
    { separator: true },
    { label: 'Show Projection Window', action: () => { window.api.projection.show(); appStore.setProjectionVisible(true) } },
    { label: 'Hide Projection Window', action: () => { window.api.projection.hide(); appStore.setProjectionVisible(false) } },
    { label: 'Show Stage Display', action: () => window.api.stage.show() },
    { label: 'Hide Stage Display', action: () => window.api.stage.hide() },
  ]
}
```

3. **Wire "New Playlist" in File menu:**
```typescript
{ label: 'New Playlist', shortcut: 'Ctrl+N', action: () => document.dispatchEvent(new CustomEvent('sion:create-playlist')) }
```

4. **Add Bible to View menu:**
```typescript
{ label: 'Bible', shortcut: 'Ctrl+B', action: () => setScreen('bible') }
```

5. **Add mode shortcuts to View menu:**
```typescript
{ label: 'Library Mode', shortcut: 'Ctrl+1', action: () => setMode('LIBRARY') },
{ label: 'Projection Mode', shortcut: 'Ctrl+2', action: () => setMode('PROJECTION') },
{ label: 'Management Mode', shortcut: 'Ctrl+3', action: () => setMode('MANAGEMENT') },
```

**File to modify:** `src/renderer/src/components/titlebar/TitleBar.tsx`

**Changes required:**

1. **Wire Theme button:**
```typescript
// Replace Moon button with:
<button onClick={() => {
  const modes: AppThemeMode[] = ['dark', 'light', 'system']
  const current = useModeStore.getState().theme
  const next = modes[(modes.indexOf(current) + 1) % modes.length]
  useModeStore.getState().setTheme(next)
}} title={`Theme: ${theme}`}>
  {theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <SunMoon size={14} />}
</button>
```

2. **Wire Notifications button:**
```typescript
// Add notification store and panel
<button onClick={() => setShowNotifications(true)} title="Notifications">
  <Bell size={14} />
  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
</button>
```

### 14.2 Library Mode — Implementation Spec

**File to modify:** `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`

**Fix 1: Wire favorite button in SongMediaCard:**
```typescript
// Current (broken):
<button onClick={(event) => { event.stopPropagation() }} ...>

// Fixed:
<button
  onClick={async (event) => {
    event.stopPropagation()
    try {
      await window.api.songs.toggleFavorite(song.id)
      await loadSongs(selectedHymnalId || undefined)
    } catch (err) {
      showToast('Gagal mengubah favorit', 'error')
    }
  }}
  className={song.is_favorite === 1 ? 'is-favorite' : ''}
  title="Favorit"
>
  <Star size={15} fill={song.is_favorite === 1 ? 'currentColor' : 'none'} />
</button>
```

**Fix 2: Add CreatePlaylistDialog:**
```typescript
// Add state:
const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)

// Listen for event from title bar:
useEffect(() => {
  const handler = () => setShowCreatePlaylist(true)
  document.addEventListener('sion:create-playlist', handler)
  return () => document.removeEventListener('sion:create-playlist', handler)
}, [])

// Add dialog component (see CreatePlaylistDialog spec below)
```

**Fix 3: Add hymnal filter to command bar:**
```typescript
// Add hymnal selector dropdown to command bar
<select
  value={selectedHymnalId ?? ''}
  onChange={(e) => setSelectedHymnalId(Number(e.target.value) || null)}
  className="library-pro-hymnal-select"
>
  <option value="">Semua Buku Lagu</option>
  {hymnals.map(h => (
    <option key={h.id} value={h.id}>{h.name}</option>
  ))}
</select>
```

**Fix 4: Add SongContextMenu (right-click):**
```typescript
// Add to SongMediaCard and NumberTile:
onContextMenu={(e) => {
  e.preventDefault()
  setContextMenuSong(song)
  setContextMenuPos({ x: e.clientX, y: e.clientY })
}}
```

### 14.3 Projection Mode — Implementation Spec

**File to modify:** `src/renderer/src/screens/modes/ProjectionMode.tsx`

**Fix 1: Wire SongInfoPanel "Lirik" tab:**
```typescript
// Add lyrics tab content:
{activeTab === 'lirik' && activeSong && (
  <div className="projection-lyrics-panel">
    <pre className="projection-lyrics-text">{activeSong.lyrics_raw}</pre>
  </div>
)}
```

**Fix 2: Add timer display to Projection Mode:**
```typescript
// Add to SongInfoPanel or as separate panel:
const { timerElapsed, timerRunning, timerStart, timerStop, timerReset } = useProjectionStore()
const timerDisplay = `${Math.floor(timerElapsed / 60).toString().padStart(2, '0')}:${(timerElapsed % 60).toString().padStart(2, '0')}`
```

**Fix 3: Add resizable panels:**
```typescript
// Wrap bottom workspace in react-resizable-panels:
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

<PanelGroup direction="horizontal">
  <Panel defaultSize={25} minSize={20}><SongLibraryPanel /></Panel>
  <PanelResizeHandle />
  <Panel defaultSize={40} minSize={30}><PlaylistPanel /></Panel>
  <PanelResizeHandle />
  <Panel defaultSize={35} minSize={25}><SongInfoPanel /></Panel>
</PanelGroup>
```

### 14.4 Management Mode — Implementation Spec

**File to modify:** `src/renderer/src/screens/modes/ManagementMode.tsx`

**Fix 1: Replace hardcoded storage metric:**
```typescript
// Add real storage calculation:
useEffect(() => {
  window.api.system.getMemory().then(mem => {
    if (mem) setMemoryInfo(mem as { private: number; shared: number })
  })
}, [])

// Replace hardcoded metric:
{
  label: 'Memori',
  value: memoryInfo ? `${Math.round(memoryInfo.private / 1024)} MB` : '...',
  meta: 'private memory usage',
  // ...
}
```

**Fix 2: Wire layout toggle button:**
```typescript
const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

// Wire button:
<IconButton title="Toggle layout" onClick={() => setViewMode(v => v === 'table' ? 'grid' : 'table')}>
  {viewMode === 'table' ? <Grid2X2 size={16} /> : <List size={16} />}
</IconButton>
```

**Fix 3: Replace browser confirm() with DeleteConfirmDialog:**
```typescript
// Add state:
const [deleteTarget, setDeleteTarget] = useState<Song | null>(null)

// Replace confirm():
const handleDeleteSong = (song: Song) => setDeleteTarget(song)

// Add dialog:
{deleteTarget && (
  <DeleteConfirmDialog
    title={`Hapus "${deleteTarget.number} - ${deleteTarget.title}"?`}
    description="Tindakan ini tidak dapat dibatalkan."
    onConfirm={async () => {
      await window.api.songs.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadSongs(selectedHymnalId || undefined)
      showToast('Lagu berhasil dihapus', 'success')
    }}
    onCancel={() => setDeleteTarget(null)}
  />
)}
```

**Fix 4: Add Management Mode sidebar navigation:**
```typescript
type ManagementSection = 'songs' | 'hymnals' | 'media' | 'bible' | 'slides' | 'playlists' | 'settings' | 'backup' | 'diagnostics' | 'analytics' | 'about'

const [activeSection, setActiveSection] = useState<ManagementSection>('songs')
```

### 14.5 New Components Required

**CreatePlaylistDialog:**
```typescript
interface CreatePlaylistDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (playlist: Playlist) => void
}

// Fields: name (required), service_date, description
// Backend: window.api.playlists.add()
// Validation: name required, date format
```

**DeleteConfirmDialog:**
```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel?: string  // default: "Hapus"
  onConfirm: () => Promise<void>
  onCancel: () => void
}
// Danger variant: red primary button
// Loading state during deletion
```

**SongRelationsModal:**
```typescript
interface SongRelationsModalProps {
  isOpen: boolean
  song: Song
  onClose: () => void
}
// Shows: related songs list
// Actions: add relation, remove relation
// Backend: getSongRelations(), addSongRelation(), deleteSongRelation()
```

**MediaLibraryPage (Management section):**
```typescript
// Grid view of media assets
// Filter by type (image/video), category, collection
// Actions: import, delete, edit metadata, add to collection
// Backend: getMediaAssets(), importMediaAssets(), updateMediaAsset(), deleteMediaAsset()
```

**AnnouncementPanel (Projection Mode):**
```typescript
// Panel showing custom slides
// Filter by type (announcement/liturgy/welcome/offering/custom)
// Click to cue slide for projection
// Backend: getCustomSlides(), getSlidesByType()
```

---

## PART 15: FINAL PRODUCTION READINESS CHECKLIST

### 15.1 Before v1.0 Release

**Critical (Blockers):**
- [ ] Fix favorite button in Library Mode
- [ ] Wire "New Playlist" in File menu (CreatePlaylistDialog)
- [ ] Make Bible Screen reachable (add to View menu)
- [ ] Replace all browser `confirm()` with DeleteConfirmDialog
- [ ] Fix hardcoded storage metric
- [ ] Wire Theme button in title bar
- [ ] Add Media menu to title bar
- [ ] Add Window menu to title bar

**High Priority:**
- [ ] Add SongContextMenu (right-click)
- [ ] Add hymnal filter to Library Mode
- [ ] Wire SongInfoPanel "Lirik" tab in Projection Mode
- [ ] Add resizable panels to Projection Mode
- [ ] Add timer controls to title bar
- [ ] Add CreatePlaylistDialog
- [ ] Add SongRelationsModal
- [ ] Add IntegrityCheckDialog UI

**Quality:**
- [ ] Add `prefers-reduced-motion` CSS support
- [ ] Add ARIA labels to all icon-only buttons
- [ ] Add keyboard navigation to song grids
- [ ] Add loading skeletons (replace empty states during load)
- [ ] Persist panel layout sizes
- [ ] Add crash recovery dialog UI

### 15.2 Post-v1.0 Roadmap

**v1.1 — Content Operations:**
- Media Library management page
- Custom Slides management page
- Bible management page
- Announcement Panel in Projection Mode
- Bible Picker in Projection Mode

**v1.2 — Workflow Enhancement:**
- Drag-and-drop songs to playlist in Library Mode
- Multi-select in Library Mode
- Import progress dialog
- Analytics dashboard
- Notification system

**v1.3 — Advanced Features:**
- Practice Tools (metronome, key trainer)
- Chord Charts
- Scene configuration UI
- Lower thirds / overlay system
- Confidence monitor display in operator UI

**v2.0 — Platform:**
- Cloud sync
- Multi-user support
- Mobile companion app
- AI features
- Broadcast Studio

---

## APPENDIX A: DESIGN SYSTEM CSS CLASSES (Current)

### A.1 Management Mode Classes
```
.management-studio          — root container
.management-studio__shell   — inner layout
.management-studio__header  — page header
.management-studio__actions — action buttons row
.management-summary-grid    — 6-column metric grid
.management-summary-card    — individual metric card
.management-workspace-grid  — 2-column main layout
.management-command-bar     — filter/search toolbar
.management-browser         — song list panel
.management-browser__row    — song table row
.management-inspector       — right detail panel
.management-action          — action button
.management-action--primary — primary action button
.management-segmented       — segmented control
.management-select          — select dropdown
.management-search          — search input wrapper
```

### A.2 Library Mode Classes
```
.library-pro-shell          — root container
.library-pro-sidebar        — left navigation
.library-pro-nav            — nav group container
.library-pro-main           — main content area
.library-pro-command-bar    — top command bar
.library-pro-search         — search input
.library-pro-overview       — stats overview section
.library-pro-stat-grid      — stat cards grid
.library-pro-stat-card      — individual stat card
.library-pro-browser        — content browser
.library-pro-song-grid      — song card grid
.library-pro-song-card      — individual song card
.library-pro-number-grid    — number tiles grid
.library-pro-number-tile    — individual number tile
.library-pro-inspector      — right inspector panel
.library-pro-meta-table     — metadata key-value table
.library-pro-playlist-workspace — playlist view
.library-pro-rundown-row    — playlist item row
```

### A.3 Song Studio Classes
```
.song-studio                — root container
.song-studio__topbar        — top action bar
.song-studio__back-button   — back navigation
.song-studio__primary-action — primary save button
.song-studio__ghost-action  — secondary action button
.song-studio__broadcast-rack — live status indicators
.song-studio__rack-cell     — individual status cell
```

### A.4 Settings Classes
```
.settings-shell             — root container
.settings-header            — top header
.settings-sidebar           — left navigation
.settings-sidebar__item     — nav item
.settings-content           — main content area
```

---

*Document generated by SION Media Enterprise Redesign System v1.0*
*Analysis based on complete source code review — May 2026*
*All findings are based on actual code, not assumptions.*
