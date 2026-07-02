/**
 * useBibleReader — Bible chapter navigation from external SQLite pack
 *
 * Manages: version selection, book selection, chapter navigation, verse selection
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatBibleError } from '../utils/bibleErrors'

export interface BibleVersion {
  versionCode: string
  name: string
  shortName: string
  language: string
  publisher: string
  copyright: string
  booksCount: number
  chaptersCount: number
  versesCount: number
  fts5Created: boolean
  isDefault: boolean
  packId: string
}

export interface BibleBook {
  code: string
  osis_id: string
  name: string
  testament: 'OT' | 'NT'
  order: number
  chapters: number
}

export interface BibleVerse {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

export interface SelectedVerseRange {
  bookCode: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number
  verses: BibleVerse[]
}

interface UseBibleReaderReturn {
  // Data
  versions: BibleVersion[]
  selectedVersion: BibleVersion | null
  books: BibleBook[]
  otBooks: BibleBook[]
  ntBooks: BibleBook[]
  selectedBook: BibleBook | null
  selectedChapter: number
  verses: BibleVerse[]
  selectedRange: SelectedVerseRange | null

  // Loading states
  loadingVersions: boolean
  loadingBooks: boolean
  loadingVerses: boolean
  error: string | null

  // Actions
  selectVersion: (versionCode: string) => void
  selectBook: (bookCode: string) => void
  selectChapter: (chapter: number) => void
  openReference: (bookCode: string, chapter: number, verseStart: number, verseEnd?: number) => void
  previousChapter: () => void
  nextChapter: () => void
  clickVerse: (verse: BibleVerse) => void
  clearSelection: () => void
}

interface SavedReadingPosition {
  versionCode: string
  bookCode: string
  chapter: number
}

function parseSavedReadingPosition(value: string | undefined): SavedReadingPosition | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<SavedReadingPosition>
    if (
      typeof parsed.versionCode !== 'string' ||
      typeof parsed.bookCode !== 'string' ||
      !Number.isInteger(parsed.chapter) ||
      Number(parsed.chapter) < 1
    ) {
      return null
    }
    return {
      versionCode: parsed.versionCode,
      bookCode: parsed.bookCode,
      chapter: Number(parsed.chapter)
    }
  } catch {
    return null
  }
}

export function useBibleReader(): UseBibleReaderReturn {
  const [versions, setVersions] = useState<BibleVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion | null>(null)
  const [books, setBooks] = useState<BibleBook[]>([])
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [selectedRange, setSelectedRange] = useState<SelectedVerseRange | null>(null)

  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingBooks, setLoadingBooks] = useState(false)
  const [loadingVerses, setLoadingVerses] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingReferenceRef = useRef<{
    bookCode: string
    chapter: number
    verseStart: number
    verseEnd: number
  } | null>(null)

  // Load versions on mount
  useEffect(() => {
    let mounted = true
    // The hook owns this request lifecycle; reset loading synchronously on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingVersions(true)
    setError(null)
    window.api.biblePack
      .getVersions()
      .then((result) => {
        if (!mounted) return
        const versionList = result as BibleVersion[]
        setVersions(versionList)
        const defaultVersion = versionList.find((v) => v.isDefault) ?? versionList[0] ?? null
        setSelectedVersion(defaultVersion)
      })
      .catch((err) => {
        if (!mounted) return
        setError(formatBibleError(err))
      })
      .finally(() => {
        if (mounted) setLoadingVersions(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Load books when version changes
  useEffect(() => {
    if (!selectedVersion) return
    let mounted = true
    // Version changes invalidate all dependent book state immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingBooks(true)
    setError(null)
    setBooks([])
    setSelectedBook(null)
    setSelectedChapter(1)
    setVerses([])
    setSelectedRange(null)

    Promise.all([
      window.api.biblePack.getBooks(selectedVersion.versionCode),
      window.api.settings.getAll().catch(() => ({}) as Record<string, string>)
    ])
      .then(([result, settings]) => {
        if (!mounted) return
        const bookList = result as BibleBook[]
        const savedPosition = parseSavedReadingPosition(settings.bible_reader_last_position)
        const resumedBook =
          savedPosition?.versionCode === selectedVersion.versionCode
            ? bookList.find((book) => book.code === savedPosition.bookCode)
            : undefined
        setBooks(bookList)
        setSelectedBook(resumedBook ?? bookList[0] ?? null)
        if (resumedBook && savedPosition) {
          setSelectedChapter(Math.min(savedPosition.chapter, resumedBook.chapters))
        }
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setError(formatBibleError(err))
      })
      .finally(() => {
        if (mounted) setLoadingBooks(false)
      })
    return () => {
      mounted = false
    }
  }, [selectedVersion])

  // Load verses when book or chapter changes
  useEffect(() => {
    if (!selectedVersion || !selectedBook) return
    let mounted = true
    // Book/chapter changes invalidate the visible verses immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingVerses(true)
    setError(null)
    setVerses([])

    window.api.biblePack
      .getChapter(selectedVersion.versionCode, selectedBook.code, selectedChapter)
      .then((result) => {
        if (!mounted) return
        const chapterVerses = result as BibleVerse[]
        setVerses(chapterVerses)
        const pending = pendingReferenceRef.current
        if (
          pending &&
          pending.bookCode === selectedBook.code &&
          pending.chapter === selectedChapter
        ) {
          const rangeVerses = chapterVerses.filter(
            (verse) => verse.verse >= pending.verseStart && verse.verse <= pending.verseEnd
          )
          if (rangeVerses.length > 0) {
            setSelectedRange({
              bookCode: selectedBook.code,
              bookName: selectedBook.name,
              chapter: selectedChapter,
              verseStart: rangeVerses[0].verse,
              verseEnd: rangeVerses[rangeVerses.length - 1].verse,
              verses: rangeVerses
            })
          }
          pendingReferenceRef.current = null
        }
        setError(null)
      })
      .catch((err) => {
        if (!mounted) return
        setError(formatBibleError(err))
      })
      .finally(() => {
        if (mounted) setLoadingVerses(false)
      })
    return () => {
      mounted = false
    }
  }, [selectedVersion, selectedBook, selectedChapter])

  const selectVersion = useCallback(
    (versionCode: string) => {
      const v = versions.find((v) => v.versionCode === versionCode) ?? null
      setSelectedVersion(v)
    },
    [versions]
  )

  const selectBook = useCallback(
    (bookCode: string) => {
      const book = books.find((b) => b.code === bookCode) ?? null
      setSelectedBook(book)
      setSelectedChapter(1)
      setSelectedRange(null)
    },
    [books]
  )

  const selectChapter = useCallback((chapter: number) => {
    setSelectedChapter(chapter)
    setSelectedRange(null)
  }, [])

  const openReference = useCallback(
    (bookCode: string, chapter: number, verseStart: number, verseEnd = verseStart) => {
      const book = books.find((candidate) => candidate.code === bookCode)
      if (!book) return
      const targetChapter = Math.min(Math.max(1, chapter), book.chapters)
      pendingReferenceRef.current = { bookCode, chapter: targetChapter, verseStart, verseEnd }
      setSelectedBook(book)
      setSelectedChapter(targetChapter)
      setSelectedRange(null)
    },
    [books]
  )

  const previousChapter = useCallback(() => {
    if (!selectedBook) return
    if (selectedChapter > 1) {
      setSelectedChapter((chapter) => chapter - 1)
      setSelectedRange(null)
      return
    }
    const bookIndex = books.findIndex((book) => book.code === selectedBook.code)
    const previousBook = bookIndex > 0 ? books[bookIndex - 1] : null
    if (!previousBook) return
    setSelectedBook(previousBook)
    setSelectedChapter(previousBook.chapters)
    setSelectedRange(null)
  }, [books, selectedBook, selectedChapter])

  const nextChapter = useCallback(() => {
    if (!selectedBook) return
    if (selectedChapter < selectedBook.chapters) {
      setSelectedChapter((chapter) => chapter + 1)
      setSelectedRange(null)
      return
    }
    const bookIndex = books.findIndex((book) => book.code === selectedBook.code)
    const nextBook = bookIndex >= 0 && bookIndex < books.length - 1 ? books[bookIndex + 1] : null
    if (!nextBook) return
    setSelectedBook(nextBook)
    setSelectedChapter(1)
    setSelectedRange(null)
  }, [books, selectedBook, selectedChapter])

  const clickVerse = useCallback(
    (verse: BibleVerse) => {
      if (!selectedBook) return

      if (selectedRange === null) {
        // Start new selection
        setSelectedRange({
          bookCode: selectedBook.code,
          bookName: selectedBook.name,
          chapter: selectedChapter,
          verseStart: verse.verse,
          verseEnd: verse.verse,
          verses: [verse]
        })
      } else if (selectedRange.chapter === selectedChapter) {
        // Extend selection range
        const start = Math.min(selectedRange.verseStart, verse.verse)
        const end = Math.max(selectedRange.verseStart, verse.verse)
        const rangeVerses = verses.filter((v) => v.verse >= start && v.verse <= end)
        setSelectedRange({
          ...selectedRange,
          verseStart: start,
          verseEnd: end,
          verses: rangeVerses
        })
      } else {
        // Different chapter — clear selection
        setSelectedRange(null)
      }
    },
    [selectedBook, selectedChapter, selectedRange, verses]
  )

  const clearSelection = useCallback(() => {
    setSelectedRange(null)
  }, [])

  const otBooks = books.filter((b) => b.testament === 'OT')
  const ntBooks = books.filter((b) => b.testament === 'NT')

  return {
    versions,
    selectedVersion,
    books,
    otBooks,
    ntBooks,
    selectedBook,
    selectedChapter,
    verses,
    selectedRange,
    loadingVersions,
    loadingBooks,
    loadingVerses,
    error,
    selectVersion,
    selectBook,
    selectChapter,
    openReference,
    previousChapter,
    nextChapter,
    clickVerse,
    clearSelection
  }
}
