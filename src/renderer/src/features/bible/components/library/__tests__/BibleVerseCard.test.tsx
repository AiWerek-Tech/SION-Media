import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BibleVerseCard } from '../BibleVerseCard'

describe('BibleVerseCard — Render debug', () => {
  test('renders complete verse text without truncation in DOM', () => {
    const noop = vi.fn()
    const verse = {
      book_code: 'kej',
      book_name: 'Kejadian',
      chapter: 1,
      verse: 2,
      text: 'Bumi belum berbentuk dan kosong; gelap gulita menutupi samudera raya, dan Roh Allah melayang-layang di atas permukaan air.'
    }

    render(
      <BibleVerseCard
        verse={verse}
        isSelected={false}
        isInspected={false}
        highlightColor=""
        hasNote={false}
        onClickVerse={noop}
        onInspect={noop}
        onPreview={noop}
        onLive={noop}
        onAddPlaylist={noop}
      />
    )

    const textEl = screen.getByText(/Bumi belum berbentuk/)
    expect(textEl).toBeInTheDocument()
    expect(textEl.textContent).toBe(verse.text)
  })
})
