# IPC Health Indicators (v1)

## Overview
As the SION Media application scales to incorporate external hardware (MIDI, Stream Deck) and remote endpoints (Companion App, WebSockets, Automation), the transport layer becomes the most critical point of failure. The **IPC Health Indicators** system provides operational visibility into the connection status of all external and internal endpoints.

This system guarantees that when a command fails, operators can immediately identify if the issue is logic-based (validation failure) or transport-based (disconnected endpoint).

## Architecture

The IPC Health system consists of three main components:

1. **Endpoint Registry (Main Process)**
   A centralized registry tracking the lifecycle of all registered endpoints.
   - `connected`: Current connection state.
   - `lastSeen`: Timestamp of the last successful heartbeat.
   - `latencyMs`: Network latency (if applicable).
   - `reconnectCount`: Telemetry for connection flapping.

2. **Heartbeat Protocol**
   A low-frequency ping (1000ms) between the `Renderer` (Main Dashboard) and other windows (`Projection`, `Stage Display`) or external endpoints.

3. **Health Store & UI Integration (Renderer Process)**
   A Zustand store (`useHealthStore`) tracking the endpoint health in real-time, displayed visually in the `RuntimeInspector` via a Status Strip.

## Supported Endpoints
- `MAIN_DASHBOARD` (Renderer)
- `PROJECTION_WINDOW`
- `STAGE_DISPLAY`
- `MIDI_BRIDGE` (Upcoming)
- `STREAM_DECK` (Upcoming)
- `REMOTE_APP` (Upcoming)

## Telemetry
The registry tracks `reconnectCount` and `lastError`. This telemetry is crucial to detect invisible edge cases, such as the projection window crashing and recovering silently, or a flaky HDMI cable causing the stage display to lose context.

## Command Correlation (Future Proofing)
By attaching a `correlationId` to the `RuntimeCommandBus`, the system can trace a command's journey:
`COMMAND (Bus)` → `IPC_SEND (Main)` → `IPC_RECEIVED (Projection)` → `WINDOW_RENDERED`
This will be integrated in Phase 2.1 alongside the MIDI Bridge.
