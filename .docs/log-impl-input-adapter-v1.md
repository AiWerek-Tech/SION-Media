# Input Adapter Architecture v1 — Implementation Log

**Date:** 2026-05-10
**Status:** ✅ Complete
**Phase:** P2.1 — External Input Protocol Layer

---

## Overview

Implemented a **Runtime Input Adapter Architecture** — a unified interface for all external input sources. This creates a clean abstraction layer before device-specific implementations.

```
MIDI / Stream Deck / Remote / WebSocket / Automation
         ↓
RuntimeInputAdapter (interface)
         ↓
RuntimeCommandBus (execution)
         ↓
Event Stream + Inspector
```

---

## Architecture Decisions

### P2.1.1 — RuntimeInputAdapter Interface

All external input sources implement the same interface:

```ts
interface RuntimeInputAdapter {
  id: string
  name: string
  source: CommandSource
  isConnected: boolean
  lastActivity: number | null

  connect(): Promise<AdapterConnectionResult>
  disconnect(): Promise<void>
  getHealth(): AdapterHealth
  getMappings(): InputMapping[]
  setMappings(mappings: InputMapping[]): void
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
  dispose(): void
}
```

### P2.1.2 — BaseRuntimeInputAdapter

Abstract base class providing common functionality:

- Connection state management
- Health metrics tracking
- Command emission with correlation ID
- Input mapping resolution
- Modifier checking
- Error recording

### P2.1.3 — InputMapping System

Maps physical inputs to runtime commands:

```ts
interface InputMapping {
  id: string
  inputId: string        // Physical input ID (device-specific)
  label: string          // Human-readable
  commandType: RuntimeCommandType
  payload?: Record<string, unknown>
  enabled: boolean
  modifiers?: InputModifier[]
  description?: string
}
```

This enables:
- **Mapping Engine**: Physical → Command translation
- **Learn Mode**: Capture input, assign command
- **Profile System**: Save/load mappings
- **Device Abstraction**: Same interface for all devices

### P2.1.4 — AdapterHealth Integration

Health metrics automatically flow to Inspector:

```ts
interface AdapterHealth {
  adapterId: string
  connected: boolean
  enabled: boolean
  latencyMs: number | null
  commandsEmitted: number
  commandsDropped: number
  lastError: string | null
  lastErrorTime: number | null
  lastSuccessTime: number | null
  deviceInfo?: { name, manufacturer, firmware, serialNumber }
  reconnectCount: number
  timestamp: number
}
```

### P2.1.5 — InputAdapterRegistry

Central registry managing all adapters:

- Register/unregister adapters
- Connect/disconnect all
- Aggregate health metrics
- Lifecycle management

---

## Files Created/Modified

### Created

- `src/renderer/src/utils/runtimeInputAdapter.ts`
  - `RuntimeInputAdapter` interface
  - `BaseRuntimeInputAdapter` abstract class
  - `InputAdapterRegistry` singleton
  - `AdapterHealth`, `InputMapping`, `InputEvent` types
  - Convenience functions for Inspector integration

### Modified

- `src/main/ipc-health.ts`
  - Added `teardown()` method for cleanup

- `src/preload/index.d.ts`
  - Added `HealthAPI` interface (fixed pre-existing type error)

---

## Key Design Principles

### 1. Unified Command Production

All inputs become `RuntimeCommand` instances:

```
MIDI NOTE_ON C3
  → MIDIAdapter.emitCommand()
  → RuntimeCommandBus.execute()
  → RuntimeEvent
  → Inspector
```

No parallel state paths. Single source of truth.

### 2. Health Visibility

Every adapter tracks:
- Commands emitted vs dropped
- Latency (if measurable)
- Reconnect count
- Last error
- Device info

All visible in Runtime Inspector.

### 3. Correlation Chain Ready

The `emitCommand()` method accepts `InputEvent` parameter:

```ts
protected emitCommand(
  commandType: RuntimeCommandType,
  payload?: Record<string, unknown>,
  _inputEvent?: InputEvent  // TODO: Correlation chain
): RuntimeCommand
```

Future: Inspector will show full chain:

```
[12:04:33.222]
MIDI NOTE_ON C3
Correlation: #A91X2
→ PROJ_TAKE_CUE
→ IPC_SEND
→ PROJECTION_ACK
→ SUCCESS
Latency: 4.2ms
```

### 4. Extensibility

Adding new input source = implement interface:

```ts
class MIDIAdapter extends BaseRuntimeInputAdapter {
  id = 'midi-1'
  name = 'MIDI Controller'
  source = 'MIDI'
  
  async connect() { /* Web MIDI API */ }
  async disconnect() { /* Cleanup */ }
}
```

Registry handles the rest.

---

## Next Steps

### P2.2 — MIDI Adapter Implementation

- Web MIDI API integration
- Note/CC mapping
- Device enumeration
- Learn mode

### P2.3 — Stream Deck Adapter

- Elgato Stream Deck SDK
- Button mapping
- Icon support
- Multi-device

### P2.4 — Remote App Adapter

- WebSocket server
- Mobile app protocol
- Authentication
- Multi-client

### P2.5 — Automation Timeline

- Scheduled commands
- Cue lists
- Time-based triggers

---

## Architecture Status

| Domain | Status |
|--------|--------|
| Runtime workflow | ✅ |
| Protection system | ✅ |
| Semantic navigation | ✅ |
| Multi-display foundation | ✅ |
| Confidence monitor | ✅ |
| Command bus | ✅ |
| Runtime validation | ✅ |
| Event stream | ✅ |
| Runtime observability | ✅ |
| Runtime inspection | ✅ |
| Health metrics | ✅ |
| Panic resilience | ✅ |
| **Input adapter architecture** | ✅ |

---

## Conclusion

SION Media now has a **unified input abstraction layer**. This is the foundation for:

- MIDI controllers
- Stream Deck integration
- Remote apps
- Automation
- WebSocket control
- OBS integration

All will be **new command producers** using the same interface. No parallel state paths. Full visibility in Inspector.

**Key Achievement**: Before any device implementation, the architecture is ready. This ensures consistency, observability, and maintainability from day one.
