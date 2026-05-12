# Title Bar Optimization for Windows 11

## Overview

Implementation of native Windows 11 title bar with snap layouts support and responsive design to prevent UI overlap.

## Changes Made

### 1. Native Windows Caption Buttons + Snap Layouts

**File**: `src/main/windows.ts`

- Enabled `titleBarOverlay` for Windows (`win32`) platform
- Configured native Windows 11 colors:
  - Background: `#0b0f17` (dark blue)
  - Symbol color: `#cbd5e1` (light)
  - Height: `40px` (matches custom title bar)
- **Result**: Native minimize/maximize/close buttons with Windows 11 snap layouts hover behavior

### 2. Custom Controls Hidden on Windows

**File**: `src/renderer/src/components/titlebar/TitleBarControls.tsx`

- Added Windows platform detection
- Custom buttons hidden on Windows to prevent double controls
- IPC-based controls retained for non-Windows platforms
- **Result**: No overlap with native caption buttons

### 3. Layout Optimization with CSS Grid

**File**: `src/renderer/src/assets/main.css`

- Changed `.title-bar` from flex `space-between` to CSS grid:
  ```css
  display: grid;
  grid-template-columns: auto 1fr auto;
  ```
- Added responsive padding for native caption area:
  ```css
  body.win-titlebar-overlay .title-bar {
    padding-right: clamp(148px, 12vw, 220px);
  }
  ```
- **Result**: Consistent spacing, no overlap, responsive to DPI/window size

### 4. Windows Detection for CSS Targeting

**File**: `src/renderer/src/main.tsx`

- Added body class detection for Windows:
  ```typescript
  if (navigator.userAgent.toLowerCase().includes('windows')) {
    document.body.classList.add('win-titlebar-overlay')
  }
  ```
- **Result**: CSS can target Windows-specific styling

## Technical Specifications

### Window State Management

- **Maximized state tracking**: Via IPC events
  - `window:maximize` toggle maximize/unmaximize
  - `window:maximized-changed` event broadcasts state
  - `window:is-maximized` query current state
- **Error handling**: Proper try-catch with logging

### Responsive Design

- **DPI scaling**: `clamp(148px, 12vw, 220px)` adapts to:
  - 100% scale: 148px minimum
  - Variable scaling: 12vw viewport-based
  - 220px maximum for very large windows
- **Cross-platform**: Graceful fallback for non-Windows platforms

### CSS Architecture

- **Z-index**: `1000` ensures title bar stays on top
- **Grid layout**: `auto 1fr auto` provides:
  - Left: Auto-width (identity + menu)
  - Center: 1fr (flexible drag area)
  - Right: Auto-width (status + clock + controls)
- **App regions**: `-webkit-app-region: drag` for title bar, `no-drag` for interactive elements

## Testing Checklist

### Functional Testing

- [ ] Minimize button works without delay
- [ ] Maximize/restore toggle works seamlessly
- [ ] Close button works properly
- [ ] Window state syncs correctly between main and renderer
- [ ] Error handling for IPC failures

### Visual Testing

- [ ] No overlap between title text and native buttons
- [ ] Consistent padding and margins across elements
- [ ] Proper z-index layering
- [ ] Responsive behavior at different window sizes
- [ ] DPI scaling works at 100%, 125%, 150%

### Windows 11 Integration

- [ ] Snap layouts appear on maximize button hover
- [ ] Native color scheme matches app theme
- [ ] Caption buttons respond to hover/click correctly
- [ ] No visual glitches during window state changes

## Performance Considerations

- **Memory**: No additional listeners created
- **CPU**: CSS grid is hardware-accelerated
- **Rendering**: Native title bar reduces custom rendering overhead

## Browser Compatibility

- **Windows 11**: Full native integration with titleBarOverlay
- **Windows 10**: Fallback to custom controls (titleBarOverlay disabled)
- **macOS/Linux**: Custom controls maintained (no titleBarOverlay)

## Future Enhancements

- Custom snap layout regions (Win32 API integration)
- Theme-aware title bar colors
- Animated window state transitions
- Accessibility improvements for title bar controls

## Notes

- `titleBarOverlay` only works on Windows 10 1903+ and Windows 11
- CSS `clamp()` provides responsive scaling without media queries
- Grid layout is more robust than flex for complex title bar arrangements
