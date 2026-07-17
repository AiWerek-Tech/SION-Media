# Features: Bible

## Ownership

- **Maintainer:** Bible Feature Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Bible navigation and display:

- Book/chapter/verse selection
- Translation support (multiple Bible versions)
- Display on projection
- Search functionality (future)

## State

- **Store:** `useBibleStore` (current book, chapter, verse, translation)
- **Persistence:** User preferences

## Architecture

```
features/bible/
├── components/
│   ├── BibleViewer.tsx
│   ├── BibleBookSelector.tsx
│   └── TranslationSelector.tsx
├── screens/
│   └── BibleScreen.tsx
├── store/
│   └── useBibleStore.ts
├── services/
│   └── bibleService.ts             (Bible data, search)
├── types/
│   └── index.ts
└── index.ts
```

## Data Source

Bible data loaded from:

- [ ] Local JSON files (currently)
- [ ] API (future)
- [ ] SQLite (future)

## Dependencies

### On Other Domains

- **Features/projection:** Display Bible verse on slides
- **Core/projection:** Slide generation for verse
- **Shared:** UI components

## Integration Points

### From Projection

```typescript
import { executeRuntimeCommand } from '@core/runtime'

await executeRuntimeCommand('bible:display-verse', {
  book: 'John',
  chapter: 3,
  verse: 16
})
```

### Display on Slide

```typescript
import { bibleService } from '@features/bible/services'

const verse = await bibleService.getVerse(ref)
// Generate slide with verse
```

## Known Limitations

- [ ] **No search** - Browse only
- [ ] **Single translation** - One version at a time
- [ ] **No commentary** - Verse text only
- [ ] **No cross-references** - Linear navigation

## Testing Strategy

- Unit tests: verse lookup
- Integration tests: display on projection
- E2E: Navigation workflow

## Future Roadmap

- [ ] **Full-text search**
- [ ] **Multiple translations**
- [ ] **Commentary**
- [ ] **Cross-references**

## Related Issues / PRs

- [Link to issues if any]
