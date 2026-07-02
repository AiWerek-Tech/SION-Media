import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { PlaylistSelector } from '../PlaylistSelector'
import type { Playlist } from '@renderer/types'

const playlists: Playlist[] = [
  {
    id: 1,
    name: 'Ibadah Sabat',
    service_date: '2026-07-04',
    description: '',
    created_at: '',
    updated_at: ''
  },
  { id: 2, name: 'Rabu Malam', service_date: '', description: '', created_at: '', updated_at: '' }
]

describe('PlaylistSelector', () => {
  test('shows every playlist, marks the active one, and selects another playlist', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <PlaylistSelector
        playlists={playlists}
        activePlaylist={playlists[1]}
        itemCount={0}
        slideCount={0}
        onSelect={onSelect}
        onCreate={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Pilih playlist, Rabu Malam aktif' }))

    expect(screen.getByText('2 playlist tersimpan')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Rabu Malam, Kapan saja, aktif' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await user.click(screen.getByRole('option', { name: 'Ibadah Sabat, Sab, 4 Jul 2026' }))
    expect(onSelect).toHaveBeenCalledWith(playlists[0])
  })

  test('offers playlist creation and closes with Escape or an outside click', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(
      <PlaylistSelector
        playlists={playlists}
        activePlaylist={playlists[1]}
        itemCount={0}
        slideCount={0}
        onSelect={vi.fn()}
        onCreate={onCreate}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Pilih playlist, Rabu Malam aktif' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Buat playlist baru' }))
    expect(onCreate).toHaveBeenCalledTimes(1)

    await user.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()

    await user.click(trigger)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
