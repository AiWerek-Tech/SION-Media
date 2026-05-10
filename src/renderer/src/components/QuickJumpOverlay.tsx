/**
 * Quick Jump Overlay
 *
 * A command-palette style overlay for fast semantic navigation.
 * Supports: slide numbers, section names, special targets.
 *
 * @module QuickJumpOverlay
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight, Hash, Music, Navigation } from 'lucide-react'
import { useProjectionStore } from '../store/useProjectionStore'
import { executeRuntimeCommand } from '../utils/runtimeCommandBus'
import {
  generateQuickJumpTargets,
  filterQuickJumpTargets,
  parseSlideAddress
} from '../utils/slideAddressResolver'
import type { QuickJumpTarget } from '../types'

interface QuickJumpOverlayProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'preview' | 'live'
}

export function QuickJumpOverlay({
  isOpen,
  onClose,
  mode = 'preview'
}: QuickJumpOverlayProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { slides, sectionMap, currentSlideIndex, programSlideIndex } = useProjectionStore()

  // Generate targets
  const allTargets = useMemo(() => {
    return generateQuickJumpTargets(slides, sectionMap)
  }, [slides, sectionMap])

  // Filter targets based on query
  const filteredTargets = useMemo(() => {
    return filterQuickJumpTargets(allTargets, query)
  }, [allTargets, query])

  // Reset state when opening (use ref to avoid setState in effect)
  const prevIsOpenRef = useRef(false)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Schedule reset outside of effect synchronous body
      const raf = requestAnimationFrame(() => {
        setQuery('')
        setSelectedIndex(0)
      })
      // Focus input after animation
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      prevIsOpenRef.current = true
      return () => {
        cancelAnimationFrame(raf)
        clearTimeout(timer)
      }
    }
    if (!isOpen) {
      prevIsOpenRef.current = false
    }
    return undefined
  }, [isOpen])

  // Handle selection
  const handleSelect = useCallback(
    (target: QuickJumpTarget) => {
      if (mode === 'preview') {
        executeRuntimeCommand('NAV_CUE_GOTO', { slideIndex: target.slideIndex }, 'QUICK_JUMP')
      } else {
        executeRuntimeCommand('NAV_LIVE_GOTO', { slideIndex: target.slideIndex }, 'QUICK_JUMP')
      }

      onClose()
    },
    [mode, onClose]
  )

  // Handle direct address input
  const handleDirectAddress = useCallback(
    (input: string) => {
      const address = parseSlideAddress(input)

      if (mode === 'preview') {
        executeRuntimeCommand('NAV_CUE_GOTO_ADDRESS', { address }, 'QUICK_JUMP')
      } else {
        executeRuntimeCommand('NAV_LIVE_GOTO_ADDRESS', { address }, 'QUICK_JUMP')
      }

      onClose()
    },
    [mode, onClose]
  )

  // Keyboard navigation within overlay
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, filteredTargets.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredTargets[selectedIndex]) {
            handleSelect(filteredTargets[selectedIndex])
          } else if (query.trim()) {
            handleDirectAddress(query.trim())
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredTargets, selectedIndex, handleSelect, handleDirectAddress, onClose, query])

  // Get icon for target type
  const getTargetIcon = (type: QuickJumpTarget['type']): React.JSX.Element => {
    switch (type) {
      case 'special':
        return <Navigation size={14} className="text-next-blue" />
      case 'section':
        return <Music size={14} className="text-status-warning" />
      case 'slide':
      default:
        return <Hash size={14} className="text-text-muted" />
    }
  }

  // Get current position label
  const currentPosition = mode === 'preview' ? currentSlideIndex : programSlideIndex

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101]"
          >
            <div className="bg-bg-elevated rounded-xl shadow-2xl border border-border-default overflow-hidden">
              {/* Header / Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
                <Search size={18} className="text-text-muted" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setSelectedIndex(0)
                  }}
                  placeholder={`Jump to slide, section, or type address... (${mode})`}
                  className="flex-1 bg-transparent text-text-primary text-[14px] placeholder:text-text-muted outline-none"
                />
                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                  <kbd className="px-1.5 py-0.5 bg-bg-surface rounded text-[10px]">↑↓</kbd>
                  <kbd className="px-1.5 py-0.5 bg-bg-surface rounded text-[10px]">↵</kbd>
                  <kbd className="px-1.5 py-0.5 bg-bg-surface rounded text-[10px]">esc</kbd>
                </div>
              </div>

              {/* Current Position */}
              <div className="px-4 py-2 bg-bg-surface/50 text-[11px] text-text-muted border-b border-border-subtle">
                Current: Slide {currentPosition + 1}/{slides.length}
                {slides[currentPosition]?.sectionLabel && (
                  <span className="ml-2 text-text-secondary">
                    ({slides[currentPosition].sectionLabel})
                  </span>
                )}
              </div>

              {/* Targets List */}
              <div className="max-h-[280px] overflow-y-auto">
                {filteredTargets.length > 0 ? (
                  filteredTargets.map((target, index) => (
                    <button
                      key={`${target.type}-${target.slideIndex}`}
                      onClick={() => handleSelect(target)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-brand-primary/10 text-text-primary'
                          : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary'
                      }`}
                    >
                      {getTargetIcon(target.type)}
                      <span className="flex-1 text-[13px] font-medium">{target.label}</span>
                      {target.shortcut && (
                        <kbd className="px-1.5 py-0.5 bg-bg-surface rounded text-[10px] text-text-muted">
                          {target.shortcut}
                        </kbd>
                      )}
                      {index === selectedIndex && (
                        <ChevronRight size={14} className="text-brand-primary" />
                      )}
                    </button>
                  ))
                ) : query.trim() ? (
                  // No matches - offer direct address
                  <button
                    onClick={() => handleDirectAddress(query.trim())}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-text-secondary hover:bg-white/[0.03]"
                  >
                    <Navigation size={14} />
                    <span className="text-[13px]">
                      Go to: <span className="text-text-primary font-medium">{query}</span>
                    </span>
                  </button>
                ) : (
                  // Empty state
                  <div className="px-4 py-8 text-center text-text-muted text-[13px]">
                    No slides loaded
                  </div>
                )}
              </div>

              {/* Footer Hints */}
              <div className="px-4 py-2 bg-bg-surface/30 border-t border-border-subtle">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted">
                  <span>
                    <kbd className="px-1 bg-bg-surface rounded">5</kbd> Go to slide 5
                  </span>
                  <span>
                    <kbd className="px-1 bg-bg-surface rounded">chorus</kbd> Jump to section
                  </span>
                  <span>
                    <kbd className="px-1 bg-bg-surface rounded">last</kbd> Last slide
                  </span>
                  <span>
                    <kbd className="px-1 bg-bg-surface rounded">+2</kbd> Forward 2 slides
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
