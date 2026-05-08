import React, { useEffect } from 'react'
import { LibraryBrowserPanel } from '../../components/LibraryBrowserPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { useAppStore } from '../../store/useAppStore'

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs } = useAppStore()

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  return (
    <div className="h-full w-full overflow-hidden bg-bg-base text-text-primary p-3">
      <div className="h-full w-full bg-bg-surface/45 border border-border-default rounded-2xl overflow-hidden shadow-2xl">
        <div className="h-full w-full grid grid-cols-[minmax(760px,1fr)_minmax(360px,420px)] min-h-0">
          <div className="min-w-0 min-h-0">
            <LibraryBrowserPanel />
          </div>
          <div className="min-w-0 min-h-0 border-l border-border-default bg-bg-base">
            <PlaylistPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
