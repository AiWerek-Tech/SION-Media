# Projection Panel Scroll Revision Design

## Scope

Revise the existing compact Projection utility panel without redesigning the dashboard. The revision covers the Song Info scroll contract, all three Bible modes, the Bible header, and removal of the unused bottom-right Notifications panel.

## Song Info

- Keep Song sub-tabs and action footer fixed.
- Make the identity and metadata body one explicit internal vertical scroll viewport.
- Use `min-height: 0`, `overflow-y: auto`, overscroll containment, and a visible thin scrollbar.
- Preserve all existing song callbacks and data.

## Bible Header

- Remove the “MINI ALKITAB” heading row.
- Place the active Bible-version selector in the same compact control row as Cari, Browse, and Manual.
- Keep the version dropdown keyboard-accessible and usable at the minimum panel width.

## Bible Mode Scrolling

- Give Cari, Browse, and Manual one bounded mode viewport each.
- Keep the mode bar fixed while each mode’s content scrolls internally.
- Preserve nested verse/result scrolling only where it does not create a scroll trap.
- Keep Preview, Live, Playlist, and history controls reachable at short Electron heights.
- Expanded history remains an isolated view and cannot cover mode content.

## Notifications Removal

- Remove the Notif tab, unread badge, and `NotificationPanel` import/rendering from Projection Mode.
- Retain the notification store and title-bar notification surfaces because they remain shared infrastructure.
- Do not add replacement notification behavior in this revision.

## Timer

No timer behavior changes are included. The existing timer remains globally ticked once per second, starts automatically when Projection enters LIVE, supports pause/resume, and resets to zero in a stopped state.

## Verification

- Add failing layout-contract tests before production changes.
- Cover Song Info internal scroll, Bible header removal, version selector placement, and scroll classes for Cari/Browse/Manual.
- Verify Projection navigation no longer exposes Notif.
- Run focused tests, full tests, lint, typecheck, production build, and Electron visual QA at normal and constrained widths/heights.

## Non-goals

- Changing Bible search, browse, manual-entry, playlist, or projection data behavior.
- Redesigning Bible verse cards or history.
- Removing title-bar notification infrastructure.
- Changing timer persistence or adding countdown behavior.
