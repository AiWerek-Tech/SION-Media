# Task — Library & Study Workspace Transformation

## Phase 1: Database & IPC Layer

- `[x]` 1.1 — Modify `src/main/migrations.ts` to add migration `v20` (`bible_notes_and_highlights`)
- `[x]` 1.2 — Modify `src/main/database.ts` to implement `getBibleNote`, `updateBibleNote`, `getBibleNotesForChapter`
- `[x]` 1.3 — Modify `src/main/ipc-handlers.ts` to register `db:get-bible-note`, `db:update-bible-note`, `db:get-bible-notes-for-chapter` handlers

## Phase 2: Preload & Types

- `[x]` 2.1 — Modify `src/preload/index.d.ts` to add `BibleNoteDto`, `getNote`, `updateNote`, `getNotesForChapter` to `BiblePackAPI`
- `[x]` 2.2 — Modify `src/preload/index.ts` to expose `getNote`, `updateNote`, `getNotesForChapter` via `biblePack` contextBridge

## Phase 3: UI Layout & Sidebar Restructure

- `[x]` 3.1 — Restructure `NAV_GROUPS` and `LibraryWorkspace` types in `src/renderer/src/screens/modes/LibraryModeRedesigned.tsx`
- `[x]` 3.2 — Update sidebar rendering to group menus under "STUDI PRIBADI" and "PERSIAPAN & PLAYLIST"

## Phase 4: Interactive Bible Workspace

- `[x]` 4.1 — Implement Book/Chapter/Verse selectors and aliases search in `LibraryModeRedesigned.tsx`
- `[x]` 4.2 — Integrate `useBibleReader` and `useBibleSearch` hooks into the new Bible workspace
- `[x]` 4.3 — Implement Bible text list view with verse-level highlight and Spotlight Card preview

## Phase 5: Polymorphic Inspector & Fullscreen Viewer

- `[x]` 5.1 — Modify `RightInspector` to render Bible tabs ("Bandingkan Terjemahan", "Catatan Belajar", "Aksi") when `workspace === 'bible'`
- `[x]` 5.2 — Implement side-by-side translation comparison using parallel API calls
- `[x]` 5.3 — Implement fullscreen Bible reader overlay `LibraryBibleViewer` for distraction-free study

## Phase 6: Verification

- `[x]` 6.1 — Run `npm run typecheck` ✅ passed
- `[x]` 6.2 — Run `npm run test` to verify unit and integration tests ✅ passed (234 tests)
- `[x]` 6.3 — Run `npm run build` to confirm package builds successfully ✅ passed
- `[x]` 6.4 — Manual test check of sidebar navigation, search aliases, bible study notes saving, and translation comparison
