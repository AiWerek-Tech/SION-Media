# SION Media — Feature Gap Analysis

> **Date**: 2026-05-23 (Updated) | **Version**: 2.2 | **Competitors**: ProPresenter, EasyWorship, vMix

---

## 2.1 Competitor Comparison Matrix

| Feature                  | ProPresenter           | EasyWorship  | vMix              | SION Media            | Priority     |
| ------------------------ | ---------------------- | ------------ | ----------------- | --------------------- | ------------ |
| **Platform**             | Mac + Win              | Win only     | Win only          | Cross-platform        | ✅ Advantage |
| **Bible Module**         | ✅ (multi-translation) | ✅           | ✅ (CGI titles)   | ✅ (implemented v1.0) | ✅ Parity    |
| **Announcement Loops**   | ✅ (Presentations)     | ✅           | ✅ (Playlist)     | ✅ (implemented v1.0) | ✅ Parity    |
| **NDI Output**           | ✅                     | ✅           | ✅ (send+receive) | ❌ (planned P1)       | 🟠 P1        |
| **Stage Display**        | ✅                     | ✅           | ✅ (Multi-view)   | ✅                    | ✅ Parity    |
| **SongSelect/CCLI**      | ✅                     | ✅           | N/A               | ❌                    | 🟡 P2        |
| **Planning Center**      | ✅                     | ❌           | N/A               | ❌                    | 🟡 P2        |
| **Alpha Keying**         | ✅ (3 types)           | ❌           | ✅ (Chroma)       | ❌                    | 🟠 P1        |
| **Layer/Looks System**   | ✅ (per-layer)         | ❌           | ✅ (8 overlays)   | ❌ (state-based)      | 🟠 P1        |
| **Custom Transitions**   | ✅                     | ❌           | ✅ (Stinger)      | Partial (5 built-in)  | 🟡 P2        |
| **Audio Playback**       | ✅ (16ch routing)      | ✅           | ✅ (VST3)         | ❌                    | 🟢 P3        |
| **Presenter Remote**     | ❌                     | ✅ (USB/BT)  | ✅ (MIDI/X-Keys)  | ❌ (keyboard only)    | 🟡 P2        |
| **Customizable Hotkeys** | ✅                     | ✅           | ✅                | ❌ (hardcoded)        | 🟡 P2        |
| **Countdown Timer**      | ✅                     | ❌           | ✅                | ❌                    | 🟡 P2        |
| **Lower Thirds/Ticker**  | ✅                     | ❌           | ✅ (CGI)          | ❌                    | 🟡 P2        |
| **Cloud Sync**           | ✅                     | ❌           | ❌                | ❌                    | 🟢 P3        |
| **Price**                | Subscription           | Subscription | One-time          | Free (OSS)            | ✅ Advantage |

---

## 2.2 Key Feature Gaps (Prioritized)

### ✅ Sudah Diimplementasikan (Sebelumnya Gap)

1. **Bible Module** ✅ — Implemented v1.0
   - Bible translations, books, verses di SQLite
   - Verse range queries, full-text search
   - BibleScreen UI + BiblePanel di projection mode
   - Ctrl+B shortcut + View menu entry

2. **Announcement / Custom Slides** ✅ — Implemented v1.0
   - Custom slides (announcement, liturgy, welcome, offering, custom)
   - Slide groups dengan loop interval
   - Full CRUD + group management IPC
   - AnnouncementPanel di projection mode

---

### 🟠 P1 — High Priority (Belum Diimplementasikan)

3. **NDI Output**
   - **Competitors**: vMix, EasyWorship, ProPresenter all support NDI
   - **Impact**: Essential untuk Broadcast Mode integration dengan vMix/OBS
   - **Use Case**: Send lyrics ke professional production switcher
   - **Implementation Complexity**: Medium (NDI library + capture logic)

4. **Alpha Key / Transparent Output**
   - **Competitors**: ProPresenter (Alpha Key), vMix (Chroma Key)
   - **Impact**: Required untuk professional overlay on live video
   - **Use Case**: Overlay lyrics di atas live camera feed di vMix/OBS
   - **Implementation Complexity**: Low (Electron `transparent: true` + NDI alpha)

5. **Layer-Based Looks System**
   - **Competitors**: ProPresenter (per-layer visibility), vMix (8 overlay channels)
   - **Impact**: Current state-based approach (LIVE/BLACK/FREEZE) terlalu kasar
   - **Use Case**: Different layer combinations untuk different service segments
   - **Implementation Complexity**: High (new architecture + UI)

---

### 🟡 P2 — Medium Priority (Belum Diimplementasikan)

6. **SongSelect / CCLI Integration**
   - Industry standard untuk worship song licensing
   - Import songs langsung dari CCLI database, track usage

7. **Planning Center Integration**
   - Import service plans sebagai playlists, sync arrangements

8. **Presenter Remote / MIDI Support**
   - USB clicker untuk next/previous slide, MIDI untuk advanced control

9. **Customizable Keyboard Shortcuts**
   - Remap shortcuts ke user preference (saat ini hardcoded)

10. **Countdown Timer on Projection**
    - Countdown ke service start, timer antar lagu

11. **Lower Thirds / Ticker Mode**
    - Scrolling announcements, lower third overlays

12. **Role-Based Safety Mode (Operator vs Admin)**
    - Guard untuk aksi destruktif (reseed, restore, mass delete)
    - Lihat: `02-planning/plan-roadmap-audit-hardening-v1.md`

13. **Auto-Backup Scheduler + Retention Policy**
    - Backup otomatis terjadwal dengan retention policy
    - Lihat: `02-planning/plan-roadmap-audit-hardening-v1.md`

---

### 🟢 P3 — Low Priority (Future)

14. **Audio Playback / Routing**
    - Background audio, routing ke different outputs

15. **Cloud Sync**
    - Sync database antar komputer via cloud storage

16. **Firebase Integration**
    - Stub sudah ada di `infrastructure/firebase/`

---

## 2.3 Competitive Advantages

| Advantage                   | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| **Cross-Platform**          | Electron-based — runs on Windows, macOS, Linux          |
| **Free & Open Source**      | No subscription fees — competitors charge $400-500/year |
| **Multi-Hymnal Support**    | Built-in support for multiple hymnals (LS, SDAH, dll)   |
| **Offline-First**           | Self-hosted fonts via @fontsource, no internet required |
| **Lightweight**             | < 300MB typical memory usage                            |
| **Indonesian Localization** | Native Indonesian UI (competitors are English-first)    |
| **Bible Module**            | Multi-translation Bible dengan full-text search ✅      |
| **Announcement System**     | Custom slides dengan auto-cycling dan slide groups ✅   |

---

## 2.4 Unique Features (Not in Competitors)

| Feature                     | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| **Hot-Swap Lyrics Editing** | Edit song lyrics live while projecting — changes apply instantly  |
| **Crash Recovery**          | Auto-saves session state, restores on restart after crash         |
| **Custom Slide Engine**     | Smart line wrapping and slide balancing untuk optimal readability |
| **Focus Live Mode**         | Minimalist projection-only UI untuk distraction-free operation    |
| **Command Palette**         | Global search overlay (Ctrl+K) untuk quick navigation             |
| **DEOS Verification**       | Deterministic Execution Oracle System untuk projection safety     |
| **Runtime Inspector**       | Tabbed console (EVENTS/HEALTH/INPUTS/SIMULATOR) untuk debugging   |

---

## 2.5 Recommended Feature Prioritization

### Roadmap Aktif (90 Hari) — Audit & Hardening

Lihat: `02-planning/plan-roadmap-audit-hardening-v1.md`

- Sprint 1: Security Baseline (Electron hardening, IPC validation)
- Sprint 2: Scraper Reliability (sudah dihapus — tidak relevan)
- Sprint 3: Code Quality Gate (lint zero error)
- Sprint 4: Type Contract & Refactor
- Sprint 5: Reliability Features (role-based safety, auto-backup)
- Sprint 6: Observability & Extensibility

### Next Feature Phase (Post-Hardening)

1. NDI Output
2. Alpha Key Support
3. Layer-Based Looks
4. Customizable Shortcuts
5. Countdown Timer
6. Lower Thirds

---

_Terakhir diperbarui: 2026-05-23_  
_Bible Module dan Announcement Slides telah diimplementasikan — status diperbarui dari ❌ ke ✅_
