# Tasks — Song Instrument Backing Tracks Support

- [x] **Component 1: Main Process & Preload API**
  - [x] Add `.mp3`, `.wav`, `.m4a` to `MIME_TYPES` in `src/main/index.ts`
  - [x] Implement `file:scan-instruments` IPC handler in `src/main/ipc-handlers.ts`
  - [x] Implement `projection:instrument-control` relay in `src/main/ipc-handlers.ts`
  - [x] Implement `projection:instrument-timeupdate` relay in `src/main/ipc-handlers.ts`
  - [x] Expose `file.scanInstruments` & `projection.instrumentControl` in `src/preload/index.ts`
  - [x] Declare types for new APIs in `src/preload/index.d.ts`

- [x] **Component 2: Frontend Stores**
  - [x] Create Zustand store `src/renderer/src/store/useInstrumentStore.ts`
  - [x] Add state for projection-level instrument volume/mute in `src/renderer/src/store/useProjectionStore.ts`

- [x] **Component 3: UI Settings Screen**
  - [x] Create setting component `src/renderer/src/screens/settings/AudioSettings.tsx`
  - [x] Register `audio` section in `src/renderer/src/screens/SettingsScreen.tsx`

- [x] **Component 4: Operator & Projection Panel**
  - [x] Add fader slider & mute button for **"Instrumen"** in `LivePreviewPanel.tsx`
  - [x] Add `<audio>` element and control listener in `src/renderer/src/projection/ProjectionApp.tsx`
  - [x] Add instrument playback controller widget (with volume slider & local `<audio>`) in `src/renderer/src/screens/modes/ProjectionMode.tsx`

- [x] **Component 5: Verification**
  - [x] Run `npm run typecheck` to verify no compilation errors
