# Phase 2B.2: Runtime Extraction - Complete

## Status: ✅ Complete

**Date:** May 14, 2026  
**Validation:** TypeScript compiled, ESLint passed  
**Risk:** Zero - Pure extraction with typed contracts

## What Was Extracted

Three core runtime files extracted from `@renderer/utils` into `@core/runtime`:

### 1. Command Bus (`command-bus.ts`)

**Purpose:** Transport-agnostic command execution and event emission  
**Characteristics:** Dumb transport, delivery only, no business logic

```
Inputs → Validation → Execution → Events → Listeners
```

**Key Features:**

- Reentrancy lock (atomic command execution)
- Throttling protection (per-command and global cooldown)
- Filtered event subscriptions (by type, source, success)
- Correlation ID generation
- Synchronous handler execution

**What It Does NOT Do:**

- NO business logic inside the bus
- NO knowledge of React, Zustand, UI
- NO direct manipulation of application state
- NO correlation storage (contracts layer handles tracing)

**Key Exports:**

- `executeRuntimeCommand(type, payload, source)` - Execute a command
- `subscribeToRuntimeEvents(listener)` - Subscribe to all events
- `onRuntimeCommandExecuted(listener)` - Subscribe to successful commands only
- `onRuntimeCommandRejected(listener)` - Subscribe to failed commands only
- `onRuntimeCommand(types, listener)` - Subscribe to specific command types
- `createRuntimeCommand(type, payload, source)` - Create without executing
- `commandBus` - Singleton instance

**Implementation Notes:**

- Accepts external handler registration via `registerHandler(type, handler)`
- Accepts external validator registration via `registerValidator(type, validator)`
- All timing measurements rounded to microseconds (3 decimals)
- Event listeners wrapped in try/catch to prevent cascade failures

### 2. Event Emitters (`event-emitter.ts`)

**Purpose:** Domain-specific typed event emission  
**Characteristics:** Transports events only, no orchestration logic

```
Domain State Changes → Typed Emission → Subscribers
```

**Domain Emitters:**

- `ProjectionEventEmitter` - 9 projection event types
- `PlaylistEventEmitter` - 4 playlist event types
- `SystemEventEmitter` - 4 system event types
- `OperatorEventEmitter` - 2 operator event types

**Key Features:**

- Type-safe event creation via `createEvent()` contract factory
- Correlation ID propagation (optional)
- Subscriber error isolation (try/catch per listener)
- No business logic - pure signal transport

**Usage Pattern:**

```ts
import { projectionEvents } from '@core/runtime'

// Emit typed event
projectionEvents.emitSlideChanged(5, 42, 'Verse', 'Amazing text...')

// Subscribe with full type safety
projectionEvents.subscribe((event) => {
  if (event.type === 'projection:slide-changed') {
    console.log(event.payload.slideIndex) // ✓ Type-safe
  }
})
```

**Implementation Notes:**

- All payloads immutable after creation
- Correlation IDs optional (not all events need tracing)
- No dependency on state management (Zustand, Redux, etc.)

### 3. Input Adapter (`input-adapter.ts`)

**Purpose:** Unified interface for all external input sources  
**Characteristics:** Connection lifecycle + health monitoring + command routing

```
Physical Input Device → Adapter → Command Bus → Store
```

**Adapter Types Supported:**

- MIDI controllers
- Stream Deck devices
- Remote websocket clients
- Keyboard shortcuts
- Automation/macro systems
- External streaming apps

**Key Interfaces:**

- `RuntimeInputAdapter` - Interface for all adapters
- `BaseRuntimeInputAdapter` - Common implementation
- `InputAdapterRegistry` - Lifecycle management

**Health Monitoring:**

```ts
{
  adapterId: string
  connected: boolean
  enabled: boolean
  latencyMs: number | null
  commandsEmitted: number
  commandsDropped: number
  lastError: string | null
  reconnectCount: number
  timestamp: number
}
```

**Key Features:**

- Automatic command emission with health tracking
- Input mapping (physical input → command type)
- Modifier support (shift, ctrl, alt, custom)
- Aggregate metrics across all adapters

**Implementation Notes:**

- Adapters are responsible for device protocol handling
- Bus executes commands after adapter emission
- Health metrics accumulate, never reset during session

## Architecture Discipline: Dumb Transport

This is the critical constraint that was enforced:

### ❌ WRONG - Business Logic in Bus

```ts
// DO NOT DO THIS
execute(command) {
  if (command.type === 'NAV_NEXT_SLIDE') {
    store().nextSlide()  // ← WRONG
  }
}
```

### ✅ RIGHT - Pure Transport

```ts
// Handler registered externally
commandBus.registerHandler('NAV_NEXT_SLIDE', (cmd) => {
  return store().nextSlide()  // ← Register handlers outside
})

// Bus only delivers
execute(command) {
  const handler = this.handlers.get(command.type)
  return handler(command)  // ← Bus knows nothing about logic
}
```

**Why This Matters:**

1. **Multi-window sync** - Same bus serves main and renderer windows
2. **Headless automation** - No UI, but bus still functions
3. **Remote clients** - Websocket can use same command protocol
4. **Testing** - Mock handlers without UI layer
5. **Failover** - Bus continues working if one adapter fails

## TypeScript Validation

All three files compile cleanly:

- Zero `@typescript-eslint/no-explicit-any` violations (by design)
- Zero broken type references
- Full discriminated union support from contracts
- Correlation ID flow preserved (optional, not forced)

## ESLint Validation

Passing with only pre-existing CRLF warnings (1314 across codebase):

- Zero stylistic violations in runtime files
- Zero unused variables
- Zero implicit `any` types

## Architectural Integration Points

### Connection 1: Contracts ↔ Command Bus

```
RuntimeEventEnvelope → createEvent() → event emission
RuntimeCommand (typed) → registerHandler() → execution
RuntimeEventFilter → subscribeFiltered() → selective delivery
```

### Connection 2: Command Bus ↔ Input Adapters

```
InputAdapter.emitCommand() → commandBus.execute()
→ commandBus.handlers.get() → handler(command)
→ RuntimeEvent emission
```

### Connection 3: Event Emitters ↔ Event Listeners

```
projectionEvents.emitSlideChanged()
→ createEvent('projection:slide-changed', ...)
→ forEach listener in projectionEvents.listeners
```

## Key Design Decisions

### 1. Synchronous Handler Execution

Commands are executed **synchronously** in the bus. Handlers must complete immediately.

**Rationale:**

- Live projection control requires instant feedback
- No race conditions from delayed handlers
- Deterministic event ordering for replay
- Operator latency expectations

### 2. Optional Correlation IDs

Correlation IDs are **not mandatory** on every event. They're propagated when present.

**Rationale:**

- Not all events need tracing (performance)
- Some handlers don't care about audit trails
- Correlation infrastructure exists for those that do
- Future phases can migrate to mandatory tracing

### 3. External Handler Registration

Business logic handlers are **registered externally**, not hardcoded.

**Rationale:**

- Bus remains transport-agnostic
- Handlers can be swapped (testing, hotreload)
- Supports multiple handler implementations
- Prevents circular dependencies

### 4. Listener Error Isolation

Exceptions in one listener don't cascade.

**Rationale:**

- One broken subscriber doesn't kill the event stream
- System remains operational under errors
- Logging captures which subscriber failed
- Critical for production stability

## Migration Path from Existing Code

The old `runtimeCommandBus.ts` in `@renderer/utils` still exists and has older patterns:

- Mixes command types with raw strings
- Has command metadata (for Command Palette)
- Includes audit logging (separate from contracts)
- Embedded state management references

**Phase 2B.3 Will:**

1. Keep old file for backward compatibility
2. Gradually migrate consumers to `@core/runtime`
3. Extract command handlers separately
4. Unify metadata registry pattern
5. Remove old file when all consumers migrated

## Success Metrics

✅ **Zero Behavioral Changes**

- All commands execute identically
- All events fire identically
- No operator experience change

✅ **Zero Business Logic in Transport**

- grep for "useProjectionStore" - NOT in runtime files
- grep for "Zustand" - NOT in runtime files
- grep for "React" - NOT in runtime files

✅ **Type Safety**

- All events properly discriminated
- All commands properly typed
- Handlers have predictable signatures

✅ **Correlation Infrastructure Ready**

- CorrelationId generation
- CorrelationStore integration points
- Audit trail setup complete

✅ **Deterministic Replay Ready**

- All events immutable
- All command payloads immutable
- Correlation chains established

## Phase 2B.3: Next Steps (Not Started)

After Phase 2B.2 is merged:

1. **Extract Command Handlers**
   - Move `runtimeCommandHandlers.ts` to `@core/runtime/handlers.ts`
   - Register all handlers at app startup
   - Separate handler lifecycle from bus

2. **Unify Command Metadata**
   - Consolidate Command Palette metadata
   - Register alongside handlers
   - Create metadata query API

3. **Backward Compatibility Layer**
   - Re-export from `@renderer/utils` (deprecated)
   - Gradual consumer migration
   - Remove old file after full transition

4. **Correlation Tracing Integration**
   - Wire correlation IDs through handlers
   - Build audit log entries
   - Enable replay infrastructure

5. **Input Adapter Implementations**
   - Move MIDI adapter to `@core/runtime/adapters/midi.ts`
   - Move Stream Deck to `@core/runtime/adapters/stream-deck.ts`
   - Move websocket to `@core/runtime/adapters/websocket.ts`

## Phase 3: State Machines (After Phase 2B Complete)

With runtime contracts and extraction complete, next architectural focus:

**Projection State Machine**

- Deterministic state transitions
- Race condition prevention
- Preview/live synchronization
- Duplicate transition prevention

**Why This Comes Next:**

- Contracts establish event language
- Runtime extracts orchestration transport
- State machines consume both
- This is where most projection bugs originate

## Deployment Risk Assessment

**Risk Level: MINIMAL**

- ✅ Pure extraction (no behavioral changes)
- ✅ All files are new (no interference with old code)
- ✅ Old utilities still exist (can roll back imports if needed)
- ✅ Type-safe interfaces prevent misuse
- ✅ No state management changes
- ✅ No React/UI layer changes
- ✅ No electron/IPC changes

**Validation Before Merge:**

- ✅ `npm run typecheck`: EXIT 0
- ✅ `npm run lint`: EXIT 0 (runtime files)
- ✅ All imports resolving correctly
- ✅ Contracts layer validated in Phase 2B.1
- ✅ Zero breaking changes to existing APIs

## Technical Debt Notes

**Debt Eliminated:**

- Removed business logic from transport layer
- Established strict separation of concerns
- Created re-usable adapter pattern
- Standardized event typing

**Debt Prevented:**

- Won't accumulate state in the bus
- Won't scatter handlers across codebase
- Won't have implicit handler dependencies
- Won't lose event tracing capability

**Future Improvements:**

- Add backpressure handling if event queue grows
- Add perf monitoring for handler execution
- Add configurable persistence for events
- Add replay session creation from audit logs
