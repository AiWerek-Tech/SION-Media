# SION Media — Phase 3: UI Modernization System v1.0

## Enterprise UX Modernization & Runtime-Aware Interface Redesign

**Document Status:** Implementation-Ready UI Architecture  
**Phase:** Phase 3 — UI Modernization System  
**Depends On:** foundation-system-architecture-v1.md, phase2-functional-refactor-architecture-v1.md, phase2-part2-runtime-engine.md  
**Codebase:** Electron 39 / React 19 / Tailwind CSS v4 / Framer Motion / RuntimeCommandBus

---

# PART 1: GLOBAL ENTERPRISE UI LANGUAGE

## 1.1 Visual Identity

SION Media is a **live worship production platform**. Its visual identity must communicate:

- **Authority** — operators trust it with live services
- **Clarity** — zero ambiguity during high-pressure moments
- **Precision** — every pixel serves a function
- **Depth** — layered surfaces that feel physical, not flat

**Reference aesthetic:** Broadcast control room + Adobe Creative Cloud + ProPresenter + Linear.app

The interface must feel like it was built by a team that ships production software — not a side project. Every surface, every shadow, every transition must reinforce that this is mission-critical software.

---

## 1.2 Surface Hierarchy System

The application uses a 6-level surface system. Each level has a specific role and must not be used interchangeably.

```
Level 0 — Canvas (#0b0d14)
  The deepest background. Used only for the application shell.
  Never used for interactive elements.

Level 1 — Base (#11131c)
  Mode backgrounds. The "floor" of each workspace.
  Ambient gradients sit on this layer.

Level 2 — Surface (#161925)
  Cards, panels, table rows. The primary content layer.
  Most UI elements live here.

Level 3 — Elevated (#1d2133)
  Floating toolbars, dropdowns, popovers.
  Appears above surface-level content.

Level 4 — Floating (#252a40)
  Modals, command palette, overlays.
  Clearly above all workspace content.

Level 5 — Critical (#2e3352)
  Emergency dialogs, critical alerts.
  Highest application layer.
```

**Glassmorphism rule:** Surfaces at Level 3+ use `backdrop-filter: blur(20-28px)` with `rgba(17,19,28,0.72-0.92)` backgrounds. This creates depth without opacity loss.

---

## 1.3 Glow Hierarchy System

Glows communicate state, not decoration. Each glow color has a single semantic meaning.

```
Blue Glow  (rgba(59,130,246,0.18-0.25))
  → Brand primary: focus rings, active selections, hover states
  → Never used for status

Green Glow (rgba(52,199,89,0.3))
  → PREVIEW state, connected status, success
  → Used on preview monitor border when cued

Red Glow   (rgba(255,59,48,0.3))
  → LIVE/PROGRAM state, critical alerts, errors
  → Used on program monitor border when live

Amber Glow (rgba(245,158,11,0.25))
  → WARNING state, LIVE_DIRTY, pending changes
  → Used on dirty state indicators

Cyan Glow  (rgba(56,189,248,0.2))
  → NEXT state, queued content, info
  → Used on NEXT strip indicators
```

**Rule:** Never stack multiple glows on the same element. One element = one semantic glow.

---

## 1.4 Elevation System

```
Elevation 1 — Subtle depth (table rows, list items)
  shadow: 0 1px 2px rgba(0,0,0,0.12)

Elevation 2 — Cards, panels
  shadow: 0 2px 6px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.10)

Elevation 3 — Floating toolbars, dropdowns
  shadow: 0 4px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)

Elevation 4 — Modals, overlays
  shadow: 0 8px 24px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.14)

Elevation 5 — Critical dialogs, toasts
  shadow: 0 16px 48px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.18)
```

**Rule:** Elevation increases with z-index. A modal (z-1400) always has elevation-4 or higher.

---

## 1.5 Ambient Lighting System

Each mode has a unique ambient background that establishes spatial identity. These are purely decorative — `pointer-events: none`, `position: absolute`, `inset: 0`.

```
LIBRARY MODE:
  radial-gradient(circle at 20% -10%, rgba(59,130,246,0.12), transparent 38%)
  radial-gradient(circle at 80% -15%, rgba(139,92,246,0.08), transparent 32%)
  → Blue-violet top corners: calm, organized

PROJECTION MODE:
  radial-gradient(circle at 50% -20%, rgba(59,130,246,0.10), transparent 40%)
  radial-gradient(circle at 0% 50%, rgba(139,92,246,0.06), transparent 30%)
  → Centered blue top: focused, live
  → When LIVE: add rgba(255,59,48,0.04) ambient at bottom

MANAGEMENT MODE:
  radial-gradient(circle at 16% -12%, rgba(59,130,246,0.16), transparent 36%)
  radial-gradient(circle at 72% -18%, rgba(56,189,248,0.09), transparent 32%)
  → Dual blue: analytical, data-rich

SETTINGS:
  radial-gradient(circle at 30% -8%, rgba(139,92,246,0.10), transparent 34%)
  → Violet: configuration, system
```

---

## 1.6 Motion System

### 1.6.1 Runtime-Safe Animation Rules

**Critical rule:** Animations in Projection Mode must NEVER interfere with live output. The `PresentationCanvas` runs in a separate window — operator UI animations are safe. But:

- No animations that block the main thread > 16ms
- No animations on projection-critical controls (TAKE, BLACK, CLEAR buttons)
- Projection state changes (LIVE/BLACK/FREEZE/CLEAR) must be instantaneous from the operator's perspective

### 1.6.2 Animation Tiers

```
Tier 1 — Instant (0ms)
  Projection state button active states
  Keyboard shortcut feedback
  Live indicator pulse

Tier 2 — Fast (150ms, ease-out-expo)
  Button hover/active states
  Dropdown open/close
  Tab switches
  Badge state changes

Tier 3 — Normal (200ms, ease-out-expo)
  Card hover lift
  Panel expand/collapse
  Input focus ring
  Selection highlight

Tier 4 — Deliberate (300ms, ease-premium)
  Modal open/close
  Sidebar collapse
  Overlay appear/disappear
  Toast notification

Tier 5 — Page (400-500ms, ease-premium)
  Mode transitions (AnimatePresence)
  Overlay screen transitions
  Welcome/onboarding transitions
```

### 1.6.3 Projection-Safe Transitions

The `PresentationCanvas` uses its own transition system (dissolve, smooth-blur, slide, crossfade). These are controlled by `theme.transition_type` and `theme.transition_duration`. They are independent of the operator UI animation system.

**Rule:** Never use `framer-motion` in `PresentationCanvas` for anything other than slide content transitions. Background/atmosphere transitions are CSS-only.

---

## 1.7 Visual Hierarchy for Operators

During a live service, operators must be able to identify critical information in < 200ms. The visual hierarchy enforces this:

```
Priority 1 — LIVE STATE (always visible, always prominent)
  Location: Title bar status + Program monitor border
  Visual: Red glow, pulsing dot, "● LIVE" badge
  Size: Never smaller than 11px/800 weight

Priority 2 — CURRENT PROGRAM CONTENT
  Location: Program monitor (LivePreviewPanel)
  Visual: Red border, elevated shadow, "PROGRAM" label
  Size: Largest monitor in the layout

Priority 3 — NEXT CONTENT
  Location: Preview monitor + NEXT strip
  Visual: Green border, "PREVIEW" label, NEXT strip below
  Size: Equal to or slightly smaller than program

Priority 4 — PENDING CHANGES (LIVE_DIRTY)
  Location: Dirty bar below monitors
  Visual: Amber glow, AlertCircle icon, pulsing
  Size: Full-width bar, cannot be missed

Priority 5 — NAVIGATION CONTROLS
  Location: Transition column between monitors
  Visual: TAKE button (largest), transport controls below
  Size: TAKE button 56px height minimum

Priority 6 — PLAYLIST / RUNDOWN
  Location: Bottom workspace, center panel
  Visual: Active item has red left bar
  Size: Standard row height 52px

Priority 7 — SONG LIBRARY
  Location: Bottom workspace, left panel
  Visual: Standard list
  Size: Standard row height 44px
```

---

## 1.8 Projection-Safe Color System

Colors used in `PresentationCanvas` (the actual projection output) must meet different standards than operator UI colors:

```
Projection Text Colors:
  Primary:   #ffffff (pure white — maximum contrast)
  Secondary: rgba(255,255,255,0.85) (slightly dimmed)
  Metadata:  rgba(255,255,255,0.72) (key/tempo/time)

Projection Background Colors:
  Default:   #090b14 (near-black, not pure black — avoids projector artifacts)
  Safe dark: #0a0c16
  Safe black: #000000 (only for BLACK state)

Projection Contrast Rules:
  Minimum contrast ratio: 7:1 (WCAG AAA)
  Text shadow: always present (0 8px 34px rgba(0,0,0,0.88))
  Text shield: semi-transparent overlay behind text area
  Smart dimming: background dims when text is present

Safe Zone:
  5% margin on all sides (96px top/bottom, 192px left/right at 1920x1080)
  Text never renders outside safe zone
  Logo positioned within safe zone
```

---

# PART 2: TITLE BAR + NAVIGATION REDESIGN

## 2.1 Title Bar Layout Specification

The title bar is the application command center. It must communicate live state at a glance while providing fast access to all workflows. Height: 40px (Win32 titleBarOverlay).

```
REDESIGNED TITLE BAR:
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [◈ SION] │ File  Edit  View  Media  Presentation  Window  Help │ [◉ PROJECTION ▾] │            │
│  (32px)  │ (menu bar, 11px/700, letter-spacing 0.04em)         │ (mode switcher)  │            │
│                                                                                                 │
│                                    [● LIVE] [�� 2] [⏱ 00:00 ▶ ■ ↺] [14:32] │ [🌙][⚙][🔔] │─□✕│
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1.1 Left Zone — Identity + Menu

**Brand Mark:**

- 32×32px container, border-radius 8px
- Gradient: `linear-gradient(135deg, #3b82f6, #8b5cf6)`
- "◈" glyph or custom SVG logo, white, 16px
- Hover: subtle scale(1.05), 150ms

**Menu Bar:**

- Font: Inter 11px/700, letter-spacing 0.04em, uppercase
- Color: `text-secondary` (#94a3b8) default, `text-primary` on hover
- Active (open): `text-primary`, background `rgba(255,255,255,0.06)`, border-radius 6px
- Padding: 0 8px, height 28px
- No underlines, no borders — clean text-only triggers

### 2.1.2 Center Zone — Mode Switcher

**Mode Switcher Trigger:**

```
[◉ PROJECTION ▾]
 ↑ mode icon    ↑ chevron
```

- Height: 28px, padding: 0 10px, border-radius 8px
- Background: `rgba(255,255,255,0.04)`, border: `rgba(255,255,255,0.07)`
- Icon color: mode-specific (blue=PROJECTION, violet=LIBRARY, white=MANAGEMENT, amber=BROADCAST)
- Label: 12px/800, mode name
- Chevron: 12px, rotates 180° when open

**Mode Dropdown:**

- Width: 240px, border-radius 14px
- Background: `rgba(17,19,28,0.96)`, backdrop-blur: 28px
- Border: `rgba(255,255,255,0.08)`
- Shadow: elevation-4
- Each option: 44px height, icon + label + subtitle + active indicator
- Active mode: brand background, left accent bar

### 2.1.3 Right Zone — Status + Utilities + Controls

**Live State Badge (PROJECTION mode only):**

```
[● LIVE]  or  [○ CLEAR]  or  [❄ FREEZE]  or  [■ BLACK]
```

- LIVE: `rgba(255,59,48,0.15)` bg, `#ff3b30` text, pulsing dot, border `rgba(255,59,48,0.3)`
- CLEAR: `rgba(255,255,255,0.04)` bg, `text-muted` text
- FREEZE: `rgba(245,158,11,0.12)` bg, `#f59e0b` text
- BLACK: `rgba(0,0,0,0.4)` bg, `text-secondary` text
- Height: 24px, padding: 0 10px, border-radius: full

**Display Count:**

- `[🖥 2]` — monitor icon + count
- Clickable → opens Display Settings
- Color: `text-secondary`, hover: `text-primary`

**Service Timer:**

```
[⏱ 00:00:00 ▶]
```

- Font: Inter Mono 11px/800
- ▶ = start (green), ■ = stop (red), ↺ = reset (muted)
- Controls appear on hover (expand from timer display)
- When running: timer text turns green

**Clock:**

- `14:32:05` — Inter Mono 11px/700, `text-muted`

**Utility Buttons (16px icons, 28×28px touch target):**

- Theme: Moon/Sun/SunMoon — cycles dark/light/system
- Settings: Gear — opens SettingsScreen
- Notifications: Bell — opens NotificationPanel, badge count when unread

**Window Controls (non-Windows):**

- Minus / Square / X — 28×28px, standard macOS-style

---

## 2.2 Menu System Redesign

### 2.2.1 Dropdown Visual Specification

All menus share the same visual language:

```
Container:
  background: rgba(17,19,28,0.96)
  backdrop-filter: blur(28px)
  border: 1px solid rgba(255,255,255,0.08)
  border-radius: 12px
  box-shadow: elevation-4
  padding: 6px
  min-width: 220px

Item (default):
  height: 32px
  padding: 0 10px
  border-radius: 8px
  font: Inter 12px/700
  color: text-secondary
  display: flex, align-items: center, justify-content: space-between

Item (hover):
  background: rgba(255,255,255,0.06)
  color: text-primary

Item (active/checked):
  background: rgba(59,130,246,0.12)
  color: brand-primary

Separator:
  height: 1px
  background: rgba(255,255,255,0.06)
  margin: 4px 0

Shortcut label:
  font: Inter Mono 10px/700
  color: text-disabled
  margin-left: auto
  padding-left: 16px
```

### 2.2.2 Complete Menu Structure (Redesigned)

**File Menu:**

```
New Playlist...          Ctrl+N
Open Playlist...         Ctrl+O
Close Playlist
─────────────────────────────────
Import Songs...          Ctrl+I
Export Library...
─────────────────────────────────
Backup Database...
Restore from Backup...
─────────────────────────────────
Exit                     Alt+F4
```

**Edit Menu:**

```
Search Songs             Ctrl+F
Find in Lyrics           Ctrl+Shift+F
─────────────────────────────────
New Song...              Ctrl+Shift+N
Edit Selected Song       Ctrl+E
Delete Selected Song     Del
─────────────────────────────────
Preferences              Ctrl+,
```

**View Menu:**

```
Command Palette          Ctrl+P
Keyboard Shortcuts       ?
─────────────────────────────────
Library Mode             Ctrl+1
Projection Mode          Ctrl+2
Management Mode          Ctrl+3
Broadcast Mode           Ctrl+4
─────────────────────────────────
Focus Live Mode          Ctrl+Shift+L  [PROJECTION only]
Fullscreen Library       Ctrl+Shift+F  [LIBRARY only]
─────────────────────────────────
Runtime Inspector        Ctrl+Shift+I
Stage Display            Ctrl+Shift+S
Bible                    Ctrl+B
```

**Media Menu:**

```
Import Media Assets...
Open Media Library
─────────────────────────────────
New Collection...
Manage Collections...
─────────────────────────────────
Clear Media Cache
```

**Presentation Menu [PROJECTION only]:**

```
Go Live                  Space
Next Slide               →
Previous Slide           ←
─────────────────────────────────
Black Screen             B
Freeze Screen            F
Clear Screen             Esc
─────────────────────────────────
Next Song                Ctrl+→
Previous Song            Ctrl+←
─────────────────────────────────
Show Projector Window
Hide Projector Window
Show Stage Display
```

**Window Menu:**

```
Minimize                 Ctrl+M
Maximize / Restore
─────────────────────────────────
Projection Window → Show
Projection Window → Hide
Stage Display → Show
Stage Display → Hide
```

**Help Menu:**

```
Keyboard Shortcuts       ?
Quick Jump Guide
─────────────────────────────────
Runtime Inspector        Ctrl+Shift+I
IPC Health Monitor
─────────────────────────────────
About SION Media
```

---

## 2.3 Command Palette Redesign

The Command Palette is the power-user's primary navigation tool. It must be fast, searchable, and context-aware.

**Visual Specification:**

```
Position: centered, top-third of screen (top: 15vh)
Width: 560px
Max height: 480px
Background: rgba(17,19,28,0.96), backdrop-blur: 32px
Border: rgba(255,255,255,0.10)
Border-radius: 16px
Shadow: elevation-5 + glow-md
```

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│ [🔍] Search commands, songs, settings...          [Esc]  │  ← 52px search bar
├──────────────────────────────────────────────────────────┤
│ RECENT                                                   │  ← category header
│  [⚡] Take                              Space            │  ← result item
│  [■] Black Out                          B                │
├──────────────────────────────────────────────────────────┤
│ NAVIGATION                                               │
│  [→] Next Slide                         →                │
│  [←] Previous Slide                    ←                │
│  [🎯] Quick Jump                        Ctrl+G           │
├──────────────────────────────────────────────────────────┤
│ PROJECTION                                               │
│  [❄] Freeze Screen                      F                │
│  [✕] Clear Output                       Esc              │
└──────────────────────────────────────────────────────────┘
```

**Result Item:**

- Height: 40px, padding: 0 12px
- Icon: 16px, color: category-specific
- Label: 13px/700, text-primary
- Shortcut: Inter Mono 10px/700, text-disabled, right-aligned
- Hover: rgba(255,255,255,0.06) background
- Active: rgba(59,130,246,0.12) background, brand-primary text
- Dangerous commands: rose-400 icon, rose-400/10 hover

**Category Headers:**

- 10px/800, uppercase, letter-spacing 0.14em, text-muted
- Padding: 8px 12px 4px

---

# PART 2: TITLE BAR + NAVIGATION REDESIGN

## 2.1 Title Bar Layout Specification

The title bar is the application's command center. It must communicate live state at a glance while providing fast access to all workflows. Height: 40px (Win32 titleBarOverlay).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [◈ SION] │ File  Edit  View  Media  Presentation  Window  Help │ [◉ PROJECTION ▾] │             │
│          │                                                      │                  │             │
│ ←16px→   │ ←── menu bar (no-drag) ──────────────────────────→  │ ←mode switcher→  │             │
│                                                                                                  │
│                                    [● LIVE] [🖥 2] [⏱ 00:00 ▶ ■ ↺] [14:32] │ [🌙][⚙][🔔] │ ─ □ ✕ │
│                                    ←──── status (no-drag) ────────────────→  ←utilities→ ←ctrl→ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1.1 Title Bar Identity (Left)

```
[◈] SION Media

◈ icon: custom SVG, 18px, brand-primary color
    → Gradient fill: #3b82f6 → #8b5cf6
    → On hover: subtle glow pulse (150ms)
    → On click: nothing (brand mark only)

"SION Media" text:
    → Font: Poppins 13px/900
    → Color: text-primary
    → Letter-spacing: -0.01em
    → Separator: 1px vertical line, border-subtle, 16px height, mx-12px
```

### 2.1.2 Menu Bar (Left, after identity)

All menu triggers: Inter 12px/700, text-secondary, height 28px, padding 0 8px, radius 6px.

```
Active state:   bg-bg-elevated, text-primary
Hover state:    bg-white/[0.05], text-primary
Open state:     bg-brand-primary/10, text-brand-primary, border-brand-primary/20
```

**Keyboard access:** Alt+[underlined letter] opens menu. Underline shown only when Alt is held.

### 2.1.3 Mode Switcher (Center)

The mode switcher is the most prominent navigation element. It must be instantly readable.

```
┌─────────────────────────────────────────────────────┐
│  [◉ icon]  PROJECTION  [▾]                          │
│            Live Scene & Output                      │
└─────────────────────────────────────────────────────┘

Trigger button:
  Height: 30px
  Padding: 0 10px
  Border: 1px solid border-default
  Background: bg-bg-elevated
  Radius: 8px
  Gap between icon and label: 8px

Icon: 16px, mode-specific color
  PROJECTION: brand-primary (#3b82f6)
  LIBRARY:    brand-secondary (#8b5cf6)
  MANAGEMENT: text-secondary (#94a3b8)
  BROADCAST:  status-warning (#f59e0b)

Label: Poppins 12px/800, text-primary
Sub-label: Inter 10px/600, text-muted (hidden when bar is narrow)

Chevron: 12px, text-muted, rotates 180° when open

Dropdown (when open):
  Width: 240px
  Position: bottom-center of trigger
  Background: glass-bg-strong + backdrop-blur(24px)
  Border: border-default
  Radius: 12px
  Shadow: elevation-4
  Padding: 6px

  Each option:
    Height: 52px
    Padding: 0 12px
    Layout: [icon] [label + sub] [active indicator]
    Hover: bg-white/[0.05]
    Active: bg-brand-primary/10, left accent bar 3px brand-primary
```

### 2.1.4 Status Bar (Right)

Status indicators are read-only except where noted. They communicate live state.

```
[● LIVE / ○ CLEAR]
  → Clickable: toggles projection window show/hide
  → LIVE: red dot (animate-pulse), "LIVE" text, rose-400 color
  → CLEAR: dim dot, "CLEAR" text, text-muted color
  → BLACK: dark dot, "BLACK" text, text-disabled color
  → FREEZE: snowflake icon, "FREEZE" text, amber-400 color
  → Height: 24px, padding: 0 8px, radius: 6px
  → Border: 1px solid (color-matched at 20% opacity)

[🖥 N displays]
  → Clickable: opens Display Settings
  → Connected (N>1): cyan-400 icon, "N DISP" text
  → Disconnected (N=1): text-muted icon, "NO EXT" text
  → Height: 24px

[⏱ HH:MM:SS ▶ ■ ↺]
  → Timer display: Inter Mono 11px/800, text-primary
  → ▶ button: start (when stopped), 14px icon
  → ■ button: stop (when running), 14px icon
  → ↺ button: reset, 14px icon
  → All buttons: 20px touch target, text-muted, hover text-primary
  → Only shown in PROJECTION mode

[14:32:05]
  → Real-time clock: Inter Mono 11px/700, text-muted
  → Updates every second
  → Always visible

Separator between groups: 1px vertical, border-subtle, 14px height
```

### 2.1.5 Utility Buttons (Right, before window controls)

```
[🌙 Theme]
  → Cycles: dark → light → system
  → Icon changes: Moon (dark) / Sun (light) / SunMoon (system)
  → Tooltip: "Theme: Dark / Light / System"

[⚙ Settings]
  → Opens SettingsScreen overlay
  → Tooltip: "Settings (Ctrl+,)"

[🔔 Notifications]
  → Opens NotificationPanel (right drawer)
  → Badge: count of unread notifications (red dot, max "9+")
  → Tooltip: "Notifications"

All utility buttons:
  Size: 28×28px
  Radius: 6px
  Icon: 14px, text-muted
  Hover: bg-white/[0.06], text-primary
  Active: bg-brand-primary/10, brand-primary icon
```

---

## 2.2 Menu System Redesign

### 2.2.1 Dropdown Visual Specification

```
Dropdown container:
  Background: rgba(17,19,28,0.94) + backdrop-blur(24px)
  Border: 1px solid rgba(255,255,255,0.08)
  Border-radius: 10px
  Shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)
  Padding: 4px
  Min-width: 200px
  Max-width: 320px
  Animation: scale(0.97)+opacity(0) → scale(1)+opacity(1), 150ms ease-out-expo

Menu item:
  Height: 32px
  Padding: 0 10px
  Radius: 6px
  Layout: [icon 16px] [label flex-1] [shortcut]
  Font: Inter 12px/600, text-secondary
  Hover: bg-white/[0.06], text-primary
  Disabled: opacity 0.38, cursor not-allowed

Separator:
  Height: 1px
  Background: border-subtle
  Margin: 3px 6px

Shortcut:
  Inter Mono 10px/700, text-disabled
  Right-aligned
```

### 2.2.2 Complete Menu Structure

**File Menu:**

```
New Playlist...          Ctrl+N
Open Playlist...         Ctrl+O
Close Playlist
─────────────────────────────────
Import Songs...          Ctrl+I
Export Library...
─────────────────────────────────
Backup Database...
Restore from Backup...
─────────────────────────────────
Exit                     Alt+F4
```

**Edit Menu:**

```
Search Songs             Ctrl+F
Find in Lyrics           Ctrl+Shift+F
─────────────────────────────────
New Song...              Ctrl+Shift+N
Edit Selected Song       Ctrl+E
Delete Selected Song     Del
─────────────────────────────────
Preferences              Ctrl+,
```

**View Menu:**

```
Command Palette          Ctrl+P
Keyboard Shortcuts       ?
─────────────────────────────────
Library Mode             Ctrl+1
Projection Mode          Ctrl+2
Management Mode          Ctrl+3
Broadcast Mode           Ctrl+4
─────────────────────────────────
Focus Live Mode          Ctrl+Shift+L   [PROJECTION only]
Fullscreen Library       Ctrl+Shift+F   [LIBRARY only]
─────────────────────────────────
Runtime Inspector        Ctrl+Shift+I
Stage Display            Ctrl+Shift+S
Bible                    Ctrl+B
```

**Media Menu:**

```
Import Media Assets...
Open Media Library
─────────────────────────────────
New Collection...
Manage Collections...
─────────────────────────────────
Clear Media Cache
```

**Presentation Menu:** [PROJECTION mode only]

```
Go Live                  Space
Next Slide               →
Previous Slide           ←
─────────────────────────────────
Black Screen             B
Freeze Screen            F
Clear Screen             Esc
─────────────────────────────────
Next Song                Ctrl+→
Previous Song            Ctrl+←
─────────────────────────────────
Show Projector Window
Hide Projector Window
Show Stage Display
```

**Window Menu:**

```
Minimize                 Ctrl+M
Maximize / Restore
─────────────────────────────────
Projection Window → Show
Projection Window → Hide
Stage Display → Show
Stage Display → Hide
```

**Help Menu:**

```
Keyboard Shortcuts       ?
Quick Jump Guide
─────────────────────────────────
Runtime Inspector        Ctrl+Shift+I
IPC Health Monitor
─────────────────────────────────
About SION Media
```

---

## 2.3 Notification Panel

```
Panel type: Right drawer (slides in from right)
Width: 360px
Height: 100% (below title bar)
Z-index: z-[1300]
Background: glass-bg-strong + backdrop-blur(28px)
Border-left: 1px solid border-default
Shadow: -8px 0 32px rgba(0,0,0,0.3)
Animation: translateX(100%) → translateX(0), 300ms ease-premium

Header:
  Height: 52px
  Padding: 0 16px
  Title: "Notifications" Poppins 14px/800
  Actions: [Mark all read] [Clear all] [✕ Close]

Notification item:
  Padding: 12px 16px
  Border-bottom: 1px solid border-subtle
  Layout: [icon 32px] [content flex-1] [time]
  Hover: bg-white/[0.03]
  Unread: left border 3px brand-primary

  Types:
    info:    blue icon, bg-blue-500/5
    success: green icon, bg-emerald-500/5
    warning: amber icon, bg-amber-500/5
    error:   red icon, bg-rose-500/5

Empty state:
  Bell icon (48px, opacity 0.3)
  "Tidak ada notifikasi"
  "Notifikasi import, backup, dan sistem akan muncul di sini."
```

---

# PART 3: LIBRARY MODE REDESIGN

## 3.1 Library Mode Layout

The Library Mode is the primary content management workspace. Operators use it to browse songs, build playlists, and prepare for services. The redesign prioritizes speed and density.

```
LIBRARY MODE LAYOUT:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR (40px)                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│ ┌──────────────┬──────────────────────────────────────────────────────┬───────────────────┐ │
│ │              │  COMMAND BAR (52px)                                  │                   │ │
│ │  SIDEBAR     │  [Hymnal ▾] [🔍 Search... Ctrl+K] [Filter] [Sort ▾] │  RIGHT INSPECTOR  │ │
│ │  (240px)     ├──────────────────────────────────────────────────────┤  (320px)          │ │
│ │              │  OVERVIEW STATS (collapsible, 88px)                  │                   │ │
│ │  ─ Library   │  [Songs: 1,234] [Hymnals: 8] [Playlists: 12] [★ 45] │  [Detail Lagu]    │ │
│ │  ● All Songs ├──────────────────────────────────────────────────────┤  [Chord]          │ │
│ │  ○ Playlists │  BROWSER HEADER                                      │  [Notes]          │ │
│ │  ○ Favorites │  [Playlist | Number | Title]  [120/page ▾]  [⛶]     │                   │ │
│ │  ○ Recent    ├──────────────────────────────────────────────────────┤  [Artwork]        │ │
│ │              │                                                      │  [Title]          │ │
│ │  ─ Koleksi   │  SONG GRID / LIST / TILES                            │  [Metadata]       │ │
│ │  ○ Hymnals   │  (virtualized, context menu on right-click)          │  [Actions]        │ │
│ │  ○ Tags      │                                                      │                   │ │
│ │  ○ Collections│                                                     │  [Quick Actions]  │ │
│ │              │                                                      │                   │ │
│ │  ─ Latihan   │                                                      │                   │ │
│ │  ○ Practice  │                                                      │                   │ │
│ │  ○ Chords    │                                                      │                   │ │
│ │              │                                                      │                   │ │
│ │  ─ Studio    │                                                      │                   │ │
│ │  ○ Analytics │                                                      │                   │ │
│ │              │                                                      │                   │ │
│ │  [Operator]  │                                                      │                   │ │
│ │  [DB Status] │                                                      │                   │ │
│ └──────────────┴──────────────────────────────────────────────────────┴───────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Library Sidebar Redesign

```
Sidebar width: 240px (collapsible to 64px icon-only)
Background: bg-surface-1 (#11131c)
Border-right: 1px solid border-subtle
Padding: 0

Brand mark (top):
  Height: 52px
  Padding: 0 16px
  Layout: [icon 32px] [SION Media / Library v3.0]
  Icon: gradient bg, Music2 icon
  Title: Poppins 13px/800, text-primary
  Sub: Inter 10px/600, text-muted

Navigation groups:
  Group label: 10px/800, uppercase, letter-spacing 0.14em, text-disabled
  Padding: 16px 12px 4px

  Nav item:
    Height: 34px
    Padding: 0 10px
    Radius: 8px
    Margin: 1px 6px
    Layout: [icon 16px] [label flex-1] [count/badge]
    Font: Inter 12px/600, text-secondary
    Hover: bg-white/[0.05], text-primary
    Active: bg-brand-primary/10, text-brand-primary, left accent bar 2px

  Count badge:
    Height: 18px, padding: 0 6px, radius: full
    Background: bg-white/[0.06]
    Font: Inter 10px/800, text-muted

  "Coming Soon" badge:
    "Soon" text, 9px/800, text-disabled, italic

Sidebar footer:
  Border-top: 1px solid border-subtle
  Padding: 12px

  Operator card:
    Height: 40px
    Layout: [avatar 28px] [name + email] [chevron]
    Avatar: gradient bg, initial letter, 28px radius-full
    Name: 12px/700, text-primary
    Email: 10px/500, text-muted

  DB status:
    Height: 28px
    Layout: [dot] [Database] [Connected]
    Dot: 6px, emerald-400, animate-pulse when connected
    Font: 10px/700, text-muted
```

## 3.3 Library Command Bar Redesign

```
Height: 52px
Background: bg-surface-2 + border-bottom border-subtle
Padding: 0 16px
Layout: [mode pill] [hymnal selector] [search] [filter] [sort] [actions]

Mode pill:
  [Library Mode] — 10px/800, uppercase, brand-primary color
  Background: brand-primary/10, border: brand-primary/20
  Height: 22px, padding: 0 8px, radius: full

Hymnal selector:
  Custom dropdown, width: 160px
  Shows: hymnal name (truncated)
  "Semua Buku Lagu" when none selected
  Chevron: 12px

Search input:
  Width: flex-1, min-width: 240px
  Height: 36px
  Background: bg-surface-1
  Border: border-default
  Radius: 10px
  Placeholder: "Cari lagu, penulis, tema, nomor..."
  Left icon: Search 16px, text-muted
  Right: [Ctrl+K kbd] [✕ clear when value]
  Focus: border-brand, shadow: 0 0 0 3px rgba(59,130,246,0.1)

Filter button:
  Height: 36px, padding: 0 12px
  Shows active filter count badge when filters applied
  Dropdown: FilterDropdown component

Sort dropdown:
  Height: 36px, padding: 0 12px
  Options: Nomor / Judul / Terbaru

Action buttons (right):
  [Content] → setMode('MANAGEMENT')
  [Broadcast] → setMode('BROADCAST')
  [▶ Present] → setMode('PROJECTION') — primary button style
```

## 3.4 Song Views Redesign

### 3.4.1 Number View (Tile Grid)

```
Grid: auto-fill, minmax(72px, 1fr), gap: 6px
Padding: 16px

Number Tile:
  Size: 72×60px
  Background: bg-surface-2
  Border: 1px solid border-subtle
  Radius: 10px
  Hover: translateY(-1px), border-brand/20, bg-brand-primary/5
  Selected: bg-brand-primary/12, border-brand-primary/30, shadow-glow-sm

  Number: Poppins 18px/900, text-primary, centered
  Sub: Inter 9px/700, text-muted, uppercase
    → Shows: hymnal code OR "★" if favorite OR key note

Pagination bar:
  Height: 44px
  Background: bg-surface-1
  Border-top: border-subtle
  Layout: [count text] [page buttons] [per-page selector]
  Page buttons: 28×28px, radius: 6px
  Active page: bg-brand-primary, text-white
```

### 3.4.2 Title View (Card Grid)

```
Grid: auto-fill, minmax(180px, 1fr), gap: 12px
Padding: 16px

Song Card:
  Background: bg-surface-2
  Border: 1px solid border-subtle
  Radius: 14px
  Hover: translateY(-2px), border-brand/20, shadow-elevation-3
  Selected: border-brand-primary/30, bg-brand-primary/8

  Top section (artwork + favorite):
    Artwork: 100% width, 80px height
    Gradient: linear-gradient(145deg, rgba(37,99,235,0.96), rgba(124,58,237,0.84))
    Hymnal code: 9px/800, white/70, top-left
    Number: 22px/900, white, bottom-center
    Favorite button: 28×28px, top-right, star icon
      → Filled + amber-400 when favorite
      → Empty + text-muted when not

  Body:
    Padding: 10px 12px 8px
    Number: 10px/800, text-muted, uppercase
    Title: 13px/800, text-primary, 2-line clamp
    Subtitle: 11px/500, text-muted, 1-line clamp

  Meta row:
    Padding: 0 12px 8px
    Key: 10px/700, text-muted
    Tempo: 10px/700, text-muted
    Verses: 10px/700, text-muted
    Separator: "·"

  Actions:
    Padding: 8px 12px
    Border-top: border-subtle
    [▶ Buka] [+ Add to Playlist]
    Buka: ghost button, 28px height
    Add: icon-only button, 28×28px
```

### 3.4.3 Playlist View (Rundown)

```
Layout: full-width list
Background: bg-surface-1

Playlist hero:
  Height: 64px
  Padding: 0 16px
  Layout: [ListMusic icon 24px] [name + count]
  Name: Poppins 16px/800, text-primary
  Count: Inter 12px/500, text-muted

Rundown row:
  Height: 52px
  Padding: 0 16px
  Border-bottom: border-subtle
  Layout: [index 32px] [title + section flex-1] [duration]
  Hover: bg-white/[0.03]
  Selected: bg-brand-primary/8, border-left 3px brand-primary

  Index: Inter Mono 12px/800, text-muted, right-aligned
  Title: 13px/700, text-primary
  Section: 11px/500, text-muted
  Duration: Inter Mono 11px/600, text-muted

Empty state:
  ListMusic icon 48px, opacity 0.3
  "Belum ada playlist aktif"
  "Buat atau buka playlist untuk menyusun worship rundown."
  [+ Buat Playlist] button
```

## 3.5 Right Inspector Redesign

```
Width: 320px
Background: bg-surface-1 + radial-gradient(circle at 42% 0%, rgba(59,130,246,0.08), transparent 38%)
Border-left: 1px solid border-subtle

Panel tabs:
  Height: 40px
  Padding: 0 16px
  Tabs: [Detail Lagu] [Chord] [Notes]
  Active tab: text-primary, border-bottom 2px brand-primary
  Inactive: text-muted, hover text-secondary

Empty state:
  Music2 icon 40px, opacity 0.3
  "Pilih lagu"
  "Metadata, preview, dan aksi cepat akan tampil di inspector."

Song detail content:
  Padding: 16px

  Artwork (large):
    Width: 100%, height: 160px
    Gradient: blue→violet
    Hymnal code: 11px/800, white/70
    Number: 28px/900, white
    Music2 icon: 32px, white/30

  Title block:
    Margin-top: 12px
    Number: 10px/800, text-muted, uppercase
    Title: Poppins 18px/800, text-primary, line-clamp 2
    Subtitle: 12px/500, text-muted

  Primary actions:
    Grid: 2 columns, gap: 8px, margin-top: 12px
    [▶ Buka Lagu] — primary button
    [+ Tambah Playlist] — secondary button

  Metadata table:
    Margin-top: 12px
    Grid: 2 columns (label 100px, value flex-1)
    Row height: 28px
    Label: 11px/600, text-muted
    Value: 11px/700, text-secondary
    Rows: Buku Lagu, Kategori, Penulis, Komposer, Tema, Key, Tempo, Birama

  Quick actions:
    Grid: 2×2, gap: 8px, margin-top: 12px
    [★ Favorit] [✏ Edit Info] [♪ Chord] [⋯ More]
    Each: ghost button, 36px height, icon + label

Chord tab:
  Shows: key_note + time_signature + basic chord chart
  If no data: "Chord belum tersedia untuk lagu ini"

Notes tab:
  Textarea: full-width, min-height 200px
  Auto-saves to song_notes table (debounced 1000ms)
  Placeholder: "Tambahkan catatan untuk lagu ini..."
```

## 3.6 Context Menu (Right-Click on Song)

```
Trigger: right-click on any song card/tile/row
Position: cursor position (constrained to viewport)
Width: 220px

Items:
  [▶] Open Song (Lyrics Viewer)
  [+] Add to Active Playlist
  [+] Add to Playlist...          → submenu: playlist list
  ─────────────────────────────
  [✏] Edit Song Info
  [✏] Edit Lyrics
  ─────────────────────────────
  [★] Toggle Favorite
  [⎘] Copy Song Number
  [⎘] Copy Song Title
  ─────────────────────────────
  [↔] View Song Relations
  ─────────────────────────────
  [🗑] Delete Song...              → danger item, rose-400
```

---

# PART 3: LIBRARY MODE REDESIGN

## 3.1 Library Mode Layout

Library Mode is the content preparation workspace. Operators use it before services to browse songs, build playlists, and preview content. The layout must support high-density browsing with fast keyboard navigation.

```
LIBRARY MODE LAYOUT:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR (40px)                                                                             │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│ ┌──────────────────┬──────────────────────────────────────────────────┬───────────────────┐ │
│ │  SIDEBAR (240px) │  COMMAND BAR (52px)                              │  INSPECTOR (320px)│ │
│ │  flex-shrink-0   ├──────────────────────────────────────────────────┤  flex-shrink-0    │ │
│ │                  │  CONTENT AREA (flex-1, overflow-y-auto)          │                   │ │
│ │  [Brand Mark]    │                                                  │  [Song Detail]    │ │
│ │  ─ Library       │  [Overview Stats] (collapsible)                  │  [Chord]          │ │
│ │  ● All Songs     │  ─────────────────────────────────────────────── │  [Notes]          │ │
│ │  ○ Playlists     │  [Tab Bar: Playlist | Number | Title]            │                   │ │
│ │  ○ Favorites     │  ─────────────────────────────────────────────── │  [Artwork]        │ │
│ │  ○ Recent        │  [Song Grid / List / Tiles]                      │  [Metadata]       │ │
│ │  ─ Koleksi       │  (virtualized)                                   │  [Actions]        │ │
│ │  ○ Hymnals       │                                                  │                   │ │
│ │  ○ Tags          │                                                  │                   │ │
│ │  ─ Studio        │                                                  │                   │ │
│ │  ○ Analytics     │                                                  │                   │ │
│ │  [Operator]      │                                                  │                   │ │
│ └──────────────────┴──────────────────────────────────────────────────┴───────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Sidebar Redesign

```
Sidebar:
  Width: 240px (collapsed: 64px icon-only)
  Background: bg-surface-1 + left border border-subtle
  Padding: 12px 0

Brand Mark:
  Height: 52px
  Padding: 0 16px
  Layout: [32px icon] [SION Media / Library v3.0]
  Icon: gradient bg, Music2 icon
  Title: Poppins 13px/800, text-primary
  Sub: Inter 10px/600, text-muted

Navigation Groups:
  Group label: 10px/800, uppercase, letter-spacing 0.14em, text-disabled
  Padding: 16px 16px 4px

  Nav item:
    Height: 36px
    Padding: 0 12px
    Radius: 8px
    Margin: 0 8px
    Layout: [icon 16px] [label flex-1] [count/badge]
    Font: Inter 12px/600, text-secondary
    Hover: bg-white/[0.05], text-primary
    Active: bg-brand-primary/10, text-brand-primary, left bar 3px brand-primary
    Coming Soon: opacity 0.5, "Soon" badge (amber, 9px)

  Count badge:
    Height: 18px, padding: 0 6px, radius: full
    Background: bg-white/[0.06]
    Font: Inter 10px/800, text-muted

Sidebar Footer:
  Border-top: border-subtle
  Padding: 12px 16px

  Operator card:
    Layout: [avatar 28px] [name + email] [chevron]
    Avatar: gradient bg, initial letter, 28px radius-full
    Name: Inter 12px/700, text-primary
    Email: Inter 10px/500, text-muted

  DB Status:
    Layout: [dot] [label] [status]
    Dot: 6px, green when connected
    Font: Inter 10px/600, text-muted
```

## 3.3 Command Bar Redesign

```
Command Bar:
  Height: 52px
  Padding: 0 20px
  Background: bg-surface-1
  Border-bottom: border-subtle
  Layout: [mode pill] [search flex-1] [hymnal filter] [actions]

Mode Pill:
  [Library icon] "Library Mode"
  Height: 26px, padding: 0 10px, radius: full
  Background: brand-secondary/10, border: brand-secondary/20
  Font: Inter 11px/800, brand-secondary

Search Input:
  Height: 36px, min-width: 280px
  Background: bg-surface-0
  Border: border-default
  Radius: 10px
  Padding: 0 12px 0 36px (icon left)
  Font: Inter 13px/500, text-primary
  Placeholder: text-muted
  Focus: border-brand, shadow: 0 0 0 3px rgba(59,130,246,0.1)
  Right: [Ctrl+K kbd] [clear X button]

Hymnal Filter:
  Select dropdown, height: 36px
  Shows: "Semua Buku Lagu" or hymnal name
  Width: 180px max

Action Buttons (right):
  [Content] → setMode('MANAGEMENT')
  [Broadcast] → setMode('BROADCAST')
  [Present] → setMode('PROJECTION') — primary variant, blue
```

## 3.4 Overview Stats Redesign

```
Stats Grid:
  5 cards, auto-fill columns, gap: 10px
  Collapsible (toggle button in command bar)

Stat Card:
  Height: 72px
  Padding: 12px 16px
  Radius: 14px
  Background: bg-surface-2 + radial glow at top-right
  Border: border-subtle
  Hover: translateY(-2px), border-brand/15, shadow-elevation-3

  Layout:
    Top: [icon 28px gradient] [mini bars]
    Label: 10px/800, uppercase, text-muted
    Value: 20px/850, text-primary
    Meta: 11px/500, text-secondary

  Tones (icon gradient):
    Songs:    from-blue-400 to-cyan-300
    Hymnals:  from-violet-400 to-purple-300
    Playlists: from-emerald-400 to-teal-300
    Favorites: from-amber-400 to-orange-300
    Tags:     from-cyan-400 to-blue-300
```

## 3.5 Song Browser Redesign

### 3.5.1 Tab Bar

```
Tab Bar:
  Height: 40px
  Padding: 0 16px
  Border-bottom: border-subtle
  Layout: [tabs left] [filter button] [sort button] [fullscreen toggle]

Tabs: [Playlist | Number | Title]
  Segmented control style
  Active: bg-brand-primary/12, text-brand-primary, border-brand-primary/20
  Inactive: text-secondary, hover text-primary
  Height: 28px, padding: 0 12px, radius: 8px
```

### 3.5.2 Number View (Tile Grid)

```
Number Tile:
  Size: 72×56px
  Radius: 10px
  Background: bg-surface-2
  Border: 1px solid border-subtle
  Hover: translateY(-1px), border-brand/20, bg-brand-primary/5
  Selected: bg-brand-primary/12, border-brand-primary/30, shadow-glow-sm

  Content:
    Number: Poppins 18px/900, text-primary, centered
    Sub: Inter 9px/700, text-muted (hymnal code or "FAV")

Pagination:
  Height: 44px
  Border-top: border-subtle
  Layout: [count text] [page buttons] [per-page selector]
  Page button: 28×28px, radius: 6px
  Active page: bg-brand-primary, text-white
```

### 3.5.3 Title View (Card Grid)

```
Song Card:
  Width: auto (grid auto-fill, min 180px)
  Height: 200px
  Radius: 14px
  Background: bg-surface-2
  Border: 1px solid border-subtle
  Hover: translateY(-2px), shadow-elevation-3, border-brand/15

  Top section (artwork + favorite):
    Artwork: 100% width, 80px height
    Gradient: linear-gradient(145deg, rgba(37,99,235,0.96), rgba(124,58,237,0.84))
    Hymnal code: 10px/800, white/70, top-left
    Number: 22px/900, white, bottom-center
    Favorite button: top-right, 28×28px, star icon
      Active: amber-400 fill
      Hover: scale(1.1)

  Body:
    Number: 11px/800, text-muted
    Title: 13px/800, text-primary, 2-line clamp
    Subtitle: 11px/500, text-muted, 1-line clamp

  Meta row:
    Key / Tempo / Verse count
    Font: Inter 10px/700, text-disabled
    Separator: "·"

  Actions (appear on hover):
    [▶ Buka] [+ Add]
    Height: 28px, full-width, border-top: border-subtle
```

### 3.5.4 Playlist View

```
Playlist Hero:
  Height: 64px
  Padding: 0 16px
  Background: bg-surface-2
  Border-bottom: border-subtle
  Layout: [ListMusic icon 24px] [name + count] [actions]

Rundown Row:
  Height: 52px
  Padding: 0 16px
  Border-bottom: border-subtle
  Layout: [index 28px] [title + section] [duration] [drag handle]

  Index: Inter Mono 12px/800, text-muted, right-aligned
  Title: Inter 13px/700, text-primary
  Section: Inter 11px/500, text-muted
  Duration: Inter Mono 11px/700, text-disabled
  Drag handle: GripVertical icon, text-disabled, appears on hover

  Active (currently live): left bar 3px live-red, bg-live-red/5
  Hover: bg-white/[0.03]
  Selected: bg-brand-primary/8, border-brand-primary/15
```

## 3.6 Right Inspector Redesign

```
Inspector:
  Width: 320px
  Background: bg-surface-1 + radial glow top-center
  Border-left: border-subtle

Panel Tabs:
  Height: 40px
  Padding: 0 16px
  Border-bottom: border-subtle
  Tabs: [Detail Lagu | Chord | Notes]
  Active: text-primary, border-bottom 2px brand-primary
  Inactive: text-muted

Empty State:
  Music2 icon (40px, opacity 0.3)
  "Pilih lagu" (13px/600, text-muted)
  "Metadata dan aksi cepat akan tampil di sini." (11px, text-disabled)

Song Detail Tab:
  Artwork (large, 100% width, 160px height)
  Number + Title + Subtitle block
  Primary actions: [▶ Buka Lagu] [+ Tambah Playlist] — 2-column grid
  Metadata table: 2-column dl, label/value pairs
  Quick actions: [★ Favorit] [✏ Edit] [♪ Chord] [⋯ More] — 4-column grid

Chord Tab:
  Key display: large chord name (Poppins 32px/900)
  Time signature + Tempo
  Basic chord chart (future: full chord diagram)
  "Coming Soon" overlay for advanced features

Notes Tab:
  Textarea: full-height, bg-surface-0, border-subtle
  Font: Inter 13px/500, text-primary
  Placeholder: "Tambahkan catatan untuk lagu ini..."
  Auto-save indicator: "Tersimpan" / "Menyimpan..."
```

## 3.7 Context Menu (Right-Click on Song)

```
Context Menu:
  Background: glass-bg-strong + backdrop-blur(24px)
  Border: border-default
  Radius: 10px
  Shadow: elevation-4
  Padding: 4px
  Min-width: 200px

Items:
  Open Song (Lyrics Viewer)
  Add to Active Playlist
  Add to Playlist... → [submenu]
  ─────────────────────────────
  Edit Song Info
  Edit Lyrics
  ─────────────────────────────
  Toggle Favorite ★
  Copy Song Number
  Copy Song Title
  ─────────────────────────────
  View Song Relations
  ─────────────────────────────
  Delete Song...  [danger: rose-400]
```

---

# PART 4: PROJECTION MODE REDESIGN

## 4.1 Overview

Projection Mode is the most critical interface in SION Media. An operator runs a live worship service from this screen. Every design decision must serve one goal: **zero cognitive load during live operation**.

Design principles for Projection Mode:

- **Glanceable** — state is readable in < 200ms
- **Fail-safe** — critical controls are always reachable
- **Keyboard-first** — every action has a shortcut
- **Distraction-free** — no decorative elements compete with live content
- **Recovery-ready** — errors are visible and recoverable

---

## 4.2 Projection Mode Layout

```
PROJECTION MODE — FULL LAYOUT:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px) — live state badge, timer, display count                                   │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  OPERATOR TOOLBAR (48px)                                                                     │
│  [● LIVE] [○ BLACK] [❄ FREEZE] [✕ CLEAR] [🖼 LOGO]  │  [⚡ TAKE]  │  [Scene ▾] [⚙ Theme]   │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  BROADCAST COMMAND CENTER (flex-shrink-0, ~42% height)                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  [PREVIEW MONITOR]    [TRANSITION RACK]    [PROGRAM MONITOR]    [OUTPUT RACK]        │   │
│  │  16:9 thumbnail       TAKE / Auto / Cut    16:9 thumbnail       Timer / Audio        │   │
│  │  green border         transport controls   red border           scene presets        │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  [NEXT STRIP — cyan bar when content queued]                                                 │
│  [DIRTY BAR — amber bar when LIVE_DIRTY]                                                     │
│  [WARNING BAR — red bar when projector lost]                                                 │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  BOTTOM WORKSPACE (flex-1, min-h-0, resizable 3 panels)                                      │
│  ┌──────────────────┬──────────────────────────────────┬──────────────────────────────┐     │
│  │  SONG LIBRARY    │  PLAYLIST / RUNDOWN               │  SONG INFO / INSPECTOR       │     │
│  │  (25% default)   │  (40% default)                    │  (35% default)               │     │
│  │                  │                                   │                              │     │
│  │  [Hymnal ▾]      │  [Playlist ▾]  [+ New]           │  [Info] [Lirik] [Notes]      │     │
│  │  [🔍 Search]     │  ─────────────────────────────── │                              │     │
│  │  [All|Fav|Recent]│  01 ● Tuhan Yesus Kristus        │  [Song artwork]              │     │
│  │  ─────────────── │  02   Bersyukurlah                │  [Title + metadata]          │     │
│  │  Song list       │  03   Kau Setia                   │  [Actions]                   │     │
│  │  (virtualized)   │  04   Haleluya                    │  [Confidence monitor]        │     │
│  └──────────────────┴──────────────────────────────────┴──────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4.3 Operator Toolbar Redesign

The operator toolbar sits between the title bar and the broadcast command center. It provides one-click access to all projection states and scene controls.

```
OPERATOR TOOLBAR:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  [● LIVE]  [■ BLACK]  [❄ FREEZE]  [✕ CLEAR]  [🖼 LOGO]  │  [⚡ TAKE]  │  [Scene ▾]  [⚙]   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

Height: 48px
Background: bg-surface-1 + border-bottom border-subtle
Padding: 0 20px

State Buttons (left group):
  Each button: height 32px, padding 0 12px, radius 8px, font 12px/800
  Gap between: 4px
  Grouped in: bg-surface-0, border border-subtle, radius 10px, padding 4px

  [● LIVE]:
    Default: text-muted, bg-transparent
    Active (projectionState=LIVE): bg-live-red/15, text-live-red, border-live-red/30
    Shortcut: Space (TAKE)

  [■ BLACK]:
    Default: text-muted
    Active: bg-black/60, text-white, border-white/20
    Shortcut: B

  [❄ FREEZE]:
    Default: text-muted
    Active: bg-amber-500/15, text-amber-400, border-amber-400/30
    Shortcut: F

  [✕ CLEAR]:
    Default: text-muted
    Active: bg-white/5, text-text-secondary
    Shortcut: Esc

  [🖼 LOGO]:
    Default: text-muted
    Active: bg-cyan-500/15, text-cyan-400
    Shortcut: L

Separator: 1px vertical, border-subtle, 20px height

TAKE Button (center):
  Height: 36px, padding: 0 20px, radius: 10px
  Background: bg-brand-primary gradient (when cue ready)
  Background: bg-surface-2 (when no cue)
  Icon: Zap 16px
  Label: "TAKE" Poppins 13px/900
  Shortcut hint: "Space" badge
  Disabled: opacity 0.4, cursor not-allowed
  Active press: scale(0.97), 50ms

Separator: 1px vertical

Scene Selector (right):
  Dropdown trigger: height 32px, padding 0 12px, radius 8px
  Label: current scene name or "Scene"
  Chevron: 12px

Settings button: 28×28px icon button
```

---

## 4.4 Broadcast Command Center Redesign

This is the heart of Projection Mode. The `LivePreviewPanel` component. It shows the operator exactly what is in preview and what is live.

### 4.4.1 Monitor Frame Redesign

```
PREVIEW MONITOR:
┌─────────────────────────────────────────────────────────────────────────────┐
│  ● PREVIEW / CUE                    [Slide 3/8]  [⛶ Expand] [⚙ Settings]  │  ← header 36px
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │              [16:9 PresentationCanvas thumbnail]                    │   │
│  │              Aspect ratio: 16:9, fills available width              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [16:9] [1920×1080] [60 FPS]                                               │  ← meta bar 24px
└─────────────────────────────────────────────────────────────────────────────┘

Border: 2px solid rgba(52,199,89,0.4)  ← green when cued
Shadow: 0 0 20px rgba(52,199,89,0.15)  ← green glow
Background: bg-surface-0

PROGRAM MONITOR:
Border: 2px solid rgba(255,59,48,0.5)  ← red when LIVE
Shadow: 0 0 24px rgba(255,59,48,0.2)   ← red glow
Background: bg-surface-0

When CLEAR/no content:
  Border: 1px solid border-subtle
  Shadow: none
  Center: ScreenShare icon (48px, opacity 0.12) + "SION PRESENTER" text

Monitor Header:
  Height: 36px
  Padding: 0 12px
  Background: bg-surface-1
  Border-bottom: border-subtle
  Layout: [dot] [label] [state badge] [spacer] [status badges] [tools]

  Dot: 8px circle, color-matched to monitor state
  Label: Poppins 12px/900, uppercase, letter-spacing 0.16em
  State badge: "Slide N/M" or "LIVE N/M" — 10px/800, text-muted
  Status badges: Live Lock / Dirty / Projector Lost / Empty
  Tools: Expand + Settings — 24×24px icon buttons

Monitor Meta Bar:
  Height: 24px
  Padding: 0 10px
  Background: bg-surface-0
  Font: Inter Mono 10px/700, text-disabled
  Content: "16:9" · "1920×1080" · "60 FPS"
```

### 4.4.2 Transition Rack Redesign

```
TRANSITION RACK:
Width: 120px
Background: bg-surface-1
Border: border-subtle (left + right)
Padding: 12px 8px

Header:
  "Transition" — 10px/800, uppercase, text-muted
  Speed selector: native select, 28px height, full-width

TAKE Button:
  Height: 56px  ← largest element in the rack
  Width: 100%
  Background: gradient(brand-primary → brand-primary-dark) when cue ready
  Background: bg-surface-2 when no cue
  Border: 1px solid brand-primary/40 when ready
  Shadow: 0 8px 24px rgba(59,130,246,0.25) when ready
  Icon: Zap 24px, fill="currentColor"
  Label: "TAKE" Poppins 14px/900
  Radius: 12px
  Disabled: opacity 0.35

  Active press animation:
    scale(0.96), 50ms — instant feedback
    No delay, no easing — must feel instantaneous

Auto Button:
  Height: 32px
  Background: bg-surface-2
  Label: "Auto" + speed value
  Font: 11px/700

Transport Controls:
  3 buttons in a row: [⏮ Cue Prev] [❄ Freeze] [⏭ Live Next]
  Each: 32×32px, radius 8px, bg-surface-2
  Active (Freeze): amber-400 color

Cut Button:
  Height: 28px
  Background: bg-surface-0
  Label: "Cut" — 11px/800, text-muted
  Hover: text-primary
```

### 4.4.3 Output Rack Redesign

```
OUTPUT RACK:
Width: 180px
Background: bg-surface-1
Border-left: border-subtle
Padding: 12px

Header:
  "Output" — 10px/800, uppercase, text-muted
  Settings icon: 14px, text-muted

Service Timer:
  Label: "Timer" — 10px/800, uppercase, text-muted
  Display: Inter Mono 22px/900, text-primary
  Format: HH:MM:SS
  Controls: [▶ Start] [■ Stop] [↺ Reset] — 24px icon buttons
  Running state: timer text turns emerald-400

Scene Presets:
  Label: "Atmosphere" — 10px/800, uppercase, text-muted
  Preset buttons: compact pills, 24px height
  Active: brand-primary/15 bg, brand-primary text
  Clear button: "×" — text-muted

Projection Toggle:
  [🖥 Show / Hide Projector] — full-width button
  Active: emerald-400 color, "ON" badge
  Inactive: text-muted, "OFF" badge
```

---

## 4.5 Status Strips Redesign

Status strips appear below the broadcast command center. They communicate critical runtime states.

### 4.5.1 NEXT Strip

```
Condition: nextReadyState !== 'EMPTY'
Height: 32px
Background: rgba(56,189,248,0.08)
Border-top: 1px solid rgba(56,189,248,0.2)
Padding: 0 16px
Layout: [cyan dot] ["NEXT"] [content] [spacer] [Clear button]

Content:
  hasNextSlide: "Slide N/M · [section label]"
  hasNextSong: "[number] - [title]"
  BOTH_READY: both shown with separator

Font: Inter 11px/700, text-secondary
Dot: 6px, cyan-400, animate-pulse
Clear button: "×" — 20×20px, text-muted, hover text-primary
```

### 4.5.2 DIRTY Bar

```
Condition: programLockState === 'LIVE_DIRTY'
Height: 40px
Background: rgba(245,158,11,0.10)
Border-top: 1px solid rgba(245,158,11,0.25)
Padding: 0 16px
Layout: [⚠ icon] [message] [spacer] [Update Live] [Discard]

Icon: AlertCircle 16px, amber-400, animate-pulse
Message: "Perubahan tertunda. Terapkan ke output live?" — 12px/600, amber-300
Update Live button: bg-amber-500/20, text-amber-300, border-amber-400/30, 32px height
Discard button: ghost, text-muted, 32px height
```

### 4.5.3 Warning Bar (Projector Lost)

```
Condition: displayCount <= 1 && isProjectionVisible
Height: 32px
Background: rgba(255,59,48,0.08)
Border-top: 1px solid rgba(255,59,48,0.2)
Padding: 0 16px
Layout: [⚠ icon] [message]

Icon: AlertTriangle 14px, rose-400
Message: "Proyektor eksternal tidak terdeteksi. Menampilkan preview simulasi." — 11px/600, rose-300
```

---

## 4.6 Bottom Workspace Redesign

### 4.6.1 Song Library Panel

```
Panel header:
  Height: 44px
  Padding: 0 12px
  Background: bg-surface-1
  Border-bottom: border-subtle
  Layout: [Hymnal selector ▾] [spacer] [search icon]

Hymnal selector:
  Compact dropdown, 28px height
  Shows: hymnal code (e.g., "LS", "NKB")
  Hover: shows full name in tooltip

Search:
  Expands on click: icon → full input field
  Width: 0 → 180px, 200ms ease-out-expo
  Placeholder: "Cari lagu..."

Filter tabs:
  Height: 32px
  Padding: 0 12px
  Tabs: [All | ★ Fav | 🕐 Recent]
  Active: text-primary, border-bottom 2px brand-primary
  Font: 11px/700

Song list (virtualized):
  Row height: 44px
  Padding: 0 10px
  Layout: [artwork 32px] [number 36px] [title flex-1] [key badge]

  Artwork: 32×32px, radius 6px, gradient bg
  Number: Inter Mono 11px/700, text-muted, min-width 36px
  Title: 12px/600, text-primary, truncate
  Key badge: 20px pill, 10px/700, text-muted

  Hover: bg-white/[0.04]
  Selected: bg-brand-primary/10, left bar 2px brand-primary
  Double-click: load into preview
```

### 4.6.2 Playlist Panel

```
Panel header:
  Height: 44px
  Padding: 0 12px
  Background: bg-surface-1
  Border-bottom: border-subtle
  Layout: [Playlist selector ▾] [spacer] [+ New] [⋯ More]

Playlist selector:
  Compact dropdown, 28px height
  Shows: playlist name + service date

Rundown list:
  Row height: 52px
  Padding: 0 10px
  Layout: [index] [drag handle] [title + section] [duration] [actions]

  Index: Inter Mono 11px/700, text-disabled, min-width 24px
  Drag handle: GripVertical 14px, text-disabled, appears on hover
  Title: 13px/700, text-primary, truncate
  Section: 11px/500, text-muted
  Duration: Inter Mono 10px/700, text-disabled

  States:
    Default: transparent
    Hover: bg-white/[0.03]
    Active (currently live): left bar 3px live-red, bg-live-red/5, title text-primary
    Selected: bg-brand-primary/8

  Drag state:
    Dragging item: opacity 0.7, elevated shadow, scale(1.02)
    Drop target: dashed border cyan-400/40, bg-cyan-400/5

Footer:
  Height: 36px
  Padding: 0 12px
  Border-top: border-subtle
  Layout: [+ Add Song] [spacer] [N items]
  Font: 11px/700, text-muted
```

### 4.6.3 Song Info Panel

```
Panel tabs:
  Height: 40px
  Padding: 0 12px
  Border-bottom: border-subtle
  Tabs: [Info | Lirik | Notes]
  Active: text-primary, border-bottom 2px brand-primary

Info Tab:
  Song artwork: 64×64px, radius 10px, gradient
  Title: 16px/800, text-primary
  Subtitle: 12px/500, text-muted
  Metadata table: 2-col dl, 11px, label=text-muted, value=text-secondary
  Actions: [▶ Preview] [✏ Edit] [+ Playlist] — 3-col grid, 32px height

Lirik Tab:
  Scrollable lyrics text
  Font: Inter 12px/500, text-secondary, line-height 1.7
  Section labels: 10px/800, uppercase, text-muted, margin-top 12px
  Current slide highlight: bg-brand-primary/10, text-primary

Notes Tab:
  Textarea: full-height, bg-surface-0, border-subtle
  Font: Inter 13px/500, text-primary
  Auto-save: "Tersimpan" badge

Confidence Monitor (bottom of Info tab):
  Collapsible section
  Shows: current slide text (small), next slide text, timer
  For stage display awareness
```

---

## 4.7 Focus Live Mode

When `isFocusMode` is true, the bottom workspace collapses and the broadcast command center expands to fill the screen.

```
Focus Mode Layout:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px) — "FOCUS" badge visible                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  [Exit Focus] button — top-left, 28px height, ghost style                                    │
│                                                                                              │
│  BROADCAST COMMAND CENTER (fills remaining height)                                           │
│  Monitors are larger, transition rack is wider                                               │
│                                                                                              │
│  Status strips remain visible                                                                │
│                                                                                              │
│  Bottom workspace: HIDDEN (display: none)                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

Transition animation:
  Bottom workspace: height → 0, opacity → 0, 300ms ease-premium
  Command center: flex-1 → fills space, 300ms ease-premium
```

---

## 4.8 Quick Jump Overlay Redesign

```
Position: centered, top-third of screen
Width: 480px
Background: glass-bg-strong + backdrop-blur(28px)
Border: border-default
Radius: 16px
Shadow: elevation-5

Header:
  "Quick Jump" — Poppins 14px/800
  Mode indicator: "Preview" or "Live" badge
  Close: ✕ button

Input:
  Height: 48px
  Font: Inter 16px/600
  Placeholder: "Slide number, section name, or address..."
  Background: bg-surface-0
  Border-bottom: border-subtle

Results:
  Jump targets list
  Each: 40px height, [icon] [label] [slide index] [shortcut]
  Sections grouped: Slides / Sections / Special

Footer:
  Keyboard hints: "↑↓ navigate · Enter jump · Esc cancel"
  Font: 10px/700, text-disabled
```

---

# PART 5: MANAGEMENT MODE REDESIGN

## 5.1 Management Mode Layout

Management Mode is the content operations studio. It handles song CRUD, hymnal management, media library, and system administration. The layout must support high-density data work while remaining visually clean.

```
MANAGEMENT MODE LAYOUT:
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  TITLE BAR (40px)                                                                            │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  HEADER (54px, flex-shrink-0)                                                                │
│  [Layers3 icon] Worship Content Operations Studio                                            │
│  [h1] Dashboard    [+ Lagu Baru] [Import ▾] [Import JSON] [Export] [⋯] [Focus]              │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  METRIC GRID (82px, flex-shrink-0)                                                           │
│  [Total Lagu] [Buku Lagu] [Penulis] [Tema] [Total Lirik] [Memori]                           │
│                                                                                              │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  WORKSPACE GRID (flex-1, min-h-0)                                                            │
│  ┌──────────────────────────────────────────────────┬──────────────────────────────────────┐ │
│  │  LEFT: SONG BROWSER (flex-1)                     │  RIGHT: INSPECTOR (380px)            │ │
│  │  ┌─────────────────────────────────────────────┐ │                                      │ │
│  │  │  COMMAND BAR (52px)                         │ │  [Song artwork]                      │ │
│  │  │  [Status filter] [Hymnal ▾] [Filter] [Sort] │ │  [Title + badges]                    │ │
│  │  │  [Search input]  [Layout toggle]            │ │  [Actions]                           │ │
│  │  └─────────────────────────────────────────────┘ │  [Metadata]                          │ │
│  │  ┌─────────────────────────────────────────────┐ │  [Stats]                             │ │
│  │  │  COLUMN HEADERS                             │ │  [Quick actions]                     │ │
│  │  │  [✓] [#] [Title / Meta] [Status] [Atm] [⋯] │ │                                      │ │
│  │  └─────────────────────────────────────────────┘ │                                      │ │
│  │  ┌─────────────────────────────────────────────┐ │                                      │ │
│  │  │  SONG LIST (virtualized, flex-1)            │ │                                      │ │
│  │  └─────────────────────────────────────────────┘ │                                      │ │
│  │  ┌─────────────────────────────────────────────┐ │                                      │ │
│  │  │  FOOTER (40px): count + bulk actions        │ │                                      │ │
│  │  └─────────────────────────────────────────────┘ │                                      │ │
│  └──────────────────────────────────────────────────┴──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 Management Sidebar Navigation

Management Mode gains a left sidebar for section switching (replacing the current single-page layout).

```
Sidebar:
  Width: 220px
  Background: bg-surface-0
  Border-right: border-subtle

Navigation Groups:
  ─ Content
    ● Songs          (current section)
    ○ Hymnals
    ○ Media Library
    ○ Bible
    ○ Custom Slides
    ○ Playlists

  ─ System
    ○ Settings
    ○ Backup
    ○ Diagnostics
    ○ Analytics

  ─ About
    ○ About

Nav Item:
  Height: 36px
  Padding: 0 12px
  Radius: 8px
  Font: Inter 13px/600
  Icon: 16px, text-muted
  Active: bg-brand-primary/10, text-primary, icon brand-primary, left bar 3px
  Hover: bg-white/[0.04], text-primary

Section Label:
  Font: Inter 10px/800, uppercase, letter-spacing 0.14em, text-disabled
  Padding: 16px 12px 6px
```

---

## 5.3 Metric Cards Redesign

The 6 metric cards must show **real data** (not hardcoded). Each card is 82px tall.

```
Metric Card:
  Background: radial-gradient(circle at 80% 12%, [tone]/9%, transparent 34%)
              + linear-gradient(135deg, surface-2/76%, surface-0/82%)
  Border: border-subtle
  Radius: 16px
  Padding: 12px 14px
  Hover: translateY(-2px), border-brand/22, shadow-elevation-4

Layout:
  Top row: [Icon 30×30px] [Mini bars 7×]
  Label: 10px/800, uppercase, letter-spacing 0.13em, text-muted
  Value row: [Value 18px/850] [Trend pill]
  Meta: 12px, text-secondary

Icon container:
  30×30px, radius 12px, gradient background (tone-specific)
  Color: #07111f (dark text on gradient)

Mini bars:
  7 bars, each 6px wide, rounded-full
  Heights derived from real data (last 7 days activity)
  Color: gradient matching card tone

Trend pill:
  Border: border-subtle
  Background: white/3.5%
  Padding: 2px 7px
  Font: 10px/800, text-muted
  Radius: full

Tones (per metric):
  Total Lagu:    from-blue-400 to-cyan-300
  Buku Lagu:     from-violet-400 to-purple-300
  Penulis:       from-purple-400 to-fuchsia-300
  Tema:          from-orange-400 to-amber-300
  Total Lirik:   from-cyan-400 to-blue-300
  Memori:        from-emerald-400 to-teal-300
```

---

## 5.4 Song Browser Redesign

### 5.4.1 Command Bar

```
Command Bar:
  Height: 52px
  Padding: 0 12px
  Background: surface-2/62% + surface-0/76% gradient
  Border-bottom: border-subtle

Left group:
  Status segmented control: [Semua | Draft | Review | Diterbitkan]
  + New Hymnal button (FolderPlus icon)
  + Import button (Import icon)

Right group:
  Hymnal selector (max-width 210px)
  Filter button (Filter icon)
  Search input (270px, with clear button)
  Sort selector
  Layout toggle (Grid2X2 / List icon)
```

### 5.4.2 Column Headers

```
Column Headers:
  Height: 40px
  Padding: 0 20px
  Background: surface-0/45%
  Border-bottom: border-subtle
  Font: 10px/850, uppercase, letter-spacing 0.13em, text-muted

Columns:
  [38px]  Checkbox (select all)
  [56px]  Number
  [1.7fr] Title + alternate title + hymnal badge
  [0.85fr] Category / Author
  [126px] Status badge
  [108px] Atmosphere summary
  [104px] Actions (Edit, Preview, Delete)
```

### 5.4.3 Song Row (Virtualized)

```
Song Row:
  Height: 66px
  Padding: 12px 10px
  Border: 1px solid transparent
  Radius: 14px
  Cursor: default
  Transition: transform 160ms, border-color 160ms, background 160ms

  Default:   transparent border, text-secondary
  Hover:     translateY(-1px), border-white/7%, bg-white/3.4%, shadow-elevation-2
  Selected:  border-brand/24%, bg gradient (brand/18% → brand/6% → white/2%)
             left accent bar 3px brand-primary with glow

  Checkbox: 16px, appears on hover or when any row selected
  Number: 13px/800, text-primary, monospace
  Title: 14px/800, text-primary, truncate
  Alt title: 12px/500, text-muted, truncate
  Hymnal badge: 10px/700, bg-white/5%, border-white/8%, radius-full, padding 2px 7px
  Status badge: colored dot + label (see StatusBadge spec)
  Atmosphere: icon + label (Global / Preset / Asset)
  Actions: appear on hover — Edit (pencil), Preview (play), Delete (trash, danger)
```

### 5.4.4 Footer Bar

```
Footer:
  Height: 40px
  Padding: 0 20px
  Border-top: border-subtle
  Background: surface-0/45%
  Font: 12px, text-muted

Left: "Menampilkan N dari M lagu"
Right (when items selected):
  "N dipilih" + [Clear] + [Bulk Background] + [Bulk Delete (danger)]
```

---

## 5.5 Song Inspector Redesign

```
Inspector:
  Width: 380px
  Background: radial-gradient(circle at 42% 0%, brand/10%, transparent 38%)
              + linear-gradient(145deg, surface-2/78%, surface-0/90%)
  Border-left: border-subtle

Header:
  Height: 52px
  Padding: 0 18px
  Border-bottom: border-subtle
  Title: "Detail Lagu" 17px/850
  Subtitle: "N lagu dipilih" or song title

Body (scrollable):
  Padding: 16px

  Hero section:
    Grid: 146px artwork + flex-1 title block
    Artwork: 190px height, gradient bg (blue→violet), radius 18px
             Hymnal code + song number centered
    Title block:
      h3: 24px/850, text-primary
      p: 13px, text-secondary (alternate title)
      Badges: Status badge + Hymnal badge

  Actions (2-column grid, margin-top 18px):
    [✏ Edit Lirik] [▶ Preview]
    [ℹ Edit Info]  [🗑 Hapus]
    Primary action (Edit Lirik): brand-primary gradient

  Metadata section:
    Title: "METADATA" 10px/850, uppercase, letter-spacing 0.14em, text-muted
    dl grid: 116px label + flex-1 value
    Font: 12px, label=text-muted, value=text-secondary/84%

  Stats section (4-column grid):
    Bait / Baris / Kata / Karakter
    Each: border-subtle, radius 12px, bg-black/14%, padding 10px 6px, text-center
    Value: 17px/850, text-primary
    Label: 10px, text-muted

  Atmosphere section:
    Mode badge (Global / Preset / Asset)
    Detail text
    [Change Background] button

  Quick actions (2-column grid):
    [★ Favorit] [📋 Duplikat]
    [🔗 Relasi] [📤 Export]
```

---

## 5.6 Management Mode Sections

### 5.6.1 Hymnals Section

```
Layout: Full-width table (no inspector)
Columns: [Code] [Name] [Language] [Songs] [Official] [Actions]
Actions per row: Edit, Delete
Header actions: [+ New Hymnal] [Import] [Integrity Check]
Empty state: BookOpen icon, "Belum ada buku lagu"
```

### 5.6.2 Media Library Section

```
Layout: Toolbar + Grid/List view + Inspector
Toolbar: [Import Media] [Filter: All/Image/Video] [Search] [View toggle] [Sort]
Grid view: 180×135px thumbnails, 4-column grid
  Card: thumbnail + name + type badge + favorite star
  Hover: overlay with [Preview] [Edit] [Delete] actions
List view: table with thumbnail + name + type + category + usage + date + actions
Inspector: selected asset details + preview + metadata + collections
```

### 5.6.3 Diagnostics Section

```
Layout: 2-column grid
Left: IPC Health Monitor (from useHealthStore)
  Each endpoint: status dot + name + last seen + latency + reconnect count
Right: Runtime Inspector (from commandBus.getEventLog())
  Event log: timestamp + command + status + duration
  Filter: All / Success / Blocked / Error
Bottom: Memory usage + DB size (from system:get-storage-stats)
```

### 5.6.4 Analytics Section

```
Layout: Stats grid + Charts
Stats: Total plays (7d) / Most played song / Peak usage day / Active playlists
Chart: Bar chart of daily song plays (last 14 days)
Table: Top 10 most played songs
Data source: song_history table via db:get-recent-songs
```

---

## 5.7 Focus Workspace Mode

```
Focus toggle: [Maximize2 icon] "Focus" button in header actions

Focus mode hides:
  - Metric grid (display: none)
  - Header subtitle
  - Inspector collapses to 72px icon strip

Icon strip (72px):
  Vertical stack of quick-action icons
  Each: 40×40px, tooltip on hover
  [✏ Edit] [▶ Preview] [🗑 Delete] [🔗 Relasi] [★ Favorit]

Transition: 300ms ease-premium
```

---

# PART 6: MODAL ECOSYSTEM REDESIGN

## 6.1 Modal Base System

All modals inherit from a single base design. The base defines structure, animation, focus behavior, and keyboard handling. Individual modals extend it with specific content.

### 6.1.1 Base Modal Visual Specification

```
Backdrop:
  Background: rgba(0,0,0,0.55)
  Backdrop-filter: blur(4px)
  Z-index: z-[1300]
  Animation: opacity 0→1, 150ms

Modal Container:
  Background: rgba(17,19,28,0.96) + backdrop-blur(28px)
  Border: 1px solid rgba(255,255,255,0.09)
  Border-radius: 18px
  Shadow: 0 24px 64px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.25)
  Z-index: z-[1400]
  Animation: scale(0.96)+opacity(0) → scale(1)+opacity(1), 200ms ease-premium
  Exit: scale(0.96)+opacity(0), 150ms

Sizes:
  sm:   width 400px, max-height 80vh
  md:   width 520px, max-height 85vh
  lg:   width 640px, max-height 90vh
  xl:   width 800px, max-height 90vh
  full: width 90vw,  max-height 90vh
```

### 6.1.2 Modal Structure

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (56px, flex-shrink-0)                            │
│  [Icon 36px] [Title Poppins 16px/800] [✕ close 28px]    │
│  [Subtitle Inter 12px/500, text-muted]                   │
├──────────────────────────────────────────────────────────┤
│  BODY (flex-1, overflow-y-auto, padding 20px 24px)       │
│  Content area — scrollable                               │
│                                                          │
│  Loading overlay: spinner + dim (opacity 0.5)            │
│  Error banner: rose-500/10 bg, rose-400 text, AlertCircle│
├──────────────────────────────────────────────────────────┤
│  FOOTER (56px, flex-shrink-0, border-top border-subtle)  │
│  [Cancel ghost btn]              [Confirm primary btn]   │
│  Danger variant: confirm = danger (rose gradient)        │
└──────────────────────────────────────────────────────────┘

Header icon container:
  36×36px, border-radius 10px
  Background: gradient matching modal type
  info:    blue gradient
  danger:  rose gradient
  warning: amber gradient
  success: emerald gradient
```

### 6.1.3 Modal Interaction Rules

```
Focus trap:    Tab/Shift+Tab cycles within modal only
Escape:        Closes modal (cancel action) — except destructive modals
Backdrop click: Closes modal — except destructive modals
Enter:         Submits form (when primary button is focused or form is valid)
Loading state: All inputs + buttons disabled, spinner on primary button
Error state:   Error message below body, primary button re-enabled
```

---

## 6.2 CreatePlaylistDialog

```
Size: md (520px)
Type: form
Icon: ListMusic, blue gradient

Fields:
  Nama Playlist (required)
    Input: height 40px, placeholder "Ibadah Minggu, Natal 2025..."
    Validation: required, max 100 chars
    Error: "Nama playlist wajib diisi"

  Tanggal Ibadah (optional)
    Input type="date", height 40px
    Default: today's date
    Helper: "Digunakan untuk pengarsipan"

  Deskripsi (optional)
    Textarea: 3 rows, resize-none
    Placeholder: "Catatan singkat tentang ibadah ini..."
    Max: 500 chars

Footer:
  [Batal]  [Buat Playlist →]

Loading state:
  Primary button: spinner + "Membuat..."
  All inputs disabled

Success:
  Brief success state (checkmark, 400ms) → close
  showToast("Playlist berhasil dibuat", "success")
```

---

## 6.3 DeleteConfirmDialog

```
Size: sm (400px)
Type: destructive
Icon: AlertTriangle, rose gradient
Backdrop click: DISABLED

Content:
  Title: "Hapus [item name]?"
  Description: "Tindakan ini tidak dapat dibatalkan. [item] akan dihapus permanen."
  Item preview: song number + title in a surface-2 card

Footer:
  [Batal]  [Hapus →] (danger variant: rose gradient)

Loading state:
  Primary button: spinner + "Menghapus..."
  Cancel button disabled

Error state:
  Error message: "Gagal menghapus: [reason]"
  Both buttons re-enabled

Keyboard:
  Escape: cancel (resolve false)
  Enter: does NOT auto-confirm (requires explicit click — safety)
```

---

## 6.4 CrashRecoveryDialog

```
Size: md (520px)
Type: warning
Icon: AlertCircle, amber gradient
Backdrop click: DISABLED
Escape: DISABLED (must make explicit choice)

Content:
  Title: "Session Sebelumnya Tidak Ditutup"
  Description: "SION Media tidak ditutup dengan benar. Ingin memulihkan session terakhir?"

  Recovery details card (surface-2):
    [ListMusic icon] Playlist: [playlist name or "Unknown"]
    [Music2 icon]   Lagu: [song title or "Unknown"]
    [Hash icon]     Slide: [slide index + 1] dari [total]
    [Radio icon]    Status: [projectionState]

  Two clear options:
    [🔄 Pulihkan Session]  — primary, blue gradient
    [✕ Mulai Baru]         — ghost, text-secondary

Footer: no standard footer — actions are in body

Restore flow:
  Button shows spinner + "Memulihkan..."
  Loads playlist → song → slide → state
  On complete: close + showToast("Session dipulihkan", "success")
```

---

## 6.5 ImportProgressDialog

```
Size: lg (640px)
Type: info / progress
Icon: UploadCloud, blue gradient
Backdrop click: DISABLED during import, enabled after

States:

  LOADING state:
    Spinner (32px, brand-primary)
    "Mengimpor lagu..." Poppins 16px/800
    "Memproses [N] item..." Inter 12px, text-muted
    Progress bar: indeterminate, brand-primary

  COMPLETE state:
    Results grid (2×3):
      [Total]    [N] lagu diproses
      [Baru]     [N] lagu ditambahkan  (emerald)
      [Dilewati] [N] lagu dilewati     (text-muted)
      [Konflik]  [N] konflik           (amber)
      [Gagal]    [N] gagal             (rose)
      [Durasi]   [N]ms

    Error list (if errors > 0):
      Collapsible section "Lihat Error ([N])"
      Each error: index + message, monospace 11px
      Max 10 errors shown

  Footer (COMPLETE only):
    [Tutup & Muat Ulang]  — primary

  Footer (LOADING):
    No actions
```

---

## 6.6 SongRelationsModal

```
Size: lg (640px)
Type: data
Icon: Link2, blue gradient

Content:
  Current relations list:
    Each relation: [SongArtwork sm] [number - title] [relation type badge] [✕ remove]
    Relation types: translation / same_tune / same_text / medley / response
    Type badge: colored pill (blue/violet/cyan/amber/emerald)
    Remove: icon button, danger hover, confirm before delete

  Empty state:
    "Belum ada relasi" + Link2 icon

  Add relation section (bottom):
    Search input: "Cari lagu untuk dihubungkan..."
    Search results: dropdown list of matching songs
    Relation type selector: segmented control
    [+ Tambah Relasi] button

Footer:
  [Tutup]
```

---

## 6.7 SongEditorScreen (Overlay Redesign)

The Song Editor is a full-screen overlay, not a modal. It uses the `EditorShell` layout.

```
Top Bar (82px):
  Left:  [← Kembali] [Song title] [Save state pill]
  Center: [Broadcast rack: LIVE / PREVIEW / NEXT / TIMER status cells]
  Right: [Ghost: Simpan Draft] [Primary: Simpan ▾] [⋯ More]

  Save state pill:
    Saved:  emerald bg, "Tersimpan ✓"
    Dirty:  amber bg, "Belum disimpan"
    Saving: spinner + "Menyimpan..."
    Error:  rose bg, "Gagal disimpan"

  Broadcast rack (4 cells, 460px total):
    [● LIVE: song title]  [PREVIEW: slide N]  [NEXT: next song]  [⏱ timer]
    Each cell: 38px height, glass surface, status-colored border when active

Three-column workspace:
  Left (flex-[3]): Metadata form
  Center (flex-[5]): Lyrics editor
  Right (flex-[4]): Preview + Atmosphere

Metadata Form:
  Section headers: 10px/800 uppercase, text-muted, letter-spacing 0.14em
  Fields: Hymnal, Number, Title, Alt Title, EN Title, Category, Language,
          Author, Composer, Key, Time Sig, Tempo, Tags, Theme, Scripture
  All inputs: height 36px, radius 10px, bg-surface-0
  Hymnal: custom select with hymnal color indicator

Lyrics Editor:
  Toolbar: [Format helpers] [Auto-format] [Preview toggle] [Char count]
  Textarea: full-height, monospace 13px, bg-surface-0, border-subtle
  Section markers: [VERSE 1], [CHORUS] highlighted in amber
  Line numbers: optional, text-disabled
  Character count: bottom-right, text-muted

Preview Panel:
  PresentationCanvas (fit mode, 16:9 aspect ratio)
  Slide navigator: ← [N/total] →
  Atmosphere picker: compact preset buttons
```

---

## 6.8 ImportExportScreen (Overlay Redesign)

```
Layout: Full-screen overlay, slide from bottom

Header:
  [← Kembali] "Import / Export" [Poppins 20px/800]
  Subtitle: "Kelola data lagu, impor dari Excel atau JSON, ekspor library"

Tab bar:
  [Import Excel] [Import JSON] [Export Library]
  Active: brand-primary underline, text-primary
  Inactive: text-muted

Import Excel Tab:
  Drop zone: dashed border, 160px height, UploadCloud icon
    "Seret file Excel ke sini atau klik untuk memilih"
    Accepted: .xlsx only, max 10MB
    Hover: brand-primary border, bg-brand-primary/5
  Column mapping preview (after file selected)
  Import button → ImportProgressDialog

Import JSON Tab:
  Drop zone (same style)
  Conflict policy selector:
    [Skip] [Overwrite] [Append] — segmented control
  Dry run toggle: "Simulasi dulu (tanpa menyimpan)"
  Import button → ImportProgressDialog

Export Library Tab:
  Hymnal selector: which hymnal to export
  Format: JSON (only option for now)
  Include options: checkboxes (lyrics, metadata, relations)
  [Export Data] button → file save dialog
```

---

## 6.9 SettingsScreen (Overlay Redesign)

```
Layout: Full-screen overlay, slide from right

Header (64px):
  [← Kembali] "Pengaturan Sistem" [breadcrumb: Pengaturan / [Section]]

Body: sidebar (220px) + content (flex-1)

Sidebar:
  Search: "Cari pengaturan..." with Ctrl+K hint
  Nav groups:
    [Monitor] Display
    [BookOpen] Buku Lagu
    [SunMoon] Tampilan
    [Palette] Tema & Font
    [Image] Background
    [Keyboard] Keyboard
    [Database] Backup
    [Info] Tentang

  Active item: brand-primary left bar, bg-brand-primary/8, text-primary
  Inactive: text-secondary, hover bg-white/[0.04]

Content sections:

  Display Settings:
    Monitor list: each display as card (id, resolution, primary badge)
    Projection output selector: which display to use
    Stage display selector

  Hymnal Settings:
    Hymnal list: table with code, name, language, song count, official badge
    Actions: [+ Buku Lagu Baru] [Edit] [Delete]
    New hymnal: inline form or CreateHymnalDialog

  Appearance Settings:
    Theme mode: [Dark] [Light] [System] — segmented control
    UI density: [Standard] [Compact] — segmented control

  Theme & Font Settings:
    Font family: select (Inter, Poppins, custom)
    Font size: slider 32–120px
    Text color: color picker
    Text align: [Left] [Center] [Right]
    Text shadow: toggle
    Line spacing: slider

  Background Settings:
    Default atmosphere: AtmosphereConfig picker
    Background image/video: file picker
    Opacity: slider

  Keyboard Settings:
    Shortcut reference table (read-only)
    Grouped by category

  Backup Settings:
    Last backup: date + path
    [Buat Backup Sekarang] — primary
    [Restore dari Backup...] — ghost
    [Reset Database...] — danger
    Auto-backup: toggle + interval selector

  About Settings:
    App version, build date
    System info: OS, Electron, Node versions
    [Check for Updates] (future)
    [Open Log File] (future)
```

---

## 6.10 BiblePickerDialog

```
Size: xl (800px)
Type: picker
Icon: BookOpen, violet gradient

Layout: 3-column picker
  Left (180px): Translation selector
    List of available translations
    Each: code badge + name + language
    Active: brand-primary left bar

  Center (220px): Book + Chapter selector
    Book list: OT / NT grouped
    Chapter grid: number tiles (same style as Library number view)

  Right (flex-1): Verse selector + Preview
    Verse list: verse number + text preview
    Multi-select: click to select range
    Selected verses: highlighted brand-primary/15

Preview strip (bottom):
  Shows selected verse text as it will appear on projection
  PresentationCanvas (fit, 16:9, 200px height)

Footer:
  [Batal]  [Proyeksikan Ayat →]

Keyboard:
  Arrow keys: navigate books/chapters/verses
  Enter: confirm selection
  Escape: cancel
```

---

## 6.11 AnnouncementEditor

```
Size: lg (640px)
Type: form
Icon: Megaphone, amber gradient

Fields:
  Judul (required): text input
  Konten: textarea (4 rows)
  Tipe: [Pengumuman] [Liturgi] [Selamat Datang] [Persembahan] [Custom]
    Segmented control
  Background color: color picker
  Text color: color picker
  Font size: slider 24–96px
  Durasi tampil: number input (seconds)
  Aktif: toggle

Preview:
  PresentationCanvas (fit, 16:9, 180px height)
  Updates live as fields change

Footer:
  [Batal]  [Simpan Slide]
```

---

## 6.12 MediaImportDialog

```
Size: lg (640px)
Type: import
Icon: FolderOpen, blue gradient

Drop zone:
  "Seret file gambar atau video ke sini"
  Accepted: .jpg .jpeg .png .webp .gif .mp4 .webm
  Max: 50 files per import

File list (after selection):
  Each file: thumbnail (40px) + name + size + type badge
  Remove: ✕ button per file

Metadata (applied to all):
  Category: text input or select from existing
  Tags: tag input (comma-separated)

Footer:
  [Batal]  [Import [N] File →]

Progress (during import):
  Progress bar per file
  Overall: "N/M file diimpor"
```

---

## 6.13 BackupProgressDialog

```
Size: sm (400px)
Type: progress
Icon: Database, emerald gradient

States:
  CREATING:
    Spinner + "Membuat backup..."
    Path preview: "Menyimpan ke [path]"

  COMPLETE:
    Checkmark (emerald, 48px)
    "Backup berhasil dibuat"
    Path: monospace 11px, text-muted, copyable
    Size: "[N] MB"

  ERROR:
    AlertCircle (rose, 48px)
    "Backup gagal"
    Error message

Footer (COMPLETE/ERROR only):
  [Tutup]
```

---

## 6.14 IntegrityCheckDialog

```
Size: xl (800px)
Type: diagnostic
Icon: ShieldCheck, blue gradient

Content:
  Summary row: [Total Hymnals] [Total Songs] [Orphan Songs] [Duplicates]
  Each hymnal: expandable row
    Hymnal name + code + song count
    Duplicate numbers: list with samples
    Duplicate titles: list with samples
    Status: ✓ Clean / ⚠ Issues

  Actions per issue:
    Duplicate number: [View Songs] [Merge] [Delete One]
    Orphan song: [Assign Hymnal] [Delete]

Footer:
  [Tutup]  [Export Report]
```
