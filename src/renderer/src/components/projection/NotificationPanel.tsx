/**
 * Phase 7 — NotificationPanel (v2)
 *
 * System notifications panel in the Projection Mode bottom workspace.
 * Shows app events, warnings, and status changes from useNotificationStore.
 * v2: Improved filter tab styling, per-notification dismiss, better empty states.
 */

import React, { useCallback, useState } from 'react'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, Trash2 } from 'lucide-react'
import { useNotificationStore } from '@renderer/store/useNotificationStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  info: {
    icon: <Info size={12} />,
    color: 'text-sky-400',
    bg: 'bg-sky-400/[0.06] border-sky-400/10'
  },
  success: {
    icon: <CheckCheck size={12} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/[0.06] border-emerald-400/10'
  },
  warning: {
    icon: <AlertTriangle size={12} />,
    color: 'text-amber-400',
    bg: 'bg-amber-400/[0.06] border-amber-400/10'
  },
  error: {
    icon: <XCircle size={12} />,
    color: 'text-red-400',
    bg: 'bg-red-400/[0.06] border-red-400/10'
  }
}

type FilterTab = 'all' | 'unread' | 'system' | 'import'

const FILTER_LABELS: Record<FilterTab, string> = {
  all: 'Semua',
  unread: 'Belum Dibaca',
  system: 'Sistem',
  import: 'Impor'
}

export function NotificationPanel(): React.JSX.Element {
  const notifications = useNotificationStore((s) => s.notifications)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const markRead = useNotificationStore((s) => s.markRead)
  const remove = useNotificationStore((s) => s.remove)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'unread') return !n.read
    if (activeFilter === 'system') return n.category === 'system'
    if (activeFilter === 'import') return n.category === 'import'
    return true
  })

  const handleClear = useCallback(() => clearAll(), [clearAll])
  const handleMarkRead = useCallback(() => markAllRead(), [markAllRead])

  return (
    <aside className="projection-song-info-panel">
      {/* Filter pills + actions — single compact row */}
      <div className="flex items-center gap-1.5 px-3 pt-2 pb-2 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-1 flex-1 bg-black/15 rounded-lg p-0.5 border border-white/[0.04]">
          {(Object.keys(FILTER_LABELS) as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`
                flex-1 inline-flex items-center justify-center gap-1
                h-6 px-1.5 rounded-md border
                text-[10px] font-bold transition-all duration-150
                ${
                  activeFilter === tab
                    ? 'bg-white/[0.08] text-text-primary border-white/[0.1]'
                    : 'text-text-disabled hover:text-text-secondary border-transparent hover:bg-white/[0.04]'
                }
              `}
            >
              {FILTER_LABELS[tab]}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-3.5 min-w-[14px] px-0.5 rounded-full bg-danger text-white text-[8px] font-black">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkRead}
              className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-text-disabled hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
              title="Tandai semua dibaca"
            >
              <CheckCheck size={12} />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-text-disabled hover:text-danger hover:bg-danger/10 transition-all"
              title="Hapus semua"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted py-8">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] p-5 flex flex-col items-center gap-2">
              <Bell size={22} className="opacity-30" />
              <span className="text-[11px]">
                {activeFilter === 'unread' ? 'Semua sudah dibaca' : 'Belum ada notifikasi'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredNotifications.map((n) => {
              const config = LEVEL_CONFIG[n.level] ?? LEVEL_CONFIG.info
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`
                    group flex items-start gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer
                    ${n.read ? 'opacity-50 bg-transparent border-transparent hover:opacity-70' : config.bg}
                  `}
                >
                  <span className={`shrink-0 mt-0.5 ${config.color}`}>{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-text-primary leading-snug">
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-text-disabled tabular-nums mt-0.5">
                      {formatTime(n.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(n.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-4 h-4 rounded text-text-disabled hover:text-danger transition-all"
                      title="Hapus notifikasi"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
