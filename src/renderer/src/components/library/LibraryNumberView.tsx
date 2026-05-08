import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Hash } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const jumpInputRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Sort songs by number
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      const na = parseInt(a.number || '0', 10)
      const nb = parseInt(b.number || '0', 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb
      return (a.number || '').localeCompare(b.number || '')
    })
  }, [songs])

  // Keyboard shortcut: / to open jump-to-number
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setShowJump(true)
        setTimeout(() => jumpInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setShowJump(false)
        setJumpValue('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleJump = (val: string): void => {
    setJumpValue(val)
    const num = parseInt(val, 10)
    if (!Number.isNaN(num)) {
      const target = sortedSongs.find((s) => parseInt(s.number || '0', 10) === num)
      if (target) {
        onSelectSong(target)
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
        <button
          onClick={() => {
            setShowJump((v) => !v)
            if (!showJump) setTimeout(() => jumpInputRef.current?.focus(), 50)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2/60 border border-border-default/30 text-[11px] text-text-muted hover:text-text-secondary hover:bg-surface-3/60 transition-all"
          title="Tekan / untuk lompat ke nomor"
        >
          <Search size={12} />
          <span className="font-mono">/</span>
        </button>
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
      <div ref={gridRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
          {sortedSongs.map((song, index) => {
            const isActive = selectedSongId === song.id
            const num = song.number || '—'

            return (
              <motion.button
                key={song.id}
                data-song-number={song.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(index * 0.008, 0.4),
                  ease: [0.16, 1, 0.3, 1]
                }}
                onClick={() => onSelectSong(song)}
                className={`number-cell group ${isActive ? 'number-cell-active' : ''}`}
                title={`${num}. ${song.title}`}
              >
                <span className="font-mono">{num}</span>

                {/* Mini title on hover */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
                  <div className="glass-panel-strong px-2 py-1.5 text-[10px] text-text-primary font-medium whitespace-nowrap truncate max-w-[120px] mx-auto">
                    {song.title}
                  </div>
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="number-active-dot"
                    className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand-primary shadow-glow-sm"
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
