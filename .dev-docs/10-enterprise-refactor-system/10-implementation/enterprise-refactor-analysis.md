# SION Media — Enterprise Refactor Execution Tracker

> **Last Updated:** 2026-05-15 06:00 WIB
> **Current Phase:** Phase 2 — Dead UI Fixes (in progress)

---

## ✅ Phase 0 — Pre-flight Safety Infrastructure

| Task                         | Status          | File                                                                                                      |
| ---------------------------- | --------------- | --------------------------------------------------------------------------------------------------------- |
| Feature Flag System          | ✅ Done         | [featureFlags.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/utils/featureFlags.ts) |
| Vitest Config (node + jsdom) | ✅ Pre-existing | [vitest.config.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/vitest.config.ts)                      |
| Test Utils / Setup           | ✅ Pre-existing | [test-utils/](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/test-utils/)               |

---

## ✅ Phase 1 — Infrastructure Additions (COMPLETE)

### Sequence 1.1 — New Stores (Additive)

| Store                  | Status  | File                                                                                                                      |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `useModalStore`        | ✅ Done | [useModalStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useModalStore.ts)               |
| `useServiceStore`      | ✅ Done | [useServiceStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useServiceStore.ts)           |
| `useNotificationStore` | ✅ Done | [useNotificationStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/useNotificationStore.ts) |

### Sequence 1.2 — New Hooks (Additive)

| Hook           | Status  | File                                                                                                      |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `useTimerTick` | ✅ Done | [useTimerTick.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/hooks/useTimerTick.ts) |

### Sequence 1.3 — Database Migrations (Additive)

| Migration                                  | Status  | Description                |
| ------------------------------------------ | ------- | -------------------------- |
| v14: `enterprise_service_state`            | ✅ Done | `service_state` table      |
| v15: `enterprise_song_notes`               | ✅ Done | `song_notes` table + index |
| v16: `enterprise_notification_preferences` | ✅ Done | Notification settings      |
| v17: `enterprise_performance_indexes`      | ✅ Done | 5 new performance indexes  |

### Sequence 1.4 — Database Functions (Additive)

| Function            | Status  | Description                            |
| ------------------- | ------- | -------------------------------------- |
| `getSongsSummary()` | ✅ Done | Lightweight query without `lyrics_raw` |
| `duplicateSong()`   | ✅ Done | Clone song with modified number/title  |
| `getStorageStats()` | ✅ Done | Real DB size + memory + counts         |

### Sequence 1.5 — IPC Handlers (Additive)

| Channel                    | Status  | Description                     |
| -------------------------- | ------- | ------------------------------- |
| `system:get-storage-stats` | ✅ Done | Returns real storage statistics |
| `db:duplicate-song`        | ✅ Done | Duplicate a song by ID          |
| `db:get-songs-summary`     | ✅ Done | Lightweight song query          |
| `confidence:update`        | ✅ Done | Forwards to stage display       |
| `display:get-all`          | ✅ Done | Normalized channel alias        |

### Sequence 1.6 — Preload Bridge (Additive)

| Entry                    | Status  | Description                   |
| ------------------------ | ------- | ----------------------------- |
| `system.getStorageStats` | ✅ Done | Bridge to storage stats       |
| `songs.duplicate`        | ✅ Done | Bridge to song duplication    |
| `songs.getSummary`       | ✅ Done | Bridge to lightweight query   |
| `confidence.update`      | ✅ Done | Send confidence payload       |
| `confidence.onUpdate`    | ✅ Done | Listen for confidence updates |

### Sequence 1.7 — Store Extensions

| Extension                                     | Status  | Description                           |
| --------------------------------------------- | ------- | ------------------------------------- |
| `usePanelLayoutStore.projectionBottom3`       | ✅ Done | 3-panel layout [number,number,number] |
| `usePlaylistStore._persistedActivePlaylistId` | ✅ Done | Session continuity via persist        |

### Type Declarations

| File                            | Status  | Description                     |
| ------------------------------- | ------- | ------------------------------- |
| `index.d.ts` — `SongsAPI`       | ✅ Done | Added `duplicate`, `getSummary` |
| `index.d.ts` — `ConfidenceAPI`  | ✅ Done | New confidence interface        |
| `index.d.ts` — `API.confidence` | ✅ Done | Added to main API type          |

---

## 🔧 Phase 2 — Dead UI Fixes (IN PROGRESS)

| DUI     | Description                        | Status          |
| ------- | ---------------------------------- | --------------- |
| DUI-001 | Favorite toggle in Library         | ⬜ Needs check  |
| DUI-002 | New Playlist from TitleBarMenu     | ✅ Pre-existing |
| DUI-003 | Bible access (View menu + Ctrl+B)  | ✅ Pre-existing |
| DUI-004 | Theme toggle button                | ✅ Pre-existing |
| DUI-005 | `useTimerTick` mounted in App.tsx  | ✅ Done         |
| DUI-006 | `ModalRegistry` mounted in App.tsx | ✅ Done         |

---

## 📊 Validation Results

```
┌─────────────────────┬────────┬─────────────────────────┐
│ Check               │ Result │ Notes                   │
├─────────────────────┼────────┼─────────────────────────┤
│ tsc (node)          │ ✅ 0   │ Clean                   │
│ tsc (web)           │ ✅ 0   │ Clean (was 1 pre-exist) │
│ eslint (new errors) │ ✅ 0   │ 10 pre-existing only    │
│ New files created   │ 5      │ All additive            │
│ Files modified      │ 7      │ All backward-compatible │
└─────────────────────┴────────┴─────────────────────────┘
```

---

## 📁 Files Changed (Full Manifest)

### New Files (5)

1. `src/renderer/src/utils/featureFlags.ts` — Feature flag system
2. `src/renderer/src/store/useModalStore.ts` — Modal state management
3. `src/renderer/src/store/useServiceStore.ts` — Service/timer persistence
4. `src/renderer/src/store/useNotificationStore.ts` — Notification system
5. `src/renderer/src/hooks/useTimerTick.ts` — Timer interval hook

### Modified Files (7)

1. `src/main/migrations.ts` — Added migrations v14-v17
2. `src/main/database.ts` — Added 3 enterprise functions
3. `src/main/ipc-handlers.ts` — Added 5 new IPC channels
4. `src/preload/index.ts` — Added 6 new bridge entries
5. `src/preload/index.d.ts` — Updated API type declarations
6. `src/renderer/src/store/usePanelLayoutStore.ts` — 3-panel support
7. `src/renderer/src/store/usePlaylistStore.ts` — Persist middleware
8. `src/renderer/src/App.tsx` — Mounted useTimerTick + ModalRegistry

---

## 🗺️ Next Steps

### Phase 2 Remaining

- [ ] Audit DUI-001 (Favorite toggle) — verify it's wired
- [ ] Wire notification bell button in TitleBar

### Phase 3 — Modal System Migration

- [x] ConfirmDialog component (pre-existing)
- [x] ModalRegistry component (pre-existing)
- [x] Promise-based `openAsync` in useModalStore
- [ ] Replace `window.confirm` calls across codebase

### Phase 4 — Projection Hardening

- [ ] Next-song preload system
- [ ] Confidence broadcast payload
- [ ] Slide config management in slideEngine

> [!IMPORTANT]
> **Rule: Do NOT modify `useProjectionStore.ts` logic until Phase 4.**
> All Phase 1-3 changes are additive-only by design.
