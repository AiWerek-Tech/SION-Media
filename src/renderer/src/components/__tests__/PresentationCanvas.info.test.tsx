import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PresentationCanvas } from '../PresentationCanvas'
import type { SlideData } from '@renderer/types'

describe('PresentationCanvas Info hierarchy', () => {
  it('renders a smaller title and a dominant body in Preview and Live canvases', () => {
    const slide: SlideData = {
      contentType: 'custom',
      songId: null,
      slideIndex: 0,
      sectionLabel: 'Pengkhotbah:',
      text: 'Pdt. Frengky Lokobal'
    }

    render(
      <PresentationCanvas
        slide={slide}
        projectionState="LIVE"
        theme={{ projection_font_size: '86', projection_text_color: '#ffffff' }}
        animated={false}
      />
    )

    const title = screen.getByTestId('info-slide-title')
    const body = screen.getByTestId('info-slide-body')
    expect(title).toHaveTextContent('Pengkhotbah:')
    expect(body).toHaveTextContent('Pdt. Frengky Lokobal')
    expect(Number.parseFloat(title.style.fontSize)).toBeLessThan(
      Number.parseFloat(body.style.fontSize)
    )
    expect(title.style.color).not.toBe(body.style.color)
  })
})
