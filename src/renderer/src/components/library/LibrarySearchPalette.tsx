/**
 * LibrarySearchPalette — Advanced search with FTS5 highlighting and number pad.
 * Supports searching by number, title (ID/EN), lyrics, and tags simultaneously.
 * Includes a number pad for quick number-based navigation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Music, Clock, Delete } from 'lucide-react'
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
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[760px] bg-bg-surface/95 backdrop-blur-2xl border border-border-default rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.6)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Premium Search Input */}
            <div className="relative flex items-center px-6 py-5 border-b border-border-subtle bg-bg-elevated/50">
              <Search size={24} className="text-brand-primary shrink-0 mr-4" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Cari nomor, judul, lirik, atau tag..."
                className="flex-1 bg-transparent text-[22px] font-medium text-text-primary placeholder:text-text-muted/60 outline-none"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('')
                    setResults([])
                  }}
                  className="p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors mr-3"
                >
                  <X size={18} />
                </button>
              )}
              <kbd className="px-2 py-1 rounded-md border border-white/10 bg-white/5 text-[10px] font-bold text-text-muted shadow-sm">
                ESC
              </kbd>
              {/* Bottom Glow */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent opacity-50" />
            </div>

            {/* Main Content */}
            <div className="flex min-h-[320px] max-h-[50vh]">
              {/* Results List */}
              <div ref={listRef} className="flex-1 overflow-y-auto">
                {!query.trim() ? (
                  // Initial state: recent searches
                  <div className="p-5">
                    {recentSearches.length > 0 ? (
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-muted mb-3">
                          <Clock size={12} />
                          Pencarian Terakhir
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => handleQueryChange(s)}
                              className="px-3 py-1.5 rounded-lg bg-surface-2/60 border border-border-default/30 text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-3/60 transition-all"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Search size={32} className="mx-auto mb-3 text-text-disabled opacity-50" />
                        <div className="text-text-muted text-sm mb-1">
                          Ketik untuk mulai mencari
                        </div>
                        <div className="text-text-disabled text-[11px]">
                          Gunakan number pad di kanan untuk pencarian cepat berdasarkan nomor
                        </div>
                      </div>
                    )}
                  </div>
                ) : isSearching ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-text-muted text-sm">Mencari...</div>
                  </div>
                ) : filteredResults.length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center h-full p-5">
                    <div className="h-16 w-16 rounded-2xl bg-surface-2/60 border border-border-default/30 flex items-center justify-center mb-4">
                      <Music size={28} className="text-text-disabled" />
                    </div>
                    <div className="text-text-muted text-sm mb-1">Tidak ada hasil</div>
                    <div className="text-text-disabled text-[11px] text-center max-w-[280px]">
                      Coba kata kunci lain atau ubah filter pencarian
                    </div>
                  </div>
                ) : (
                  // Results
                  <div className="py-2">
                    {filteredResults.map((song, index) => {
                      const isSelected = index === selectedIndex
                      const accentColor = getHymnalColor(song.hymnal_code || 'LS')

                      return (
                        <button
                          key={song.id}
                          data-index={index}
                          onClick={() => handleSelect(song)}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all ${
                            isSelected
                              ? 'bg-brand-primary/8 border-l-2 border-brand-primary'
                              : 'hover:bg-surface-2/40 border-l-2 border-transparent'
                          }`}
                        >
                          {/* Number badge */}
                          <div
                            className="h-10 w-12 shrink-0 rounded-lg flex flex-col items-center justify-center border font-mono"
                            style={{
                              borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.08)',
                              backgroundColor: isSelected
                                ? accentColor.replace('hsl', 'hsla').replace(')', ', 0.12)')
                                : 'transparent'
                            }}
                          >
                            <span
                              className="text-[9px] uppercase opacity-60"
                              style={{ color: isSelected ? accentColor : undefined }}
                            >
                              {song.hymnal_code || 'LS'}
                            </span>
                            <span
                              className="text-[13px] font-bold"
                              style={{ color: isSelected ? accentColor : undefined }}
                            >
                              {normalizeDisplayNumber(song.number)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-text-primary truncate">
                              {highlightMatch(song.title, query)}
                            </div>
                            {song.alternate_title && (
                              <div className="text-[11px] text-text-muted italic truncate">
                                {highlightMatch(song.alternate_title, query)}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {song.key_note && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3/60 text-text-muted">
                                  {song.key_note}
                                </span>
                              )}
                              {song.tempo && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3/60 text-text-muted">
                                  {song.tempo}
                                </span>
                              )}
                              {!song.lyrics_raw && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-error/15 text-status-error font-bold">
                                  LIRIK KOSONG
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Premium Stream Deck Number Pad */}
              <div className="w-[180px] border-l border-border-subtle bg-bg-base/40 p-4 flex flex-col">
                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted/60 mb-4 text-center">
                  Number Pad
                </div>
                <div className="grid grid-cols-3 gap-2.5 flex-1">
                  {NUMBER_PAD.map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleNumberPad(digit)}
                      className={`relative flex items-center justify-center rounded-xl font-mono text-[16px] font-bold transition-all overflow-hidden ${
                        digit === 'C'
                          ? 'text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-4px_12px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.3)] bg-gradient-to-b from-red-500/80 to-red-700/80 hover:brightness-110 active:scale-95 border border-red-500/50'
                          : digit === '⌫'
                            ? 'text-text-muted shadow-[inset_0_2px_4px_rgba(255,255,255,0.05),inset_0_-4px_12px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)] bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:text-text-primary active:scale-95 border border-white/10'
                            : 'text-text-primary shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-6px_12px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.3)] bg-gradient-to-b from-white/[0.12] to-white/[0.02] hover:bg-white/[0.15] active:scale-95 border border-white/10'
                      }`}
                      style={{ aspectRatio: '1/1' }}
                    >
                      {digit === '⌫' ? <Delete size={20} /> : digit}
                    </button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border-subtle text-[10px] font-medium text-text-muted/60 text-center">
                  {filteredResults.length} HASIL
                </div>
              </div>
            </div>

            {/* Footer */}
            {filteredResults.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle bg-bg-base/40 text-[10px] text-text-muted">
                <span className="font-medium">{filteredResults.length} lagu ditemukan</span>
                <div className="flex items-center gap-4 font-medium">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 shadow-sm text-[9px] font-mono">
                      ↑↓
                    </kbd>{' '}
                    navigasi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 shadow-sm text-[9px] font-mono">
                      Enter
                    </kbd>{' '}
                    buka
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
