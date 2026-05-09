/**
 * LibraryMode (Redesigned) — Premium Library Mode for personal use.
 * Features: Multi-Hymnal Sidebar, Tab-based Views (Number/Title/Playlist), Lyric Studio Lite.
 * Optimized for speed, information depth, and premium aesthetics.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { Search, Command, Moon, Sun, Wand2, Grid3X3, ListMusic, Type } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore } from '../../store/useModeStore'
import { HymnalTopBar } from '../../components/library/HymnalTopBar'
import { LibraryBrowserPanel, LibraryTab } from '../../components/library/LibraryBrowserPanel'
import { LibrarySearchPalette } from '../../components/library/LibrarySearchPalette'
import type { Song } from '../../types'

const TABS: Array<{ id: LibraryTab; label: string; icon: React.ElementType }> = [
  { id: 'playlist', label: 'Playlist', icon: ListMusic },
  { id: 'number', label: 'Nomor', icon: Grid3X3 },
  { id: 'title', label: 'Judul', icon: Type }
]

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs, setSelectedSong, selectedHymnalId, songs } = useAppStore()
  const [showSearch, setShowSearch] = useState(false)
  const [activeTab, setActiveTab] = useState<LibraryTab>('number')
  const { theme, setTheme } = useModeStore()

  // Load data on mount
  useEffect(() => {
    loadHymnals()
    if (selectedHymnalId) loadSongs(selectedHymnalId)
  }, [loadHymnals, loadSongs, selectedHymnalId])

  // Theme persistence is handled by useModeStore, we just apply it to the document
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Keyboard shortcut for search (Ctrl+K) and custom event from sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    const handleOpenSearch = (): void => {
      setShowSearch(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('sion:open-search', handleOpenSearch)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('sion:open-search', handleOpenSearch)
    }
  }, [])

  // Handle song selection
  const handleSelectSong = useCallback(
    (song: Song) => {
      setSelectedSong(song)
    },
    [setSelectedSong]
  )

  // Listen for sidebar song selection events
  useEffect(() => {
    const handler = (e: CustomEvent<Song>): void => {
      handleSelectSong(e.detail)
    }
    document.addEventListener('sion:select-song', handler as EventListener)
    return () => document.removeEventListener('sion:select-song', handler as EventListener)
  }, [handleSelectSong])

  return (
    <div className="h-full w-full overflow-hidden bg-bg-base text-text-primary flex flex-col">
      {/* Unified Top Command Bar - Full Width */}
      <div className="h-[56px] min-h-[56px] flex items-center justify-between px-4 border-b border-border-subtle bg-bg-surface/70 backdrop-blur-md shadow-sm z-30 relative">
        
        {/* Left: Hymnal Selector */}
        <div className="flex items-center gap-3">
          <HymnalTopBar />
        </div>

        {/* Center: Tabs (Premium Segmented Control) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <div className="pill-tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pill-tab ${isActive ? 'pill-tab-active' : ''}`}
                >
                  <Icon size={14} className={isActive ? 'text-brand-primary' : ''} />
                  <span>{tab.label}</span>
                  {tab.id === 'number' && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-surface-4/80 text-[10px] font-mono leading-none opacity-80">
                      {songs.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center">
            <div className="chip">
              <span className="text-brand-primary font-mono">{songs.length}</span> lagu
            </div>
          </div>

          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 h-[34px] px-3 rounded-lg bg-surface-2/60 border border-border-default/50 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-3/80 hover:border-border-strong transition-all shadow-sm group"
          >
            <Search size={14} className="group-hover:text-brand-primary transition-colors" />
            <span className="hidden sm:inline">Cari lagu...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 ml-3 px-1.5 py-0.5 rounded border border-border-subtle bg-surface-3 text-[10px] font-bold font-mono text-text-muted group-hover:text-text-primary transition-colors">
              <Command size={10} />K
            </kbd>
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn-premium btn-premium-ghost btn-premium-icon"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button
            onClick={() => useAppStore.getState().toggleFocusMode()}
            className="btn-premium btn-premium-ghost btn-premium-icon hover:text-brand-primary hover:bg-brand-primary/10"
            title="Focus mode"
          >
            <Wand2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        <LibraryBrowserPanel activeTab={activeTab} />
      </div>

      {/* Search Palette */}
      <LibrarySearchPalette
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectSong={handleSelectSong}
      />
    </div>
  )
}
