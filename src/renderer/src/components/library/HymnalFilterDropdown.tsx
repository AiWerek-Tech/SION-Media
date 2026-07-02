/**
 * Phase 6 — HymnalFilterDropdown
 *
 * Animated dropdown for filtering songs by hymnal in Library Mode.
 * Shows all available hymnals with song counts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Check, ChevronDown, Search } from 'lucide-react'
import type { Hymnal } from '@renderer/types'

interface HymnalFilterDropdownProps {
  hymnals: Hymnal[]
  /** Current hymnal ID — null means "all" */
  selectedId: number | null
  /** Song counts per hymnal */
  songCounts?: Map<number, number>
  onChange: (hymnalId: number | null) => void
  className?: string
  includeAll?: boolean
}

export function HymnalFilterDropdown({
  hymnals,
  selectedId,
  songCounts,
  onChange,
  className = '',
  includeAll = true
}: HymnalFilterDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selectedHymnal =
    hymnals.find((h) => h.id === selectedId) || (includeAll ? null : hymnals[0] || null)
  const label = selectedHymnal ? selectedHymnal.name : 'Semua Buku Lagu'
  const totalSongs = hymnals.reduce((total, hymnal) => total + (songCounts?.get(hymnal.id) ?? 0), 0)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredHymnals = normalizedQuery
    ? hymnals.filter((hymnal) =>
        `${hymnal.name} ${hymnal.code}`.toLowerCase().includes(normalizedQuery)
      )
    : hymnals

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  const handleSelect = useCallback(
    (id: number | null) => {
      onChange(id)
      setIsOpen(false)
      setQuery('')
    },
    [onChange]
  )

  return (
    <div ref={ref} className={`hymnal-filter ${className}`} style={{ zIndex: 60 }}>
      <button type="button" onClick={() => setIsOpen((v) => !v)} className="hymnal-filter__trigger">
        <BookOpen size={13} />
        <span>{label}</span>
        <ChevronDown size={13} className={`hymnal-filter__chevron ${isOpen ? 'is-open' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="hymnal-filter__menu"
          >
            <div className="hymnal-filter__header">
              <div>
                <span>Filter Buku Lagu</span>
                <strong>{filteredHymnals.length} koleksi tersedia</strong>
              </div>
              <small>{totalSongs || '0'} lagu</small>
            </div>

            <label className="hymnal-filter__search">
              <Search size={13} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari buku lagu..."
                autoFocus
              />
            </label>

            <div className="hymnal-filter__active">
              <span>Buku aktif</span>
              <strong>{label}</strong>
            </div>

            <div className="hymnal-filter__list scrollbar-thin">
              {includeAll && (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className={`hymnal-filter__option ${selectedId === null ? 'is-active' : ''}`}
                >
                  <BookOpen size={14} />
                  <span>Semua Buku Lagu</span>
                  {selectedId === null && <Check size={14} />}
                </button>
              )}

              {filteredHymnals.map((hymnal) => {
                const isActive = selectedId === hymnal.id
                const count = songCounts?.get(hymnal.id)
                return (
                  <button
                    key={hymnal.id}
                    type="button"
                    onClick={() => handleSelect(hymnal.id)}
                    className={`hymnal-filter__option ${isActive ? 'is-active' : ''}`}
                  >
                    <span className="hymnal-filter__code">{hymnal.code.slice(0, 3)}</span>
                    <span className="hymnal-filter__name">{hymnal.name}</span>
                    {count !== undefined && <small>{count}</small>}
                    {isActive && <Check size={14} />}
                  </button>
                )
              })}

              {filteredHymnals.length === 0 && (
                <div className="hymnal-filter__empty">
                  <Search size={20} />
                  <strong>Tidak ditemukan</strong>
                  <p>Gunakan nama atau kode buku lagu lain.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
