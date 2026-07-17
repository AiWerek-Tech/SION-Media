# Implementation Plan — Mixed Service Rundown (Bible Playlist)

This plan details the implementation of a unified **Mixed Service Rundown** for SION Media, allowing the playlist/rundown panel to seamlessly display, organize, reorder, export/import, and project both song items and Bible verses.

---

## User Review Required

> [!IMPORTANT]
>
> - **Table Schema Re-creation**: In SQLite, to make the `song_id` column nullable (originally created as `NOT NULL`), we must perform a table-recreation migration (renaming `playlist_items` to a temporary name, creating the updated table, copying existing items, dropping the temporary table). This is fully backward-compatible and preserves all user playlists.
> - **Offline Snapshot Continuity**: Bible rundown items include a `bible_text_json` snapshot when created. This allows the rundown to render and split slides offline even if the external Bible pack is uninstalled or missing.

---

## Open Questions

There are no major open questions, as all requirements (including database migrations, indexing, and export formats) are fully specified. We will proceed with execution once approved.

---

## Proposed Changes

### 1. Database & Migrations

#### [MODIFY] [migrations.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/migrations.ts)

- Add database migration `version: 19` named `mixed_rundown_support`.
- Recreate `playlist_items` table to remove the `NOT NULL` constraint on `song_id` and add new fields:
  - `item_type TEXT NOT NULL DEFAULT 'song'`
  - `title TEXT DEFAULT ''`
  - `notes TEXT DEFAULT ''`
  - `bible_version_code TEXT DEFAULT ''`
  - `bible_version_short_name TEXT DEFAULT ''`
  - `bible_book_code TEXT DEFAULT ''`
  - `bible_book_name TEXT DEFAULT ''`
  - `bible_chapter INTEGER`
  - `bible_verse_start INTEGER`
  - `bible_verse_end INTEGER`
  - `bible_reference TEXT DEFAULT ''`
  - `bible_text_json TEXT DEFAULT ''`
  - `bible_copyright TEXT DEFAULT ''`
- Create indexes:
  - `idx_playlist_items_type ON playlist_items(item_type)`
  - `idx_playlist_items_bible_ref ON playlist_items(bible_version_code, bible_book_code, bible_chapter)`

#### [MODIFY] [database.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/database.ts)

- Update `getPlaylistItems` to use `LEFT JOIN` on `songs` and `hymnals` instead of `INNER JOIN` to prevent filtering out non-song rundown items.
- Use `COALESCE(s.title, pi.title) AS title` to dynamically select either the song title or the Bible reference as the item title.
- Update `addPlaylistItem` to insert song items with explicit `item_type = 'song'`.
- Implement `addBibleToPlaylist(payload)` to insert a Bible playlist item with snapshot data.
- Update `updatePlaylistItem` to allow modifying `title` and `notes`.

### 2. Main Process & IPC Preload

#### [MODIFY] [ipc-handlers.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/main/ipc-handlers.ts)

- Register IPC channel `db:add-bible-to-playlist` and map it to `addBibleToPlaylist`.

#### [MODIFY] [index.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.ts)

- Expose `addBible(playlistId, bible)` under the `playlists` namespace.

#### [MODIFY] [index.d.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/preload/index.d.ts)

- Update `PlaylistsAPI` and `PlaylistItemDto` typings to match the new fields and functions.

### 3. Types

#### [MODIFY] [types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/shared/types.ts)

- Add `PlaylistItemType` union and `BiblePlaylistPayload` interface.
- Update `PlaylistItem` and `SlideData` definitions with new fields.

#### [MODIFY] [types.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/types.ts)

- Replicate shared types in the renderer types file.

### 4. Slide Engine & Helpers

#### [NEW] [buildBibleSlides.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/features/bible/utils/buildBibleSlides.ts)

- Implement `buildBibleSlidesFromPlaylistItem(item)` to split verse snapshots into visual slides using character limits (`MAX_LENGTH = 180`) and append references and copyrights.

#### [MODIFY] [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/engine/slideEngine.ts)

- Check `item.item_type === 'bible'` in `generateSlidesForPlaylistItem` and forward to the new helper. Set `contentType: 'song'` and `playlistItemId` on song slides.

#### [MODIFY] [slideEngine.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/core/projection/slideEngine.ts)

- Mirror the changes in the core projection slide engine.

### 5. Frontend Zustand Store

#### [MODIFY] [usePlaylistStore.ts](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/store/usePlaylistStore.ts)

- Add `addBibleToPlaylist` store action. Check for `activePlaylist` and trigger toast warnings if no rundown is active.

### 6. User Interface Components

#### [MODIFY] [PlaylistItemCard.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PlaylistItemCard.tsx)

- Design custom styling for Bible items inside the rundown (BookOpen icon, blue/indigo accent, version badge, verse count, and preview snippet).

#### [MODIFY] [PlaylistPanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/PlaylistPanel.tsx)

- Update export playlist function to generate JSON files conforming to the new mixed service rundown format.
- Implement playlist JSON import directly in the rundown panel with automatic song matching and database injection.

#### [MODIFY] [ProjectionMode.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/modes/ProjectionMode.tsx)

- Update `handlePlaylistItemClick` to handle Bible rundown items (clearing selected song to avoid preview conflict and loading Bible slides into CUE).

#### [MODIFY] [BiblePanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/BiblePanel.tsx)

- Add `+ Playlist` buttons to search spotlight cards, browse mode spotlight views, and manual mode.

#### [MODIFY] [BibleScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/BibleScreen.tsx)

- Add `Tambah ke Playlist` button to the floating selected range bar. Update projection toast alerts to say `"dikirim ke Preview"`.

---

## Verification Plan

### Automated Tests

- Run `npx tsc --noEmit` to verify type safety.
- Run `npm run build` to verify production builds.

### Manual Verification

1. **Rundown Creation**: Create a new playlist.
2. **Add Song**: Add a song from the Library to the rundown.
3. **Add Bible**: Navigate to the Mini Alkitab tab in Projection, search for `Yohanes 3:16-17`, click `+ Playlist`. Verify the Bible card renders correctly with a snippet.
4. **Reorder**: Drag the Bible card above/below the song card and verify sorting state is preserved.
5. **CUE & Program**: Click the Bible card in rundown and verify it populates CUE slides. Double-click it or TAKE to verify it projects to Program.
6. **Export & Import**: Export the rundown to JSON. Delete the playlist, then import the JSON file. Verify both song and Bible items are restored.
