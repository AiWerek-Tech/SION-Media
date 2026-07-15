# Tasks - Local Media Panel & Playlist Integration

- [x] Main Process: Custom Protocol Registration (`local-media://`)
- [x] Main Process: SQLite Database adjustments (secure `deleteMediaAsset` & add `addMediaToPlaylist`)
- [x] Main Process: IPC Handlers registration (`db:add-media-to-playlist`)
- [x] Preload: Expose `addMedia` IPC method
- [x] Renderer: Update Playlist Store (`addMediaToPlaylist` action)
- [x] Renderer: Update Slide Engines (`generateSlidesForPlaylistItem` for type 'media')
- [x] Renderer: Create new UI component `LocalMediaPanel.tsx`
- [x] Renderer: Integrate `LocalMediaPanel` and new tab into `ProjectionMode.tsx`
- [x] Renderer: Update `PlaylistItemCard.tsx` style & icon for 'media' type
- [x] Verification: Build check, manual run, and walkthrough
