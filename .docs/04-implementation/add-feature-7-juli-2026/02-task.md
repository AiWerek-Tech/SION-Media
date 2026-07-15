# Tasks - PDF & Image Presentation Feature

## Phase 1: Foundation (✅ Completed previously)
- [x] Main Process: Extend `MediaAssetType` with `'pdf'`
- [x] Main Process: Update `normalizeMediaAssetType` for `.pdf`, `.gif`, `.mov`, `.mkv`
- [x] Main Process: Add `.pdf` to `MIME_TYPES` in protocol handler
- [x] Renderer: Extend `MediaAssetType` in `atmosphere/types.ts`
- [x] Renderer: Add `pdfPath?: string` to `SlideData` in `types.ts`
- [x] Renderer: Install `pdfjs-dist@4.10.38`

## Phase 2: PDF Import & Library (✅ Completed previously)
- [x] Renderer: Update `handleAddFiles` in `LocalMediaPanel.tsx` — support `.pdf`, `.ppt`, `.pptx`
- [x] Renderer: PPT/PPTX interception dialog with conversion instructions
- [x] Renderer: Add "PDF" tab filter in `LocalMediaPanel.tsx`

## Phase 3: PDF Page Expansion & Slide Engine (✅ Completed)
- [x] Create shared utility `src/renderer/src/utils/pdfUtils.ts`
- [x] Refactor `LocalMediaPanel.tsx` to import from shared `pdfUtils.ts`
- [x] Refactor `ProjectionMode.tsx` to import from shared `pdfUtils.ts`
- [x] Add `pdfPageCounts` cache + `fetchPdfPageCount` action to `usePlaylistStore`
- [x] Update `engine/slideEngine.ts` — expand PDF media items into per-page slides
- [x] Update `core/projection/slideEngine.ts` — same expansion logic
- [x] `handleProjectMedia` in `LocalMediaPanel.tsx` — async PDF page expansion
- [x] `handlePlaylistItemClick` in `ProjectionMode.tsx` — async PDF page expansion

## Phase 4: Canvas Rendering (✅ Completed)
- [x] Create `PdfSlideViewer.tsx` — renders PDF page to HTML5 canvas (offline, 1.5x resolution)
- [x] Integrate `PdfSlideViewer` into `PresentationCanvas.tsx` (animated + non-animated paths)
- [x] Suppress `AtmosphereRenderer` when PDF slide is active (CPU optimization)

## Phase 5: Verification (✅ Completed)
- [x] TypeScript compilation — `npm run typecheck` passes cleanly
