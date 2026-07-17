# Feature 7 Audit Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize and polish the July 7 media, PDF, instrument, and LRC changes so they are safer, lint-clean, and more comfortable for live church operation.

**Architecture:** Keep the existing Electron main/preload/renderer boundaries. Harden IPC and local file serving in main/preload, then make targeted renderer fixes without large refactors of `ProjectionMode.tsx` or `LibraryLyricsViewer.tsx`.

**Tech Stack:** Electron, React 19, Zustand, TypeScript, Vitest, ESLint, pdfjs-dist.

---

### Task 1: Establish Baseline

**Files:**

- Read: `package.json`
- Read: `src/main/ipc-handlers.ts`
- Read: `src/renderer/src/components/projection/LocalMediaPanel.tsx`
- Read: `src/renderer/src/components/presentation/PdfSlideViewer.tsx`

- [x] **Step 1: Run static and test baseline**

Run:

```powershell
npm run typecheck
npm run test
npm run lint
```

Expected:

- `typecheck` passes.
- `test` passes.
- `lint` fails with known July 7 issues that will be fixed in later tasks.

### Task 2: Fix Lint-Blocking Backend Issues

**Files:**

- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/main/database.ts`

- [ ] **Step 1: Replace runtime `require('electron')`**

Use the existing top-level Electron imports instead of `require()` inside `projection:instrument-timeupdate`.

- [ ] **Step 2: Remove production debug logs**

Delete temporary `console.log` calls around `db:delete-media-asset`.

- [ ] **Step 3: Validate IPC payloads**

For media playlist insertion and local external media import, ensure title/path/category values are non-empty strings before they reach database helpers.

### Task 3: Fix Renderer Lint Errors

**Files:**

- Modify: `src/renderer/src/components/LivePreviewPanel.tsx`
- Modify: `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
- Modify: `src/renderer/src/components/presentation/PdfSlideViewer.tsx`
- Modify: `src/renderer/src/components/projection/LocalMediaPanel.tsx`
- Modify: `src/renderer/src/core/projection/slideEngine.ts`
- Modify: `src/renderer/src/screens/settings/AudioSettings.tsx`

- [ ] **Step 1: Remove direct state writes in effect bodies**

Move initialization into lazy state or event callbacks, and avoid synchronous `setState` calls that trigger `react-hooks/set-state-in-effect`.

- [ ] **Step 2: Replace `any` and JSX attribute violations**

Type PDF render task refs, replace SVG kebab-case attributes with React camelCase, and remove unused variables.

- [ ] **Step 3: Remove DOM `innerHTML` fallbacks**

Use React state and JSX fallback rendering for media thumbnail load errors.

### Task 4: UI/UX Polish For Local Media And LRC

**Files:**

- Modify: `src/renderer/src/components/projection/LocalMediaPanel.tsx`
- Modify: `src/renderer/src/components/library/LibraryLyricsViewer.tsx`
- Modify: `src/renderer/src/screens/settings/AudioSettings.tsx`

- [ ] **Step 1: Replace blocking prompt/alert**

Use inline state for new folder creation and a non-blocking PowerPoint conversion notice.

- [ ] **Step 2: Improve copy and error feedback**

Clarify “hapus referensi” behavior, show save failures in LRC sync via toast/log feedback, and keep long labels readable.

### Task 5: Verification

**Files:**

- Read: all changed files

- [ ] **Step 1: Format touched files**

Run:

```powershell
npx prettier --write src/main/ipc-handlers.ts src/main/database.ts src/renderer/src/components/LivePreviewPanel.tsx src/renderer/src/components/library/LibraryLyricsViewer.tsx src/renderer/src/components/presentation/PdfSlideViewer.tsx src/renderer/src/components/projection/LocalMediaPanel.tsx src/renderer/src/core/projection/slideEngine.ts src/renderer/src/screens/settings/AudioSettings.tsx src/preload/index.ts src/preload/index.d.ts src/renderer/src/utils/pdfUtils.ts src/renderer/src/utils/lrcParser.ts src/renderer/src/store/usePlaylistStore.ts
```

- [ ] **Step 2: Run verification**

Run:

```powershell
npm run lint
npm run typecheck
npm run test
```

Expected:

- Lint errors from July 7 changes are resolved.
- TypeScript passes.
- Vitest passes.
