# Projection Runtime State Architecture v1

> **Status:** ✅ IMPLEMENTED — State machine formal sudah diimplementasikan di `src/renderer/src/core/projection/state-machine/`. Lihat `04-implementation/31-log-impl-projection-system-foundation-v1.md`

**Date**: 2026-05-10
**Purpose**: Formal State Machine Definition for Projection Workflow
**Prerequisite**: audit-projection-workflow-v1.md

---

## Overview

Dokumen ini mendefinisikan **Projection Runtime State Machine** secara formal sebagai fondasi untuk implementasi fitur-fitur runtime workflow.

**Goal**:

- Explicit state definitions
- Valid state transitions
- Command-to-state mapping
- Protection mechanisms
- Navigation architecture

---

## 1. Core State Model

### 1.1 State Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROJECTION RUNTIME STATE HIERARCHY                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        OUTPUT STATE                                 │ │
│  │  (What the audience sees)                                          │ │
│  │                                                                     │ │
│  │  CLEAR  →  Nothing projected (screen empty/logo)                   │ │
│  │  LIVE   →  Active projection (content visible)                     │ │
│  │  BLACK  →  Hardware blackout (screen off)                          │ │
│  │  FREEZE →  Last frame frozen (content locked)                      │ │
│  │  LOGO   →  Standby logo displayed                                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        PROGRAM STATE                                │ │
│  │  (What is "on deck" / committed to output)                         │ │
│  │                                                                     │ │
│  │  programSlides[]   → Array of slides in current program            │ │
│  │  programSlide      → Currently projected slide                      │ │
│  │  programSlideIndex → Position in programSlides                      │ │
│  │  programSongMeta   → Metadata of current program song               │ │
│  │                                                                     │ │
│  │  LIVE-LOCK        → Program is locked (immutable while live)       │ │
│  │  LIVE-DIRTY       → Program has pending changes (warning state)    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                        PREVIEW STATE                                │ │
│  │  (What operator is preparing)                                       │ │
│  │                                                                     │ │
│  │  slides[]          → Array of slides in preview/cue                │ │
│  │  currentSlideIndex → Position in preview slides                     │ │
│  │  cuedSongMeta      → Metadata of cued song                          │ │
│  │                                                                     │ │
│  │  PREVIEW-CLEAN     → Preview matches program (no action needed)    │ │
│  │  PREVIEW-DIRTY     → Preview differs from program (ready to TAKE)  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                          NEXT STATE                                 │ │
│  │  (What comes after current)                                        │ │
│  │                                                                     │ │
│  │  nextSlide         → The slide after programSlide                  │ │
│  │  nextSong          → The song after current program song           │ │
│  │  queuedSlides[]    → Pre-loaded slides for next song               │ │
│  │                                                                     │ │
│  │  NEXT-READY        → Next content available                        │ │
│  │  NEXT-EMPTY        → No next content                               │ │
│  │  NEXT-QUEUED       → Next song pre-loaded and waiting              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      TRANSITION STATE                               │ │
│  │  (Active transition in progress)                                   │ │
│  │                                                                     │ │
│  │  IDLE              → No transition active                          │ │
│  │  TRANSITIONING     → Visual transition in progress                 │ │
│  │  QUEUED-TRANSITION → Transition queued for execution               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 State Definitions

```typescript
// ============================================================================
// OUTPUT STATE - What audience sees
// ============================================================================

type OutputState = 'CLEAR' | 'LIVE' | 'BLACK' | 'FREEZE' | 'LOGO'

// State descriptions:
// CLEAR   - No content projected, may show logo if configured
// LIVE    - Active content projection, responds to slide changes
// BLACK   - Hardware blackout, screen completely off
// FREEZE  - Last frame frozen, ignores slide updates
// LOGO    - Standby logo displayed (explicit logo mode)

// ============================================================================
// PROGRAM STATE - Committed content for output
// ============================================================================

interface ProgramState {
  slides: SlideData[] // Slides in current program
  activeSlide: SlideData | null // Currently projected slide
  slideIndex: number // Position in slides array
  songMeta: SongMeta | null // Song metadata
  lockState: ProgramLockState // Protection state
}

type ProgramLockState =
  | 'UNLOCKED' // Program can be modified
  | 'LIVE-LOCK' // Program is live and immutable
  | 'LIVE-DIRTY' // Program has pending changes (warning)

// ============================================================================
// PREVIEW STATE - Operator preparation area
// ============================================================================

interface PreviewState {
  slides: SlideData[] // Slides in preview/cue
  slideIndex: number // Position in slides array
  songMeta: SongMeta | null // Song metadata
  syncState: PreviewSyncState // Relationship to program
}

type PreviewSyncState =
  | 'SYNCED' // Preview matches program exactly
  | 'AHEAD' // Preview is ahead of program (ready to TAKE)
  | 'BEHIND' // Preview is behind program (unusual)
  | 'INDEPENDENT' // Preview has different content (different song)

// ============================================================================
// NEXT STATE - Upcoming content
// ============================================================================

interface NextState {
  slide: SlideData | null // Next slide in current song
  song: Song | null // Next song in playlist
  slides: SlideData[] // Pre-loaded slides for next song
  readyState: NextReadyState // Availability state
}

type NextReadyState =
  | 'EMPTY' // No next content
  | 'SLIDE-READY' // Next slide available
  | 'SONG-QUEUED' // Next song pre-loaded
  | 'BOTH-READY' // Both next slide and next song available

// ============================================================================
// TRANSITION STATE - Active visual transition
// ============================================================================

interface TransitionState {
  status: TransitionStatus
  type: TransitionType
  duration: number // Duration in seconds
  progress: number // 0.0 to 1.0
  queue: TransitionQueueItem[] // Queued transitions
}

type TransitionStatus = 'IDLE' | 'TRANSITIONING' | 'QUEUED'

type TransitionType = 'dissolve' | 'crossfade' | 'fast-cut' | 'smooth-blur' | 'slide'

interface TransitionQueueItem {
  id: string
  fromSlide: SlideData
  toSlide: SlideData
  type: TransitionType
  duration: number
  executeAt?: number // Timestamp for scheduled execution
}
```

---

## 2. State Transition Matrix

### 2.1 Output State Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OUTPUT STATE TRANSITION MATRIX                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  From     │ CLEAR │ LIVE  │ BLACK │ FREEZE │ LOGO │                     │
│  ─────────┼───────┼───────┼───────┼────────┼──────┤                     │
│  CLEAR    │   -   │ TAKE  │ BLACK │   -    │ LOGO │                     │
│  LIVE     │ CLEAR │   -   │ BLACK │ FREEZE │ LOGO │                     │
│  BLACK    │ CLEAR │ LIVE* │   -   │ FREEZE │ LOGO │                     │
│  FREEZE   │ CLEAR │ LIVE  │ BLACK │   -    │ LOGO │                     │
│  LOGO     │ CLEAR │ TAKE  │ BLACK │ FREEZE │   -  │                     │
│                                                                          │
│  * LIVE from BLACK restores previous slide                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Valid Transitions:
─────────────────
CLEAR  → LIVE    : takeCue(), goToSlide()
CLEAR  → BLACK   : toggleBlack()
CLEAR  → LOGO    : toggleLogo()

LIVE   → CLEAR   : clearScreen()
LIVE   → BLACK   : toggleBlack()
LIVE   → FREEZE  : toggleFreeze()
LIVE   → LOGO    : toggleLogo()

BLACK  → CLEAR   : clearScreen()
BLACK  → LIVE    : toggleBlack() (restore)
BLACK  → FREEZE  : toggleFreeze()
BLACK  → LOGO    : toggleLogo()

FREEZE → CLEAR   : clearScreen()
FREEZE → LIVE    : toggleFreeze() (unfreeze)
FREEZE → BLACK   : toggleBlack()
FREEZE → LOGO    : toggleLogo()

LOGO   → CLEAR   : clearScreen()
LOGO   → LIVE    : takeCue(), goToSlide()
LOGO   → BLACK   : toggleBlack()
LOGO   → FREEZE  : toggleFreeze()
```

### 2.2 Program Lock State Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROGRAM LOCK STATE TRANSITIONS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  UNLOCKED ──────────────────────────────────────────────────────────┐   │
│     │                                                                │   │
│     │ outputState → LIVE                                            │   │
│     ▼                                                                │   │
│  LIVE-LOCK ───────────────────────────────────────────────────────┐ │   │
│     │                                                              │   │
│     │ editor modifies program content                              │   │
│     ▼                                                              │   │
│  LIVE-DIRTY ──────────────────────────────────────────────────────┘ │   │
│     │                                                              │   │
│     │ confirmUpdate() or discardChanges()                          │   │
│     ▼                                                              │   │
│  LIVE-LOCK ◄───────────────────────────────────────────────────────┘ │   │
│     │                                                                │   │
│     │ outputState → CLEAR/BLACK                                     │   │
│     ▼                                                                │   │
│  UNLOCKED ◄─────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

Lock State Rules:
─────────────────
1. UNLOCKED → LIVE-LOCK: When output goes LIVE
2. LIVE-LOCK → LIVE-DIRTY: When editor modifies program content
3. LIVE-DIRTY → LIVE-LOCK: When changes confirmed or discarded
4. LIVE-LOCK → UNLOCKED: When output goes CLEAR/BLACK

Protection Behaviors:
─────────────────────
- LIVE-LOCK: programSlides is immutable
- LIVE-DIRTY: Show warning, require explicit action
- UNLOCKED: Full edit access
```

### 2.3 Preview Sync State Transitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PREVIEW SYNC STATE TRANSITIONS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SYNCED ──────────────────────────────────────────────────────────────┐ │
│     │                                                                  │ │
│     │ cueNextSlide() / cuePrevSlide() / selectDifferentSong()        │ │
│     ▼                                                                  │ │
│  AHEAD ──────────────────────────────────────────────────────────────┐│ │
│     │                                                                ││ │
│     │ takeCue()                                                      ││ │
│     ▼                                                                ││ │
│  SYNCED ◄────────────────────────────────────────────────────────────┘│ │
│                                                                        │ │
│  INDEPENDENT ────────────────────────────────────────────────────────┐│ │
│     │                                                                ││ │
│     │ selectDifferentSong() while program has content               ││ │
│     │                                                                ││ │
│     │ takeCue() → replaces program entirely                         ││ │
│     ▼                                                                ││ │
│  SYNCED ◄────────────────────────────────────────────────────────────┘│ │
│                                                                        │ │
└─────────────────────────────────────────────────────────────────────────┘

Sync State Rules:
─────────────────
1. SYNCED: previewSlide === programSlide (no TAKE needed)
2. AHEAD: previewSlide is different from programSlide (TAKE available)
3. INDEPENDENT: previewSong !== programSong (TAKE will replace program)
4. BEHIND: previewSlide < programSlide (edge case, usually SYNCED)
```

---

## 3. Command Architecture

### 3.1 Command Taxonomy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMMAND TAXONOMY                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  OUTPUT COMMANDS (affect OutputState directly)                    │  │
│  │                                                                    │  │
│  │  takeCue()        → CLEAR/LOGO → LIVE (commit preview to output) │  │
│  │  goToSlide(n)     → Direct jump to slide n + go LIVE             │  │
│  │  toggleBlack()    → BLACK ⟷ LIVE                                 │  │
│  │  toggleFreeze()   → FREEZE ⟷ LIVE                                │  │
│  │  toggleLogo()     → LOGO ⟷ CLEAR                                 │  │
│  │  clearScreen()    → Any → CLEAR                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  NAVIGATION COMMANDS (affect Program/Preview position)           │  │
│  │                                                                    │  │
│  │  PREVIEW NAVIGATION:                                              │  │
│  │  cueNextSlide()   → currentSlideIndex++                           │  │
│  │  cuePrevSlide()   → currentSlideIndex--                           │  │
│  │  cueGoToSlide(n)  → currentSlideIndex = n                         │  │
│  │  cueGoToSection(s) → Jump to section label (verse, chorus, etc)  │  │
│  │  cueGoToFirst()   → currentSlideIndex = 0                         │  │
│  │  cueGoToLast()    → currentSlideIndex = slides.length - 1         │  │
│  │                                                                    │  │
│  │  PROGRAM NAVIGATION (only when LIVE/FREEZE):                     │  │
│  │  nextSlide()      → programSlideIndex++ + sendLiveSlide()        │  │
│  │  prevSlide()      → programSlideIndex-- + sendLiveSlide()        │  │
│  │  goToLiveSlide(n) → programSlideIndex = n + sendLiveSlide()      │  │
│  │  goToSection(s)   → Jump to section while live                   │  │
│  │  goToFirst()      → programSlideIndex = 0 + sendLiveSlide()      │  │
│  │  goToLast()       → programSlideIndex = max + sendLiveSlide()    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  CONTENT COMMANDS (affect slide content)                         │  │
│  │                                                                    │  │
│  │  loadSong(song)   → Set preview slides from song                  │  │
│  │  loadNextSong()   → Pre-load next song into queuedSlides          │  │
│  │  hotSwapSlides()  → Update slides for live-edited song           │  │
│  │  updateLive()     → Commit preview changes to live (with warning)│  │
│  │  discardChanges() → Revert preview to match program              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  TRANSITION COMMANDS (affect transition behavior)                │  │
│  │                                                                    │  │
│  │  setFadeSpeed(s)  → Set default transition duration              │  │
│  │  setTransitionType(t) → Set default transition type              │  │
│  │  queueTransition(item) → Add to transition queue                  │  │
│  │  clearTransitionQueue() → Empty transition queue                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  QUICK ACTION COMMANDS (multi-step actions)                      │  │
│  │                                                                    │  │
│  │  panic()          → clearScreen() + toggleBlack() instantly      │  │
│  │  quickSong(n)     → Load song n from playlist + cue first slide  │  │
│  │  repeatSection()  → Go back to current section start             │  │
│  │  skipSection()    → Jump to next section                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Command Preconditions

```typescript
// ============================================================================
// COMMAND PRECONDITIONS - When commands are valid
// ============================================================================

interface CommandPreconditions {
  // OUTPUT COMMANDS
  takeCue: {
    requires: 'hasCue' // slides.length > 0
    blocked: 'isCueSameAsProgram && isLive'
  }

  goToSlide: {
    requires: 'hasCue && validIndex' // slides.length > 0 && index in range
    blocked: 'none'
  }

  toggleBlack: {
    requires: 'none'
    blocked: 'none'
  }

  toggleFreeze: {
    requires: 'hasProgram' // programSlides.length > 0
    blocked: 'none'
  }

  clearScreen: {
    requires: 'none'
    blocked: 'none'
  }

  // NAVIGATION COMMANDS - PREVIEW
  cueNextSlide: {
    requires: 'hasCue && notAtEnd' // slides.length > 0 && index < max
    blocked: 'none'
  }

  cuePrevSlide: {
    requires: 'hasCue && notAtStart' // slides.length > 0 && index > 0
    blocked: 'none'
  }

  cueGoToSlide: {
    requires: 'hasCue && validIndex'
    blocked: 'none'
  }

  cueGoToSection: {
    requires: 'hasCue && sectionExists' // slides has section label
    blocked: 'none'
  }

  // NAVIGATION COMMANDS - PROGRAM (LIVE)
  nextSlide: {
    requires: 'hasProgram && isLive && notAtEnd'
    blocked: 'outputState is BLACK or CLEAR'
  }

  prevSlide: {
    requires: 'hasProgram && isLive && notAtStart'
    blocked: 'outputState is BLACK or CLEAR'
  }

  goToLiveSlide: {
    requires: 'hasProgram && isLive && validIndex'
    blocked: 'outputState is BLACK or CLEAR'
  }

  goToSection: {
    requires: 'hasProgram && isLive && sectionExists'
    blocked: 'outputState is BLACK or CLEAR'
  }

  // CONTENT COMMANDS
  loadSong: {
    requires: 'validSong'
    blocked: 'none'
    sideEffect: 'resets currentSlideIndex to 0'
  }

  loadNextSong: {
    requires: 'hasNextSongInPlaylist'
    blocked: 'none'
    sideEffect: 'populates queuedSlides'
  }

  hotSwapSlides: {
    requires: 'songIsLiveOrCued'
    blocked: 'programLockState is LIVE-LOCK'
    warning: 'triggers LIVE-DIRTY if program is live'
  }

  updateLive: {
    requires: 'programLockState is LIVE-DIRTY'
    blocked: 'none'
    confirmation: 'required' // Explicit user confirmation
  }

  discardChanges: {
    requires: 'programLockState is LIVE-DIRTY'
    blocked: 'none'
  }
}
```

### 3.3 Command Effects

```typescript
// ============================================================================
// COMMAND EFFECTS - State changes after command execution
// ============================================================================

interface CommandEffects {
  // OUTPUT COMMANDS
  takeCue: {
    outputState: 'LIVE'
    programSlides: '= slides'
    programSlideIndex: '= currentSlideIndex'
    programSlide: '= slides[currentSlideIndex]'
    programLockState: 'LIVE-LOCK'
    previewSyncState: 'SYNCED'
    ipcEvent: 'projection:slide-update'
  }

  goToSlide: {
    outputState: 'LIVE'
    currentSlideIndex: '= index'
    programSlides: '= slides'
    programSlideIndex: '= index'
    programSlide: '= slides[index]'
    programLockState: 'LIVE-LOCK'
    previewSyncState: 'SYNCED'
    ipcEvent: 'projection:slide-update'
  }

  toggleBlack: {
    outputState: 'BLACK ⟷ LIVE'
    // If going to LIVE, restore programSlide
    ipcEvent: 'projection:state-change'
    ipcEventIfLive: 'projection:slide-update'
  }

  toggleFreeze: {
    outputState: 'FREEZE ⟷ LIVE'
    ipcEvent: 'projection:state-change'
    ipcEventIfLive: 'projection:slide-update'
  }

  clearScreen: {
    outputState: 'CLEAR'
    programLockState: 'UNLOCKED'
    ipcEvent: 'projection:state-change'
  }

  // NAVIGATION - PREVIEW
  cueNextSlide: {
    currentSlideIndex: '++'
    previewSyncState: 'AHEAD or INDEPENDENT'
  }

  cuePrevSlide: {
    currentSlideIndex: '--'
    previewSyncState: 'AHEAD or INDEPENDENT'
  }

  cueGoToSlide: {
    currentSlideIndex: '= n'
    previewSyncState: 'AHEAD or INDEPENDENT'
  }

  cueGoToSection: {
    currentSlideIndex: '= sectionStartIndex'
    previewSyncState: 'AHEAD or INDEPENDENT'
  }

  // NAVIGATION - PROGRAM
  nextSlide: {
    programSlideIndex: '++'
    programSlide: '= programSlides[newIndex]'
    nextSlide: '= programSlides[newIndex + 1]'
    ipcEvent: 'projection:slide-update'
  }

  prevSlide: {
    programSlideIndex: '--'
    programSlide: '= programSlides[newIndex]'
    nextSlide: '= programSlides[newIndex + 1]'
    ipcEvent: 'projection:slide-update'
  }

  goToLiveSlide: {
    programSlideIndex: '= n'
    programSlide: '= programSlides[n]'
    nextSlide: '= programSlides[n + 1]'
    ipcEvent: 'projection:slide-update'
  }

  goToSection: {
    programSlideIndex: '= sectionStartIndex'
    programSlide: '= programSlides[sectionStartIndex]'
    nextSlide: '= programSlides[sectionStartIndex + 1]'
    ipcEvent: 'projection:slide-update'
  }

  // CONTENT
  loadSong: {
    slides: '= generateSlidesForSong(song)'
    currentSlideIndex: '0'
    cuedSongMeta: '= song.meta'
    previewSyncState: 'INDEPENDENT'
  }

  loadNextSong: {
    queuedSlides: '= generateSlidesForSong(nextSong)'
    nextSong: '= nextSong'
    nextReadyState: 'SONG-QUEUED'
  }

  hotSwapSlides: {
    // If song is cued
    slides: '= newSlides'
    currentSlideIndex: '= clamped to valid range'

    // If song is program
    programSlides: '= newSlides'
    programSlideIndex: '= clamped to valid range'
    programSlide: '= newSlides[programSlideIndex]'

    // If live
    programLockState: 'LIVE-DIRTY'
    ipcEvent: 'projection:slide-update' (if confirmed)
  }

  updateLive: {
    programLockState: 'LIVE-LOCK'
    previewSyncState: 'SYNCED'
    ipcEvent: 'projection:slide-update'
  }

  discardChanges: {
    slides: '= programSlides'
    currentSlideIndex: '= programSlideIndex'
    programLockState: 'LIVE-LOCK'
    previewSyncState: 'SYNCED'
  }
}
```

---

## 4. Slide Addressing System

### 4.1 Address Types

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SLIDE ADDRESSING SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NUMERIC ADDRESS (absolute position):                                   │
│  ────────────────────────────────────                                   │
│  Format: slide:<number>                                                 │
│  Example: slide:0, slide:5, slide:12                                   │
│  Usage: goToSlide(5), goToLiveSlide(5)                                  │
│                                                                          │
│  SECTION ADDRESS (semantic position):                                   │
│  ────────────────────────────────────                                   │
│  Format: section:<label>                                                │
│  Example: section:verse1, section:chorus, section:bridge               │
│  Usage: goToSection('chorus'), cueGoToSection('verse2')                │
│                                                                          │
│  RELATIVE ADDRESS (relative position):                                  │
│  ────────────────────────────────────                                   │
│  Format: relative:<offset>                                              │
│  Example: relative:+1, relative:-1, relative:+section                  │
│  Usage: nextSlide(), prevSlide(), skipSection()                        │
│                                                                          │
│  SPECIAL ADDRESS (semantic shortcuts):                                  │
│  ────────────────────────────────────                                   │
│  Format: special:<keyword>                                              │
│  Example: special:first, special:last, special:next-section           │
│  Usage: goToFirst(), goToLast(), skipSection()                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Section Label Taxonomy

```typescript
// ============================================================================
// SECTION LABELS - Standard worship song structure
// ============================================================================

type SectionLabel =
  | 'intro' // Instrumental intro
  | 'verse1' // First verse
  | 'verse2' // Second verse
  | 'verse3' // Third verse
  | 'pre-chorus' // Build-up before chorus
  | 'chorus' // Main chorus/refrain
  | 'bridge' // Bridge section
  | 'refrain' // Short refrain
  | 'outro' // Ending
  | 'tag' // Tag/ending chorus
  | 'interlude' // Instrumental interlude
  | 'instrumental' // Pure instrumental
  | 'ending' // Final section
  | 'custom' // Custom label

// Section detection from slide data
interface SectionInfo {
  label: SectionLabel
  startIndex: number
  endIndex: number
  slideCount: number
}

// Section navigation helpers
function findSectionIndex(slides: SlideData[], label: SectionLabel): number
function findNextSection(slides: SlideData[], currentIndex: number): number
function findPrevSection(slides: SlideData[], currentIndex: number): number
function getSectionInfo(slides: SlideData[], index: number): SectionInfo
```

### 4.3 Jump Command Implementation

```typescript
// ============================================================================
// JUMP COMMANDS - Navigation with addressing
// ============================================================================

// Absolute jump
function goToSlide(index: number): void
function goToLiveSlide(index: number): void

// Section jump
function goToSection(label: SectionLabel): void
function cueGoToSection(label: SectionLabel): void

// Relative jump
function nextSlide(): void
function prevSlide(): void
function nextSection(): void
function prevSection(): void

// Special jump
function goToFirst(): void
function goToLast(): void
function goToNextSong(): void

// Quick actions
function repeatSection(): void // Jump to start of current section
function skipSection(): void // Jump to start of next section
```

---

## 5. Edit Protection System

### 5.1 Protection Levels

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EDIT PROTECTION LEVELS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LEVEL 0: UNLOCKED                                                      │
│  ───────────────────                                                    │
│  Condition: outputState is CLEAR or BLACK                               │
│  Behavior: Full edit access to all content                              │
│  Visual: No indicators                                                  │
│                                                                          │
│  LEVEL 1: LIVE-LOCK                                                     │
│  ───────────────────                                                    │
│  Condition: outputState is LIVE or FREEZE                               │
│  Behavior: Program content is immutable                                 │
│  Visual: 🔒 LIVE-LOCK badge in Program monitor                          │
│                                                                          │
│  LEVEL 2: LIVE-DIRTY                                                    │
│  ───────────────────                                                    │
│  Condition: Editor modified content while LIVE-LOCK                     │
│  Behavior: Warning state, requires explicit action                      │
│  Visual: ⚠️ LIVE-DIRTY badge, yellow warning                           │
│                                                                          │
│  LEVEL 3: CONFIRMATION REQUIRED                                         │
│  ─────────────────────────                                              │
│  Condition: Attempting to updateLive()                                  │
│  Behavior: Modal confirmation required                                  │
│  Visual: Confirmation dialog with preview                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Protection Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EDIT PROTECTION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Operator edits song while LIVE:                                        │
│  ──────────────────────────────                                         │
│                                                                          │
│  ┌─────────────┐                                                        │
│  │ Edit Action │                                                        │
│  └──────┬──────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────┐                                │
│  │ Is song currently in PROGRAM?       │                                │
│  └─────────────────────────────────────┘                                │
│         │                                                                │
│    ┌────┴────┐                                                           │
│    │         │                                                           │
│   NO        YES                                                          │
│    │         │                                                           │
│    ▼         ▼                                                           │
│  Normal    ┌─────────────────────────────────────┐                      │
│  Edit      │ Is programLockState = LIVE-LOCK?   │                      │
│            └─────────────────────────────────────┘                      │
│                     │                                                    │
│                ┌────┴────┐                                               │
│                │         │                                               │
│               NO        YES                                              │
│                │         │                                               │
│                ▼         ▼                                               │
│              Normal    ┌─────────────────────────────────────┐          │
│              Edit      │ Set programLockState = LIVE-DIRTY   │          │
│                        │ Show warning indicator             │          │
│                        │ Changes go to PREVIEW only         │          │
│                        └─────────────────────────────────────┘          │
│                                  │                                      │
│                                  ▼                                      │
│                        ┌─────────────────────────────────────┐        │
│                        │ Operator chooses:                    │        │
│                        │ • updateLive() - commit to output   │        │
│                        │ • discardChanges() - revert         │        │
│                        │ • ignore - keep dirty state         │        │
│                        └─────────────────────────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Dirty State Indicators

```typescript
// ============================================================================
// DIRTY STATE INDICATORS - Visual feedback for protection states
// ============================================================================

interface DirtyStateIndicators {
  // Program Monitor
  programLockBadge: {
    LIVE_LOCK: {
      icon: '🔒'
      text: 'LIVE-LOCK'
      color: 'status-success'
      tooltip: 'Program is locked while live. Changes go to preview.'
    }
    LIVE_DIRTY: {
      icon: '⚠️'
      text: 'LIVE-DIRTY'
      color: 'status-warning'
      tooltip: 'Program has pending changes. Confirm or discard to continue.'
      pulse: true
    }
  }

  // Control Bar
  dirtyWarning: {
    show: 'programLockState === LIVE_DIRTY'
    style: 'inline-flex items-center gap-2 px-3 py-1 rounded bg-status-warning/15 text-status-warning'
    actions: ['Update Live', 'Discard']
  }

  // Preview Monitor
  previewBadge: {
    SYNCED: {
      text: 'SYNCED'
      color: 'text-muted'
    }
    AHEAD: {
      text: 'READY'
      color: 'text-preview'
    }
    INDEPENDENT: {
      text: 'NEW SONG'
      color: 'text-accent'
    }
  }
}
```

---

## 6. NEXT State Architecture

### 6.1 NEXT Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT STATE HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Runtime Visual Hierarchy (Operator Mental Model):                      │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  PROGRAM / LIVE                                                 │    │
│  │  What the audience sees RIGHT NOW                               │    │
│  │  • programSlide                                                 │    │
│  │  • ON AIR indicator                                             │    │
│  │  • LIVE-LOCK status                                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  NEXT                                                           │    │
│  │  What comes IMMEDIATELY AFTER current                           │    │
│  │  • nextSlide (next in current song)                             │    │
│  │  • nextSong (next in playlist)                                  │    │
│  │  • NEXT indicator (prominent, not embedded)                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  PREVIEW / CUE                                                  │    │
│  │  What operator is PREPARING                                     │    │
│  │  • slides[currentSlideIndex]                                    │    │
│  │  • Independent from PROGRAM                                     │    │
│  │  • TAKE button to commit                                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 NEXT State Definition

```typescript
// ============================================================================
// NEXT STATE - Upcoming content management
// ============================================================================

interface NextState {
  // Immediate next (within current song)
  nextSlide: SlideData | null
  nextSlideIndex: number | null

  // Next song (in playlist)
  nextSong: Song | null
  nextSongIndex: number | null
  queuedSlides: SlideData[]

  // State
  readyState: NextReadyState
  visibility: NextVisibility
}

type NextReadyState =
  | 'EMPTY' // No next content at all
  | 'SLIDE-ONLY' // Next slide exists, no next song
  | 'SONG-ONLY' // No next slide, but next song queued
  | 'BOTH-READY' // Both next slide and next song available

type NextVisibility =
  | 'VISIBLE' // NEXT is shown prominently
  | 'COLLAPSED' // NEXT is minimized
  | 'HIDDEN' // NEXT is not shown

// Computed properties
function computeNextState(program: ProgramState, playlist: PlaylistState): NextState {
  const nextSlideIndex = program.slideIndex + 1
  const hasNextSlide = nextSlideIndex < program.slides.length
  const nextSongIndex = playlist.currentIndex + 1
  const hasNextSong = nextSongIndex < playlist.items.length

  return {
    nextSlide: hasNextSlide ? program.slides[nextSlideIndex] : null,
    nextSlideIndex: hasNextSlide ? nextSlideIndex : null,
    nextSong: hasNextSong ? playlist.items[nextSongIndex] : null,
    nextSongIndex: hasNextSong ? nextSongIndex : null,
    queuedSlides: [], // Populated by loadNextSong()
    readyState: determineReadyState(hasNextSlide, hasNextSong),
    visibility: 'VISIBLE'
  }
}
```

### 6.3 NEXT Display Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT DISPLAY LAYOUT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Option A: Inline NEXT (between Program and Preview)                    │
│  ───────────────────────────────────────────────────                    │
│                                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  PROGRAM  │  │   NEXT    │  │   TAKE    │  │  PREVIEW  │           │
│  │   LIVE    │  │  (small)  │  │           │  │   CUE     │           │
│  │           │  │           │  │           │  │           │           │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘           │
│                                                                          │
│  Option B: NEXT Strip (below Program)                                   │
│  ─────────────────────────────────────                                  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  PROGRAM / LIVE                                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  NEXT: [Slide 3/4] "Tuhan adalah gembala..."  → NEXT SONG: #42   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│  ┌───────────┐                              ┌───────────┐              │
│  │  PREVIEW  │         [TAKE]               │   CUE    │              │
│  └───────────┘                              └───────────┘              │
│                                                                          │
│  Option C: NEXT Panel (dedicated panel)                                 │
│  ────────────────────────────────────                                   │
│                                                                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                           │
│  │  PROGRAM  │  │   NEXT    │  │  PREVIEW  │                           │
│  │   LIVE    │  │  PANEL    │  │   CUE     │                           │
│  │           │  │           │  │           │                           │
│  │           │  │ • Slide   │  │           │                           │
│  │           │  │ • Song    │  │           │                           │
│  │           │  │ • Timer   │  │           │                           │
│  └───────────┘  └───────────┘  └───────────┘                           │
│                                                                          │
│  RECOMMENDATION: Option B (NEXT Strip)                                  │
│  - Minimal layout disruption                                            │
│  - Clear hierarchy: PROGRAM → NEXT → PREVIEW                           │
│  - Easy to scan                                                         │
│  - Can expand for more info                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Keyboard Command Surface v2

### 7.1 Keyboard Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    KEYBOARD COMMAND SURFACE v2                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  OUTPUT CONTROL                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  Space           → TAKE (commit preview to live)                        │
│  B               → Toggle BLACK                                         │
│  F               → Toggle FREEZE                                        │
│  Esc / C         → CLEAR screen                                         │
│  L               → Toggle LOGO                                          │
│  P               → PANIC (instant clear + black)                        │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  LIVE NAVIGATION (when LIVE or FREEZE)                                  │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  → / PageDown    → Next slide                                           │
│  ← / PageUp      → Previous slide                                       │
│  Home            → Go to FIRST slide                                    │
│  End             → Go to LAST slide                                     │
│                                                                          │
│  G + number      → Go to slide N (e.g., G+5 = slide 5)                 │
│  S + section     → Go to section (e.g., S+C = chorus)                  │
│                                                                          │
│  ]               → Next section (skip to verse/chorus)                  │
│  [               → Previous section                                     │
│  R               → Repeat section (go to section start)                 │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  PREVIEW NAVIGATION (independent from live)                             │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  Shift + ↑       → Cue previous slide                                   │
│  Shift + ↓       → Cue next slide                                       │
│  Shift + Home    → Cue first slide                                      │
│  Shift + End     → Cue last slide                                       │
│                                                                          │
│  Shift + G + N   → Cue slide N                                          │
│  Shift + S + X   → Cue section X                                        │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  PLAYLIST / SONG                                                         │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  1-9             → Quick load song N from playlist                      │
│  0               → Load song 10                                         │
│  N               → Load NEXT song (pre-load)                            │
│                                                                          │
│  Ctrl + F        → Focus search                                         │
│  Ctrl + N        → New song editor                                      │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  TRANSITION                                                              │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  T               → Cycle transition type                                │
│  1-4             → Set fade speed (when not in playlist context)        │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  EDIT PROTECTION                                                         │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  Ctrl + Enter    → Update Live (confirm dirty changes)                 │
│  Ctrl + Esc      → Discard changes (revert to program)                  │
│                                                                          │
│  ════════════════════════════════════════════════════════════════════  │
│  SYSTEM                                                                  │
│  ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│  Ctrl + P        → Command Palette                                      │
│  Ctrl + Shift + F → Focus Live Mode                                    │
│  ?               → Keyboard Cheat Sheet                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Keyboard Mode Detection

```typescript
// ============================================================================
// KEYBOARD CONTEXT - Determines which commands are active
// ============================================================================

type KeyboardContext =
  | 'LIVE-OPERATION' // Program is live, navigation affects output
  | 'PREVIEW-EDIT' // Focus is on preview, navigation affects cue
  | 'PLAYLIST-FOCUS' // Focus is on playlist, numbers select songs
  | 'SEARCH-FOCUS' // Focus is on search input
  | 'EDITOR-FOCUS' // Focus is in song editor

function determineKeyboardContext(
  outputState: OutputState,
  focusedElement: HTMLElement | null,
  isTyping: boolean
): KeyboardContext {
  if (isTyping) {
    if (focusedElement?.id === 'song-search-input') return 'SEARCH-FOCUS'
    return 'EDITOR-FOCUS'
  }

  if (outputState === 'LIVE' || outputState === 'FREEZE') {
    return 'LIVE-OPERATION'
  }

  if (focusedElement?.closest('[data-panel="playlist"]')) {
    return 'PLAYLIST-FOCUS'
  }

  return 'PREVIEW-EDIT'
}

// Command routing based on context
function executeNavigationCommand(command: NavigationCommand): void {
  const context = determineKeyboardContext(/* ... */)

  switch (context) {
    case 'LIVE-OPERATION':
      // Arrows affect programSlideIndex
      if (command === 'next') nextSlide()
      if (command === 'prev') prevSlide()
      break

    case 'PREVIEW-EDIT':
      // Shift+arrows affect currentSlideIndex
      if (command === 'next') cueNextSlide()
      if (command === 'prev') cuePrevSlide()
      break

    case 'PLAYLIST-FOCUS':
      // Numbers select playlist items
      if (command.type === 'select-index') quickSong(command.index)
      break
  }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (P0)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1.1 Edit Protection System                                             │
│  ──────────────────────────                                             │
│  • Add programLockState to useProjectionStore                           │
│  • Implement LIVE-LOCK on outputState → LIVE                            │
│  • Implement LIVE-DIRTY on editor modification                         │
│  • Add visual indicators (badge, warning)                              │
│  • Add updateLive() and discardChanges() commands                      │
│  • Add confirmation dialog for updateLive()                            │
│                                                                          │
│  1.2 Quick Jump Architecture                                            │
│  ───────────────────────────                                            │
│  • Add goToLiveSlide(index) command                                    │
│  • Add goToFirst() and goToLast() commands                             │
│  • Add section detection (findSectionIndex)                            │
│  • Add goToSection(label) command                                      │
│  • Add keyboard shortcuts: G+N, Home, End                             │
│                                                                          │
│  1.3 NEXT State                                                         │
│  ───────────────                                                        │
│  • Add nextSlide as separate state (not embedded)                      │
│  • Add nextSong and queuedSlides state                                 │
│  • Add NEXT visibility in UI (strip below Program)                     │
│  • Update nextSlide on programSlideIndex change                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Enhancement (P1)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: ENHANCEMENT                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  2.1 Keyboard Preview Navigation                                        │
│  ────────────────────────────────                                       │
│  • Implement Shift+↑/↓ for cue navigation                              │
│  • Implement Shift+Home/End for cue edges                              │
│  • Implement Shift+G+N for cue slide jump                              │
│  • Implement Shift+S+X for cue section jump                            │
│  • Update KeyboardCheatSheet                                            │
│                                                                          │
│  2.2 Section Navigation                                                 │
│  ───────────────────────                                                │
│  • Implement ] and [ for section navigation                            │
│  • Implement R for repeat section                                      │
│  • Add section timeline visualization                                   │
│  • Add section markers in slide thumbnails                              │
│                                                                          │
│  2.3 Quick Actions                                                      │
│  ─────────────────                                                      │
│  • Implement P for panic (clear + black)                               │
│  • Implement N for next song pre-load                                  │
│  • Implement Ctrl+Enter for updateLive                                 │
│  • Implement Ctrl+Esc for discardChanges                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Advanced (P2)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: ADVANCED                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  3.1 Confidence Monitor Foundation                                      │
│  ─────────────────────────────────                                      │
│  • Design Confidence Monitor window                                     │
│  • Create confidence-specific rendering                                │
│  • Add timer/countdown system                                          │
│  • Add confidence display assignment UI                                │
│                                                                          │
│  3.2 Transition Queue                                                   │
│  ───────────────────────                                                │
│  • Add transition queue data structure                                 │
│  • Implement queueTransition() command                                 │
│  • Implement scheduled transitions                                     │
│  • Add queue visualization in UI                                       │
│                                                                          │
│  3.3 Auto-Advance Timer                                                 │
│  ───────────────────────                                                │
│  • Add per-slide duration metadata                                     │
│  • Implement auto-advance timer                                        │
│  • Add timer controls (pause, resume, reset)                           │
│  • Add timer visualization in UI                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. State Store Interface

### 9.1 Updated ProjectionStore

```typescript
// ============================================================================
// PROJECTION STORE v2 - With all state machine elements
// ============================================================================

interface ProjectionStoreV2 {
  // ══════════════════════════════════════════════════════════════════
  // OUTPUT STATE
  // ══════════════════════════════════════════════════════════════════
  outputState: OutputState
  setOutputState: (state: OutputState) => void

  // ══════════════════════════════════════════════════════════════════
  // PROGRAM STATE
  // ══════════════════════════════════════════════════════════════════
  programSlides: SlideData[]
  programSlide: SlideData | null
  programSlideIndex: number
  programSongMeta: SongMeta | null
  programLockState: ProgramLockState

  // ══════════════════════════════════════════════════════════════════
  // PREVIEW STATE
  // ══════════════════════════════════════════════════════════════════
  previewSlides: SlideData[] // Renamed from 'slides'
  previewSlideIndex: number // Renamed from 'currentSlideIndex'
  previewSongMeta: SongMeta | null // Renamed from 'cuedSongMeta'
  previewSyncState: PreviewSyncState

  // ══════════════════════════════════════════════════════════════════
  // NEXT STATE
  // ══════════════════════════════════════════════════════════════════
  nextSlide: SlideData | null
  nextSlideIndex: number | null
  nextSong: Song | null
  nextSongIndex: number | null
  queuedSlides: SlideData[]
  nextReadyState: NextReadyState

  // ══════════════════════════════════════════════════════════════════
  // TRANSITION STATE
  // ══════════════════════════════════════════════════════════════════
  transitionStatus: TransitionStatus
  transitionType: TransitionType
  transitionDuration: number
  transitionQueue: TransitionQueueItem[]

  // ══════════════════════════════════════════════════════════════════
  // OUTPUT COMMANDS
  // ══════════════════════════════════════════════════════════════════
  takeCue: () => void
  goToSlide: (index: number) => void
  toggleBlack: () => void
  toggleFreeze: () => void
  toggleLogo: () => void
  clearScreen: () => void
  panic: () => void

  // ══════════════════════════════════════════════════════════════════
  // NAVIGATION COMMANDS - PREVIEW
  // ══════════════════════════════════════════════════════════════════
  cueNextSlide: () => void
  cuePrevSlide: () => void
  cueGoToSlide: (index: number) => void
  cueGoToSection: (label: SectionLabel) => void
  cueGoToFirst: () => void
  cueGoToLast: () => void

  // ══════════════════════════════════════════════════════════════════
  // NAVIGATION COMMANDS - PROGRAM
  // ══════════════════════════════════════════════════════════════════
  nextSlide: () => void
  prevSlide: () => void
  goToLiveSlide: (index: number) => void
  goToSection: (label: SectionLabel) => void
  goToFirst: () => void
  goToLast: () => void
  nextSection: () => void
  prevSection: () => void
  repeatSection: () => void

  // ══════════════════════════════════════════════════════════════════
  // CONTENT COMMANDS
  // ══════════════════════════════════════════════════════════════════
  loadSong: (song: Song) => void
  loadNextSong: () => void
  hotSwapSlides: (songId: number, newSlides: SlideData[]) => void
  updateLive: () => void
  discardChanges: () => void

  // ══════════════════════════════════════════════════════════════════
  // TRANSITION COMMANDS
  // ══════════════════════════════════════════════════════════════════
  setTransitionType: (type: TransitionType) => void
  setTransitionDuration: (duration: number) => void
  queueTransition: (item: TransitionQueueItem) => void
  clearTransitionQueue: () => void

  // ══════════════════════════════════════════════════════════════════
  // COMPUTED / HELPERS
  // ══════════════════════════════════════════════════════════════════
  getSectionInfo: (index: number) => SectionInfo | null
  findSectionIndex: (label: SectionLabel) => number
  computeNextState: () => void
  computeSyncState: () => void
}
```

---

## 10. Summary

Dokumen ini mendefinisikan **Projection Runtime State Machine** yang akan menjadi fondasi untuk implementasi fitur-fitur runtime workflow:

**Key Elements:**

1. **State Hierarchy** - OUTPUT, PROGRAM, PREVIEW, NEXT, TRANSITION
2. **State Transitions** - Valid transitions between all states
3. **Command Architecture** - Complete command taxonomy with preconditions
4. **Slide Addressing** - Numeric, section, relative, and special addressing
5. **Edit Protection** - LIVE-LOCK, LIVE-DIRTY, confirmation system
6. **NEXT State** - Explicit hierarchy for upcoming content
7. **Keyboard Surface v2** - Full keyboard operation capability

**Implementation Priority:**

- **Phase 1 (P0)**: Edit Protection + Quick Jump + NEXT State
- **Phase 2 (P1)**: Keyboard Preview Navigation + Section Navigation
- **Phase 3 (P2)**: Confidence Monitor + Transition Queue + Auto-Advance

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
