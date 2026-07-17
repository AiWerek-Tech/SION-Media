# Features: Dashboard

## Ownership

- **Maintainer:** UI/UX Team
- **Last Updated:** May 2026
- **Status:** Stable (Active, Entry Point)

## Responsibility

Main control hub and mode selection:

- Mode selection (library, projection, broadcast, etc)
- Quick status display
- Global notifications
- Main entry point to application

## State

- **No local state** - Delegates to feature domains
- **Screen routing** - In `@app/router`

## Architecture

```
features/dashboard/
├── components/
│   ├── Dashboard.tsx               (main hub)
│   ├── ModeSelector.tsx            (feature navigation)
│   └── StatusBar.tsx               (global info)
├── layouts/
│   └── DashboardLayout.tsx
└── index.ts
```

## Dependencies

### On Other Domains

- **All features:** Router-based loading
- **Shared:** UI components

### No Direct Mutations

- Dashboard is purely navigational

## Integration Points

### Route Definition

```typescript
// In @app/router
import { Dashboard } from '@features/dashboard'

const routes = [
  {
    path: '/',
    element: <Dashboard />
  }
]
```

## Known Limitations

- [ ] **No customization** - Static layout
- [ ] **No widgets** - Status display only
- [ ] **No shortcuts** - Navigation only

## Testing Strategy

- Unit tests: mode selection logic
- E2E: Feature navigation

## Future Roadmap

- [ ] **Widget system** (customizable)
- [ ] **Quick actions**
- [ ] **Keyboard shortcuts**

## Related Issues / PRs

- [Link to issues if any]
