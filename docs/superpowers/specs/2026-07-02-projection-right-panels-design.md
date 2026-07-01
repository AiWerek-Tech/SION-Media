# Projection Right Panels UI Design

## Scope

Polish the bottom-right Projection dashboard panels other than Bible and Announcement/Info. The work covers the Song workspace, Notifications, Audio/Timer, and their shared panel navigation. Existing application structure and behavior remain intact.

## Direction

Use the approved **Operational Compact** direction: dense enough for live operation, visually calm, and readable at constrained Electron window sizes. Avoid a broad redesign or decorative card proliferation.

## Shared Layout Contract

- Each panel is a bounded flex column with `min-height: 0` so its content cannot push outside the dashboard grid.
- Headers, tabs, filters, and primary actions remain visible. Only the content body scrolls vertically.
- Controls use consistent heights, spacing, radii, borders, focus rings, disabled states, and hit targets.
- Text truncation is used only for secondary single-line metadata; primary content remains readable through wrapping or scrolling.
- Empty, loading, and unavailable states occupy the content body without shifting persistent controls.

## Song Panel

- Preserve the existing Info, Lyrics, Chord, and Notes workflow.
- Clarify the active sub-tab and improve keyboard focus and hover states.
- Keep song identity and essential metadata compact and stable above the scrollable content.
- Give lyrics, chords, and notes their own safe scrolling region.
- Keep primary preview/live or update actions visible when content becomes long.
- Prevent inputs, text areas, chord rows, and action buttons from clipping at narrow panel widths.

## Notifications Panel

- Keep status/filter controls compact and visually distinct from the notification list.
- Make the notification list the only expanding and scrolling region.
- Distinguish unread, read, priority, and timestamp information through restrained hierarchy rather than oversized cards.
- Keep clear/dismiss actions discoverable while avoiding accidental emphasis over the primary content.
- Provide stable empty and no-filter-results states.

## Audio and Timer Panel

- Preserve the current collapsible behavior.
- Present timer value, state, primary Start/Pause action, and secondary Reset action in a compact operational layout.
- Avoid fake audio activity. If monitoring data is unavailable, show an honest neutral state.
- Ensure the collapsed and expanded forms fit the dashboard column without overflow.

## Shared Top Navigation

- Normalize tab height, icon alignment, label spacing, active treatment, badges, hover, and keyboard focus.
- Maintain existing labels and panel routing.
- Ensure tabs remain usable at the minimum supported panel width without overlapping the audio toggle.

## Behavior and Data

No database, playlist, projection, or IPC contract changes are planned. Existing callbacks and store actions remain the source of behavior. Component refactoring is allowed only where needed to create reliable layout boundaries and testable UI states.

## Accessibility and Electron Constraints

- Preserve semantic buttons and inputs.
- Add visible `:focus-visible` treatment and meaningful accessible labels for icon-only controls.
- Respect reduced-motion preferences.
- Validate common Electron viewport sizes and short-height layouts; no content may overlap, escape its panel, or become unreachable.

## Verification

- Add or update focused component tests for tab selection, panel actions, empty states, and long-content rendering.
- Run lint, the relevant test suite, the complete renderer test suite, and a production build.
- Perform visual QA in the local browser and the Electron window at normal and constrained sizes.

## Non-goals

- Redesigning the whole Projection dashboard.
- Changing Bible or Announcement/Info panel behavior completed in earlier work.
- Adding new backend features, media playback engines, or notification sources.
- Changing the product theme or typography system globally.
