# Library Workflow Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore and polish Library mode workflows for Info, Media, Bible, and mixed-type Playlist items.

**Architecture:** Keep changes inside existing renderer panels and playlist store contracts. Add focused tests around user-visible regressions: PNG local media URL normalization, Info playlist editing, Bible browse filtering, and playlist item summary/count behavior.

**Tech Stack:** Electron, React 19, Zustand, TypeScript, Vitest, Testing Library, lucide-react.

---

### Task 1: Media PNG Local URL Reliability

**Files:**
- Modify: `src/main/index.ts`
- Test: `src/main/local-media-url.test.ts`

- [ ] Write a failing test for Windows PNG paths that arrive as `local-media://c/Users/.../H3.png` and `local-media:///C:/Users/.../H3.png`.
- [ ] Extract/verify a pure normalizer that returns `C:/Users/.../H3.png` without losing the drive colon.
- [ ] Use the normalizer in the local-media protocol handler.
- [ ] Run `npx vitest run src/main/local-media-url.test.ts`.

### Task 2: Info Playlist Item Editing and Template Removal

**Files:**
- Modify: `src/renderer/src/components/projection/AnnouncementPanel.tsx`
- Modify: `src/renderer/src/components/PlaylistItemCard.tsx`
- Modify: `src/renderer/src/store/usePlaylistStore.ts`
- Test: `src/renderer/src/components/projection/__tests__/AnnouncementPanel.test.tsx`
- Test: `src/renderer/src/store/__tests__/playlist.integration.test.ts`

- [ ] Remove quick templates from Info panel UI.
- [ ] Add store action to update item title/body/notes through existing `db:update-playlist-item`.
- [ ] Add edit controls on playlist Info items with inline form and save/cancel.
- [ ] Run targeted renderer tests.

### Task 3: Bible Panel Simplification

**Files:**
- Modify: `src/renderer/src/components/projection/BiblePanel.tsx`
- Test: `src/renderer/src/components/projection/__tests__/BiblePanel.test.tsx`

- [ ] Remove manual input mode controls and body.
- [ ] Rename Browse label to `Pilih Ayat` or `Pilih`.
- [ ] Add PL/PB toggles in browse mode and filter displayed book list.
- [ ] Run `npx vitest run src/renderer/src/components/projection/__tests__/BiblePanel.test.tsx`.

### Task 4: Playlist UX Polish for Mixed Content

**Files:**
- Modify: `src/renderer/src/components/library/LibraryPlaylistWorkspace.tsx`
- Modify: `src/renderer/src/components/PlaylistItemCard.tsx`
- Modify: `src/renderer/src/types.ts`
- Test: `src/renderer/src/store/__tests__/playlist.integration.test.ts`

- [ ] Replace item count copy from song-only to mixed-content count.
- [ ] Add composition summary chips for songs, Bible, Info, Media.
- [ ] Improve item cards with type labels and edit affordances where relevant.
- [ ] Run playlist tests and global verification.

### Final Verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run targeted Vitest suite for changed panels and store.
- [ ] Restart Electron dev app if main process changed.
