# Runtime Inspector v2 — Tabs + Inputs + Simulator (DEV)

**Date:** 2026-05-10
**Status:** ✅ Complete
**Phase:** 3 — Observability UI

---

## Overview

Upgraded the Runtime Inspector from a single-purpose event list into a **runtime console with tabs**, consolidating:

- Observability (events + health)
- Operational visibility (input adapters)
- Testing surface (virtual input simulator)

This aligns the inspector with the intended direction:

```
Inspector → Operations Console
```

---

## Key Changes

### 1) Tabbed Inspector Layout

Added a tab row with the following sections:

- `EVENTS`
- `HEALTH`
- `INPUTS`
- `SIMULATOR` (DEV-only)

The tab model keeps operational context unified, avoids new overlays/shortcuts, and keeps the inspector as the single runtime console.

### 2) EVENTS tab

Preserved v1 behavior:

- Rolling feed (last 200)
- Filters (status + source)
- Event details drawer

### 3) HEALTH tab

Moved health visuals under an explicit health context:

- Health strip
- Metrics header

Placeholder body is prepared for future diagnostics:

- adapter heartbeat
- IPC RTT
- memory pressure

### 4) INPUTS tab (read-only)

Introduced input adapter operational visibility by reading registry health:

- `getInputAdapterHealth()`
- Auto-refresh polling every 1s (simple, deterministic)

Displayed fields:

- adapterId
- connected/disconnected
- emitted/dropped/reconnect count
- last error
- latency (if provided)

### 5) SIMULATOR tab (DEV-only)

Embedded the Virtual Input Simulator inside the inspector.

Visibility rules:

- Tab is hidden when `!import.meta.env.DEV`
- Content is guarded to render only in DEV

This keeps simulator tooling out of production operator UX while allowing deep runtime QA in development.

---

## Files Updated

- `src/renderer/src/components/RuntimeInspector.tsx`
  - Added `InspectorTab` + `activeTab`
  - Introduced `InputsTab`
  - Embedded simulator (DEV-only)

- `src/renderer/src/components/VirtualAdapterPanel.tsx`
  - Refactored overlay panel into embeddable component:
    - `VirtualAdapterPanel` → `VirtualAdapterSimulator`

---

## Rationale

### Why tabs instead of a second overlay panel

This keeps the mental model clean:

```
OBSERVABILITY + TEST INPUTS
```

in one place.

Avoids:

- UI scattering
- shortcut proliferation
- context switching

---

## Notes / Follow-ups

1. Add storm presets:
   - 10 cmd/sec
   - 50 cmd/sec
   - 100 cmd/sec

2. Versioned replay format:

```json
{
  "version": 1,
  "recordedAt": "...",
  "events": [...]
}
```

3. Future deterministic replay:
   - compare latency metrics
   - detect regressions

---

## Conclusion

Runtime Inspector v2 consolidates runtime diagnostics and testing into a single operational console. This is a strategic step toward an operator-grade live runtime system.
