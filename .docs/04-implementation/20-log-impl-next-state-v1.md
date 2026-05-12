# Implementation Log: NEXT State Extraction v1

**Date**: 2026-05-10
**Feature**: NEXT State as First-Class Runtime Entity
**Priority**: P0 (Operator Confidence Layer)
**Prerequisite**: log-impl-runtime-protection-v1.md

---

## Overview

Implementasi **NEXT State** sebagai **first-class runtime entity** untuk meningkatkan operator confidence dan mental model clarity.

**Core Concept**: NEXT adalah layer eksplisit dalam runtime hierarchy, bukan sekadar embedded text. Operator mental model: **NOW (PROGRAM) → NEXT → LATER (PREVIEW/CUE)**.

---

## Problem Statement

### Before Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROBLEM: EMBEDDED NEXT INFO                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current State:                                                  │
│  ──────────────                                                  │
│  • nextSlideText embedded in SlideData                          │
│  • No explicit NEXT state tracking                              │
│  • No visibility for next song                                  │
│  • No pre-loading mechanism                                     │
│                                                                  │
│  Operator Pain Points:                                           │
│  ────────────────────                                           │
│  • "What comes next?" - Hard to see                             │
│  • "Is there another song?" - Unknown                           │
│  • "Am I at the end?" - Unclear                                 │
│  • Mental model: CURRENT + RANDOM PREVIEW                       │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Low confidence in live operation                             │
│  • Surprises at song transitions                                │
│  • No preparation time for next content                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### After Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLUTION: EXPLICIT NEXT STATE                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  New Architecture:                                               │
│  ────────────────                                                │
│  • nextSlideData: SlideData | null (explicit)                   │
│  • nextSlideIndex: number | null                                │
│  • hasNextSlide: boolean                                        │
│  • nextSong: Song | null                                        │
│  • queuedSlides: SlideData[] (pre-loaded)                       │
│  • nextReadyState: NextReadyState                               │
│                                                                  │
│  Runtime Hierarchy:                                              │
│  ──────────────────                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PROGRAM / LIVE                                          │   │
│  │  What the audience sees RIGHT NOW                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  NEXT                                                     │   │
│  │  What comes IMMEDIATELY AFTER current                    │   │
│  │  • Next slide in current song                            │   │
│  │  • Next song in playlist                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PREVIEW / CUE                                           │   │
│  │  What operator is PREPARING                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Clear visibility of upcoming content                         │
│  • Preparation time for transitions                             │
│  • Mental model: NOW → NEXT → PREPARE                           │
│  • Broadcast-style confidence                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Type Definitions

**File**: `@/src/renderer/src/types.ts`

```typescript
// ============================================================================
// NEXT State Types - Upcoming content management
// ============================================================================

/**
 * Next Ready State - Availability state of next content
 *
 * EMPTY: No next content at all
 * SLIDE_READY: Next slide exists in current song
 * SONG_QUEUED: Next song is pre-loaded
 * BOTH_READY: Both next slide and next song available
 */
export type NextReadyState = 'EMPTY' | 'SLIDE_READY' | 'SONG_QUEUED' | 'BOTH_READY'

/**
 * Next State - Manages upcoming content for operator awareness
 *
 * The NEXT state is a first-class runtime entity that represents
 * what comes immediately after the current program content.
 *
 * Mental model: NOW (PROGRAM) → NEXT → LATER (PREVIEW/CUE)
 */
export interface NextState {
  /** The slide after current program slide */
  nextSlide: SlideData | null
  /** Index of next slide in programSlides */
  nextSlideIndex: number | null
  /** Whether next slide exists */
  hasNextSlide: boolean

  /** Next song in playlist (for pre-loading) */
  nextSong: Song | null
  /** Index of next song in playlist */
  nextSongIndex: number | null
  /** Whether next song exists in playlist */
  hasNextSong: boolean

  /** Pre-loaded slides for next song */
  queuedSlides: SlideData[]

  /** Overall readiness state */
  readyState: NextReadyState
}
```

**Rationale**:

- `NextReadyState` memberikan quick overview availability
- `NextState` interface lengkap dengan semua info yang dibutuhkan
- `queuedSlides` memungkinkan pre-loading untuk smooth transition

---

### 2. Store Implementation

**File**: `@/src/renderer/src/store/useProjectionStore.ts`

#### New State Fields

```typescript
interface ProjectionStore {
  // ... existing fields ...

  // ═══════════════════════════════════════════════════════════════
  // NEXT STATE - Upcoming content management
  // ═══════════════════════════════════════════════════════════════
  nextSlideData: SlideData | null
  nextSlideIndex: number | null
  hasNextSlide: boolean
  nextSong: Song | null
  nextSongIndex: number | null
  hasNextSong: boolean
  queuedSlides: SlideData[]
  nextReadyState: NextReadyState
}
```

**Note**: `nextSlide` renamed to `nextSlideData` to avoid conflict with existing `nextSlide()` action.

#### New Actions

```typescript
interface ProjectionStore {
  // ... existing actions ...

  // NEXT State Actions
  computeNextState: () => void
  loadNextSong: (song: Song, slides: SlideData[]) => void
  clearNextSong: () => void
}
```

#### Key Implementation: `computeNextState`

```typescript
/**
 * Compute and update NEXT state based on current program state
 * Called automatically when programSlideIndex changes
 */
computeNextState: () => {
  const { programSlides, programSlideIndex, nextSong, queuedSlides } = get()

  // Compute next slide
  const nextIndex = programSlideIndex + 1
  const hasNextSlide = programSlides.length > 0 && nextIndex < programSlides.length
  const nextSlideData = hasNextSlide ? programSlides[nextIndex] : null

  // Compute ready state
  const hasNextSong = nextSong !== null && queuedSlides.length > 0
  let readyState: NextReadyState = 'EMPTY'
  if (hasNextSlide && hasNextSong) {
    readyState = 'BOTH_READY'
  } else if (hasNextSlide) {
    readyState = 'SLIDE_READY'
  } else if (hasNextSong) {
    readyState = 'SONG_QUEUED'
  }

  set({
    nextSlideData,
    nextSlideIndex: hasNextSlide ? nextIndex : null,
    hasNextSlide,
    hasNextSong,
    nextReadyState: readyState
  })
}
```

**Key Decisions**:

1. **Automatic computation** - Dipanggil setiap kali `programSlideIndex` berubah
2. **Ready state calculation** - Memberikan quick overview
3. **No side effects** - Pure computation dari existing state

#### Key Implementation: `loadNextSong`

```typescript
/**
 * Pre-load next song into queuedSlides
 * Called when operator wants to prepare next song
 */
loadNextSong: (song: Song, slides: SlideData[]) => {
  const { programSlide } = get()

  // Don't load if it's the same as current program song
  if (programSlide && song.id === programSlide.songId) {
    logger.warn('[NEXT State] Cannot load current program song as next')
    return
  }

  set({
    nextSong: song,
    nextSongIndex: null, // Will be set by playlist integration
    queuedSlides: slides,
    hasNextSong: true
  })

  // Recompute ready state
  get().computeNextState()

  logger.info('[NEXT State] Loaded next song:', song.title, 'with', slides.length, 'slides')
}
```

**Key Decisions**:

1. **Guard clause** - Tidak boleh load song yang sama dengan current
2. **Slides pre-loaded** - `queuedSlides` siap untuk instant TAKE
3. **Recompute triggered** - Update ready state setelah load

#### Integration Points

Added `computeNextState()` calls to:

```typescript
// In nextSlide()
set({ programSlideIndex: newIndex, ... })
sendLiveSlide(slideData)
get().computeNextState()  // ← Added

// In prevSlide()
set({ programSlideIndex: newIndex, ... })
sendLiveSlide(slideData)
get().computeNextState()  // ← Added

// In goToSlide()
set({ programSlideIndex: index, ... })
sendLiveSlide(slideData)
get().computeNextState()  // ← Added
```

---

### 3. Visual Implementation

**File**: `@/src/renderer/src/components/LivePreviewPanel.tsx`

#### NEXT Strip Component

```tsx
{
  /* NEXT STRIP - Shows upcoming content */
}
{
  nextReadyState !== 'EMPTY' && (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-next-blue/8 px-3 py-2 text-[11px] font-semibold text-next-blue border border-next-blue/15">
      <span className="font-black uppercase tracking-[0.1em] text-next-blue/70">NEXT</span>

      {/* Next Slide */}
      {hasNextSlide && nextSlideLabel && nextSlideData && (
        <div className="flex items-center gap-1.5 border-l border-next-blue/20 pl-2">
          <ChevronRight size={10} />
          <span className="font-bold">{nextSlideLabel}</span>
          <span className="text-next-blue/60 truncate max-w-[120px]">
            {nextSlideData.sectionLabel}
          </span>
        </div>
      )}

      {/* Separator if both exist */}
      {hasNextSlide && hasNextSong && <span className="text-next-blue/30">|</span>}

      {/* Next Song */}
      {hasNextSong && nextSongLabel && (
        <div className="flex items-center gap-1.5 border-l border-next-blue/20 pl-2">
          <span className="font-bold">Song:</span>
          <span className="truncate max-w-[150px]">{nextSongLabel}</span>
        </div>
      )}
    </div>
  )
}
```

**Visual Design**:

- **Color**: `next-blue` (#38bdf8) - Cyan/sky blue untuk distinction
- **Position**: Below Program Monitor
- **Layout**: Horizontal strip dengan sections
- **Content**: NEXT label + Next slide info + Next song info

#### CSS Variable Addition

**File**: `@/src/renderer/src/assets/main.css`

```css
/* Live / Broadcast Colors */
--color-next-blue: #38bdf8;
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT STATE COMPUTATION FLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Trigger: programSlideIndex changes                                     │
│  ────────────────────────────────────────                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  programSlides[]                                                │   │
│  │  programSlideIndex                                              │   │
│  │  nextSong (if loaded)                                           │   │
│  │  queuedSlides (if loaded)                                        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                           │                                              │
│                           ▼                                              │
│                    computeNextState()                                    │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  nextSlideData = programSlides[programSlideIndex + 1]          │   │
│  │  hasNextSlide = nextSlideData !== null                          │   │
│  │  nextSlideIndex = programSlideIndex + 1                         │   │
│  │                                                                   │   │
│  │  hasNextSong = nextSong !== null && queuedSlides.length > 0     │   │
│  │                                                                   │   │
│  │  readyState = calculateReadyState(hasNextSlide, hasNextSong)    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                           │                                              │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  NEXT Strip UI Update                                           │   │
│  │  • Show/hide based on readyState                                │   │
│  │  • Display next slide info                                      │   │
│  │  • Display next song info                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ready State Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    NEXT READY STATE MATRIX                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  hasNextSlide │ hasNextSong │ readyState      │ UI Display              │
│  ─────────────┼─────────────┼────────────────┼────────────────────────│
│  false        │ false       │ EMPTY           │ Hide NEXT strip        │
│  true         │ false       │ SLIDE_READY     │ Show next slide only   │
│  false        │ true        │ SONG_QUEUED     │ Show next song only    │
│  true         │ true        │ BOTH_READY      │ Show both             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Testing Scenarios

### Scenario 1: Navigate Through Song

```
1. Load song with 4 slides
2. Press Space (takeCue) → Slide 1 goes LIVE
3. Verify: NEXT strip shows "Slide 2/4"
4. Press ArrowRight → Slide 2 goes LIVE
5. Verify: NEXT strip shows "Slide 3/4"
6. Press ArrowRight → Slide 3 goes LIVE
7. Verify: NEXT strip shows "Slide 4/4"
8. Press ArrowRight → Slide 4 goes LIVE
9. Verify: NEXT strip hidden (no next slide)
```

### Scenario 2: Pre-load Next Song

```
1. Load song A and go LIVE
2. Call loadNextSong(song B, slides B)
3. Verify: NEXT strip shows "Slide X/Y | Song: B"
4. Navigate to last slide of song A
5. Verify: NEXT strip shows "Song: B" only
6. Take next song from queuedSlides
7. Verify: NEXT strip updates for new song
```

### Scenario 3: At End of Playlist

```
1. Load last song in playlist
2. Go LIVE on last slide
3. Verify: NEXT strip hidden (readyState = EMPTY)
4. Operator knows this is the end
```

---

## Code Metrics

| Metric              | Value      |
| ------------------- | ---------- |
| Files modified      | 4          |
| Lines added (types) | ~50        |
| Lines added (store) | ~90        |
| Lines added (UI)    | ~35        |
| Lines added (CSS)   | 1          |
| Total new code      | ~176 lines |
| Build status        | ✅ Success |

---

## Future Enhancements

### Phase 2 (Planned)

1. **NEXT preview mini-monitor** - Small preview of next slide content
2. **Auto-load next song** - Automatically load next song from playlist
3. **Section markers in NEXT strip** - Show "Chorus → Bridge" transitions
4. **Keyboard shortcut for NEXT** - Quick access to next content

### Phase 3 (Future)

1. **Confidence monitor integration** - NEXT visible on confidence display
2. **Timer/countdown** - Time until next content
3. **Auto-advance** - Automatic progression with NEXT awareness
4. **Service flow visualization** - Full service timeline with NEXT markers

---

## Lessons Learned

### What Worked Well

1. **Naming convention** - `nextSlideData` avoids conflict with `nextSlide()` action
2. **Automatic computation** - No manual triggers needed
3. **Ready state abstraction** - Quick decision making for UI
4. **Visual distinction** - `next-blue` color separates from preview/program

### Challenges

1. **Name conflict** - `nextSlide` already existed as action
2. **Type mismatch** - `song.id` vs `programSongMeta.hymnalCode` comparison
3. **Logger method** - `logger.debug` doesn't exist, used `logger.info`

### Key Decisions

1. **NEXT is computed, not stored separately** - Derived from program state
2. **Ready state is explicit** - Helps UI decision making
3. **Pre-loading via `loadNextSong`** - Manual trigger for now, auto later
4. **NEXT strip below Program** - Logical visual hierarchy

---

## References

- **Architecture Doc**: `@/.docs/02-planning/arch-projection-runtime-state-machine-v1.md`
- **Audit Doc**: `@/.docs/02-planning/audit-projection-workflow-v1.md`
- **Previous Log**: `@/.docs/log-impl-runtime-protection-v1.md`
- **State Machine**: Section 6 - NEXT State Architecture

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
