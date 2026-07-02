import React, { useCallback, useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Play,
  Package,
  Book,
  Globe,
  Compass,
  Check,
  Plus
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@renderer/store/useAppStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import type { SlideData } from '@renderer/types'
import { useBibleReader, BibleVerse } from '@renderer/features/bible/hooks/useBibleReader'
import { useBibleSearch } from '@renderer/features/bible/hooks/useBibleSearch'
import { Button, SearchInput, Spinner, EmptyState, Badge } from '@renderer/components/design-system'
import { buildBibleSlidesFromVerses } from '@renderer/features/bible/utils/buildBibleSlides'

const getFormattedCopyright = (version: { shortName: string; copyright?: string }): string => {
  const rawCopyright = version.copyright || '© LAI 1974'
  if (version.shortName === 'TB') {
    if (rawCopyright.toLowerCase().includes('dikutip dari')) {
      return rawCopyright
    }
    return `Dikutip dari ALKITAB (TB) ${rawCopyright}`
  }
  return rawCopyright
}

const translateError = (errStr: string | null): string | null => {
  if (!errStr) return null
  const lowercaseErr = errStr.toLowerCase()
  if (lowercaseErr.includes('not found') || lowercaseErr.includes('no such file')) {
    return 'Bible Pack TB tidak ditemukan. Silakan install ulang dari Settings > Bible Pack.'
  }
  if (
    lowercaseErr.includes('no such column') ||
    lowercaseErr.includes('no such table: bible_books') ||
    lowercaseErr.includes('no such table: bible_verses')
  ) {
    return 'Database Bible Pack tidak cocok dengan format SION Media.'
  }
  if (
    lowercaseErr.includes('fts') ||
    lowercaseErr.includes('fts5') ||
    lowercaseErr.includes('match') ||
    lowercaseErr.includes('no such table: bible_verses_fts')
  ) {
    return 'Pencarian belum dapat dijalankan. Periksa index FTS5 Bible Pack.'
  }
  return errStr
}

export function BibleScreen(): React.JSX.Element {
  const { setScreen, showToast } = useAppStore()
  const addBibleToPlaylist = usePlaylistStore((s) => s.addBibleToPlaylist)

  const reader = useBibleReader()
  const {
    versions,
    selectedVersion,
    otBooks,
    ntBooks,
    selectedBook,
    selectedChapter,
    verses,
    selectedRange,
    loadingVersions,
    loadingBooks,
    loadingVerses,
    error: readerError,
    selectVersion,
    selectBook,
    selectChapter,
    previousChapter,
    nextChapter,
    clickVerse,
    clearSelection
  } = reader

  const search = useBibleSearch()
  const {
    query,
    results: searchResults,
    parsedRef,
    isSearching,
    error: searchError,
    setQuery,
    search: doSearch,
    clearSearch
  } = search

  const [viewMode, setViewMode] = useState<'browse' | 'search'>('browse')
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showChapterPicker, setShowChapterPicker] = useState(false)

  const versionDropdownRef = useRef<HTMLDivElement>(null)
  const chapterPickerRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        versionDropdownRef.current &&
        !versionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowVersionDropdown(false)
      }
      if (chapterPickerRef.current && !chapterPickerRef.current.contains(event.target as Node)) {
        setShowChapterPicker(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setShowVersionDropdown(false)
        setShowChapterPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Filter book lists based on search query with aliases support
  const filterBook = useCallback(
    (book: { name: string; code: string }) => {
      const q = bookSearchQuery.toLowerCase().trim()
      if (!q) return true
      if (book.name.toLowerCase().includes(q)) return true

      const aliasMap: Record<string, string> = {
        kej: 'kej',
        kejadian: 'kej',
        kel: 'kel',
        keluaran: 'kel',
        ima: 'ima',
        imamat: 'ima',
        bil: 'bil',
        bilangan: 'bil',
        ula: 'ula',
        ulangan: 'ula',
        yos: 'yos',
        yosua: 'yos',
        hak: 'hak',
        hakimhakim: 'hak',
        rut: 'rut',
        ruth: 'rut',
        mzm: 'mzm',
        mazmur: 'mzm',
        ams: 'ams',
        amsal: 'ams',
        pkh: 'pkh',
        pengkhotbah: 'pkh',
        kid: 'kid',
        kidungagung: 'kid',
        yes: 'yes',
        yesaya: 'yes',
        yer: 'yer',
        yeremia: 'yer',
        rat: 'rat',
        ratapan: 'rat',
        yeh: 'yeh',
        yehezkiel: 'yeh',
        dan: 'dan',
        daniel: 'dan',
        rom: 'rom',
        roma: 'rom',
        kor: 'ko',
        korintus: 'ko',
        '1kor': '1ko',
        '2kor': '2ko',
        yoh: 'yoh',
        yohanes: 'yoh',
        ibr: 'ibr',
        ibrani: 'ibr',
        yak: 'yak',
        yakobus: 'yak',
        wah: 'why',
        wahyu: 'why',
        why: 'why',
        '1yoh': '1yo',
        '2yoh': '2yo',
        '3yoh': '3yo'
      }

      const targetCode = aliasMap[q]
      if (targetCode && book.code.toLowerCase().includes(targetCode)) return true
      return book.code.toLowerCase().includes(q)
    },
    [bookSearchQuery]
  )

  const filteredOtBooks = otBooks.filter(filterBook)
  const filteredNtBooks = ntBooks.filter(filterBook)

  // Double click verse to project immediately to Preview
  const handleDoubleClickVerse = useCallback(
    (verse: BibleVerse) => {
      if (!selectedBook || !selectedVersion) return
      const { setSlides, goToSlide } = useProjectionStore.getState()
      const refLabel = `${selectedBook.name} ${selectedChapter}:${verse.verse}`
      const displayRef = `${refLabel} · ${selectedVersion.shortName}`
      const copyright = getFormattedCopyright(selectedVersion)
      const slides: SlideData[] = [
        {
          contentType: 'bible',
          songId: 0,
          slideIndex: 0,
          text: `[${verse.verse}] ${verse.text.trim()}`,
          sectionLabel: refLabel,
          bibleReference: displayRef,
          bibleVersionCode: selectedVersion.versionCode,
          bibleCopyright: copyright
        }
      ]
      setSlides(slides)
      goToSlide(0)
      showToast(`${refLabel} dikirim ke Preview`, 'success')
      clearSelection()
    },
    [selectedBook, selectedChapter, selectedVersion, showToast, clearSelection]
  )

  // Project selected range
  const handleProjectVerses = useCallback((): void => {
    if (!selectedRange || !selectedBook || !selectedVersion) return

    const { setSlides, goToSlide } = useProjectionStore.getState()
    const slides = buildBibleSlidesFromVerses({
      verses: selectedRange.verses,
      bookName: selectedBook.name,
      chapter: selectedRange.chapter,
      versionShortName: selectedVersion.shortName,
      versionCode: selectedVersion.versionCode,
      copyright: getFormattedCopyright(selectedVersion)
    })

    setSlides(slides)
    goToSlide(0)
    clearSelection()
    showToast(
      `${selectedBook.name} ${selectedRange.chapter}:${selectedRange.verseStart}${selectedRange.verseEnd !== selectedRange.verseStart ? `-${selectedRange.verseEnd}` : ''} dikirim ke Preview`,
      'success'
    )
  }, [selectedRange, selectedBook, selectedVersion, showToast, clearSelection])

  // Project single verse search result
  const handleProjectSearchResult = useCallback(
    async (bookCode: string, bookName: string, chapter: number, verse: number): Promise<void> => {
      if (!selectedVersion) return
      try {
        const verseData = await window.api.biblePack.getVerseRange(
          selectedVersion.versionCode,
          bookCode,
          chapter,
          verse,
          verse
        )
        if (!verseData || verseData.length === 0) return
        const { setSlides, goToSlide } = useProjectionStore.getState()
        const v = verseData[0] as { text: string }
        const refLabel = `${bookName} ${chapter}:${verse}`
        const displayRef = `${refLabel} · ${selectedVersion.shortName}`
        const copyright = getFormattedCopyright(selectedVersion)
        const slides: SlideData[] = [
          {
            contentType: 'bible',
            songId: 0,
            slideIndex: 0,
            text: `[${verse}] ${v.text}`,
            sectionLabel: refLabel,
            bibleReference: displayRef,
            bibleVersionCode: selectedVersion.versionCode,
            bibleCopyright: copyright
          }
        ]
        setSlides(slides)
        goToSlide(0)
        showToast(`${refLabel} dikirim ke Preview`, 'success')
      } catch {
        showToast('Gagal memuat ayat', 'error')
      }
    },
    [selectedVersion, showToast]
  )

  // Render early loading states
  if (loadingVersions) {
    return (
      <div className="management-studio flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Render empty state if no Bible pack is loaded
  if (versions.length === 0) {
    return (
      <div className="management-studio">
        <div className="management-studio__shell flex flex-col h-full">
          <header className="management-studio__header">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setScreen('dashboard')}
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-border-default bg-bg-elevated hover:bg-bg-elevated-hover text-text-secondary hover:text-text-primary transition-all duration-150"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-brand-primary" />
                  <h1 className="font-heading text-[16px] font-bold text-text-primary">Alkitab</h1>
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 flex items-center justify-center p-8 bg-bg-surface/20 border border-border-default rounded-2xl mt-2">
            <EmptyState
              icon={Package}
              title="Belum Ada Bible Pack"
              description="Silakan tambahkan Bible Pack di menu pengaturan untuk mulai menggunakan Alkitab."
              action={
                <Button variant="primary" size="sm" onClick={() => setScreen('settings')}>
                  Buka Pengaturan → Bible Pack
                </Button>
              }
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="management-studio">
      <div className="management-studio__shell">
        {/* Header Bar */}
        <header className="management-studio__header relative z-30">
          {/* Title Area */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setScreen('dashboard')}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-border-default bg-bg-elevated hover:bg-bg-elevated-hover text-text-secondary hover:text-text-primary transition-all duration-150"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-brand-primary" />
                <h1 className="font-heading text-[16px] font-bold text-text-primary">Alkitab</h1>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 leading-none">
                {selectedVersion
                  ? `${selectedVersion.name} (${selectedVersion.shortName})`
                  : 'Pilih Versi'}
              </p>
            </div>
          </div>

          {/* Navigation Controls: Custom Chapter Grid Popover & Custom Translation Dropdown */}
          <div className="flex items-center gap-3">
            {/* Custom Chapter Grid Picker */}
            {selectedBook && (
              <div className="relative" ref={chapterPickerRef}>
                <button
                  onClick={() => setShowChapterPicker((prev) => !prev)}
                  className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border-default bg-bg-elevated hover:bg-bg-elevated-hover text-[12px] font-semibold text-text-primary transition-all duration-150"
                >
                  <Book size={14} className="text-brand-primary" />
                  <span>
                    {selectedBook.name} {selectedChapter}
                  </span>
                  <ChevronDown size={12} className="text-text-muted" />
                </button>

                <AnimatePresence>
                  {showChapterPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 z-50 w-72 rounded-2xl border border-border-strong bg-bg-surface p-4 shadow-xl backdrop-blur-md"
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-border-default pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Pilih Pasal
                        </span>
                        <span className="text-[10px] text-brand-primary font-semibold">
                          {selectedBook.chapters} pasal
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(
                          (ch) => (
                            <button
                              key={ch}
                              onClick={() => {
                                selectChapter(ch)
                                setShowChapterPicker(false)
                              }}
                              className={`flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150 ${
                                selectedChapter === ch
                                  ? 'bg-brand-primary text-white shadow-glow-sm shadow-brand-primary/20'
                                  : 'bg-bg-elevated hover:bg-bg-elevated-hover text-text-primary'
                              }`}
                            >
                              {ch}
                            </button>
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Custom Version Selector */}
            <div className="relative" ref={versionDropdownRef}>
              <button
                onClick={() => setShowVersionDropdown((prev) => !prev)}
                className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border-default bg-bg-elevated hover:bg-bg-elevated-hover text-[12px] font-semibold text-text-primary transition-all duration-150"
              >
                <Globe size={14} className="text-brand-primary" />
                <span>{selectedVersion?.shortName || 'Pilih Alkitab'}</span>
                <ChevronDown size={12} className="text-text-muted" />
              </button>

              <AnimatePresence>
                {showVersionDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 z-50 w-64 rounded-2xl border border-border-strong bg-bg-surface py-2 shadow-xl backdrop-blur-md"
                  >
                    <div className="px-3 py-1.5 border-b border-border-default text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Terjemahan Tersedia
                    </div>
                    <div className="max-h-48 overflow-y-auto mt-1 scrollbar-thin">
                      {versions.map((v) => (
                        <button
                          key={v.versionCode}
                          onClick={() => {
                            selectVersion(v.versionCode)
                            setShowVersionDropdown(false)
                          }}
                          className="flex items-center justify-between w-full px-3.5 py-2 text-left text-xs text-text-primary hover:bg-bg-elevated-hover transition-colors"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{v.shortName}</span>
                            <span className="text-[10px] text-text-muted">{v.name}</span>
                          </div>
                          {selectedVersion?.versionCode === v.versionCode && (
                            <Check size={14} className="text-brand-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Workspace Panels — Layout customized to have fixed sidebar width and flexible reading area */}
        <div className="flex flex-row flex-grow min-h-0 gap-3 w-full">
          {/* Books Sidebar Panel */}
          <aside className="management-browser h-full border border-border-default overflow-hidden flex flex-col w-[260px] shrink-0">
            <div className="p-3 border-b border-border-default flex-shrink-0">
              <SearchInput
                value={bookSearchQuery}
                onChange={(e) => setBookSearchQuery(e.target.value)}
                onClear={() => setBookSearchQuery('')}
                placeholder="Cari Kitab..."
                fullWidth
                size="sm"
              />
            </div>

            {loadingBooks ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                {/* Old Testament */}
                {filteredOtBooks.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                      Perjanjian Lama
                    </div>
                    {filteredOtBooks.map((book) => (
                      <button
                        key={book.code}
                        onClick={() => selectBook(book.code)}
                        className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-all duration-150 ${
                          selectedBook?.code === book.code
                            ? 'bg-brand-primary/10 border-l-4 border-brand-primary font-semibold text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                        }`}
                      >
                        <span>{book.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            selectedBook?.code === book.code
                              ? 'bg-brand-primary/20 text-brand-primary'
                              : 'bg-white/[0.03] text-text-muted'
                          }`}
                        >
                          {book.chapters}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* New Testament */}
                {filteredNtBooks.length > 0 && (
                  <div className="space-y-0.5 pt-2">
                    <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                      Perjanjian Baru
                    </div>
                    {filteredNtBooks.map((book) => (
                      <button
                        key={book.code}
                        onClick={() => selectBook(book.code)}
                        className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-all duration-150 ${
                          selectedBook?.code === book.code
                            ? 'bg-brand-primary/10 border-l-4 border-brand-primary font-semibold text-brand-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                        }`}
                      >
                        <span>{book.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                            selectedBook?.code === book.code
                              ? 'bg-brand-primary/20 text-brand-primary'
                              : 'bg-white/[0.03] text-text-muted'
                          }`}
                        >
                          {book.chapters}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredOtBooks.length === 0 && filteredNtBooks.length === 0 && (
                  <div className="py-8 text-center text-xs text-text-muted">
                    Kitab tidak ditemukan
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Reading & Search Workspace Panel */}
          <main className="management-browser h-full border border-border-default flex flex-col overflow-hidden relative flex-grow min-w-0">
            {/* View Mode Bar / Search Panel — Styled with flex layout to prevent overlap and text clipping */}
            <div className="management-command-bar border-b border-border-default">
              <div className="flex items-center justify-between gap-4 px-3 py-1.5 w-full">
                {/* Search query input */}
                <div className="flex-1 max-w-sm md:max-w-md">
                  <SearchInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onClear={() => {
                      clearSearch()
                      setViewMode('browse')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedVersion) {
                        doSearch(selectedVersion.versionCode)
                        setViewMode('search')
                      }
                    }}
                    placeholder='Cari ayat / referensi (mis. "Yoh 3:16")'
                    fullWidth
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={viewMode === 'browse' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('browse')}
                  >
                    Membaca
                  </Button>
                  <Button
                    variant={viewMode === 'search' ? 'primary' : 'ghost'}
                    size="sm"
                    disabled={!query.trim()}
                    onClick={() => {
                      if (selectedVersion) {
                        doSearch(selectedVersion.versionCode)
                        setViewMode('search')
                      }
                    }}
                  >
                    Hasil Cari
                  </Button>
                </div>
              </div>
            </div>

            {/* Error alerts */}
            {(readerError || searchError) && (
              <div className="m-4 flex items-center gap-2 rounded-xl bg-status-error/10 border border-status-error/20 px-4 py-3 text-xs text-rose-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>{translateError(readerError || searchError)}</span>
              </div>
            )}

            {/* Main content body view */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto relative p-4 scrollbar-thin ${selectedRange && viewMode === 'browse' ? 'pb-28' : ''}`}
            >
              {viewMode === 'search' ? (
                /* Search Results Panel */
                <div className="space-y-4">
                  {/* Reference detection spotlight */}
                  {parsedRef?.valid && (
                    <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/[0.02] p-4 shadow-[0_4px_16px_rgba(59,130,246,0.04)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary mt-0.5">
                            <Compass size={18} />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                              Referensi Terdeteksi
                            </span>
                            <h4 className="text-[15px] font-bold text-text-primary mt-0.5">
                              {parsedRef.bookName} {parsedRef.chapter}:{parsedRef.verseStart}
                              {parsedRef.verseEnd && parsedRef.verseEnd !== parsedRef.verseStart
                                ? `-${parsedRef.verseEnd}`
                                : ''}
                            </h4>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={async () => {
                            if (!selectedVersion) return
                            const bookCode = parsedRef.bookCode
                            const veRange = await window.api.biblePack.getVerseRange(
                              selectedVersion.versionCode,
                              bookCode,
                              parsedRef.chapter,
                              parsedRef.verseStart,
                              parsedRef.verseEnd ?? parsedRef.verseStart
                            )
                            if (!veRange || veRange.length === 0) return
                            selectBook(bookCode)
                            selectChapter(parsedRef.chapter)
                            setViewMode('browse')
                            clearSearch()
                          }}
                        >
                          Buka di Pasal
                        </Button>
                      </div>
                    </div>
                  )}

                  {isSearching ? (
                    <div className="flex h-32 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-xs text-text-muted">Tidak ada hasil ditemukan</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="group relative rounded-2xl border border-border-default bg-bg-surface/30 p-4 transition-all duration-150 hover:border-brand-primary/30 hover:bg-bg-surface/50"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-brand-primary tracking-wide">
                              {result.book_name} {result.chapter}:{result.verse}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Play size={12} />}
                              onClick={() =>
                                handleProjectSearchResult(
                                  result.book_code,
                                  result.book_name,
                                  result.chapter,
                                  result.verse
                                )
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Proyeksikan
                            </Button>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed font-medium">
                            {(() => {
                              const snippetText = result.snippet || result.text
                              const parts = snippetText.split(/(<mark>.*?<\/mark>)/gi)
                              return parts.map((part, index) => {
                                if (part.toLowerCase().startsWith('<mark>')) {
                                  const text = part.substring(6, part.length - 7)
                                  return (
                                    <mark
                                      key={index}
                                      className="bg-brand-primary/20 text-brand-primary hover:bg-brand-primary-hover/20 px-0.5 rounded font-semibold text-text-primary"
                                    >
                                      {text}
                                    </mark>
                                  )
                                }
                                return part
                              })
                            })()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Browse Mode Panel */
                <div className="relative">
                  {/* Chapter Nav Header */}
                  {selectedBook ? (
                    <div className="mb-6 flex items-center justify-between border-b border-border-default pb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Pasal Aktif
                        </span>
                        <h2 className="font-heading text-[18px] font-extrabold text-text-primary mt-0.5">
                          {selectedBook.name} Pasal {selectedChapter}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={selectedChapter <= 1}
                          onClick={previousChapter}
                          icon={<ChevronLeft size={16} />}
                        />
                        <span className="text-xs font-semibold px-2 text-text-secondary">
                          {selectedChapter} / {selectedBook.chapters}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={selectedChapter >= selectedBook.chapters}
                          onClick={nextChapter}
                          icon={<ChevronRight size={16} />}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48">
                      <p className="text-xs text-text-muted">
                        Pilih kitab di panel kiri untuk mulai membaca
                      </p>
                    </div>
                  )}

                  {loadingVerses ? (
                    <div className="flex h-32 items-center justify-center">
                      <Spinner size="md" />
                    </div>
                  ) : verses.length === 0 ? (
                    selectedBook && (
                      <div className="flex h-32 items-center justify-center text-text-muted text-xs">
                        Tidak ada ayat ditemukan
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      {verses.map((verse) => {
                        const isSelected =
                          selectedRange !== null &&
                          selectedRange.chapter === selectedChapter &&
                          verse.verse >= selectedRange.verseStart &&
                          verse.verse <= selectedRange.verseEnd

                        return (
                          <div
                            key={verse.verse}
                            onClick={() => clickVerse(verse)}
                            onDoubleClick={() => handleDoubleClickVerse(verse)}
                            className={`cursor-pointer rounded-2xl p-3 border leading-relaxed transition-all duration-150 select-none ${
                              isSelected
                                ? 'bg-brand-primary/[0.08] border-brand-primary/30 shadow-[0_0_12px_rgba(59,130,246,0.06)]'
                                : 'bg-transparent border-transparent hover:bg-bg-elevated/40 hover:border-border-default'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <sup
                                className={`text-[11px] font-bold shrink-0 mt-1 h-5 w-5 flex items-center justify-center rounded-lg ${
                                  isSelected
                                    ? 'bg-brand-primary text-white'
                                    : 'text-brand-primary bg-brand-primary/10'
                                }`}
                              >
                                {verse.verse}
                              </sup>
                              <p className="text-xs text-text-primary leading-relaxed font-medium">
                                {verse.text}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Floating selected range bar */}
            <AnimatePresence>
              {selectedRange && viewMode === 'browse' && (
                <motion.div
                  initial={{ opacity: 0, y: 32, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 32, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="absolute bottom-4 left-4 right-4 z-40 bg-glass-bg border border-glass-border backdrop-blur-md rounded-2xl shadow-xl p-4 flex items-center justify-between gap-4 max-w-xl mx-auto"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading text-[13px] font-bold text-text-primary">
                        {selectedRange.bookName} {selectedRange.chapter}:{selectedRange.verseStart}
                        {selectedRange.verseEnd !== selectedRange.verseStart &&
                          `-${selectedRange.verseEnd}`}
                      </span>
                      <Badge variant="info" className="text-[10px]">
                        {selectedRange.verses.length} ayat
                      </Badge>
                    </div>
                    {selectedVersion && (
                      <p className="text-[10px] text-text-muted leading-none mt-1 truncate max-w-sm lg:max-w-md">
                        {getFormattedCopyright(selectedVersion)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Batal
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus size={12} />}
                      onClick={() => {
                        if (!selectedRange || !selectedBook || !selectedVersion) return
                        addBibleToPlaylist({
                          bible_version_code: selectedVersion.versionCode,
                          bible_version_short_name: selectedVersion.shortName,
                          bible_book_code: selectedBook.code,
                          bible_book_name: selectedBook.name,
                          bible_chapter: selectedRange.chapter,
                          bible_verse_start: selectedRange.verseStart,
                          bible_verse_end: selectedRange.verseEnd || selectedRange.verseStart,
                          bible_reference: `${selectedBook.name} ${selectedRange.chapter}:${selectedRange.verseStart}${selectedRange.verseEnd !== selectedRange.verseStart ? `-${selectedRange.verseEnd}` : ''}`,
                          bible_text_json: JSON.stringify(
                            selectedRange.verses.map((v) => ({
                              book_code: selectedBook.code,
                              book_name: selectedBook.name,
                              chapter: selectedRange.chapter,
                              verse: v.verse,
                              text: v.text
                            }))
                          ),
                          bible_copyright: getFormattedCopyright(selectedVersion)
                        })
                        clearSelection()
                      }}
                    >
                      Tambah ke Playlist
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Play size={12} />}
                      onClick={handleProjectVerses}
                      className="shadow-glow-sm shadow-brand-primary/20"
                    >
                      Kirim ke Preview
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
