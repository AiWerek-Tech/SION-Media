# Implementation Log: Confidence Monitor v1

**Date**: 2026-05-10
**Feature**: Confidence Monitor - Stage-facing display system
**Priority**: P1.1 (Highest visible impact)
**Prerequisites**:

- log-impl-runtime-protection-v1.md
- log-impl-next-state-v1.md
- log-impl-quick-jump-v1.md

---

## Overview

Implementasi **Confidence Monitor v1** sebagai stage-facing display untuk musicians, singers, dan worship leaders. Menampilkan current/next content dengan extremely readable typography, clock, timer, dan song metadata.

**Core Concept**: "Musician confidence display yang extremely reliable" — bukan editor UI, tapi broadcast-grade confidence monitor.

---

## Problem Statement

### Before Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROBLEM: OPERATOR-CENTRIC OUTPUT            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current State:                                                  │
│  ──────────────                                                  │
│  • Stage display exists but basic                               │
│  • No timer functionality                                       │
│  • No song metadata display                                      │
│  • No section awareness                                          │
│  • Not optimized for stage readability                          │
│                                                                  │
│  Musician Pain Points:                                           │
│  ────────────────────                                           │
│  • "What's the next line?"                                       │
│  • "What section are we in?"                                     │
│  • "How long have we been singing?"                             │
│  • "What key is this song?"                                      │
│  • "Are we live or not?"                                         │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Musicians rely on memory                                      │
│  • Confidence issues                                             │
│  • Distraction from worship                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### After Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLUTION: CONFIDENCE MONITOR                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  New Capabilities:                                               │
│  ──────────────────                                              │
│  • Current slide - LARGE (7xl-9xl text)                         │
│  • Next slide preview - smaller, italic                          │
│  • Section label - prominent, color-coded                        │
│  • Next section indicator                                        │
│  • Clock - always visible                                         │
│  • Timer - elapsed time tracking                                 │
│  • Song metadata - title, key, hymnal                            │
│  • Live status indicator                                         │
│                                                                  │
│  Display Model:                                                  │
│  ──────────────────                                              │
│  PROGRAM     → audience sees                                     │
│  CONFIDENCE  → singer/musician sees                              │
│  PREVIEW     → operator prepares                                 │
│  NEXT        → upcoming context                                  │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Musicians have confidence                                     │
│  • Reduced cognitive load                                        │
│  • Focus on worship, not memory                                  │
│  • Professional broadcast feel                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Type Definitions

**File**: `@/src/renderer/src/types.ts`

```typescript
// ============================================================================
// Confidence Monitor Types - Stage-facing display system
// ============================================================================

/**
 * Display Role - Different output contexts
 */
export type DisplayRole = 'PROGRAM' | 'STAGE' | 'CONFIDENCE' | 'PREVIEW'

/**
 * Confidence Payload - Normalized runtime data for confidence display
 *
 * Built from current runtime state and broadcast to confidence monitors.
 * Used by: stage display, external monitors, websocket remote, mobile apps
 */
export interface ConfidencePayload {
  // Current content
  currentSlide: {
    text: string
    sectionLabel: string
    slideIndex: number
    totalSlides: number
  } | null

  // Next content
  nextSlide: {
    text: string
    sectionLabel: string
  } | null

  // Section context
  currentSection: string | null
  nextSection: string | null

  // Song metadata
  song: {
    title: string
    hymnalCode: string
    hymnalName: string
    keyNote?: string
  } | null

  // Timing
  clock: string
  timer: {
    elapsed: number // seconds
    running: boolean
  }

  // Runtime status
  status: {
    isLive: boolean
    isFrozen: boolean
    isBlack: boolean
    projectionState: ProjectionState
  }
}
```

---

### 2. Confidence Payload Builder

**File**: `@/src/renderer/src/utils/confidencePayloadBuilder.ts`

#### Main Builder Function

```typescript
/**
 * Build a confidence payload from current runtime state
 */
export function buildConfidencePayload(
  programSlide: SlideData | null,
  programSlides: SlideData[],
  programSlideIndex: number,
  nextSlideData: SlideData | null,
  programSongMeta: { hymnalCode: string; hymnalName: string } | null,
  projectionState: ProjectionState,
  timerElapsed: number = 0
): ConfidencePayload {
  // Current slide data
  const currentSlide = programSlide
    ? {
        text: programSlide.text,
        sectionLabel: programSlide.sectionLabel || '',
        slideIndex: programSlideIndex,
        totalSlides: programSlides.length
      }
    : null

  // Next slide data
  const nextSlide = nextSlideData
    ? {
        text: nextSlideData.text,
        sectionLabel: nextSlideData.sectionLabel || ''
      }
    : null

  // Runtime status
  const isLive = projectionState === 'LIVE' || projectionState === 'FREEZE'
  const isFrozen = projectionState === 'FREEZE'
  const isBlack = projectionState === 'BLACK'

  return {
    currentSlide,
    nextSlide,
    currentSection: programSlide?.sectionLabel || null,
    nextSection: nextSlideData?.sectionLabel || null,
    song: programSlide || programSongMeta ? { ... } : null,
    clock: new Date().toLocaleTimeString(...),
    timer: { elapsed: timerElapsed, running: isLive },
    status: { isLive, isFrozen, isBlack, projectionState }
  }
}
```

#### Helper Functions

```typescript
/**
 * Format elapsed time as MM:SS or HH:MM:SS
 */
export function formatElapsedTime(seconds: number): string

/**
 * Get next section name different from current
 */
export function getNextSectionName(slides: SlideData[], currentIndex: number): string | null

/**
 * Calculate slide progress percentage
 */
export function getSlideProgress(currentIndex: number, totalSlides: number): number
```

---

### 3. Store Integration

**File**: `@/src/renderer/src/store/useProjectionStore.ts`

#### New State

```typescript
// Confidence Monitor State
timerElapsed: number
timerRunning: boolean
```

#### Timer Actions

```typescript
// Timer Control
timerStart: () => void   // Start elapsed time counter
timerStop: () => void    // Stop timer
timerReset: () => void   // Reset to 0
timerTick: () => void    // Increment (called by external interval)

// Payload Builder
getConfidencePayload: () => ConfidencePayload
```

#### Implementation

```typescript
timerStart: () => {
  set({ timerRunning: true })
  logger.info('[Confidence] Timer started')
},

timerStop: () => {
  set({ timerRunning: false })
  logger.info('[Confidence] Timer stopped')
},

timerReset: () => {
  set({ timerElapsed: 0, timerRunning: false })
  logger.info('[Confidence] Timer reset')
},

timerTick: () => {
  const { timerRunning, timerElapsed } = get()
  if (timerRunning) {
    set({ timerElapsed: timerElapsed + 1 })
  }
},

getConfidencePayload: () => {
  const { programSlide, programSlides, programSlideIndex, nextSlideData,
          programSongMeta, projectionState, timerElapsed } = get()
  return buildConfidencePayload(...)
}
```

---

### 4. IPC Channels

**File**: `@/src/shared/ipc-channels.ts`

```typescript
// ============================================================================
// Confidence Monitor Controls
// ============================================================================

export const IPC_CONFIDENCE = {
  UPDATE: 'confidence:update',
  TIMER_START: 'confidence:timer-start',
  TIMER_STOP: 'confidence:timer-stop',
  TIMER_RESET: 'confidence:timer-reset'
} as const
```

---

### 5. Stage Display App (Enhanced)

**File**: `@/src/renderer/src/stageDisplay/StageDisplayApp.tsx`

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Clock] 14:32:45              [Timer] 05:23    [●] LIVE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ♪ CHORUS                                      │
│                                                                  │
│           BESAR TUHAN DAN MULIA                                  │
│           KARYA NYA DAH SYAT MENJADI                             │
│                                                                  │
│                      3 / 12                                      │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│                    NEXT (BRIDGE)                                 │
│           Kuasa Mu Sangat Besar                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ KJ-123  Besar Tuhan  Key: C              Kidung Jemaat          │
└─────────────────────────────────────────────────────────────────┘
```

#### Typography Scale

| Element       | Size    | Style                           |
| ------------- | ------- | ------------------------------- |
| Clock         | 5xl     | Bold, tabular-nums              |
| Timer         | 2xl     | Mono, tabular-nums              |
| Section Label | 3xl     | Black, uppercase, tracking-wide |
| Current Slide | 7xl-9xl | Bold, leading-tight             |
| Next Slide    | 4xl-5xl | Medium, italic                  |
| Song Title    | xl      | Semibold                        |
| Hymnal Code   | lg      | Bold, accent color              |

#### Color Scheme

| Element         | Color         | Purpose                   |
| --------------- | ------------- | ------------------------- |
| Background      | Black         | Low-glare, stage-friendly |
| Current Text    | White         | Maximum contrast          |
| Section Label   | Accent (cyan) | Visual anchor             |
| Next Slide      | Zinc-400      | Subtle, not distracting   |
| Live Indicator  | Red           | Broadcast standard        |
| Timer (running) | Yellow        | Active state              |

---

## Display Role Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISPLAY ROLE MODEL                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │   PROGRAM   │ → Audience-facing projection                   │
│  │             │   Full-screen lyrics, themed backgrounds       │
│  └─────────────┘                                                │
│                                                                  │
│  ┌─────────────┐                                                │
│  │ CONFIDENCE  │ → Stage-facing for musicians                   │
│  │             │   Current + Next, Timer, Metadata              │
│  └─────────────┘                                                │
│                                                                  │
│  ┌─────────────┐                                                │
│  │   PREVIEW   │ → Operator preview monitor                     │
│  │             │   Cue content, not yet live                    │
│  └─────────────┘                                                │
│                                                                  │
│  ┌─────────────┐                                                │
│  │    NEXT     │ → Upcoming context awareness                   │
│  │             │   Next slide, next song                        │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Metrics

| Metric                  | Value      |
| ----------------------- | ---------- |
| Files created           | 1          |
| Files modified          | 5          |
| Lines added (types)     | ~50        |
| Lines added (builder)   | ~120       |
| Lines added (store)     | ~50        |
| Lines added (stage app) | ~200       |
| Lines added (IPC)       | ~10        |
| Total new code          | ~430 lines |
| Build status            | ✅ Success |

---

## Testing Scenarios

### Scenario 1: Basic Confidence Display

```
1. Open Stage Display window
2. Load a song
3. Go LIVE
4. Verify:
   - Current slide text is LARGE
   - Next slide preview is visible
   - Section label is prominent
   - Clock is running
   - Live indicator is red
```

### Scenario 2: Timer Functionality

```
1. Start timer (timerStart action)
2. Wait 10 seconds
3. Verify timer shows 00:10
4. Stop timer (timerStop action)
5. Verify timer stops at current value
6. Reset timer (timerReset action)
7. Verify timer shows 00:00
```

### Scenario 3: Section Navigation

```
1. Song with Verse, Chorus, Bridge
2. Navigate to Chorus
3. Verify:
   - Section label shows "CHORUS"
   - Next section indicator shows upcoming section
4. Navigate to last slide
5. Verify "Last slide" indicator
```

### Scenario 4: Runtime Status

```
1. Go LIVE → Confidence shows LIVE indicator
2. Toggle Black → Confidence shows BLACK status
3. Toggle Freeze → Confidence shows FREEZE status
4. Clear Screen → Confidence shows STANDBY
```

---

## Future Enhancements

### Phase 2 (Planned)

1. **Direct confidence channel** - IPC channel for payload broadcast
2. **Timer auto-start** - Start timer when going LIVE
3. **Countdown mode** - Count down to service start
4. **Multi-monitor support** - Multiple confidence outputs

### Phase 3 (Future)

1. **WebSocket broadcast** - Remote confidence apps
2. **Mobile companion** - iOS/Android confidence app
3. **OBS Browser Source** - Confidence for streaming
4. **Customizable layout** - Per-church preferences
5. **Dark/Low-glare themes** - Stage lighting optimization

---

## Integration Points

### Existing Systems Used

| System             | Usage                              |
| ------------------ | ---------------------------------- |
| NEXT State         | `nextSlideData` for next preview   |
| Runtime Protection | `projectionState` for status       |
| Program Slide      | `programSlide` for current content |
| Section Map        | Section awareness                  |

### Future Integration

| System          | Usage                       |
| --------------- | --------------------------- |
| Command Bus     | Timer control commands      |
| WebSocket API   | Remote confidence broadcast |
| Mobile App      | Confidence payload consumer |
| OBS Integration | Browser source output       |

---

## Lessons Learned

### What Worked Well

1. **Payload abstraction** - Single `ConfidencePayload` type for all consumers
2. **Builder pattern** - `buildConfidencePayload()` as single source of truth
3. **Typography scale** - 7xl-9xl for current, 4xl-5xl for next
4. **Color coding** - Accent for sections, zinc for next, red for live

### Challenges

1. **TypeScript strict mode** - Undefined handling in spread operators
2. **Legacy channel compatibility** - Building payload from old IPC events
3. **Timer state management** - External interval needed for tick

### Key Decisions

1. **Confidence as first-class display role** - Not just projection variant
2. **Timer in store** - Shared state for all consumers
3. **Legacy compatibility** - Support old IPC channels while adding new
4. **Extremely large text** - Stage readability priority

---

## Architecture Impact

### Runtime Layers Status

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Preview/Program Separation       ✅ Complete           │
│  Layer 2: LIVE Protection                  ✅ Complete           │
│  Layer 3: NEXT Awareness                  ✅ Complete           │
│  Layer 4: Fast Semantic Navigation        ✅ Complete           │
│  Layer 5: Confidence Monitor              ✅ Foundation Ready   │
└─────────────────────────────────────────────────────────────────┘
```

**SION Media sekarang memiliki professional confidence display system.**

---

## References

- **Architecture Doc**: `@/.docs/02-planning/arch-projection-runtime-state-machine-v1.md`
- **Previous Logs**:
  - `@/.docs/log-impl-runtime-protection-v1.md`
  - `@/.docs/log-impl-next-state-v1.md`
  - `@/.docs/log-impl-quick-jump-v1.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
