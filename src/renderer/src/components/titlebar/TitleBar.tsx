import React from 'react'
import { Bell, Moon, Settings } from 'lucide-react'
import { TitleBarIdentity } from './TitleBarIdentity'
import { TitleBarMenu } from './TitleBarMenu'
import { TitleBarModeSwitcher } from './TitleBarModeSwitcher'
import { TitleBarStatus } from './TitleBarStatus'
import { TitleBarControls } from './TitleBarControls'
import { useModeStore } from '../../store/useModeStore'
import { useAppStore } from '../../store/useAppStore'

function TitleBarUtilityButtons(): React.JSX.Element {
  const setScreen = useAppStore((s) => s.setScreen)

  return (
    <div className="title-bar-utilities no-drag">
      <button type="button" className="title-bar-utility-btn" title="Theme">
        <Moon size={14} />
      </button>
      <button
        type="button"
        className="title-bar-utility-btn"
        title="Settings"
        onClick={() => setScreen('settings')}
      >
        <Settings size={14} />
      </button>
      <button type="button" className="title-bar-utility-btn" title="Notifications">
        <Bell size={14} />
      </button>
    </div>
  )
}

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
      <div className="title-bar-left">
        <TitleBarIdentity />
        {!isFirstInstall && <TitleBarMenu />}
      </div>

      <div className="title-bar-center">{!isFirstInstall && <TitleBarModeSwitcher />}</div>

      <div className="title-bar-right">
        {!isFirstInstall && <TitleBarStatus />}
        {!isFirstInstall && <TitleBarUtilityButtons />}
        <TitleBarControls />
      </div>
    </div>
  )
}
