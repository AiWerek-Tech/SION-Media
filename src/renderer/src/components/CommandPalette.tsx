/**
 * CommandPalette — Global search and command execution modal triggered by Ctrl+K.
 * Integrates song search and runtime command bus capabilities into a single interface.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  X,
  Eye,
  BookOpen,
  Terminal,
  Zap,
  Square,
  Snowflake,
  XCircle,
  Radio,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Undo2,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  SkipBack,
  Navigation,
  ListPlus,
  ListX
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlidesForSong } from '../engine/slideEngine'
import { getHymnalColor } from '../utils/hymnal-colors'
import { getPaletteCommands, executeRuntimeCommand } from '../utils/runtimeCommandBus'
import type { RuntimeCommandType, CommandMetadata } from '../utils/runtimeCommandBus'
import type { Song } from '../types'

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface GroupedSongResults {
  hymnalCode: string
  hymnalName: string
  songs: Song[]
}

// Map string icon names to Lucide components
const IconMap: Record<string, React.ElementType> = {
  Zap,
  Square,
  Snowflake,
  XCircle,
  Radio,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Undo2,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  SkipBack,
  Navigation,
  ListPlus,
  ListX
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

type PaletteItem =
  | { type: 'song'; data: Song }
  | { type: 'command'; data: { type: RuntimeCommandType; meta: CommandMetadata } }

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps): React.JSX.Element {
  const { showToast } = useAppStore()
  const { setSlides } = useProjectionStore()
  const [query, setQuery] = useState('')
  const [songResults, setSongResults] = useState<Song[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const runtimeCommands = useMemo(() => getPaletteCommands(), [])

  // Focus input and reset state on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('')
        setSongResults([])
        setSelectedIndex(0)
      }, 0)
      return () => clearTimeout(timer)
    }
    return undefined
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

    // Command filtering happens synchronously in useMemo below

    if (!value.trim() || value.startsWith('>')) {
      setSongResults([])
      return
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = (await window.api.songs.search(value)) as Song[]
        setSongResults(data)
      } catch {
        setSongResults([])
      } finally {
        setIsSearching(false)
      }
    }, 180)
  }, [])

  // Filter commands
  const commandResults = useMemo(() => {
    if (!query.trim()) return runtimeCommands

    // If query starts with '>', only show commands
    const cleanQuery = query.startsWith('>')
      ? query.slice(1).trim().toLowerCase()
      : query.toLowerCase()

    return runtimeCommands.filter(
      (cmd) =>
        cmd.meta.label.toLowerCase().includes(cleanQuery) ||
        cmd.meta.description.toLowerCase().includes(cleanQuery) ||
        cmd.meta.shortcut?.toLowerCase().includes(cleanQuery)
    )
  }, [query, runtimeCommands])

  // Group song results by hymnal
  const groupedSongs: GroupedSongResults[] = useMemo(() => {
    const map = new Map<string, GroupedSongResults>()
    for (const song of songResults) {
      const code = song.hymnal_code || 'LS'
      const name = song.hymnal_name || 'Lagu Sion'
      if (!map.has(code)) {
        map.set(code, { hymnalCode: code, hymnalName: name, songs: [] })
      }
      map.get(code)!.songs.push(song)
    }
    return Array.from(map.values())
  }, [songResults])

  // Flat list for keyboard navigation
  const flatResults: PaletteItem[] = useMemo(() => {
    const isCommandMode = query.trim().startsWith('>')
    const items: PaletteItem[] = []

    // In command mode (>), only show commands
    // In normal mode, show a few commands at the top, then songs
    if (isCommandMode) {
      items.push(...commandResults.map((data) => ({ type: 'command' as const, data })))
    } else {
      // Limit commands to top 3 if we also have song results
      const cmdsToShow = songResults.length > 0 ? commandResults.slice(0, 3) : commandResults
      items.push(...cmdsToShow.map((data) => ({ type: 'command' as const, data })))
      items.push(...songResults.map((data) => ({ type: 'song' as const, data })))
    }

    return items
  }, [commandResults, songResults, query])

  // Execute selection
  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.type === 'song') {
        const song = item.data
        useAppStore.getState().setSelectedSong(song)
        const slides = generateSlidesForSong(song)
        setSlides(slides, {
          hymnalCode: song.hymnal_code || 'LS',
          hymnalName: song.hymnal_name || 'Lagu Sion',
          songBackgroundConfig: song.song_background_config || ''
        })
        showToast(`Cue "${song.title}" masuk ke Preview`, 'success')
      } else {
        const cmd = item.data
        if (cmd.meta.dangerous) {
          const confirmed = window.confirm(
            `PERINGATAN: Perintah "${cmd.meta.label}" akan langsung mengubah tampilan Live.\n\nLanjutkan?`
          )
          if (!confirmed) return
        }
        executeRuntimeCommand(cmd.type, undefined, 'KEYBOARD')
        // Feedback is handled by the global toast subscriber in App.tsx
      }
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
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-[600px] bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-default shrink-0">
              {query.startsWith('>') ? (
                <Terminal size={20} className="text-brand-primary shrink-0" />
              ) : (
                <Search size={20} className="text-brand-primary shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari lagu atau ketik '>' untuk command..."
                className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-disabled outline-none"
              />
              <div className="flex items-center gap-2 shrink-0">
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
            <div ref={listRef} className="overflow-y-auto flex-1 min-h-0">
              {flatResults.length === 0 && !isSearching ? (
                <div className="px-5 py-12 text-center">
                  <div className="text-text-disabled text-sm mb-1">
                    {query.trim() ? 'Tidak ada hasil' : 'Ketik untuk mulai mencari'}
                  </div>
                  <div className="text-text-disabled text-[11px]">
                    {query.startsWith('>')
                      ? 'Ketik nama perintah atau shortcut'
                      : 'Ketik ">" untuk mode command, atau cari judul lagu'}
                  </div>
                </div>
              ) : isSearching && flatResults.length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-sm">Mencari...</div>
              ) : (
                <div className="py-2">
                  {/* Commands Section */}
                  {commandResults.length > 0 &&
                    (!query.trim() || query.startsWith('>') || songResults.length > 0) && (
                      <div className="mb-2">
                        {(!query.trim() || !query.startsWith('>')) && (
                          <div className="flex items-center gap-2 px-5 py-2 sticky top-0 bg-bg-surface/95 backdrop-blur-sm z-10">
                            <Terminal size={12} className="text-text-muted" />
                            <span className="text-[11px] font-black uppercase tracking-[0.06em] text-text-muted">
                              Commands
                            </span>
                          </div>
                        )}

                        {(query.startsWith('>') ? commandResults : commandResults.slice(0, 3)).map(
                          (cmd) => {
                            const itemIndex = flatResults.findIndex(
                              (i) => i.type === 'command' && i.data.type === cmd.type
                            )
                            const isSelected = itemIndex === selectedIndex
                            const Icon =
                              cmd.meta.icon && IconMap[cmd.meta.icon]
                                ? IconMap[cmd.meta.icon]
                                : Terminal

                            return (
                              <button
                                key={cmd.type}
                                data-index={itemIndex}
                                onClick={() => handleSelect({ type: 'command', data: cmd })}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-brand-primary/10 border-l-2 border-brand-primary'
                                    : 'hover:bg-bg-elevated border-l-2 border-transparent'
                                }`}
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-bg-elevated text-text-muted border border-border-default">
                                  <Icon
                                    size={14}
                                    className={
                                      cmd.meta.dangerous && isSelected ? 'text-danger' : ''
                                    }
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`text-[12px] font-semibold truncate ${cmd.meta.dangerous && isSelected ? 'text-danger' : 'text-text-primary'}`}
                                  >
                                    {highlightMatch(
                                      cmd.meta.label,
                                      query.startsWith('>') ? query.slice(1) : query
                                    )}
                                  </div>
                                  <div className="text-[11px] text-text-muted truncate">
                                    {cmd.meta.description}
                                  </div>
                                </div>
                                {cmd.meta.shortcut && (
                                  <div className="shrink-0 flex items-center">
                                    <kbd
                                      className={`px-1.5 py-0.5 rounded border border-border-default text-[10px] font-bold ${
                                        isSelected
                                          ? 'bg-bg-surface text-text-primary'
                                          : 'bg-bg-elevated text-text-disabled'
                                      }`}
                                    >
                                      {cmd.meta.shortcut}
                                    </kbd>
                                  </div>
                                )}
                              </button>
                            )
                          }
                        )}
                      </div>
                    )}

                  {/* Songs Section */}
                  {!query.startsWith('>') &&
                    groupedSongs.map((group) => {
                      const accentColor = getHymnalColor(group.hymnalCode)
                      return (
                        <div key={group.hymnalCode}>
                          <div className="flex items-center gap-2 px-5 py-2 sticky top-0 bg-bg-surface/95 backdrop-blur-sm z-10 border-t border-border-subtle mt-1 pt-3">
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

                          {group.songs.map((song) => {
                            const itemIndex = flatResults.findIndex(
                              (i) => i.type === 'song' && i.data.id === song.id
                            )
                            const isSelected = itemIndex === selectedIndex
                            return (
                              <button
                                key={song.id}
                                data-index={itemIndex}
                                onClick={() => handleSelect({ type: 'song', data: song })}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                  isSelected
                                    ? 'bg-brand-primary/10 border-l-2 border-brand-primary'
                                    : 'hover:bg-bg-elevated border-l-2 border-transparent'
                                }`}
                              >
                                <div
                                  className="flex h-8 w-11 shrink-0 flex-col items-center justify-center rounded border font-mono text-[10px] font-black leading-none"
                                  style={{
                                    borderColor: isSelected
                                      ? accentColor
                                      : 'rgba(255,255,255,0.08)',
                                    color: isSelected ? accentColor : undefined
                                  }}
                                >
                                  <span className="text-[9px] uppercase opacity-60">
                                    {song.hymnal_code || 'LS'}
                                  </span>
                                  <span>{normalizeDisplayNumber(song.number)}</span>
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
            {flatResults.length > 0 && (
              <div className="flex items-center justify-between px-5 py-2.5 border-t border-border-default bg-bg-elevated/50 text-[10px] text-text-disabled shrink-0">
                <span>
                  {query.startsWith('>')
                    ? `${commandResults.length} command ditemukan`
                    : `${songResults.length} lagu ditemukan`}
                </span>
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
                    pilih
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
