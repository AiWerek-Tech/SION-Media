import React, { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, Trash2, X } from 'lucide-react'
import { useNotificationStore } from '../../store/useNotificationStore'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const LEVEL_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  info: { icon: <Info size={14} />, color: 'text-sky-400' },
  success: { icon: <CheckCheck size={14} />, color: 'text-emerald-400' },
  warning: { icon: <AlertTriangle size={14} />, color: 'text-amber-400' },
  error: { icon: <XCircle size={14} />, color: 'text-red-400' }
}

interface NotificationOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationOverlay({
  isOpen,
  onClose
}: NotificationOverlayProps): React.JSX.Element {
  const notifications = useNotificationStore((s) => s.notifications)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const clearAll = useNotificationStore((s) => s.clearAll)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleClear = useCallback((): void => {
    clearAll()
  }, [clearAll])

  const handleMarkRead = useCallback((): void => {
    markAllRead()
  }, [markAllRead])

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent): void => {
      // Don't close if clicking on the bell button itself (managed by TitleBar)
      const target = e.target as HTMLElement
      if (target.closest('.notification-bell-btn')) return

      if (overlayRef.current && !overlayRef.current.contains(target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute top-[40px] right-2 w-[340px] max-h-[500px] bg-bg-surface border border-border-strong rounded-xl shadow-2xl flex flex-col z-[100] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-base/50">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-brand-primary" />
              <h3 className="text-[13px] font-bold text-text-primary">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center h-4 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Actions */}
          {notifications.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle/50 bg-white/[0.01]">
              <span className="text-[10px] font-semibold text-text-muted">
                {notifications.length} riwayat
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkRead}
                    className="text-[10px] font-semibold text-text-muted hover:text-brand-primary transition-colors"
                  >
                    Tandai Dibaca
                  </button>
                )}
                <button
                  onClick={handleClear}
                  className="text-[10px] font-semibold text-text-muted hover:text-danger transition-colors flex items-center gap-1"
                >
                  <Trash2 size={10} />
                  Bersihkan
                </button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-[200px] p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] gap-3 text-text-muted">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center">
                  <Bell size={20} className="opacity-40" />
                </div>
                <span className="text-[12px] font-medium">Belum ada notifikasi</span>
              </div>
            ) : (
              notifications.map((n) => {
                const config = LEVEL_CONFIG[n.level] || LEVEL_CONFIG.info
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${n.read ? 'bg-transparent opacity-70 hover:bg-white/[0.02]' : 'bg-white/[0.04] hover:bg-white/[0.06]'}`}
                  >
                    <span className={`shrink-0 mt-0.5 ${config.color}`}>{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-text-primary leading-snug">
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                          {n.message}
                        </p>
                      )}
                      <span className="text-[9px] text-text-disabled mt-1.5 block tabular-nums">
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
