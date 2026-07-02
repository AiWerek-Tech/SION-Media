import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sun,
  Moon,
  Sparkles,
  Shrink,
  Palette,
  Settings2,
  Minus,
  Plus,
  Gauge,
  AlertCircle,
  X
} from 'lucide-react'
import type { BibleBook, BibleVerse } from '../../features/bible/hooks/useBibleReader'

type ReadingTheme = 'dark' | 'light' | 'sepia'
type ReadingWidth = 'focus' | 'comfortable' | 'wide'

const READER_SETTING_KEYS = {
  theme: 'bible_reader_theme',
  fontSize: 'bible_reader_font_size',
  width: 'bible_reader_width',
  scrollSpeed: 'bible_reader_scroll_speed',
  lastPosition: 'bible_reader_last_position'
} as const

function clampNumber(
  value: string | null | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

function isReadingTheme(value: string | null | undefined): value is ReadingTheme {
  return value === 'dark' || value === 'light' || value === 'sepia'
}

function isReadingWidth(value: string | null | undefined): value is ReadingWidth {
  return value === 'focus' || value === 'comfortable' || value === 'wide'
}

interface LibraryBibleViewerProps {
  selectedBook: BibleBook
  selectedChapter: number
  versionCode: string
  verses: BibleVerse[]
  onClose: () => void
  onPrevChapter: () => void
  onNextChapter: () => void
  books: BibleBook[]
  chapterNotes?: Array<{ verse: number; note_text: string; highlight_color: string }>
  onNoteSaved?: () => void
}

export function LibraryBibleViewer({
  selectedBook,
  selectedChapter,
  versionCode,
  verses,
  onClose,
  onPrevChapter,
  onNextChapter,
  books,
  chapterNotes = [],
  onNoteSaved
}: LibraryBibleViewerProps): React.JSX.Element {
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    const saved = localStorage.getItem('sion:bible-theme')
    return isReadingTheme(saved) ? saved : 'dark'
  })
  const [fontSize, setFontSize] = useState<number>(() => {
    return clampNumber(localStorage.getItem('sion:bible-font-size'), 16, 42, 24)
  })
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState<number>(() =>
    clampNumber(localStorage.getItem('sion:bible-scroll-speed'), 1, 5, 3)
  )
  const [readingWidth, setReadingWidth] = useState<ReadingWidth>(() => {
    const saved = localStorage.getItem('sion:bible-reading-width')
    return isReadingWidth(saved) ? saved : 'comfortable'
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeVerse, setActiveVerse] = useState<BibleVerse | null>(null)
  const [localNoteText, setLocalNoteText] = useState('')
  const [localColor, setLocalColor] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [preferenceError, setPreferenceError] = useState<string | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const scrollAnimationRef = useRef<number | null>(null)

  // Hydrate reader preferences from the main-process settings database.
  useEffect(() => {
    let mounted = true
    window.api.settings
      .getAll()
      .then((settings) => {
        if (!mounted) return
        const storedTheme = settings[READER_SETTING_KEYS.theme]
        const storedWidth = settings[READER_SETTING_KEYS.width]
        if (isReadingTheme(storedTheme)) {
          setTheme(storedTheme)
        }
        setFontSize((current) =>
          clampNumber(settings[READER_SETTING_KEYS.fontSize], 16, 42, current)
        )
        setScrollSpeed((current) =>
          clampNumber(settings[READER_SETTING_KEYS.scrollSpeed], 1, 5, current)
        )
        if (isReadingWidth(storedWidth)) {
          setReadingWidth(storedWidth)
        }
      })
      .catch(() => {
        if (mounted)
          setPreferenceError('Preferensi lokal digunakan karena sinkronisasi belum tersedia.')
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    void window.api.settings
      .update(
        READER_SETTING_KEYS.lastPosition,
        JSON.stringify({ versionCode, bookCode: selectedBook.code, chapter: selectedChapter })
      )
      .catch(() => undefined)
  }, [selectedBook.code, selectedChapter, versionCode])

  const persistPreference = (key: string, value: string, localKey: string): void => {
    localStorage.setItem(localKey, value)
    setPreferenceError(null)
    void window.api.settings.update(key, value).catch(() => {
      setPreferenceError(
        'Perubahan tersimpan di perangkat ini, tetapi belum tersinkron ke database.'
      )
    })
  }

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (activeVerse) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setActiveVerse(null)
        }
        return
      }

      if (settingsOpen && event.key === 'Escape') {
        event.preventDefault()
        setSettingsOpen(false)
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        onNextChapter()
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        onPrevChapter()
      } else if (event.key === ' ') {
        event.preventDefault()
        setIsScrolling((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNextChapter, onPrevChapter, activeVerse, settingsOpen])

  // Clear scroll timer on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) window.cancelAnimationFrame(scrollAnimationRef.current)
    }
  }, [])

  const updateScrollProgress = (): void => {
    const element = contentRef.current
    if (!element) return
    const scrollableDistance = Math.max(0, element.scrollHeight - element.clientHeight)
    const progress = scrollableDistance === 0 ? 100 : (element.scrollTop / scrollableDistance) * 100
    setScrollProgress(Math.min(100, Math.max(0, progress)))
  }

  // Smooth, frame-synchronised auto-scroll.
  useEffect(() => {
    if (scrollAnimationRef.current) {
      window.cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }

    if (isScrolling && contentRef.current) {
      const pixelsPerSecond = [0, 12, 22, 36, 54, 78][scrollSpeed]
      let previousTimestamp: number | null = null
      const tick = (timestamp: number): void => {
        const element = contentRef.current
        if (!element) return
        if (previousTimestamp !== null) {
          element.scrollTop += ((timestamp - previousTimestamp) / 1000) * pixelsPerSecond
          updateScrollProgress()
        }
        previousTimestamp = timestamp
        if (element.scrollTop + element.clientHeight >= element.scrollHeight - 2) {
          setIsScrolling(false)
          return
        }
        scrollAnimationRef.current = window.requestAnimationFrame(tick)
      }
      scrollAnimationRef.current = window.requestAnimationFrame(tick)
    }

    return () => {
      if (scrollAnimationRef.current) window.cancelAnimationFrame(scrollAnimationRef.current)
    }
  }, [isScrolling, scrollSpeed])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = contentRef.current
      if (element) element.scrollTop = 0
      setScrollProgress(0)
      setIsScrolling(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedBook.code, selectedChapter])

  // Map notes/highlights to easy lookup
  const noteMap = React.useMemo(() => {
    const map = new Map<number, { note_text: string; highlight_color: string }>()
    for (const note of chapterNotes) {
      map.set(note.verse, note)
    }
    return map
  }, [chapterNotes])

  // Get CSS classes based on theme
  const getThemeClasses = (): string => {
    switch (theme) {
      case 'light':
        return 'bg-[#f8fafc] text-[#0f172a]'
      case 'sepia':
        return 'bg-[#fdf6e3] text-[#586e75]'
      default:
        return 'bg-gradient-to-br from-[#0b0f19] to-[#020617] text-slate-100'
    }
  }

  const getContainerBg = (): string => {
    switch (theme) {
      case 'light':
        return 'bg-white/80 border-slate-200 shadow-slate-100'
      case 'sepia':
        return 'bg-[#f4ebd0]/70 border-[#ebdcb9] shadow-[#eae0c3]'
      default:
        return 'bg-slate-900/30 border-white/[0.04] shadow-black/30'
    }
  }

  const getButtonClass = (): string => {
    switch (theme) {
      case 'light':
        return 'hover:bg-slate-100 text-slate-700 border-slate-200'
      case 'sepia':
        return 'hover:bg-[#ebdcb9] text-[#586e75] border-[#ebdcb9]'
      default:
        return 'hover:bg-white/5 text-slate-300 border-white/[0.06]'
    }
  }

  const getHighlightStyle = (colorCode: string): React.CSSProperties => {
    if (!colorCode) return {}

    const opacity = theme === 'dark' ? 0.25 : 0.4
    switch (colorCode) {
      case 'yellow':
        return {
          backgroundColor: `rgba(234, 179, 8, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(234, 179, 8, 0.35)'
        }
      case 'green':
        return {
          backgroundColor: `rgba(34, 197, 94, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(34, 197, 94, 0.35)'
        }
      case 'blue':
        return {
          backgroundColor: `rgba(59, 130, 246, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(59, 130, 246, 0.35)'
        }
      case 'pink':
        return {
          backgroundColor: `rgba(236, 72, 153, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(236, 72, 153, 0.35)'
        }
      case 'orange':
        return {
          backgroundColor: `rgba(249, 115, 22, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(249, 115, 22, 0.35)'
        }
      case 'purple':
        return {
          backgroundColor: `rgba(168, 85, 247, ${opacity})`,
          textDecorationLine: 'underline',
          textDecorationColor: 'rgba(168, 85, 247, 0.35)'
        }
      default:
        return {}
    }
  }

  const handleUpdateColor = async (color: string): Promise<void> => {
    if (!activeVerse) return
    setLocalColor(color)
    setNoteError(null)
    try {
      await window.api.biblePack.updateNote(
        activeVerse.book_code,
        activeVerse.chapter,
        activeVerse.verse,
        localNoteText,
        color
      )
      if (onNoteSaved) onNoteSaved()
    } catch (err) {
      console.error('Failed to update highlight color:', err)
      setNoteError('Highlight belum dapat disimpan. Silakan coba kembali.')
    }
  }

  const handleSaveNote = async (): Promise<void> => {
    if (!activeVerse) return
    setIsSavingNote(true)
    setNoteError(null)
    try {
      await window.api.biblePack.updateNote(
        activeVerse.book_code,
        activeVerse.chapter,
        activeVerse.verse,
        localNoteText,
        localColor
      )
      if (onNoteSaved) onNoteSaved()
      setActiveVerse(null)
    } catch (err) {
      console.error('Failed to save study note:', err)
      setNoteError('Catatan belum dapat disimpan. Data Anda tetap tersedia di editor.')
    } finally {
      setIsSavingNote(false)
    }
  }

  const changeTheme = (nextTheme: ReadingTheme): void => {
    setTheme(nextTheme)
    persistPreference(READER_SETTING_KEYS.theme, nextTheme, 'sion:bible-theme')
  }

  const changeFontSize = (nextSize: number): void => {
    const safeSize = Math.min(42, Math.max(16, nextSize))
    setFontSize(safeSize)
    persistPreference(READER_SETTING_KEYS.fontSize, String(safeSize), 'sion:bible-font-size')
  }

  const changeReadingWidth = (nextWidth: ReadingWidth): void => {
    setReadingWidth(nextWidth)
    persistPreference(READER_SETTING_KEYS.width, nextWidth, 'sion:bible-reading-width')
  }

  const changeScrollSpeed = (nextSpeed: number): void => {
    const safeSpeed = Math.min(5, Math.max(1, nextSpeed))
    setScrollSpeed(safeSpeed)
    persistPreference(READER_SETTING_KEYS.scrollSpeed, String(safeSpeed), 'sion:bible-scroll-speed')
  }

  const currentBookIndex = books.findIndex((book) => book.code === selectedBook.code)
  const canGoPrevious = selectedChapter > 1 || currentBookIndex > 0
  const canGoNext =
    selectedChapter < selectedBook.chapters ||
    (currentBookIndex >= 0 && currentBookIndex < books.length - 1)

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col font-sans transition-all duration-300 ${getThemeClasses()}`}
    >
      {/* Top Header Bar */}
      <header
        data-testid="bible-reader-toolbar"
        className={`bible-reader__toolbar border-b ${theme === 'light' ? 'border-slate-200' : theme === 'sepia' ? 'border-[#ebdcb9]' : 'border-white/[0.05]'}`}
      >
        <div className="bible-reader__identity">
          <button
            onClick={onClose}
            className={`bible-reader__icon-button ${getButtonClass()}`}
            aria-label="Kembali ke Library"
            title="Kembali ke Library"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="bible-reader__identity-copy">
            <h1>
              <Sparkles size={16} className="text-amber-500" />
              <span>
                {selectedBook.name} {selectedChapter}
              </span>
            </h1>
            <p
              className={
                theme === 'light'
                  ? 'text-slate-500'
                  : theme === 'sepia'
                    ? 'text-[#758500]'
                    : 'text-slate-400'
              }
            >
              Mode baca &middot; {versionCode.toUpperCase()}
            </p>
          </div>
        </div>

        <nav className="bible-reader__chapter-nav" aria-label="Navigasi pasal">
          <button
            onClick={onPrevChapter}
            disabled={!canGoPrevious}
            className={`bible-reader__icon-button ${getButtonClass()}`}
            aria-label="Pasal sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="bible-reader__chapter-current">
            <span>{selectedBook.name}</span>
            <strong>{selectedChapter}</strong>
          </div>
          <button
            onClick={onNextChapter}
            disabled={!canGoNext}
            className={`bible-reader__icon-button ${getButtonClass()}`}
            aria-label="Pasal berikutnya"
          >
            <ChevronRight size={18} />
          </button>
        </nav>

        <div className="bible-reader__controls">
          <button
            onClick={() => setIsScrolling((current) => !current)}
            className={`bible-reader__control-button ${isScrolling ? 'is-active' : ''} ${getButtonClass()}`}
            aria-label={isScrolling ? 'Jeda gulir otomatis' : 'Mulai gulir otomatis'}
            aria-pressed={isScrolling}
          >
            {isScrolling ? <Pause size={15} /> : <Play size={15} />}
            <span>{isScrolling ? 'Jeda' : 'Auto-scroll'}</span>
          </button>

          <div className="bible-reader__settings-wrap">
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              className={`bible-reader__icon-button ${settingsOpen ? 'is-active' : ''} ${getButtonClass()}`}
              aria-label="Pengaturan membaca"
              aria-expanded={settingsOpen}
            >
              <Settings2 size={17} />
            </button>

            {settingsOpen && (
              <div
                className={`bible-reader__settings-panel ${getContainerBg()}`}
                role="dialog"
                aria-label="Panel pengaturan membaca"
              >
                <div className="bible-reader__settings-heading">
                  <div>
                    <strong>Pengaturan membaca</strong>
                    <span>Tersimpan otomatis</span>
                  </div>
                  <button onClick={() => setSettingsOpen(false)} aria-label="Tutup pengaturan">
                    <X size={15} />
                  </button>
                </div>

                <div className="bible-reader__setting-row">
                  <span>Ukuran teks</span>
                  <div className="bible-reader__stepper">
                    <button onClick={() => changeFontSize(fontSize - 2)} aria-label="Perkecil teks">
                      <Minus size={14} />
                    </button>
                    <strong>{fontSize} px</strong>
                    <button onClick={() => changeFontSize(fontSize + 2)} aria-label="Perbesar teks">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="bible-reader__setting-block">
                  <span>Tema</span>
                  <div className="bible-reader__segmented">
                    <button
                      onClick={() => changeTheme('dark')}
                      aria-label="Tema gelap"
                      aria-pressed={theme === 'dark'}
                      className={theme === 'dark' ? 'is-active' : ''}
                    >
                      <Moon size={14} /> Gelap
                    </button>
                    <button
                      onClick={() => changeTheme('sepia')}
                      aria-label="Tema sepia"
                      aria-pressed={theme === 'sepia'}
                      className={theme === 'sepia' ? 'is-active' : ''}
                    >
                      <Palette size={14} /> Sepia
                    </button>
                    <button
                      onClick={() => changeTheme('light')}
                      aria-label="Tema terang"
                      aria-pressed={theme === 'light'}
                      className={theme === 'light' ? 'is-active' : ''}
                    >
                      <Sun size={14} /> Terang
                    </button>
                  </div>
                </div>

                <div className="bible-reader__setting-block">
                  <span>Lebar bacaan</span>
                  <div className="bible-reader__segmented">
                    {(['focus', 'comfortable', 'wide'] as ReadingWidth[]).map((width) => (
                      <button
                        key={width}
                        onClick={() => changeReadingWidth(width)}
                        aria-pressed={readingWidth === width}
                        className={readingWidth === width ? 'is-active' : ''}
                      >
                        {width === 'focus' ? 'Fokus' : width === 'comfortable' ? 'Nyaman' : 'Lebar'}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="bible-reader__speed-control">
                  <span>
                    <Gauge size={14} /> Kecepatan auto-scroll
                  </span>
                  <input
                    aria-label="Kecepatan gulir otomatis"
                    type="range"
                    min="1"
                    max="5"
                    value={scrollSpeed}
                    onChange={(event) => changeScrollSpeed(Number(event.target.value))}
                  />
                  <strong>{scrollSpeed}/5</strong>
                </label>

                {preferenceError && (
                  <p className="bible-reader__inline-warning">
                    <AlertCircle size={13} />
                    {preferenceError}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className={`bible-reader__icon-button ${getButtonClass()}`}
            aria-label="Tutup mode layar penuh"
            title="Tutup (Esc)"
          >
            <Shrink size={16} />
          </button>
        </div>
      </header>

      <div className="bible-reader__progress-track">
        <span
          role="progressbar"
          aria-label="Progres membaca"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollProgress)}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Scripture Text area */}
      <div className="bible-reader__stage">
        {/* Left Pagination */}
        <button
          onClick={onPrevChapter}
          disabled={!canGoPrevious}
          className={`bible-reader__side-nav bible-reader__side-nav--previous ${getButtonClass()}`}
          aria-label="Pasal sebelumnya"
          title="Pasal Sebelumnya"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Text viewport */}
        <div
          ref={contentRef}
          onScroll={updateScrollProgress}
          className={`bible-reader__viewport bible-reader__viewport--${readingWidth} border shadow-xl transition-all duration-300 scrollbar-thin ${getContainerBg()}`}
          style={{ scrollBehavior: 'smooth' }}
        >
          {verses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <span className="animate-spin text-amber-500">
                <Palette size={32} />
              </span>
              <p className="text-sm font-semibold opacity-60">Memuat teks Alkitab...</p>
            </div>
          ) : (
            <article
              className="space-y-6 select-text max-w-none text-left"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            >
              <div className="pb-4 mb-6 border-b border-white/[0.04] text-center">
                <span className="text-xs uppercase tracking-[0.2em] opacity-45 font-bold">
                  {selectedBook.testament === 'OT' ? 'Perjanjian Lama' : 'Perjanjian Baru'}
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                  {selectedBook.name} {selectedChapter}
                </h2>
              </div>

              {/* Responsive Scripture Block */}
              <div className="bible-reader__verses">
                {verses.map((verse) => {
                  const noteInfo = noteMap.get(verse.verse)
                  const highlightColor = noteInfo?.highlight_color || ''
                  const hasNote = !!noteInfo?.note_text

                  return (
                    <p
                      key={verse.verse}
                      data-testid="fullscreen-bible-verse"
                      onClick={() => {
                        setActiveVerse(verse)
                        setLocalNoteText(noteInfo?.note_text || '')
                        setLocalColor(noteInfo?.highlight_color || '')
                        setNoteError(null)
                      }}
                      className={`bible-reader__verse group transition-all duration-150 ${
                        theme === 'light'
                          ? 'hover:bg-slate-200/50'
                          : theme === 'sepia'
                            ? 'hover:bg-[#ebdcb9]/60'
                            : 'hover:bg-white/10'
                      }`}
                      style={getHighlightStyle(highlightColor)}
                    >
                      <sup
                        className={`bible-reader__verse-number select-none ${
                          theme === 'light' ? 'text-amber-600' : 'text-amber-400'
                        }`}
                      >
                        {verse.verse}
                      </sup>{' '}
                      <span className="font-serif tracking-wide leading-relaxed">{verse.text}</span>
                      {/* Display small indicator icons inline if present */}
                      {hasNote && (
                        <span
                          className="inline-flex items-center justify-center h-4 w-4 rounded bg-amber-500/20 text-amber-500 text-[9px] font-bold align-super ml-1 select-none"
                          title="Terdapat Catatan Belajar"
                        >
                          N
                        </span>
                      )}
                    </p>
                  )
                })}
              </div>
            </article>
          )}
        </div>

        {/* Right Pagination */}
        <button
          onClick={onNextChapter}
          disabled={!canGoNext}
          className={`bible-reader__side-nav bible-reader__side-nav--next ${getButtonClass()}`}
          aria-label="Pasal berikutnya"
          title="Pasal Berikutnya"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <footer
        className={`bible-reader__footer ${
          theme === 'light' ? 'bg-slate-100' : theme === 'sepia' ? 'bg-[#f4ebd0]' : 'bg-black/25'
        }`}
      >
        <span>
          {selectedBook.name} {selectedChapter} &middot; {verses.length} ayat &middot;{' '}
          {versionCode.toUpperCase()}
        </span>
        <span>{Math.round(scrollProgress)}% dibaca</span>
        <span className="bible-reader__shortcut-hint">
          Space auto-scroll &middot; &larr;/&rarr; ganti pasal &middot; Esc tutup
        </span>
      </footer>

      {/* Verse Detail & Annotation Panel */}
      {activeVerse && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Catatan ${selectedBook.name} ${selectedChapter}:${activeVerse.verse}`}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              theme === 'light'
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                : theme === 'sepia'
                  ? 'bg-[#f4ebd0] border-[#ebdcb9] text-[#586e75] shadow-black/20'
                  : 'bg-slate-900/90 border-white/[0.08] text-white shadow-black/40'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <span className="text-amber-500">★</span>
                <span>
                  {selectedBook.name} {selectedChapter}:{activeVerse.verse}
                </span>
              </h3>
              <button
                onClick={() => setActiveVerse(null)}
                className={`p-1 rounded-lg transition-colors ${
                  theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs font-serif leading-relaxed italic opacity-85 mb-4 border-l-2 border-amber-500 pl-3 select-text">
              &ldquo;{activeVerse.text}&rdquo;
            </p>

            {/* Color Highlight Picker */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2">
                Highlight Warna
              </label>
              <div className="flex items-center gap-2.5">
                {[
                  { name: 'yellow', bg: 'bg-yellow-500' },
                  { name: 'green', bg: 'bg-green-500' },
                  { name: 'blue', bg: 'bg-blue-500' },
                  { name: 'pink', bg: 'bg-pink-500' },
                  { name: 'orange', bg: 'bg-orange-500' },
                  { name: 'purple', bg: 'bg-purple-500' }
                ].map((colorObj) => (
                  <button
                    key={colorObj.name}
                    onClick={() => handleUpdateColor(colorObj.name)}
                    className={`h-7 w-7 rounded-full transition-all duration-200 ${colorObj.bg} ${
                      localColor === colorObj.name
                        ? 'ring-4 ring-amber-500/50 scale-110 shadow-lg'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    title={colorObj.name}
                  />
                ))}
                {localColor && (
                  <button
                    onClick={() => handleUpdateColor('')}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                      theme === 'light'
                        ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'border-white/[0.08] text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Note text editor */}
            <div className="mb-4">
              <label
                htmlFor="devotional-note-input"
                className="block text-[10px] font-bold uppercase tracking-wider opacity-60 mb-2"
              >
                Catatan Belajar / Refleksi
              </label>
              <textarea
                id="devotional-note-input"
                value={localNoteText}
                onChange={(e) => setLocalNoteText(e.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault()
                    void handleSaveNote()
                  }
                }}
                placeholder="Tulis refleksi pribadi atau catatan belajar untuk ayat ini..."
                rows={4}
                className={`w-full text-xs p-3 rounded-xl border outline-none resize-none transition-all duration-200 ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 focus:border-amber-500 focus:bg-white'
                    : theme === 'sepia'
                      ? 'bg-[#ebdcb9]/40 border-[#ebdcb9] focus:border-[#859900]'
                      : 'bg-black/30 border-white/[0.08] focus:border-amber-500/50 focus:bg-black/50'
                }`}
              />
            </div>

            {/* Actions row */}
            <div className="flex justify-end gap-2">
              {noteError && (
                <p
                  className="mr-auto flex items-center gap-1.5 text-[10px] text-red-400"
                  role="alert"
                >
                  <AlertCircle size={13} /> {noteError}
                </p>
              )}
              <button
                onClick={() => setActiveVerse(null)}
                disabled={isSavingNote}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05]'
                }`}
              >
                Batal
              </button>
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 transition-all"
              >
                {isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
