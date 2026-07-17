# Implementation Log: Runtime Command Bus v1

**Date**: 2026-05-10
**Feature**: Runtime Command Bus - Unified command routing
**Priority**: P1.2 (Ecosystem-ready architecture)
**Prerequisites**:

- log-impl-runtime-protection-v1.md
- log-impl-next-state-v1.md
- log-impl-quick-jump-v1.md
- log-impl-confidence-monitor-v1.md

---

## Overview

Implementasi **Runtime Command Bus** sebagai unified command routing untuk semua runtime operations. Single entry point untuk: keyboard, UI, MIDI, Stream Deck, remote apps, websocket, automation.

**Core Concept**: `executeRuntimeCommand()` — satu pintu untuk semua operasi runtime, membuat sistem deterministic, traceable, dan extensible.

---

## Problem Statement

### Before Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROBLEM: SCATTERED COMMAND SURFACE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Current State:                                                  │
│  ──────────────                                                  │
│  • Keyboard shortcuts call store directly                       │
│  • UI buttons call store directly                               │
│  • Quick Jump calls store directly                              │
│  • No unified routing                                           │
│  • No logging/tracing                                           │
│  • No external trigger support                                  │
│                                                                  │
│  Future Pain Points:                                             │
│  ────────────────────                                           │
│  • MIDI controller → where to connect?                          │
│  • Stream Deck → duplicate logic?                              │
│  • Remote app → how to trigger?                                 │
│  • Automation → no command replay                              │
│  • Multi-operator → no sync mechanism                           │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Architecture leakage                                         │
│  • Duplicate logic                                              │
│  • No audit trail                                               │
│  • Ecosystem blocked                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### After Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOLUTION: COMMAND BUS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  New Architecture:                                               │
│  ──────────────────                                              │
│  • Single entry point: executeRuntimeCommand()                  │
│  • Validation layer                                             │
│  • Handler routing                                              │
│  • Event emission                                               │
│  • Command logging                                              │
│                                                                  │
│  Command Sources:                                                │
│  ──────────────────                                              │
│  ┌─────────────┐                                                │
│  │  KEYBOARD   │ ──┐                                            │
│  └─────────────┘   │                                            │
│  ┌─────────────┐   │    ┌──────────────────┐    ┌────────────┐ │
│  │  UI_BUTTON  │ ──┼───▶│ executeRuntime   │───▶│   STORE    │ │
│  └─────────────┘   │    │    Command()      │    │  ACTIONS   │ │
│  ┌─────────────┐   │    └──────────────────┘    └────────────┘ │
│  │ QUICK_JUMP  │ ──┤            │                              │
│  └─────────────┘   │            ▼                              │
│  ┌─────────────┐   │    ┌──────────────────┐                   │
│  │    MIDI     │ ──┤    │  RuntimeEvent    │                   │
│  └─────────────┘   │    │  (logged)        │                   │
│  ┌─────────────┐   │    └──────────────────┘                   │
│  │ STREAM_DECK │ ──┤                                            │
│  └─────────────┘   │                                            │
│  ┌─────────────┐   │                                            │
│  │ REMOTE_APP  │ ──┘                                            │
│  └─────────────┘                                                │
│                                                                  │
│  Result:                                                         │
│  ────────                                                        │
│  • Deterministic routing                                        │
│  • Traceable commands                                          │
│  • Ecosystem-ready                                             │
│  • Audit trail                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Command Types

**File**: `@/src/renderer/src/utils/runtimeCommandBus.ts`

```typescript
/**
 * Runtime Command Type - All possible runtime operations
 */
export type RuntimeCommandType =
  // Navigation Commands
  | 'NAV_NEXT_SLIDE'
  | 'NAV_PREV_SLIDE'
  | 'NAV_GOTO_SLIDE'
  | 'NAV_GOTO_SECTION'
  | 'NAV_GOTO_ADDRESS'
  | 'NAV_CUE_NEXT'
  | 'NAV_CUE_PREV'
  | 'NAV_CUE_GOTO'

  // Projection State Commands
  | 'PROJ_TAKE_CUE'
  | 'PROJ_BLACK'
  | 'PROJ_FREEZE'
  | 'PROJ_CLEAR'
  | 'PROJ_LIVE'

  // Timer Commands
  | 'TIMER_START'
  | 'TIMER_STOP'
  | 'TIMER_RESET'

  // Protection Commands
  | 'PROTECTION_UPDATE_LIVE'
  | 'PROTECTION_DISCARD'

  // Next State Commands
  | 'NEXT_LOAD_SONG'
  | 'NEXT_CLEAR'
```

---

### 2. Command Structure

```typescript
/**
 * Runtime Command - Unified command structure
 */
export interface RuntimeCommand {
  /** Command type */
  type: RuntimeCommandType
  /** Command payload (type-dependent) */
  payload?: RuntimeCommandPayload
  /** Where the command came from */
  source: CommandSource
  /** Timestamp when command was issued */
  timestamp: number
  /** Optional correlation ID for tracking */
  correlationId?: string
}

/**
 * Command Source - Where the command originated
 */
export type CommandSource =
  | 'KEYBOARD'
  | 'UI_BUTTON'
  | 'QUICK_JUMP'
  | 'COMMAND_PALETTE'
  | 'MIDI'
  | 'STREAM_DECK'
  | 'REMOTE_APP'
  | 'WEBSOCKET'
  | 'AUTOMATION'
  | 'MACRO'
```

---

### 3. Event Structure

```typescript
/**
 * Runtime Event - Emitted after command execution
 */
export interface RuntimeEvent {
  /** The command that triggered this event */
  command: RuntimeCommand
  /** Whether execution succeeded */
  success: boolean
  /** Result data (if any) */
  result?: unknown
  /** Error message (if failed) */
  error?: string
  /** Timestamp when event was emitted */
  timestamp: number
}
```

---

### 4. Command Bus Implementation

```typescript
class RuntimeCommandBus {
  private handlers: Map<RuntimeCommandType, CommandHandler> = new Map()
  private validators: Map<RuntimeCommandType, CommandValidator> = new Map()
  private eventListeners: Set<(event: RuntimeEvent) => void> = new Set()
  private commandLog: RuntimeCommand[] = []

  /**
   * Execute a runtime command
   *
   * Flow: validate → execute → emit event → log
   */
  execute(command: RuntimeCommand): RuntimeEvent {
    // 1. Validate
    const validator = this.validators.get(command.type)
    if (validator) {
      const validation = validator(command)
      if (!validation.valid) {
        return this.createFailureEvent(command, validation.error)
      }
    }

    // 2. Execute
    const handler = this.handlers.get(command.type)
    if (!handler) {
      return this.createFailureEvent(command, 'No handler registered')
    }

    const event = handler(command)

    // 3. Emit event
    this.emitEvent(event)

    // 4. Log command
    this.logCommand(command)

    return event
  }
}
```

---

### 5. Convenience Functions

```typescript
/**
 * Execute a command with auto-generated structure
 */
export function executeRuntimeCommand(
  type: RuntimeCommandType,
  payload?: RuntimeCommandPayload,
  source: CommandSource = 'UI_BUTTON'
): RuntimeEvent

/**
 * Create a command without executing
 */
export function createRuntimeCommand(
  type: RuntimeCommandType,
  payload?: RuntimeCommandPayload,
  source: CommandSource = 'UI_BUTTON'
): RuntimeCommand

/**
 * Subscribe to runtime events
 */
export function subscribeToRuntimeEvents(listener: (event: RuntimeEvent) => void): () => void
```

---

### 6. Pre-built Command Factories

```typescript
export const commands = {
  // Navigation
  nextSlide: (source?) => createRuntimeCommand('NAV_NEXT_SLIDE', undefined, source),
  prevSlide: (source?) => createRuntimeCommand('NAV_PREV_SLIDE', undefined, source),
  goToSlide: (index, source?) =>
    createRuntimeCommand('NAV_GOTO_SLIDE', { slideIndex: index }, source),
  goToSection: (section, source?) => createRuntimeCommand('NAV_GOTO_SECTION', { section }, source),

  // Projection
  takeCue: (source?) => createRuntimeCommand('PROJ_TAKE_CUE', undefined, source),
  black: (source?) => createRuntimeCommand('PROJ_BLACK', undefined, source),
  freeze: (source?) => createRuntimeCommand('PROJ_FREEZE', undefined, source),
  clear: (source?) => createRuntimeCommand('PROJ_CLEAR', undefined, source),

  // Timer
  timerStart: (source?) => createRuntimeCommand('TIMER_START', undefined, source),
  timerStop: (source?) => createRuntimeCommand('TIMER_STOP', undefined, source),
  timerReset: (source?) => createRuntimeCommand('TIMER_RESET', undefined, source)
}
```

---

### 7. Command Handlers

**File**: `@/src/renderer/src/utils/runtimeCommandHandlers.ts`

```typescript
/**
 * Register all command handlers
 * Called once during app initialization
 */
export function registerCommandHandlers(): void {
  const store = useProjectionStore.getState

  // Navigation
  commandBus.registerHandler('NAV_NEXT_SLIDE', (cmd) => {
    store().nextSlide()
    return { command: cmd, success: true, timestamp: Date.now() }
  })

  commandBus.registerHandler('NAV_GOTO_SLIDE', (cmd) => {
    const index = cmd.payload?.slideIndex as number
    store().goToSlide(index)
    return { command: cmd, success: true, result: { index }, timestamp: Date.now() }
  })

  // Projection
  commandBus.registerHandler('PROJ_TAKE_CUE', (cmd) => {
    store().takeCue()
    return { command: cmd, success: true, timestamp: Date.now() }
  })

  // Timer
  commandBus.registerHandler('TIMER_START', (cmd) => {
    store().timerStart()
    return { command: cmd, success: true, timestamp: Date.now() }
  })

  // ... etc
}
```

---

### 8. Command Validators

```typescript
/**
 * Register command validators
 * Called once during app initialization
 */
export function registerCommandValidators(): void {
  const store = useProjectionStore.getState

  // Validate navigation commands against LIVE_LOCK
  const navigationCommands = [
    'NAV_NEXT_SLIDE',
    'NAV_PREV_SLIDE',
    'NAV_GOTO_SLIDE',
    'NAV_GOTO_SECTION'
  ]

  navigationCommands.forEach((type) => {
    commandBus.registerValidator(type, (cmd) => {
      const { programLockState } = store()
      if (programLockState === 'LIVE_LOCK') {
        return { valid: false, error: 'LIVE_LOCK active - navigation blocked' }
      }
      return { valid: true }
    })
  })

  // Validate slide index bounds
  commandBus.registerValidator('NAV_GOTO_SLIDE', (cmd) => {
    const index = cmd.payload?.slideIndex as number
    const { programSlides } = store()
    if (index < 0 || index >= programSlides.length) {
      return { valid: false, error: `Slide index ${index} out of bounds` }
    }
    return { valid: true }
  })
}
```

---

## Usage Examples

### From Keyboard

```typescript
// Before
store.nextSlide()

// After
executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'KEYBOARD')
```

### From UI Button

```typescript
// Before
<button onClick={() => store.takeCue()}>Take Cue</button>

// After
<button onClick={() => executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'UI_BUTTON')}>
  Take Cue
</button>
```

### From Quick Jump

```typescript
// Before
store.cueGoToSlide(target.slideIndex)

// After
executeRuntimeCommand('NAV_CUE_GOTO', { slideIndex: target.slideIndex }, 'QUICK_JUMP')
```

### From MIDI (Future)

```typescript
// MIDI mapping
midi.on('note-on', (note) => {
  switch (note) {
    case 60: // C4
      executeRuntimeCommand('NAV_NEXT_SLIDE', undefined, 'MIDI')
      break
    case 62: // D4
      executeRuntimeCommand('NAV_PREV_SLIDE', undefined, 'MIDI')
      break
    case 64: // E4
      executeRuntimeCommand('PROJ_BLACK', undefined, 'MIDI')
      break
  }
})
```

### From Remote App (Future)

```typescript
// WebSocket handler
ws.on('command', (data) => {
  executeRuntimeCommand(data.type, data.payload, 'REMOTE_APP')
})
```

---

## Command Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMMAND EXECUTION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Source (Keyboard, UI, MIDI, etc.)                              │
│       │                                                          │
│       ▼                                                          │
│  createRuntimeCommand(type, payload, source)                    │
│       │                                                          │
│       ▼                                                          │
│  executeRuntimeCommand()                                         │
│       │                                                          │
│       ├──── Validator ────▶ (Invalid? Return error event)      │
│       │                                                          │
│       ├──── Handler ──────▶ Execute store action               │
│       │                                                          │
│       ├──── Event ────────▶ Emit to subscribers                │
│       │                                                          │
│       └──── Log ──────────▶ Add to command history             │
│                                                                  │
│  RuntimeEvent { success, result?, error? }                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Metrics

| Metric                 | Value      |
| ---------------------- | ---------- |
| Files created          | 2          |
| Files modified         | 0          |
| Lines added (bus)      | ~340       |
| Lines added (handlers) | ~300       |
| Total new code         | ~640 lines |
| Build status           | ✅ Success |

---

## Future Integration

### MIDI Controller

```typescript
// Stream Deck / MIDI-ready
midi.on('note', (note) => {
  executeRuntimeCommand(midiMap[note], undefined, 'MIDI')
})
```

### Stream Deck

```typescript
// Elgato Stream Deck integration
streamDeck.on('keyDown', (keyIndex) => {
  executeRuntimeCommand(deckMap[keyIndex], undefined, 'STREAM_DECK')
})
```

### Remote Mobile App

```typescript
// WebSocket remote control
ws.on('message', (msg) => {
  const cmd = JSON.parse(msg)
  executeRuntimeCommand(cmd.type, cmd.payload, 'REMOTE_APP')
})
```

### Automation / Macros

```typescript
// Macro recording & playback
const macro = commandBus.getCommandLog()
macro.forEach((cmd) => {
  executeRuntimeCommand(cmd.type, cmd.payload, 'MACRO')
})
```

---

## Benefits

| Feature             | Before     | After           |
| ------------------- | ---------- | --------------- |
| MIDI Support        | ❌ Blocked | ✅ Easy         |
| Stream Deck         | ❌ Blocked | ✅ Easy         |
| Remote App          | ❌ Blocked | ✅ Easy         |
| Web Control         | ❌ Blocked | ✅ Easy         |
| Macro Automation    | ❌ No      | ✅ Command log  |
| Multi-operator Sync | ❌ No      | ✅ Event stream |
| Audit/Event Log     | ❌ No      | ✅ Built-in     |

---

## Lessons Learned

### What Worked Well

1. **Single entry point** - `executeRuntimeCommand()` simplicity
2. **Source tracking** - Know where commands come from
3. **Validation layer** - Pre-execution checks (LIVE_LOCK, bounds)
4. **Event emission** - Subscribers can react to any command

### Key Decisions

1. **Keep it simple** - No event sourcing, just command → validate → execute → emit
2. **Flexible payload** - `Record<string, unknown>` for extensibility
3. **Correlation ID** - For future distributed tracing
4. **Command log** - Limited size (100) for macro recording

---

## Architecture Impact

### Runtime Layers Status

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Preview/Program Separation       ✅ Complete           │
│  Layer 2: LIVE Protection                  ✅ Complete           │
│  Layer 3: NEXT Awareness                  ✅ Complete           │
│  Layer 4: Fast Semantic Navigation        ✅ Complete           │
│  Layer 5: Confidence Monitor              ✅ Complete           │
│  Layer 6: Unified Command Bus              ✅ Foundation Ready  │
└─────────────────────────────────────────────────────────────────┘
```

**SION Media sekarang memiliki ecosystem-ready command architecture.**

---

## Next Steps

1. **Integrate with existing UI** - Replace direct store calls
2. **MIDI mapping system** - Configurable note-to-command mapping
3. **Stream Deck plugin** - Official integration
4. **WebSocket server** - Remote control endpoint
5. **Command palette** - Searchable command execution

---

## References

- **Architecture Doc**: `@/.dev-docs/02-planning/arch-projection-runtime-state-machine-v1.md`
- **Previous Logs**:
  - `@/.dev-docs/log-impl-runtime-protection-v1.md`
  - `@/.dev-docs/log-impl-next-state-v1.md`
  - `@/.dev-docs/log-impl-quick-jump-v1.md`
  - `@/.dev-docs/log-impl-confidence-monitor-v1.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-05-10
**Author**: Cascade AI Assistant
