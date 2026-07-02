# Unified Modal System Design

## Goal

Provide one production-grade modal contract for SION Media so dialogs remain centered, readable, scrollable, and unclipped in every Electron dashboard layout.

## Root cause

The application currently mixes the shared `Modal` component with locally positioned overlays. The playlist dialog is mounted inside `.projection-bottom-workspace`, whose direct children intentionally use `overflow: hidden`; consequently the dialog's fixed layer is clipped to the playlist grid cell. Other local dialogs duplicate overlay, surface, padding, footer, and viewport rules, producing inconsistent geometry.

## Architecture

- The shared `Modal` renders through `createPortal(..., document.body)`, escaping transformed and clipped dashboard ancestors.
- Controlled dialogs receive `onClose`; registry dialogs retain their existing modal-store close behavior.
- One overlay and one surface contract own z-index, viewport padding, maximum height, focus handling, header, scrollable body, and footer.
- The playlist creation and loading dialogs migrate first because they reproduce the defect. Other playlist creation entry points use the same component instead of hand-built overlays.
- Existing registry dialogs inherit the new system automatically without changes to business logic.
- Legacy `.sp-modal-overlay > .sp-modal` consumers receive compatible geometry until their feature code is migrated, preventing a mixed visual result.

## Visual contract

- Surface width is selected by semantic size (`sm`, `md`, `lg`, `xl`) and never exceeds the available Electron viewport.
- Surface maximum height is `calc(100dvh - 32px)`; only the body scrolls.
- Header and footer remain visible, with 20–24 px desktop spacing and compact spacing on short windows.
- Form controls use consistent 40 px minimum height, visible labels, focus rings, and no clipped outlines.
- Footer buttons align right on desktop and become equal-width on narrow windows.
- Dark and light themes use existing SION tokens; no new visual language is introduced.

## Interaction contract

- Escape and dismissible backdrop close the dialog.
- Tab focus stays inside the active dialog and focus returns to the previously focused control on close.
- Background scrolling is locked while a modal is open.
- Non-dismissible/loading dialogs cannot close accidentally.
- Close buttons and dialog regions have complete accessible labels.

## Verification

- Component tests verify body-level portal mounting, controlled/store close paths, Escape, backdrop behavior, and focus containment.
- Playlist tests verify its local dialogs use the shared modal rather than a nested fixed overlay.
- Typecheck, lint, full Vitest suite, and production build must pass.
- Visual QA checks the supplied playlist screenshot case at the active Electron-sized viewport and confirms the modal is fully centered with no clipping.
