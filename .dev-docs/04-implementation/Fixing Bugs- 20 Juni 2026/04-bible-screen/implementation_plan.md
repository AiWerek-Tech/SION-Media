# Implementation Plan — Bible Screen UI/UX Redesign

This plan outlines the redesign of the Bible Screen (View > Bible) to bring it into alignment with the modern, premium design system (SION Media V3) used in Library and Management modes.

---

## Proposed Changes

### Component Redesign

#### [MODIFY] [BibleScreen.tsx](file:///d:/my_dev/SION-Media/sion-media-desktop/src/renderer/src/screens/BibleScreen.tsx)

We will rewrite `BibleScreen.tsx` to utilize our design tokens and structural patterns:

1. **Enterprise Page Shell**:
   - Wrap the layout inside a `.management-studio` container to benefit from the premium background overlays, radial light gradients, and page padding.
   - Use a glassy header bar `.management-studio__header` featuring custom icons and high-contrast typography.

2. **Translation & Book/Chapter Navigation**:
   - Replace standard HTML select menus with custom components.
   - Introduce a **Custom Chapter Picker Grid**: Clicking the active book/chapter title opens a beautiful popover grid overlay showing all chapter numbers (e.g. 1 to 50 for Genesis). This lets users switch chapters in a single click without opening a long dropdown menu.
   - Use custom select styling or styled buttons for the Translation selector.

3. **Sidebar Search & Filtering**:
   - Add a book search filter input at the top of the sidebar. As the user types (e.g., "Yoh" or "Kej"), the book list instantly filters to matching books.
   - Separate Old Testament (Perjanjian Lama) and New Testament (Perjanjian Baru) with elegant badges and thin glass headers.
   - Style individual book buttons with subtle hover scales and glowing left accent borders for the active selection.

4. **Readable Typography Grid**:
   - Increase paragraph spacing and text height.
   - Highlight verse numbers in active colors (e.g. `text-brand-primary`).
   - Add smooth transitions on verse hover (`hover:bg-bg-elevated-hover hover:scale-[1.01]`).
   - Enable **Double-Click to Project**: Double-clicking a verse projects it immediately, while single-clicking selects a range.

5. **Floating Action Bar (Selection)**:
   - When verses are selected, animate a floating action panel from the bottom using a glassmorphic background (`backdrop-blur-md bg-glass-bg border-glass-border`).
   - Feature clear reference indicators (e.g. `"Yohanes 3:16-17"`) and high-impact action buttons (like a glowing "Proyeksikan" blue gradient button and a clean outline "Batal" button).

6. **Search & Reference Cards**:
   - Format search results into beautiful, hovered cards displaying translation markers.
   - Highlight matched query keywords with `<mark>` tags styled in custom amber/accent colors.
   - If a valid reference is parsed (e.g. `"Yoh 3:16"`), render a premium spotlight card at the top with navigation shortcuts.

---

## Verification Plan

### Automated Tests

- Run TypeScript typecheck to verify there are no compilation errors:
  ```bash
  npm run typecheck
  ```
- Build the final production bundles to confirm webpack/vite compiles successfully:
  ```bash
  npm run build
  ```

### Manual Verification

1. Open **View > Bible** in the app.
2. Verify the shell background, glow effects, header bar, and translation selector look premium.
3. Type `"Yoh"` in the sidebar book search input, verify the list filters to `"Yohanes"`, `"1 Yohanes"`, etc.
4. Click the active book/chapter title to open the **Chapter Picker Grid**, verify you can select chapters instantly from the grid.
5. Click to select a verse range, verify the **Floating Action Bar** animates up and shows correct counts.
6. Click **Proyeksikan** or double-click a verse, check if it projects correctly on the program canvas.
7. Perform a keyword search (e.g. `"kasih"`), verify the matched results appear in clean cards with highlighted text snippets.
