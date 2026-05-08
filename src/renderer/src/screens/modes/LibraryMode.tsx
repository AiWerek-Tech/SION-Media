import React, { useEffect } from 'react'
import { LibraryBrowserPanel } from '../../components/library/LibraryBrowserPanel'
import { LibraryCommandBar } from '../../components/library/LibraryCommandBar'
import { useAppStore } from '../../store/useAppStore'

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs } = useAppStore()

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
      </div>
    </div>
  )
}
