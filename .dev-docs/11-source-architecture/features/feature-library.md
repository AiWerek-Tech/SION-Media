# Features: Library

## Ownership

- **Maintainer:** Content/Library Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Song and hymnal management:

- Library browsing and searching
- Song metadata editing
- Import/export operations
- Filter and categorization
- Favorites and recency tracking

## State

- **Store:** `useSongLibraryStore` (will split from `useAppStore`)
- **Secondary:** `useCacheStore` (import staging)
- **Persistence:** Songs persist to SQLite database

## Architecture

```
features/library/
├── components/
│   ├── SongLibraryPanel.tsx
│   ├── SongCard.tsx
│   ├── HymnalSidebar.tsx
│   └── LibrarySearchPalette.tsx
├── screens/
│   ├── LibraryMode.tsx
│   ├── SongEditorScreen.tsx
│   └── ImportExportScreen.tsx
├── store/
│   ├── useSongLibraryStore.ts
│   └── useCacheStore.ts (import cache)
├── services/
│   └── songService.ts
├── hooks/
│   └── useLibrarySearch.ts
├── types/
│   └── index.ts
└── index.ts
```

## Dependencies

### Within Domain

- All internal (self-contained)

### On Other Domains

- **Features/projection:** Generate slides for queued songs
- **Features/playlist:** Load songs to playlist
- **Core/projection:** Slide generation
- **Shared:** UI components, types
- **Infrastructure/excel:** Import/export
- **Infrastructure/database:** Query/persist songs

## Integration Points

### From Dashboard

```typescript
import { LibraryMode } from '@features/library'

// In main dashboard
<LibraryMode />
```

### From Playlist

```typescript
import { songService } from '@features/library/services'

const song = await songService.getSongById(id)
```

### From Import

```typescript
import { parseExcelFile } from '@infrastructure/excel'

const imported = await parseExcelFile(path)
// Use songService to persist
```

## Known Limitations

- [ ] **No fuzzy search** - Exact match only
- [ ] **No bulk edit** - Edit one song at a time
- [ ] **No tags/custom fields** - Only predefined metadata
- [ ] **No sync** - Local-only (cloud sync future)

## Testing Strategy

- Unit tests: search logic, filtering
- Integration tests: song CRUD operations
- E2E: Import workflow, edit workflow

## Future Roadmap

- [ ] **Fuzzy search**
- [ ] **Bulk operations** (edit, tag, categorize)
- [ ] **Custom fields** (extensible metadata)
- [ ] **Cloud sync** (Firebase)
- [ ] **Collaborative** (multi-device)

## Related Issues / PRs

- [Link to issues if any]
