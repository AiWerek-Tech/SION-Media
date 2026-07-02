# Features: Projection

## Ownership

- **Maintainer:** Projection/Live Team
- **Last Updated:** May 2026
- **Status:** Stable (Active, OPERATIONAL CRITICAL)

## Responsibility

Live presentation and preview control:

- Preview window management
- Program/live slide synchronization
- Cuing and queuing songs
- Locking mechanisms (prevent accidental changes)
- Main projection UI and controls

## State

- **Store:** `useProjectionStore` (preview/program dual-state)
- **Persistence:** Session state only (not persisted across restarts)

## Architecture

```
features/projection/
├── components/
│   ├── PresentationCanvas.tsx       (main renderer)
│   ├── LivePreviewPanel.tsx         (preview window)
│   ├── ControlBar.tsx               (play/pause/next)
│   └── QuickJumpOverlay.tsx         (Ctrl+G navigation)
├── screens/
│   └── ProjectionMode.tsx           (main UI)
├── store/
│   └── useProjectionStore.ts        (slides, state, locks)
├── services/
│   └── projectionService.ts         (cue, program, operations)
├── hooks/
│   ├── useProjectionSync.ts
│   └── useLiveProgram.ts
├── windows/
│   ├── main/
│   │   ├── ProjectionApp.tsx        (projection window content)
│   │   └── main.tsx                 (window entry)
│   └── (other windows)
└── index.ts
```

## Dependencies

### Within Domain

- All self-contained

### On Other Domains

- **Features/playlist:** Get queued songs
- **Features/stage-display:** Send confidence payload
- **Features/bible:** Display verses
- **Core/projection:** Slide generation
- **Core/runtime:** Command execution
- **Shared:** UI components, types
- **Infrastructure/electron:** Window management, IPC

## ⚠️ Operational Critical Guarantees

**This feature controls live worship output:**

- ✅ **Never crash mid-service** - Error boundaries enforced
- ✅ **Prevent accidental changes** - Lock mechanisms (freeze, program lock)
- ✅ **Smooth transitions** - No visual glitches during slide changes
- ✅ **Recovery from errors** - Fallback states, graceful degradation
- ✅ **Keyboard shortcuts** - Ctrl+G, Spacebar, Arrow keys always work

## Integration Points

### From Dashboard

```typescript
import { ProjectionMode } from '@features/projection'

<ProjectionMode />
```

### From Runtime Commands

```typescript
import { executeRuntimeCommand } from '@core/runtime'

await executeRuntimeCommand('projection:next-slide')
await executeRuntimeCommand('projection:freeze')
```

### From Stage Display

```typescript
import { projectionService } from '@features/projection/services'
import { buildConfidencePayload } from '@core/projection'

const payload = buildConfidencePayload(state)
// Send to stage window via IPC
```

## Known Limitations

- [ ] **No custom animations** - Basic slides only (future)
- [ ] **No multiple output formats** - Slides only (future: video, stream)
- [ ] **No alpha key** - Static backgrounds only (broadcast feature)

## Testing Strategy

- Unit tests: state transitions
- Integration tests: cue/program operations
- E2E: Keyboard shortcuts, transitions
- Stability tests: Long service runs
- Error recovery tests: Crash scenarios

## Future Roadmap

- [ ] **Multiple output formats** (slides, live graphics, streaming)
- [ ] **Custom animations**
- [ ] **Alpha key** support (broadcast)
- [ ] **Presentation presets**

## SLA / Uptime Expectations

- **Target uptime:** 99.9% during service
- **Recovery time:** < 3 seconds on error
- **Keyboard response:** < 50ms

## Related Issues / PRs

- [Link to issues if any]

## Escalation Path

If projection fails during service:

1. Keyboard shortcuts (Ctrl+G, Spacebar) still work
2. Fallback to static content screen
3. Escalate to tech lead immediately
