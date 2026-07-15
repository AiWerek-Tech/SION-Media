# Tasks — Pilar C: Smart Lyric-Audio Sync & Auto-Advancing (LRC Integration)

- [x] **Component 1: IPC Handlers & Preload API (Main Process)**
  - [x] Implement `file:read-lrc` IPC handler in `src/main/ipc-handlers.ts`
  - [x] Implement `file:write-lrc` IPC handler in `src/main/ipc-handlers.ts`
  - [x] Expose `file.readLrc` & `file.writeLrc` in `src/preload/index.ts`
  - [x] Declare types for the new APIs in `src/preload/index.d.ts`

- [x] **Component 2: LRC Utility Parser**
  - [x] Create `src/renderer/src/utils/lrcParser.ts` (parse, strip, detect timestamps)
  - [x] Write unit tests for LRC parser

- [x] **Component 3: Upgraded Slide Engine**
  - [x] Update `SlideData` type in `src/renderer/src/types.ts` to include `startTime` and `endTime`
  - [x] Update `generateSlides` in `src/renderer/src/core/projection/slideEngine.ts` to extract, map, and strip timestamps

- [x] **Component 4: Auto-Advancing & Smart Re-Sync Engine (Projector Mode)**
  - [x] Update `useInstrumentStore.ts` to include `autoAdvanceEnabled` and `activeLrcLines` states
  - [x] Update `InstrumentPlayerWidget` in `ProjectionMode.tsx` to load LRC, listen to `currentTime`, auto-advance slides, and support smart seek/re-sync on manual slide click
  - [x] Update `lyricsSections` memo in `ProjectionMode.tsx` to strip timestamps from operator helper panel view

- [x] **Component 5: Interactive LRC Editor & Sync Tool (Library Mode)**
  - [x] Update `LibraryLyricsViewer.tsx` to integrate backing track audio player
  - [x] Build interactive LRC Sync mode (click/tap line or press space/enter to stamp time tag)
  - [x] Implement Save LRC button (updates `lyrics_raw` in SQLite and writes `.lrc` file next to audio)

- [x] **Component 6: Verification**
  - [x] Run `npm run test` to verify parser tests pass
  - [x] Run `npm run typecheck` to verify compilation
