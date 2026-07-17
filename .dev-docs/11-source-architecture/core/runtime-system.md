# Core: Runtime & Command System

## Ownership

- **Maintainer:** Runtime/Command Architecture Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Central runtime orchestration:

- Command bus (registry, execution, dispatch)
- Runtime event subscription system
- Runtime health monitoring
- Input adapter registration & management
- Event logging for debugging

## State

- **Primary Module:** `commandBus.ts`, `runtimeEvents.ts`
- **Related Modules:** `runtimeInputAdapter.ts`, `health.ts`
- **Persistence:** None (real-time operational state)

## Architecture

```
core/runtime/
├── commandBus.ts           # Central command registry & execution
├── runtimeCommandHandlers.ts # Handler implementations
├── runtimeInputAdapter.ts   # Input adapter system
├── runtimeEvents.ts         # Event subscription
├── health.ts                # System health monitoring
└── index.ts                 # Barrel export
```

## Command Categories

```typescript
// Navigation
'nav:next'
'nav:previous'
'nav:jump-to-slide'

// Playback
'projection:play'
'projection:pause'
'projection:freeze'

// State
'projection:cue-song'
'projection:program-slide'
'projection:clear'

// System
'system:emergency-stop'
'system:crash-recovery'
```

## Dependencies

### Within Domain

- `commandBus` → handlers
- `runtimeEvents` ← command execution
- `health` monitors all

### On Other Domains

- **Features/projection:** Executes projection commands
- **Features/playlist:** Executes playlist operations
- **Any feature:** Can subscribe to runtime events
- **Infrastructure/electron:** Receives IPC commands

### On Core

- None

## Integration Points

### How Features Execute Commands

```typescript
import { executeRuntimeCommand } from '@core/runtime'

await executeRuntimeCommand('projection:next-slide')
```

### How Features Subscribe to Events

```typescript
import { subscribeToRuntimeEvents } from '@core/runtime'

const unsubscribe = subscribeToRuntimeEvents((event) => {
  if (event.type === 'projection:slide-changed') {
    console.log('New slide:', event.payload)
  }
})
```

### Input Adapter Pattern

```typescript
import { registerInputAdapter } from '@core/runtime'

registerInputAdapter({
  name: 'keyboard',
  subscribe: (handler) => {
    window.addEventListener('keydown', (e) => {
      handler({ source: 'keyboard', command: 'nav:next' })
    })
  }
})
```

## Known Limitations

- [ ] **No command queueing** - Synchronous execution only
- [ ] **No retry logic** - Failed commands fail immediately
- [ ] **No transaction support** - No all-or-nothing operations
- [ ] **No rollback** - No undo/redo system yet

## Health Monitoring

```typescript
getInputAdapterHealth()
getRuntimeEventStats()
getCommandExecutionMetrics()
```

## Testing Strategy

- Unit tests: command dispatch logic
- Integration tests: handler execution
- Input simulation: virtual adapters (keyboard, MIDI, StreamDeck)
- Event flow: subscription/unsubscription

## Future Roadmap

- [ ] **Command queueing** (batch operations)
- [ ] **Undo/redo** system
- [ ] **Remote execution** (network commands)
- [ ] **Plugin commands** (extensible)

## Related Issues / PRs

- [Link to issues if any]
