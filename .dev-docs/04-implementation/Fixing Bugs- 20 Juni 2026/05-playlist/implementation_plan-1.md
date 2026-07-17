# Implementation Plan — Premium Modal UI/UX Redesign

This plan details the visual upgrade, polishing, and unification of all Modal Dialog components in SION Media. It aims to replace basic, hardcoded styling with a cohesive, state-of-the-art glassmorphism design system supporting smooth transitions, micro-animations, and full dark/light mode adaptability.

---

## User Review Required

> [!IMPORTANT]
>
> - **Styling Consolidation**: We are replacing heavy inline style blocks and hardcoded colors (such as dark `bg-zinc-900` or raw hex/rgb values) with semantic class names (`.sp-modal-card`, `.sp-modal-btn`, `.sp-input`, etc.). This guarantees proper light mode inheritance and design system compliance.
> - **Unifying SongRelationsModal**: The SongRelationsModal currently uses its own standalone backdrop and modal wrapper markup instead of the standard `Modal` component. We will refactor it to wrap its specific content within the main `Modal` component for layout consistency.

---

## Open Questions

There are no unresolved questions. We will use the existing system variables (`--color-*`) to match the main application theme exactly.

---

## Proposed Changes

### 1. Style Sheets

#### [MODIFY] [main.css](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/assets/main.css)

- Redesign modal foundation styles:
  - `.sp-modal-overlay`: Premium radial spotlight overlay with saturated backdrop blur (`blur(16px)`).
  - `.sp-modal`: Glassmorphism wrapper (`backdrop-filter: blur(30px)`) with elegant border gradients and high-fidelity box shadows.
  - `.sp-modal__header`: Translucent top header with custom Poppins typography.
  - `.sp-modal__eyebrow`: Vibrant blue-to-violet gradient text for tags.
  - `.sp-modal__body` / `.sp-modal__footer`: Clean paddings, layout alignments, and theme-aware dividers.
- Define new utility classes for modals:
  - `.sp-modal-card`: Translucent content panel for forms/statistics (replacing hardcoded zinc colors).
  - `.sp-modal-icon-wrap`: Styled icon container (supporting theme-aware `primary`, `danger`, and `warning` types).
  - `.sp-modal-btn`: Interactive buttons supporting active scaling, hover translation, and focus outline shadows.
  - `.sp-modal-btn--primary`, `--secondary`, `--danger`: Gradient backgrounds and transitions.
  - `.sp-recovery-banner`: Beautiful glass alert banner for the Recovery Dialog.

### 2. Base Modal Component

#### [MODIFY] [Modal.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/Modal.tsx)

- Replace inline styles on `ModalButton` and the modal container with standard semantic class names (`sp-modal-btn`, `sp-modal-btn--*`).
- Align X-close button aesthetics with other navigation elements.

### 3. Modal Dialog Components

#### [MODIFY] [ConfirmDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/ConfirmDialog.tsx)

- Replace custom background style on icon with `.sp-modal-icon-wrap`.
- Refactor text description to use clean theme colors.

#### [MODIFY] [CreatePlaylistDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/CreatePlaylistDialog.tsx)

- Swap custom inline styles on inputs and labels with `.sp-input` and standard text color classes.
- Add `.sp-modal-icon-wrap` to the ListMusic icon.

#### [MODIFY] [CrashRecoveryDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/CrashRecoveryDialog.tsx)

- Remove all duplicated inline styling attributes.
- Structure data details into a unified glass grid using `.sp-modal-card` and `.sp-recovery-banner`.

#### [MODIFY] [PlaylistPickerDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/PlaylistPickerDialog.tsx)

- Polish the checklist item rows to act as premium clickable button options with scale transitions.
- Replace inline colors with theme variables.

#### [MODIFY] [SongRelationsModal.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/SongRelationsModal.tsx)

- Refactor the file to inherit the base `<Modal>` component.
- Unify the tab buttons and related song lists under the new glassmorphic styles.

#### [MODIFY] [TagManagerDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/TagManagerDialog.tsx)

- Style search search-input, category tabs, and list containers to conform to SION design tokens.

#### [MODIFY] [SceneConfigDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/SceneConfigDialog.tsx)

- Upgrade preset buttons, text inputs, color inputs, and configuration panels.

#### [MODIFY] [IntegrityCheckDialog.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/modals/IntegrityCheckDialog.tsx)

- Replace dark zinc boxes with `.sp-modal-card` to align statistics cards correctly in light/dark modes.

---

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` and `npm run typecheck` to verify no compile-time regressions.
- Run `npm run test` to verify Vitest tests suite.
- Run `npm run build` to compile production assets.

### Manual Verification

1. **Interactive Check**: Launch the application. Trigger modal events (e.g. create playlist, delete song, database analysis, song relations).
2. **Theme Switch**: Switch between dark and light themes. Verify all modals render with correct backgrounds, border borders, input readability, and clear button contrast.
3. **Animations**: Confirm backdrop transition and card scaling on open/close behave smoothly.
