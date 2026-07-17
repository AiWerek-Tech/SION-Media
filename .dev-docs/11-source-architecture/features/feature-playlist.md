# Features: Playlist

## Ownership

- **Maintainer:** Playlist/Orchestration Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Playlist management and orchestration:

- Playlist item ordering and management
- Active item tracking
- Queuing songs for projection
- Drag-and-drop reordering
- Playlist metadata (name, service date)

## State

- **Store:** `usePlaylistStore` (items, active index, metadata)
- **Persistence:** Session state

## Architecture

```
features/playlist/
├── components/
│   ├── PlaylistPanel.tsx
│   ├── PlaylistItemCard.tsx
│   ├── VirtualAdapterPanel.tsx      (dev/test)
│   └── PlaylistCommandBar.tsx
├── store/
│   └── usePlaylistStore.ts
├── services/
│   └── playlistService.ts
├── hooks/
│   └── usePlaylistSync.ts
├── types/
│   └── index.ts
└── index.ts
```

## Dependencies

### Within Domain

- Self-contained

### On Other Domains

- **Features/projection:** Load queued song
- **Features/library:** Get song data
- **Core/projection:** Slide generation
- **Shared:** UI components, drag-drop library

## Integration Points

### From Projection

```typescript
import { usePlaylistStore } from '@features/playlist'

const { activeItem } = usePlaylistStore()
// Load item into projection
```

### From Library

```typescript
import { playlistService } from '@features/playlist/services'

await playlistService.addToPlaylist(song)
```

## Known Limitations

- [ ] **No persistence** - Lost on app restart
- [ ] **No unlimited length** - ~5000 items max
- [ ] **No nested playlists** - Flat list only
- [ ] **No collaborative** - Local only

## Testing Strategy

- Unit tests: ordering, state
- Integration tests: add/remove/reorder
- E2E: Drag-and-drop, keyboard

## Future Roadmap

- [ ] **Persistence** (save playlists)
- [ ] **Nested playlists**
- [ ] **Collaborative** (multiple users)
- [ ] **Favorites** (quick access)

## Related Issues / PRs

- [Link to issues if any]
