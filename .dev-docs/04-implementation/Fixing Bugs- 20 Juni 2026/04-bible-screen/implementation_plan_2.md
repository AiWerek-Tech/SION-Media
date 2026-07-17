# Implementation Plan — Mini-Bible Projection Panel Overhaul

This plan details the complete overhaul of the mini-bible panel (`BiblePanel.tsx`) in the Projection Screen (bottom-right section). It transforms it into a highly interactive, smart search-and-browse module that queries the external SQLite Bible packs registry and provides real-time scripture previews.

---

## User Review Required

> [!IMPORTANT]
> The new design completely replaces the old internal SION sqlite `bible` API with the new `biblePack` (external SQLite packs) API. This ensures the mini-panel and the main Bible screen share the same registry, installed translations (like TB), book aliasing, and FTS5 search index.
>
> **Interactive Quick Features**:
>
> - **Unified Search/Ref Bar**: Typing a reference like `Yohanes 3:16` or `Mzm 23:1-3` triggers real-time parsing. If valid, it immediately renders an interactive **Spotlight Preview Card** showing the scripture text with quick action buttons.
> - **Double-Action Projection**: Offers **"Kirim Preview"** (sets to Preview/CUE) and **"Kirim Live"** (immediately sets slides and takes them live to Program).

---

## Proposed Changes

### Component Overhaul

#### [MODIFY] [BiblePanel.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/components/projection/BiblePanel.tsx)

We will redesign the UI, UX, and backend integration of `BiblePanel.tsx`:

1. **API Migration**:
   - Replace calls to `window.api.bible` with `window.api.biblePack`.
   - Retrieve all installed versions, active books, and verses dynamically.

2. **Unified Search & Smart Reference Parser**:
   - Render a glowing primary search input at the top.
   - As the user types, invoke `window.api.biblePack.parseReference` in real-time.
   - If a valid reference is detected, display a **Spotlight Preview Card** showing the parsed verses.
   - Provide direct projection buttons on the spotlight card for instantaneous interaction.
   - If the search query is a keyword, trigger `window.api.biblePack.search` and show matching lines with high-performance scrolling.

3. **Sleek Browse Navigation**:
   - When the search bar is empty, display a compact directory:
     - **Book Grid**: A compact layout of book short names grouped by Perjanjian Lama / Perjanjian Baru.
     - **Chapter Grid**: A grid of number pills to choose a chapter with a single tap.
     - **Verse Selector**: A list of verses where users can hover, click, select ranges, and preview before sending.
   - Add a compact header breadcrumb to easily step back (e.g. `Alkitab > Yohanes > Pasal 3`).

4. **Recent Verses History**:
   - Maintain a list of recently projected references. Clicking any history row automatically populates the preview spotlight for immediate re-projections.

5. **Worship-Center Dark Aesthetics**:
   - Apply styling utilizing transparent backdrops (`bg-white/[0.02]`), micro-borders (`border-white/[0.05]`), smooth animations via `framer-motion`, and custom scrollbars to match the premium dark presentation workspace.

---

## Verification Plan

### Automated Tests

- Run compilation check:
  ```powershell
  npx tsc --noEmit
  ```
- Run bundler check:
  ```powershell
  npm run build
  ```

### Manual Verification

1. Open the **Projection Mode** (bottom-right panel).
2. Select the **Alkitab** tab.
3. Verify the versions dropdown displays available external Bible packs (e.g. `TB`).
4. Type `"Mzm 23:1-3"` in the search input and verify that the **Spotlight Preview Card** appears immediately with the correct verse texts.
5. Click **Kirim Preview** and check if it populates the Preview (CUE) slide.
6. Click **Kirim Live** and check if it immediately projects to Program (Live).
7. Clear the search bar and navigate through the Book -> Chapter -> Verse grid, verifying browse mode transitions smoothly.
