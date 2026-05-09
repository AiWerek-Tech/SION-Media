import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, LayoutGrid, Music } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getHymnalColor } from '../../utils/hymnal-colors'
import type { Song } from '../../types'

interface NumberViewProps {
  songs: Song[]
  selectedSongId?: number | null
  onSelectSong: (song: Song) => void
}

function normalizeDisplayNumber(input: string | null | undefined): string {
  const raw = String(input ?? '').trim()
  if (raw === '') return '—'
  const trimmed = raw.replace(/^0+/, '')
  return trimmed === '' ? '0' : trimmed
}

export function LibraryNumberView({
  songs,
  selectedSongId,
  onSelectSong
}: NumberViewProps): React.JSX.Element {
  const [jumpValue, setJumpValue] = useState('')
  const [showJump, setShowJump] = useState(false)
  const [compact, setCompact] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [focusOrigin, setFocusOrigin] = useState<'keyboard' | 'pointer'>('pointer')
  const [gridWidth, setGridWidth] = useState(0)
  const jumpInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Sort songs by number
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }, [songs])

  const cellSize = compact ? 54 : 68
  const gapSize = compact ? 8 : 10

  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setGridWidth(el.clientWidth)
    })
    ro.observe(el)
    setGridWidth(el.clientWidth)
    return () => {
      ro.disconnect()
    }
  }, [])

  const columns = useMemo(() => {
    const w = gridWidth || 900
    return Math.max(4, Math.floor((w + gapSize) / (cellSize + gapSize)))
  }, [cellSize, gapSize, gridWidth])

  const rowCount = useMemo(
    () => Math.ceil(sortedSongs.length / columns),
    [sortedSongs.length, columns]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cellSize + gapSize,
    overscan: 6
  })

  const rows = rowVirtualizer.getVirtualItems()

  // Keyboard shortcut: / to open jump-to-number
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTyping) return
        e.preventDefault()
        setShowJump(true)
        setTimeout(() => jumpInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setShowJump(false)
        setJumpValue('')
      }

      if (isTyping) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusOrigin('keyboard')
        setFocusedIndex((i) => Math.min(i + 1, sortedSongs.length - 1))
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusOrigin('keyboard')
        setFocusedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusOrigin('keyboard')
        setFocusedIndex((i) => {
          if (i < 0) return 0
          return Math.min(i + columns, sortedSongs.length - 1)
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusOrigin('keyboard')
        setFocusedIndex((i) => {
          if (i < 0) return 0
          return Math.max(i - columns, 0)
        })
      }
      if (e.key === 'Enter') {
        if (focusedIndex >= 0 && sortedSongs[focusedIndex]) {
          e.preventDefault()
          onSelectSong(sortedSongs[focusedIndex])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [columns, focusedIndex, onSelectSong, sortedSongs])

  const handleJump = (val: string): void => {
    setJumpValue(val)
    const num = parseInt(val, 10)
    if (!Number.isNaN(num)) {
      const target = sortedSongs.find((s) => parseInt(s.number || '0', 10) === num)
      if (target) {
        onSelectSong(target)
        setFocusedIndex(sortedSongs.findIndex((s) => s.id === target.id))
        setShowJump(false)
        setJumpValue('')
        // Scroll to element
        setTimeout(() => {
          const el = document.querySelector(`[data-song-number="${target.id}"]`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }

  // Keep focused item visible
  useEffect(() => {
    if (focusedIndex < 0) return
    if (focusOrigin !== 'keyboard') return
    const rowIndex = Math.floor(focusedIndex / columns)
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'center' })
  }, [focusedIndex, columns, focusOrigin, rowVirtualizer])

  return (
    <div className="h-full flex flex-col relative">
      {/* Toolbar - Borderless, right-aligned actions */}
      <div className="flex items-center justify-end pt-4 px-6 lg:px-12 pb-2 bg-transparent">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompact((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] transition-all ${
              compact
                ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                : 'btn-premium-ghost'
            }`}
            title="Compact mode"
            aria-label="Toggle compact mode"
          >
            <LayoutGrid size={12} />
            Compact
          </button>

          <button
            onClick={() => {
              setShowJump((v) => !v)
              if (!showJump) setTimeout(() => jumpInputRef.current?.focus(), 50)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-premium-ghost text-[11px] transition-all"
            title="Tekan / untuk lompat ke nomor"
            aria-label="Jump to number"
          >
            <Search size={12} />
            <span className="font-mono">/</span>
          </button>
        </div>
      </div>

      {/* Jump to Number Overlay */}
      <AnimatePresence>
        {showJump && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30 glass-panel-strong px-4 py-3 flex items-center gap-3"
          >
            <span className="text-[11px] text-text-muted font-medium whitespace-nowrap">
              Lompat ke nomor:
            </span>
            <input
              ref={jumpInputRef}
              value={jumpValue}
              onChange={(e) => handleJump(e.target.value)}
              placeholder="Ketik nomor..."
              className="w-24 h-8 px-2 rounded-lg bg-surface-0 border border-border-default/40 text-[13px] text-text-primary font-mono text-center outline-none focus:border-brand-primary/40 focus:ring-2 focus:ring-brand-primary/8 transition-all"
              autoFocus
            />
            <button
              onClick={() => {
                setShowJump(false)
                setJumpValue('')
              }}
              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
            >
              Esc
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Number Grid */}
      <div className="flex-1 min-h-0 overflow-hidden px-6 lg:px-12 max-w-screen-2xl mx-auto w-full">
        <div ref={parentRef} className="h-full overflow-y-auto scrollbar-thin pb-12">
          <div
            ref={gridRef}
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rows.map((vr) => {
              const rowIndex = vr.index
              const startIndex = rowIndex * columns
              const endIndex = Math.min(startIndex + columns, sortedSongs.length)
              const rowSongs = sortedSongs.slice(startIndex, endIndex)

              return (
                <div
                  key={vr.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${vr.size}px`,
                    transform: `translateY(${vr.start}px)`
                  }}
                >
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: `${gapSize}px`
                    }}
                  >
                    {rowSongs.map((song, colIdx) => {
                      const index = startIndex + colIdx
                      const isActive = selectedSongId === song.id
                      const isFocused = focusedIndex === index
                      const num = normalizeDisplayNumber(song.number)

                      return (
                        <button
                          key={song.id}
                          data-song-number={song.id}
                          onClick={() => {
                            setFocusOrigin('pointer')
                            setFocusedIndex(index)
                            onSelectSong(song)
                          }}
                          onFocus={() => {
                            setFocusOrigin('pointer')
                            setFocusedIndex(index)
                          }}
                          className={`number-cell group focus-ring ${isActive ? 'number-cell-active' : ''} ${
                            isFocused ? 'ring-2 ring-brand-primary/25' : ''
                          }`}
                          style={{ height: `${cellSize}px` }}
                          title={`${num}. ${song.title}`}
                          aria-label={`${num}. ${song.title}`}
                        >
                          <span className="font-mono">{num}</span>

                          {/* Rich Hover Preview Card */}
                          <div className="absolute left-1/2 bottom-[100%] mb-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[60] scale-95 group-hover:scale-100 origin-bottom">
                            <div className="w-[280px] rounded-xl border border-border-default/40 bg-bg-surface shadow-2xl overflow-hidden">
                              {/* Thumbnail / Header */}
                              <div
                                className="h-16 flex items-center justify-center relative"
                                style={{
                                  backgroundColor: getHymnalColor(song.hymnal_code || 'LS')
                                    .replace('hsl', 'hsla')
                                    .replace(')', ', 0.15)')
                                }}
                              >
                                <Music
                                  size={28}
                                  style={{
                                    color: getHymnalColor(song.hymnal_code || 'LS')
                                  }}
                                />
                                <div
                                  className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                                  style={{
                                    backgroundColor: getHymnalColor(song.hymnal_code || 'LS')
                                      .replace('hsl', 'hsla')
                                      .replace(')', ', 0.2)'),
                                    color: getHymnalColor(song.hymnal_code || 'LS')
                                  }}
                                >
                                  {song.hymnal_code || 'LS'} {num}
                                </div>
                              </div>
                              {/* Info */}
                              <div className="p-3">
                                <div className="text-[13px] font-bold text-text-primary truncate">
                                  {song.title}
                                </div>
                                {song.alternate_title && (
                                  <div className="text-[11px] text-text-muted italic truncate mt-0.5">
                                    {song.alternate_title}
                                  </div>
                                )}
                                {/* Lyric preview */}
                                {song.lyrics_raw && (
                                  <div className="mt-2 text-[10px] text-text-muted line-clamp-2 leading-relaxed opacity-70">
                                    {song.lyrics_raw
                                      .replace(/\[.*?\]/g, '')
                                      .split('\n')
                                      .filter((l) => l.trim())
                                      .slice(0, 3)
                                      .join(' ')}
                                  </div>
                                )}
                                {/* Metadata chips */}
                                <div className="flex items-center gap-1.5 mt-2">
                                  {song.key_note && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-2 text-text-muted">
                                      {song.key_note}
                                    </span>
                                  )}
                                  {song.tempo && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-2 text-text-muted">
                                      {song.tempo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {isActive && (
                            <motion.div
                              layoutId="number-active-dot"
                              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand-primary shadow-glow-sm"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
