import React from 'react'
import { TitleBarIdentity } from './TitleBarIdentity'
import { TitleBarMenu } from './TitleBarMenu'
import { TitleBarModeSwitcher } from './TitleBarModeSwitcher'
import { TitleBarStatus } from './TitleBarStatus'
import { TitleBarClock } from './TitleBarClock'
import { TitleBarControls } from './TitleBarControls'

/**
 * Professional Custom Title Bar — Application Command Center
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ [LOGO] SION Presenter │ File Edit View ... │  Song Info │ ● LIVE │ 🖥️ │ ⏱ │ 🕐 │ ─ □ ✕ │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * - Entire bar is `-webkit-app-region: drag` (draggable)
 * - Interactive elements use `.no-drag` class to remain clickable
 */
export function TitleBar(): React.JSX.Element {
  return (
    <div className="title-bar">
      {/* Left: App Identity + Menu System */}
      <div className="title-bar-left">
        <TitleBarIdentity />
        <TitleBarModeSwitcher />
        <TitleBarMenu />
      </div>

      {/* Center: Flexible drag region */}
      <div className="title-bar-spacer" />

      {/* Right: Status + Clock + Window Controls */}
      <div className="title-bar-right">
        <TitleBarStatus />
        <TitleBarClock />
        <TitleBarControls />
      </div>
    </div>
  )
}
