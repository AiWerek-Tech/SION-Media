# Projection Right Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Song, Notifications, Audio/Timer, and shared bottom-right navigation without changing the Projection dashboard architecture.

**Architecture:** Retain the existing components and store callbacks, add explicit flex/scroll boundaries and scoped semantic classes, and cover operational interactions with focused component tests. CSS remains in the established renderer stylesheet so dark/light themes and Electron sizing continue to share one source of truth.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind utility classes, scoped CSS, Vitest, Testing Library, Electron Vite.

---

### Task 1: Establish focused regression coverage

**Files:**

- Create: `src/renderer/src/components/projection/__tests__/NotificationPanel.test.tsx`
- Create: `src/renderer/src/components/projection/__tests__/AudioPanel.test.tsx`
- Create: `src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

- [ ] **Step 1: Write Notification panel tests**

Cover filter selection, unread marking, individual removal, clear-all, unread and filtered empty states, and accessible action labels using mocked `useNotificationStore` state.

- [ ] **Step 2: Write Audio/Timer panel tests**

Cover formatted timer output, Start/Pause dispatch, Reset dispatch, close action, and the explicit unavailable-monitoring state using mocked `useProjectionStore` state.

- [ ] **Step 3: Write shared navigation and Song panel tests**

Render the Projection mode with existing store mocks, assert tab semantics and selection, and verify long Song content remains inside a dedicated scroll region while actions remain outside it.

- [ ] **Step 4: Run focused tests and confirm the new structural assertions fail**

Run: `npm test -- --run src/renderer/src/components/projection/__tests__/NotificationPanel.test.tsx src/renderer/src/components/projection/__tests__/AudioPanel.test.tsx src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

Expected: interaction assertions that match current behavior pass; new semantic class/layout assertions fail before implementation.

### Task 2: Polish shared bottom-right navigation and panel shell

**Files:**

- Modify: `src/renderer/src/screens/modes/ProjectionMode.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

- [ ] **Step 1: Introduce scoped shared shell classes**

Give the tablist, individual tabs, unread badge, content host, and timer toggle stable `projection-utility-*` class names while retaining their existing callbacks and ARIA semantics.

- [ ] **Step 2: Define the layout contract in CSS**

Set `min-width: 0`, `min-height: 0`, bounded flex behavior, equal-height controls, visible `:focus-visible` rings, restrained active states, and safe narrow-width behavior. The panel host is the only area allowed to grow.

- [ ] **Step 3: Run shared navigation tests**

Run: `npm test -- --run src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

Expected: PASS.

### Task 3: Polish the Song workspace

**Files:**

- Modify: `src/renderer/src/screens/modes/ProjectionMode.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

- [ ] **Step 1: Separate persistent and scrolling regions**

Keep Song sub-tabs and per-tab toolbars fixed. Wrap Info metadata, lyrics, chords, and notes content in `projection-song-panel__scroll` regions with `min-height: 0`, while Preview/Edit/Save actions remain in a `projection-song-panel__actions` footer.

- [ ] **Step 2: Normalize compact controls and content hierarchy**

Apply scoped classes to the song identity header, metadata rows, zoom controls, chord grid, note editor, empty state, and action buttons. Preserve current data and callbacks.

- [ ] **Step 3: Add narrow-panel safeguards**

Allow labels and primary values to wrap where needed, truncate only secondary metadata, make action grids adapt to available width, and prevent text areas and buttons from exceeding the panel.

- [ ] **Step 4: Run Song panel tests**

Run: `npm test -- --run src/renderer/src/screens/modes/__tests__/ProjectionModePanels.test.tsx`

Expected: PASS.

### Task 4: Polish Notifications

**Files:**

- Modify: `src/renderer/src/components/projection/NotificationPanel.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/components/projection/__tests__/NotificationPanel.test.tsx`

- [ ] **Step 1: Replace fragile utility composition with scoped structure**

Create a persistent filter/action header, a single scrolling list body, compact notification rows, and stable empty states using `projection-notifications__*` classes.

- [ ] **Step 2: Improve accessibility and state hierarchy**

Add `aria-label`, `aria-pressed`, and active filter semantics; keep unread rows prominent and read rows legible; ensure remove controls are keyboard-visible rather than hover-only.

- [ ] **Step 3: Run Notification tests**

Run: `npm test -- --run src/renderer/src/components/projection/__tests__/NotificationPanel.test.tsx`

Expected: PASS.

### Task 5: Polish Audio/Timer

**Files:**

- Modify: `src/renderer/src/components/projection/AudioPanel.tsx`
- Modify: `src/renderer/src/assets/main.css`
- Test: `src/renderer/src/components/projection/__tests__/AudioPanel.test.tsx`

- [ ] **Step 1: Clarify timer state and controls**

Use Indonesian operational labels, expose running/paused state text, preserve Start/Pause/Reset/Close callbacks, and add pressed/disabled semantics where relevant.

- [ ] **Step 2: Replace decorative VU bars**

Remove fake activity bars and show a neutral monitoring-unavailable state with an icon and concise explanation.

- [ ] **Step 3: Harden expanded and collapsed layouts**

Keep header and controls inside the narrow column, protect long timer values, and use bounded content spacing at short heights.

- [ ] **Step 4: Run Audio tests**

Run: `npm test -- --run src/renderer/src/components/projection/__tests__/AudioPanel.test.tsx`

Expected: PASS.

### Task 6: Verification and visual QA

**Files:**

- Modify only if verification finds a scoped regression.

- [ ] **Step 1: Run formatting checks for changed files**

Run Prettier check/write only for the changed TSX, test, CSS, and plan files, then run `git diff --check`.

- [ ] **Step 2: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

Expected: both commands exit 0.

- [ ] **Step 3: Run all tests**

Run: `npm test -- --run`

Expected: all suites pass.

- [ ] **Step 4: Build production renderer and Electron bundles**

Run: `npm run build`

Expected: typecheck and Electron Vite production build exit 0.

- [ ] **Step 5: Perform visual QA**

Inspect Song sub-tabs, Notifications, Audio/Timer, shared navigation, empty states, long content, narrow panel width, and short viewport height at the local app URL and in Electron. Confirm no overlap, clipping, unreachable controls, or fake audio activity.
