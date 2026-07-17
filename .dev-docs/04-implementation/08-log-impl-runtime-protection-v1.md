# Implementation Log: Runtime Protection System v1

**Date**: 2026-05-10
**Feature**: LIVE-LOCK / LIVE-DIRTY Protection System
**Priority**: P0 (Critical Safety Layer)

---

## Overview

Implementasi **Runtime Protection System** sebagai fondasi untuk menjaga **runtime authority** dan **operator trust** dalam workflow proyeksi live.

**Core Concept**: Program yang sedang LIVE tidak dapat diubah secara langsung. Semua perubahan masuk ke PREVIEW terlebih dahulu, dan memerlukan **explicit commit** untuk diterapkan ke output.

---

## Problem Statement

### Before Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROBLEM: ACCIDENTAL LIVE MUTATION            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scenario:                                                       │
│  ──────────                                                      │
│  1. Operator sedang LIVE dengan lagu "Bersuka Ria"              │
│  2. Editor memperbaiki typo di lirik                            │
│  3. Perubahan langsung diterapkan ke output                     │
│  4. Audience melihat perubahan mendadak                         │
│  5. Operator kehilangan trust dengan sistem                     │
│                                                                  │
│  Root Cause:                                                     │
│  ────────────                                                    │
│  • No authority boundary between EDIT and LIVE                  │
│  • No explicit commit workflow                                   │
│  • No dirty-state tracking                                       │
│  • No runtime protection awareness                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### After Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLUTION: RUNTIME PROTECTION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workflow:                                                       │
│  ──────────                                                      │
│  1. Operator goes LIVE → programLockState = LIVE_LOCK           │
│  2. Editor modifies song → Changes go to PREVIEW only           │
│  3. programLockState → LIVE_DIRTY                               │
│  4. Visual warning appears                                       │
│  5. Operator chooses:                                            │
│     • Update Live (Ctrl+Enter) → Commit to output               │
│     • Discard (Ctrl+Escape) → Revert to match program           │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • LIVE content is immutable by default                         │
│  • Preview acts as sandbox for changes                          │
│  • Explicit commit required for live update                     │
│  • Operator has full control and awareness                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Type Definitions

**File**: `@/src/renderer/src/types.ts`

```typescript
// ============================================================================
// Runtime Protection Types
// ============================================================================

/**
 * Program Lock State - Controls edit access to live content
 *
 * UNLOCKED: Program can be modified (output is CLEAR/BLACK)
 * LIVE_LOCK: Program is immutable while live (output is LIVE/FREEZE)
 * LIVE_DIRTY: Program has pending changes that require confirmation
 */
export type ProgramLockState = 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'

/**
 * Preview Sync State - Relationship between preview and program
 *
 * SYNCED: Preview matches program exactly
 * AHEAD: Preview is ahead of program (ready to TAKE)
 * INDEPENDENT: Preview has different content (different song)
 */
export type PreviewSyncState = 'SYNCED' | 'AHEAD' | 'INDEPENDENT'

/**
 * Pending Change Record - Tracks what changed in dirty state
 */
export interface PendingChange {
  type: 'slide_content' | 'slide_order' | 'song_metadata'
  timestamp: number
  description?: string
}
```

**Rationale**:

- `ProgramLockState` mendefinisikan 3 state eksplisit untuk authority control
- `PreviewSyncState` disiapkan untuk future use (tracking relationship preview-program)
- `PendingChange` menyimpan audit trail perubahan

---

### 2. Store Implementation

**File**: `@/src/renderer/src/store/useProjectionStore.ts`

#### New State Fields

```typescript
interface ProjectionStore {
  // ... existing fields ...

  // ═══════════════════════════════════════════════════════════════
  // RUNTIME PROTECTION STATE
  // ═══════════════════════════════════════════════════════════════
  programLockState: ProgramLockState
  pendingChanges: PendingChange[]
  hasPendingLiveChanges: boolean
}
```

#### New Actions

```typescript
interface ProjectionStore {
  // ... existing actions ...

  // Runtime Protection Actions
  markDirty: (change: PendingChange) => void
  updateLive: () => void
  discardChanges: () => void
  isProgramLocked: () => boolean
}
```

#### Key Implementation: `hotSwapSlides` with Protection

```typescript
hotSwapSlides: (songId, newSlides) => {
  const {
    slides,
    currentSlideIndex,
    programSlide,
    programSlideIndex,
    projectionState,
    programLockState
  } = get()

  // Handle preview updates (always allowed)
  const newCueIndex = Math.max(0, Math.min(currentSlideIndex, newSlides.length - 1))
  if (slides.length > 0 && slides[0].songId === songId) {
    set({ slides: newSlides, currentSlideIndex: newCueIndex })
  }

  // Handle program updates with lock awareness
  if (programSlide?.songId === songId) {
    const newProgramIndex = Math.max(0, Math.min(programSlideIndex, newSlides.length - 1))

    if (newSlides.length > 0) {
      const slideData = withNextSlide(newSlides, newProgramIndex)

      // Check if program is LIVE_LOCKED
      if (programLockState === 'LIVE_LOCK') {
        // Changes go to preview only, mark as dirty
        set({
          slides: newSlides,
          currentSlideIndex: newCueIndex,
          programLockState: 'LIVE_DIRTY',
          hasPendingLiveChanges: true,
          pendingChanges: [
            ...get().pendingChanges,
            {
              type: 'slide_content' as const,
              timestamp: Date.now(),
              description: 'Lyrics updated while live'
            }
          ]
        })
        logger.warn('[Runtime Protection] Program is LIVE_LOCK, changes stored in preview only')
      } else {
        // Not locked, apply directly
        set({
          programSlides: newSlides,
          programSlideIndex: newProgramIndex,
          programSlide: slideData
        })
        if (projectionState === 'LIVE') sendLiveSlide(slideData)
      }
    }
    // ... handle empty slides case ...
  }
}
```

**Key Decisions**:

1. **Changes to preview always allowed** - Preview adalah sandbox
2. **Changes to program check lock state** - Jika LIVE_LOCK, redirect ke preview
3. **Pending changes recorded** - Audit trail untuk debugging
4. **Logger warnings** - Runtime awareness untuk developer

#### Key Implementation: `updateLive`

```typescript
updateLive: () => {
  const { slides, currentSlideIndex, programLockState, pendingChanges } = get()

  if (programLockState !== 'LIVE_DIRTY') {
    logger.warn('[Runtime Protection] updateLive called but not in LIVE_DIRTY state')
    return
  }

  // Apply pending changes to program
  const slideData = withNextSlide(slides, currentSlideIndex)
  set({
    programSlides: slides,
    programSlideIndex: currentSlideIndex,
    programSlide: slideData,
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })

  sendLiveSlide(slideData)
  logger.info(
    '[Runtime Protection] Live updated with pending changes:',
    pendingChanges.length,
    'changes'
  )
}
```

**Key Decisions**:

1. **Guard clause** - Hanya bisa dipanggil saat LIVE_DIRTY
2. **Full state sync** - Preview → Program
3. **Lock state restored** - Kembali ke LIVE_LOCK setelah update
4. **IPC call** - Update projection window

#### Key Implementation: `discardChanges`

```typescript
discardChanges: () => {
  const { programSlides, programSlideIndex, programLockState } = get()

  if (programLockState !== 'LIVE_DIRTY') {
    logger.warn('[Runtime Protection] discardChanges called but not in LIVE_DIRTY state')
    return
  }

  // Revert preview to match program
  set({
    slides: programSlides,
    currentSlideIndex: programSlideIndex,
    programLockState: 'LIVE_LOCK',
    pendingChanges: [],
    hasPendingLiveChanges: false
  })

  logger.info('[Runtime Protection] Pending changes discarded, preview synced with program')
}
```

**Key Decisions**:

1. **Guard clause** - Hanya bisa dipanggil saat LIVE_DIRTY
2. **Reverse sync** - Program → Preview
3. **Lock state restored** - Kembali ke LIVE_LOCK
4. **No IPC call** - Tidak mengubah output

---

### 3. Visual Indicators

**File**: `@/src/renderer/src/components/LivePreviewPanel.tsx`

#### MonitorFrame Props Extension

```typescript
interface MonitorFrameProps {
  // ... existing props ...
  // Runtime Protection
  programLockState?: 'UNLOCKED' | 'LIVE_LOCK' | 'LIVE_DIRTY'
  hasPendingLiveChanges?: boolean
}
```

#### LIVE_LOCK Badge

```tsx
{
  /* Runtime Protection: LIVE_LOCK indicator */
}
{
  isProgram && programLockState === 'LIVE_LOCK' && (
    <span className="inline-flex items-center gap-1 rounded bg-status-success/16 px-1.5 py-0.5 text-[12px] font-black text-status-success">
      <Lock size={11} />
      LIVE-LOCK
    </span>
  )
}
```

**Visual Design**:

- Green color (`status-success`) → Calm, protected
- Lock icon → Immutable state
- Position: Title bar, Program monitor

#### LIVE_DIRTY Badge

```tsx
{
  /* Runtime Protection: LIVE_DIRTY warning */
}
{
  isProgram && programLockState === 'LIVE_DIRTY' && (
    <span className="inline-flex items-center gap-1 rounded bg-status-warning/20 px-1.5 py-0.5 text-[12px] font-black text-status-warning animate-pulse">
      <AlertCircle size={11} />
      LIVE-DIRTY
    </span>
  )
}
```

**Visual Design**:

- Yellow color (`status-warning`) → Attention required
- Alert icon → Warning state
- `animate-pulse` → Dynamic, needs action
- Position: Title bar, Program monitor

#### Dirty State Warning Bar

```tsx
{
  /* Runtime Protection: Dirty State Warning Bar */
}
{
  programLockState === 'LIVE_DIRTY' && (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-lg bg-status-warning/12 px-4 py-2.5 text-[13px] font-semibold text-status-warning shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-status-warning/20">
      <AlertCircle size={16} className="animate-pulse" />
      <span>Pending changes detected. Apply to live output?</span>
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={() => useProjectionStore.getState().updateLive()}
          className="rounded bg-status-success/20 px-3 py-1 text-[12px] font-bold text-status-success hover:bg-status-success/30 transition-colors"
        >
          Update Live
        </button>
        <button
          onClick={() => useProjectionStore.getState().discardChanges()}
          className="rounded bg-white/10 px-3 py-1 text-[12px] font-bold text-text-muted hover:bg-white/20 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  )
}
```

**Visual Design**:

- Centered at bottom → Prominent but not blocking
- Glass morphism (`backdrop-blur-sm`) → Modern, premium
- Two action buttons → Clear choices
- Animated icon → Urgency

---

### 4. Keyboard Integration

**File**: `@/src/renderer/src/App.tsx`

#### Ctrl+Enter: Update Live

```typescript
case 'Enter':
  if (e.ctrlKey && store.programLockState === 'LIVE_DIRTY') {
    e.preventDefault()
    store.updateLive()
  }
  break
```

**Rationale**:

- `Ctrl+Enter` adalah pattern umum untuk "confirm/submit"
- Hanya aktif saat `LIVE_DIRTY`
- Tidak mengganggu normal Enter behavior

#### Ctrl+Escape: Discard Changes

```typescript
case 'KeyC':
case 'Escape':
  // Ctrl+Escape: discard changes (if LIVE_DIRTY)
  if (e.ctrlKey && store.programLockState === 'LIVE_DIRTY') {
    e.preventDefault()
    store.discardChanges()
  } else if (!e.ctrlKey) {
    // Regular Escape: clear screen
    e.preventDefault()
    store.clearScreen()
  }
  break
```

**Rationale**:

- `Ctrl+Escape` adalah pattern untuk "cancel/revert"
- Preserves original `Escape` → `clearScreen()` behavior
- Hanya aktif saat `LIVE_DIRTY`

---

## State Transition Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROGRAM LOCK STATE TRANSITIONS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────┐                                                          │
│  │ UNLOCKED  │ ← Initial state                                          │
│  └─────┬─────┘                                                          │
│        │                                                                  │
│        │ goToSlide() / takeCue()                                         │
│        │ (Output goes LIVE)                                              │
│        ▼                                                                  │
│  ┌───────────┐                                                          │
│  │ LIVE_LOCK │ ← Program is immutable                                   │
│  └─────┬─────┘                                                          │
│        │                                                                  │
│        │ hotSwapSlides() while LIVE_LOCK                                 │
│        │ (Editor modifies live song)                                    │
│        ▼                                                                  │
│  ┌───────────┐                                                          │
│  │ LIVE_DIRTY│ ← Pending changes, needs action                          │
│  └─────┬─────┘                                                          │
│        │                                                                  │
│   ┌────┴────┐                                                           │
│   │         │                                                            │
│   ▼         ▼                                                            │
│ updateLive()  discardChanges()                                          │
│   │         │                                                            │
│   ▼         ▼                                                            │
│ ┌───────────┐                                                          │
│ │ LIVE_LOCK │ ← Restored                                                │
│ └─────┬─────┘                                                          │
│        │                                                                  │
│        │ clearScreen()                                                   │
│        │ (Output goes CLEAR)                                             │
│        ▼                                                                  │
│  ┌───────────┐                                                          │
│  │ UNLOCKED  │ ← Full edit access restored                              │
│  └───────────┘                                                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Testing Scenarios

### Scenario 1: Normal Live Operation

```
1. Load song → slides populated
2. Press Space (takeCue) → Output goes LIVE
3. Verify: programLockState = LIVE_LOCK
4. Verify: LIVE-LOCK badge visible in Program monitor
5. Navigate slides with arrows → Normal operation
6. Press Escape → Output goes CLEAR
7. Verify: programLockState = UNLOCKED
```

### Scenario 2: Edit While Live (Commit)

```
1. Load song and go LIVE
2. Edit lyrics in editor
3. Verify: programLockState = LIVE_DIRTY
4. Verify: LIVE-DIRTY badge visible (pulsing)
5. Verify: Warning bar appears at bottom
6. Press Ctrl+Enter (Update Live)
7. Verify: Output updates with new lyrics
8. Verify: programLockState = LIVE_LOCK
```

### Scenario 3: Edit While Live (Discard)

```
1. Load song and go LIVE
2. Edit lyrics in editor
3. Verify: programLockState = LIVE_DIRTY
4. Verify: Warning bar appears
5. Press Ctrl+Escape (Discard)
6. Verify: Preview reverts to match program
7. Verify: Output unchanged
8. Verify: programLockState = LIVE_LOCK
```

### Scenario 4: Clear Screen While Dirty

```
1. Load song and go LIVE
2. Edit lyrics → LIVE_DIRTY
3. Press Escape (clearScreen)
4. Verify: Output goes CLEAR
5. Verify: programLockState = UNLOCKED
6. Verify: pendingChanges cleared
```

---

## Code Metrics

| Metric                 | Value      |
| ---------------------- | ---------- |
| Files modified         | 4          |
| Lines added (types)    | ~30        |
| Lines added (store)    | ~120       |
| Lines added (UI)       | ~50        |
| Lines added (keyboard) | ~15        |
| Total new code         | ~215 lines |
| Build status           | ✅ Success |

---

## Future Enhancements

### Phase 2 (Planned)

1. **PreviewSyncState implementation** - Track relationship preview-program
2. **Pending changes detail panel** - Show list of what changed
3. **Auto-discard timer** - Option to auto-discard after timeout
4. **Sound notification** - Audio alert when going LIVE_DIRTY

### Phase 3 (Future)

1. **Multi-song dirty tracking** - Track changes across multiple songs
2. **Undo/Redo for dirty state** - Revert individual changes
3. **Confidence monitor integration** - Show lock state on confidence display
4. **Network sync** - Sync lock state across multiple operators

---

## Lessons Learned

### What Worked Well

1. **Incremental approach** - Tidak rewrite besar, tambah layer di atas existing code
2. **Guard clauses** - Prevent invalid state transitions
3. **Logger integration** - Runtime awareness untuk debugging
4. **Keyboard-first** - Shortcuts implemented sejak awal
5. **Visual hierarchy** - Badge colors match mental model (green=calm, yellow=warning)

### Challenges

1. **Scope management** - `newCueIndex` variable scope issue (fixed)
2. **Keyboard conflict** - `Escape` key had dual purpose (resolved with Ctrl check)
3. **TypeScript strict mode** - Unused parameter warning (fixed with underscore prefix)

### Key Decisions

1. **Changes to preview always allowed** - Preview adalah sandbox, tidak perlu lock
2. **Explicit commit required** - Tidak ada auto-update ke live
3. **Lock state persists until explicit action** - Tidak auto-clear
4. **Clear screen unlocks** - Safety mechanism untuk emergency

---

## References

- **Architecture Doc**: `@/.dev-docs/02-planning/arch-projection-runtime-state-machine-v1.md`
- **Audit Doc**: `@/.dev-docs/02-planning/audit-projection-workflow-v1.md`
- **State Machine**: Section 5 - Edit Protection System

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
