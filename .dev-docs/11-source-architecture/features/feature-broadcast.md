# Features: Broadcast (Reserved)

## Ownership

- **Maintainer:** TBD (Broadcast Team - Future)
- **Last Updated:** May 2026
- **Status:** Planned (Not yet implemented)

## Responsibility (Future)

Broadcast output routing and management:

- NDI output
- OBS integration
- Alpha key support
- Output routing and switching
- Streaming integration (YouTube, Facebook)

## Current State

**Empty placeholder.** This domain is reserved for future broadcast expansion.

## When This Will Be Implemented

- [ ] NDI support requirement
- [ ] Multi-output routing needed
- [ ] Streaming integration needed

## Architecture (Planned)

```
features/broadcast/
├── components/
│   └── BroadcastPanel.tsx
├── screens/
│   └── BroadcastMode.tsx
├── store/
│   └── useBroadcastStore.ts
├── services/
│   └── broadcastService.ts       (NDI, OBS, streaming)
└── index.ts
```

## Dependencies (Planned)

- **Features/projection:** Output source
- **Infrastructure/electron:** Window management
- **Core/runtime:** Command integration

## Roadmap

- Phase 1: NDI output
- Phase 2: OBS integration
- Phase 3: Streaming (YouTube, Facebook)
- Phase 4: Alpha key & compositing

## See Also

- `@features/projection` - Primary output source
- `@core/runtime` - Command system (broadcast will integrate here)
