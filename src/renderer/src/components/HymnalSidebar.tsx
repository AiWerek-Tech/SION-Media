/**
 * HymnalSidebar — Collapsible sidebar for navigating hymnal collections.
 * Default: collapsed (icon-only, w-16). Expandable to show full names.
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import {
  getHymnalColor,
  getHymnalBgColor,
  getHymnalBorderColor
} from '@renderer/utils/hymnal-colors'

export function HymnalSidebar(): React.JSX.Element {
  const { hymnals, selectedHymnalId, setSelectedHymnalId } = useAppStore()
  const [expanded, setExpanded] = useState(false)

  React.useEffect(() => {
    if (selectedHymnalId === null && hymnals.length > 0) {
      setSelectedHymnalId(hymnals[0].id)
    }
  }, [selectedHymnalId, hymnals, setSelectedHymnalId])

  return (
    <motion.div
      className="shrink-0 flex flex-col items-stretch border-r border-border-subtle bg-bg-base/40 overflow-hidden z-10"
      animate={{ width: expanded ? 200 : 56 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-3 pb-2">
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] font-black uppercase tracking-[0.1em] text-text-muted ml-1"
            >
              Koleksi
            </motion.span>
          )}
        </AnimatePresence>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-disabled hover:bg-bg-elevated hover:text-text-secondary transition-colors ml-auto"
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <div className={`mx-3 h-px bg-border-subtle mb-1 ${expanded ? 'mx-3' : 'mx-2'} mt-2`} />

      {/* Hymnal List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-3 no-scrollbar">
        {hymnals.map((hymnal) => {
          const isActive = selectedHymnalId === hymnal.id
          const accentColor = getHymnalColor(hymnal.code)
          const bgColor = getHymnalBgColor(hymnal.code)
          const borderColor = getHymnalBorderColor(hymnal.code)

          return (
            <button
              key={hymnal.id}
              onClick={() => setSelectedHymnalId(hymnal.id)}
              className={`group relative flex items-center gap-2.5 w-full rounded-lg transition-all duration-200 ${
                expanded ? 'px-2.5 py-2' : 'justify-center py-2'
              } ${
                isActive
                  ? 'shadow-sm'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }`}
              style={
                isActive
                  ? { backgroundColor: bgColor, borderLeft: `3px solid ${accentColor}` }
                  : undefined
              }
              title={hymnal.name}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black text-[11px] tracking-wide transition-colors ${
                  isActive ? '' : 'bg-bg-elevated group-hover:brightness-125'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: bgColor,
                        color: accentColor,
                        border: `1px solid ${borderColor}`
                      }
                    : { color: 'inherit' }
                }
              >
                {hymnal.code}
              </div>

              <AnimatePresence mode="wait">
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-bold truncate"
                        style={isActive ? { color: accentColor } : undefined}
                      >
                        {hymnal.name}
                      </span>
                      {hymnal.is_official === 1 && (
                        <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-black uppercase bg-bg-elevated border border-border-subtle text-text-disabled">
                          Official
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-disabled truncate">
                      {hymnal.language} · {hymnal.publisher || 'N/A'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed mode */}
              {!expanded && (
                <span className="absolute left-[calc(100%+8px)] hidden group-hover:block z-50 px-2.5 py-1.5 rounded-md bg-bg-surface border border-border-strong text-[10px] font-bold whitespace-nowrap shadow-lg">
                  <BookOpen size={10} className="inline mr-1 opacity-50" />
                  {hymnal.name}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
