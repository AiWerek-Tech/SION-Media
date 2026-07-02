import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { AudioPanel } from '../AudioPanel'

describe('AudioPanel', () => {
  const timerStart = vi.fn()
  const timerStop = vi.fn()
  const timerReset = vi.fn()
  const toggleAudioPanel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useProjectionStore.setState({
      timerElapsed: 125,
      timerRunning: false,
      timerStart,
      timerStop,
      timerReset,
      toggleAudioPanel
    })
  })

  it('shows a compact paused timer and an honest monitoring state', () => {
    const { container } = render(<AudioPanel />)

    expect(screen.getByText('02:05')).toBeInTheDocument()
    expect(screen.getByText('Dijeda')).toBeInTheDocument()
    expect(screen.getByText('Pemantauan audio belum tersedia')).toBeInTheDocument()
    expect(container.querySelector('.audio-panel__vu')).not.toBeInTheDocument()
  })

  it('starts, resets, and closes the timer panel', async () => {
    const user = userEvent.setup()
    render(<AudioPanel />)

    await user.click(screen.getByRole('button', { name: 'Mulai timer' }))
    await user.click(screen.getByRole('button', { name: 'Reset timer' }))
    await user.click(screen.getByRole('button', { name: 'Tutup panel timer' }))

    expect(timerStart).toHaveBeenCalledOnce()
    expect(timerReset).toHaveBeenCalledOnce()
    expect(toggleAudioPanel).toHaveBeenCalledOnce()
  })
})
