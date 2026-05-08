/**
 * CommandPalette — Global search modal triggered by Ctrl+K.
 * Results grouped by hymnal with keyword highlighting.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Eye, BookOpen } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlides } from '../engine/slideEngine'
import { getHymnalColor } from '../utils/hymnal-colors'
import type { Song } from '../types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface GroupedResults {
  hymnalCode: string
  hymnalName: string
  songs: Song[]
}

function highlightMatch(text: string, query: string): React.JSX.Element {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-brand-primary/30 text-brand-primary-hover rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps): React.JSX.Element {
  const { showToast } = useAppStore()
  const { setSlides } = useProjectionStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Focus input and reset state on open
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')

      setResults([])

      setSelectedIndex(0)
    }
  }, [isOpen])

  // Focus input after open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen])

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setSelectedIndex(0)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!value.trim()) {
      setResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = (await window.api.songs.search(value)) as Song[]
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 180)
  }, [])

  // Group results by hymnal
  const grouped: GroupedResults[] = React.useMemo(() => {
    const map = new Map<string, GroupedResults>()
    for (const song of results) {
      const code = song.hymnal_code || 'LS'
      const name = song.hymnal_name || 'Lagu Sion'
      if (!map.has(code)) {
        map.set(code, { hymnalCode: code, hymnalName: name, songs: [] })
      }
      map.get(code)!.songs.push(song)
    }
    return Array.from(map.values())
  }, [results])

  // Flat list for keyboard navigation
  const flatResults = grouped.flatMap((g) => g.songs)

  // CUE selected song to preview
  const handleSelect = useCallback(
    (song: Song) => {
      useAppStore.getState().setSelectedSong(song)
      const slides = generateSlides(song.id, song.lyrics_raw)
      setSlides(slides)
      showToast(`Cue "${song.title}" masuk ke Preview`, 'success')
      onClose()
    },
    [setSlides, showToast, onClose]
  )

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
      e.preventDefault()
      handleSelect(flatResults[selectedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-[600px] bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default">
              <Search size={20} className="text-brand-primary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari lagu dari semua koleksi..."
                className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-disabled outline-none"
              />
              <div className="flex items-center gap-2">
                {query && (
                  <button
                    onClick={() => handleSearch('')}
                    className="p-1 rounded text-text-muted hover:text-text-primary"
                  >
                    <X size={16} />
                  </button>
                )}
                <kbd className="px-1.5 py-0.5 rounded border border-border-default bg-bg-elevated text-[10px] font-bold text-text-disabled">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
              {!query.trim() ? (
                <div className="px-5 py-8 text-center">
                  <div className="text-text-disabled text-sm mb-1">Ketik untuk mulai mencari</div>
                  <div className="text-text-disabled text-[11px]">
                    Pencarian mencakup nomor, judul, lirik, dan tag dari semua buku lagu
                  </div>
                </div>
              ) : isSearching ? (
                <div className="px-5 py-8 text-center text-text-muted text-sm">Mencari...</div>
              ) : results.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="text-text-muted text-sm mb-1">Tidak ada hasil</div>
                  <div className="text-text-disabled text-[11px]">
                    Coba kata kunci lain atau periksa ejaan
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  {grouped.map((group) => {
                    const accentColor = getHymnalColor(group.hymnalCode)
                    return (
                      <div key={group.hymnalCode}>
                        {/* Group Header */}
                        <div className="flex items-center gap-2 px-5 py-2 sticky top-0 bg-bg-surface/95 backdrop-blur-sm z-10">
                          <BookOpen size={12} style={{ color: accentColor }} />
                          <span
                            className="text-[11px] font-black uppercase tracking-[0.06em]"
                            style={{ color: accentColor }}
                          >
                            {group.hymnalName}
                          </span>
                          <span className="text-[10px] text-text-disabled">
                            — {group.songs.length} hasil
                          </span>
                        </div>

                        {/* Songs in group */}
                        {group.songs.map((song) => {
                          const flatIndex = flatResults.indexOf(song)
                          const isSelected = flatIndex === selectedIndex
                          return (
                            <button
                              key={song.id}
                              data-index={flatIndex}
                              onClick={() => handleSelect(song)}
                              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                isSelected
                                  ? 'bg-brand-primary/10 border-l-2 border-brand-primary'
                                  : 'hover:bg-bg-elevated border-l-2 border-transparent'
                              }`}
                            >
                              <div
                                className="flex h-8 w-11 shrink-0 flex-col items-center justify-center rounded border font-mono text-[10px] font-black leading-none"
                                style={{
                                  borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.08)',
                                  color: isSelected ? accentColor : undefined
                                }}
                              >
                                <span className="text-[9px] uppercase opacity-60">
                                  {song.hymnal_code || 'LS'}
                                </span>
                                <span>{song.number || '—'}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-semibold text-text-primary truncate">
                                  {highlightMatch(song.title, query)}
                                </div>
                                {song.alternate_title && (
                                  <div className="text-[11px] text-text-muted italic truncate">
                                    {highlightMatch(song.alternate_title, query)}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`flex items-center gap-1 text-[10px] font-bold transition-opacity ${
                                  isSelected ? 'opacity-100 text-preview' : 'opacity-0'
                                }`}
                              >
                                <Eye size={12} />
                                CUE
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {results.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border-default bg-bg-elevated/50 text-[10px] text-text-disabled">
                <span>{results.length} lagu ditemukan</span>
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="px-1 py-0.5 rounded border border-border-default bg-bg-surface text-[9px]">
                      ↑↓
                    </kbd>{' '}
                    navigasi
                  </span>
                  <span>
                    <kbd className="px-1 py-0.5 rounded border border-border-default bg-bg-surface text-[9px]">
                      Enter
                    </kbd>{' '}
                    cue ke preview
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
