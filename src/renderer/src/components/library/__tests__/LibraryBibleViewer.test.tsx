import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LibraryBibleViewer } from '../LibraryBibleViewer'

const book = {
  code: 'EXO',
  osis_id: 'Exod',
  name: 'Keluaran',
  testament: 'OT' as const,
  order: 2,
  chapters: 40
}

const verses = [
  {
    book_code: 'EXO',
    book_name: 'Keluaran',
    chapter: 31,
    verse: 1,
    text: 'Berfirmanlah TUHAN kepada Musa:'
  },
  {
    book_code: 'EXO',
    book_name: 'Keluaran',
    chapter: 31,
    verse: 2,
    text: 'Lihat, telah Kutunjuk Bezaleel bin Uri.'
  }
]

describe('LibraryBibleViewer', () => {
  beforeEach(() => {
    vi.mocked(window.api.settings.getAll).mockResolvedValue({})
    vi.mocked(window.api.settings.update).mockResolvedValue(undefined)
  })

  it('renders every verse as a separate readable block', () => {
    render(
      <LibraryBibleViewer
        selectedBook={book}
        selectedChapter={31}
        versionCode="TB"
        verses={verses}
        books={[book]}
        onClose={vi.fn()}
        onPrevChapter={vi.fn()}
        onNextChapter={vi.fn()}
      />
    )

    const verseBlocks = screen.getAllByTestId('fullscreen-bible-verse')
    expect(verseBlocks).toHaveLength(2)
    expect(verseBlocks[0]).toHaveTextContent('1 Berfirmanlah TUHAN kepada Musa:')
    expect(verseBlocks[1]).toHaveTextContent('2 Lihat, telah Kutunjuk Bezaleel bin Uri.')
  })

  it('keeps the native window-controls safe area clear', () => {
    render(
      <LibraryBibleViewer
        selectedBook={book}
        selectedChapter={31}
        versionCode="TB"
        verses={verses}
        books={[book]}
        onClose={vi.fn()}
        onPrevChapter={vi.fn()}
        onNextChapter={vi.fn()}
      />
    )

    expect(screen.getByTestId('bible-reader-toolbar')).toHaveClass('bible-reader__toolbar')
  })

  it('provides compact reader controls and reading progress', () => {
    render(
      <LibraryBibleViewer
        selectedBook={book}
        selectedChapter={31}
        versionCode="TB"
        verses={verses}
        books={[book]}
        onClose={vi.fn()}
        onPrevChapter={vi.fn()}
        onNextChapter={vi.fn()}
      />
    )

    expect(screen.getByRole('progressbar', { name: 'Progres membaca' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pengaturan membaca' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mulai gulir otomatis' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigasi pasal' })).toBeInTheDocument()
  })

  it('loads and persists reader preferences through the settings backend', async () => {
    vi.mocked(window.api.settings.getAll).mockResolvedValue({
      bible_reader_theme: 'sepia',
      bible_reader_font_size: '28',
      bible_reader_width: 'wide',
      bible_reader_scroll_speed: '4'
    })

    render(
      <LibraryBibleViewer
        selectedBook={book}
        selectedChapter={31}
        versionCode="TB"
        verses={verses}
        books={[book]}
        onClose={vi.fn()}
        onPrevChapter={vi.fn()}
        onNextChapter={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pengaturan membaca' }))
    await waitFor(() => expect(screen.getByText('28 px')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Tema sepia' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tema terang' }))
    await waitFor(() =>
      expect(window.api.settings.update).toHaveBeenCalledWith('bible_reader_theme', 'light')
    )
  })
})
