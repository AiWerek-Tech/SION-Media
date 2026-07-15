# SION Link Role-Based Remote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build SION Link, a local-network role-based remote, live viewer, and stage display system for presenter, operator, viewer, and stage devices.

**Architecture:** Keep the existing local HTTP/SSE server as the foundation and evolve it from one `Remote Pemateri` page into a role-aware SION Link server. Each role receives a separate route and access code, while all clients consume the same snapshot stream with server-side command authorization.

**Tech Stack:** Electron main process HTTP server, renderer IPC snapshot publisher, React projection store, browser HTML/CSS/JS clients, Vitest for utility tests, npm scripts for lint/typecheck/build.

---

## File Structure

- Modify `src/main/presenter-remote-server.ts`: rename the user-facing concept to SION Link, add role codes, route-specific HTML, role authorization, viewer/stage pages, and command gating.
- Modify `src/preload/index.d.ts`: extend status types with role codes and role URLs.
- Modify `src/renderer/src/screens/settings/PresenterRemoteSettings.tsx`: rename settings UI to SION Link, show per-role URLs and codes, and keep the old start/stop behavior.
- Modify `src/renderer/src/App.tsx`: keep the existing snapshot publisher, then later add richer stage/live metadata as needed.
- Create or modify tests under `src/main/__tests__/` or `src/renderer/src/utils/__tests__/` when logic is extracted into testable utilities.

---

### Task 1: Role Model and Server Routes

**Files:**
- Modify: `src/main/presenter-remote-server.ts`
- Modify: `src/preload/index.d.ts`

- [x] **Step 1: Add role types and status shape**

Add these types to `src/main/presenter-remote-server.ts`:

```ts
export type SionLinkRole = 'presenter' | 'operator' | 'viewer' | 'stage'

export interface SionLinkRoleAccess {
  role: SionLinkRole
  code: string
  url: string | null
}
```

Extend `PresenterRemoteStatus`:

```ts
roles: SionLinkRoleAccess[]
```

- [x] **Step 2: Generate role codes on server start**

Use `randomBytes(3).toString('hex').toUpperCase()` per role:

```ts
let roleCodes: Record<SionLinkRole, string> = {
  presenter: '',
  operator: '',
  viewer: '',
  stage: ''
}
```

On start:

```ts
roleCodes = {
  presenter: randomBytes(3).toString('hex').toUpperCase(),
  operator: randomBytes(3).toString('hex').toUpperCase(),
  viewer: randomBytes(3).toString('hex').toUpperCase(),
  stage: randomBytes(3).toString('hex').toUpperCase()
}
token = roleCodes.presenter
```

- [x] **Step 3: Add role URLs**

Build URLs like:

```ts
http://192.168.1.60:55082/presenter?code=ABC123
http://192.168.1.60:55082/operator?code=DEF456
http://192.168.1.60:55082/live?code=GHI789
http://192.168.1.60:55082/stage?code=JKL012
```

- [x] **Step 4: Keep legacy URL working**

The existing `/?token=...` must still open presenter mode so old copied links do not break.

- [x] **Step 5: Verify**

Run:

```powershell
npm run typecheck
npm run lint
```

Expected: both commands exit `0`.

---

### Task 2: Role-Specific UI Pages

**Files:**
- Modify: `src/main/presenter-remote-server.ts`

- [x] **Step 1: Presenter page**

Presenter page shows current slide, next slide, and only two controls:

```html
<button onclick="sendCommand('PREV')">Prev</button>
<button class="primary" onclick="sendCommand('NEXT')">Next</button>
```

- [x] **Step 2: Operator page**

Operator page shows current slide, next slide, and full controls:

```html
<button onclick="sendCommand('PREV')">Prev</button>
<button class="primary" onclick="sendCommand('NEXT')">Next</button>
<button onclick="sendCommand('CLEAR')">Clear</button>
<button class="danger" onclick="sendCommand('BLACK')">Black</button>
<button onclick="sendCommand('LOGO')">Logo</button>
<button onclick="sendCommand('FREEZE')">Freeze</button>
```

- [x] **Step 3: Live viewer page**

Live viewer page shows only current live visual/text and no command controls.

- [x] **Step 4: Stage page**

Stage page shows current and next with confidence-display emphasis: current text/visual, next text/visual, state, and mode. No command controls.

- [x] **Step 5: Verify**

Run:

```powershell
npm run build
```

Expected: build exits `0`.

---

### Task 3: Server-Side Command Authorization

**Files:**
- Modify: `src/main/presenter-remote-server.ts`

- [x] **Step 1: Parse role from code**

Create:

```ts
function getRoleForCode(code: string | null): SionLinkRole | null {
  if (!code) return null
  for (const [role, roleCode] of Object.entries(roleCodes) as Array<[SionLinkRole, string]>) {
    if (roleCode && roleCode === code) return role
  }
  return null
}
```

- [x] **Step 2: Gate commands**

Presenter allowed commands:

```ts
const ROLE_COMMANDS: Record<SionLinkRole, Set<PresenterRemoteCommand>> = {
  presenter: new Set(['NEXT', 'PREV']),
  operator: new Set(['NEXT', 'PREV', 'CLEAR', 'BLACK', 'LOGO', 'FREEZE']),
  viewer: new Set(),
  stage: new Set()
}
```

Reject command if the role does not allow it:

```ts
if (!role || !ROLE_COMMANDS[role].has(command as PresenterRemoteCommand)) {
  sendJson(res, 403, { ok: false, error: 'Command not allowed for this role' })
  return
}
```

- [x] **Step 3: Verify**

Run:

```powershell
npm run typecheck
npm run build
```

Expected: both commands exit `0`.

---

### Task 4: Settings Screen Rename and Role Cards

**Files:**
- Modify: `src/renderer/src/screens/settings/PresenterRemoteSettings.tsx`
- Modify: `src/preload/index.d.ts`

- [x] **Step 1: Rename UI copy**

Change title from `Remote Pemateri` to `SION Link`.

- [x] **Step 2: Render role cards**

For each status role, render:

```tsx
<div className="sion-link-role-card">
  <div>{role.label}</div>
  <div>{role.code}</div>
  <button>Salin</button>
  <button>Buka</button>
</div>
```

- [x] **Step 3: Keep legacy main URL**

The existing primary URL can point to presenter mode, but role cards must expose all modes.

- [x] **Step 4: Verify**

Run:

```powershell
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit `0`.

---

### Task 5: PWA and Native Companion Research Spike

**Files:**
- Create: `docs/superpowers/specs/2026-07-10-sion-link-native-companion.md`

- [x] **Step 1: Document PWA-first decision**

Write that SION Link should first become a browser/PWA experience, then desktop/mobile wrappers can reuse the same routes and protocol.

- [x] **Step 2: Define native companion input flow**

Native companion fields:

```text
Operator IP
Port
Code
Remember this device
Connect
```

- [x] **Step 3: Define names**

Use `SION Link` as the product name and reserve `SION Link Desktop` / `SION Link Mobile` for installer packages.

---

## Self-Review

- Spec coverage: role separation, live viewer, web stage display, native companion direction, and code-based role selection are covered.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: role names are `presenter`, `operator`, `viewer`, and `stage` throughout.
