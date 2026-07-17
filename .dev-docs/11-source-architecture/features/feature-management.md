# Features: Management

## Ownership

- **Maintainer:** System Administration / Settings Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

System settings and administration:

- Application theme and appearance
- Display and monitor configuration
- Backup and restore
- System information and diagnostics
- About and update information

## State

- **Settings store:** App-level (managed in `@app/`)
- **No feature-specific state**

## Architecture

```
features/management/
├── screens/
│   └── SettingsScreen.tsx
├── components/
│   └── settings/
│       ├── AppThemeSettings.tsx
│       ├── DisplaySettings.tsx
│       ├── BackgroundSettings.tsx
│       ├── BackupSettings.tsx
│       └── AboutSettings.tsx
├── services/
│   ├── SettingsService.ts          (persist/load)
│   └── BackupService.ts            (backup/restore)
└── index.ts
```

## Dependencies

### On Other Domains

- **Features/projection:** Theme sync
- **Shared:** UI components
- **Infrastructure/electron:** Display enumeration
- **Infrastructure/database:** Settings persistence
- **Infrastructure/update:** Version check

## Settings Categories

```typescript
// Appearance
app_theme_mode: 'light' | 'dark' | 'system'
ui_density: 'compact' | 'normal' | 'spacious'

// Display
display_primary: number
display_projection: number

// Background
atmosphere_global_config: AtmosphereConfig

// System
auto_backup: boolean
crash_recovery: boolean
```

## Known Limitations

- [ ] **No import settings** - Export-only currently
- [ ] **No per-user settings** - Application-wide only
- [ ] **No advanced options** - UI-only settings

## Testing Strategy

- Unit tests: settings serialization
- Integration tests: persistence
- E2E: Settings workflow

## Future Roadmap

- [ ] **Per-user settings** (when multi-user added)
- [ ] **Import/export** settings
- [ ] **Advanced options** (debug mode, etc)

## Related Issues / PRs

- [Link to issues if any]
