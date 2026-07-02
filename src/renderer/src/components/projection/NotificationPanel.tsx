import React, { useCallback, useState } from 'react'
import { AlertTriangle, Bell, CheckCheck, Info, Trash2, XCircle } from 'lucide-react'
import { useNotificationStore } from '@renderer/store/useNotificationStore'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; tone: string }> = {
  info: { icon: <Info size={12} />, color: 'text-sky-400', tone: 'is-info' },
  success: { icon: <CheckCheck size={12} />, color: 'text-emerald-400', tone: 'is-success' },
  warning: { icon: <AlertTriangle size={12} />, color: 'text-amber-400', tone: 'is-warning' },
  error: { icon: <XCircle size={12} />, color: 'text-red-400', tone: 'is-error' }
}

type FilterTab = 'all' | 'unread' | 'system' | 'import'

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'Semua',
  unread: 'Belum Dibaca',
  system: 'Sistem',
  import: 'Impor'
}

export function NotificationPanel(): React.JSX.Element {
  const notifications = useNotificationStore((state) => state.notifications)
  const markAllRead = useNotificationStore((state) => state.markAllRead)
  const markRead = useNotificationStore((state) => state.markRead)
  const remove = useNotificationStore((state) => state.remove)
  const clearAll = useNotificationStore((state) => state.clearAll)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filteredNotifications = notifications.filter((notification) => {
    if (activeFilter === 'unread') return !notification.read
    if (activeFilter === 'system') return notification.category === 'system'
    if (activeFilter === 'import') return notification.category === 'import'
    return true
  })

  const handleClear = useCallback(() => clearAll(), [clearAll])
  const handleMarkRead = useCallback(() => markAllRead(), [markAllRead])

  return (
    <aside className="projection-song-info-panel projection-notifications">
      <div className="projection-notifications__toolbar">
        <div
          className="projection-notifications__filters"
          role="group"
          aria-label="Filter notifikasi"
        >
          {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              aria-pressed={activeFilter === tab}
              className={`projection-notifications__filter ${activeFilter === tab ? 'is-active' : ''}`}
            >
              <span>{FILTER_LABELS[tab]}</span>
              {tab === 'unread' && unreadCount > 0 && (
                <span
                  className="projection-notifications__count"
                  aria-label={`${unreadCount} belum dibaca`}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="projection-notifications__actions">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkRead}
              className="projection-notifications__tool"
              title="Tandai semua dibaca"
              aria-label="Tandai semua dibaca"
            >
              <CheckCheck size={12} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="projection-notifications__tool projection-notifications__tool--danger"
              title="Hapus semua"
              aria-label="Hapus semua notifikasi"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="projection-notifications__list">
        {filteredNotifications.length === 0 ? (
          <div className="projection-notifications__empty">
            <div className="projection-notifications__empty-card">
              <Bell size={22} aria-hidden="true" />
              <strong>
                {activeFilter === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
              </strong>
              <span>Aktivitas penting aplikasi akan tampil di sini.</span>
            </div>
          </div>
        ) : (
          <div className="projection-notifications__items">
            {filteredNotifications.map((notification) => {
              const config = LEVEL_CONFIG[notification.level] ?? LEVEL_CONFIG.info
              return (
                <article
                  key={notification.id}
                  onClick={() => !notification.read && markRead(notification.id)}
                  className={`projection-notifications__item ${notification.read ? 'is-read' : 'is-unread'} ${config.tone}`}
                >
                  <span className={`projection-notifications__level ${config.color}`}>
                    {config.icon}
                  </span>
                  <div className="projection-notifications__copy">
                    <p className="projection-notifications__title">{notification.title}</p>
                    {notification.message && (
                      <p className="projection-notifications__message">{notification.message}</p>
                    )}
                  </div>
                  <div className="projection-notifications__meta">
                    <time className="projection-notifications__time">
                      {formatTime(notification.timestamp)}
                    </time>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        remove(notification.id)
                      }}
                      className="projection-notifications__remove"
                      title="Hapus notifikasi"
                      aria-label={`Hapus notifikasi ${notification.title}`}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
