import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { BootTask } from '../bootStore'
import { useBootStore } from '../bootStore'
import { SplashScreen } from '../SplashScreen'

const makeTask = (overrides: Partial<BootTask>): BootTask => ({
  id: 'task',
  label: 'Task',
  status: 'pending',
  progress: 0,
  priority: 'critical',
  ...overrides
})

describe('startup SplashScreen', () => {
  beforeEach(() => {
    useBootStore.setState({ phase: 'renderer', tasks: [] })
  })

  it('renders the Quiet Signal identity without rotating tips or GPU badges', () => {
    render(<SplashScreen />)

    expect(screen.getByRole('heading', { name: 'SION Media' })).toBeVisible()
    expect(screen.getByText('Worship Presentation System')).toBeVisible()
    expect(screen.queryByText('GPU ACTIVE')).not.toBeInTheDocument()
    expect(screen.queryByText('Starting audio system...')).not.toBeInTheDocument()
  })

  it('shows average task progress and the active task label', () => {
    useBootStore.setState({
      tasks: [
        makeTask({ id: 'renderer', status: 'done', progress: 100 }),
        makeTask({
          id: 'library',
          label: 'Menyiapkan perpustakaan',
          status: 'running',
          progress: 40
        })
      ]
    })

    render(<SplashScreen />)

    expect(screen.getByRole('progressbar', { name: 'Progres startup' })).toHaveAttribute(
      'aria-valuenow',
      '70'
    )
    expect(screen.getByText('Menyiapkan perpustakaan')).toBeVisible()
    expect(screen.getByText('70%')).toBeVisible()
  })

  it('localizes known boot task labels for a consistent Indonesian experience', () => {
    useBootStore.setState({
      tasks: [
        makeTask({
          id: 'theme',
          label: 'Restoring theme & workspace',
          status: 'running',
          progress: 50
        })
      ]
    })

    render(<SplashScreen />)

    expect(screen.getByText('Memulihkan tema dan ruang kerja')).toBeVisible()
    expect(screen.queryByText('Restoring theme & workspace')).not.toBeInTheDocument()
  })

  it('uses a calm fallback status before tasks start', () => {
    render(<SplashScreen />)

    expect(screen.getByText('Menyiapkan ruang kerja')).toBeVisible()
    expect(screen.getByText('0%')).toBeVisible()
  })

  it('does not render after the boot reaches ready', () => {
    useBootStore.setState({ phase: 'ready' })

    render(<SplashScreen />)

    expect(screen.queryByRole('heading', { name: 'SION Media' })).not.toBeInTheDocument()
  })
})
