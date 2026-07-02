# Task — Premium Modal UI/UX Redesign

## Phase 1: CSS Framework & Utility Classes

- `[x]` 1.1 — Update `src/renderer/src/assets/main.css` with premium modal styling (`.sp-modal-overlay`, `.sp-modal`, `.sp-modal-card`, `.sp-modal-icon-wrap`, `.sp-modal-btn`, `.sp-recovery-banner`, and light mode overrides)

## Phase 2: Base Components Refactoring

- `[x]` 2.1 — Refactor `src/renderer/src/components/modals/Modal.tsx` to use the new CSS button and container classes, removing inline style attributes

## Phase 3: Dialog Modals Polishing

- `[x]` 3.1 — Polish `ConfirmDialog.tsx` (warning icons and descriptions)
- `[x]` 3.2 — Polish `CreatePlaylistDialog.tsx` (inputs, inline sizes, layout alignment)
- `[x]` 3.3 — Polish `CrashRecoveryDialog.tsx` (remove all inline styles, use `.sp-recovery-banner` and `.sp-modal-card`)
- `[x]` 3.4 — Polish `PlaylistPickerDialog.tsx` (selection buttons, active state, layout)
- `[x]` 3.5 — Polish `SongRelationsModal.tsx` (refactor to use the shared `<Modal>` component)
- `[x]` 3.6 — Unify `DuplicateSongDialog.tsx`, `ExportSongDialog.tsx`, `ImportProgressDialog.tsx`, `TagManagerDialog.tsx`, `SceneConfigDialog.tsx`, and `IntegrityCheckDialog.tsx` with standard styles

## Phase 4: Verification

- `[x]` 4.1 — Run `npx tsc --noEmit`
- `[x]` 4.2 — Run `npm run test`
- `[x]` 4.3 — Run `npm run build`
