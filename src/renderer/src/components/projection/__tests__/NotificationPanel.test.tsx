import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotificationStore } from '@renderer/store/useNotificationStore'
import { NotificationPanel } from '../NotificationPanel'

describe('NotificationPanel', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [
        {
          id: 'system-1',
          title: 'Output tersambung',
          message: 'Layar utama siap digunakan',
          level: 'success',
          category: 'system',
          read: false,
          timestamp: new Date('2026-07-02T08:00:00').getTime()
        },
        {
          id: 'import-1',
          title: 'Impor selesai',
          level: 'info',
          category: 'import',
          read: true,
          timestamp: new Date('2026-07-02T07:55:00').getTime()
        }
      ],
      unreadCount: 1
    })
  })

  it('uses a fixed toolbar and an isolated scrolling list', () => {
    const { container } = render(<NotificationPanel />)

    expect(container.querySelector('.projection-notifications__toolbar')).toBeInTheDocument()
    expect(container.querySelector('.projection-notifications__list')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filters notifications and keeps destructive actions accessible', async () => {
    const user = userEvent.setup()
    render(<NotificationPanel />)

    await user.click(screen.getByRole('button', { name: 'Impor' }))

    expect(screen.queryByText('Output tersambung')).not.toBeInTheDocument()
    expect(screen.getByText('Impor selesai')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hapus notifikasi Impor selesai' })).toBeVisible()
  })

  it('marks all notifications as read', async () => {
    const user = userEvent.setup()
    const markAllRead = vi.spyOn(useNotificationStore.getState(), 'markAllRead')
    render(<NotificationPanel />)

    await user.click(screen.getByRole('button', { name: 'Tandai semua dibaca' }))

    expect(markAllRead).toHaveBeenCalledOnce()
  })
})
