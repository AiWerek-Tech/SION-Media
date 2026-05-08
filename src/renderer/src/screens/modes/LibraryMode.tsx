import React, { useEffect } from 'react'
import { SongLibraryPanel } from '../../components/SongLibraryPanel'
import { PlaylistPanel } from '../../components/PlaylistPanel'
import { useAppStore } from '../../store/useAppStore'

export function LibraryMode(): React.JSX.Element {
  const { loadHymnals, loadSongs } = useAppStore()

  useEffect(() => {
    loadHymnals()
    loadSongs()
  }, [loadHymnals, loadSongs])

  return (
    <div className="h-full w-full overflow-hidden bg-bg-base text-text-primary p-4">
      <div className="h-full w-full bg-bg-surface/50 border border-border-default rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-border-default bg-bg-elevated/50 flex items-center justify-between">
          <div>
            <h2 className="text-h3 text-text-primary">Library Mode</h2>
            <p className="text-xs text-text-muted mt-1">
              Mode ini difokuskan untuk pencarian lirik dan penyusunan playlist. Layar proyektor
              dinonaktifkan.
            </p>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[minmax(360px,50%)_minmax(420px,50%)] min-h-0 bg-bg-base">
          <div className="min-w-0 border-r border-border-default p-2">
            <SongLibraryPanel />
          </div>
          <div className="min-w-0 p-2">
            <PlaylistPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
