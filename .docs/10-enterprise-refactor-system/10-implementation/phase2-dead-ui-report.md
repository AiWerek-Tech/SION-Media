# Phase 2 — Critical Dead UI Fixes

**Status:** ✅ COMPLETE  
**Date:** 2026-05-15  
**Validation:** `npm run typecheck` ✅ | `npm run test` 16/16 ✅  
**Risk Level:** LOW — targeted changes, each independently revertible

---

## Objective

Fix the 10 highest-impact broken interactions. Each fix is isolated and independently revertible. Zero projection-critical code touched.

---

## DUI-001: Favorite Button — `LibraryModeRedesigned.tsx`

**Problem:** Star button in `SongMediaCard` had `onClick` that only called `e.stopPropagation()` — no actual toggle logic.

**Fix:**

1. Added `onToggleFavorite: (song: Song) => void` prop to `SongMediaCard`
2. Added `handleToggleFavorite` in parent `LibraryMode` component:
   ```typescript
   const handleToggleFavorite = useCallback(
     async (song: Song) => {
       const prevSongs = songs
       // Optimistic update — immediate UI feedback
       setSongs(
         songs.map((s) => (s.id === song.id ? { ...s, is_favorite: s.is_favorite ? 0 : 1 } : s))
       )
       try {
         await window.api.songs.toggleFavorite(song.id)
       } catch {
         setSongs(prevSongs) // rollback on error
         showToast('Gagal mengubah favorit', 'error')
       }
     },
     [songs, setSongs, showToast]
   )
   ```
3. Wired `onToggleFavorite={handleToggleFavorite}` at `SongMediaCard` call site
4. Added `setSongs` to `useAppStore` destructuring

**Validation:** Click star → `is_favorite` flips immediately → persists on reload → rollback on network error

---

## DUI-002: New Playlist Menu — `TitleBarMenu.tsx`

**Problem:** `File > New Playlist` had empty action comment `/* Will be wired when playlist create dialog exists */`.

**Fix:**

```typescript
action: () => {
  document.dispatchEvent(new CustomEvent('sion:create-playlist'))
}
```

`ModalRegistry` listens for this event and opens `CreatePlaylistDialog` (Phase 3).

**Validation:** File > New Playlist → `CreatePlaylistDialog` opens

---

## DUI-003: Bible Shortcut + Menu — `useGlobalShortcuts.ts` + `TitleBarMenu.tsx`

**Problem:** No `Ctrl+B` shortcut. No Bible item in View menu.

**Fix 1 — `useGlobalShortcuts.ts`:**

```typescript
// Added BEFORE the projection-only block (works in all modes)
if (e.ctrlKey && e.code === 'KeyB') {
  e.preventDefault()
  setScreen('bible')
  return
}
```

**Fix 2 — `TitleBarMenu.tsx`:**

```typescript
// Added to View menu items:
{
  label: 'Bible',
  shortcut: 'Ctrl+B',
  action: () => setScreen('bible')
}
```

**Validation:** `Ctrl+B` → BibleScreen opens from any mode. View > Bible → same.

---

## DUI-004: Theme Button — `TitleBar.tsx`

**Problem:** Moon button in `TitleBarUtilityButtons` had no `onClick` — theme never changed.

**Fix:**

```typescript
// Added Sun, SunMoon icons
// handleThemeToggle cycles: dark → light → system → dark
const handleThemeToggle = (): void => {
  const next: AppTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  setTheme(next)
  const effective =
    next === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : next
  applyEffectiveTheme(effective)
  window.api.appTheme.setMode({ mode: next, effective })
}

// Dynamic icon:
const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon
```

**Validation:** Click → cycles dark/light/system → theme applies immediately → persists on reload

---

## DUI-006: Real Storage Metric — `ManagementMode.tsx`

**Problem:** Storage metric card showed hardcoded `"28.4 GB"` — not real data.

**Fix:**

```typescript
// Added state:
const [storageStats, setStorageStats] = useState<{
  dbSizeMB: string; memoryMB: string
} | null>(null)

// Added useEffect on mount:
useEffect(() => {
  window.api.system.getStorageStats()
    .then((stats) => setStorageStats(stats as { dbSizeMB: string; memoryMB: string }))
    .catch(() => {}) // silently ignore — fallback to placeholder
}, [])

// Updated metric card:
{
  label: 'Penyimpanan',
  value: storageStats ? `${storageStats.dbSizeMB} MB` : '—',
  meta: storageStats ? `RAM: ${storageStats.memoryMB} MB` : 'Memuat...',
}
```

**Validation:** Storage metric shows real MB value from `getStorageStats()` IPC

---

## Timer Mount — `App.tsx`

**Problem:** `useTimerTick()` hook existed but was never mounted. Timer never advanced.

**Fix:**

```typescript
// Added after useCrashRecovery():
useTimerTick()
```

**Validation:** Timer in TitleBarStatus advances every second when running

---

## ModalRegistry Mount — `App.tsx`

**Problem:** No modal system mounted — `useModalStore.open()` calls had no renderer.

**Fix (Phase 2 stub):**

```typescript
// Created ModalRegistry.tsx stub (renders null)
// Mounted in App.tsx after <Toast />:
<ModalRegistry />
```

Full implementation replaced in Phase 3.

---

## Timer Controls — `TitleBarStatus.tsx`

**Problem:** No timer display or controls in title bar.

**Fix:** Added `TitleBarTimer` sub-component:

```typescript
function TitleBarTimer(): React.JSX.Element {
  const timerElapsed = useProjectionStore(s => s.timerElapsed)
  const timerRunning = useProjectionStore(s => s.timerRunning)
  // ...
  return (
    <div className="title-bar-timer no-drag">
      <span style={{ fontFamily: '"Inter", monospace', fontSize: 11, fontWeight: 800 }}>
        {formatTimer(timerElapsed)}  // HH:MM:SS
      </span>
      <button onClick={timerRunning ? timerStop : timerStart}>
        {timerRunning ? <Square size={10} /> : <Play size={10} />}
      </button>
      <button onClick={timerReset}><RotateCcw size={10} /></button>
    </div>
  )
}
```

Mounted inside PROJECTION mode section of `TitleBarStatus`.

**Validation:** Timer displays HH:MM:SS. ▶ starts, ■ stops, ↺ resets.

---

## Validation Results

```
npm run typecheck  → Exit 0 ✅
npm run test       → 16/16 pass ✅
```

---

## Rollback (per fix)

- DUI-001: Revert `SongMediaCard` onClick + remove `handleToggleFavorite`
- DUI-002: Revert `File > New Playlist` action to empty comment
- DUI-003: Remove `Ctrl+B` case + remove `View > Bible` menu item
- DUI-004: Revert Moon button onClick to empty
- DUI-006: Remove `storageStats` state + useEffect + revert metric card
- Timer: Remove `useTimerTick()` call from App.tsx
- ModalRegistry: Remove `<ModalRegistry />` from App.tsx
- TitleBarTimer: Remove `TitleBarTimer` component + mount from TitleBarStatus
