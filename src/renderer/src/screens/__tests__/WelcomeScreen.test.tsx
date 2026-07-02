import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SVGProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useModeStore } from '@renderer/store/useModeStore'
import { WelcomeScreen } from '../WelcomeScreen'

vi.mock('@renderer/assets/logo-shadow.svg?react', () => ({
  default: (props: SVGProps<SVGSVGElement>) => <svg aria-label="Logo SION Media" {...props} />
}))

describe('WelcomeScreen', () => {
  const finishOnboarding = vi.fn()

  beforeEach(() => {
    finishOnboarding.mockReset()
    useModeStore.setState({
      currentMode: 'PROJECTION',
      isFirstInstall: true,
      theme: 'dark',
      finishOnboarding
    })
    vi.mocked(window.api.settings.update).mockResolvedValue(undefined)
  })

  it('renders the single-screen editorial welcome without wizard controls', () => {
    render(<WelcomeScreen />)

    expect(screen.getByRole('heading', { name: 'Siap melayani. Tanpa kerumitan.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Masuk ke SION Media' })).toBeVisible()
    expect(screen.queryByText('Pilih Tampilan')).not.toBeInTheDocument()
    expect(screen.queryByText('Pilih Jalur Kerja Utama')).not.toBeInTheDocument()
  })

  it('uses scoped Electron layout classes so global resets cannot remove spacing', () => {
    render(<WelcomeScreen />)

    expect(screen.getByTestId('welcome-editorial-hero')).toHaveClass('welcome-editorial__hero')
    expect(screen.getByTestId('welcome-editorial-rail')).toHaveClass('welcome-editorial__rail')
  })

  it('persists the system theme before finishing in Library mode', async () => {
    render(<WelcomeScreen />)

    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke SION Media' }))

    await waitFor(() =>
      expect(window.api.settings.update).toHaveBeenCalledWith('app_theme_mode', 'system')
    )
    expect(finishOnboarding).toHaveBeenCalledWith({ theme: 'system', mode: 'LIBRARY' })
  })

  it('supports Enter as the primary welcome action', async () => {
    render(<WelcomeScreen />)

    fireEvent.keyDown(window, { key: 'Enter' })

    await waitFor(() =>
      expect(finishOnboarding).toHaveBeenCalledWith({ theme: 'system', mode: 'LIBRARY' })
    )
  })

  it('keeps onboarding open and exposes a retry message when persistence fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(window.api.settings.update).mockRejectedValueOnce(new Error('disk unavailable'))
    render(<WelcomeScreen />)

    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke SION Media' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pengaturan awal belum dapat disimpan. Silakan coba lagi.'
    )
    expect(finishOnboarding).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
