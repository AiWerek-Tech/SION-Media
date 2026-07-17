# App Layer

## Ownership

- **Maintainer:** Core Application Team
- **Last Updated:** May 2026
- **Status:** Stable (Active)

## Responsibility

Application bootstrap and initialization:

- Store providers (Zustand context)
- Route definitions
- App component root
- Application lifecycle

## State

- **App-level stores:** Theme, screen, settings
- **No feature-specific state**

## Architecture

```
app/
├── providers/
│   ├── StoreProvider.tsx           (Zustand setup)
│   └── index.ts
├── router/
│   ├── mainRouter.ts              (route definitions)
│   ├── ProjectionRoutes.tsx        (projection mode routes)
│   └── index.ts
├── App.tsx                         (root component)
└── main.tsx                        (entry point)
```

## Providers

```typescript
// Context setup
- Zustand stores
- Router provider
- Error boundaries
- Theme provider
```

## Routing

Main router orchestrates:

- Dashboard (home)
- Library mode
- Projection mode
- Management/Settings
- Secondary windows (projection, stage display)

## Dependencies

### On Features

- All features (routed)

### On Core

- Runtime system (bootstrapped here)

### On Infrastructure

- Electron IPC (initialized)

## Integration Points

### Store Provider

```typescript
export function App() {
  return (
    <StoreProvider>
      <RouterProvider router={mainRouter} />
    </StoreProvider>
  )
}
```

### Feature Routes

```typescript
const mainRouter = createBrowserRouter([
  {
    path: '/',
    element: <Dashboard />
  },
  {
    path: '/library',
    element: <LibraryMode />
  },
  {
    path: '/projection',
    element: <ProjectionMode />
  }
])
```

## Known Limitations

- [ ] **No nested routes** - Flat structure
- [ ] **No lazy loading** - All features loaded upfront
- [ ] **No suspense** - No async boundaries

## Testing Strategy

- Unit tests: router configuration
- E2E: App lifecycle

## Future Roadmap

- [ ] **Code splitting** (lazy load features)
- [ ] **Progressive enhancement**
- [ ] **Offline support**

## Related Issues / PRs

- [Link to issues if any]
