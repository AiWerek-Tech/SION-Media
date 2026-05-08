import React from 'react'
import { LayoutDashboard, Radio } from 'lucide-react'

export function BroadcastMode(): React.JSX.Element {
  return (
    <div className="h-full w-full bg-bg-base text-text-primary flex flex-col items-center justify-center p-8">
      <div className="flex items-center justify-center h-24 w-24 rounded-3xl bg-status-warning/10 border border-status-warning/20 mb-6">
        <LayoutDashboard size={48} className="text-status-warning" />
      </div>
      <h2 className="text-h2 mb-4">Broadcast Mode</h2>
      <p className="text-text-muted text-center max-w-lg mb-8">
        Mode ini sedang dalam tahap pengembangan (Beta). Nantinya, Broadcast Mode akan menyediakan antarmuka khusus untuk operator vMix/OBS dengan dukungan NDI dan Multi-Preview yang terpisah dari jendela proyektor standar.
      </p>
      
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-elevated border border-border-default">
        <Radio size={16} className="text-status-warning animate-pulse" />
        <span className="text-sm font-medium">Coming Soon</span>
      </div>
    </div>
  )
}
