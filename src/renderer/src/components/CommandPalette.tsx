import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Music, Settings, FileUp, Keyboard } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useProjectionStore } from '../store/useProjectionStore'
import { generateSlides } from '../engine/slideEngine'
import type { Song } from '../types'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.JSX.Element
  action: () => void
  category: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps): React.JSX.Element | null {
  'use no memo'
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { songs, setScreen, setEditingSong, setSelectedSong } = useAppStore()
  const { setSlides } = useProjectionStore()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const commands = useMemo((): CommandItem[] => {
    const items: CommandItem[] = [
      {
        id: 'new-song',
        label: 'Tambah Lagu Baru',
        icon: <Music size={14} />,
        action: () => {
          setEditingSong(null)
          setScreen('song-editor')
          onClose()
        },
        category: 'Navigasi'
      },
      {
        id: 'settings',
        label: 'Pengaturan',
        icon: <Settings size={14} />,
        action: () => {
          setScreen('settings')
          onClose()
        },
        category: 'Navigasi'
      },
      {
        id: 'import',
        label: 'Import / Export',
        icon: <FileUp size={14} />,
        action: () => {
          setScreen('import-export')
          onClose()
        },
        category: 'Navigasi'
      },
      {
        id: 'shortcuts',
        label: 'Keyboard Shortcuts',
        description: 'Tekan ?',
        icon: <Keyboard size={14} />,
        action: () => {
          onClose()
          document.dispatchEvent(new CustomEvent('sion:show-shortcuts'))
        },
        category: 'Bantuan'
      }
    ]

    // Add songs as searchable items
    songs.forEach((song: Song) => {
      items.push({
        id: `song-${song.id}`,
        label: `${song.hymnal_code || 'LS'} ${song.number} — ${song.title}`,
        description: song.alternate_title
          ? `${song.alternate_title}${song.category ? ` · ${song.category}` : ''}`
          : song.category || undefined,
        icon: <Music size={14} />,
        action: () => {
          setSelectedSong(song)
          const slides = generateSlides(song.id, song.lyrics_raw)
          setSlides(slides)
          onClose()
        },
        category: 'Lagu'
      })
    })

    return items
  }, [songs, onClose, setEditingSong, setScreen, setSelectedSong, setSlides])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    )
  }, [query, commands])

  // Virtualization
  const parentRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // 48px height per item
    overscan: 10
  })

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = Math.min(selectedIndex + 1, filtered.length - 1)
      setSelectedIndex(nextIndex)
      rowVirtualizer.scrollToIndex(nextIndex)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = Math.max(selectedIndex - 1, 0)
      setSelectedIndex(prevIndex)
      rowVirtualizer.scrollToIndex(prevIndex)
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      filtered[selectedIndex].action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: 'flex-start', paddingTop: '15vh' }}
    >
      <div
        className="w-[480px] animate-fadeIn glass-panel-heavy"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cari lagu, perintah, atau navigasi..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted/40"
          />
          <kbd
            className="text-[9px] text-text-muted px-1.5 py-0.5 rounded border border-border"
            style={{ background: 'var(--color-elevated)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={parentRef} className="max-h-[320px] overflow-y-auto py-1.5 scroll-smooth">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-text-muted text-xs">Tidak ada hasil</div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const item = filtered[virtualRow.index]
                const i = virtualRow.index
                return (
                  <button
                    key={virtualRow.key}
                    onClick={item.action}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    className={`w-full flex items-center gap-3 px-4 text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-accent/10 text-text-primary'
                        : 'text-text-muted hover:bg-elevated'
                    }`}
                  >
                    <span className={i === selectedIndex ? 'text-accent' : 'text-text-muted'}>
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate">{item.label}</p>
                      {item.description && (
                        <p className="text-[10px] text-text-muted truncate">{item.description}</p>
                      )}
                    </div>
                    <span className="text-[9px] text-text-muted/50">{item.category}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
