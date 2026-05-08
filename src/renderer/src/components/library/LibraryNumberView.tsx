import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Hash, LayoutGrid } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Song } from '../../types'

interface NumberViewProps {
  songs: Song[]
  selectedSongId?: number | null
  onSelectSong: (song: Song) => void
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

  const columns = useMemo(() => {
    const w = gridRef.current?.clientWidth ?? 900
    return Math.max(4, Math.floor((w + gapSize) / (cellSize + gapSize)))
  }, [cellSize, gapSize])

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
        setFocusedIndex((i) => Math.min(i + 1, sortedSongs.length - 1))
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((i) => {
          if (i < 0) return 0
          return Math.min(i + columns, sortedSongs.length - 1)
        })
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
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
    const rowIndex = Math.floor(focusedIndex / columns)
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'center' })
  }, [focusedIndex, columns, rowVirtualizer])

  return (
    <div className="h-full flex flex-col relative">
      {/* Toolbar */}
      <div className="h-[48px] min-h-[48px] flex items-center justify-between px-4 border-b border-border-default/30 surface-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
            <Hash size={14} className="text-brand-primary" />
          </div>
          <span className="text-[12px] font-semibold text-text-primary">
            {sortedSongs.length} lagu
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompact((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${
              compact
                ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                : 'bg-surface-2/60 border-border-default/30 text-text-muted hover:text-text-secondary hover:bg-surface-3/60'
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2/60 border border-border-default/30 text-[11px] text-text-muted hover:text-text-secondary hover:bg-surface-3/60 transition-all"
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
      <div ref={gridRef} className="flex-1 min-h-0 overflow-hidden">
        <div ref={parentRef} className="h-full overflow-y-auto scrollbar-thin p-4">
          <div
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
                      const num = song.number || '—'

                      return (
                        <button
                          key={song.id}
                          data-song-number={song.id}
                          onClick={() => {
                            setFocusedIndex(index)
                            onSelectSong(song)
                          }}
                          onFocus={() => setFocusedIndex(index)}
                          className={`number-cell group focus-ring ${isActive ? 'number-cell-active' : ''} ${
                            isFocused ? 'ring-2 ring-brand-primary/25' : ''
                          }`}
                          style={{ height: `${cellSize}px` }}
                          title={`${num}. ${song.title}`}
                          aria-label={`${num}. ${song.title}`}
                        >
                          <span className="font-mono">{num}</span>

                          <div className="absolute inset-x-0 bottom-0 translate-y-full pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
                            <div className="glass-panel-strong px-2 py-1.5 text-[10px] text-text-primary font-medium whitespace-nowrap truncate max-w-[140px] mx-auto">
                              {song.title}
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
