# Task — Mixed Service Rundown (Bible Playlist)

## Phase 1: Database & Main Process

- `[x]` 1.1 — Add migration v19 in `migrations.ts` (recreate `playlist_items` table to allow nullable `song_id` + add Bible columns + indexes)
- `[x]` 1.2 — Update `getPlaylistItems` in `database.ts` to use `LEFT JOIN`
- `[x]` 1.3 — Implement `addBibleToPlaylist` in `database.ts`
- `[x]` 1.4 — Update `updatePlaylistItem` to support `title` and `notes`
- `[x]` 1.5 — Register `db:add-bible-to-playlist` IPC channel in `ipc-handlers.ts`

## Phase 2: Preload & Type Definitions

- `[x]` 2.1 — Expose `addBible` under `playlists` namespace in `src/preload/index.ts`
- `[x]` 2.2 — Update `PlaylistsAPI`, `PlaylistItemDto` types in `src/preload/index.d.ts`
- `[x]` 2.3 — Update shared types in `src/shared/types.ts`
- `[x]` 2.4 — Update renderer types in `src/renderer/src/types.ts`

## Phase 3: Slide Engine & Helpers

- `[x]` 3.1 — Create `buildBibleSlides.ts` helper utility
- `[x]` 3.2 — Update `engine/slideEngine.ts` to dispatch Bible items to helper
- `[x]` 3.3 — Update `core/projection/slideEngine.ts` to mirror

## Phase 4: Zustand Store

- `[x]` 4.1 — Add `addBibleToPlaylist` action to `usePlaylistStore.ts`

## Phase 5: UI Components

- `[x]` 5.1 — Redesign `PlaylistItemCard.tsx` to render Bible item cards
- `[x]` 5.2 — Update `PlaylistPanel.tsx` (export/import with mixed rundown support)
- `[x]` 5.3 — Update `ProjectionMode.tsx` — handle Bible item click in `handlePlaylistItemClick`
- `[x]` 5.4 — Add `+ Playlist` buttons in `BiblePanel.tsx` (search + browse + history)
- `[x]` 5.5 — Add `Tambah ke Playlist` button in `BibleScreen.tsx` floating bar

## Phase 6: Verification

- `[x]` 6.1 — Run `npx tsc --noEmit`
- `[x]` 6.2 — Run `npm run build`
