import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { AnnouncementPanel } from '../AnnouncementPanel'

describe('AnnouncementPanel', () => {
  beforeEach(() => {
    usePlaylistStore.setState({
      activePlaylist: {
        id: 7,
        name: 'Ibadah Minggu',
        service_date: '2026-07-05',
        description: '',
        created_at: '',
        updated_at: ''
      },
      playlistItems: []
    })
  })

  it('uses a scoped Electron-safe layout for fields and actions', () => {
    const { container } = render(<AnnouncementPanel />)

    expect(container.querySelector('.projection-announcement-panel')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Judul (opsional)')).toHaveClass(
      'projection-announcement-panel__field'
    )
    expect(screen.getByPlaceholderText('Isi pengumuman... (Ctrl+Enter untuk kirim)')).toHaveClass(
      'projection-announcement-panel__textarea'
    )
    expect(screen.getByText('Template Cepat').parentElement).toHaveClass(
      'projection-announcement-panel__templates'
    )
    expect(screen.getByRole('button', { name: 'Kirim ke Preview' }).parentElement).toHaveClass(
      'projection-announcement-panel__actions'
    )
  })

  it('adds title and body to the active playlist as an Info item', async () => {
    const user = userEvent.setup()
    const addInfo = vi.fn().mockResolvedValue({ id: 3 })
    const getItems = vi.fn().mockResolvedValue([])
    const playlistsApi = window.api.playlists as typeof window.api.playlists & {
      addInfo: typeof addInfo
    }
    playlistsApi.addInfo = addInfo
    window.api.playlists.getItems = getItems

    render(<AnnouncementPanel />)
    await user.type(screen.getByPlaceholderText('Judul (opsional)'), 'Pengkhotbah:')
    await user.type(
      screen.getByPlaceholderText('Isi pengumuman... (Ctrl+Enter untuk kirim)'),
      'Pdt. Frengky Lokobal'
    )
    await user.click(screen.getByRole('button', { name: 'Tambah ke Playlist' }))

    expect(addInfo).toHaveBeenCalledWith(7, {
      title: 'Pengkhotbah:',
      body: 'Pdt. Frengky Lokobal'
    })
    expect(getItems).toHaveBeenCalledWith(7)
  })
})
