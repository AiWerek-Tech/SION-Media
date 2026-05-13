# Library Lyrics Viewer Implementation

> **Created**: 2026-05-13
> **Purpose**: Dokumentasi implementasi Library Lyrics Viewer - fullscreen immersive lyrics display component

---

## Ringkasan

Library Lyrics Viewer adalah komponen baru untuk menampilkan lirik lagu dalam mode fullscreen dengan tampilan immersive. Komponen ini dirancang untuk memberikan pengalaman membaca lirik yang nyaman dengan dukungan atmosphere background, navigasi slide, dan kontrol interaktif.

---

## Fitur Utama

### 1. **Immersive Fullscreen Display**
- Tampilan lirik fullscreen dengan background atmosphere (gradient, image, video)
- Animasi smooth untuk transisi antar slide
- Auto-hide UI untuk pengalaman reading yang fokus

### 2. **Lyrics Parsing & Rendering**
- Parsing lirik dari format text dengan section labels (VERSE, CHORUS, BRIDGE, dll)
- Splitting lirik menjadi pages dengan chorus yang berulang
- Adaptive font size berdasarkan jumlah baris lirik
- Chorus display dalam container terpisah dengan styling khusus

### 3. **Atmosphere Background Support**
- Support untuk solid color, gradient, image, dan video background
- Integration dengan global atmosphere settings
- Per-song atmosphere configuration
- Overlay dim, glow, dan text shield untuk readability
- Blur behind lyrics untuk kontras yang lebih baik

### 4. **Navigation & Controls**
- Keyboard shortcuts (Arrow keys, Space, Escape, Page Up/Down, Home, End)
- Mouse navigation dengan slide indicators di sisi kanan
- Auto-scroll feature untuk lirik panjang
- Song navigation (previous/next song)

### 5. **UI Controls**
- Title bar dengan window controls (minimize, maximize, close)
- Top bar dengan song metadata (number, title, key, tempo, composer, category)
- Bottom footer dengan navigation controls
- Slide indicators dengan visual feedback
- Font size adjustment (+/-)

### 6. **Responsive Design**
- Adaptive font size berdasarkan jumlah baris lirik
- Responsive layout untuk berbagai ukuran layar
- Auto-hide UI system untuk immersive experience
- Hover zones untuk window controls

---

## File Location

**Component**: `src/renderer/src/components/library/LibraryLyricsViewer.tsx`

---

## Props Interface

```typescript
interface LibraryLyricsViewerProps {
  song: Song
  onClose: () => void
  onNextSong?: () => void
  onPrevSong?: () => void
}
```

---

## State Management

### Local State
- `index`: Current slide index
- `fontSize`: Font size untuk lirik (disimpan di localStorage)
- `autoScroll`: Auto-scroll status
- `settings`: Global settings dari database
- `mediaAssets`: Media assets untuk atmosphere
- `isMaximizedLocal`: Window maximize state
- `isUiVisible`: UI visibility state (auto-hide)
- `isWindowControlsVisible`: Window controls visibility (hover-triggered)

### Store Integration
- `setLyricsFullscreen`: Set lyrics fullscreen state
- `setMaximized`: Set window maximize state

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close viewer |
| `Space` | Toggle auto-scroll |
| `ArrowRight` / `ArrowDown` / `PageDown` | Next slide |
| `ArrowLeft` / `ArrowUp` / `PageUp` | Previous slide |
| `Home` | Go to first slide |
| `End` | Go to last slide |
| `Equal` / `NumpadAdd` | Increase font size |
| `Minus` / `NumpadSubtract` | Decrease font size |

---

## Lyrics Parsing Logic

### Block Parsing
- Parse lirik raw menjadi blocks berdasarkan section labels `[VERSE]`, `[CHORUS]`, dll
- Split blocks berdasarkan separator `---`
- Normalize empty lines dan whitespace

### Stanza Splitting
- Split lines menjadi stanzas berdasarkan empty lines
- Filter empty stanzas

### Page Building
- Identify chorus blocks (label mengandung "reff", "chorus", "ref")
- Extract chorus text untuk display berulang
- Build pages dengan verse dan chorus
- Normalize section labels (VERSE, CHORUS, BRIDGE, INTRO, OUTRO)

---

## Atmosphere Integration

### Global Atmosphere
- Dibangun dari settings database (`projection_default_atmosphere`, `projection_bg_color`, `projection_bg_image`)
- Fallback ke `DEFAULT_GLOBAL_ATMOSPHERE` jika tidak ada config

### Song Atmosphere
- Parse dari `song.song_background_config` (JSON string)
- Override global atmosphere jika tersedia

### Active Atmosphere Resolution
- Priority: Song atmosphere > Global atmosphere
- Media asset lookup dari database
- File URL conversion untuk local paths

### Readability Settings
- `overlay.dim`: Dim overlay opacity (default: 0.58)
- `overlay.glow`: Glow overlay opacity (default: 0.12)
- `overlay.textShieldOpacity`: Text shield opacity (default: 0.22)
- `readability.blurBehindLyrics`: Blur behind lyrics (default: true)
- `readability.contrastBoost`: Contrast boost (default: 0.18)

---

## Visual Design

### Background Layers
1. Gradient/Solid color base
2. Video/Image media (jika mode video/image)
3. Animated gradient orbs (3 floating orbs dengan animasi)
4. Noise texture overlay
5. Dim overlay (gradient)
6. Glow overlay (radial gradient)
7. Bottom gradient fade
8. Decorative bottom clip-path

### Text Styling
- Font: System sans-serif dengan tracking negatif
- Text shadow: Multi-layer shadow untuk readability
- Adaptive font size: 36-92px berdasarkan jumlah baris
- Chorus styling: Container terpisah dengan border dan backdrop blur

### UI Elements
- Title bar: Glassmorphism dengan window controls
- Top bar: Song metadata display
- Bottom footer: Navigation controls dengan glassmorphism
- Slide indicators: Vertical dots di sisi kanan dengan active state animation

---

## Auto-Hide UI System

### Idle Timer
- Reset pada mouse movement
- Hide UI setelah 2.5 seconds idle
- Show UI pada mouse movement

### Hover Zones
- Top edge (30px): Show window controls
- General movement: Show all UI

---

## Performance Optimizations

- `useMemo` untuk lyrics parsing dan atmosphere config
- `useCallback` untuk event handlers
- `requestAnimationFrame` untuk smooth auto-scroll
- `AnimatePresence` untuk smooth transitions
- Lazy loading settings dan media assets

---

## Usage Example

```typescript
import { LibraryLyricsViewer } from './components/library/LibraryLyricsViewer'

// Dalam LibraryModeRedesigned
const handleOpenLyricsViewer = (song: Song) => {
  setLyricsFullscreen(true)
  setSelectedSong(song)
}

// Render
{lyricsFullscreen && selectedSong && (
  <LibraryLyricsViewer
    song={selectedSong}
    onClose={() => setLyricsFullscreen(false)}
    onNextSong={handleNextSong}
    onPrevSong={handlePrevSong}
  />
)}
```

---

## Dependencies

- React hooks: `useCallback`, `useEffect`, `useMemo`, `useRef`, `useState`
- Framer Motion: `AnimatePresence`, `motion`
- Lucide React: `Copy`, `Minus`, `Music2`, `Sparkles`, `Square`, `X`
- Store: `useAppStore`
- Utils: `logger`, atmosphere presets dan types
- IPC: `window.api.settings.getAll`, `window.api.media.getAll`, `window.api.window.*`

---

## Future Enhancements

- [ ] Support untuk custom theme presets
- [ ] Highlighting pada baris lirik saat auto-scroll
- [ ] Bookmarking pada slide tertentu
- [ ] Export lirik ke format lain (PDF, image)
- [ ] Search dalam lirik
- [ ] Multi-language support untuk section labels
- [ ] Integration dengan projection untuk preview lirik

---

## Referensi

- Atmosphere system: `src/renderer/src/atmosphere/`
- Song types: `src/renderer/src/types.ts`
- Store: `src/renderer/src/store/useAppStore.ts`
