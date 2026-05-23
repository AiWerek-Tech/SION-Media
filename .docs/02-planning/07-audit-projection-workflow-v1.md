# ProjectionMode Workflow Architecture Audit v1

> **Status:** ✅ AUDIT SELESAI — Temuan sudah diimplementasikan. Lihat `04-implementation/15-log-impl-projection-modernization-v9.md`

**Date**: 2026-05-10
**Focus**: Professional Worship/Media Runtime Workflow Architecture
**Target**: Mental Model Operator + Architecture Readiness

---

## Executive Summary

SION Media saat ini telah memiliki fondasi **Preview/Program separation** yang solid dengan pola vMix-style workflow. Namun, untuk mencapai level **professional worship runtime**, ada beberapa area yang memerlukan penguatan architecture dan expansion.

**Current Maturity Level**: `Basic Professional` (60%)
**Target Maturity Level**: `Professional Worship Runtime` (90%)

---

## 1. Runtime State Architecture

### Current Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    useProjectionStore                        │
├─────────────────────────────────────────────────────────────┤
│  slides: SlideData[]           → CUE/Preview slides         │
│  currentSlideIndex: number     → Current cue position       │
│  cuedSongMeta: object | null   → Cued song metadata         │
│                                                              │
│  programSlides: SlideData[]    → PROGRAM/Live slides        │
│  programSlide: SlideData | null → Currently projected       │
│  programSlideIndex: number     → Live position              │
│  programSongMeta: object | null → Program song metadata     │
│                                                              │
│  projectionState: ProjectionState → LIVE|BLACK|FREEZE|CLEAR │
│  fadeSpeed: number             → Transition duration        │
└─────────────────────────────────────────────────────────────┘
```

**File**: `@/src/renderer/src/store/useProjectionStore.ts:5-31`

### State Separation Analysis

| Concept     | Current State                    | Professional Standard | Gap                   |
| ----------- | -------------------------------- | --------------------- | --------------------- |
| **Preview** | `slides` + `currentSlideIndex`   | ✅ Implemented        | -                     |
| **Program** | `programSlides` + `programSlide` | ✅ Implemented        | -                     |
| **Next**    | `nextSlideText` property         | ⚠️ Partial            | Needs dedicated state |
| **Queued**  | Not implemented                  | ❌ Missing            | Future feature        |

### Mental Model Mapping

```
Operator Mental Model          Current Implementation
────────────────────          ──────────────────────
"Preview"              →      slides[currentSlideIndex]
"Program/Live"         →      programSlide
"Next Slide"           →      nextSlideText (embedded)
"Queued Song"          →      ❌ Not implemented
```

### Recommendations

1. **Add `queuedSlides` state** - Untuk prepare-next-song workflow
2. **Add `nextSlide` as dedicated state** - Bukan hanya embedded property
3. **Add `previewState`** - Terpisah dari `projectionState` untuk tracking preview readiness

---

## 2. Preview vs Program Separation

### Current Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LivePreviewPanel                              │
│  @/src/renderer/src/components/LivePreviewPanel.tsx:253-342         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│   │   PREVIEW   │    │ TRANSITION  │    │   PROGRAM   │              │
│   │    /CUE     │    │   COLUMN    │    │    /LIVE    │              │
│   │             │    │             │    │             │              │
│   │  slides[]   │    │   CUE ↑↓    │    │ programSlide│              │
│   │  [index]    │ ←──│   TAKE     ───→ │             │              │
│   │             │    │   LIVE ↑↓   │    │             │              │
│   └─────────────┘    └─────────────┘    └─────────────┘              │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Commit/Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSITION FLOW MAPPING                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     cueNextSlide()     ┌──────────┐               │
│  │  CUE     │ ────────────────────→  │  CUE     │               │
│  │  INDEX   │     cuePrevSlide()     │  INDEX   │               │
│  └──────────┘ ←────────────────────   └──────────┘               │
│       │                                                          │
│       │ takeCue()                                                 │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────┐            │
│  │  goToSlide(currentSlideIndex)                    │            │
│  │  • programSlides = slides                        │            │
│  │  • programSlideIndex = currentSlideIndex        │            │
│  │  • projectionState = 'LIVE'                     │            │
│  │  • sendLiveSlide(slideData)                     │            │
│  └──────────────────────────────────────────────────┘            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐     nextSlide()        ┌──────────┐               │
│  │ PROGRAM  │ ────────────────────→  │ PROGRAM  │               │
│  │  INDEX   │     prevSlide()        │  INDEX   │               │
│  └──────────┘ ←────────────────────   └──────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**File**: `@/src/renderer/src/store/useProjectionStore.ts:87-135`

### Prepare-Before-Push Analysis

| Feature                                 | Status | Implementation              |
| --------------------------------------- | ------ | --------------------------- |
| Preview selection independent from live | ✅ Yes | `cueNextSlide/cuePrevSlide` |
| Visual preview before TAKE              | ✅ Yes | Preview Monitor             |
| TAKE button for commit                  | ✅ Yes | `takeCue()`                 |
| Prevent duplicate TAKE                  | ✅ Yes | `isCueSameAsProgram` check  |
| Live output truly separated             | ✅ Yes | Separate state + window     |

### Gap Analysis

| Gap                             | Impact | Priority |
| ------------------------------- | ------ | -------- |
| No "Prepare Next Song" workflow | Medium | High     |
| No slide reordering in preview  | Low    | Medium   |
| No "Edit while live" protection | High   | Critical |

---

## 3. Command Flow Mapping

### Current Command Surface

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMAND FLOW DIAGRAM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SELECT SONG                                                     │
│  ───────────                                                     │
│  setSlides(generateSlidesForSong(song))                         │
│  → slides[] loaded, currentSlideIndex = 0                        │
│                                                                  │
│  PREVIEW NAVIGATION                                              │
│  ──────────────────                                              │
│  cueNextSlide()  → currentSlideIndex++                           │
│  cuePrevSlide()  → currentSlideIndex--                           │
│  setCurrentSlideIndex(n) → jump to slide n                       │
│                                                                  │
│  GO LIVE                                                         │
│  ────────                                                        │
│  takeCue()       → goToSlide(currentSlideIndex)                 │
│  goToSlide(n)    → direct jump + immediate live                  │
│                                                                  │
│  LIVE NAVIGATION (only when LIVE/FREEZE)                        │
│  ────────────────────────────────────                            │
│  nextSlide()     → programSlideIndex++ + sendLiveSlide()        │
│  prevSlide()     → programSlideIndex-- + sendLiveSlide()        │
│                                                                  │
│  OUTPUT CONTROL                                                  │
│  ──────────────                                                  │
│  toggleBlack()   → BLACK ⟷ LIVE                                 │
│  toggleFreeze()  → FREEZE ⟷ LIVE                                │
│  clearScreen()   → CLEAR                                         │
│                                                                  │
│  MISSING COMMANDS                                                │
│  ────────────────                                                │
│  ❌ Quick Jump to specific slide while live                     │
│  ❌ Go to first/last slide                                       │
│  ❌ Jump to section (verse, chorus, bridge)                     │
│  ❌ Auto-advance with timer                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Transition Matrix

```
                 ┌───────────────────────────────────────────────┐
                 │              Current State                     │
                 │  CLEAR  LIVE   BLACK  FREEZE  LOGO            │
┌────────────────┼───────────────────────────────────────────────┤
│ takeCue()      │  LIVE   LIVE   LIVE   LIVE    LIVE           │
│ nextSlide()    │   -     ✓      -      ✓       -              │
│ prevSlide()    │   -     ✓      -      ✓       -              │
│ toggleBlack()  │ BLACK  BLACK  LIVE   BLACK   BLACK           │
│ toggleFreeze() │ FREEZE FREEZE FREEZE LIVE    FREEZE          │
│ clearScreen()  │ CLEAR  CLEAR  CLEAR  CLEAR   CLEAR          │
└────────────────┴───────────────────────────────────────────────┘
```

### Recommendations

1. **Add `goToLiveSlide(index)`** - Quick jump to specific slide while live
2. **Add `goToSection(sectionLabel)`** - Jump to verse/chorus/bridge
3. **Add `goToFirst()` / `goToLast()`** - Edge navigation
4. **Add auto-advance timer** - Optional timed progression

---

## 4. Keyboard Workflow Audit

### Current Keyboard Surface

**File**: `@/src/renderer/src/App.tsx:175-303`

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEYBOARD SHORTCUTS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SLIDE NAVIGATION                                                │
│  ────────────────                                                │
│  Space           → TAKE cue to Program                           │
│  → / PageDown    → Next live slide                               │
│  ← / PageUp      → Previous live slide                           │
│  1-9             → Select song in playlist (quick access)        │
│                                                                  │
│  PROJECTION CONTROL                                              │
│  ──────────────────                                              │
│  B               → Toggle Black Screen                          │
│  F               → Toggle Freeze                                 │
│  Esc / C         → Clear Screen                                 │
│                                                                  │
│  SYSTEM                                                          │
│  ──────                                                          │
│  Ctrl+P          → Command Palette                              │
│  Ctrl+K          → Command Palette                              │
│  Ctrl+F          → Focus search input                           │
│  Ctrl+N          → New song editor                              │
│  Ctrl+S          → Save (in editor)                             │
│  Ctrl+Shift+F    → Focus Live Mode                              │
│  ?               → Keyboard Cheat Sheet                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Mouse-Heavy Areas

| Area                  | Current State        | Keyboard Alternative  |
| --------------------- | -------------------- | --------------------- |
| Song search           | Mouse click to focus | ✅ Ctrl+F             |
| Playlist item click   | Mouse only           | ⚠️ 1-9 (limited to 9) |
| Slide thumbnail click | Mouse only           | ❌ Missing            |
| Fade speed selector   | Mouse only           | ❌ Missing            |
| Theme settings        | Mouse only           | ❌ Not needed in live |

### Missing Command Surface

```
┌─────────────────────────────────────────────────────────────────┐
│                    MISSING SHORTCUTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PREVIEW NAVIGATION (currently mouse-only)                       │
│  ────────────────────────────────────────                        │
│  ❌ Up/Down arrows for cue navigation (conflict with live)      │
│  ❌ Home/End for first/last slide                               │
│  ❌ Number keys for slide jump (1-9 for playlist conflict)     │
│                                                                  │
│  LIVE NAVIGATION                                                 │
│  ────────────────                                                │
│  ❌ Shift+→/← for section jump (verse→chorus)                   │
│  ❌ G + number for go-to-slide                                   │
│  ❌ . (period) for advance-one-line                             │
│                                                                  │
│  OUTPUT CONTROL                                                  │
│  ──────────────                                                  │
│  ❌ L for Logo mode                                             │
│  ❌ Shift+B for instant black (no fade)                         │
│  ❌ T for transition type cycle                                 │
│                                                                  │
│  QUICK ACTIONS                                                   │
│  ─────────────                                                   │
│  ❌ P for panic (instant clear + black)                         │
│  ❌ R for refresh/reload current song                           │
│  ❌ E for edit current song                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Full-Keyboard Operation Assessment

| Task                      | Can Do Without Mouse? | Notes                          |
| ------------------------- | --------------------- | ------------------------------ |
| Select song from playlist | ⚠️ Partial            | Only first 9 songs via 1-9     |
| Search for song           | ✅ Yes                | Ctrl+F                         |
| Navigate cue slides       | ❌ No                 | Need mouse for cue nav buttons |
| TAKE to live              | ✅ Yes                | Space                          |
| Navigate live slides      | ✅ Yes                | ← → arrows                     |
| Black/Freeze/Clear        | ✅ Yes                | B, F, Esc                      |
| Change fade speed         | ❌ No                 | Mouse only                     |
| Focus mode                | ✅ Yes                | Ctrl+Shift+F                   |

**Current Keyboard Coverage**: ~70%

### Recommendations

1. **Add modifier-based preview navigation**: `Shift+↑/↓` for cue navigation
2. **Add slide jump**: `G + number` for go-to-slide
3. **Add section navigation**: `Shift+→/←` for verse/chorus jump
4. **Add fade speed hotkeys**: `1-4` when not in playlist context
5. **Add panic shortcut**: `P` for instant clear + black

---

## 5. Runtime Visibility

### Current Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISUAL LAYOUT                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    MONITOR SECTION                       │    │
│  │  ┌───────────┐  ┌────┐  ┌───────────┐                  │    │
│  │  │  PREVIEW  │  │TAKE│  │  PROGRAM  │ ← What's LIVE    │    │
│  │  │   MONITOR │  │    │  │   MONITOR │                  │    │
│  │  │           │  │ ↑↓ │  │           │                  │    │
│  │  │ What's    │  │    │  │ What's    │                  │    │
│  │  │ SELECTED  │  └────┘  │ PROJECTED │                  │    │
│  │  └───────────┘          └───────────┘                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    CONTROL BAR                           │    │
│  │  [CUE: Slide 1/4]  [0.4s] [■][❄][✕]  [LIVE 2/4]        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 MANAGEMENT SECTION                       │    │
│  │  ┌─────────────────┐  ┌─────────────────┐              │    │
│  │  │  SONG LIBRARY   │  │    PLAYLIST     │              │    │
│  │  │                 │  │                 │              │    │
│  │  └─────────────────┘  └─────────────────┘              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### State Visibility Matrix

| Information              | Visible?   | Location                     | Clarity |
| ------------------------ | ---------- | ---------------------------- | ------- |
| What's currently LIVE    | ✅ Yes     | Program Monitor + ControlBar | High    |
| What's selected (cue)    | ✅ Yes     | Preview Monitor + ControlBar | High    |
| What's NEXT              | ⚠️ Partial | `nextSlideText` embedded     | Low     |
| Current projection state | ✅ Yes     | ControlBar badges            | High    |
| Projector status         | ✅ Yes     | "PROJECTOR LOST" warning     | High    |
| Song metadata            | ⚠️ Partial | In monitor title             | Medium  |

### Visual Priority Analysis

```
Current Priority (Top to Bottom):
─────────────────────────────────
1. Monitor Section (Preview + Program)  ← HIGH PRIORITY ✅
2. Control Bar (State controls)         ← MEDIUM PRIORITY ✅
3. Management Section (Library/Playlist) ← LOW PRIORITY ✅

Eye Movement Flow:
─────────────────
Operator eyes: Monitor → ControlBar → Library → Monitor
              (scan)    (action)     (select)   (verify)

Cognitive Load:
──────────────
- Monitor Section: LOW (clear visual, minimal text)
- Control Bar: LOW (icon-based, familiar patterns)
- Management Section: MEDIUM (list scanning, search)
```

### "Trust the State" Assessment

| Aspect                              | Trust Level | Reason                            |
| ----------------------------------- | ----------- | --------------------------------- |
| Live output matches Program monitor | ✅ High     | Same state source                 |
| Preview shows what will be live     | ✅ High     | TAKE commits exactly what's shown |
| State indicators are accurate       | ✅ High     | Real-time state sync              |
| Next slide is visible               | ⚠️ Medium   | Embedded in slide, not prominent  |
| Queued song is visible              | ❌ Low      | Not implemented                   |

### Recommendations

1. **Add prominent NEXT indicator** - Dedicated "NEXT" label in Program monitor
2. **Add confidence stripes** - Visual timeline of song sections
3. **Add state persistence indicator** - Show if state is saved/recoverable
4. **Add "Live Duration" timer** - Time since last TAKE

---

## 6. Transition Model

### Current Transition Architecture

**File**: `@/src/renderer/src/projection/ProjectionApp.tsx:73-120`

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSITION TYPES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  fast-cut       → opacity 0→1, duration 0.1s                    │
│  smooth-blur    → opacity + blur + scale, duration user-set    │
│  slide          → opacity + Y translation, duration user-set   │
│  crossfade      → opacity only, duration 1.5x user-set         │
│  dissolve       → opacity only, duration user-set (default)    │
│                                                                  │
│  FADE SPEEDS: 0.1s | 0.4s | 0.8s | 1.2s                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSITION EXECUTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Operator Action:                                                │
│  ────────────────                                                │
│  nextSlide() / prevSlide() / takeCue() / goToSlide()            │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────┐                       │
│  │  sendLiveSlide(slideData)            │                       │
│  │  window.api.projection.slideUpdate() │                       │
│  └──────────────────────────────────────┘                       │
│       │                                                          │
│       ▼  (IPC to projection window)                             │
│  ┌──────────────────────────────────────┐                       │
│  │  ProjectionApp.tsx                   │                       │
│  │  AnimatePresence mode="wait"         │                       │
│  │  motion.div with transition config   │                       │
│  └──────────────────────────────────────┘                       │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────┐                       │
│  │  Framer Motion handles:              │                       │
│  │  • Exit animation (old slide)        │                       │
│  │  • Enter animation (new slide)       │                       │
│  │  • No overlap (mode="wait")          │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Transition Queue Analysis

| Feature               | Status | Notes                      |
| --------------------- | ------ | -------------------------- |
| Instant transition    | ✅ Yes | fast-cut mode              |
| Fade transition       | ✅ Yes | dissolve/crossfade modes   |
| Crossfade transition  | ✅ Yes | crossfade mode             |
| Blur transition       | ✅ Yes | smooth-blur mode           |
| Slide transition      | ✅ Yes | slide mode                 |
| **Transition queue**  | ❌ No  | Transitions are immediate  |
| **Auto transition**   | ❌ No  | No timer-based progression |
| **Timed progression** | ❌ No  | No auto-advance feature    |

### Architecture Readiness for Future

| Future Feature             | Architecture Ready? | Changes Needed                |
| -------------------------- | ------------------- | ----------------------------- |
| Fade with custom curve     | ✅ Yes              | Already supported             |
| Crossfade with overlap     | ⚠️ Partial          | Need `mode="parallel"`        |
| Cut (instant switch)       | ✅ Yes              | fast-cut mode                 |
| Auto transition            | ❌ No               | Need timer + state machine    |
| Timed progression          | ❌ No               | Need countdown + auto-advance |
| Transition queue           | ❌ No               | Need queue data structure     |
| Per-song transition preset | ⚠️ Partial          | Need song-level settings      |

### Recommendations

1. **Add transition queue** - For scripted sequences
2. **Add auto-advance timer** - Optional per-slide duration
3. **Add per-song transition preset** - Store with song metadata
4. **Add transition preview** - Show in Preview monitor before TAKE

---

## 7. Workspace Ergonomics

### Current Layout Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECTION MODE LAYOUT                        │
│  @/src/renderer/src/screens/modes/ProjectionMode.tsx:49-105     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MONITOR SECTION (flexible height)                      │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  LivePreviewPanel                               │    │    │
│  │  │  grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]  │    │    │
│  │  │  Preview | Transition | Program                 │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MIXER BAR (fixed height)                               │    │
│  │  ControlBar: [CUE status] [Speed] [States] [LIVE status]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MANAGEMENT SECTION (flexible height)                   │    │
│  │  TwoPanelLayout: [SongLibrary] | [Playlist]             │    │
│  │  (Collapsible in Focus Mode)                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Eye Movement Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATOR SCANNING FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Primary Scan Zone (High Frequency):                             │
│  ────────────────────────────────────                            │
│  • Program Monitor → "What's on screen now?"                    │
│  • Preview Monitor → "What's coming next?"                      │
│  • TAKE button → "Ready to commit?"                             │
│                                                                  │
│  Secondary Scan Zone (Medium Frequency):                        │
│  ─────────────────────────────────────────                       │
│  • ControlBar → State indicators, fade speed                    │
│  • Playlist → What's next in queue                              │
│                                                                  │
│  Tertiary Scan Zone (Low Frequency):                            │
│  ──────────────────────────────────                              │
│  • Song Library → Search for songs                              │
│  • Settings → Rarely accessed during live                       │
│                                                                  │
│  Eye Movement Pattern:                                           │
│  ────────────────────                                            │
│  Program → Preview → TAKE → Program (loop)                      │
│       ↓                                                           │
│  Playlist (when selecting next song)                            │
│       ↓                                                           │
│  Program → Preview → TAKE (resume loop)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Visual Priority Assessment

| Element               | Visual Priority | Current Treatment     | Improvement                |
| --------------------- | --------------- | --------------------- | -------------------------- |
| Program Monitor       | CRITICAL        | Large, prominent      | ✅ Good                    |
| Preview Monitor       | HIGH            | Large, prominent      | ✅ Good                    |
| TAKE button           | CRITICAL        | Centered, highlighted | ✅ Good                    |
| State buttons         | HIGH            | Icon-based            | ✅ Good                    |
| Live status indicator | CRITICAL        | "ON AIR" badge        | ✅ Good                    |
| Cue status            | HIGH            | Text label            | ⚠️ Could be more prominent |
| Next slide preview    | MEDIUM          | Embedded in slide     | ⚠️ Low visibility          |
| Playlist              | MEDIUM          | Collapsible           | ✅ Good                    |
| Song library          | LOW             | Available             | ✅ Good                    |

### Cognitive Load Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    COGNITIVE LOAD BREAKDOWN                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LOW COGNITIVE LOAD (Automatic):                                 │
│  ──────────────────────────────────                              │
│  • Recognizing ON AIR indicator                                 │
│  • Identifying current slide in Program                         │
│  • Finding TAKE button                                          │
│  • Reading state badges (LIVE, BLACK, FREEZE)                   │
│                                                                  │
│  MEDIUM COGNITIVE LOAD (Scanning):                               │
│  ──────────────────────────────────                              │
│  • Scanning playlist for next song                              │
│  • Reading slide text in Preview                                │
│  • Checking fade speed setting                                  │
│                                                                  │
│  HIGH COGNITIVE LOAD (Decision):                                 │
│  ──────────────────────────────────                              │
│  • Searching for specific song                                  │
│  • Determining which slide to cue                               │
│  • Deciding transition timing                                   │
│                                                                  │
│  OVERALL ASSESSMENT: LOW-TO-MEDIUM                               │
│  ✅ Workspace is calm and scannable                             │
│  ✅ Critical elements are prominent                             │
│  ⚠️ Next slide visibility could be improved                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Stress Test Scenarios

| Scenario                  | Current Support | Stress Level |
| ------------------------- | --------------- | ------------ |
| Quick song switch         | ✅ Good         | Low          |
| Emergency black           | ✅ Good (B key) | Low          |
| Finding specific verse    | ⚠️ Medium       | Medium       |
| Last-minute song addition | ⚠️ Medium       | Medium       |
| Simultaneous multi-change | ❌ Poor         | High         |

### Recommendations

1. **Add prominent NEXT indicator** - Larger, more visible
2. **Add section timeline** - Visual representation of song structure
3. **Add quick-access row** - Frequently used songs/slides
4. **Add emergency controls** - Prominent panic button

---

## 8. Multi-Display / Confidence Future-Readiness

### Current Multi-Display Architecture

**File**: `@/src/main/windows.ts:183-305`

```
┌─────────────────────────────────────────────────────────────────┐
│                    WINDOW ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐                                             │
│  │  MAIN WINDOW    │  → Operator Control Panel                  │
│  │  (Primary)      │  → All UI, settings, management            │
│  └─────────────────┘                                             │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │ PROJECTION      │  → Audience Output                         │
│  │ WINDOW          │  → Fullscreen on external display          │
│  │ (External)      │  → Receives: slideUpdate, stateChange     │
│  └─────────────────┘                                             │
│                                                                  │
│  ┌─────────────────┐                                             │
│  │ STAGE DISPLAY   │  → Musician Monitor                        │
│  │ WINDOW          │  → Windowed, movable                       │
│  │ (3rd display)   │  → Same feed as projection (currently)    │
│  └─────────────────┘                                             │
│                                                                  │
│  MISSING:                                                        │
│  ────────                                                        │
│  ❌ CONFIDENCE MONITOR (singer-specific view)                   │
│  ❌ DEDICATED STAGE DISPLAY CONTENT (different from projection) │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Display Detection & Recovery

**File**: `@/src/main/display-monitor.ts:31-50`

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY MANAGEMENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Display count tracking                                      │
│  ✅ Auto-detection on display add/remove                        │
│  ✅ Auto-recovery: move projection to remaining display         │
│  ✅ Notification: "Monitor terhubung/terputus"                  │
│  ✅ Single monitor warning: "Monitor Tunggal" badge            │
│                                                                  │
│  Current Display Info:                                          │
│  ────────────────────                                           │
│  • id, label, width, height, isPrimary                         │
│  • Missing: refresh rate, color depth, HDR support             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Confidence Monitor Architecture Readiness

```
┌─────────────────────────────────────────────────────────────────┐
│          CONFIDENCE MONITOR REQUIREMENTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What Confidence Monitor Needs:                                  │
│  ──────────────────────────────────                              │
│  1. Current slide (large text)                                  │
│  2. NEXT slide (preview)                                        │
│  3. Song metadata (key, tempo)                                  │
│  4. Countdown timer (optional)                                  │
│  5. Different from audience view (no distracting elements)      │
│                                                                  │
│  Current Architecture Support:                                   │
│  ──────────────────────────                                      │
│  ✅ currentSlide → programSlide                                 │
│  ⚠️ nextSlide → nextSlideText (embedded, not ideal)            │
│  ✅ metadata → keyNote, timeSignature, tempo                    │
│  ❌ timer → Not implemented                                     │
│  ❌ dedicated content → Stage display shows same as projection  │
│                                                                  │
│  Architecture Changes Needed:                                    │
│  ─────────────────────────                                       │
│  1. Separate nextSlide state                                    │
│  2. Confidence-specific rendering                               │
│  3. Timer/countdown system                                      │
│  4. Confidence window management                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Stage Display vs Confidence Monitor

| Feature     | Stage Display (Current) | Confidence Monitor (Target) |
| ----------- | ----------------------- | --------------------------- |
| Purpose     | Musician reference      | Singer/Presenter reference  |
| Content     | Same as projection      | Different layout            |
| Next slide  | Not shown               | Prominently shown           |
| Timing info | Not shown               | Countdown, cues             |
| Key/Tempo   | Shown (if in slide)     | Always visible              |
| Position    | 3rd display             | 2nd or 3rd display          |

### Multi-Display Future Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY EVOLUTION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1 (Current):                                              │
│  ──────────────────                                              │
│  • Main Window (Operator)                                       │
│  • Projection Window (Audience)                                 │
│  • Stage Display Window (Musician)                              │
│                                                                  │
│  PHASE 2 (Confidence Monitor):                                  │
│  ─────────────────────────────                                   │
│  • Add Confidence Window                                        │
│  • Separate content pipeline                                    │
│  • Next slide preview                                           │
│  • Timing/cues overlay                                          │
│                                                                  │
│  PHASE 3 (Advanced Multi-Output):                               │
│  ──────────────────────────────────                              │
│  • NDI output for streaming                                     │
│  • Syphon/Spout for VJ integration                              │
│  • Multiple projection zones                                    │
│  • Per-display theming                                          │
│                                                                  │
│  PHASE 4 (SION Suite Integration):                              │
│  ──────────────────────────────────                              │
│  • Confidence mobile app                                        │
│  • Remote stage display                                         │
│  • Cloud sync for multi-site                                    │
│  • Networked display discovery                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Recommendations

1. **Separate Stage Display content** - Different from projection
2. **Add Confidence Monitor window** - Dedicated singer view
3. **Add nextSlide as separate state** - For confidence display
4. **Add timer/countdown system** - For timed cues
5. **Add display assignment UI** - Let operator assign displays

---

## Summary & Priority Matrix

### Critical Gaps (Must Fix)

| Gap                              | Impact | Effort | Priority |
| -------------------------------- | ------ | ------ | -------- |
| No "Edit while live" protection  | HIGH   | Medium | P0       |
| No quick jump to specific slide  | HIGH   | Low    | P0       |
| Preview navigation keyboard-only | MEDIUM | Low    | P1       |
| Next slide visibility low        | MEDIUM | Low    | P1       |

### High Priority (Should Fix)

| Gap                           | Impact | Effort | Priority |
| ----------------------------- | ------ | ------ | -------- |
| No confidence monitor support | HIGH   | High   | P2       |
| No auto-advance timer         | MEDIUM | Medium | P2       |
| No section navigation         | MEDIUM | Low    | P2       |
| No transition queue           | MEDIUM | Medium | P2       |

### Medium Priority (Nice to Have)

| Gap                           | Impact | Effort | Priority |
| ----------------------------- | ------ | ------ | -------- |
| No queued song workflow       | MEDIUM | Medium | P3       |
| No per-song transition preset | LOW    | Low    | P3       |
| No live duration timer        | LOW    | Low    | P3       |
| No panic shortcut             | LOW    | Low    | P3       |

### Architecture Strengths

| Strength                   | Quality      |
| -------------------------- | ------------ |
| Preview/Program separation | ✅ Excellent |
| State management           | ✅ Excellent |
| Transition system          | ✅ Good      |
| Keyboard coverage          | ✅ Good      |
| Multi-display foundation   | ✅ Good      |
| Visual hierarchy           | ✅ Good      |

---

## Next Steps

1. **Create Runtime State Machine Architecture** - Formalize state transitions
2. **Design Confidence Monitor System** - Architecture for singer view
3. **Implement Keyboard Command Surface v2** - Fill gaps in shortcuts
4. **Add Quick Jump Navigation** - Go-to-slide functionality
5. **Design Edit Protection System** - Safe editing while live

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
