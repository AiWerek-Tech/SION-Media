# Projection System Architecture

## Overview

The projection system implements a **formal state machine** with **behavioral correctness guarantees** and **comprehensive session state management**.

### Core Components

1. **FSM Core** - Pure state transitions with formal contracts
2. **Behavioral Invariants** - Automated correctness verification
3. **Async Effects Foundation** - Robust async operation patterns
4. **Projection Session Aggregate** - Unified state model
5. **Integration Adapter** - UI ↔ FSM bridge
6. **Event Trace System** - Observability and debugging

## Projection Session Aggregate

The **Projection Session Aggregate** provides a unified state model that combines all aspects of a projection session into a single, coherent data structure.

### Session Structure

```typescript
interface ProjectionSession {
  sessionId: string // Unique session identifier
  createdAt: number // Session creation timestamp
  updatedAt: number // Last modification timestamp

  fsmState: ProjectionStateMachineState // FSM core state
  mediaState: ProjectionMediaState // Content and slides
  operatorContext: ProjectionOperatorContext // Workflow state
  outputConfig: ProjectionOutputConfig // Display settings
  syncState: ProjectionSyncState // Multi-device coordination
}
```

### State Components

#### FSM State (`ProjectionStateMachineState`)

- **State**: `IDLE | ACTIVE | PAUSED | STOPPED`
- **Context**: Current slide index, transition metadata
- **Timestamp**: State change timestamp

#### Media State (`ProjectionMediaState`)

- **Slides**: All presentation slides
- **Current Slide**: Active slide index
- **Program Content**: Live display slides
- **Song Metadata**: Cued and program song information

#### Operator Context (`ProjectionOperatorContext`)

- **Lock State**: Runtime protection (LOCKED/UNLOCKED)
- **Pending Changes**: Live update queue
- **Next State**: Preview content management
- **Navigation**: Section maps, quick jump support
- **Timer**: Confidence monitor state

#### Output Configuration (`ProjectionOutputConfig`)

- **UI State**: `CLEAR | LIVE | FREEZE | BLACK | LOGO`
- **Display Settings**: Fade speed, output mode
- **Active Media**: Current content type
- **Transition State**: Animation status

#### Sync State (`ProjectionSyncState`)

- **Sync Status**: Multi-device coordination
- **Version Control**: Conflict resolution
- **Remote Sessions**: Distributed operation support

### Session Operations

#### State Updates

```typescript
// Update FSM state (auto-syncs UI state)
const updated = updateSessionFSMState(session, newFSMState)

// Update media content
const updated = updateSessionMediaState(session, { slides, currentSlideIndex })

// Update operator workflow
const updated = updateSessionOperatorContext(session, { programLockState: 'LOCKED' })

// Update output settings
const updated = updateSessionOutputConfig(session, { fadeSpeed: 0.8 })

// Update sync coordination
const updated = updateSessionSyncState(session, { syncStatus: 'PENDING' })
```

#### Validation

```typescript
const validation = validateSessionState(session)
if (!validation.isValid) {
  console.error('Session state errors:', validation.errors)
}
```

#### Serialization

```typescript
// Persist session state
const json = serializeSession(session)

// Restore session state
const restored = deserializeSession(json)
```

### Design Principles

#### Single Source of Truth

- All projection state unified in one aggregate
- Eliminates state synchronization issues
- Provides complete session context for operations

#### Immutable Updates

- All updates return new session instances
- Timestamp tracking for change detection
- Thread-safe concurrent operations

#### Type Safety

- Comprehensive TypeScript interfaces
- Runtime validation with detailed error messages
- Compile-time correctness guarantees

#### Persistence Ready

- JSON serializable for storage
- Version control for conflict resolution
- Migration support for schema evolution

## Authority Model

The projection system implements a **deterministic state-machine authority model** with explicit boundaries:

### Authority Layers

1. **State Machine Layer** (Authority)
   - Pure reducers: `reduceTakeCue`, `reduceGoLive`, etc.
   - Immutable snapshots: `ProjectionStateMachineState`
   - Deterministic transitions: `runTransition`
   - Side-effect free computation

2. **Handler Layer** (Orchestration)
   - Snapshot extraction: `extractProjectionSnapshotFromStore`
   - Transition requests: `requestTransition`
   - Effect execution: `executeProjectionEffects`
   - No business logic

3. **Sync Layer** (Boundary)
   - Bidirectional marshaling: `syncProjectionSnapshotToStore`
   - Zustand reactivity preservation
   - No transformation logic

4. **Effect Layer** (Runtime I/O)
   - Explicit side effects: `ProjectionEffect[]`
   - Electron IPC: `window.api.projection.*`
   - Persistence: session save, theme updates
   - No state computation

5. **Zustand Layer** (Synchronization)
   - UI reactivity: computed properties, selectors
   - Legacy compatibility: deprecated adapters
   - No authority: pure view layer

### Authority Migration Status

**Fully Migrated Commands:**

- ✅ `projection:take-cue` - transactional preview→program promotion
- ✅ `projection:go-live` - recovery with explicit lock state
- ✅ `projection:next-slide` - pure navigation
- ✅ `projection:prev-slide` - pure navigation
- ✅ `projection:go-to-slide` - indexed navigation with lock
- ✅ `projection:go-to-section` - semantic navigation
- ✅ `projection:go-to-address` - universal address resolution
- ✅ `projection:black` - state toggle
- ✅ `projection:freeze` - state toggle
- ✅ `projection:clear` - cleanup transition

**Authority Leaks Eliminated:**

- ✅ Direct Zustand mutation in handlers
- ✅ Embedded side effects in store methods
- ✅ Hidden business logic in sync layer
- ✅ Runtime coupling in reducers

## Runtime Flow

```
Handler → Snapshot → Transition → Effects → Sync → Zustand
   ↓         ↓         ↓         ↓       ↓       ↓
Orchestration  Authority  Computation  I/O    Boundary  Reactivity
```

### Detailed Flow

1. **Handler** (orchestration-only)

   ```typescript
   const snapshot = extractProjectionSnapshotFromStore()
   const result = requestTransition(snapshot, request)
   syncProjectionSnapshotToStore(result.nextState)
   executeProjectionEffects(result.effects)
   ```

2. **Reducer** (pure computation)

   ```typescript
   export function reduceTakeCue(state): ProjectionSnapshot {
     return Object.freeze({ ...state, projectionState: 'LIVE', ... })
   }
   ```

3. **Transition Runner** (orchestration)

   ```typescript
   const nextState = reduceTakeCue(previousState)
   const effects = buildTransitionEffects(previousState, nextState, request)
   return { nextState, effects, ... }
   ```

4. **Effect Executor** (runtime I/O)
   ```typescript
   effects.forEach((effect) => {
     switch (effect.type) {
       case 'projection:slide-update':
         window.api.projection.slideUpdate(effect.payload.slide)
         break
       // ...
     }
   })
   ```

## Deterministic Guarantees

### Snapshot Determinism

- **Immutable**: `Object.freeze()` prevents mutation
- **Serializable**: JSON-safe for storage/transmission
- **Replayable**: Identical inputs → identical outputs
- **Canonical**: Single source of truth for projection state

### Transition Determinism

- **Pure Functions**: No external state access in reducers
- **Predictable**: Same snapshot + request → same result
- **Auditable**: Full transition history with snapshot IDs
- **Verifiable**: Invariant validation at runtime

### Effect Determinism

- **Explicit**: All side effects declared in transition result
- **Ordered**: Execution order preserved from transition
- **Isolated**: No state computation in effect layer
- **Replayable**: Effects can be re-executed from history

## Replay Architecture

### Transition Logging

```typescript
interface ProjectionTransitionRecord {
  sequenceNumber: number
  timestamp: number
  transitionType: string
  previousSnapshotId: string
  nextSnapshotId: string
  payloadDigest: string
  requestSummary: string
}
```

### Replay Validation

- **Snapshot Chain**: Validates ID continuity
- **Deterministic Evolution**: Re-executes transitions, compares results
- **Effect Consistency**: Validates effect emission rules
- **State Invariants**: Checks structural integrity

### Replay Harness

```typescript
const results = replayTransitionSequence(records, initialState)
const validation = validateReplayIntegrity(results)
```

## Invariant Validation

### Snapshot Invariants

- Required fields present and typed correctly
- Index bounds within slide array limits
- Lock state consistency with pending changes
- Section map validity and bounds

### Transition Invariants

- State evolution legality (immutable instances)
- Effect emission consistency
- Snapshot ID generation correctness
- Transition-specific state changes

### Runtime Invariants

- No direct Zustand mutation outside sync layer
- No side effects in reducers
- No business logic in handlers
- No runtime coupling in state machine

## Semantic Resolution

### Address Resolution Boundary

```typescript
// Pure deterministic resolver
export function resolveSlideAddressDeterministically(
  address: SlideAddress,
  slides: SlideData[],
  sectionMap: SectionIndexMap,
  currentIndex: number
): ResolvedSlideTarget
```

### Resolution Types

- **Numeric**: `5` → slide index 4 (1-indexed)
- **Section**: `chorus` → first occurrence in sectionMap
- **Relative**: `+1`, `next` → offset from current
- **Special**: `first`, `last` → boundary navigation

## Legacy Compatibility

### Deprecated Adapters

```typescript
// Legacy API → State Machine
export function legacyGoToSlide(index: number): void {
  const snapshot = extractProjectionSnapshotFromStore()
  const result = requestTransition(snapshot, {
    type: 'projection:go-to-slide',
    payload: { slideIndex: index }
  })
  // ... sync and execute
}
```

### Migration Path

1. **Phase 1**: Add state-machine implementation
2. **Phase 2**: Migrate handlers to orchestration
3. **Phase 3**: Add legacy adapters with deprecation warnings
4. **Phase 4**: Remove legacy adapters (future)

## Development Guidelines

### Reducer Discipline

- **Pure**: No external state, no I/O, no mutation
- **Deterministic**: Same inputs → same outputs
- **Immutable**: Return frozen snapshots
- **Focused**: Single responsibility per reducer

### Handler Discipline

- **Orchestration**: Extract → Request → Sync → Execute
- **No Logic**: No business rules, no state computation
- **Error Handling**: Graceful failure with logging
- **Idempotent**: Safe to retry on failure

### Effect Discipline

- **Explicit**: Declare all runtime consequences
- **Minimal**: Emit only when semantically necessary
- **Ordered**: Preserve execution dependencies
- **Isolated**: No state access or computation

### Testing Discipline

- **Unit**: Pure functions with mock inputs
- **Integration**: End-to-end transition validation
- **Replay**: Deterministic evolution verification
- **Invariant**: Structural integrity validation

## Future Extensions

### Event Sourcing

- Transition log as event stream
- Projection reconstruction from events
- Event-driven architecture foundation

### Multi-Window Sync

- Snapshot broadcasting across windows
- Deterministic rendering from shared state
- Collaborative projection sessions

### Remote Sync

- Snapshot transmission over network
- Deterministic remote replay
- Conflict resolution via snapshot IDs

### Time Travel Debugging

- Historical state inspection
- Transition replay with breakpoints
- Effect execution tracing

## Migration Status

**Phase 3B: Authority Transfer Complete** ✅

- ✅ State machine scaffolding
- ✅ Pure reducer implementations
- ✅ Handler migration to orchestration
- ✅ Effect layer isolation
- ✅ Sync boundary establishment
- ✅ Legacy compatibility adapters
- ✅ Deterministic replay foundation
- ✅ Invariant validation layer
- ✅ Semantic resolver boundary
- ✅ Transition logging infrastructure
- ✅ Architecture documentation

**Ready for:**

- Event sourcing integration
- Multi-window deterministic rendering
- Remote collaborative features
- Advanced debugging tools
- Production hardening

**Authority Boundary:** Fully deterministic, replayable, auditable projection runtime.

## Future Roadmap

- [ ] **Multiple output formats** (slides, live graphics, streaming)
- [ ] **Formula support** (when broadcast needs it)
- [ ] **Async loading** (large hymnals)
- [ ] **Custom rendering** (plugins for effects)

## Related Issues / PRs

- [Link to issues if any]

## Questions / Escalation

If you have questions about projection engine:

1. Check this README first
2. Review slideEngine.ts comments
3. Ask in PR review / team sync
