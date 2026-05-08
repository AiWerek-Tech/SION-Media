import React, { useEffect } from 'react'
import { LibraryBrowserPanel } from '../../components/library/LibraryBrowserPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { useAppStore } from '../../store/useAppStore'

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs } = useAppStore()

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  return (
    <div className="h-full w-full overflow-hidden bg-bg-base text-text-primary flex flex-col">
      {/* Top Command Bar */}
      <LibraryTopBar />

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex">
        {/* Library Browser: Sidebar + Main Content in one component */}
        <div className="flex-1 min-w-0 flex flex-col">
          <LibraryBrowserPanel />
        </div>

        {/* Right Panel — Active Playlist Queue */}
        <div className="w-[340px] min-w-[300px] max-w-[420px] flex-shrink-0 border-l border-border-default/50 surface-1">
          <PlaylistPanel />
        </div>
      </div>
    </div>
  )
}

/* ── Top Command Bar ── */
function LibraryTopBar(): React.JSX.Element {
  return (
    <div className="h-[44px] min-h-[44px] flex items-center gap-3 px-4 border-b border-border-default/50 surface-2 z-10">
      <div className="flex items-center gap-2 text-text-muted text-[12px] font-semibold">
        <span className="text-brand-primary">LIBRARY</span>
        <span className="text-border-strong/40">/</span>
        <span>Semua Hymnal</span>
      </div>
    </div>
  )
}
