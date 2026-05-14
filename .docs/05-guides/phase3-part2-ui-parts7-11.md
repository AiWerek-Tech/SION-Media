# SION Media — Phase 3: UI Modernization System (Parts 7-11)

## Continuation of phase3-ui-modernization-system-v1.md

**Depends on:** Parts 1-6 in phase3-ui-modernization-system-v1.md  
**Codebase:** AtmosphereRenderer / StageDisplayApp / SongEditorScreen / ImportExportScreen

---

# PART 7: OVERLAY + FLOATING UI REDESIGN

## 7.1 Overlay System Architecture

Overlays in SION Media operate in two distinct contexts:

**Operator UI Overlays** — visible only to the operator in the main window:

- CommandPalette, QuickJumpOverlay, RuntimeInspector, KeyboardCheatSheet, NotificationPanel

**Projection Output Overlays** — rendered in the projection window (PresentationCanvas):

- Announcement slides, Bible verses, lower thirds, timer, logo

These two systems are completely independent. Operator UI overlays never affect projection output. Projection output overlays are controlled by the operator but rendered in the separate projection window.

---

## 7.2 Operator UI Overlay Specifications

### 7.2.1 CommandPalette (Redesigned)

```
Trigger: Ctrl+P or Ctrl+K
Position: centered, top: 15vh
Width: 560px
Max-height: 480px
Z-index: z-[1400]

Container:
  Background: rgba(17,19,28,0.96) + backdrop-blur(32px)
  Border: 1px solid rgba(255,255,255,0.10)
  Border-radius: 16px
  Shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)
  Animation: scale(0.96)+opacity(0) → scale(1)+opacity(1), 200ms ease-out-expo

Backdrop:
  Background: rgba(0,0,0,0.4)
  Backdrop-filter: blur(4px)
  Click: close palette

Search Bar (top, 52px):
  Icon: Search 18px, text-muted, left: 16px
  Input: Inter 14px/500, text-primary, placeholder text-muted
  Background: transparent
  Border-bottom: 1px solid border-subtle
  Padding: 0 16px 0 44px
  Clear button: X icon, right: 12px, appears when value non-empty
  Focus: no outline (palette is already focused context)

Results Area (scrollable, max-height: 380px):
  Padding: 6px

Category Header:
  Height: 28px
  Padding: 0 12px
  Font: Inter 10px/800, uppercase, letter-spacing 0.14em, text-muted
  Sticky within scroll

Result Item:
  Height: 40px
  Padding: 0 12px
  Border-radius: 8px
  Layout: [icon 16px gap-10px] [label flex-1] [shortcut]
  Font: Inter 13px/600, text-secondary
  Hover: bg-white/[0.06], text-primary
  Active/selected: bg-brand-primary/12, text-primary, icon brand-primary
  Dangerous: rose-400 icon, rose-400/8 hover bg

  Icon colors by category:
    navigation: cyan-400
    projection: rose-400 (dangerous)
    timer: amber-400
    protection: amber-400
    next: blue-400
    system: text-muted

Shortcut Badge:
  Font: Inter Mono 10px/700, text-disabled
  Background: bg-white/[0.04]
  Border: border-subtle
  Border-radius: 4px
  Padding: 2px 5px

Footer (32px):
  Border-top: border-subtle
  Padding: 0 12px
  Font: 10px/700, text-disabled
  Content: "↑↓ navigate · Enter execute · Esc close"
```

### 7.2.2 QuickJumpOverlay (Redesigned)

```
Trigger: Ctrl+G or G key (in PROJECTION mode)
Position: centered, top: 20vh
Width: 480px
Z-index: z-[1400]

Container:
  Background: rgba(17,19,28,0.96) + backdrop-blur(28px)
  Border: border-default
  Border-radius: 16px
  Shadow: elevation-5

Header (44px):
  Left: "Quick Jump" Poppins 14px/800, text-primary
  Right: mode badge — "Preview" (green) or "Live" (red) + close X

Input (52px):
  Font: Inter 16px/600, text-primary
  Placeholder: "Slide number, section, or address..."
  Background: bg-surface-0
  Border-bottom: border-subtle
  Padding: 0 16px
  Auto-focus on open

Results (max-height: 320px, scrollable):
  Grouped sections:

  SLIDES group:
    Each item: [#N] [section label] [slide text preview 1 line]
    Height: 44px
    Number: Inter Mono 13px/800, brand-primary
    Label: 11px/700, text-muted
    Preview: 12px/500, text-secondary, truncated

  SECTIONS group:
    Each item: [section icon] [section name] [slide range]
    Height: 36px

  SPECIAL group:
    First / Last / Next Section
    Height: 36px

Active item:
  bg-brand-primary/10, left bar 2px brand-primary

Footer (32px):
  "↑↓ navigate · Enter jump · Esc cancel"
  Font: 10px/700, text-disabled
```

### 7.2.3 RuntimeInspector (Redesigned)

```
Trigger: Ctrl+Shift+I
Type: Right side panel (slide in from right)
Width: 480px
Height: 100% (below title bar)
Z-index: z-[1300]

Container:
  Background: rgba(13,15,23,0.98) + backdrop-blur(24px)
  Border-left: 1px solid border-default
  Shadow: -12px 0 40px rgba(0,0,0,0.4)
  Animation: translateX(100%) → translateX(0), 300ms ease-premium

Header (52px):
  Title: "Runtime Inspector" Poppins 14px/800
  Subtitle: "Live system diagnostics"
  Close: X button, right

Tab Bar (40px):
  Tabs: [Events | Commands | Health | Logs | State]
  Active: text-primary, border-bottom 2px brand-primary
  Inactive: text-muted

Events Tab:
  Event log from commandBus.getEventLog()
  Each event row (36px):
    [timestamp 10px mono] [source badge] [command type] [status badge] [duration]
    SUCCESS: emerald badge
    BLOCKED: amber badge
    ERROR: rose badge
  Filter bar: All / Success / Blocked / Error
  Auto-scroll to latest

Commands Tab:
  Recent command log from commandBus.getCommandLog()
  Each row: [timestamp] [type] [source] [payload preview]

Health Tab:
  Endpoint grid from useHealthStore
  Each endpoint (48px):
    [status dot] [name] [last seen] [latency] [reconnect count]
    Connected: green dot
    Disconnected: red dot, "Disconnected N ago"

Logs Tab:
  Structured log buffer from logger.getBuffer()
  Each entry: [level badge] [module] [message] [data preview]
  Level colors: debug=zinc, info=blue, warn=amber, error=rose

State Tab:
  Snapshot of key store values:
    projectionState, programLockState, nextReadyState
    timerElapsed, timerRunning
    activePlaylist name, playlistItems count
    displayCount, isProjectionVisible
  Refresh button: re-reads current state
```

### 7.2.4 KeyboardCheatSheet (Redesigned)

```
Trigger: ? key
Position: centered
Width: 640px
Max-height: 80vh
Z-index: z-[1400]

Container:
  Background: rgba(17,19,28,0.96) + backdrop-blur(28px)
  Border: border-default
  Border-radius: 16px
  Shadow: elevation-5

Header (52px):
  Title: "Keyboard Shortcuts" Poppins 16px/800
  Subtitle: "SION Media — All modes"
  Close: X button

Content (scrollable):
  2-column grid of shortcut groups

  Each group:
    Group title: 11px/800, uppercase, text-muted, mb-8px
    Each shortcut row (32px):
      [action label flex-1] [kbd badge]
    Border-bottom: border-subtle between groups

  Groups:
    Global Navigation
    Projection Controls
    Slide Navigation
    Library Mode
    Management Mode
    System

Kbd badge:
  Background: bg-white/[0.06]
  Border: border-default
  Border-radius: 5px
  Padding: 3px 7px
  Font: Inter Mono 11px/700, text-secondary
  Multiple keys: separated by "+" with gap-4px
```

### 7.2.5 NotificationPanel (Redesigned)

```
Trigger: Bell icon in title bar
Type: Right drawer
Width: 360px
Height: 100% (below title bar)
Z-index: z-[1300]

Container:
  Background: rgba(13,15,23,0.98) + backdrop-blur(24px)
  Border-left: border-default
  Shadow: -8px 0 32px rgba(0,0,0,0.3)
  Animation: translateX(100%) → translateX(0), 300ms ease-premium

Header (52px):
  Title: "Notifications" Poppins 14px/800
  Actions: [Mark all read] [Clear all]
  Close: X button

Filter tabs (36px):
  [All] [Unread] [System] [Import]
  Active: text-primary, border-bottom 2px brand-primary

Notification item (min-height 64px):
  Padding: 12px 16px
  Layout: [icon 32px] [content flex-1] [time 10px]
  Border-bottom: border-subtle
  Unread: left border 3px brand-primary, bg-white/[0.02]
  Read: no left border

  Icon container (32px):
    Border-radius: 8px
    info:    bg-blue-500/12, blue-400 icon
    success: bg-emerald-500/12, emerald-400 icon
    warning: bg-amber-500/12, amber-400 icon
    error:   bg-rose-500/12, rose-400 icon

  Content:
    Title: 13px/700, text-primary
    Message: 12px/500, text-secondary, max 2 lines
    Time: 10px/600, text-muted, relative ("2 menit lalu")

Empty state:
  Bell icon (48px, opacity 0.25)
  "Tidak ada notifikasi" (13px/600, text-muted)
  "Notifikasi import, backup, dan sistem akan muncul di sini." (11px, text-disabled)
```

---

## 7.3 Projection Output Overlay Specifications

These overlays render inside `PresentationCanvas` in the projection window. They are part of the `ProjectionPayload` system defined in Phase 2.

### 7.3.1 Announcement Overlay

```
Triggered by: operator selects CustomSlide in AnnouncementPanel
Rendered in: PresentationCanvas (projection window)

Layout:
  Full-screen background (from CustomSlide.background_color or AtmosphereConfig)
  Content area: centered, max-width 80%, padding 10%

  Title (if present):
    Font: Poppins, fontSize from slide settings, white
    Text-shadow: 0 4px 24px rgba(0,0,0,0.8)
    Margin-bottom: 24px

  Content:
    Font: Inter, fontSize from slide settings, white
    Line-height: 1.5
    White-space: pre-line
    Text-shadow: 0 2px 12px rgba(0,0,0,0.6)

  Slide type badge (bottom-right, operator preview only):
    "ANNOUNCEMENT" / "LITURGY" / "WELCOME" / "OFFERING"
    Font: 10px/800, uppercase, text-muted
    Not visible in actual projection output

Transition:
  Same as song slides: dissolve/smooth-blur based on settings
  Duration: CustomSlide.display_duration (auto-advance if set)
```

### 7.3.2 Bible Verse Overlay

```
Triggered by: operator selects verse in BiblePickerDialog
Rendered in: PresentationCanvas (projection window)

Layout:
  Background: current AtmosphereConfig (same as song slides)
  Content area: centered, padding 10% sides, 8% top/bottom

  Verse text:
    Font: Poppins, 72-96px (auto-scale to fit), white
    Font-weight: 500
    Line-height: 1.3
    Text-align: center
    Text-shadow: 0 8px 34px rgba(0,0,0,0.88)
    Max 4 lines before font reduces

  Reference (below verse):
    Font: Inter 28px/700, rgba(255,255,255,0.72)
    Format: "Yohanes 3:16 (TB)"
    Margin-top: 32px

  Translation badge (bottom-right):
    Font: Inter 14px/700, rgba(255,255,255,0.5)
    Background: rgba(0,0,0,0.3)
    Border-radius: 6px
    Padding: 4px 10px

Transition:
  Same dissolve/smooth-blur as song slides
```

### 7.3.3 Lower Third Overlay

```
Triggered by: operator types in LowerThirdPanel (future)
Rendered in: PresentationCanvas ON TOP of current content

Layout:
  Position: absolute, bottom: 8%, left: 0, right: 0
  Does NOT replace current slide — overlays on top

  Container:
    Background: linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.6), transparent)
    Padding: 16px 48px
    Max-width: 70%

  Primary text:
    Font: Poppins 36px/700, white
    Text-shadow: 0 2px 8px rgba(0,0,0,0.6)

  Secondary text (optional):
    Font: Inter 22px/500, rgba(255,255,255,0.8)
    Margin-top: 4px

  Left accent bar:
    Width: 4px, height: 100%
    Background: brand-primary
    Position: absolute, left: 32px

Transition:
  Slide up from bottom: translateY(20px)+opacity(0) → translateY(0)+opacity(1)
  Duration: 400ms ease-premium
  Exit: reverse
```

### 7.3.4 Timer Overlay

```
Triggered by: operator enables timer display in projection
Rendered in: PresentationCanvas corner

Position: top-right, 48px from edges (within safe zone)

Display:
  Font: Inter Mono 48px/800, white
  Text-shadow: 0 4px 16px rgba(0,0,0,0.8)
  Format: HH:MM:SS

States:
  Running: white text
  Stopped: rgba(255,255,255,0.5)
  Warning (< 5 min): amber-400
  Critical (< 1 min): rose-400, animate-pulse

Background:
  rgba(0,0,0,0.4) pill
  Border-radius: 12px
  Padding: 8px 16px
  Backdrop-filter: blur(8px)
```

### 7.3.5 Emergency Overlay

```
Triggered by: operator clicks Emergency button (panic)
Rendered in: PresentationCanvas — OVERRIDES everything

Layout:
  Full-screen solid black background
  Center: configurable message or logo
  Default message: "Please Stand By"

  Message:
    Font: Poppins 64px/800, white
    Text-align: center

  Sub-message (optional):
    Font: Inter 28px/500, rgba(255,255,255,0.6)

Activation:
  Bypasses all other states
  Sets projectionState to 'BLACK' immediately
  No transition — instant cut

Operator indicator:
  Title bar: "EMERGENCY" badge, rose-500, pulsing
  All projection controls disabled except Clear
```

---

## 7.4 Overlay Z-Index Hierarchy

```
Projection Window (separate BrowserWindow):
  PresentationCanvas base:     z-0
  AtmosphereRenderer:          z-1
  Slide content:               z-10
  Lower third overlay:         z-20
  Timer overlay:               z-30
  Emergency overlay:           z-100

Main Window (operator UI):
  Mode content:                z-0
  Sticky headers:              z-10
  Floating toolbars:           z-20
  Dropdowns/popovers:          z-[1000]
  Notification panel:          z-[1300]
  RuntimeInspector:            z-[1300]
  Modal backdrop:              z-[1350]
  Modal container:             z-[1400]
  CommandPalette:              z-[1400]
  QuickJumpOverlay:            z-[1400]
  Toast notifications:         z-[1500]
  Tooltips:                    z-[1600]
  Critical dialogs:            z-[9999]
```

---

## 7.5 Overlay Visibility Rules

```
Rule 1: Operator overlays never block projection-critical controls
  CommandPalette, QuickJumpOverlay: keyboard shortcuts still work
  B, F, Esc keys pass through to projection even when palette is open

Rule 2: Projection output overlays respect safe zones
  All text content: 5% margin minimum from edges
  Lower thirds: bottom 8% position, left-aligned

Rule 3: Emergency overlay is always highest priority
  Cannot be blocked by any other overlay
  Instant activation, no animation delay

Rule 4: Overlays animate in but never animate out slowly
  Enter: 200-300ms animation
  Exit: 150ms maximum (operator needs fast feedback)

Rule 5: Backdrop blur on operator overlays
  All floating panels: backdrop-blur(20-32px)
  This maintains depth perception without full opacity

Rule 6: prefers-reduced-motion
  All overlay animations: respect @media (prefers-reduced-motion: reduce)
  Fallback: opacity-only transition, 100ms
```

---

# PART 8: PROJECTION VISUAL SYSTEM

## 8.1 Projection Typography System

The projection output (`PresentationCanvas`) renders at a fixed 1920×1080 canvas scaled to fit the display. Typography must be readable at distances of 5–30 meters under varying lighting conditions.

### 8.1.1 Type Scale for Projection

```
Primary Lyric Text:
  Font:         Poppins or Inter (operator-configurable via settings)
  Size:         86px default (configurable: 48–120px)
  Weight:       560 (between medium and semibold — confirmed from PresentationCanvas)
  Line height:  1.25
  Letter spacing: -0.01em
  Color:        #ffffff (pure white — maximum contrast)
  Text shadow:  0 8px 34px rgba(0,0,0,0.88), 0 2px 10px rgba(0,0,0,0.72)
  Text align:   center (configurable: left/center/right)

Secondary / Metadata Text (key, tempo, time signature):
  Font:         same as primary
  Size:         28–32px
  Weight:       700
  Color:        rgba(255,255,255,0.72)
  Container:    pill badge, rgba(0,0,0,0.42) bg, backdrop-blur(16px)
  Padding:      14px 32px
  Radius:       999px (full pill)
  Border:       1px solid rgba(255,255,255,0.08)
  Margin-top:   50px below lyric text

Bible Verse Text:
  Font:         same as primary
  Size:         72px (slightly smaller than lyrics)
  Weight:       500
  Line height:  1.35
  Reference:    32px, rgba(255,255,255,0.72), below verse text

Announcement Text:
  Title:        Poppins 64px/800
  Body:         Inter 48px/500
  Line height:  1.4

Lower Third Text:
  Primary:      Inter 42px/700
  Secondary:    Inter 32px/500, rgba(255,255,255,0.72)
  Background:   gradient bar, rgba(0,0,0,0.72) → transparent
  Height:       120px
  Position:     bottom 8% of canvas
```

### 8.1.2 Text Container Layout

```
Safe zone: 5% margin on all sides
  Top:    54px  (5% of 1080)
  Bottom: 54px
  Left:   96px  (5% of 1920)
  Right:  96px

Lyric text container:
  Max-width: 1440px (75% of 1920)
  Width: 75%
  Centered horizontally
  Vertically centered in canvas
  Padding: 118px 190px (confirmed from PresentationCanvas source)

Text shield (readability guard):
  Position: absolute, inset-x-0, bottom-0, height 50%
  Background: linear-gradient(to top, rgba(0,0,0,0.22), transparent)
  Pointer-events: none
  Always present when lyrics are showing
```

### 8.1.3 Projection Font Loading

```
Fonts loaded in projection.html (separate from main window):
  @fontsource/inter — loaded in renderer/index.html
  @fontsource/poppins — loaded in renderer/index.html

Both windows share the same renderer bundle, so fonts are available.
Operator-configurable font: stored in settings.projection_font_family
Applied directly to PresentationCanvas via theme prop.

Fallback stack:
  'Inter', 'Poppins', system-ui, -apple-system, sans-serif
```

---

## 8.2 Worship Lyric Display System

### 8.2.1 Lyric Slide Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
│                         Tuhan Yesus Kristus                                                     │
│                         Raja segala raja                                                        │
│                         Yang bertakhta di surga                                                 │
│                         Mulia namaMu                                                            │
│                                                                                                 │
│                    ┌─────────────────────────────────────┐                                      │
│                    │  Nada G  ·  4/4  ·  72 BPM          │                                      │
│                    └─────────────────────────────────────┘                                      │
│                                                                                                 │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2.2 Slide Transition System

The `PresentationCanvas` supports 4 transition types (confirmed from source):

```
dissolve (default):
  initial: { opacity: 0 }
  animate: { opacity: 1 }
  exit:    { opacity: 0 }
  duration: configurable (0.1–1.2s)
  Use case: standard worship, clean

smooth-blur:
  initial: { opacity: 0, filter: 'blur(18px)', scale: 0.985 }
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1 }
  exit:    { opacity: 0, filter: 'blur(12px)', scale: 1.015 }
  ease:    [0.22, 1, 0.36, 1]
  Use case: cinematic, premium feel

slide:
  initial: { opacity: 0, y: 34 }
  animate: { opacity: 1, y: 0 }
  exit:    { opacity: 0, y: -34 }
  ease:    [0.16, 1, 0.3, 1]
  Use case: sequential content, announcements

crossfade:
  initial: { opacity: 0 }
  animate: { opacity: 1 }
  exit:    { opacity: 0 }
  duration: 1.5× configured duration
  ease:    [0.4, 0, 0.2, 1]
  Use case: slow, meditative moments

fast-cut:
  initial: { opacity: 0 }
  animate: { opacity: 1 }
  exit:    { opacity: 0 }
  duration: 0.1s (always)
  Use case: rapid navigation, emergency
```

**Transition Speed Presets (from LivePreviewPanel):**

```
0.1s — Cut (instant)
0.4s — Fast (default)
0.8s — Normal
1.2s — Slow
```

### 8.2.3 Section Label Display

Section labels (Verse 1, Chorus, Bridge, etc.) are stored in `SlideData.sectionLabel`. They are NOT displayed in the main projection output by default — they appear in:

- Operator preview monitor (small badge)
- Stage display (prominent label)
- Quick Jump overlay (navigation)

**Operator preview section badge:**

```
Position: top-left of monitor frame
Font: Inter 10px/800, uppercase, letter-spacing 0.14em
Color: text-muted
Background: rgba(0,0,0,0.4)
Padding: 2px 8px
Radius: 4px
```

---

## 8.3 Scripture Display System

Bible verses require a different layout from worship lyrics — they have a reference, may be longer, and need translation attribution.

### 8.3.1 Bible Verse Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                 │
│                                                                                                 │
│              "Karena begitu besar kasih Allah akan dunia ini,                                   │
│               sehingga Ia telah mengaruniakan Anak-Nya yang                                     │
│               tunggal, supaya setiap orang yang percaya                                         │
│               kepada-Nya tidak binasa, melainkan beroleh                                        │
│               hidup yang kekal."                                                                │
│                                                                                                 │
│                         Yohanes 3:16  ·  TB 2011                                               │
│                                                                                                 │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Visual specification:**

```
Verse text:
  Font: same as lyric font
  Size: 72px (slightly smaller than lyrics for longer text)
  Weight: 500 (lighter — reading weight)
  Style: italic (distinguishes from lyrics)
  Line height: 1.35
  Quotes: opening " before first word, closing " after last word
  Color: #ffffff

Reference line:
  Font: Inter 32px/700
  Color: rgba(255,255,255,0.72)
  Format: "Book Chapter:Verse  ·  Translation"
  Margin-top: 40px
  Separator: · (middle dot, rgba(255,255,255,0.4))

Container:
  Same safe zone as lyrics (118px 190px padding)
  Max-width: 1440px
  Centered
```

### 8.3.2 Multi-Verse Display

When projecting a verse range (e.g., John 3:16-17), the text is split into slides automatically:

```
Slide 1: verse 16 text + reference "Yohanes 3:16"
Slide 2: verse 17 text + reference "Yohanes 3:17"
Footer: "Yohanes 3:16-17  ·  TB 2011" (shown on all slides)
```

---

## 8.4 Atmosphere Layering System

The `AtmosphereRenderer` (confirmed from source) uses a 5-layer compositing system:

```
Layer 1 — Base Background
  Solid color or gradient
  Always present
  z-index: 0

Layer 2 — Media (Image or Video)
  Image: CSS background-image, cover fit
  Video: <video> element, autoPlay, loop, muted, object-cover
  z-index: 1
  Transition: scale(1.05)+opacity(0) → scale(1)+opacity(1) on load

Layer 3 — Motion Engine
  Particle effects, aurora, cinematic haze, cloud drift
  CSS/canvas animations
  z-index: 2
  Presets: aurora, soft-particles, cinematic-haze, volumetric-light, cloud-drift, animated-gradient

Layer 4 — Atmospheric Overlay
  Global dim: rgba(0,0,0,dim) — default 0.56
  Vignette: radial-gradient, default 0.24
  Atmospheric glow: mix-blend-screen, default 0.12
  Text shield: linear-gradient bottom-half, default 0.22
  z-index: 3

Layer 5 — Readability Guard
  Contrast boost: CSS filter contrast()
  Blur behind lyrics: backdrop-filter blur(4px)
  Smart dimming: increases dim when text is present
  z-index: 4
```

### 8.4.1 Scene Preset Visual Identities

The 6 confirmed presets from `presets.ts`:

```
Worship (default):
  Aurora gradient: #020617 → #0f172a → #1e3a8a → #0ea5e9
  Motion: aurora, intensity 0.42, tint #38bdf8
  Feel: deep navy, electric blue — standard worship

Prayer:
  Radial gradient: #111827 → #0f172a → #020617
  Motion: cinematic-haze, intensity 0.18, tint #94a3b8
  Feel: dark, minimal, contemplative

Sermon:
  Solid: #0f172a
  Motion: soft-particles, intensity 0.12, tint #cbd5e1
  Feel: neutral, high readability, professional

Announcement:
  Linear gradient: #111827 → #1e293b → #0f766e
  Motion: animated-gradient, intensity 0.14, tint #5eead4
  Feel: teal accent, informational

Communion:
  Linear gradient: #120b0b → #2b1c1c → #6b4226 → #d4a373
  Motion: volumetric-light, intensity 0.16, tint #fbbf24
  Feel: warm amber, reverent, sacred

Baptism:
  Aurora gradient: #031525 → #0f3d56 → #0ea5e9 → #67e8f9
  Motion: cloud-drift, intensity 0.20, tint #7dd3fc
  Feel: water blue, fresh, uplifting
```

### 8.4.2 Atmosphere Transition Behavior

```
When scene preset changes:
  AtmosphereRenderer uses AnimatePresence mode="popLayout"
  Key changes → old layer fades out, new layer fades in
  Duration: transitionDuration prop (default 0.8s)
  Ease: [0.4, 0, 0.2, 1]

When song changes (song_background_config):
  Same transition system
  Duration: same as slide transition duration

When live override applied:
  Immediate (no transition) — operator emergency action
  Override takes priority over all other layers
```

---

## 8.5 Lower Third System

Lower thirds are text overlays that appear at the bottom of the projection output without replacing the main content.

### 8.5.1 Lower Third Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                 │
│                    Tuhan Yesus Kristus                                                          │
│                    Raja segala raja                                                             │
│                                                                                                 │
│                                                                                                 │
│                                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │  Pdt. Yohanes Simanjuntak                                                                │   │
│  │  Gembala Sidang — GMAHK Jambrut                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Visual specification:**

```
Container:
  Position: absolute, bottom 8% (86px from bottom), left 96px, right 96px
  Background: linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.72) 60%, transparent 100%)
  Padding: 20px 32px
  Radius: 8px
  Border-left: 4px solid brand-primary (#3b82f6)
  Backdrop-filter: blur(8px)

Primary text:
  Font: Inter 42px/700
  Color: #ffffff
  Line height: 1.2

Secondary text:
  Font: Inter 32px/500
  Color: rgba(255,255,255,0.72)
  Margin-top: 8px

Animation:
  Enter: translateY(20px)+opacity(0) → translateY(0)+opacity(1), 400ms ease-premium
  Exit:  translateY(0)+opacity(1) → translateY(20px)+opacity(0), 300ms
  Auto-dismiss: configurable duration (default: none — operator dismisses)
```

---

## 8.6 Stage Display Visual System

The `StageDisplayApp` is a separate window for musicians and singers. It must be readable at 3–8 meters in a lit stage environment.

### 8.6.1 Stage Display Layout (Redesigned)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (96px)                                                                                 │
│  [🕐 14:32:05]                    [⏱ 00:12:34]                    [● LIVE]                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                 │
│  SECTION LABEL (if present)                                                                     │
│  ♪  CHORUS                                                                                      │
│                                                                                                 │
│  CURRENT SLIDE (large — primary focus)                                                          │
│                                                                                                 │
│  Tuhan Yesus Kristus                                                                            │
│  Raja segala raja                                                                               │
│  Yang bertakhta di surga                                                                        │
│  Mulia namaMu                                                                                   │
│                                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                 │
│  NEXT  (smaller — secondary focus)                                                              │
│  Bersyukur kepada-Mu Tuhan...                                                                   │
│                                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  FOOTER (80px)                                                                                  │
│  [LS] Tuhan Yesus Kristus                    Key: G  ·  4/4  ·  72 BPM                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.6.2 Stage Display Typography

```
Background: #000000 (pure black — maximum contrast for stage)

Top bar:
  Background: rgba(24,24,27,0.6), border-bottom: 1px solid rgba(255,255,255,0.08)
  Clock: Inter Mono 48px/700, white
  Timer: Inter Mono 24px/700, amber when running
  Live badge: 20px dot + "LIVE" text, 24px/900, uppercase, red when live

Section label:
  Music icon + label text
  Font: Inter 28px/900, uppercase, letter-spacing 0.3em
  Color: #38bdf8 (cyan — accent)

Current slide text:
  Font: Inter 80–96px/700 (responsive to content length)
  Color: #ffffff
  Line height: 1.3
  White-space: pre-line
  Drop-shadow: 0 4px 24px rgba(0,0,0,0.8)

Slide counter:
  Font: Inter 20px/500
  Color: rgba(255,255,255,0.4)
  Format: "3 / 8"

Divider:
  1px solid rgba(255,255,255,0.08)
  Margin: 32px 0

Next label:
  "NEXT" — Inter 20px/900, uppercase, letter-spacing 0.15em, zinc-500
  Next section (if different): cyan-400, italic

Next slide text:
  Font: Inter 48px/500
  Color: rgba(255,255,255,0.5)
  Italic
  Line-clamp: 3

Footer:
  Background: rgba(24,24,27,0.6), border-top: 1px solid rgba(255,255,255,0.05)
  Hymnal code: cyan-400, 18px/700
  Song title: white, 20px/600
  Key/tempo: zinc-400, 18px/500

Standby screen:
  "SION MEDIA" — 72px/900, zinc-800, uppercase, tight tracking
  "Confidence Monitor" — 20px/500, zinc-600
```

### 8.6.3 Stage Display State Indicators

```
LIVE state:
  Top bar: red dot (animate-pulse) + "LIVE" text
  Background: subtle red ambient (rgba(255,59,48,0.03))

BLACK state:
  Top bar: dim dot + "BLACK" text
  Main content: hidden (black screen)
  Footer: still visible

FREEZE state:
  Top bar: snowflake icon + "FREEZE" text, amber color
  Content: frozen (last slide shown)

STANDBY state:
  Top bar: dim dot + "STANDBY" text
  Main content: standby screen
```

---

## 8.7 Projection Readability Rules

### 8.7.1 Distance Readability

```
5 meters:   86px text → readable
10 meters:  86px text → comfortable
15 meters:  86px text → minimum acceptable
20 meters:  96px+ recommended
30 meters:  108px+ recommended

Rule: Default 86px covers 5–15m. Operator should increase for large venues.
```

### 8.7.2 Lighting Conditions

```
Dark room (cinema/concert):
  Background: dark gradient or solid
  Text: pure white
  Contrast: 21:1 (maximum)

Lit room (church with windows):
  Background: darker (increase dim overlay)
  Text: pure white
  Text shadow: increase to 0 12px 48px rgba(0,0,0,0.95)
  Contrast: minimum 7:1

LED wall (bright):
  Background: solid dark (#0a0c16)
  Text: pure white
  No motion backgrounds (reduces readability)
  Contrast: 15:1 minimum
```

### 8.7.3 Projector Artifact Prevention

```
Pure black (#000000): avoid as background (projector shows gray)
  → Use #090b14 instead (near-black)

Pure white (#ffffff): safe for text only
  → Never use as background (blinding)

Thin lines < 2px: avoid (projector aliasing)
  → Minimum 2px for any visible line

Rapid flashing: never
  → Minimum 500ms between full-screen changes
  → Exception: operator-initiated fast-cut

Overscan: 5% safe zone on all sides
  → Some projectors crop edges
  → All content within safe zone
```

---

## 8.8 Projection Output Modes

```
LIVE:
  Shows current programSlide text
  AtmosphereRenderer active
  Transition animation plays on slide change

BLACK:
  Full black overlay (opacity: 1, transition: 0.4s)
  AtmosphereRenderer still running (hidden)
  Instant on B key

FREEZE:
  Last frame frozen
  No slide updates processed
  Visual indicator: none (output looks normal)

CLEAR:
  "SION PRESENTER" placeholder text (rgba(255,255,255,0.16))
  AtmosphereRenderer active
  No lyric text

LOGO:
  Logo image displayed (settings.projection_logo)
  Position: configurable (center/bottom-right/top-left)
  Opacity: configurable (settings.projection_logo_opacity)
  Animation: scale(0.95)+opacity(0) → scale(1)+opacity(1), 0.8s
```

---

# PART 9: WORKFLOW UX MODERNIZATION

## 9.1 Song Presentation Flow (Primary Workflow)

This is the most-used workflow in SION Media. Every friction point costs operator time during a live service.

### 9.1.1 Current Flow (Confirmed from Source)

```
1. Operator opens PROJECTION mode
2. Searches for song in SongLibraryPanel
3. Clicks song → generateSlidesForSong() → setSlides()
4. Presses Space → takeCue() → goToSlide(0) → LIVE
5. Navigates with → / ← keys
6. Presses B for black between songs
7. Clicks next song in PlaylistPanel
8. Presses Space again → new song goes LIVE
```

### 9.1.2 Friction Points Identified

```
Friction 1: No visual confirmation that song is cued
  Current: slides load silently
  Fix: Preview monitor shows first slide immediately, green border pulses

Friction 2: No NEXT song indicator
  Current: operator must remember what comes next
  Fix: NEXT strip shows next playlist song title + first slide preview

Friction 3: Playlist requires separate creation workflow
  Current: must go to Management Mode or use File menu (broken)
  Fix: CreatePlaylistDialog accessible from Projection Mode playlist panel

Friction 4: No keyboard shortcut to jump to playlist item
  Current: 1-9 keys work but only for first 9 items
  Fix: Quick Jump overlay supports playlist navigation

Friction 5: Song search requires clicking into search field
  Current: must click search input
  Fix: Ctrl+F focuses search from anywhere in Projection Mode
```

### 9.1.3 Optimized Song Presentation Flow

```
Pre-service preparation:
  1. Open SION Media → auto-opens in last mode (PROJECTION)
  2. Ctrl+N → CreatePlaylistDialog → name + date → create
  3. Search songs (Ctrl+F) → type song name → click → auto-adds to playlist
  4. Drag to reorder playlist items
  5. Click first song → preview loads → ready

During service:
  1. Space → TAKE → song goes LIVE (green → red border transition)
  2. → key → next slide (instant, no lag)
  3. B → black screen between songs (instant)
  4. Click next song in playlist → preview loads
  5. Space → TAKE → new song LIVE
  6. Ctrl+J → Quick Jump → type "chorus" → Enter → jump to chorus
  7. Esc → CLEAR → end of song

Emergency:
  1. B → instant black (any state)
  2. Esc → instant clear
  3. Click any song → immediate cue
  4. Space → immediate TAKE
```

### 9.1.4 Keyboard-First Workflow Design

```
All critical actions: single key, no modifier
  Space:  TAKE (most important action)
  →:      Next slide
  ←:      Previous slide
  B:      Black
  F:      Freeze
  Esc:    Clear

Secondary actions: Ctrl + key
  Ctrl+→: Next song in playlist
  Ctrl+←: Previous song in playlist
  Ctrl+F: Focus search
  Ctrl+J: Quick Jump
  Ctrl+G: Quick Jump (alternative)
  1-9:    Jump to playlist item N

Power user: Ctrl+Shift
  Ctrl+Shift+F: Focus Live Mode
  Ctrl+Shift+I: Runtime Inspector
  Ctrl+Shift+S: Stage Display toggle
```

---

## 9.2 Scripture Presentation Flow

### 9.2.1 Bible Verse Workflow

```
Entry points:
  View > Bible (Ctrl+B) → BibleScreen overlay
  Projection Mode → Bible panel tab (new)

Workflow:
  1. Open Bible (Ctrl+B)
  2. Select translation (TB 2011, NIV, etc.)
  3. Select book → chapter → verse range
  4. Preview in right panel (PresentationCanvas preview)
  5. Click "Cue to Preview" → loads as SlideData in projectionStore
  6. Return to Projection Mode (Ctrl+2)
  7. Space → TAKE → verse goes LIVE

Bible panel in Projection Mode (new):
  Tab in bottom workspace: [Songs | Playlist | Bible | Announcements]
  Quick search: type "John 3:16" → auto-parse → load verse
  Recent verses: last 10 projected verses
```

### 9.2.2 Bible Verse as SlideData

```typescript
// Bible verse generates a SlideData with type indicator
interface BibleSlideData extends SlideData {
  bibleId: number
  bibleReference: string // "Yohanes 3:16"
  bibleTranslation: string // "TB 2011"
}

// PresentationCanvas renders differently for bible type:
// - Italic text
// - Reference line below
// - No section label
```

---

## 9.3 Media Presentation Flow

### 9.3.1 Media Asset Workflow

```
Entry points:
  Media > Import Media Assets → MediaImportDialog
  Management Mode > Media Library section

Workflow:
  1. Import media (drag-drop or file picker)
  2. Assign category + tags
  3. Add to collection (optional)
  4. In Projection Mode: open Atmosphere panel
  5. Select media asset as background
  6. Apply to current song or as live override
  7. Projection output updates immediately
```

### 9.3.2 Atmosphere Live Override Workflow

```
Operator wants to change background mid-service:
  1. Click atmosphere preset in scene strip (bottom of LivePreviewPanel)
  2. Preset applies as live override immediately
  3. Override indicator shown in scene strip (active preset highlighted)
  4. Click "Clear" → removes override → returns to song/global atmosphere

Emergency atmosphere change:
  1. Click "Sermon" preset → solid dark background, maximum readability
  2. Instant, no confirmation needed
  3. Reverting: click "Worship" preset or "Clear"
```

---

## 9.4 Playlist Building Flow

### 9.4.1 Redesigned Playlist Builder

```
Current problem: playlist creation requires Management Mode or broken File menu
Fix: Full playlist management accessible from Library Mode and Projection Mode

Library Mode playlist workflow:
  1. Sidebar: click "Playlist Saya"
  2. Header: [+ New Playlist] button → CreatePlaylistDialog
  3. Search songs → right-click → "Add to Playlist" → PlaylistPickerDialog
  4. OR: drag song card to playlist panel
  5. Reorder: drag playlist items
  6. Click "Present" button → switches to Projection Mode with playlist loaded

Projection Mode playlist workflow:
  1. PlaylistPanel header: [Playlist name ▾] → PlaylistPickerDialog
  2. [+ New] button → CreatePlaylistDialog
  3. [+ Add Song] at bottom → opens song search overlay
  4. Drag to reorder
  5. Click item → cues song in preview
```

### 9.4.2 Drag-and-Drop Specification

```
Library Mode → Playlist:
  Drag source: SongCard, NumberTile, RundownRow
  Drop target: PlaylistPanel (highlighted when dragging)
  Visual: song card follows cursor at 0.8 opacity
  Drop zone: blue border + "Drop to add" label
  On drop: addSongToPlaylist() → item appears at bottom

Playlist reorder:
  Drag handle: GripVertical icon (appears on hover)
  Visual: item lifts (elevation-4), placeholder shows position
  On drop: reorderItems() → optimistic update
  Animation: spring, stiffness 400, damping 30
```

---

## 9.5 Backup & Restore Flow

### 9.5.1 Backup Workflow

```
Entry points:
  File > Backup Database
  Settings > Backup section
  Management Mode > System > Backup

Workflow:
  1. Trigger backup
  2. BackupProgressDialog opens (loading state)
  3. File save dialog → operator chooses path
  4. Backup created (SQLite VACUUM INTO)
  5. Dialog shows: ✓ "Backup berhasil" + path + size
  6. [Tutup] button

Auto-backup (new):
  On app startup, if last backup > 7 days:
  → Silent auto-backup to userData/backups/
  → Notification: "Auto-backup dibuat: sion-backup-2026-05-14.db"
  → No dialog (non-blocking)
```

### 9.5.2 Restore Workflow

```
Entry points:
  File > Restore from Backup
  Settings > Backup > Restore

Workflow:
  1. File picker → select .db file
  2. Validation: check file is valid SQLite + has schema_migrations table
  3. If invalid: error toast "File backup tidak valid"
  4. If valid: DeleteConfirmDialog
     "Restore akan mengganti seluruh database saat ini.
      Semua data yang tidak di-backup akan hilang.
      Tindakan ini tidak dapat dibatalkan."
  5. Confirm → restore → app restart required
  6. Toast: "Restore berhasil. Restart aplikasi untuk menerapkan perubahan."
  7. [Restart Sekarang] button
```

---

## 9.6 Crash Recovery Flow

### 9.6.1 Recovery Dialog UX

```
Trigger: App starts, getRecoveryState() returns needsRecovery: true

CrashRecoveryDialog:
  Icon: AlertCircle (amber, 48px)
  Title: "Session Sebelumnya Tidak Ditutup"
  Description: "SION Media tidak ditutup dengan benar pada sesi terakhir."

  Recovery details card:
    Background: rgba(245,158,11,0.06), border: amber/20
    Content:
      Playlist: [playlist name or "Unknown"]
      Lagu: [song title or "Unknown"]
      Slide: [N of M]
      Status: [LIVE / CLEAR / etc.]

  Actions:
    [Pulihkan Session]  ← primary, brand-primary
    [Mulai Baru]        ← ghost

  Keyboard:
    Enter → Pulihkan Session
    Escape → Mulai Baru
```

### 9.6.2 Recovery Restoration Steps

```
User clicks "Pulihkan Session":
  1. Show loading state in dialog
  2. loadPlaylists() → find playlist by id
  3. setActivePlaylist(playlist)
  4. loadPlaylistItems(playlistId)
  5. find song in songs[] by songId
  6. setSelectedSong(song)
  7. generateSlidesForSong(song) → setSlides(slides, meta)
  8. setCurrentSlideIndex(slideIndex)
  9. markCleanExit() ← clear recovery flag
  10. Close dialog
  11. showToast("Session dipulihkan", "success")
  12. Switch to PROJECTION mode if not already

User clicks "Mulai Baru":
  1. markCleanExit()
  2. Close dialog
  3. Continue with fresh state
```

---

## 9.7 Import/Export Flow (Redesigned)

### 9.7.1 Import Screen Redesign

The current `ImportExportScreen` is functional but uses old CSS classes. Redesign to match enterprise design system.

```
Layout: Full-screen overlay (same as current)
Background: bg-base + ambient gradient

Header:
  Height: 56px
  [← Back] [Import / Export Lagu] [Hymnal selector]
  Border-bottom: border-subtle

Step 1 — File Selection:
  Two cards side by side (Import | Export)
  Import card:
    Upload icon (48px, brand-primary)
    "Import JSON / Excel"
    Drag-drop zone: dashed border, brand-primary/30
    Hover: brand-primary/10 background
    Active drag: scale(1.02), brand-primary/20 background

  Export card:
    Download icon (48px, emerald-400)
    "Export Library"
    Description text
    Click → immediate export

Step 2 — Conflict Resolution:
  Header: "N lagu ditemukan · M konflik"
  Bulk actions: [Skip All] [Overwrite All] [Merge All]
  Table: Status | No | Judul | Kategori | Resolusi
  Conflict row: amber background tint
  Resolution buttons: Skip / Timpa / Gabung (pill buttons)
  Merge preview: expandable inline panel

Footer:
  [Batal] [Impor N Lagu →]
  Import button disabled until all conflicts resolved
```

### 9.7.2 Import Progress Dialog

```
Replaces the current inline import flow with a modal:

Loading state:
  Spinner (32px, brand-primary)
  "Mengimpor lagu..."
  Progress: "N / M lagu diproses"
  Cannot be dismissed

Complete state:
  CheckCircle (48px, emerald-400)
  "Import Selesai"
  Results grid:
    [N Baru] [N Dilewati] [N Ditimpa] [N Digabung] [N Gagal]
  Error list (if any): first 10 errors, expandable
  [Tutup] button → close + reload songs
```

---

## 9.8 Emergency Presentation Flow

### 9.8.1 Emergency Scenarios

```
Scenario 1: Wrong song projected
  Action: B → black → find correct song → Space → TAKE
  Time: < 5 seconds with keyboard shortcuts

Scenario 2: Lyrics error discovered mid-service
  Action: F → freeze → edit in SongEditorScreen → save → hotSwapSlides()
  LIVE_DIRTY bar appears → Ctrl+Enter → update live
  Time: < 30 seconds

Scenario 3: Projector disconnected
  Action: "PROJECTOR LOST" badge appears in title bar
  Operator reconnects projector → projection:show → snapshot sent
  Time: automatic recovery

Scenario 4: App crash during service
  Projection window continues independently (separate process)
  Main window reloads automatically (render-process-gone handler)
  CrashRecoveryDialog appears → restore session
  Time: < 10 seconds

Scenario 5: Wrong atmosphere/background
  Action: Click "Sermon" preset → solid dark background
  Instant, no confirmation
  Time: < 1 second
```

### 9.8.2 Emergency Controls Placement

```
Always visible in Projection Mode:
  Title bar: [● LIVE/CLEAR] badge (clickable)
  Scene strip: [Black Out] [Clear] buttons (always visible)
  Keyboard: B, F, Esc (always active)

Emergency panel (new — accessible via keyboard shortcut):
  Trigger: Ctrl+Shift+E (new shortcut)
  Floating panel, z-[9999]
  Large buttons: [■ BLACK] [❄ FREEZE] [✕ CLEAR] [🔒 LOCK]
  Each button: 80px height, high contrast
  Auto-dismiss: 5 seconds after last action
```

---

## 9.9 Workflow Acceleration Strategies

### 9.9.1 Predictive UX

```
Auto-cue next song:
  When operator clicks song N in playlist:
  → Song N loads in preview (current behavior)
  → Song N+1 pre-generates slides in background (new)
  → Song N+1 appears in NEXT strip

Auto-select first song:
  When playlist loads:
  → First item auto-selected in preview
  → Operator just presses Space to go live

Search-as-you-type:
  Debounce: 300ms
  FTS5 search: < 50ms response
  Results appear without pressing Enter
  First result auto-highlighted
```

### 9.9.2 Contextual Actions

```
Right-click on song in library:
  Context menu appears at cursor
  Most common actions at top: Open, Add to Playlist
  Destructive actions at bottom: Delete

Right-click on playlist item:
  Remove from playlist
  Move to top / Move to bottom
  Edit section label
  View song info

Hover on song card:
  Quick action buttons appear (Play, Add)
  No hover delay — instant
```

### 9.9.3 Operator Assist System

```
Dirty state warning:
  When LIVE_DIRTY: amber bar appears immediately
  Cannot be missed (full-width, pulsing icon)
  Two clear actions: [Update Live] [Discard]

Projector lost warning:
  "PROJECTOR LOST" badge in title bar
  Red color, AlertTriangle icon
  Clicking opens Display Settings

Long line warning in editor:
  Lines > 40 chars: amber indicator in editor
  Count shown: "N baris panjang"
  Helps operator format lyrics for projection

Duplicate detection:
  Real-time as operator types song number/title
  Warning pill appears immediately
  Specific message: "Nomor '42' sudah digunakan oleh 'Tuhan Yesus'"
```

---

# PART 10: PAGE-BY-PAGE REDESIGN REGISTRY

## 10.1 Complete Page Registry

### PAGE-001: SplashScreen

```
Purpose: Loading gate while database initializes
File: src/renderer/src/screens/SplashScreen.tsx

Redesign Goals:
  - Premium brand moment
  - Communicates loading progress
  - Smooth transition to main app

Layout:
  Full-screen, bg-base (#0b0d14)
  Center: SION logo (64px) + "SION Media" (Poppins 28px/900)
  Below: loading message (Inter 13px/500, text-muted)
  Bottom: thin progress bar (brand-primary, animated)
  Ambient: radial glow behind logo (brand-primary/12)

Animation:
  Logo: fade in + scale(0.9→1), 600ms ease-premium
  Text: fade in, 400ms delay
  Progress bar: width 0→100%, duration matches load time
  Exit: fade out entire screen, 300ms

State:
  isLoading=true: show progress bar
  isLoading=false: trigger exit animation → show main app

Accessibility:
  role="status", aria-live="polite"
  Loading message read by screen reader
```

---

### PAGE-002: WelcomeScreen (Onboarding)

```
Purpose: First-install onboarding flow
File: src/renderer/src/screens/WelcomeScreen.tsx

Redesign Goals:
  - Premium first impression
  - Minimal steps (3 max)
  - Clear value communication

Layout:
  Full-screen, bg-base
  Ambient: blue-violet gradient top-right
  Center card: 560px wide, surface-4, radius-2xl, elevation-5

  Step 1 — Welcome:
    SION logo (48px)
    "Selamat datang di SION Media"
    Subtitle: "Platform multimedia ibadah profesional"
    [Mulai Setup →] button

  Step 2 — Theme:
    "Pilih tema tampilan"
    3 theme cards: Dark / Light / System
    Each: preview thumbnail + label
    [← Kembali] [Lanjut →]

  Step 3 — Mode:
    "Mulai dengan mode apa?"
    4 mode cards: Library / Projection / Management / Broadcast
    Each: icon + label + description
    [← Kembali] [Mulai SION Media →]

Progress indicator:
  3 dots at bottom of card
  Active: brand-primary, 8px
  Inactive: text-disabled, 6px

Animation:
  Card slides in from right on step advance
  Slides left on back
  Final step: card scales out, main app fades in
```

---

### PAGE-003: LibraryMode

```
Purpose: Song library, media management, playlist building
File: src/renderer/src/screens/modes/LibraryModeRedesigned.tsx

Redesign Goals:
  - Enterprise asset management quality
  - Fast song discovery
  - Seamless playlist building
  - Keyboard-first navigation

Layout: Standard Mode Layout (sidebar + main + inspector)
  Sidebar: 240px, library navigation
  Main: flex-1, command bar + content
  Inspector: 320px, song detail

Redesign Specifications:
  → See Part 3 (Library Mode Redesign) — complete

Key Improvements:
  - Favorite button wired (DUI-001 fix)
  - Hymnal filter in command bar
  - Context menu on right-click
  - Drag-to-playlist support
  - Notes tab functional
  - Chord tab shows key/time signature

State Visualization:
  Active playlist item: left bar brand-primary
  Favorite songs: star filled amber
  Recently played: history icon, text-muted
  No results: EmptyState component

Performance:
  Title view: virtualized for > 100 songs
  Number view: paginated (120/page)
  Playlist view: standard (max ~50 items)
```

---

### PAGE-004: ProjectionMode

```
Purpose: Live presentation control center
File: src/renderer/src/screens/modes/ProjectionMode.tsx

Redesign Goals:
  - Zero-distraction operator UI
  - All critical controls visible at all times
  - Broadcast-grade live control layout
  - Fail-safe interaction design

Layout: Projection Mode Layout
  → See Part 4 (Projection Mode Redesign) — complete

Key Improvements:
  - Resizable 3-panel bottom workspace
  - Timer controls in title bar
  - NEXT strip always visible
  - Confidence payload broadcast to stage display
  - Bible panel tab (new)
  - Announcement panel tab (new)
  - Per-mode ErrorBoundary with emergency fallback

State Visualization:
  LIVE: red border on program monitor, pulsing dot
  PREVIEW: green border on preview monitor
  NEXT: cyan strip below monitors
  LIVE_DIRTY: amber full-width bar
  PROJECTOR LOST: red badge in title bar

Critical Interactions:
  Space: TAKE (always works, no focus required)
  B: Black (always works)
  Esc: Clear (always works)
  All projection shortcuts bypass focus management
```

---

### PAGE-005: ManagementMode

```
Purpose: Content operations, system administration
File: src/renderer/src/screens/modes/ManagementMode.tsx

Redesign Goals:
  - Enterprise admin dashboard quality
  - Real data (no hardcoded metrics)
  - Full CRUD for all content types
  - Virtualized song list

Layout: Standard Mode Layout with sidebar navigation
  → See Part 5 (Management Mode Redesign) — complete

Key Improvements:
  - Real storage metric (system:get-storage-stats)
  - Real trend bars (from song_history)
  - Virtualized song list (@tanstack/react-virtual)
  - Layout toggle (table/grid)
  - Filter dropdown
  - DeleteConfirmDialog (replaces window.confirm)
  - SongRelationsModal wired
  - DuplicateSongDialog wired
  - Media Library section (new)
  - Custom Slides section (new)
  - Diagnostics section (new)

Sections:
  Songs, Hymnals, Media, Bible, Slides, Playlists,
  Settings, Backup, Diagnostics, Analytics, About
```

---

### PAGE-006: SongEditorScreen

```
Purpose: Song creation and editing
File: src/renderer/src/screens/SongEditorScreen.tsx

Redesign Goals:
  - Lyric Studio quality
  - Real-time projection preview
  - Broadcast rack status indicators
  - Atmosphere configuration

Layout: Song Editor Layout (3-column)
  Left: Metadata form (28%)
  Center: Lyrics editor (44%)
  Right: Preview + Atmosphere (28%)

Current State: Already well-implemented
  - Broadcast rack shows live status ✅
  - Duplicate detection ✅
  - Metadata validation ✅
  - hotSwapSlides() on save ✅
  - Atmosphere configuration ✅

Improvements Needed:
  - Replace window.confirm in discard dialog with ConfirmDialog
  - Add autosave indicator (currently manual save only)
  - Add "Save and continue editing" as default (currently closes)
  - Improve mobile-style form layout on narrow windows

State Visualization:
  Save state: "Tersimpan" (green) / "Belum disimpan" (amber)
  Broadcast rack: LIVE / PREVIEW / TIMER / LOCK status
  Duplicate warning: amber pill in header
  Long line warning: amber pill in header
  Validation errors: inline below field
```

---

### PAGE-007: SettingsScreen

```
Purpose: System configuration
File: src/renderer/src/screens/SettingsScreen.tsx

Redesign Goals:
  - Enterprise settings quality
  - Searchable navigation
  - Consistent with design system

Layout: Settings Layout (sidebar + content)
  → See Part 5 (Management Mode) for settings sections

Current State: Well-implemented
  - 8 sections ✅
  - Sidebar search ✅
  - Breadcrumb ✅

Improvements Needed:
  - Reseed Database: replace window.confirm with DeleteConfirmDialog
  - Add "Restore from Backup" file picker
  - Settings search should search within section content too
  - Add keyboard shortcut to open settings (Ctrl+,)

Sections:
  Display, Buku Lagu, Tampilan, Tema & Font,
  Background, Keyboard, Backup, Tentang
```

---

### PAGE-008: ImportExportScreen

```
Purpose: Song import/export
File: src/renderer/src/screens/ImportExportScreen.tsx

Redesign Goals:
  - Enterprise import workflow
  - Clear conflict resolution UX
  - Progress feedback

Layout: Full-screen overlay
  → See Part 9.7 (Import/Export Flow) — complete

Current State: Functional but uses old CSS
  - Excel + JSON import ✅
  - Conflict resolution ✅
  - Merge preview ✅

Improvements Needed:
  - Apply enterprise design system CSS
  - Add ImportProgressDialog for large imports
  - Add per-item conflict resolution (currently global only)
  - Add import history/log
```

---

### PAGE-009: BibleScreen

```
Purpose: Bible verse browsing and projection
File: src/renderer/src/screens/BibleScreen.tsx

Redesign Goals:
  - Make accessible (currently unreachable — DUI-003)
  - Integrate with Projection Mode
  - Fast verse lookup

Layout: Full-screen overlay
  Left panel: Translation + Book + Chapter navigation
  Center: Verse list (virtualized)
  Right: Preview + projection controls

Navigation:
  Translation selector: dropdown
  Book selector: searchable list
  Chapter: number grid
  Verse: click to select, shift-click for range

Projection integration:
  [Cue to Preview] button → loads verse as SlideData
  [Project Now] button → immediate TAKE
  Recent verses: last 10 projected

Entry points:
  View > Bible (Ctrl+B) ← NEW
  Projection Mode > Bible tab ← NEW
```

---

### PAGE-010: ProjectionApp (Projection Window)

```
Purpose: Audience-facing projection output
File: src/renderer/src/projection/ProjectionApp.tsx

Redesign Goals:
  - Maximum readability
  - Smooth transitions
  - Reliable rendering

Current State: Well-implemented
  - PresentationCanvas ✅
  - AtmosphereRenderer ✅
  - All transition types ✅
  - Theme updates ✅
  - Heartbeat ✅

Improvements Needed:
  - Extend to support ProjectionPayload (bible, announcement, lower-third)
  - Reduce heartbeat interval to 500ms
  - Add confidence:update listener
```

---

### PAGE-011: StageDisplayApp (Stage Window)

```
Purpose: Confidence monitor for musicians/singers
File: src/renderer/src/stageDisplay/StageDisplayApp.tsx

Redesign Goals:
  - Maximum readability at stage distance
  - Complete confidence payload support
  - Real-time timer display

Current State: Partially implemented
  - Legacy slide update listener ✅
  - State change listener ✅
  - Clock ✅
  - Timer display ✅
  - Confidence channel: TODO comment in source ⚠️

Improvements Needed:
  - Wire confidence:update channel (Phase 2 fix)
  - Apply redesigned typography (Part 8.6)
  - Add section label display
  - Add song metadata footer
  - Improve standby screen
```

---

### OVERLAY-001: CommandPalette

```
Purpose: Global search and action launcher
File: src/renderer/src/components/CommandPalette.tsx

Redesign Goals:
  - Fast, keyboard-first
  - Context-aware results
  - Dangerous commands clearly marked

Layout: → See Part 2.3 (Command Palette Redesign)

State:
  Empty: recent commands shown
  Typing: filtered results
  No results: "Tidak ada hasil untuk '[query]'"
  Dangerous command: rose-400 icon, warning label
```

---

### OVERLAY-002: QuickJumpOverlay

```
Purpose: Semantic slide navigation during live presentation
File: src/renderer/src/components/QuickJumpOverlay.tsx

Redesign Goals:
  - Instant navigation
  - Section-aware
  - Minimal cognitive load

Layout: → See Part 4.8 (Quick Jump Overlay Redesign)

State:
  mode="preview": navigates preview only (safe)
  mode="live": navigates live output (dangerous, amber border)
  No slides: "Tidak ada slide dimuat"
```

---

### OVERLAY-003: RuntimeInspector

```
Purpose: Developer/operator diagnostic panel
File: src/renderer/src/components/RuntimeInspector.tsx

Redesign Goals:
  - Broadcast-grade diagnostics
  - Real-time command log
  - IPC health visualization

Layout: Right drawer, 480px
  Tabs: [Commands | Logs | Health | State]

  Commands tab:
    Event log from commandBus.getEventLog()
    Each: timestamp + source + command + status + duration
    Color: green=SUCCESS, amber=BLOCKED, red=ERROR
    Filter: All / Success / Blocked / Error

  Logs tab:
    Structured log from logger.getBuffer()
    Each: timestamp + module + level + message
    Color: blue=INFO, amber=WARN, red=ERROR

  Health tab:
    Endpoint grid from useHealthStore
    Each: status dot + name + last seen + latency
    PROJECTION_WINDOW: special prominence

  State tab:
    Projection store snapshot
    Key values: projectionState, programLockState, slideIndex, nextReadyState
    Timer: elapsed + running
```

---

### OVERLAY-004: KeyboardCheatSheet

```
Purpose: Keyboard shortcut reference
File: src/renderer/src/components/KeyboardCheatSheet.tsx

Redesign Goals:
  - Scannable at a glance
  - Grouped by context
  - Printable

Layout: Centered modal, 640px
  Title: "Keyboard Shortcuts"
  Sections: Global / Projection / Library / Navigation
  Each shortcut: [Kbd] [Description]
  Two-column layout within each section
  Footer: "Press ? to toggle"
```

---

## 10.2 Floating Panel Registry

### PANEL-001: NotificationPanel

```
Type: Right drawer
Width: 360px
Trigger: Bell icon in title bar
Content: Notification list (import results, backup results, system events)
→ See Part 2.3 (Notification Panel)
```

### PANEL-002: FilterDropdown (Management)

```
Type: Floating dropdown
Width: 280px
Trigger: Filter button in Management command bar
Content: Category checkboxes, Author filter, Key filter, Status filter
Apply: [Apply Filters] button
Clear: [Clear All] link
Active filters: shown as chips in command bar
```

### PANEL-003: PlaylistPickerDialog

```
Type: Modal (sm, 400px)
Trigger: Playlist selector in Projection Mode, "Add to Playlist" context menu
Content: List of playlists with song count
Actions: [Select] per playlist, [+ New Playlist] at bottom
```

---

## 10.3 Subpage Registry

### SUBPAGE-001: Library Workspaces

```
All Songs:        Full song database, 3 view modes
Playlist Saya:    Worship rundown builder
Favorit:          Filtered favorites
Recently Opened:  Song history
Hymnals:          Hymnal browser
Tags & Themes:    Tag cloud + filtered view
Collections:      Media collections (stub → Phase 5)
Practice Tools:   Coming soon
Chord Charts:     Coming soon
Vocal Guide:      Coming soon
```

### SUBPAGE-002: Management Sections

```
Songs:       Song CRUD, bulk ops, metadata
Hymnals:     Hymnal management
Media:       Media asset management (new)
Bible:       Bible translation management (new)
Slides:      Custom slides management (new)
Playlists:   Playlist management (new)
Settings:    System configuration
Backup:      Database backup/restore
Diagnostics: System health, IPC health
Analytics:   Usage statistics (new)
About:       App info
```

### SUBPAGE-003: Settings Sections

```
Display:     Monitor & Proyektor
Buku Lagu:   Kategori & Koleksi
Tampilan:    UI/UX & Layout
Tema & Font: Warna & Tipografi
Background:  Wallpaper & Visual
Keyboard:    Shortcut & Hotkey
Backup:      Cadangan & Restore
Tentang:     Informasi Aplikasi
```

---

# PART 11: DESIGN-TO-ENGINEERING HANDOFF

## 11.1 Implementation Strategy

### 11.1.1 Infrastructure-First Principle

All UI modernization must be built on top of the Phase 2 functional refactor. The implementation order is:

```
Phase 2 Sprint 0 (infrastructure) → must complete first
  useModalStore, useServiceStore, useNotificationStore
  New IPC channels, migrations
  Timer tick hook

Phase 2 Sprint 1 (critical dead UI) → must complete before UI work
  Favorite button, theme button, Bible access
  Storage metric fix, timer controls

Phase 2 Sprint 2 (modal system) → enables all modal UI
  Modal base component, DeleteConfirmDialog, CreatePlaylistDialog

Then Phase 3 UI work begins:
  Sprint A: Design system CSS consolidation
  Sprint B: Library Mode improvements
  Sprint C: Projection Mode improvements
  Sprint D: Management Mode improvements
  Sprint E: Advanced features
```

### 11.1.2 Component Migration Order

```
Priority 1 — Shared infrastructure (used everywhere):
  Button component (replaces ad-hoc button styles)
  Input component (replaces ad-hoc input styles)
  Badge component (replaces ad-hoc badge styles)
  EmptyState component (already exists, standardize usage)
  SearchInput component (replaces duplicated search inputs)

Priority 2 — Modal system:
  Modal base component
  ConfirmDialog
  CreatePlaylistDialog
  CrashRecoveryDialog
  ModalRegistry (mount in App.tsx)

Priority 3 — Mode-specific:
  Library Mode: favorite button, context menu, hymnal filter
  Projection Mode: resizable panels, timer controls, NEXT strip
  Management Mode: virtualized list, real metrics, filter dropdown

Priority 4 — New pages/panels:
  Bible panel in Projection Mode
  Announcement panel in Projection Mode
  Media Library section in Management Mode
  Notification panel
```

### 11.1.3 Runtime-Safe Rollout

```
Rule: Never break the projection runtime during UI changes

Safe changes (can deploy anytime):
  - CSS-only changes (colors, spacing, typography)
  - New components that don't touch projection store
  - New IPC channels (additive)
  - New modals (additive)

Requires testing before deploy:
  - Changes to LivePreviewPanel
  - Changes to PresentationCanvas
  - Changes to useProjectionStore
  - Changes to RuntimeCommandBus handlers

Requires staging environment:
  - Changes to IPC handlers
  - Changes to database.ts
  - Changes to migrations.ts
  - Changes to windows.ts
```

---

## 11.2 Visual QA System

### 11.2.1 Consistency Validation Checklist

```
For every new component:
  □ Uses design tokens (no hardcoded colors)
  □ Uses spacing scale (no arbitrary px values)
  □ Uses typography scale (no arbitrary font sizes)
  □ Has all 5 interactive states (default/hover/active/focus/disabled)
  □ Has loading state (if async)
  □ Has error state (if can fail)
  □ Has empty state (if can be empty)
  □ Matches elevation level for its z-index
  □ Uses correct glow color for its semantic meaning
  □ Animation tier matches interaction importance

For every new page/mode:
  □ Has ambient background layer
  □ Uses correct layout template
  □ Has command bar with search
  □ Has empty state for no data
  □ Has loading skeleton
  □ Has error boundary
  □ Keyboard shortcuts registered
  □ IPC calls have error handling
```

### 11.2.2 Accessibility Validation

```
Automated checks (can run in CI):
  □ All images have alt text
  □ All form inputs have labels
  □ Color contrast ratio ≥ 4.5:1 for normal text
  □ Color contrast ratio ≥ 3:1 for large text
  □ No keyboard traps (except intentional modal traps)
  □ Focus order is logical

Manual checks (require human testing):
  □ All interactive elements reachable by Tab
  □ All interactive elements activatable by Enter/Space
  □ Modals trap focus correctly
  □ Escape closes modals/dropdowns
  □ Screen reader announces state changes
  □ prefers-reduced-motion respected
```

### 11.2.3 Projection Validation

```
Test on actual projector or display:
  □ Text readable at 5m, 10m, 15m
  □ Transitions smooth (no flicker)
  □ Black state is truly black
  □ Safe zone respected (no content at edges)
  □ Atmosphere transitions don't distract from text
  □ Stage display readable at 5m in lit room
  □ All 4 transition types work correctly
  □ Logo positioning correct

Test with multiple monitors:
  □ Projection window appears on external display
  □ Stage display appears on third display (or primary fallback)
  □ Display count updates in title bar
  □ Reconnect after disconnect works
  □ Snapshot sent on reconnect
```

### 11.2.4 Multi-Monitor Validation

```
Scenarios to test:
  1. Single monitor: projection window on primary (simulation mode)
  2. Dual monitor: projection on external, operator on primary
  3. Triple monitor: projection + stage display + operator
  4. Disconnect external: "PROJECTOR LOST" badge appears
  5. Reconnect external: projection window moves, snapshot sent
  6. DPI mismatch: 100% primary + 150% external
```

---

## 11.3 Developer Handoff

### 11.3.1 Component Dependency Map

```
App.tsx
  ├── TitleBar
  │   ├── TitleBarIdentity
  │   ├── TitleBarMenu (uses useAppStore, useModeStore, useProjectionStore, usePlaylistStore)
  │   ├── TitleBarModeSwitcher (uses useModeStore)
  │   ├── TitleBarStatus (uses useAppStore, useProjectionStore, useModeStore)
  │   │   └── Timer controls (uses useProjectionStore.timerElapsed/Running/Start/Stop/Reset)
  │   ├── TitleBarUtilityButtons (uses useModeStore, useAppStore, useNotificationStore)
  │   └── TitleBarControls (uses useAppStore.isMaximized)
  ├── ModalRegistry (uses useModalStore)
  │   ├── Modal (base)
  │   ├── ConfirmDialog
  │   ├── CreatePlaylistDialog (uses usePlaylistStore)
  │   ├── CrashRecoveryDialog (uses useAppStore, usePlaylistStore, useProjectionStore)
  │   └── [other modals]
  ├── Toast (uses useAppStore.toast)
  ├── CommandPalette (uses commandBus.getPaletteCommands())
  ├── KeyboardCheatSheet
  ├── QuickJumpOverlay (uses useProjectionStore)
  ├── RuntimeInspector (uses commandBus, useHealthStore, useProjectionStore)
  └── Mode Content (AnimatePresence)
      ├── LibraryMode
      │   ├── LibrarySidebar
      │   ├── LibraryCommandBar (uses useAppStore, useHymnalStore)
      │   ├── LibraryContent (uses useSongStore, usePlaylistStore)
      │   └── LibraryInspector (uses useSongStore)
      ├── ProjectionMode
      │   ├── LivePreviewPanel (uses useProjectionStore, useAppStore, useAtmosphereStore)
      │   │   ├── MonitorFrame → PresentationCanvas → AtmosphereRenderer
      │   │   ├── TransitionColumn (uses useProjectionStore, commandBus)
      │   │   └── AudioOutputPanel (uses useProjectionStore timer)
      │   ├── SongLibraryPanel (uses useAppStore, useProjectionStore)
      │   ├── PlaylistPanel (uses usePlaylistStore, useProjectionStore)
      │   └── SongInfoPanel (uses useAppStore, usePlaylistStore, useProjectionStore)
      └── ManagementMode
          ├── ManagementSidebar
          ├── ManagementHeader
          ├── MetricGrid (uses useSongStore, useHymnalStore, system:get-storage-stats)
          ├── SongBrowser (uses useSongStore, useVirtualizer)
          └── SongInspector (uses useSongStore)
```

### 11.3.2 Interaction Mapping

```
User Action → Store Action → IPC → DB → Store Update → Re-render

Favorite toggle:
  Click star → useSongStore.toggleFavorite(id)
    → optimistic: flip is_favorite in songs[]
    → window.api.songs.toggleFavorite(id)
    → IPC: db:toggle-favorite
    → database.toggleFavorite(id)
    → return updated song
    → songs[] updated (or rollback on error)

Create playlist:
  Click + New → useModalStore.openAsync('create-playlist')
    → CreatePlaylistDialog renders
    → User fills form → submit
    → usePlaylistStore.createPlaylist(name, date)
    → window.api.playlists.add({name, service_date})
    → IPC: db:add-playlist
    → database.addPlaylist()
    → return new Playlist
    → playlists[] updated, activePlaylist set
    → modal resolves(playlist), closes

TAKE (Space key):
  keydown Space → useGlobalShortcuts handler
    → executeRuntimeCommand('PROJ_TAKE_CUE', undefined, 'KEYBOARD')
    → commandBus.execute(command)
    → validator: check programLockState
    → handler: useProjectionStore.takeCue()
    → goToSlide(currentSlideIndex)
    → set programSlide, programLockState='LIVE_LOCK'
    → sendLiveSlide(slideData)
    → window.api.projection.slideUpdate(slideData)
    → IPC: projection:slide-update
    → main: updateSlideData(slideData)
    → projectionWindow.webContents.send('projection:slide-update', slideData)
    → ProjectionApp receives → PresentationCanvas renders
```

### 11.3.3 Modal Mapping

```
Modal ID              → Component                → Trigger
─────────────────────────────────────────────────────────────────────
create-playlist       → CreatePlaylistDialog     → File>New Playlist, + button
confirm-delete        → ConfirmDialog            → Any delete action
crash-recovery        → CrashRecoveryDialog      → App startup (needsRecovery)
song-relations        → SongRelationsModal        → Management "Relasi" button
import-progress       → ImportProgressDialog      → Import submit
integrity-check       → IntegrityCheckDialog      → Tools>Integrity Check
bible-picker          → BiblePickerDialog         → Projection Bible tab
announcement-editor   → AnnouncementEditor        → Projection Announcements tab
media-import          → MediaImportDialog         → Media>Import Assets
duplicate-song        → DuplicateSongDialog       → Management "Duplikat" button
notification-panel    → NotificationPanel         → Bell icon (drawer, not modal)
filter-dropdown       → FilterDropdown            → Management Filter button
playlist-picker       → PlaylistPickerDialog      → "Add to Playlist" context menu
export-song           → ExportSongDialog          → Management "Export" button
storage-stats         → StorageStatsDialog        → Management storage metric click
hymnal-integrity      → HymnalIntegrityDialog     → Management integrity check
backup-progress       → BackupProgressDialog      → File>Backup Database
```

### 11.3.4 State Dependency Mapping

```
Component                 → Stores Subscribed
─────────────────────────────────────────────────────────────────────
TitleBarStatus            → useProjectionStore(projectionState, timerElapsed, timerRunning)
                            useAppStore(displayCount, isProjectionVisible, isFocusMode)
                            useModeStore(currentMode)

LivePreviewPanel          → useProjectionStore(slides, currentSlideIndex, programSlide,
                              programSlides, programSlideIndex, projectionState,
                              programLockState, hasPendingLiveChanges, nextSlideData,
                              nextReadyState, cuedSongBackgroundConfig, programSongBackgroundConfig)
                            useAppStore(displayCount, isFocusMode, isProjectionVisible)
                            useAtmosphereStore(liveOverride)

SongLibraryPanel          → useAppStore(songs, selectedSong, searchQuery, activeFilter)
                            useHymnalStore(hymnals, selectedHymnalId)

PlaylistPanel             → usePlaylistStore(playlists, activePlaylist, playlistItems, activeItemIndex)
                            useProjectionStore(programSlide)

ManagementMode            → useSongStore(songs, selectedSong)
                            useHymnalStore(hymnals, selectedHymnalId)
                            useDisplayStore(memoryInfo)

LibraryMode               → useSongStore(songs, selectedSong)
                            useHymnalStore(hymnals, selectedHymnalId)
                            usePlaylistStore(playlists, activePlaylist, playlistItems)
```

---

## 11.4 CSS Architecture Handoff

### 11.4.1 CSS File Organization

```
src/renderer/src/assets/main.css
├── @import 'tailwindcss'
├── @theme { ... }                    ← Design tokens (Tailwind v4)
├── /* Global resets + scrollbar */
├── /* Title bar system */
├── /* Library Mode */
├── /* Projection Mode */
│   ├── .projection-command-center
│   ├── .broadcast-monitor
│   ├── .transition-rack
│   ├── .output-rack
│   ├── .projection-scene-strip
│   ├── .projection-next-strip
│   └── .projection-dirty-bar
├── /* Management Mode */
├── /* Song Editor */
├── /* Settings */
├── /* Modal system */           ← NEW
├── /* Notification panel */     ← NEW
├── /* Overlay components */
└── /* Utility classes */
```

### 11.4.2 Tailwind vs Custom CSS Decision Matrix

```
Use Tailwind utilities for:
  Layout: flex, grid, gap, padding, margin, width, height
  Typography: text-*, font-*, leading-*, tracking-*
  Colors: bg-*, text-*, border-* (using design tokens)
  Responsive: sm:, md:, lg: prefixes
  States: hover:, focus:, active:, disabled:

Use custom CSS for:
  Complex multi-property transitions (5+ properties)
  Pseudo-elements (::before, ::after)
  Complex gradients (3+ stops, radial, aurora)
  Animation keyframes
  Mode-specific component styles (.broadcast-monitor, .management-studio)
  Glassmorphism effects (backdrop-filter + rgba)
  CSS custom property calculations
```

### 11.4.3 New CSS Classes Required

```
Modal system:
  .modal-backdrop          ← rgba overlay
  .modal-container         ← floating panel
  .modal-header            ← title + close
  .modal-body              ← scrollable content
  .modal-footer            ← action buttons
  .modal-container--sm/md/lg/xl/full

Notification panel:
  .notification-panel      ← right drawer
  .notification-item       ← individual notification
  .notification-item--unread
  .notification-badge      ← count badge on bell

Stage display:
  .stage-display-root      ← full screen
  .stage-display-topbar    ← clock/timer/status
  .stage-display-main      ← current + next content
  .stage-display-footer    ← song info

Lower third:
  .lower-third             ← projection overlay
  .lower-third__primary    ← main text
  .lower-third__secondary  ← subtitle text
```

---

## APPENDIX A: Complete New File List (Phase 3)

```
New CSS classes to add to main.css:
  Modal system classes
  Notification panel classes
  Stage display redesign classes
  Lower third classes
  Filter dropdown classes

New components to create:
  src/renderer/src/components/modals/Modal.tsx
  src/renderer/src/components/modals/ConfirmDialog.tsx
  src/renderer/src/components/modals/CreatePlaylistDialog.tsx
  src/renderer/src/components/modals/CrashRecoveryDialog.tsx
  src/renderer/src/components/modals/SongRelationsModal.tsx
  src/renderer/src/components/modals/ImportProgressDialog.tsx
  src/renderer/src/components/modals/ModalRegistry.tsx
  src/renderer/src/components/modals/index.ts
  src/renderer/src/components/design-system/Button.tsx
  src/renderer/src/components/design-system/Input.tsx
  src/renderer/src/components/design-system/Badge.tsx
  src/renderer/src/components/design-system/SearchInput.tsx
  src/renderer/src/components/design-system/SegmentedControl.tsx
  src/renderer/src/components/design-system/MetricCard.tsx
  src/renderer/src/components/NotificationPanel.tsx
  src/renderer/src/components/LowerThird.tsx

Files to modify (UI improvements):
  src/renderer/src/App.tsx
  src/renderer/src/components/titlebar/TitleBar.tsx
  src/renderer/src/components/titlebar/TitleBarMenu.tsx
  src/renderer/src/components/titlebar/TitleBarStatus.tsx
  src/renderer/src/components/LivePreviewPanel.tsx
  src/renderer/src/screens/modes/LibraryModeRedesigned.tsx
  src/renderer/src/screens/modes/ProjectionMode.tsx
  src/renderer/src/screens/modes/ManagementMode.tsx
  src/renderer/src/screens/SongEditorScreen.tsx
  src/renderer/src/screens/ImportExportScreen.tsx
  src/renderer/src/stageDisplay/StageDisplayApp.tsx
```

---

## APPENDIX B: Design Token Quick Reference

```
SURFACES:
  bg-base:          #0d0f17   page canvas
  bg-surface:       #151826   cards, panels
  bg-elevated:      #1b2031   floating elements
  bg-active:        #2d3450   selected state
  glass-bg:         rgba(17,19,28,0.72)  glass panels
  glass-bg-strong:  rgba(17,19,28,0.92)  strong glass

BRAND:
  brand-primary:    #3b82f6   primary actions
  brand-secondary:  #8b5cf6   secondary
  brand-accent:     #f59e0b   warnings
  accent:           #38bdf8   info/next

LIVE STATES:
  program:          #ff3b30   LIVE output
  preview:          #34c759   preview output
  next-blue:        #38bdf8   NEXT state

TEXT:
  text-primary:     #f8fafc   headings, data
  text-secondary:   #94a3b8   body, labels
  text-muted:       #64748b   help, timestamps
  text-disabled:    #475569   disabled

BORDERS:
  border-subtle:    rgba(255,255,255,0.06)
  border-default:   rgba(255,255,255,0.08)
  border-strong:    rgba(255,255,255,0.12)
  border-brand:     rgba(59,130,246,0.4)

ANIMATION:
  ease-out-expo:    cubic-bezier(0.16, 1, 0.3, 1)
  ease-premium:     cubic-bezier(0.22, 1, 0.36, 1)
  duration-fast:    150ms
  duration-normal:  200ms
  duration-slow:    300ms
  duration-slower:  400ms
```

---

_Document: Phase 3 UI Modernization System — Parts 7-11_  
_SION Media Enterprise Transformation_  
_Generated: May 2026_  
_Status: Implementation-Ready UI Architecture_
