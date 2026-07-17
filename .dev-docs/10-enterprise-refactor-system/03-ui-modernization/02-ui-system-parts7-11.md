# UI Modernization System (Parts 7-11) — Canonical Reference

> **This file is a canonical reference pointer.**  
> The actual content lives in: `.dev-docs/05-guides/phase3-part2-ui-parts7-11.md`  
> Authority Level: **Level 2**  
> Size: 81.4 KB | 2,664 lines | 5 Parts

---

## How to Access This Document

```
.dev-docs/05-guides/phase3-part2-ui-parts7-11.md
```

---

## Document Contents

| Part    | Title                          | Key Information                                                                                                                                                                                                                                                               |
| ------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Part 7  | Overlay + Floating UI Redesign | Announcement overlay, Bible verse overlay, lower third overlay, timer overlay, emergency overlay, z-index hierarchy, visibility rules, animation safety                                                                                                                       |
| Part 8  | Projection Visual System       | Typography system (86px/weight 560), worship lyric layout, scripture display, all 4 transition types, atmosphere layering (5 layers), all 6 scene preset visual identities, lower third system, stage display visual system, readability rules, projector artifact prevention |
| Part 9  | Workflow UX Modernization      | Song presentation flow (optimized), scripture projection flow, media presentation flow, playlist building flow, backup/restore flow, crash recovery flow, import/export flow, emergency presentation flow, workflow acceleration strategies                                   |
| Part 10 | Page-by-Page Redesign Registry | All 11 pages (SplashScreen through StageDisplayApp), 4 overlays (CommandPalette, QuickJumpOverlay, RuntimeInspector, KeyboardCheatSheet), 3 floating panels, all subpages                                                                                                     |
| Part 11 | Design-to-Engineering Handoff  | Implementation strategy, component migration order, runtime-safe rollout, component dependency tree, interaction mapping (3 key flows), modal mapping table (17 modals), state dependency mapping, CSS architecture, new file list                                            |

---

## Critical Data in This Document

### Projection Typography (Part 8.1)

Exact font size (86px), weight (560), line height (1.25), text shadow, and safe zone (118px/190px padding). Reference when modifying `PresentationCanvas.tsx`.

### Scene Preset Visual Identities (Part 8.4.1)

Exact gradient stops and motion configs for all 6 presets (Worship, Prayer, Sermon, Announcement, Communion, Baptism). Reference when implementing scene preset UI.

### Stage Display Typography (Part 8.6.2)

Typography scale for 3-8m readability. Reference when redesigning `StageDisplayApp.tsx`.

### Operator Workflow Specifications (Part 9)

Complete step-by-step workflows for all operator scenarios. Reference when implementing workflow improvements.

### Component Dependency Tree (Part 11.3.1)

Full dependency tree from App.tsx to every store and IPC call. Reference when planning any component change.

### Interaction Mapping (Part 11.3.2)

Exact data flow for: favorite toggle, create playlist, TAKE (Space key). Reference when implementing these features.

### Modal Mapping Table (Part 11.3.3)

All 17 modals mapped to components, triggers, and backend. Reference when implementing modal system.

### State Dependency Mapping (Part 11.3.4)

Which stores each major component subscribes to. Reference when optimizing store subscriptions.

---

## When This Document Changes

Update this document when:

- A workflow is redesigned based on operator feedback
- A new page is added to the registry
- The projection visual system changes (typography, atmosphere)
- The component dependency tree changes significantly
