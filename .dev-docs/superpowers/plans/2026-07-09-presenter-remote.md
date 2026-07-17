# Presenter Remote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local WiFi browser remote for speakers/preachers to view current/next slide and control projection from a phone on the same network.

**Architecture:** Electron main owns a small local HTTP/SSE server with token-gated command endpoints. Renderer publishes projection snapshots to main and receives remote commands through preload IPC, then routes commands through the existing projection store/runtime actions. Settings exposes start/stop and connection details.

**Tech Stack:** Electron main process, Node `http`/`os`/`crypto`, Server-Sent Events, React settings panel, existing Zustand projection store and runtime command bus.

---

### Task 1: Main Process Presenter Remote Server

**Files:**

- Create: `src/main/presenter-remote-server.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`

- [ ] Create a dependency-free HTTP server that serves `/`, `/events`, `/api/status`, and `/api/command`.
- [ ] Use a random token per server session and require it for command requests.
- [ ] Broadcast snapshot updates to connected SSE clients.
- [ ] Forward accepted commands to the main renderer window.

### Task 2: Renderer Command Bridge

**Files:**

- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/store/useProjectionStore.ts`

- [ ] Publish projection snapshots whenever live slide, next slide, state, or flow metadata changes.
- [ ] Listen for remote commands and map them to existing actions: next, prev, black, clear, logo.

### Task 3: Settings UI

**Files:**

- Create: `src/renderer/src/screens/settings/PresenterRemoteSettings.tsx`
- Modify: `src/renderer/src/screens/settings/index.ts`
- Modify: `src/renderer/src/screens/SettingsScreen.tsx`

- [ ] Add a �Remote Pemateri� settings section.
- [ ] Provide Start, Stop, refresh status, URL, token, local IP list, and copy/open controls.
- [ ] Explain same-network usage briefly inside the panel.

### Task 4: Verification

**Files:**

- Test existing type/lint/build paths.

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] If practical, start the app and test `http://localhost:<port>` manually.
