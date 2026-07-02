# Bible Panel and Smart Verse Fit Design

## Scope

Polish the existing Mini Alkitab panel without redesigning Projection Mode. Improve selection,
scrolling, playlist persistence, and text safety in Preview and Live for both Projection Mode and
Library Bible workflows.

## Bible Panel UX

- Keep Search, Browse, and Manual modes.
- Use scoped Electron-safe spacing so controls do not overlap or touch panel edges.
- Make book, chapter, verse, spotlight, and history lists vertically scrollable with a visible thin
  scrollbar and contained wheel behavior.
- Keep selection actions visible while the verse list scrolls.
- Preserve compact Preview, Live, and Add-to-Playlist actions.

## Slide Contract

Each selected Bible verse produces exactly one slide. A verse is never merged with its neighbor and
is not split merely because it is long. Every slide carries `contentType: 'bible'`, its own reference,
version, copyright, and optional playlist item id. The same builder is used by Mini Alkitab, Library
Bible, and playlist playback.

## Smart Text Fit

The operator font setting is the requested maximum. Bible rendering measures the complete verse,
reference, and copyright in the 1920×1080 canvas. A binary search selects the largest font size that
fits both available width and height, with a readable minimum. Short verses retain the requested
size; long verses automatically shrink. Songs and Info slides retain their existing behavior.

## Playlist

Selected verses are stored as an immutable JSON snapshot in the active playlist. Reopening or
projecting the playlist reconstructs one slide per verse with the same metadata and smart-fit
behavior.

## Verification

- Pure tests cover one-verse-per-slide generation and the font-size search.
- Component tests cover the scroll contract and Bible rendering hierarchy.
- Electron QA covers multi-selection, playlist round-trip, Preview, Live, and a long verse at an
  oversized operator font setting.
