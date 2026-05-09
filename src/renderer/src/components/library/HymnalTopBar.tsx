/**
 * MultiHymnalSidebar — Horizontal top bar with dropdown hymnal selector.
 * Layout: Horizontal bar with hymnal dropdown, search, and view controls.
 * Inspired by play.lagusion.org horizontal top bar.
 */

import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Music,
  Guitar,
  Heart,
  Sun,
  Globe,
  Crown,
  ChevronDown,
  Volume2,
  Grid3X3,
  List,
  Search
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { getHymnalColor, getHymnalBgColor, getHymnalBorderColor } from '../../utils/hymnal-colors'

// Icon mapping per hymnal code for visual distinction
const HYMNAL_ICONS: Record<string, React.ElementType> = {
  LS: Guitar,
  SDAH: BookOpen,
  PK: Heart,
  LG: Sun,
  LPMI: Globe,
  SS: Crown,
  default: Music
}

function getHymnalIcon(code: string): React.ElementType {
  return HYMNAL_ICONS[code] || HYMNAL_ICONS.default
}

export function HymnalTopBar(): React.JSX.Element {
  const { hymnals, selectedHymnalId, setSelectedHymnalId, songs, loadSongs } = useAppStore()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Set default to LS on mount if no selection
  useEffect(() => {
    if (selectedHymnalId === null && hymnals.length > 0) {
      const lsHymnal = hymnals.find((h) => h.code === 'LS')
      if (lsHymnal) {
        setSelectedHymnalId(lsHymnal.id)
      } else {
        setSelectedHymnalId(hymnals[0].id)
      }
    }
  }, [hymnals, selectedHymnalId, setSelectedHymnalId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Count songs per hymnal
  const songCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const song of songs) {
      counts[song.hymnal_id] = (counts[song.hymnal_id] || 0) + 1
    }
    return counts
  }, [songs])

  const hymnalStats = useMemo(() => {
    const stats: Record<number, { total: number }> = {}
    for (const h of hymnals) {
      stats[h.id] = { total: songCounts[h.id] || 0 }
    }
    return stats
  }, [hymnals, songCounts])

  const selectedHymnal = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId),
    [hymnals, selectedHymnalId]
  )

  const handleSelectHymnal = useCallback(
    (id: number): void => {
      setSelectedHymnalId(id)
      loadSongs(id)
      setShowDropdown(false)
    },
    [setSelectedHymnalId, loadSongs]
  )

  const accentColor = selectedHymnal ? getHymnalColor(selectedHymnal.code) : getHymnalColor('LS')

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hymnal Selector Dropdown Trigger */}
      {selectedHymnal && (
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-border-subtle bg-bg-elevated/60 hover:bg-bg-elevated-hover/80 hover:border-border-default transition-all duration-200 shrink-0 shadow-sm hover:shadow-[var(--shadow-elevation-1)]"
        >
          {/* Icon */}
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center border"
            style={{
              backgroundColor: getHymnalBgColor(selectedHymnal.code),
              borderColor: getHymnalBorderColor(selectedHymnal.code)
            }}
          >
            {(() => {
              const IconComp = getHymnalIcon(selectedHymnal.code)
              return <IconComp size={16} style={{ color: accentColor }} />
            })()}
          </div>

          {/* Name + Stats */}
          <div className="flex items-center gap-2">
            <span
              className="text-[13px] font-bold truncate max-w-[180px]"
              style={{ color: accentColor }}
            >
              {selectedHymnal.name}
            </span>
            <span className="text-[10px] text-text-muted flex items-center gap-1">
              <Volume2 size={9} />
              {hymnalStats[selectedHymnal.id]?.total || 0}
            </span>
          </div>

          {/* Dropdown Chevron */}
          <ChevronDown
            size={14}
            className={`text-text-muted transition-transform ml-1 ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Dropdown Panel */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-[calc(100%+6px)] left-4 z-[50] w-[320px] rounded-2xl border border-border-subtle bg-bg-surface/95 backdrop-blur-xl shadow-[var(--shadow-elevation-4)] overflow-hidden"
          >
            {/* Dropdown Header */}
            <div className="px-4 py-3 border-b border-border-default/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Pilih Buku Lagu
              </span>
            </div>

            {/* Hymnal List */}
            <div className="p-2 space-y-0.5 max-h-[360px] overflow-y-auto scrollbar-thin">
              {hymnals.map((hymnal) => {
                const isActive = selectedHymnalId === hymnal.id
                const color = getHymnalColor(hymnal.code)
                const IconComp = getHymnalIcon(hymnal.code)
                const total = hymnalStats[hymnal.id]?.total || 0

                return (
                  <button
                    key={hymnal.id}
                    onClick={() => handleSelectHymnal(hymnal.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-bg-elevated border border-border-subtle shadow-[var(--shadow-elevation-1)]'
                        : 'hover:bg-bg-elevated/40 text-text-secondary hover:text-text-primary hover:border-border-subtle'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border"
                      style={{
                        backgroundColor: isActive
                          ? color.replace('hsl', 'hsla').replace(')', ', 0.15)')
                          : 'rgba(255,255,255,0.04)',
                        borderColor: isActive
                          ? getHymnalBorderColor(hymnal.code)
                          : 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <IconComp
                        size={18}
                        style={isActive ? { color } : undefined}
                        className={isActive ? '' : 'text-text-muted'}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[13px] font-semibold truncate"
                          style={isActive ? { color } : undefined}
                        >
                          {hymnal.name}
                        </span>
                        {isActive && (
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-text-muted">{total} lagu</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Recent Songs Section (inside dropdown) */}
            {(() => {
              const recentSongs = songs
                .filter((s) => s.last_used || s.last_played)
                .sort((a, b) => {
                  const da = new Date(b.last_used || b.last_played || '0').getTime()
                  const db = new Date(a.last_used || a.last_played || '0').getTime()
                  return da - db
                })
                .slice(0, 3)

              if (recentSongs.length === 0) return null

              return (
                <>
                  <div className="mx-3 h-px bg-border-default/20" />
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        Terakhir Diputar
                      </span>
                      <div className="flex-1 h-px bg-border-default/10" />
                    </div>
                    <div className="space-y-0.5">
                      {recentSongs.map((song) => {
                        const c = getHymnalColor(song.hymnal_code || 'LS')
                        return (
                          <button
                            key={song.id}
                            onClick={() => {
                              document.dispatchEvent(
                                new CustomEvent('sion:select-song', { detail: song })
                              )
                              setShowDropdown(false)
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-2/40 transition-all text-left"
                          >
                            <div
                              className="h-7 w-7 shrink-0 rounded-md flex items-center justify-center border text-[10px] font-bold font-mono"
                              style={{
                                backgroundColor: c.replace('hsl', 'hsla').replace(')', ', 0.12)'),
                                borderColor: c.replace('hsl', 'hsla').replace(')', ', 0.25)'),
                                color: c
                              }}
                            >
                              {song.number || '—'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-medium text-text-primary truncate">
                                {song.title}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
