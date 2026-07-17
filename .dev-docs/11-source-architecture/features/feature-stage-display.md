# Features: Stage Display

## Ownership

- **Maintainer:** Stage Display / Secondary Windows Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Secondary display for musicians and worship leaders:

- Stage monitor window (confidence display)
- Current/next slide preview
- Timing and clock information
- Operator-safe typography and contrast

## State

- **No local store** - Receives data via IPC from projection
- **Read-only display** - No mutations

## Architecture

```
features/stage-display/
├── components/
│   ├── StageDisplayApp.tsx
│   ├── CurrentSlidePanel.tsx
│   └── ConfidenceClock.tsx
├── windows/
│   ├── StageDisplayApp.tsx
│   └── main.tsx                    (window entry)
├── styles/
│   └── stage-display.css
└── index.ts
```

## Dependencies

### On Other Domains

- **Features/projection:** Data source (IPC)
- **Core/projection:** Confidence payload format
- **Shared:** UI components

### No Direct State Mutations

- Stage display is read-only
- All data flows from projection

## Integration Points

### From Projection

```typescript
import { buildConfidencePayload } from '@core/projection'

const confidence = buildConfidencePayload(state)
window.api.stageDisplay.updatePayload(confidence)
```

### Window Management

```typescript
// In main process
import { createStageDisplayWindow } from '@infrastructure/electron/windows'

createStageDisplayWindow()
```

## Known Limitations

- [ ] **No customization** - Layout fixed
- [ ] **No multi-stage** - Single stage display only
- [ ] **No operator controls** - Display only

## Testing Strategy

- Unit tests: payload interpretation
- Visual tests: operator safety (contrast, typography)
- E2E: Window lifecycle

## Future Roadmap

- [ ] **Customizable layout**
- [ ] **Multiple stage displays**
- [ ] **Confidence indicators**
- [ ] **Operator controls** (next preview, timing)

## Operator Safety Principles

- **Font size:** ≥ 24px (readable from 10+ feet away)
- **Contrast:** WCAG AAA compliant
- **Update frequency:** ≤ 100ms (smooth real-time)
- **Fallback:** Clear "NO DATA" state if disconnected

## Related Issues / PRs

- [Link to issues if any]
