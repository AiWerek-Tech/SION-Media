import React from 'react'
import { TitleBarIdentity } from './TitleBarIdentity'
import { TitleBarMenu } from './TitleBarMenu'
import { TitleBarModeSwitcher } from './TitleBarModeSwitcher'
import { TitleBarStatus } from './TitleBarStatus'
import { TitleBarControls } from './TitleBarControls'
import { useModeStore } from '../../store/useModeStore'

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
 * - Onboarding lockdown: hides Menu, ModeSwitcher, and Status during first install
 */
export function TitleBar(): React.JSX.Element {
  const isFirstInstall = useModeStore((s) => s.isFirstInstall)

  return (
    <div className="title-bar">
      {/* Left: App Identity + Menu System */}
      <div className="title-bar-left">
        <TitleBarIdentity />
        {!isFirstInstall && (
          <>
            <TitleBarModeSwitcher />
            <TitleBarMenu />
          </>
        )}
      </div>

      {/* Center: Flexible drag region */}
      <div className="title-bar-spacer" />

      {/* Right: Status + Clock + Window Controls */}
      <div className="title-bar-right">
        {!isFirstInstall && <TitleBarStatus />}
        <TitleBarControls />
      </div>
    </div>
  )
}
