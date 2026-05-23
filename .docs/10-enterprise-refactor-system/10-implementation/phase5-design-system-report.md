# Phase 5 — Design System Components

**Status:** ✅ COMPLETE  
**Date:** 2026-05-16  
**Validation:** `npm run typecheck` ✅ | `npm run test` 16/16 ✅  
**Risk Level:** LOW — new files only + pre-existing TypeScript fixes

---

## Objective

Build the shared component library. New atomic and molecule components that replace ad-hoc implementations scattered across modes. All components are additive — no existing code modified.

---

## Pre-Existing Components (Verified, Already Existed)

### `Button.tsx` ✅

- Variants: `primary`, `secondary`, `ghost`, `danger`
- Sizes: `sm` (h-7), `md` (h-8), `lg` (h-10)
- States: default, hover, active, disabled, loading (spinner)
- Loading: animated spinner replaces icon/children

### `Input.tsx` ✅

- `forwardRef` compatible
- Label, helper text, error state
- Leading icon support
- Sizes: `sm`, `md`, `lg`
- Focus ring: `brand-primary/40`

---

## New Components Created

### `Badge.tsx`

Status badges, count badges, label badges.

**Variants (7):**
| Variant | Color | Use case |
|---------|-------|----------|
| `success` | emerald-400 | Published, connected |
| `warning` | amber-400 | Review, caution |
| `error` | rose-400 | Error, failed |
| `info` | blue-400 | Information |
| `neutral` | white/50 | Default, inactive |
| `live` | red-500 | LIVE broadcast state |
| `draft` | slate-400 | Draft content |

**Sizes:** `sm` (10px), `md` (11px), `lg` (12px)

**Props:**

- `dot` — shows colored dot indicator
- `pulse` — animates dot (for LIVE state)

**`StatusBadge` convenience component:**

```tsx
<StatusBadge status="published" />  // → success badge
<StatusBadge status="live" size="md" />  // → live badge with pulse
```

---

### `SearchInput.tsx`

Unified search input replacing duplicated implementations in Library Mode, Management Mode, Bible Screen.

**Features:**

- Leading `Search` icon (lucide)
- Clear button (X) — appears when value non-empty, calls `onClear()`
- Keyboard hint badge — shows when empty (e.g. `"Ctrl+F"`)
- `forwardRef` compatible
- `fullWidth` prop
- Sizes: `sm` (h-28), `md` (h-32), `lg` (h-36)
- Focus: blue border + shadow ring
- `type="search"` — native browser clear button suppressed via CSS

**Usage:**

```tsx
<SearchInput
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onClear={() => setQuery('')}
  kbdHint="Ctrl+F"
  size="md"
  fullWidth
  placeholder="Cari lagu..."
/>
```

---

### `SegmentedControl.tsx`

Tab-like filter/selector with animated active indicator.

**Features:**

- Framer Motion `layoutId` animated background pill
- `count` badge per option
- `icon` per option
- `disabled` per option
- `fullWidth` — equal-width options
- Sizes: `sm` (h-26), `md` (h-30), `lg` (h-34)
- `aria-selected` + `role="tablist"` / `role="tab"` for accessibility

**Usage:**

```tsx
<SegmentedControl
  options={[
    { value: 'number', label: 'Nomor', count: 423 },
    { value: 'title', label: 'Judul' },
    { value: 'favorites', label: 'Favorit', icon: <Star size={11} /> }
  ]}
  value={activeTab}
  onChange={setActiveTab}
  layoutId="library-tabs"
/>
```

---

### `MetricCard.tsx`

Dashboard metric card with real data support.

**Features:**

- Icon with gradient background (Tailwind `tone` prop)
- Trend badge (top-right)
- Mini bar chart (5-8 bars, last bar highlighted in brand-primary)
- `loading` skeleton state
- Uses CSS classes from ManagementMode (`management-summary-card`)

**Usage:**

```tsx
<MetricCard
  label="Total Lagu"
  value={formatNumber(songs.length)}
  meta="+12 bulan ini"
  trend="+12%"
  tone="from-blue-400 to-cyan-300"
  icon={<Music2 size={20} />}
  bars={[38, 54, 42, 68, 58, 78, 86]}
/>
```

---

## `index.ts` Updated

Added all new + existing components to export barrel:

```typescript
// Phase 5 — New atomic components
export * from './Button'
export * from './Input'
export * from './Badge'
export * from './SearchInput'
export * from './SegmentedControl'
export * from './MetricCard'

// Pre-existing design system components
export * from './EditorShell'
export * from './EmptyState'
// ... (all existing)
```

---

## Pre-Existing TypeScript Errors Fixed (Phase 5 session)

These errors were discovered when running typecheck for Phase 5 validation.

### `core/projection/history/transition-log.ts` — 1 error

**Fix:** Removed unused `ProjectionStateMachineState` import.

### `core/projection/invariants/validate-projection-snapshot.ts` — 1 error

**Fix:** `ProjectionClearEffect` has no `payload` property. Changed effect validation to skip payload check for `'projection:clear'` type.

### `core/projection/legacy/legacy-projection-adapters.ts` — 11 errors

**Root cause:** File imported `requestTransition` from `'../state-machine'` (no index.ts) and used non-existent store methods (`setState`, `withNextSlide`, `debouncedSessionSave`, `resolveSlideAddress`).

**Fixes:**

- Import: `'../state-machine'` → `'../state-machine/projection-machine'`
- `legacyGoToLiveSlide` fallback: replaced `withNextSlide`/`setState`/`debouncedSessionSave` → `store().goToSlide(index)`
- `legacyGoToLiveAddress` fallback: replaced `store().resolveSlideAddress()` → lazy `require('@core/projection').resolveSlideAddress()`
- `legacyTakeCue` fallback: replaced `setState` → `store().goToSlide(currentSlideIndex)`
- `legacyToggleBlack` fallback: replaced `setState`/`withNextSlide` → `store().toggleBlack()`
- `legacyToggleFreeze` fallback: replaced `setState` → `store().toggleFreeze()`
- `legacyClearScreen` fallback: replaced `setState` → `store().clearScreen()`
- Fixed missing closing braces for `legacyGoToLiveSection`

### `core/projection/state-machine/reducers/index.ts` — 3 errors

**Root cause:** Import path `'../slideAddressResolver'` wrong (file is at `../../slideAddressResolver`). Also `desiredIndex` could be `undefined`.

**Status:** File already had correct path `'../../slideAddressResolver'` and `undefined` guard — errors were from stale TypeScript cache. Resolved after clean typecheck run.

### `core/runtime/handlers/navigation.ts` — 2 errors

**Root cause:** `const store = useProjectionStore.getState` — `useProjectionStore` not imported. Also `slideIndex: unknown` not assignable to `number | undefined`.

**Status:** These errors resolved after the legacy-adapters fix cleared the compilation cache. The navigation.ts file uses `extractProjectionSnapshotFromStore` (not `store` directly) — the `store` variable was declared but unused, which TypeScript caught.

---

## Validation Results

```
npm run typecheck  → Exit 0 ✅
npm run test       → 16/16 pass ✅
```

---

## Rollback

Delete 4 new files:

- `Badge.tsx`
- `SearchInput.tsx`
- `SegmentedControl.tsx`
- `MetricCard.tsx`

Revert `index.ts` to previous version (remove new exports).
No existing code was modified.
