/**
 * BiblePanel (v3) — Projection Mode Bible tab
 *
 * Features:
 * - DB search mode: debounced keyword/reference search with translation selector
 * - Browse mode: book → chapter → verse navigation with range support
 * - Manual mode: free-text input fallback when DB is empty
 * - Verse range: select start:end verse for multi-verse projection
 * - Recent verses history (last 10)
 * - Ctrl+Enter to send in manual mode
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Book,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Send,
  Type,
  X
} from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useAppStore } from '@renderer/store/useAppStore'
import type { SlideData, BibleTranslation, BibleBook, BibleVerse } from '@renderer/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BibleVerseResult {
  id: number
  translation_id: number
  book_id: number
  chapter: number
  verse: number
  text: string
  book_short?: string
  book_long?: string
}

type PanelMode = 'search' | 'browse' | 'manual'

// ─── Component ────────────────────────────────────────────────────────────────

export function BiblePanel(): React.JSX.Element {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [translations, setTranslations] = useState<BibleTranslation[]>([])
  const [selectedTranslationId, setSelectedTranslationId] = useState<number | null>(null)
  const [hasDB, setHasDB] = useState(false)
  const [mode, setMode] = useState<PanelMode>('search')

  // ── Search mode state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BibleVerseResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // ── Browse mode state ──────────────────────────────────────────────────────
  const [books, setBooks] = useState<BibleBook[]>([])
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([])
  const [isLoadingVerses, setIsLoadingVerses] = useState(false)
  const [rangeStart, setRangeStart] = useState<number | null>(null)
  const [rangeEnd, setRangeEnd] = useState<number | null>(null)

  // ── Manual mode state ──────────────────────────────────────────────────────
  const [manualRef, setManualRef] = useState('')
  const [manualText, setManualText] = useState('')

  // ── Shared state ───────────────────────────────────────────────────────────
  const [recentVerses, setRecentVerses] = useState<Array<{ ref: string; text: string }>>([])

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { showToast } = useAppStore()
  const { setSlides } = useProjectionStore()

  // ── Load translations on mount ─────────────────────────────────────────────
  useEffect(() => {
    window.api.bible
      .getTranslations()
      .then((data) => {
        const list = data as BibleTranslation[]
        setTranslations(list)
        if (list.length > 0) {
          setHasDB(true)
          const def = list.find((t) => (t as unknown as { is_default: number }).is_default === 1)
          setSelectedTranslationId(def?.id ?? list[0].id)
        } else {
          setMode('manual')
        }
      })
      .catch(() => setMode('manual'))
  }, [])

  // ── Load books when entering browse mode ───────────────────────────────────
  useEffect(() => {
    if (mode !== 'browse' || !hasDB || !selectedTranslationId) return
    if (books.length > 0) return // already loaded

    window.api.bible
      .getBooks(selectedTranslationId)
      .then((data) => setBooks(data as BibleBook[]))
      .catch(() => {
        showToast('Gagal memuat daftar kitab', 'error')
        setMode('search')
      })
  }, [mode, hasDB, selectedTranslationId, books.length, showToast])

  // ── Load chapter verses ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedBook || selectedChapter === null || !selectedTranslationId) return
    // Reset state before async fetch — intentional synchronous setState in effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingVerses(true)
    setChapterVerses([])
    setRangeStart(null)
    setRangeEnd(null)

    window.api.bible
      .getVerses(selectedTranslationId, selectedBook.id, selectedChapter)
      .then((data) => setChapterVerses(data as BibleVerse[]))
      .catch(() => showToast('Gagal memuat ayat', 'error'))
      .finally(() => setIsLoadingVerses(false))
  }, [selectedBook, selectedChapter, selectedTranslationId, showToast])

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'search' || !hasDB) return
    if (!query.trim() || query.trim().length < 2) {
      const t = setTimeout(() => setSearchResults([]), 0)
      return () => clearTimeout(t)
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await window.api.bible.searchVerses(
          query.trim(),
          selectedTranslationId ?? undefined
        )
        setSearchResults((results as BibleVerseResult[]).slice(0, 20))
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [query, selectedTranslationId, hasDB, mode])

  // ── Send verse(s) to projection ────────────────────────────────────────────
  const sendToProjection = useCallback(
    (text: string, ref: string) => {
      if (!text.trim()) {
        showToast('Teks ayat kosong', 'error')
        return
      }
      const refLabel = ref.trim() || 'Ayat'
      const slide: SlideData = {
        songId: -1,
        slideIndex: 0,
        text: text.trim(),
        sectionLabel: refLabel,
        bibleReference: refLabel
      }
      setSlides([slide], {
        hymnalCode: 'BIBLE',
        hymnalName: refLabel,
        songBackgroundConfig: ''
      })
      setRecentVerses((prev) => [
        { ref: refLabel, text: text.trim() },
        ...prev.filter((v) => v.ref !== refLabel).slice(0, 9)
      ])
      showToast(`"${refLabel}" masuk ke Preview`, 'success')
    },
    [setSlides, showToast]
  )

  // ── Handle DB search result click ──────────────────────────────────────────
  const handleResultClick = useCallback(
    (verse: BibleVerseResult) => {
      const bookName = verse.book_short || verse.book_long || 'Alkitab'
      const ref = `${bookName} ${verse.chapter}:${verse.verse}`
      sendToProjection(verse.text, ref)
    },
    [sendToProjection]
  )

  // ── Handle verse range send from browse mode ───────────────────────────────
  const handleRangeSend = useCallback(() => {
    if (!selectedBook || selectedChapter === null || chapterVerses.length === 0) return
    const start = rangeStart ?? 1
    const end = rangeEnd ?? start
    const verses = chapterVerses.filter((v) => v.verse >= start && v.verse <= end)
    if (verses.length === 0) return

    const text = verses.map((v) => v.text).join('\n')
    const rangeLabel =
      start === end
        ? `${selectedBook.short_name} ${selectedChapter}:${start}`
        : `${selectedBook.short_name} ${selectedChapter}:${start}-${end}`
    sendToProjection(text, rangeLabel)
  }, [selectedBook, selectedChapter, chapterVerses, rangeStart, rangeEnd, sendToProjection])

  // ── Handle single verse click in browse mode ───────────────────────────────
  const handleVerseClick = useCallback(
    (verse: BibleVerse) => {
      if (!selectedBook || selectedChapter === null) return
      const ref = `${selectedBook.short_name} ${selectedChapter}:${verse.verse}`
      sendToProjection(verse.text, ref)
    },
    [selectedBook, selectedChapter, sendToProjection]
  )

  // ── Handle manual send ─────────────────────────────────────────────────────
  const handleManualSend = useCallback(() => {
    sendToProjection(manualText, manualRef)
  }, [manualText, manualRef, sendToProjection])

  const handleManualKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleManualSend()
      }
    },
    [handleManualSend]
  )

  // ── Chapter count for selected book ───────────────────────────────────────
  const chapterCount = selectedBook?.chapter_count ?? 0

  // ── OT / NT book groups ────────────────────────────────────────────────────
  const otBooks = useMemo(() => books.filter((b) => b.testament === 'OT'), [books])
  const ntBooks = useMemo(() => books.filter((b) => b.testament === 'NT'), [books])

  // ── Range label preview ────────────────────────────────────────────────────
  const rangeLabel = useMemo(() => {
    if (!selectedBook || selectedChapter === null) return ''
    const start = rangeStart ?? 1
    const end = rangeEnd ?? start
    if (start === end) return `${selectedBook.short_name} ${selectedChapter}:${start}`
    return `${selectedBook.short_name} ${selectedChapter}:${start}-${end}`
  }, [selectedBook, selectedChapter, rangeStart, rangeEnd])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <aside className="projection-song-info-panel">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3 overflow-hidden">
        {/* ── Mode switcher — compact, inside content area ── */}
        {hasDB && (
          <div className="flex items-center gap-1 bg-black/20 rounded-lg p-0.5 border border-white/[0.05] flex-shrink-0">
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-6 px-2 rounded-md border text-[10px] font-bold transition-all ${
                mode === 'search'
                  ? 'bg-white/[0.08] text-text-primary border-white/[0.1]'
                  : 'text-text-disabled hover:text-text-secondary border-transparent hover:bg-white/[0.04]'
              }`}
              onClick={() => setMode('search')}
            >
              <Search size={10} />
              Cari
            </button>
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-6 px-2 rounded-md border text-[10px] font-bold transition-all ${
                mode === 'browse'
                  ? 'bg-white/[0.08] text-text-primary border-white/[0.1]'
                  : 'text-text-disabled hover:text-text-secondary border-transparent hover:bg-white/[0.04]'
              }`}
              onClick={() => setMode('browse')}
            >
              <BookOpen size={10} />
              Browse
            </button>
            <button
              className={`flex-1 inline-flex items-center justify-center gap-1.5 h-6 px-2 rounded-md border text-[10px] font-bold transition-all ${
                mode === 'manual'
                  ? 'bg-white/[0.08] text-text-primary border-white/[0.1]'
                  : 'text-text-disabled hover:text-text-secondary border-transparent hover:bg-white/[0.04]'
              }`}
              onClick={() => setMode('manual')}
            >
              <Type size={10} />
              Manual
            </button>
          </div>
        )}
        {/* ── SEARCH MODE ──────────────────────────────────────────────────── */}
        {mode === 'search' && hasDB && (
          <>
            {/* Translation selector */}
            {translations.length > 1 && (
              <select
                value={selectedTranslationId ?? ''}
                onChange={(e) => setSelectedTranslationId(Number(e.target.value))}
                className="w-full h-8 px-2 rounded-lg border border-border-default bg-bg-elevated text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-brand-primary/40"
              >
                {translations.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.code.toUpperCase()})
                  </option>
                ))}
              </select>
            )}

            {/* Search input */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              {isSearching && (
                <Loader2
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted animate-spin"
                />
              )}
              {query && !isSearching && (
                <button
                  onClick={() => {
                    setQuery('')
                    setSearchResults([])
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  <X size={12} />
                </button>
              )}
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kata kunci atau referensi..."
                className="w-full h-8 pl-8 pr-8 rounded-lg border border-border-default bg-bg-elevated text-[12px] text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60"
              />
            </div>

            {/* Search results */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-1">
              {searchResults.length === 0 && query.trim().length >= 2 && !isSearching && (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-text-muted">
                  <Book size={22} className="opacity-30" />
                  <p className="text-[11px]">Tidak ada hasil untuk &ldquo;{query}&rdquo;</p>
                </div>
              )}
              {searchResults.length === 0 && query.trim().length < 2 && (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-text-muted">
                  <Search size={22} className="opacity-30" />
                  <p className="text-[11px] text-center">
                    Ketik minimal 2 karakter untuk mencari ayat
                  </p>
                </div>
              )}
              {searchResults.map((verse) => {
                const bookName = verse.book_short || verse.book_long || 'Alkitab'
                const ref = `${bookName} ${verse.chapter}:${verse.verse}`
                return (
                  <button
                    key={verse.id}
                    type="button"
                    onClick={() => handleResultClick(verse)}
                    className="flex flex-col gap-1 px-3 py-2 rounded-lg text-left bg-white/[0.03] hover:bg-brand-primary/10 border border-transparent hover:border-brand-primary/20 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/70">
                        {ref}
                      </span>
                      <Send
                        size={11}
                        className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <p className="text-[11px] text-text-primary leading-relaxed line-clamp-2">
                      {verse.text}
                    </p>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ── BROWSE MODE ──────────────────────────────────────────────────── */}
        {mode === 'browse' && hasDB && (
          <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-1 text-[10px] font-semibold text-text-muted">
              <button
                onClick={() => {
                  setSelectedBook(null)
                  setSelectedChapter(null)
                  setChapterVerses([])
                }}
                className={`hover:text-text-secondary transition-colors ${!selectedBook ? 'text-brand-primary' : ''}`}
              >
                Alkitab
              </button>
              {selectedBook && (
                <>
                  <ChevronRight size={10} />
                  <button
                    onClick={() => {
                      setSelectedChapter(null)
                      setChapterVerses([])
                    }}
                    className={`hover:text-text-secondary transition-colors ${selectedChapter === null ? 'text-brand-primary' : ''}`}
                  >
                    {selectedBook.short_name}
                  </button>
                </>
              )}
              {selectedChapter !== null && (
                <>
                  <ChevronRight size={10} />
                  <span className="text-brand-primary">Pasal {selectedChapter}</span>
                </>
              )}
            </div>

            {/* Book list */}
            {!selectedBook && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3">
                {books.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-text-muted">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                )}
                {otBooks.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-disabled px-1 mb-1.5">
                      Perjanjian Lama
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {otBooks.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-semibold text-text-secondary bg-white/[0.03] hover:bg-brand-primary/10 hover:text-brand-primary border border-transparent hover:border-brand-primary/15 transition-all text-left truncate"
                          title={book.long_name}
                        >
                          {book.short_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {ntBooks.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-text-disabled px-1 mb-1.5">
                      Perjanjian Baru
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {ntBooks.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-semibold text-text-secondary bg-white/[0.03] hover:bg-brand-primary/10 hover:text-brand-primary border border-transparent hover:border-brand-primary/15 transition-all text-left truncate"
                          title={book.long_name}
                        >
                          {book.short_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chapter grid */}
            {selectedBook && selectedChapter === null && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-5 gap-1">
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setSelectedChapter(ch)}
                      className="h-9 rounded-lg text-[12px] font-bold text-text-secondary bg-white/[0.03] hover:bg-brand-primary/10 hover:text-brand-primary border border-transparent hover:border-brand-primary/15 transition-all"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Verse list with range selection */}
            {selectedBook && selectedChapter !== null && (
              <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
                {/* Range controls */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <span className="text-[10px] font-bold text-text-muted shrink-0">Ayat:</span>
                  <input
                    type="number"
                    min={1}
                    max={chapterVerses.length || 999}
                    value={rangeStart ?? ''}
                    onChange={(e) => setRangeStart(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Dari"
                    className="w-14 h-6 px-2 rounded-md border border-border-default bg-bg-elevated text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-brand-primary/40 text-center"
                  />
                  <span className="text-[10px] text-text-disabled">—</span>
                  <input
                    type="number"
                    min={rangeStart ?? 1}
                    max={chapterVerses.length || 999}
                    value={rangeEnd ?? ''}
                    onChange={(e) => setRangeEnd(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Sampai"
                    className="w-14 h-6 px-2 rounded-md border border-border-default bg-bg-elevated text-[11px] text-text-primary outline-none focus:ring-1 focus:ring-brand-primary/40 text-center"
                  />
                  <button
                    onClick={handleRangeSend}
                    disabled={!rangeStart}
                    className="ml-auto flex items-center gap-1 h-6 px-2.5 rounded-md bg-brand-primary/15 border border-brand-primary/25 text-brand-primary text-[10px] font-bold hover:bg-brand-primary/22 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={rangeLabel || 'Pilih ayat terlebih dahulu'}
                  >
                    <Send size={10} />
                    Kirim
                  </button>
                </div>

                {/* Verse list */}
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                  {isLoadingVerses && (
                    <div className="flex items-center justify-center py-6 text-text-muted">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {chapterVerses.map((verse) => {
                      const isInRange =
                        rangeStart !== null &&
                        verse.verse >= rangeStart &&
                        verse.verse <= (rangeEnd ?? rangeStart)
                      return (
                        <button
                          key={verse.id}
                          type="button"
                          onClick={() => handleVerseClick(verse)}
                          onMouseEnter={() => {
                            if (rangeStart !== null && rangeEnd === null) {
                              setRangeEnd(verse.verse)
                            }
                          }}
                          className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all group ${
                            isInRange
                              ? 'bg-brand-primary/10 border border-brand-primary/20'
                              : 'bg-transparent hover:bg-white/[0.04] border border-transparent'
                          }`}
                        >
                          <span
                            className={`shrink-0 text-[10px] font-bold tabular-nums w-5 text-right mt-0.5 ${isInRange ? 'text-brand-primary' : 'text-text-disabled'}`}
                          >
                            {verse.verse}
                          </span>
                          <p className="text-[11px] text-text-primary leading-relaxed flex-1 min-w-0">
                            {verse.text}
                          </p>
                          <Send
                            size={10}
                            className="shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL INPUT MODE ────────────────────────────────────────────── */}
        {mode === 'manual' && (
          <>
            <div className="relative">
              <Book
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Referensi (cth: Mazmur 23:1)"
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border-default bg-bg-elevated text-[12px] text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60"
              />
            </div>

            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={handleManualKeyDown}
              placeholder="Ketik atau tempel teks ayat di sini... (Ctrl+Enter untuk kirim)"
              rows={5}
              className="w-full flex-1 min-h-[80px] rounded-lg border border-border-default bg-bg-elevated text-[12px] text-text-primary p-3 resize-none placeholder:text-text-disabled outline-none leading-relaxed focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60"
            />

            <button
              type="button"
              onClick={handleManualSend}
              disabled={!manualText.trim()}
              className="flex items-center justify-center gap-2 h-9 rounded-lg bg-brand-primary text-white text-[12px] font-bold hover:bg-brand-primary-hover transition-colors shadow-[0_0_16px_rgba(99,102,241,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              Kirim ke Preview
            </button>
          </>
        )}

        {/* ── RECENT VERSES (shared between modes) ─────────────────────────── */}
        {recentVerses.length > 0 && (
          <div className="mt-1 border-t border-white/[0.05] pt-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
              Riwayat
            </span>
            <div className="mt-1.5 flex flex-col gap-1 max-h-[100px] overflow-y-auto scrollbar-thin">
              {recentVerses.map((v, i) => (
                <button
                  key={`${v.ref}-${i}`}
                  type="button"
                  onClick={() => {
                    setManualRef(v.ref)
                    setManualText(v.text)
                    setMode('manual')
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[11px] text-text-secondary bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <ChevronLeft size={10} className="shrink-0 text-text-muted rotate-180" />
                  <span className="font-semibold text-text-primary truncate">{v.ref}</span>
                  <span className="truncate flex-1 text-text-muted">{v.text.slice(0, 40)}…</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
