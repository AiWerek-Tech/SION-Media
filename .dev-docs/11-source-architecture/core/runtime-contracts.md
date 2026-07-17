# @core/runtime/contracts

## Overview

Runtime Event & Command Contracts — the foundation for deterministic, auditable runtime orchestration.

This layer defines **what can happen** in the runtime system without prescribing **how it happens**. It's transport-agnostic, replay-safe, and designed to scale as SION Media evolves.

## Architecture Principle

```
OPERATOR INPUT → COMMAND → EXECUTION → EVENT → STATE → DISPLAY
     ↓            ↓           ↓          ↓        ↓        ↓
  Keyboard     Contract    Handler    Contract  Store    Render
  MIDI         Type        (impure)    Type     (sync)   (async)
  Remote       (pure)                  (pure)
  WebSocket    Domain:Action           Domain:Action
```

## Core Concepts

### 1. Events vs. Commands (Critical Distinction)

**Commands** = Intent

- Request for action
- Can be blocked, throttled, rejected
- Directional (toward system)
- Can fail

```ts
projection:go-to-slide { slideIndex: 5 }  // "Please show slide 5"
```

**Events** = Facts

- Already happened
- Immutable
- Broadcast-able
- Historical truth

```ts
projection:slide-changed { slideIndex: 5, text: "..." }  // "Slide 5 is now showing"
```

**Why this matters:**

- State machines can't be built from commands alone
- Audit logs need facts, not intentions
- Replay requires deterministic event ordering
- Automation/macros need causal chains

### 2. Event Envelope Contract

Every event MUST conform to this structure:

```ts
interface RuntimeEventEnvelope<T> {
  id: string // Unique, immutable
  type: RuntimeEventType // Domain:action (projection:slide-changed)
  timestamp: number // When emitted (server time)
  source: RuntimeEventSource // Who/what: OPERATOR|SYSTEM|AUTOMATION|EXTERNAL
  correlationId?: CorrelationId // Trace command→events
  payload: T // Type-specific data
  command?: {
    // (Optional) originating command
    type: string
    source: CommandSource
    correlationId?: CorrelationId
  }
}
```

### 3. Correlation ID Strategy

Every command generates or receives a correlation ID that flows through the entire event chain.

**Used for:**

- Command tracing (debugging desync)
- Operator audit logs
- Distributed tracing (IPC + websocket)
- Replay systems
- Automation chain validation

**Format:** UUID-like string (36 chars, immutable)

**Lifetime:**

- Generated at command entry point
- Propagated through all resulting events
- Stored in audit log
- Queryable for replay/debugging

### 4. Event Namespacing Discipline

Events are organized by **domain** using strict naming:

```
projection:*     Slide changes, state transitions, effects
playlist:*       Item loading, playback, queueing
runtime:*        Command execution, orchestration, recovery
system:*         App lifecycle, database, crash recovery
operator:*       Settings, profiles, user preferences
```

**Non-Negotiable:** No raw string events like `"slideChanged"` scattered across code.

All events must be registered in the `RuntimeEventType` discriminator.

### 5. Command Payloads Are Typed

Each command type has exactly one payload schema, enforced at compile time:

```ts
interface ProjectionGoToSlideCommand {
  type: 'projection:go-to-slide'
  payload: {
    slideIndex: number // Required
  }
}

interface ProjectionNextSlideCommand {
  type: 'projection:next-slide'
  payload?: {} // Optional (no data needed)
}
```

This prevents:

- Silent payload mismatches
- Runtime type errors
- Undocumented command formats

## File Organization

```
@core/runtime/contracts/
  runtime-types.ts      # Core types (CorrelationId, RuntimeEventEnvelope, etc.)
  events.ts             # Event type definitions (projection:*, playlist:*, etc.)
  commands.ts           # Command type definitions
  correlation.ts        # Correlation ID management & tracing
  index.ts              # Barrel exports
  README.md             # This file
```

## Event Types by Domain

### Projection Events

```ts
projection: slide - changed // Live slide changed
projection: section - reached // Reached new section
projection: state - changed // State machine transition
projection: frozen // Frozen to a slide
projection: blacked // Black screen activated
projection: cleared // Display cleared
projection: live - taken // Cued slide taken live
projection: cue - taken // Next slide cued
projection: desync - detected // Desync detected and recovery initiated
```

### Playlist Events

```ts
playlist: item - loaded // Song/item loaded into cue
playlist: item - cued // Item prepared for playback
playlist: playback - started // Playback began
playlist: playback - stopped // Playback stopped
```

### Runtime Events

```ts
runtime: command - executed // Command succeeded
runtime: command - rejected // Command blocked
runtime: command - throttled // Command throttled (retry later)
runtime: state - corrupted // State inconsistency detected
runtime: recovery - initiated // Recovery system activated
```

### System Events

```ts
system: app - started // Application started
system: app - ready // Initialization complete
system: db - initialized // Database ready
system: crash - detected // Crash/error detected
```

### Operator Events

```ts
operator: settings - changed // User setting changed
operator: profile - switched // Profile switched
```

## Command Types by Domain

### Projection Commands

```ts
projection: go - to - slide // Navigate to specific slide
projection: go - to - section // Jump to section
projection: go - to - address // Navigate by address (fuzzy matching)
projection: next - slide // Next slide
projection: prev - slide // Previous slide
projection: go - live // Take cue live
projection: take - cue // Cue next item
projection: black // Black screen
projection: freeze // Freeze current
projection: clear // Clear display
```

### Playlist Commands

```ts
playlist: load - item // Load song into cue
playlist: queue - next // Queue item for playback
playlist: cue - next // Move to next queued item
```

### Runtime Commands

```ts
runtime: start - timer // Start countdown/elapsed timer
runtime: stop - timer // Stop timer
runtime: reset - timer // Reset timer to zero
```

### Operator Commands

```ts
operator: update - settings // Change user setting
```

## Usage Patterns

### Emitting Typed Events

```ts
import { createEvent, correlationStore, type RuntimeEvent } from '@core/runtime/contracts'

// Create a typed event
const event: RuntimeEvent = createEvent(
  'projection:slide-changed',
  {
    slideIndex: 5,
    totalSlides: 42,
    sectionLabel: 'Verse',
    text: 'Your grace is...'
  },
  'OPERATOR',
  correlationId
)

// Event is immutable after creation
// event.payload.slideIndex // ✓ Type-safe
// event.payload.unknown    // ✗ Compile error
```

### Creating Typed Commands

```ts
import { createCommand } from '@core/runtime/contracts'

const cmd = createCommand('projection:go-to-slide', 'KEYBOARD', { slideIndex: 5 }, correlationId)
```

### Tracing Command Execution

```ts
import { correlationStore } from '@core/runtime/contracts'

// At command entry
correlationStore.registerTrace(correlationId, command)

// Record events
correlationStore.recordEvent(correlationId, eventId, 'projection:slide-changed', Date.now(), true)

// At command completion
const trace = correlationStore.completeTrace(correlationId, result)

// Query for debugging
const trace = correlationStore.queryTraces(correlationId)
console.log(trace.events) // All events in chain
```

### Subscribing to Events

```ts
import { RuntimeEventHandler, RuntimeEvent } from '@core/runtime/contracts'

const handler: RuntimeEventHandler = (event: RuntimeEvent) => {
  // Type-safe discriminator
  if (event.type === 'projection:slide-changed') {
    console.log(event.payload.slideIndex) // ✓ Safe
  }
}

eventBus.subscribe(handler)
```

## Design Constraints

### 1. Transport Agnostic

Events/commands work over:

- Local function calls
- Electron IPC
- WebSocket
- REST
- Message queues
- Replay systems

No transport layer is baked into contracts.

### 2. No UI Dependencies

Events do NOT know about:

- React components
- Zustand stores
- UI state
- Theme
- Animation

Events are pure data. UI consumes them.

### 3. No Electron Dependencies

Events do NOT know about:

- Electron IPC channel names
- Window IDs
- Process types
- BrowserWindow

Allows future: web app, mobile, CLI, automation.

### 4. Replay Safe

All events can be deterministically replayed by:

- Correlation ID (group related events)
- Timestamp order
- Original command (intent)

### 5. Immutable After Emission

Events are read-only after creation. No mutation.

Commands are mutable only before execution, immutable after.

## Future Extensions (Design Headroom)

These are NOT implemented yet, but contracts support them:

1. **Macros/Automation**
   - Commands source: `'MACRO'`
   - Correlation IDs trace macro execution
   - Event replay for macro debugging

2. **WebSocket Sync**
   - Events serializable to JSON
   - Correlation IDs work across network
   - Remote devices get full trace history

3. **OBS Integration**
   - Project event streams to OBS
   - Use event type/payload for scene switching
   - Bidirectional command/event sync

4. **Mobile Companion App**
   - Mobile sends commands (correlationId propagated)
   - Mobile receives events (same envelope format)
   - Full audit log accessible on mobile

5. **Deterministic Replay**
   - Load correlation trace from audit log
   - Replay commands in original order
   - Verify events match recorded history
   - Detect desync causes

6. **State Machine**
   - States derived from events (event sourcing)
   - Transitions defined by command/event pairs
   - Desync recovery via event replay

## Performance Considerations

### Correlation Store Limits

- Max 1000 active traces (WARN at 800)
- Max 500 recent traces (5-minute retention)
- Oldest traces auto-evicted

### Audit Log

- Retention: 7 days or 10,000 entries (whichever first)
- Stored in SQLite (persistent)
- Queryable by: correlationId, timestamp, type, source

### Memory Impact

- Correlation store: ~1-2MB (typical usage)
- Event envelope: ~500 bytes (average)
- Command: ~200 bytes (average)

## Forbidden Patterns

### ❌ Raw String Events

```ts
// NEVER DO THIS
emit('slideChanged')
eventBus.publish('slide_changed', data)
```

All events must use `RuntimeEventType` discriminator.

### ❌ Circular Correlation

```ts
// NEVER DO THIS
// Command A generates Event B which triggers Command C
// But don't lose correlationId in the chain
// Always propagate correlationId through chain
```

### ❌ Shared Payloads

```ts
// NEVER DO THIS
const payload = { ... }
emit('event1', payload)
emit('event2', payload)
payload.mutated = true // ✗ Breaks immutability
```

Create new payload for each event.

### ❌ Implicit Dependencies

```ts
// NEVER DO THIS
// "When projection:slide-changed fires, assume playlist is synced"
// Explicitly emit playlist:item-changed if needed
```

Use correlation IDs for explicit causality.

## Testing Strategy

Mock events and commands for unit tests:

```ts
import { createEvent, createCommand } from '@core/runtime/contracts'

describe('Projection Handler', () => {
  it('should handle slide-changed event', () => {
    const event = createEvent(
      'projection:slide-changed',
      { slideIndex: 5, totalSlides: 42, text: '...' },
      'OPERATOR'
    )

    handler(event)
    expect(store.currentSlide).toBe(5)
  })
})
```

Use `correlationStore` for integration tests:

```ts
describe('Command Tracing', () => {
  it('should trace command through event chain', async () => {
    const correlationId = createCorrelationId()
    correlationStore.registerTrace(correlationId, command)

    await executeCommand(command)

    const trace = correlationStore.queryTraces(correlationId)
    expect(trace.events.length).toBeGreaterThan(0)
  })
})
```

## Migration from Old Runtime

Old code:

```ts
emit('slideChanged', { index: 5 })
subscribe('slideChanged', handler)
```

New code:

```ts
eventBus.emit('projection:slide-changed', createEvent('projection:slide-changed', {...}, 'OPERATOR'))
eventBus.subscribe(handler)  // Handler receives RuntimeEventEnvelope
```

Compatibility layer maintains old APIs during transition (Phase 2B execution).

## Roadmap

**Phase 2B.1** (Current)

- ✅ Define event/command contracts
- ✅ Establish correlation strategy
- ⏳ Type-safe event creation helpers
- ⏳ Event registry validation

**Phase 2B.2**

- Extract runtimeCommandBus to @core/runtime/
- Extract runtimeEvents to @core/runtime/
- Integrate contracts into execution path

**Phase 2B.3**

- Runtime event emission uses contracts
- Command execution uses typed contracts
- Correlation IDs flow through system

**Phase 3**

- Projection state machine
- Event-sourced state
- Deterministic replay

**Phase 4+**

- Remote operation (websocket + correlation)
- OBS integration
- Mobile companion
- Macro/automation engine
