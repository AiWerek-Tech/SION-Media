import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { TitleBarUtilityButtons } from './TitleBar'
import { TitleBarMenu } from './TitleBarMenu'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore, type AppMode } from '../../store/useModeStore'

function resetNavigation(mode: AppMode): void {
  useAppStore.setState({ currentScreen: 'dashboard' })
  useModeStore.setState({ currentMode: mode, isFirstInstall: false })
}

describe('settings navigation preserves the originating dashboard mode', () => {
  beforeEach(() => {
    vi.mocked(window.api.system.setMode).mockClear()
  })

  test.each<AppMode>(['LIBRARY', 'PROJECTION'])(
    'title bar settings opened from %s does not switch to Management',
    (mode) => {
      resetNavigation(mode)
      render(<TitleBarUtilityButtons />)

      fireEvent.click(screen.getByRole('button', { name: 'Buka pengaturan aplikasi' }))

      expect(useAppStore.getState().currentScreen).toBe('settings')
      expect(useModeStore.getState().currentMode).toBe(mode)
      expect(window.api.system.setMode).not.toHaveBeenCalled()
    }
  )

  test('Preferences menu preserves Projection mode', () => {
    resetNavigation('PROJECTION')
    render(<TitleBarMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'File' }))
    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }))

    expect(useAppStore.getState().currentScreen).toBe('settings')
    expect(useModeStore.getState().currentMode).toBe('PROJECTION')
    expect(window.api.system.setMode).not.toHaveBeenCalled()
  })
})
