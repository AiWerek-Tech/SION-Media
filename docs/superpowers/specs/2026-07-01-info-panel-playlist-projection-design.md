# Info Panel Playlist and Projection Design

## Scope

Improve the existing Projection Mode Info panel without redesigning the dashboard.

## Behavior

- “Kirim ke Preview” creates a custom Info slide immediately.
- “Tambah ke Playlist” stores the same title/body in the active playlist.
- If no playlist is active, the app shows an error toast and does not discard input.
- Playlist Info items can be selected like song and Bible items.

## Data Model

Use the existing `playlist_items.title` and `playlist_items.notes` columns with
`item_type = 'info'`. No schema migration is required. Generated slides use
`contentType = 'custom'`, `sectionLabel = title`, and `text = body`.

## Projection Hierarchy

`PresentationCanvas` renders custom Info slides with two explicit levels:

- title: smaller, medium weight, subdued accent color;
- body: larger, high-contrast, dominant content.

Songs and Bible slides retain their current rendering.

## Verification

- Unit tests cover Info slide generation, playlist persistence action, and title/body rendering.
- Electron QA covers adding to the active playlist, selecting the item, Preview, and Live output.
