import React, { useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { TitleBarIdentity } from './TitleBarIdentity'
import { TitleBarMenu } from './TitleBarMenu'
import { TitleBarModeSwitcher } from './TitleBarModeSwitcher'
import { TitleBarStatus } from './TitleBarStatus'
import { TitleBarControls } from './TitleBarControls'
import { NotificationOverlay } from './NotificationOverlay'
import { useModeStore } from '../../store/useModeStore'
import { useAppStore } from '../../store/useAppStore'
import { useNotificationStore } from '../../store/useNotificationStore'

export function TitleBarUtilityButtons(): React.JSX.Element {
  const setScreen = useAppStore((s) => s.setScreen)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const handleBellClick = (): void => {
    if (!isNotifOpen && unreadCount > 0) {
      markAllRead()
    }
    setIsNotifOpen((prev) => !prev)
  }

  return (
    <div className="title-bar-utilities no-drag">
      <button
        type="button"
        className="title-bar-utility-btn"
        title="Pengaturan"
        aria-label="Buka pengaturan aplikasi"
        onClick={() => setScreen('settings')}
      >
        <Settings size={14} />
      </button>
      <div className="relative flex items-center h-full">
        <button
          type="button"
          className="title-bar-utility-btn notification-bell-btn relative"
          title="Notifikasi"
          aria-label={
            unreadCount > 0 ? `Buka notifikasi, ${unreadCount} belum dibaca` : 'Buka notifikasi'
          }
          aria-expanded={isNotifOpen}
          onClick={handleBellClick}
        >
          <Bell size={14} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-primary" />
          )}
        </button>
        <NotificationOverlay isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      </div>
    </div>
  )
}

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
