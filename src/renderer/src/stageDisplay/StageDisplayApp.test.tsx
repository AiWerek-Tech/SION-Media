import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { StageDisplayApp } from './StageDisplayApp'
import type { ConfidencePayload } from '@renderer/types'

type ConfidenceListener = (payload: ConfidencePayload) => void

describe('StageDisplayApp production confidence monitor', () => {
  let confidenceListener: ConfidenceListener

  beforeEach(() => {
    vi.mocked(window.api.confidence.onUpdate).mockImplementation((listener) => {
      confidenceListener = listener as ConfidenceListener
      return () => {}
    })
  })

  test('renders Bible content with clean verse typography and contextual metadata', () => {
    render(<StageDisplayApp />)

    act(() => {
      confidenceListener({
        currentSlide: {
          text: '[28] Allah memberkati mereka, lalu Allah berfirman kepada mereka: Beranakcuculah dan bertambah banyak.',
          sectionLabel: 'Kejadian 1:28',
          slideIndex: 27,
          totalSlides: 31,
          contentType: 'bible',
          bibleReference: 'Kejadian 1:28',
          bibleVersionCode: 'TB',
          bibleCopyright: '© LAI 1974'
        },
        nextSlide: null,
        currentSection: 'Kejadian 1:28',
        nextSection: null,
        song: null,
        clock: '10:46:45',
        timer: { elapsed: 75, running: true },
        status: { isLive: true, isFrozen: false, isBlack: false, projectionState: 'LIVE' }
      } as ConfidencePayload)
    })

    expect(screen.getByLabelText('Konten Alkitab')).toBeInTheDocument()
    expect(screen.getAllByText('Kejadian 1:28')).toHaveLength(2)
    expect(screen.getAllByText('TB')).toHaveLength(2)
    expect(screen.getByText(/Allah memberkati mereka/)).not.toHaveTextContent('[28]')
    expect(screen.getByText(/Allah memberkati mereka/)).toHaveAttribute(
      'data-text-fit',
      'comfortable'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '90')
    expect(screen.queryByText('No song loaded')).not.toBeInTheDocument()
    expect(screen.getByText('SLIDE TERAKHIR')).toBeInTheDocument()
  })

  test('shows song identity, next cue, and frozen runtime status', () => {
    render(<StageDisplayApp />)

    act(() => {
      confidenceListener({
        currentSlide: {
          text: 'Di hadapan hadirat-Mu; kami umat-Mu menyembah',
          sectionLabel: 'Verse 1',
          slideIndex: 0,
          totalSlides: 4,
          contentType: 'song'
        },
        nextSlide: {
          text: 'Mengakui Engkau Tuhan; Allah kekal, Maha kuasa',
          sectionLabel: 'Chorus',
          contentType: 'song'
        },
        currentSection: 'Verse 1',
        nextSection: 'Chorus',
        song: {
          title: 'Di Hadapan Hadirat-Mu',
          hymnalCode: 'LS 1',
          hymnalName: 'Lagu Sion',
          keyNote: 'D'
        },
        clock: '10:45:30',
        timer: { elapsed: 30, running: true },
        status: { isLive: true, isFrozen: true, isBlack: false, projectionState: 'FREEZE' }
      } as ConfidencePayload)
    })

    expect(screen.getByText('FREEZE')).toBeInTheDocument()
    expect(screen.getByText('Verse 1')).toBeInTheDocument()
    expect(screen.getByText('BERIKUTNYA')).toBeInTheDocument()
    expect(screen.getByText('Chorus')).toBeInTheDocument()
    expect(screen.getByText('Di Hadapan Hadirat-Mu')).toBeInTheDocument()
    expect(screen.getByText('Nada D')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })
})
