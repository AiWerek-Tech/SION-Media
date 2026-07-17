# Infrastructure Layer

## Ownership

- **Maintainer:** Integration / DevOps Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

External system integration:

- Electron IPC communication
- SQLite database
- Excel import/export
- Firebase integration (future)
- Update checking
- Caching layer

## Architecture

```
infrastructure/
├── electron/
│   ├── ipc/
│   │   ├── handlers.ts
│   │   ├── health.ts
│   │   └── channels.ts
│   ├── windows/
│   │   ├── mainWindow.ts
│   │   ├── projectionWindow.ts
│   │   └── stageDisplayWindow.ts
│   └── index.ts
│
├── database/
│   ├── database.ts
│   ├── migrations.ts
│   ├── seedData.ts
│   └── schema.ts
│
├── excel/
│   ├── parseExcelFile.ts
│   └── excelValidator.ts
│
├── firebase/
│   ├── config.ts
│   ├── auth.ts
│   ├── firestore.ts
│   └── index.ts
│
├── update/
│   ├── UpdateService.ts
│   └── versionCheck.ts
│
├── cache/
│   └── cacheManager.ts
│
└── index.ts
```

## Module Responsibilities

### Electron IPC

- Main process ↔ Renderer communication
- Window management
- Native OS integration

### Database

- SQLite connection
- Query building
- Migration management
- Seed data

### Excel

- File validation
- Sheet parsing
- Data extraction
- Error handling

### Firebase (Future)

- Authentication
- Firestore sync
- Cloud storage

### Update

- Version checking
- Auto-update logic
- Release notes

### Cache

- Memory caching
- Disk caching
- TTL management

## Isolation Principle

**Infrastructure modules should not know about features.**

Good:

```typescript
// In database module
export async function getSongs(): Promise<Song[]> {
  return db.query('SELECT * FROM songs')
}

// Feature uses it
import { getSongs } from '@infrastructure/database'
const songs = await getSongs()
```

Bad:

```typescript
// DON'T do this in infrastructure
import { useSongLibraryStore } from '@features/library'
// Don't call feature functions from infrastructure
```

## Dependencies

### No Outbound to Features

- Infrastructure never imports from `@features/*`

### Inbound from Features

- Features import infrastructure services
- Mediated through typed APIs

## Testing Strategy

- Unit tests: parsing, validation
- Integration tests: database CRUD
- Mocking: Electron, file system
- E2E: File operations

## Future Roadmap

- [ ] **Firebase integration** (cloud sync)
- [ ] **Plugin system** (extensible)
- [ ] **Backup to cloud** (Dropbox, Google Drive)

## Related Issues / PRs

- [Link to issues if any]
