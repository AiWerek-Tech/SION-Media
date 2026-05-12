# SION Media — Feature Gap Analysis

> **Date**: May 2026 | **Version**: 2.1 | **Competitors**: ProPresenter, EasyWorship, vMix

---

## 2.1 Competitor Comparison Matrix

| Feature                  | ProPresenter           | EasyWorship  | vMix              | SION Media           | Priority     |
| ------------------------ | ---------------------- | ------------ | ----------------- | -------------------- | ------------ |
| **Platform**             | Mac + Win              | Win only     | Win only          | Cross-platform       | ✅ Advantage |
| **Bible Module**         | ✅ (multi-translation) | ✅           | ✅ (CGI titles)   | ❌                   | 🔴 P1        |
| **Announcement Loops**   | ✅ (Presentations)     | ✅           | ✅ (Playlist)     | ❌                   | 🟠 P1        |
| **NDI Output**           | ✅                     | ✅           | ✅ (send+receive) | ❌ (planned)         | 🟠 P1        |
| **Stage Display**        | ✅                     | ✅           | ✅ (Multi-view)   | ✅                   | ✅ Parity    |
| **SongSelect/CCLI**      | ✅                     | ✅           | N/A               | ❌                   | 🟡 P2        |
| **Planning Center**      | ✅                     | ❌           | N/A               | ❌                   | 🟡 P2        |
| **Alpha Keying**         | ✅ (3 types)           | ❌           | ✅ (Chroma)       | ❌                   | 🟠 P1        |
| **Layer/Looks System**   | ✅ (per-layer)         | ❌           | ✅ (8 overlays)   | ❌ (state-based)     | 🟠 P1        |
| **Custom Transitions**   | ✅                     | ❌           | ✅ (Stinger)      | Partial (5 built-in) | 🟡 P2        |
| **Audio Playback**       | ✅ (16ch routing)      | ✅           | ✅ (VST3)         | ❌                   | 🟢 P3        |
| **Presenter Remote**     | ❌                     | ✅ (USB/BT)  | ✅ (MIDI/X-Keys)  | ❌ (keyboard only)   | 🟡 P2        |
| **Customizable Hotkeys** | ✅                     | ✅           | ✅                | ❌ (hardcoded)       | 🟡 P2        |
| **Countdown Timer**      | ✅                     | ❌           | ✅                | ❌                   | 🟡 P2        |
| **Lower Thirds/Ticker**  | ✅                     | ❌           | ✅ (CGI)          | ❌                   | 🟡 P2        |
| **Cloud Sync**           | ✅                     | ❌           | ❌                | ❌                   | 🟢 P3        |
| **Price**                | Subscription           | Subscription | One-time          | Free (OSS)           | ✅ Advantage |

---

## 2.2 Key Feature Gaps (Prioritized)

### 🔴 P1 — High Priority

1. **Bible Module**
   - **Competitors**: ProPresenter, EasyWorship, vMix all have it
   - **Impact**: Every competitor has Bible support — highest-impact missing feature for church users
   - **Use Case**: Scripture reading during service, verse projection
   - **Implementation Complexity**: Medium (DB schema + UI + projection)

2. **Announcement / Custom Slides**
   - **Competitors**: ProPresenter (Presentations), EasyWorship (Announcement Loops)
   - **Impact**: Common church need for pre/post service announcements
   - **Use Case**: Auto-cycling slides before/after service
   - **Implementation Complexity**: Low (new table + playlist integration)

3. **NDI Output**
   - **Competitors**: vMix, EasyWorship, ProPresenter all support NDI
   - **Impact**: Essential for Broadcast Mode integration with vMix/OBS
   - **Use Case**: Send lyrics to professional production switcher
   - **Implementation Complexity**: Medium (NDI library + capture logic)

4. **Alpha Key / Transparent Output**
   - **Competitors**: ProPresenter (Alpha Key), vMix (Chroma Key)
   - **Impact**: Required for professional overlay on live video
   - **Use Case**: Overlay lyrics on top of live camera feed in vMix/OBS
   - **Implementation Complexity**: Low (Electron `transparent: true` + NDI alpha)

5. **Layer-Based Looks System**
   - **Competitors**: ProPresenter (per-layer visibility), vMix (8 overlay channels)
   - **Impact**: Current state-based approach (LIVE/BLACK/FREEZE) is too coarse
   - **Use Case**: Different layer combinations for different service segments
   - **Implementation Complexity**: High (new architecture + UI)

---

### 🟡 P2 — Medium Priority

6. **SongSelect / CCLI Integration**
   - **Competitors**: EasyWorship, ProPresenter
   - **Impact**: Industry standard for worship song licensing
   - **Use Case**: Import songs directly from CCLI database, track usage for reporting
   - **Implementation Complexity**: Medium (API integration + licensing)

7. **Planning Center Integration**
   - **Competitors**: ProPresenter has direct integration
   - **Impact**: Major workflow integration for service planning
   - **Use Case**: Import service plans as playlists, sync arrangements
   - **Implementation Complexity**: Medium (OAuth2 + API)

8. **Presenter Remote / MIDI Support**
   - **Competitors**: EasyWorship (USB clicker), vMix (MIDI, X-Keys)
   - **Impact**: Basic usability expectation for presenters
   - **Use Case**: USB clicker for next/previous slide, MIDI for advanced control
   - **Implementation Complexity**: Medium (HID detection + MIDI library)

9. **Customizable Keyboard Shortcuts**
   - **Competitors**: EasyWorship, vMix, ProPresenter
   - **Impact**: Power user feature for personalized workflows
   - **Use Case**: Remap shortcuts to user preference
   - **Implementation Complexity**: Low (settings UI + key mapping)

10. **Countdown Timer on Projection**
    - **Competitors**: vMix (CGI titles), ProPresenter
    - **Impact**: Useful for service timing and transitions
    - **Use Case**: Countdown to service start, timer between songs
    - **Implementation Complexity**: Low (overlay component + timer logic)

11. **Lower Thirds / Ticker Mode**
    - **Competitors**: vMix (CGI titles with ticker), ProPresenter
    - **Impact**: Professional broadcast feature
    - **Use Case**: Scrolling announcements, lower third overlays
    - **Implementation Complexity**: Medium (overlay system + animation)

---

### 🟢 P3 — Low Priority (Future)

12. **Audio Playback / Routing**
    - **Competitors**: ProPresenter (16ch), EasyWorship, vMix (VST3)
    - **Impact**: Advanced feature — not core to presentation
    - **Use Case**: Play background audio, route to different outputs
    - **Implementation Complexity**: High (audio engine + routing UI)

13. **Cloud Sync**
    - **Competitors**: ProPresenter
    - **Impact**: Convenience feature for multi-device workflows
    - **Use Case**: Sync database between computers via cloud storage
    - **Implementation Complexity**: Medium (cloud API + sync logic)

---

## 2.3 Competitive Advantages

| Advantage                   | Description                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Cross-Platform**          | Electron-based — runs on Windows, macOS, Linux                                  |
| **Free & Open Source**      | No subscription fees — competitors charge $400-500/year                         |
| **Multi-Hymnal Support**    | Built-in support for multiple hymnals (ProPresenter has libraries, not hymnals) |
| **Offline-First**           | Self-hosted fonts via @fontsource, no internet required                         |
| **Lightweight**             | Electron app but optimized, < 300MB typical memory usage                        |
| **Indonesian Localization** | Native Indonesian UI (competitors are English-first)                            |

---

## 2.4 Unique Features (Not in Competitors)

| Feature                     | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| **Hot-Swap Lyrics Editing** | Edit song lyrics live while projecting — changes apply instantly |
| **Crash Recovery**          | Auto-saves session state, restores on restart after crash        |
| **Custom Slide Engine**     | Smart line wrapping and slide balancing for optimal readability  |
| **Focus Live Mode**         | Minimalist projection-only UI for distraction-free operation     |
| **Command Palette**         | Global search overlay (Ctrl+K) for quick navigation              |

---

## 2.5 Recommended Feature Prioritization

### Phase 1 (Sprint 3-4) — Core Parity

1. Bible Module
2. Announcement Slides
3. NDI Output
4. Alpha Key Support

### Phase 2 (Sprint 5-6) — Broadcast Enhancement

1. Layer-Based Looks
2. Custom Transitions (Stinger)
3. Countdown Timer
4. Lower Thirds

### Phase 3 (Sprint 7-8) — Integration & UX

1. SongSelect/CCLI
2. Planning Center
3. Presenter Remote/MIDI
4. Customizable Shortcuts

### Phase 4 (Future) — Advanced

1. Audio Playback
2. Cloud Sync
3. Multi-language Bible
4. Advanced NDI (multi-output)
