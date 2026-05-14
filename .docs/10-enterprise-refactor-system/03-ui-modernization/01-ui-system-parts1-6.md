# UI Modernization System (Parts 1-6) — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.docs/05-guides/phase3-ui-modernization-system-v1.md`  
> Authority Level: **Level 2**  
> Size: 102.2 KB | 2,938 lines | 6 Parts

---

## How to Access This Document

```
.docs/05-guides/phase3-ui-modernization-system-v1.md
```

---

## Document Contents

| Part   | Title                           | Key Information                                                                                                                                                                                                                                            |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 1 | Global Enterprise UI Language   | Surface hierarchy (6 levels), glow hierarchy (5 semantic glows), elevation system, ambient lighting per mode, motion system (5 tiers), visual hierarchy for operators (7 priorities), projection-safe color system                                         |
| Part 2 | Title Bar + Navigation Redesign | Complete title bar layout spec, left/center/right zone specs, redesigned menu structure (7 menus with all items), notification panel spec, command palette redesign                                                                                        |
| Part 3 | Library Mode Redesign           | Sidebar navigation, command bar, overview stats, browser panel (3 view modes), right inspector (3 tabs), context menu spec, keyboard shortcuts                                                                                                             |
| Part 4 | Projection Mode Redesign        | Broadcast command center layout, monitor frame spec, transition column spec, audio output panel, scene strip, NEXT strip, dirty bar, focus mode layout, Quick Jump overlay redesign                                                                        |
| Part 5 | Management Mode Redesign        | Dashboard layout, metric cards (real data), song browser (virtualized), song inspector, sidebar navigation (11 sections), diagnostics section, analytics section, focus workspace mode                                                                     |
| Part 6 | Modal Ecosystem Redesign        | Modal base spec, 14 modal specifications (CreatePlaylist, DeleteConfirm, SongEditor, ImportExport, BackupRestore, ProjectionSetup, ThemeEditor, ShortcutEditor, MediaPicker, CrashRecovery, Diagnostics, AdvancedSettings, BackupProgress, IntegrityCheck) |

---

## Critical Data in This Document

### Visual Hierarchy for Operators (Part 1.7)

7-priority visual hierarchy for live service operation. Reference when designing any projection-mode UI element.

### Projection-Safe Color System (Part 1.8)

Colors for `PresentationCanvas` output. Reference when modifying projection output rendering.

### Complete Menu Structure (Part 2.2.2)

All 7 menus with every item, shortcut, and action. Reference when implementing `TitleBarMenu.tsx`.

### Library Mode Layout (Part 3)

Exact dimensions, CSS class names, and interaction specs for Library Mode. Reference when implementing Library Mode improvements (Phase 6).

### Projection Mode Broadcast Command Center (Part 4)

The redesigned LivePreviewPanel layout. Reference when implementing Projection Mode improvements (Phase 7).

### Management Mode Sections (Part 5)

All 11 management sections with content specs. Reference when implementing Management Mode improvements (Phase 8).

### Modal Specifications (Part 6)

Size, type, fields, validation, and behavior for each modal. Reference when implementing modal components (Phase 3).

---

## When This Document Changes

Update this document when:

- A UI specification is revised based on operator feedback
- A new modal is added to the ecosystem
- A mode layout changes significantly
- Design tokens change (update Part 1 references)
