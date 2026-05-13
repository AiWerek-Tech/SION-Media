/**
 * LibrarySearchPalette — Advanced search with FTS5 highlighting and number pad.
 * Supports searching by number, title (ID/EN), lyrics, and tags simultaneously.
 * Includes a number pad for quick number-based navigation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Music, Clock, Delete, Plus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { getHymnalColor } from '../../utils/hymnal-colors'
import type { Song } from '../../types'

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

interface SearchPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelectSong: (song: Song) => void
}

// Number pad digits
const NUMBER_PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫']

// Highlight matched text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-brand-primary/25 text-brand-primary rounded px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function LibrarySearchPalette({
  isOpen,
  onClose,
  onSelectSong
}: SearchPaletteProps): React.JSX.Element {
  const { selectedHymnalId } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sion:recent-searches')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Reset state and focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('')
        setResults([])
        setSelectedIndex(0)
        inputRef.current?.focus()
      }, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen])

  // Debounced search
  const performSearch = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setResults([])
        return
      }

      setIsSearching(true)
      try {
        // Use FTS5 search via API
        const searchResults = await window.api.songs.search(value, selectedHymnalId || undefined)
        setResults(searchResults as Song[])
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [selectedHymnalId]
  )

  const handleQueryChange = (value: string): void => {
    setQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => performSearch(value), 150)
  }

  // Number pad handler
  const handleNumberPad = (digit: string): void => {
    if (digit === 'C') {
      setQuery('')
      setResults([])
    } else if (digit === '⌫') {
      const newQuery = query.slice(0, -1)
      handleQueryChange(newQuery)
    } else {
      const newQuery = query + digit
      handleQueryChange(newQuery)
    }
  }

  // Save to recent searches
  const saveRecentSearch = useCallback(
    (q: string): void => {
      const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('sion:recent-searches', JSON.stringify(updated))
    },
    [recentSearches]
  )

  // Handle song selection
  const handleSelect = useCallback(
    (song: Song): void => {
      if (query.trim()) saveRecentSearch(query)
      onSelectSong(song)
      onClose()
    },
    [query, onSelectSong, onClose, saveRecentSearch]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, onClose, handleSelect])

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // FTS5 already handles all fields intelligently.
  const filteredResults = results

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[800px] bg-[#0c1220]/95 backdrop-blur-3xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_48px_96px_rgba(0,0,0,0.72)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Premium Search Input Section */}
            <div className="relative flex items-center px-8 py-6 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center shrink-0 mr-5 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.1)]">
                <Search size={22} className="text-brand-primary" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Cari nomor, judul, lirik, atau tag..."
                className="flex-1 bg-transparent text-[24px] font-bold text-white placeholder:text-white/20 outline-none"
              />
              <div className="flex items-center gap-3">
                {query && (
                  <button
                    onClick={() => {
                      setQuery('')
                      setResults([])
                    }}
                    className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                )}
                <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-[10px] font-black text-white/30 tracking-widest shadow-sm">
                  <kbd className="font-sans">ESC</kbd>
                </div>
              </div>
              {/* Bottom Decorative Glow */}
              <div className="absolute bottom-[-1px] left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
            </div>

            {/* Main Content Area */}
            <div className="flex min-h-[400px] max-h-[60vh]">
              {/* Results List Section */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto custom-scrollbar border-r border-white/[0.04]"
              >
                {!query.trim() ? (
                  // Initial state: recent searches
                  <div className="p-8">
                    {recentSearches.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-5">
                          <Clock size={12} />
                          Pencarian Terakhir
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {recentSearches.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleQueryChange(s)}
                              className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 opacity-40">
                        <div className="h-20 w-20 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                          <Search size={36} className="text-white/20" />
                        </div>
                        <div className="text-white/40 text-sm font-semibold mb-1">
                          Ketik untuk mulai mencari
                        </div>
                        <div className="text-white/20 text-[11px] max-w-[240px] text-center leading-relaxed">
                          Gunakan angka untuk navigasi cepat melalui number pad di sebelah kanan
                        </div>
                      </div>
                    )}
                  </div>
                ) : isSearching ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="h-8 w-8 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                    <div className="text-white/40 text-[13px] font-medium tracking-wide">
                      Mencari hasil terbaik...
                    </div>
                  </div>
                ) : filteredResults.length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center h-full p-8 opacity-60">
                    <div className="h-20 w-20 rounded-3xl bg-red-500/5 border border-red-500/10 flex items-center justify-center mb-5">
                      <Music size={36} className="text-red-500/40" />
                    </div>
                    <div className="text-white/60 text-base font-bold mb-2 text-center">
                      Hasil tidak ditemukan
                    </div>
                    <div className="text-white/30 text-[12px] text-center max-w-[320px] leading-relaxed">
                      Kami tidak menemukan lagu untuk kata kunci{' '}
                      <span className="text-white/80 font-bold">&ldquo;{query}&rdquo;</span>. Coba
                      periksa ejaan atau cari menggunakan nomor lagu.
                    </div>
                  </div>
                ) : (
                  // Results List
                  <div className="py-3">
                    {filteredResults.map((song, index) => {
                      const isSelected = index === selectedIndex
                      const accentColor = getHymnalColor(song.hymnal_code || 'LS')

                      return (
                        <button
                          key={song.id}
                          data-index={index}
                          onClick={() => handleSelect(song)}
                          className={`group w-full flex items-center gap-5 px-8 py-4 text-left transition-all relative ${
                            isSelected ? 'bg-brand-primary/5' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-brand-primary rounded-r-full shadow-[0_0_12px_rgba(var(--brand-primary-rgb),0.5)]" />
                          )}

                          {/* Number badge (Naked Style) */}
                          <div
                            className="h-12 w-14 shrink-0 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-105"
                            style={{
                              backgroundColor: isSelected
                                ? accentColor.replace('hsl', 'hsla').replace(')', ', 0.15)')
                                : 'rgba(255,255,255,0.03)'
                            }}
                          >
                            <span
                              className="text-[10px] font-black tracking-widest"
                              style={{ color: isSelected ? accentColor : 'rgba(255,255,255,0.3)' }}
                            >
                              {song.hymnal_code || 'LS'}
                            </span>
                            <span
                              className="text-[16px] font-black font-mono leading-none mt-0.5"
                              style={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.8)' }}
                            >
                              {normalizeDisplayNumber(song.number)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-[15px] font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-white/90 group-hover:text-white'}`}
                            >
                              {highlightMatch(song.title, query)}
                            </div>
                            {(song.alternate_title || song.title_en) && (
                              <div className="text-[12px] text-white/40 italic truncate mt-0.5">
                                {highlightMatch(song.alternate_title || song.title_en || '', query)}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {song.key_note && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/[0.04] text-white/40">
                                  Key {song.key_note}
                                </span>
                              )}
                              {song.tempo && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/[0.04] text-white/40">
                                  {song.tempo}
                                </span>
                              )}
                              {!song.lyrics_raw && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-500/10 text-red-400">
                                  MISSING LYRICS
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Select Arrow */}
                          <div
                            className={`opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 ${isSelected ? 'text-brand-primary' : 'text-white/20'}`}
                          >
                            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                              <Plus size={14} />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Minimal Glass Number Pad */}
              <div className="w-[200px] bg-black/20 p-6 flex flex-col">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-6 text-center">
                  Keypad
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {NUMBER_PAD.map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleNumberPad(digit)}
                      className={`h-11 flex items-center justify-center rounded-xl font-mono text-[16px] font-bold transition-all border ${
                        digit === 'C'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                          : digit === '⌫'
                            ? 'bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.08]'
                            : 'bg-white/[0.06] border-white/[0.08] text-white/80 hover:bg-white/[0.12] hover:border-white/[0.15] active:scale-95'
                      }`}
                    >
                      {digit === '⌫' ? <Delete size={18} /> : digit}
                    </button>
                  ))}
                </div>
                <div className="mt-auto pt-6 flex flex-col items-center gap-1 opacity-20">
                  <div className="text-[10px] font-black">{filteredResults.length}</div>
                  <div className="text-[8px] font-bold uppercase tracking-widest text-center leading-none">
                    Matches Found
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Footer */}
            {filteredResults.length > 0 && (
              <div className="flex items-center justify-between px-8 py-4 border-t border-white/[0.04] bg-white/[0.01]">
                <div className="flex items-center gap-2 text-[11px] font-medium text-white/40">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" />
                  {filteredResults.length} lagu ditemukan
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-mono text-white/40">
                      ↑↓
                    </kbd>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white/20">
                      Navigasi
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-mono text-white/40">
                      Enter
                    </kbd>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white/20">
                      Buka
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
