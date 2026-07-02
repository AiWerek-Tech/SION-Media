/**
 * BiblePanel (v3.1 Multiple Choice Overhauled) — Projection Mode Bible tab
 *
 * Features:
 * - External SQLite packs API integration (window.api.biblePack)
 * - Unified search / reference input bar
 * - Real-time reference parsing with spotlight preview cards
 * - Multi-choice checklist (checkboxes) inside Spotlight Preview and Browse list
 * - Dynamic reference range formatter (e.g., "Kejadian 1:1, 3-4")
 * - Shift-click contiguous range selection + single click toggle in browse mode
 * - Dual CUE (Preview) and LIVE (instant TAKE) action triggers
 * - Recent scriptures history quick re-projector
 * - Translucent dark glass aesthetics matching V3 Presenter
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Book,
  BookOpen,
  ChevronRight,
  Loader2,
  Search,
  Send,
  Type,
  X,
  Zap,
  Globe,
  History,
  Check,
  HelpCircle,
  Plus
} from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { usePlaylistStore } from '@renderer/store/usePlaylistStore'
import { Button, SearchInput, Spinner, Badge } from '@renderer/components/design-system'
import { buildBibleSlidesFromVerses } from '@renderer/features/bible/utils/buildBibleSlides'

// ─── Local Types ─────────────────────────────────────────────────────────────

interface BibleVersion {
  versionCode: string
  name: string
  shortName: string
  copyright?: string
  booksCount: number
  isDefault: boolean
}

interface BibleBook {
  code: string
  name: string
  chapters: number
  testament: 'OT' | 'NT'
}

interface BibleVerse {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

interface BibleSearchResult {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
  snippet?: string
}

interface SpotlightData {
  reference: string
  verses: Array<{ verse: number; text: string }>
  bookName: string
  bookCode: string
  chapter: number
  verseStart: number
  verseEnd: number | null
}

interface HistoryItem {
  ref: string
  versionCode: string
  bookName: string
  chapter: number
  verses: Array<{ verse: number; text: string }>
}

type PanelMode = 'search' | 'browse' | 'manual'

// ─── Helper Functions ─────────────────────────────────────────────────────────

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

/**
 * Format a list of verse integers into a standard range format (e.g. [1, 2, 4, 5] -> "1-2, 4-5")
 */
const formatVerseRanges = (verses: number[]): string => {
  if (verses.length === 0) return ''
  const sorted = [...verses].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i]
    } else {
      if (start === prev) {
        ranges.push(`${start}`)
      } else {
        ranges.push(`${start}-${prev}`)
      }
      start = sorted[i]
      prev = sorted[i]
    }
  }
  if (start === prev) {
    ranges.push(`${start}`)
  } else {
    ranges.push(`${start}-${prev}`)
  }
  return ranges.join(', ')
}

export function BiblePanel(): React.JSX.Element {
  // ─── Core state ─────────────────────────────────────────────────────────────
  const [versions, setVersions] = useState<BibleVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion | null>(null)
  const [mode, setMode] = useState<PanelMode>('search')
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)
  const [showHelpPopover, setShowHelpPopover] = useState(false)
  const addBibleToPlaylist = usePlaylistStore((s) => s.addBibleToPlaylist)

  // ─── Search mode state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BibleSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null)
  const [spotlightCheckedVerses, setSpotlightCheckedVerses] = useState<Set<number>>(new Set())

  // ─── Browse mode state ──────────────────────────────────────────────────────
  const [books, setBooks] = useState<BibleBook[]>([])
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null)
  const [chapterVerses, setChapterVerses] = useState<BibleVerse[]>([])
  const [isLoadingVerses, setIsLoadingVerses] = useState(false)
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [lastClickedVerse, setLastClickedVerse] = useState<number | null>(null)

  // ─── Manual mode state ──────────────────────────────────────────────────────
  const [manualRef, setManualRef] = useState('')
  const [manualText, setManualText] = useState('')

  // ─── History state ──────────────────────────────────────────────────────────
  const [recentVerses, setRecentVerses] = useState<HistoryItem[]>([])
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionDropdownRef = useRef<HTMLDivElement>(null)
  const helpPopoverRef = useRef<HTMLDivElement>(null)

  const { showToast } = useAppStore()

  // ─── Version selector & Help popover click-outside listener ────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        versionDropdownRef.current &&
        !versionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowVersionDropdown(false)
      }
      if (helpPopoverRef.current && !helpPopoverRef.current.contains(event.target as Node)) {
        setShowHelpPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Load active Bible versions on mount ────────────────────────────────────
  useEffect(() => {
    window.api.biblePack
      .getVersions()
      .then((data) => {
        const list = data as BibleVersion[]
        setVersions(list)
        if (list.length > 0) {
          const def = list.find((v) => v.isDefault) ?? list[0]
          setSelectedVersion(def)
        } else {
          setMode('manual')
        }
      })
      .catch(() => {
        setMode('manual')
      })
  }, [])

  // ─── Load books list when selected version changes ──────────────────────────
  useEffect(() => {
    if (!selectedVersion) return
    let mounted = true
    window.api.biblePack
      .getBooks(selectedVersion.versionCode)
      .then((data) => {
        if (mounted) {
          setBooks(data as BibleBook[])
          setSelectedBook(null)
          setSelectedChapter(null)
          setChapterVerses([])
          setSelectedVerses(new Set())
          setLastClickedVerse(null)
          setSpotlight(null)
        }
      })
      .catch(() => {
        showToast('Gagal memuat daftar kitab', 'error')
      })
    return () => {
      mounted = false
    }
  }, [selectedVersion, showToast])

  // ─── Load verses list when browsing book/chapter changes ─────────────────────
  useEffect(() => {
    if (!selectedVersion || !selectedBook || selectedChapter === null) return
    let mounted = true
    // Navigation invalidates the visible chapter immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingVerses(true)
    setChapterVerses([])
    setSelectedVerses(new Set())
    setLastClickedVerse(null)

    window.api.biblePack
      .getChapter(selectedVersion.versionCode, selectedBook.code, selectedChapter)
      .then((data) => {
        if (mounted) {
          setChapterVerses(data as BibleVerse[])
        }
      })
      .catch(() => {
        showToast('Gagal memuat ayat', 'error')
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingVerses(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [selectedVersion, selectedBook, selectedChapter, showToast])

  // ─── Real-time smart reference parsing & keyword search debounce ────────────
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || !selectedVersion) {
      // Empty search input resets derived search state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([])
      setSpotlight(null)
      return
    }

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        // 1. Try real-time reference parsing
        const parsed = await window.api.biblePack.parseReference(trimmed)
        if (parsed.valid) {
          const fetchedVerses = await window.api.biblePack.getVerseRange(
            selectedVersion.versionCode,
            parsed.bookCode,
            parsed.chapter,
            parsed.verseStart,
            parsed.verseEnd ?? parsed.verseStart
          )

          if (fetchedVerses && fetchedVerses.length > 0) {
            setSpotlight({
              reference: `${parsed.bookName} ${parsed.chapter}:${parsed.verseStart}${
                parsed.verseEnd && parsed.verseEnd !== parsed.verseStart
                  ? `-${parsed.verseEnd}`
                  : ''
              }`,
              verses: fetchedVerses.map((v) => ({ verse: v.verse, text: v.text })),
              bookName: parsed.bookName,
              bookCode: parsed.bookCode,
              chapter: parsed.chapter,
              verseStart: parsed.verseStart,
              verseEnd: parsed.verseEnd
            })
            setSearchResults([])
            setIsSearching(false)
            return
          }
        }

        // 2. Keyword search fallback
        setSpotlight(null)
        const results = await window.api.biblePack.search(selectedVersion.versionCode, trimmed, 20)
        setSearchResults(results as BibleSearchResult[])
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [query, selectedVersion])

  // Reset checkboxes inside spotlight preview whenever spotlight shifts
  useEffect(() => {
    if (spotlight) {
      // A new spotlight owns a fresh default checkbox selection.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpotlightCheckedVerses(new Set(spotlight.verses.map((v) => v.verse)))
    } else {
      setSpotlightCheckedVerses(new Set())
    }
  }, [spotlight])

  // ─── Projections Engine (Multi-slide support) ──────────────────────────────
  const handleProjectVerses = useCallback(
    (
      versesToProject: Array<{ verse: number; text: string }>,
      refText: string,
      bookName: string,
      chapter: number,
      activeLive = false
    ) => {
      if (!selectedVersion) return

      const { setSlides, goToSlide, takeCue } = useProjectionStore.getState()
      const slides = buildBibleSlidesFromVerses({
        verses: versesToProject,
        bookName,
        chapter,
        versionShortName: selectedVersion.shortName,
        versionCode: selectedVersion.versionCode,
        copyright: getFormattedCopyright(selectedVersion)
      })

      setSlides(slides, {
        hymnalCode: 'BIBLE',
        hymnalName: refText,
        songBackgroundConfig: ''
      })
      goToSlide(0)

      if (activeLive) {
        takeCue()
        showToast(`"${refText}" diproyeksikan LIVE`, 'success')
      } else {
        showToast(`"${refText}" dikirim ke Preview`, 'success')
      }

      // Add to recent history
      setRecentVerses((prev) => [
        {
          ref: refText,
          versionCode: selectedVersion.versionCode,
          bookName,
          chapter,
          verses: versesToProject
        },
        ...prev.filter((v) => v.ref !== refText).slice(0, 9)
      ])
    },
    [selectedVersion, showToast]
  )

  // ─── Handle clicks on search result rows ────────────────────────────────────
  const handleSearchResultClick = useCallback((res: BibleSearchResult) => {
    // Load this single verse directly into the interactive Spotlight Card
    setIsHistoryExpanded(false)
    setSpotlight({
      reference: `${res.book_name} ${res.chapter}:${res.verse}`,
      verses: [{ verse: res.verse, text: res.text }],
      bookName: res.book_name,
      bookCode: res.book_code,
      chapter: res.chapter,
      verseStart: res.verse,
      verseEnd: null
    })
  }, [])

  const handleSearchResultDoubleClick = useCallback(
    (res: BibleSearchResult) => {
      // Instantly projects search row to Preview (CUE) on double click
      const ref = `${res.book_name} ${res.chapter}:${res.verse}`
      handleProjectVerses(
        [{ verse: res.verse, text: res.text }],
        ref,
        res.book_name,
        res.chapter,
        false
      )
    },
    [handleProjectVerses]
  )

  // ─── Handles browse list click actions ──────────────────────────────────────
  const handleBrowseVerseClick = useCallback(
    (verse: BibleVerse, event: React.MouseEvent) => {
      if (!selectedBook || selectedChapter === null) return

      const newSelected = new Set(selectedVerses)

      if (event.shiftKey && lastClickedVerse !== null) {
        // Range select contiguous rows
        const start = Math.min(lastClickedVerse, verse.verse)
        const end = Math.max(lastClickedVerse, verse.verse)
        for (let v = start; v <= end; v++) {
          newSelected.add(v)
        }
      } else {
        // Toggle individual choice (multiple non-contiguous support)
        if (newSelected.has(verse.verse)) {
          newSelected.delete(verse.verse)
        } else {
          newSelected.add(verse.verse)
        }
      }

      setLastClickedVerse(verse.verse)
      setSelectedVerses(newSelected)
      setIsHistoryExpanded(false)

      if (newSelected.size === 0) {
        setSpotlight(null)
      } else {
        const sortedNumbers = Array.from(newSelected).sort((a, b) => a - b)
        const selected = chapterVerses.filter((v) => newSelected.has(v.verse))

        setSpotlight({
          reference: `${selectedBook.name} ${selectedChapter}:${formatVerseRanges(sortedNumbers)}`,
          verses: selected.map((v) => ({ verse: v.verse, text: v.text })),
          bookName: selectedBook.name,
          bookCode: selectedBook.code,
          chapter: selectedChapter,
          verseStart: sortedNumbers[0],
          verseEnd: sortedNumbers[sortedNumbers.length - 1]
        })
      }
    },
    [selectedBook, selectedChapter, selectedVerses, lastClickedVerse, chapterVerses]
  )

  const handleBrowseVerseDoubleClick = useCallback(
    (verse: BibleVerse) => {
      if (!selectedBook || selectedChapter === null) return

      let versesToProject: Array<{ verse: number; text: string }> = []
      let ref = ''

      if (selectedVerses.has(verse.verse)) {
        // Project all selected verses
        const sortedNumbers = Array.from(selectedVerses).sort((a, b) => a - b)
        versesToProject = chapterVerses.filter((v) => selectedVerses.has(v.verse))
        ref = `${selectedBook.name} ${selectedChapter}:${formatVerseRanges(sortedNumbers)}`
      } else {
        // Project only this double-clicked verse
        versesToProject = [{ verse: verse.verse, text: verse.text }]
        ref = `${selectedBook.name} ${selectedChapter}:${verse.verse}`
      }

      handleProjectVerses(versesToProject, ref, selectedBook.name, selectedChapter, false)
    },
    [selectedBook, selectedChapter, selectedVerses, chapterVerses, handleProjectVerses]
  )

  // ─── Manual Mode projection trigger ──────────────────────────────────────────
  const handleManualSend = useCallback(
    (live = false) => {
      if (!manualText.trim()) return
      const refLabel = manualRef.trim() || 'Ayat Manual'
      handleProjectVerses([{ verse: 1, text: manualText.trim() }], refLabel, refLabel, 1, live)
    },
    [manualText, manualRef, handleProjectVerses]
  )

  // ─── Book list filters inside browse sidebar ──────────────────────────────────
  const filteredBooks = useMemo(() => {
    const q = bookSearchQuery.toLowerCase().trim()
    if (!q) return books
    return books.filter((b) => b.name.toLowerCase().includes(q))
  }, [books, bookSearchQuery])

  const otBooks = useMemo(() => filteredBooks.filter((b) => b.testament === 'OT'), [filteredBooks])
  const ntBooks = useMemo(() => filteredBooks.filter((b) => b.testament === 'NT'), [filteredBooks])

  return (
    <aside className="projection-song-info-panel projection-bible-panel h-full flex flex-col overflow-hidden">
      {/* ─── Compact controls: translation, modes, help ─── */}
      <div className="projection-bible-panel__header projection-bible-panel__control-bar">
        <div className="contents">
          <div className="projection-bible-panel__help relative">
            {/* Help Button & Popover */}
            <div className="relative" ref={helpPopoverRef}>
              <button
                type="button"
                onClick={() => setShowHelpPopover((prev) => !prev)}
                className="flex items-center justify-center w-4 h-4 rounded-full text-text-disabled hover:text-text-primary hover:bg-white/[0.06] transition-colors"
                title="Panduan Pintasan"
              >
                <HelpCircle size={11} />
              </button>

              {showHelpPopover && (
                <div className="absolute left-0 mt-1.5 z-50 w-64 rounded-xl border border-white/[0.1] bg-bg-surface p-3 shadow-xl backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 mb-2">
                    <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider">
                      Panduan Mini Alkitab
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowHelpPopover(false)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      <X size={10} />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-[9.5px] leading-relaxed text-text-secondary font-medium">
                    <div>
                      <h4 className="font-bold text-text-primary text-[8.5px] uppercase tracking-wider text-brand-primary mb-1">
                        Pencarian / Input Pintar
                      </h4>
                      <ul className="list-disc pl-3.5 space-y-1">
                        <li>
                          Ketik referensi (cth:{' '}
                          <code className="text-brand-primary px-1 bg-white/[0.04] rounded font-mono text-[8px]">
                            Yoh 3:16
                          </code>
                          ) lalu tekan{' '}
                          <kbd className="bg-white/[0.08] px-1 rounded text-[8px] font-mono border border-white/[0.1] text-text-primary">
                            Enter
                          </kbd>{' '}
                          untuk mengirim ke <strong>Preview (CUE)</strong>.
                        </li>
                        <li>
                          Tekan{' '}
                          <kbd className="bg-white/[0.08] px-1 rounded text-[8px] font-mono border border-white/[0.1] text-text-primary">
                            Ctrl + Enter
                          </kbd>{' '}
                          untuk memproyeksikan langsung ke layar utama{' '}
                          <strong>(LIVE / Program)</strong>.
                        </li>
                      </ul>
                    </div>

                    <div className="border-t border-white/[0.04] pt-2">
                      <h4 className="font-bold text-text-primary text-[8.5px] uppercase tracking-wider text-brand-primary mb-1">
                        Metode Browse (Daftar Ayat)
                      </h4>
                      <ul className="list-disc pl-3.5 space-y-1">
                        <li>
                          <strong>Klik</strong> pada ayat untuk memilih/menghapus pilihan ayat
                          (multiple choice).
                        </li>
                        <li>
                          Gunakan{' '}
                          <kbd className="bg-white/[0.08] px-1 rounded text-[8px] font-mono border border-white/[0.1] text-text-primary">
                            Shift + Klik
                          </kbd>{' '}
                          untuk memilih rentang ayat secara berurutan.
                        </li>
                        <li>
                          <strong>Double-click</strong> pada ayat terpilih untuk mengirim seluruh
                          seleksi ke <strong>Preview</strong>.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Styled compact Version Dropdown Selector */}
          {versions.length > 0 && selectedVersion && (
            <div className="projection-bible-panel__version relative" ref={versionDropdownRef}>
              <button
                type="button"
                onClick={() => setShowVersionDropdown((prev) => !prev)}
                aria-label={`Pilih versi Alkitab, ${selectedVersion.shortName}`}
                className="flex items-center gap-1 h-6 px-2 rounded-md border border-white/[0.08] bg-white/[0.03] text-[9px] font-bold text-text-secondary hover:text-text-primary transition-all"
              >
                <Globe size={10} className="text-brand-primary" />
                <span>{selectedVersion.shortName}</span>
              </button>

              {showVersionDropdown && (
                <div className="absolute right-0 mt-1 z-50 w-44 rounded-lg border border-white/[0.1] bg-bg-surface py-1 shadow-xl max-h-48 overflow-y-auto scrollbar-thin">
                  {versions.map((v) => (
                    <button
                      key={v.versionCode}
                      type="button"
                      onClick={() => {
                        setSelectedVersion(v)
                        setShowVersionDropdown(false)
                      }}
                      className="flex items-center justify-between w-full px-2.5 py-1.5 text-left text-[10px] text-text-primary hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{v.shortName}</span>
                        <span className="text-[8px] text-text-muted truncate max-w-[100px]">
                          {v.name}
                        </span>
                      </div>
                      {selectedVersion.versionCode === v.versionCode && (
                        <Check size={10} className="text-brand-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Inline tabs switcher */}
        <div className="projection-bible-panel__mode-tabs flex items-center gap-1 bg-black/20 rounded-lg p-0.5 border border-white/[0.05]">
          {(['search', 'browse', 'manual'] as PanelMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`flex-1 inline-flex items-center justify-center gap-1 h-6 rounded-md text-[9px] font-bold uppercase transition-all duration-150 ${
                mode === m
                  ? 'bg-white/[0.08] text-text-primary border border-white/[0.1] shadow-sm'
                  : 'text-text-disabled hover:text-text-secondary border border-transparent hover:bg-white/[0.04]'
              }`}
              onClick={() => {
                setMode(m)
                setQuery('')
                setSearchResults([])
                setSpotlight(null)
              }}
            >
              {m === 'search' && <Search size={10} />}
              {m === 'browse' && <BookOpen size={10} />}
              {m === 'manual' && <Type size={10} />}
              <span>{m === 'search' ? 'Cari' : m === 'browse' ? 'Browse' : 'Manual'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Body Workspace ─── */}
      <div className="projection-bible-panel__body flex-1 min-h-0 p-3 flex flex-col gap-3 overflow-hidden">
        {/* ─── Mode 1: Search / Smart Input ─── */}
        {!isHistoryExpanded && mode === 'search' && (
          <div className="projection-bible-panel__mode-scroll projection-bible-panel__mode-scroll--search flex flex-col gap-2.5 flex-1 min-h-0">
            {/* Glow Primary Search Input */}
            <div className="relative shrink-0">
              <SearchInput
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setIsHistoryExpanded(false)
                }}
                onClear={() => {
                  setQuery('')
                  setSearchResults([])
                  setSpotlight(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (spotlight) {
                      e.preventDefault()
                      const activeVerses = spotlight.verses.filter((v) =>
                        spotlightCheckedVerses.has(v.verse)
                      )
                      if (activeVerses.length > 0) {
                        const activeNums = activeVerses.map((v) => v.verse)
                        const displayRef = `${spotlight.bookName} ${spotlight.chapter}:${formatVerseRanges(activeNums)}`
                        handleProjectVerses(
                          activeVerses,
                          displayRef,
                          spotlight.bookName,
                          spotlight.chapter,
                          e.ctrlKey || e.metaKey
                        )
                      }
                    }
                  }
                }}
                placeholder="Cari ayat / referensi (mis. Yoh 3:16)"
                fullWidth
                size="sm"
              />
              {isSearching && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <Loader2 size={11} className="animate-spin text-text-muted" />
                </div>
              )}
            </div>

            {/* Spotlight Preview Card (Cerdas & Canggih) with interactive checkboxes */}
            {spotlight && (
              <div className="projection-bible-panel__spotlight relative flex flex-1 min-h-0 flex-col overflow-hidden bg-gradient-to-br from-brand-primary/[0.08] to-transparent border border-brand-primary/25 rounded-xl p-3 shadow-[0_4px_20px_rgba(59,130,246,0.06)] max-h-56">
                <div className="absolute -right-4 -top-4 w-12 h-12 bg-brand-primary/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between pb-1.5 border-b border-brand-primary/20 mb-1.5 shrink-0">
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider truncate max-w-[130px]">
                    {(() => {
                      const activeVerses = spotlight.verses.filter((v) =>
                        spotlightCheckedVerses.has(v.verse)
                      )
                      const activeNums = activeVerses.map((v) => v.verse)
                      return activeNums.length > 0
                        ? `${spotlight.bookName} ${spotlight.chapter}:${formatVerseRanges(activeNums)}`
                        : spotlight.reference
                    })()}
                  </span>

                  {/* Select All / Clear All buttons */}
                  <div className="flex items-center gap-1.5 select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const allVerses = new Set(spotlight.verses.map((v) => v.verse))
                        setSpotlightCheckedVerses(allVerses)
                      }}
                      className="text-[8px] font-bold text-brand-primary hover:underline hover:text-brand-primary/80 transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-[8px] text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSpotlightCheckedVerses(new Set())
                      }}
                      className="text-[8px] font-bold text-text-muted hover:underline hover:text-text-primary transition-colors"
                    >
                      Bersihkan
                    </button>
                    <Badge variant="info" className="text-[8px] px-1.5 py-0">
                      {selectedVersion?.shortName}
                    </Badge>
                  </div>
                </div>

                {/* Checklist verses preview */}
                <div className="flex-grow min-h-0 overflow-y-auto pr-1 text-[11px] text-text-primary leading-relaxed scrollbar-thin space-y-1 mb-2 font-medium">
                  {spotlight.verses.map((v) => {
                    const isChecked = spotlightCheckedVerses.has(v.verse)
                    return (
                      <label
                        key={v.verse}
                        className="flex items-start gap-2.5 cursor-pointer hover:bg-white/[0.04] p-1 rounded-lg transition-colors select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const next = new Set(spotlightCheckedVerses)
                            if (next.has(v.verse)) {
                              next.delete(v.verse)
                            } else {
                              next.add(v.verse)
                            }
                            setSpotlightCheckedVerses(next)
                          }}
                          className="mt-0.5 rounded border-white/20 bg-black/40 text-brand-primary focus:ring-brand-primary shrink-0"
                        />
                        <div>
                          <sup className="text-brand-primary font-bold mr-1 text-[8px]">
                            {v.verse}
                          </sup>
                          <span
                            className={
                              isChecked
                                ? 'text-text-primary font-semibold'
                                : 'text-text-disabled opacity-50 font-normal'
                            }
                          >
                            {v.text}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 h-7 text-[10px]"
                    icon={<Send size={10} />}
                    onClick={() => {
                      const activeVerses = spotlight.verses.filter((v) =>
                        spotlightCheckedVerses.has(v.verse)
                      )
                      if (activeVerses.length === 0) {
                        showToast('Pilih minimal satu ayat untuk diproyeksikan', 'error')
                        return
                      }
                      const activeNums = activeVerses.map((v) => v.verse)
                      const displayRef = `${spotlight.bookName} ${spotlight.chapter}:${formatVerseRanges(activeNums)}`
                      handleProjectVerses(
                        activeVerses,
                        displayRef,
                        spotlight.bookName,
                        spotlight.chapter,
                        false
                      )
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 h-7 text-[10px] bg-brand-primary hover:bg-brand-primary-hover shadow-glow-sm shadow-brand-primary/20"
                    icon={<Zap size={10} />}
                    onClick={() => {
                      const activeVerses = spotlight.verses.filter((v) =>
                        spotlightCheckedVerses.has(v.verse)
                      )
                      if (activeVerses.length === 0) {
                        showToast('Pilih minimal satu ayat untuk diproyeksikan', 'error')
                        return
                      }
                      const activeNums = activeVerses.map((v) => v.verse)
                      const displayRef = `${spotlight.bookName} ${spotlight.chapter}:${formatVerseRanges(activeNums)}`
                      handleProjectVerses(
                        activeVerses,
                        displayRef,
                        spotlight.bookName,
                        spotlight.chapter,
                        true
                      )
                    }}
                  >
                    Live
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    icon={<Plus size={10} />}
                    onClick={() => {
                      if (!selectedVersion) {
                        showToast('Silakan pilih versi Alkitab terlebih dahulu', 'error')
                        return
                      }
                      const activeVerses = spotlight.verses.filter((v) =>
                        spotlightCheckedVerses.has(v.verse)
                      )
                      if (activeVerses.length === 0) {
                        showToast('Pilih minimal satu ayat', 'error')
                        return
                      }
                      const activeNums = activeVerses.map((v) => v.verse)
                      const displayRef = `${spotlight.bookName} ${spotlight.chapter}:${formatVerseRanges(activeNums)}`
                      addBibleToPlaylist({
                        bible_version_code: selectedVersion.versionCode,
                        bible_version_short_name: selectedVersion.shortName,
                        bible_book_code: spotlight.bookCode,
                        bible_book_name: spotlight.bookName,
                        bible_chapter: spotlight.chapter,
                        bible_verse_start: Math.min(...activeNums),
                        bible_verse_end: Math.max(...activeNums),
                        bible_reference: displayRef,
                        bible_text_json: JSON.stringify(
                          activeVerses.map((v) => ({
                            book_code: spotlight.bookCode,
                            book_name: spotlight.bookName,
                            chapter: spotlight.chapter,
                            verse: v.verse,
                            text: v.text
                          }))
                        ),
                        bible_copyright: getFormattedCopyright(selectedVersion)
                      })
                    }}
                    title="Tambah ke Playlist"
                  />
                </div>
              </div>
            )}

            {/* Keyword Search Results */}
            {!spotlight && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col gap-1.5">
                {isSearching && searchResults.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Spinner size="sm" />
                  </div>
                )}

                {!isSearching && searchResults.length === 0 && query.trim().length >= 2 && (
                  <div className="text-center py-6 text-[10px] text-text-muted">
                    Tidak ada ayat ditemukan
                  </div>
                )}

                {!isSearching && query.trim().length < 2 && (
                  <div className="flex flex-col items-center justify-center gap-1 py-10 text-text-disabled">
                    <Search size={16} className="opacity-20" />
                    <span className="text-[9px]">Ketik referensi / kata kunci</span>
                  </div>
                )}

                {searchResults.map((item, idx) => {
                  const ref = `${item.book_name} ${item.chapter}:${item.verse}`
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchResultClick(item)}
                      onDoubleClick={() => handleSearchResultDoubleClick(item)}
                      className="flex flex-col gap-1 px-2.5 py-1.5 rounded-lg text-left bg-white/[0.02] border border-white/[0.04] hover:bg-brand-primary/[0.06] hover:border-brand-primary/20 transition-all group select-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-brand-primary">{ref}</span>
                        <span className="text-[8px] text-text-disabled opacity-0 group-hover:opacity-100 transition-opacity">
                          Klik (Preview) / Double Click (Proyeksi)
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary leading-normal truncate w-full">
                        {item.text}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Mode 2: Browse Grid ─── */}
        {!isHistoryExpanded && mode === 'browse' && (
          <div className="projection-bible-panel__browse projection-bible-panel__mode-scroll projection-bible-panel__mode-scroll--browse flex-1 min-h-0 flex flex-col gap-2">
            {/* Breadcrumb Trail */}
            <div className="projection-bible-panel__breadcrumb flex items-center gap-1.5 text-[9px] font-bold text-text-muted shrink-0 pb-1 border-b border-white/[0.04]">
              <button
                type="button"
                onClick={() => {
                  setSelectedBook(null)
                  setSelectedChapter(null)
                  setChapterVerses([])
                  setSelectedVerses(new Set())
                  setLastClickedVerse(null)
                  setSpotlight(null)
                }}
                className={`hover:text-text-primary transition-colors ${!selectedBook ? 'text-brand-primary' : ''}`}
              >
                Kitab
              </button>
              {selectedBook && (
                <>
                  <ChevronRight size={8} />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChapter(null)
                      setChapterVerses([])
                      setSelectedVerses(new Set())
                      setLastClickedVerse(null)
                      setSpotlight(null)
                    }}
                    className={`hover:text-text-primary transition-colors ${selectedChapter === null ? 'text-brand-primary' : ''}`}
                  >
                    {selectedBook.name}
                  </button>
                </>
              )}
              {selectedChapter !== null && (
                <>
                  <ChevronRight size={8} />
                  <span className="text-brand-primary">Pasal {selectedChapter}</span>
                </>
              )}
            </div>

            {/* State A: Book List Directory */}
            {!selectedBook && (
              <div className="flex-grow flex flex-col min-h-0 overflow-hidden gap-2">
                <SearchInput
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  onClear={() => setBookSearchQuery('')}
                  placeholder="Cari Kitab..."
                  fullWidth
                  size="sm"
                />

                <div className="flex-grow min-h-0 overflow-y-auto scrollbar-thin space-y-3 pt-1">
                  {otBooks.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-text-disabled mb-1 px-1">
                        Perjanjian Lama
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {otBooks.map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => setSelectedBook(b)}
                            className="px-1.5 py-1 rounded-md text-[9px] font-bold text-text-secondary bg-white/[0.02] border border-white/[0.04] hover:bg-brand-primary/10 hover:text-brand-primary transition-all text-center truncate"
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {ntBooks.length > 0 && (
                    <div>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-text-disabled mb-1 px-1">
                        Perjanjian Baru
                      </p>
                      <div className="grid grid-cols-3 gap-1">
                        {ntBooks.map((b) => (
                          <button
                            key={b.code}
                            type="button"
                            onClick={() => setSelectedBook(b)}
                            className="px-1.5 py-1 rounded-md text-[9px] font-bold text-text-secondary bg-white/[0.02] border border-white/[0.04] hover:bg-brand-primary/10 hover:text-brand-primary transition-all text-center truncate"
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* State B: Chapter Selection Grid */}
            {selectedBook && selectedChapter === null && (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChapter(ch)}
                      className="h-8 rounded-md text-[11px] font-bold text-text-secondary bg-white/[0.02] border border-white/[0.04] hover:bg-brand-primary/10 hover:text-brand-primary transition-all flex items-center justify-center"
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* State C: Verses list & dynamic range projector */}
            {selectedBook && selectedChapter !== null && (
              <div className="flex-grow flex flex-col min-h-0 overflow-hidden gap-2">
                {/* Spotlight range projection controls inside browse */}
                {spotlight && (
                  <div className="bg-brand-primary/[0.04] border border-brand-primary/20 rounded-xl p-2.5 flex flex-col gap-1.5 shrink-0 shadow-sm relative">
                    <div className="flex justify-between items-center text-[9px] font-black text-brand-primary uppercase">
                      <span>{spotlight.reference}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVerses(new Set())
                          setLastClickedVerse(null)
                          setSpotlight(null)
                        }}
                        className="text-text-muted hover:text-text-primary"
                      >
                        <X size={10} />
                      </button>
                    </div>

                    <p className="text-[10px] text-text-secondary truncate leading-normal">
                      {spotlight.verses.map((v) => `[${v.verse}] ${v.text}`).join(' ')}
                    </p>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-6 text-[9px]"
                        icon={<Send size={8} />}
                        onClick={() =>
                          handleProjectVerses(
                            spotlight.verses,
                            spotlight.reference,
                            spotlight.bookName,
                            spotlight.chapter,
                            false
                          )
                        }
                      >
                        Preview
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 h-6 text-[9px] bg-brand-primary hover:bg-brand-primary-hover shadow-glow-sm shadow-brand-primary/15"
                        icon={<Zap size={8} />}
                        onClick={() =>
                          handleProjectVerses(
                            spotlight.verses,
                            spotlight.reference,
                            spotlight.bookName,
                            spotlight.chapter,
                            true
                          )
                        }
                      >
                        Live
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-6 px-1.5 text-[9px]"
                        icon={<Plus size={8} />}
                        onClick={() => {
                          addBibleToPlaylist({
                            bible_version_code: selectedVersion!.versionCode,
                            bible_version_short_name: selectedVersion!.shortName,
                            bible_book_code: spotlight.bookCode,
                            bible_book_name: spotlight.bookName,
                            bible_chapter: spotlight.chapter,
                            bible_verse_start: spotlight.verseStart,
                            bible_verse_end: spotlight.verseEnd || spotlight.verseStart,
                            bible_reference: spotlight.reference,
                            bible_text_json: JSON.stringify(
                              spotlight.verses.map((v) => ({
                                book_code: spotlight.bookCode,
                                book_name: spotlight.bookName,
                                chapter: spotlight.chapter,
                                verse: v.verse,
                                text: v.text
                              }))
                            ),
                            bible_copyright: getFormattedCopyright(selectedVersion!)
                          })
                        }}
                        title="Tambah ke Playlist"
                      />
                    </div>
                  </div>
                )}

                {/* Toolbar for verse selection in Browse Mode */}
                <div className="projection-bible-panel__verse-toolbar flex items-center justify-between px-1.5 shrink-0 select-none">
                  <span className="text-[9px] font-bold text-text-muted">
                    {chapterVerses.length} Ayat
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const all = new Set(chapterVerses.map((v) => v.verse))
                        setSelectedVerses(all)
                        const sortedNumbers = Array.from(all).sort((a, b) => a - b)
                        setSpotlight({
                          reference: `${selectedBook.name} ${selectedChapter}:${formatVerseRanges(sortedNumbers)}`,
                          verses: chapterVerses.map((v) => ({ verse: v.verse, text: v.text })),
                          bookName: selectedBook.name,
                          bookCode: selectedBook.code,
                          chapter: selectedChapter,
                          verseStart: sortedNumbers[0],
                          verseEnd: sortedNumbers[sortedNumbers.length - 1]
                        })
                      }}
                      className="text-[8px] font-bold text-brand-primary/80 hover:text-brand-primary hover:underline transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-[8px] text-white/20">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVerses(new Set())
                        setLastClickedVerse(null)
                        setSpotlight(null)
                      }}
                      className="text-[8px] font-bold text-text-muted hover:text-text-primary hover:underline transition-colors"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                {/* Verses scroll list with checkboxes */}
                <div className="projection-bible-panel__verse-scroll flex-grow min-h-0 overflow-y-auto scrollbar-thin">
                  {isLoadingVerses && (
                    <div className="flex justify-center py-6">
                      <Spinner size="sm" />
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {chapterVerses.map((verse) => {
                      const isSelected = selectedVerses.has(verse.verse)

                      return (
                        <div
                          key={verse.verse}
                          className={`projection-bible-panel__verse-row flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left select-none transition-all group cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary/[0.08] border border-brand-primary/20'
                              : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                          }`}
                          onClick={(e) => handleBrowseVerseClick(verse, e)}
                          onDoubleClick={() => handleBrowseVerseDoubleClick(verse)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="mt-1 rounded border-white/20 bg-black/40 text-brand-primary focus:ring-brand-primary shrink-0 pointer-events-none"
                          />
                          <span
                            className={`shrink-0 text-[9px] font-bold w-4 text-center mt-0.5 rounded-md ${
                              isSelected
                                ? 'bg-brand-primary text-white'
                                : 'text-brand-primary bg-brand-primary/10'
                            }`}
                          >
                            {verse.verse}
                          </span>
                          <p className="text-[10.5px] text-text-primary leading-relaxed flex-1 min-w-0 font-medium">
                            {verse.text}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Mode 3: Manual Input ─── */}
        {!isHistoryExpanded && mode === 'manual' && (
          <div className="projection-bible-panel__mode-scroll projection-bible-panel__mode-scroll--manual flex-1 flex flex-col gap-2.5 min-h-0">
            <div className="relative shrink-0">
              <Book
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Referensi (cth: Mazmur 23:1)"
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[11px] text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60"
              />
            </div>

            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Ketik atau tempel teks ayat di sini..."
              rows={4}
              className="w-full flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[11px] text-text-primary p-2.5 resize-none placeholder:text-text-disabled outline-none leading-relaxed focus:ring-1 focus:ring-brand-primary/40 focus:border-brand-primary/60 scrollbar-thin"
            />

            <div className="flex gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                className="flex-grow h-8 text-[11px]"
                disabled={!manualText.trim()}
                onClick={() => handleManualSend(false)}
              >
                Kirim Preview
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-grow h-8 text-[11px]"
                disabled={!manualText.trim()}
                onClick={() => handleManualSend(true)}
              >
                Langsung Live
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-2 text-[11px]"
                disabled={!manualText.trim()}
                icon={<Plus size={12} />}
                onClick={() => {
                  const refLabel = manualRef.trim() || 'Ayat Manual'
                  addBibleToPlaylist({
                    bible_version_code: 'MANUAL',
                    bible_version_short_name: 'MANUAL',
                    bible_book_code: 'MANUAL',
                    bible_book_name: 'Manual',
                    bible_chapter: 1,
                    bible_verse_start: 1,
                    bible_verse_end: 1,
                    bible_reference: refLabel,
                    bible_text_json: JSON.stringify([
                      {
                        book_code: 'MANUAL',
                        book_name: 'Manual',
                        chapter: 1,
                        verse: 1,
                        text: manualText.trim()
                      }
                    ]),
                    bible_copyright: ''
                  })
                }}
                title="Tambah ke Playlist"
              />
            </div>
          </div>
        )}

        {/* ─── Riwayat (History - shared between modes) ─── */}
        {recentVerses.length > 0 && (
          <div
            className={`projection-bible-panel__history ${isHistoryExpanded ? 'is-expanded' : ''}`}
          >
            <button
              type="button"
              className="projection-bible-panel__history-toggle"
              aria-label={`Riwayat, ${recentVerses.length} item`}
              aria-expanded={isHistoryExpanded}
              onClick={() => setIsHistoryExpanded((expanded) => !expanded)}
            >
              <span className="projection-bible-panel__history-title">
                <History size={11} />
                <span>Riwayat</span>
                <span className="projection-bible-panel__history-count">{recentVerses.length}</span>
              </span>
              <ChevronRight
                size={12}
                className={`projection-bible-panel__history-chevron ${isHistoryExpanded ? 'is-expanded' : ''}`}
              />
            </button>

            {isHistoryExpanded && (
              <div className="projection-bible-panel__history-list scrollbar-thin">
                {recentVerses.map((v, i) => (
                  <button
                    key={`${v.ref}-${i}`}
                    type="button"
                    onClick={() => {
                      setSpotlight({
                        reference: v.ref,
                        verses: v.verses,
                        bookName: v.bookName,
                        bookCode: '',
                        chapter: v.chapter,
                        verseStart: v.verses[0]?.verse || 1,
                        verseEnd: v.verses[v.verses.length - 1]?.verse || null
                      })
                      setMode('search')
                      setQuery(v.ref)
                      setSearchResults([])
                      setIsHistoryExpanded(false)
                    }}
                    className="projection-bible-panel__history-item"
                  >
                    <ChevronRight size={9} className="shrink-0" />
                    <span className="projection-bible-panel__history-reference">{v.ref}</span>
                    <span className="projection-bible-panel__history-preview">
                      {v.verses.map((ve) => `[${ve.verse}] ${ve.text}`).join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
