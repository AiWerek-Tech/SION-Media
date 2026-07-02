# Phase 3 — Modal System Foundation

**Status:** ✅ COMPLETE  
**Date:** 2026-05-16  
**Validation:** `npm run typecheck` ✅ | `npm run test` 16/16 ✅  
**Risk Level:** LOW — new files + targeted replacements of `confirm()` calls

---

## Objective

Build the modal infrastructure and replace all `confirm()` / `window.confirm()` calls with proper async modal dialogs. Zero `confirm()` calls remain in the codebase after this phase.

---

## File Sequence (per master order §3.4)

### 1. `src/renderer/src/components/modals/Modal.tsx` — Base Component

Foundation for all modal dialogs. Provides:

**Features:**

- Backdrop: `rgba(0,0,0,0.6)` + `backdrop-filter: blur(4px)`, z-[1350]
- Container: `rgba(17,19,28,0.98)`, border, shadow, z-[1400]
- Focus trap: auto-focuses first focusable element on mount (50ms delay for animation)
- Escape key: closes top modal via `closeById(id)` — captured in capture phase
- Size variants: `sm` (max-w-sm) / `md` (max-w-md) / `lg` (max-w-lg) / `xl` (max-w-2xl)
- Animation: `scale(0.96)+opacity(0) → scale(1)+opacity(1)`, 200ms ease-premium
- `dismissible` prop: controls whether backdrop click closes modal
- `danger` prop: red border accent for destructive actions

**`ModalButton` component:**

- `primary` variant: brand-primary background
- `secondary` variant: subtle background + border
- `danger` variant: rose-400 text + rose border
- `loading` state: shows "Memproses..." + disables button

---

### 2. `src/renderer/src/components/modals/ConfirmDialog.tsx` — MM-002

Replaces all `confirm()` / `window.confirm()` calls.

**Usage pattern:**

```typescript
const confirmed = await useModalStore
  .getState()
  .openAsync<boolean>('confirm-delete-song', 'confirm', {
    title: 'Hapus Lagu?',
    description: '"123 - Amazing Grace" akan dihapus permanen.',
    confirmLabel: 'Hapus',
    danger: true,
    onConfirm: async () => {
      await window.api.songs.delete(id)
    }
  })
if (confirmed) {
  /* post-delete UI update */
}
```

**Features:**

- `onConfirm` prop: async action — shows loading state during execution
- Inline error display on `onConfirm` failure — modal stays open
- `danger` variant: red icon + red confirm button
- Non-`onConfirm` mode: resolves immediately with `true` on confirm click

---

### 3. `src/renderer/src/components/modals/CreatePlaylistDialog.tsx` — MM-001

**Trigger:** `document.dispatchEvent(new CustomEvent('sion:create-playlist'))`

**Features:**

- Name field: required, max 80 chars, auto-focused, Enter submits
- Service date field: optional, `type="date"`, dark color scheme
- Inline validation: shows error if name empty
- On success: calls `usePlaylistStore.createPlaylist()` → shows toast → closes
- On error: shows inline error, keeps modal open, re-enables submit

---

### 4. `src/renderer/src/components/modals/CrashRecoveryDialog.tsx` — MM-003

**Trigger:** `useCrashRecovery` hook on startup when `needsRecovery = true`

**Features:**

- `dismissible: false` — backdrop click disabled (operator must make a choice)
- `showClose: false` — no X button
- Shows recovery details: playlist ID, song ID, slide index, projection state
- "Pulihkan Sesi" → calls `onRestore()` → closes
- "Mulai Baru" → calls `onDismiss()` → closes

---

### 5. `src/renderer/src/components/modals/PlaylistPickerDialog.tsx` — MM-004

**Trigger:** Phase 6 context menu "Add to Playlist"

**Features:**

- Lists all playlists from `usePlaylistStore`
- Selection highlight: blue border + background
- Check icon on selected item
- Empty state when no playlists exist
- `onSelect(playlist)` callback + `closeById(id, playlist)` on confirm

---

### 6. `src/renderer/src/components/modals/ModalRegistry.tsx` — Full Implementation

Replaces Phase 2 stub. Renders the active modal stack.

**Architecture:**

```typescript
// ModalRenderer maps entry.type → component
switch (type) {
  case 'confirm':          → <ConfirmDialog />
  case 'create-playlist':  → <CreatePlaylistDialog />
  case 'crash-recovery':   → <CrashRecoveryDialog />
  case 'playlist-picker':  → <PlaylistPickerDialog />
}

// ModalRegistry:
// 1. Listens for 'sion:create-playlist' CustomEvent
// 2. Renders stack with AnimatePresence mode="sync"
// 3. Returns null when stack is empty (zero overhead)
```

---

### 7. `src/renderer/src/components/modals/index.ts` — Export Barrel

```typescript
export { Modal, ModalButton } from './Modal'
export { ConfirmDialog } from './ConfirmDialog'
export { CreatePlaylistDialog } from './CreatePlaylistDialog'
export { CrashRecoveryDialog } from './CrashRecoveryDialog'
export { PlaylistPickerDialog } from './PlaylistPickerDialog'
export { ModalRegistry } from './ModalRegistry'
```

---

## Sequence 3.2 — Replace `confirm()` Calls

### `src/renderer/src/hooks/useCrashRecovery.ts`

**Before:** Silent automatic restore on startup.

**After:**

- Extracted `doRestoreSession(recoveryState, songs)` as standalone async function
- On `needsRecovery`: opens `CrashRecoveryDialog` via `useModalStore.open()`
- User explicitly chooses "Pulihkan Sesi" or "Mulai Baru"
- `onRestore`: calls `doRestoreSession()` → shows success toast → `markCleanExit()`
- `onDismiss`: calls `markCleanExit()` only

### `src/renderer/src/screens/modes/ManagementMode.tsx`

**`handleDeleteSong`:**

```typescript
// Before:
if (!confirm(`Hapus lagu "${song.number} - ${song.title}"?`)) return

// After:
const confirmed = await useModalStore
  .getState()
  .openAsync<boolean>('confirm-delete-song', 'confirm', {
    title: 'Hapus Lagu?',
    description: '...',
    confirmLabel: 'Hapus',
    danger: true
  })
if (!confirmed) return
```

**`handleBulkDelete`:**

```typescript
// Before:
if (!confirm(`Hapus ${selectedSongIds.size} lagu yang dipilih?`)) return

// After:
const confirmed = await useModalStore
  .getState()
  .openAsync<boolean>('confirm-bulk-delete', 'confirm', {
    title: `Hapus ${count} Lagu?`,
    description: '...',
    confirmLabel: 'Hapus Semua',
    danger: true
  })
if (!confirmed) return
```

### `src/renderer/src/screens/SettingsScreen.tsx`

**`handleReseed`:**

```typescript
// Before:
await window.api.system.reseed()

// After:
const confirmed = await useModalStore.getState().openAsync<boolean>('confirm-reseed', 'confirm', {
  title: 'Reset Database Lagu?',
  description: '...',
  confirmLabel: 'Reset Database',
  danger: true
})
if (!confirmed) return
await window.api.system.reseed()
```

### `src/renderer/src/components/PlaylistPanel.tsx`

**`handleDeletePlaylist`:**

```typescript
// Before:
if (confirm(`Hapus playlist "${activePlaylist.name}"?`)) { ... }

// After:
const confirmed = await useModalStore.getState().openAsync<boolean>(
  'confirm-delete-playlist', 'confirm',
  { title: 'Hapus Playlist?', description: '...', confirmLabel: 'Hapus', danger: true }
)
if (!confirmed) return
```

---

## Confirm() Audit Result

```
Before Phase 3: 4 confirm() calls found
After Phase 3:  0 confirm() calls remain ✅
```

Files checked:

- `src/renderer/src/**/*.tsx` — 0 matches
- `src/renderer/src/**/*.ts` — 0 matches

---

## Validation Results

```
npm run typecheck  → Exit 0 ✅
npm run test       → 16/16 pass ✅
```

---

## Rollback

- Delete all 7 modal files
- Restore `confirm()` calls in ManagementMode, SettingsScreen, PlaylistPanel
- Restore silent auto-restore in useCrashRecovery
- Remove `<ModalRegistry />` from App.tsx (or revert to stub)
