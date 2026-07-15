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

  test('does not overlay the idle watermark on live visual media', () => {
    render(
      <LiveProjectionCanvas
        slide={{
          contentType: 'custom',
          songId: null,
          playlistItemId: null,
          slideIndex: 0,
          text: '',
          sectionLabel: 'Gambar'
        }}
        projectionState="LIVE"
        theme={{
          song_background_config: JSON.stringify({
            mode: 'image',
            media: { path: 'C:\\media\\worship.png' }
          })
        }}
        animated={false}
      />
    )

    expect(screen.queryByText('SION PRESENTER')).not.toBeInTheDocument()
  })
})
