import React, { useEffect, useState } from 'react'
import { Search, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import type { BibleTranslation, BibleBook, BibleVerse, SlideData } from '@renderer/types'

// Standard Bible book names (can be localized later)
const OLD_TESTAMENT_BOOKS = [
  { number: 1, short: 'Kej', long: 'Kejadian' },
  { number: 2, short: 'Kel', long: 'Keluaran' },
  { number: 3, short: 'Im', long: 'Imamat' },
  { number: 4, short: 'Bil', long: 'Bilangan' },
  { number: 5, short: 'Ul', long: 'Ulangan' },
  { number: 6, short: 'Yos', long: 'Yosua' },
  { number: 7, short: 'Hak', long: 'Hakim-Hakim' },
  { number: 8, short: 'Rut', long: 'Rut' },
  { number: 9, short: '1Sam', long: '1 Samuel' },
  { number: 10, short: '2Sam', long: '2 Samuel' },
  { number: 11, short: '1Raj', long: '1 Raja-Raja' },
  { number: 12, short: '2Raj', long: '2 Raja-Raja' },
  { number: 13, short: '1Taw', long: '1 Tawarikh' },
  { number: 14, short: '2Taw', long: '2 Tawarikh' },
  { number: 15, short: 'Ezr', long: 'Ezra' },
  { number: 16, short: 'Neh', long: 'Nehemia' },
  { number: 17, short: 'Est', long: 'Ester' },
  { number: 18, short: 'Ayb', long: 'Ayub' },
  { number: 19, short: 'Maz', long: 'Mazmur' },
  { number: 20, short: 'Ams', long: 'Amsal' },
  { number: 21, short: 'Peng', long: 'Pengkhotbah' },
  { number: 22, short: 'Kid', long: 'Kidung Agung' },
  { number: 23, short: 'Yes', long: 'Yesaya' },
  { number: 24, short: 'Yer', long: 'Yeremia' },
  { number: 25, short: 'Rat', long: 'Ratapan' },
  { number: 26, short: 'Yeh', long: 'Yehezkiel' },
  { number: 27, short: 'Dan', long: 'Daniel' },
  { number: 28, short: 'Hos', long: 'Hosea' },
  { number: 29, short: 'Yl', long: 'Yoel' },
  { number: 30, short: 'Am', long: 'Amos' },
  { number: 31, short: 'Ob', long: 'Obaja' },
  { number: 32, short: 'Yun', long: 'Yunus' },
  { number: 33, short: 'Mi', long: 'Mikha' },
  { number: 34, short: 'Na', long: 'Nahum' },
  { number: 35, short: 'Hab', long: 'Habakuk' },
  { number: 36, short: 'Sef', long: 'Zefanya' },
  { number: 37, short: 'Hag', long: 'Hagai' },
  { number: 38, short: 'Za', long: 'Zakharia' },
  { number: 39, short: 'Mal', long: 'Maleakhi' }
]

const NEW_TESTAMENT_BOOKS = [
  { number: 40, short: 'Mat', long: 'Matius' },
  { number: 41, short: 'Mrk', long: 'Markus' },
  { number: 42, short: 'Luk', long: 'Lukas' },
  { number: 43, short: 'Yoh', long: 'Yohanes' },
  { number: 44, short: 'Kis', long: 'Kisah Para Rasul' },
  { number: 45, short: 'Rom', long: 'Roma' },
  { number: 46, short: '1Kor', long: '1 Korintus' },
  { number: 47, short: '2Kor', long: '2 Korintus' },
  { number: 48, short: 'Gal', long: 'Galatia' },
  { number: 49, short: 'Ef', long: 'Efesus' },
  { number: 50, short: 'Fil', long: 'Filipi' },
  { number: 51, short: 'Kol', long: 'Kolose' },
  { number: 52, short: '1Tes', long: '1 Tesalonika' },
  { number: 53, short: '2Tes', long: '2 Tesalonika' },
  { number: 54, short: '1Tim', long: '1 Timotius' },
  { number: 55, short: '2Tim', long: '2 Timotius' },
  { number: 56, short: 'Tit', long: 'Titus' },
  { number: 57, short: 'Flm', long: 'Filemon' },
  { number: 58, short: 'Ibr', long: 'Ibrani' },
  { number: 59, short: 'Yak', long: 'Yakobus' },
  { number: 60, short: '1Pet', long: '1 Petrus' },
  { number: 61, short: '2Pet', long: '2 Petrus' },
  { number: 62, short: '1Yoh', long: '1 Yohanes' },
  { number: 63, short: '2Yoh', long: '2 Yohanes' },
  { number: 64, short: '3Yoh', long: '3 Yohanes' },
  { number: 65, short: 'Yud', long: 'Yudas' },
  { number: 66, short: 'Wah', long: 'Wahyu' }
]

interface SelectedVerse {
  bookId: number
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number
  verses: BibleVerse[]
}

export function BibleScreen(): React.JSX.Element {
  const { setScreen, showToast } = useAppStore()
  const [translations, setTranslations] = useState<BibleTranslation[]>([])
  const [selectedTranslation, setSelectedTranslation] = useState<BibleTranslation | null>(null)
  const [books, setBooks] = useState<BibleBook[]>([])
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [selectedVerses, setSelectedVerses] = useState<SelectedVerse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<unknown[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [viewMode, setViewMode] = useState<'browse' | 'search'>('browse')

  // Load translations on mount
  useEffect(() => {
    let mounted = true
    window.api.bible
      .getTranslations()
      .then((result) => {
        if (!mounted) return
        const data = result as BibleTranslation[]
        setTranslations(data)
        if (data.length > 0) {
          const defaultTrans = data.find((t) => t.is_default) || data[0]
          setSelectedTranslation(defaultTrans)
        }
      })
      .catch((err) => console.error('Failed to load translations:', err))
    return () => {
      mounted = false
    }
  }, [])

  // Load books when translation changes
  useEffect(() => {
    if (!selectedTranslation) return
    let mounted = true
    window.api.bible
      .getBooks(selectedTranslation.id)
      .then((result) => {
        if (mounted) setBooks(result as BibleBook[])
      })
      .catch((err) => console.error('Failed to load books:', err))
    return () => {
      mounted = false
    }
  }, [selectedTranslation])

  // Load verses when book/chapter changes
  useEffect(() => {
    if (!selectedTranslation || !selectedBook) return
    let mounted = true
    window.api.bible
      .getVerses(selectedTranslation.id, selectedBook.id, selectedChapter)
      .then((result) => {
        if (mounted) setVerses(result as BibleVerse[])
      })
      .catch((err) => console.error('Failed to load verses:', err))
    return () => {
      mounted = false
    }
  }, [selectedTranslation, selectedBook, selectedChapter])

  const handleSearch = async (): Promise<void> => {
    if (!searchQuery.trim() || !selectedTranslation) return

    setIsSearching(true)
    try {
      const results = (await window.api.bible.searchVerses(
        searchQuery,
        selectedTranslation.id
      )) as unknown[]
      setSearchResults(results)
      setViewMode('search')
    } catch (err) {
      console.error('Search failed:', err)
      showToast('Pencarian gagal', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  const handleVerseClick = (verse: BibleVerse, isRangeEnd?: boolean): void => {
    if (!selectedBook) return

    if (selectedVerses === null) {
      // Start selection
      setSelectedVerses({
        bookId: selectedBook.id,
        bookName: selectedBook.long_name,
        chapter: selectedChapter,
        verseStart: verse.verse,
        verseEnd: verse.verse,
        verses: [verse]
      })
    } else if (selectedVerses.chapter === selectedChapter && !isRangeEnd) {
      // Extend selection
      const start = Math.min(selectedVerses.verseStart, verse.verse)
      const end = Math.max(selectedVerses.verseStart, verse.verse)
      const rangeVerses = verses.filter((v) => v.verse >= start && v.verse <= end)
      setSelectedVerses({
        ...selectedVerses,
        verseStart: start,
        verseEnd: end,
        verses: rangeVerses
      })
    } else {
      // Clear selection
      setSelectedVerses(null)
    }
  }

  const handleProjectVerses = (): void => {
    if (!selectedVerses || !selectedBook) return

    const { setSlides, goToSlide } = useProjectionStore.getState()
    const MAX_LENGTH = 180 // Soft character limit for auto-splitting

    const slides: SlideData[] = []
    let currentText = ''
    let vStart = selectedVerses.verses[0]?.verse || 0
    let vEnd = selectedVerses.verses[0]?.verse || 0
    let slideIndex = 0

    const pushSlide = (): void => {
      if (!currentText.trim()) return
      slides.push({
        songId: 0,
        slideIndex: slideIndex++,
        text: currentText.trim(),
        sectionLabel: `${selectedBook.long_name} ${selectedVerses.chapter}:${vStart}${vEnd !== vStart ? '-' + vEnd : ''}`,
        bibleId: selectedTranslation?.id,
        bibleReference: `${selectedBook.short_name} ${selectedVerses.chapter}:${vStart}${vEnd !== vStart ? '-' + vEnd : ''}`
      })
    }

    for (const verse of selectedVerses.verses) {
      const verseStr = `[${verse.verse}] ${verse.text.trim()}`

      if (currentText.length === 0) {
        currentText = verseStr
        vStart = verse.verse
        vEnd = verse.verse
      } else if (currentText.length + verseStr.length > MAX_LENGTH) {
        pushSlide()
        currentText = verseStr
        vStart = verse.verse
        vEnd = verse.verse
      } else {
        currentText += ` ${verseStr}`
        vEnd = verse.verse
      }
    }

    if (currentText) {
      pushSlide()
    }

    setSlides(slides)
    goToSlide(0)
    showToast(
      `${selectedVerses.bookName} ${selectedVerses.chapter}:${selectedVerses.verseStart}-${selectedVerses.verseEnd} diproyeksikan`,
      'success'
    )
  }

  const chapterCount = selectedBook?.chapter_count || 1

  return (
    <div className="flex h-full flex-col bg-bg-base">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-default bg-bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('dashboard')}
            className="rounded-md p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-accent-primary" />
            <h1 className="text-lg font-semibold">Alkitab</h1>
          </div>
        </div>

        {/* Translation Selector */}
        <select
          value={selectedTranslation?.id || ''}
          onChange={(e) => {
            const trans = translations.find((t) => t.id === Number(e.target.value))
            setSelectedTranslation(trans || null)
          }}
          className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-sm"
        >
          {translations.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.code})
            </option>
          ))}
        </select>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Book Selector Sidebar */}
        <aside className="w-48 border-r border-border-default bg-bg-surface overflow-y-auto">
          <div className="p-2">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Perjanjian Lama
            </div>
            {OLD_TESTAMENT_BOOKS.map((book) => {
              const dbBook = books.find((b) => b.book_number === book.number)
              return (
                <button
                  key={book.number}
                  onClick={() => {
                    if (dbBook) {
                      setSelectedBook(dbBook)
                      setSelectedChapter(1)
                      setSelectedVerses(null)
                    }
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    selectedBook?.book_number === book.number
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  {book.short}
                </button>
              )
            })}

            <div className="mb-2 mt-4 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Perjanjian Baru
            </div>
            {NEW_TESTAMENT_BOOKS.map((book) => {
              const dbBook = books.find((b) => b.book_number === book.number)
              return (
                <button
                  key={book.number}
                  onClick={() => {
                    if (dbBook) {
                      setSelectedBook(dbBook)
                      setSelectedChapter(1)
                      setSelectedVerses(null)
                    }
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    selectedBook?.book_number === book.number
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`}
                >
                  {book.short}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Chapter & Verse Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="border-b border-border-default p-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Cari ayat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-md border border-border-default bg-bg-elevated py-2 pl-9 pr-4 text-sm focus:border-accent-primary focus:outline-none"
              />
            </div>
          </div>

          {viewMode === 'browse' ? (
            <>
              {/* Chapter Navigation */}
              {selectedBook && (
                <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface px-4 py-2">
                  <span className="font-medium">{selectedBook.long_name}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedChapter(Math.max(1, selectedChapter - 1))}
                      disabled={selectedChapter <= 1}
                      className="rounded p-1 text-text-muted hover:bg-bg-elevated disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <select
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(Number(e.target.value))}
                      className="rounded border border-border-default bg-bg-elevated px-2 py-1 text-sm"
                    >
                      {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                        <option key={ch} value={ch}>
                          Pasal {ch}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        setSelectedChapter(Math.min(chapterCount, selectedChapter + 1))
                      }
                      disabled={selectedChapter >= chapterCount}
                      className="rounded p-1 text-text-muted hover:bg-bg-elevated disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Verses */}
              <div className="flex-1 overflow-y-auto p-4">
                {verses.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-text-muted">
                    {selectedBook ? 'Tidak ada ayat ditemukan' : 'Pilih kitab untuk mulai membaca'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {verses.map((verse) => {
                      const isSelected =
                        selectedVerses &&
                        selectedVerses.chapter === selectedChapter &&
                        verse.verse >= selectedVerses.verseStart &&
                        verse.verse <= selectedVerses.verseEnd

                      return (
                        <p
                          key={verse.id}
                          onClick={() => handleVerseClick(verse)}
                          className={`cursor-pointer rounded-md p-2 transition-colors ${
                            isSelected ? 'bg-accent-primary/20' : 'hover:bg-bg-elevated'
                          }`}
                        >
                          <sup className="mr-1 text-xs font-medium text-accent-primary">
                            {verse.verse}
                          </sup>
                          {verse.text}
                        </p>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selected Verses Action Bar */}
              {selectedVerses && (
                <div className="border-t border-border-default bg-bg-surface px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">
                        {selectedVerses.bookName} {selectedVerses.chapter}:
                        {selectedVerses.verseStart}
                        {selectedVerses.verseEnd !== selectedVerses.verseStart &&
                          `-${selectedVerses.verseEnd}`}
                      </span>
                      <span className="ml-2 text-sm text-text-muted">
                        ({selectedVerses.verses.length} ayat dipilih)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedVerses(null)}
                        className="rounded-md px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-elevated"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleProjectVerses}
                        className="rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-primary/90"
                      >
                        Proyeksikan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Search Results */
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">Hasil Pencarian</h3>
                <button
                  onClick={() => setViewMode('browse')}
                  className="text-sm text-accent-primary hover:underline"
                >
                  Kembali ke Browse
                </button>
              </div>
              {isSearching ? (
                <div className="text-center text-text-muted">Mencari...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center text-text-muted">Tidak ada hasil</div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result, idx) => {
                    const r = result as {
                      id: number
                      book_short: string
                      book_long: string
                      chapter: number
                      verse: number
                      text: string
                    }
                    return (
                      <div
                        key={idx}
                        className="rounded-md border border-border-default bg-bg-surface p-3 hover:border-accent-primary"
                      >
                        <div className="mb-1 text-sm font-medium text-accent-primary">
                          {r.book_long} {r.chapter}:{r.verse}
                        </div>
                        <p className="text-sm">{r.text}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
