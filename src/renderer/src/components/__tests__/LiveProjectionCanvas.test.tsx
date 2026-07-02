import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { LiveProjectionCanvas } from '../LiveProjectionCanvas'

describe('LiveProjectionCanvas parity contract', () => {
  test('shows the same fallback identity when the live output is empty', () => {
    render(
      <LiveProjectionCanvas slide={null} projectionState="CLEAR" theme={{}} animated={false} />
    )

    expect(screen.getByText('SION PRESENTER')).toBeVisible()
  })

  test('shows the configured projection logo when the live output is empty', () => {
    render(
      <LiveProjectionCanvas
        slide={null}
        projectionState="CLEAR"
        theme={{ projection_logo: 'C:\\media\\logo.png' }}
        animated={false}
      />
    )

    expect(screen.getByRole('img')).toHaveAttribute('src', 'file://C:/media/logo.png')
  })
})
