import React, { useEffect } from 'react'
import { LibraryBrowserPanel } from '../../components/library/LibraryBrowserPanel'
import { LibraryCommandBar } from '../../components/library/LibraryCommandBar'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { useAppStore } from '../../store/useAppStore'

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs, isFocusMode } = useAppStore()

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  return (
    <div className="h-full w-full overflow-hidden bg-bg-base text-text-primary flex flex-col">
      <LibraryCommandBar />

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex">
        {/* Library Browser: Sidebar + Main Content in one component */}
        <div className="flex-1 min-w-0 flex flex-col">
          <LibraryBrowserPanel />
        </div>

        {/* Right Panel — Active Playlist Queue */}
        {!isFocusMode && (
          <div className="w-[340px] min-w-[300px] max-w-[420px] flex-shrink-0 border-l border-border-default/50 surface-1">
            <PlaylistPanel />
          </div>
        )}
      </div>
    </div>
  )
}
