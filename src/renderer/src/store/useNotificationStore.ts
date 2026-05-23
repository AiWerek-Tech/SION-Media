/**
 * Notification Store — Phase 1 Infrastructure
 *
 * Manages in-app notifications (not OS-level notifications).
 * Supports categorized notifications with auto-dismiss and read tracking.
 *
 * Rules:
 *   - No reads from any other store
 *   - NOT persisted (notifications are ephemeral per session)
 *   - Max 50 notifications (FIFO eviction)
 *
 * @see implementation-master-order-v1.md §2.3 Sequence 1.1
 */

import { create } from 'zustand'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'
export type NotificationCategory = 'system' | 'projection' | 'database' | 'import' | 'general'

export interface AppNotification {
  /** Unique notification ID */
  id: string
  /** Display title */
  title: string
  /** Optional detail message */
  message?: string
  /** Severity level */
  level: NotificationLevel
  /** Category for filtering */
  category: NotificationCategory
  /** Whether the notification has been read/acknowledged */
  read: boolean
  /** Creation timestamp (ms) */
  timestamp: number
  /** Optional action label (e.g., "View Details") */
  actionLabel?: string
  /** Optional action callback key (handled by consumer) */
  actionKey?: string
}

interface NotificationStore {
  /** All notifications (newest first) */
  notifications: AppNotification[]
  /** Count of unread notifications */
  unreadCount: number

  /**
   * Add a new notification.
   * Automatically assigns ID and timestamp.
   * Evicts oldest if max capacity reached.
   */
  add: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void

  /**
   * Mark a specific notification as read.
   */
  markRead: (id: string) => void

  /**
   * Mark all notifications as read.
   */
  markAllRead: () => void

  /**
   * Remove a specific notification.
   */
  remove: (id: string) => void

  /**
   * Clear all notifications.
   */
  clearAll: () => void

  /**
   * Get notifications filtered by category.
   */
  getByCategory: (category: NotificationCategory) => AppNotification[]
}

/** Maximum number of notifications to keep */
const MAX_NOTIFICATIONS = 50

let notificationCounter = 0

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  add: (notification) => {
    const { notifications } = get()
    const id = `notif-${Date.now()}-${++notificationCounter}`

    const newNotification: AppNotification = {
      ...notification,
      id,
      read: false,
      timestamp: Date.now()
    }

    // Prepend (newest first) and enforce max capacity
    const updated = [newNotification, ...notifications].slice(0, MAX_NOTIFICATIONS)

    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length
    })
  },

  markRead: (id) => {
    const { notifications } = get()
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length
    })
  },

  markAllRead: () => {
    const { notifications } = get()
    const updated = notifications.map((n) => ({ ...n, read: true }))
    set({ notifications: updated, unreadCount: 0 })
  },

  remove: (id) => {
    const { notifications } = get()
    const updated = notifications.filter((n) => n.id !== id)
    set({
      notifications: updated,
      unreadCount: updated.filter((n) => !n.read).length
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },

  getByCategory: (category) => {
    return get().notifications.filter((n) => n.category === category)
  }
}))
