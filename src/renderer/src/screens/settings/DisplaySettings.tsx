/**
 * Display Settings Section
 * Handles monitor detection and projection output configuration
 */

import React from 'react'
import { Monitor, Info } from 'lucide-react'
import type { DisplayInfo } from '../../../../shared/types'

interface DisplaySettingsProps {
  displays: DisplayInfo[]
}

export function DisplaySettings({ displays }: DisplaySettingsProps): React.JSX.Element {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Pengaturan Display</h2>
        <p className="text-caption">Kelola monitor dan output proyektor.</p>
      </div>

      <div className="grid gap-4">
        {displays.map((d) => (
          <div
            key={d.id}
            className="p-4 rounded-2xl border border-border-default bg-bg-surface flex items-center justify-between group hover:border-brand-primary/30 transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-xl ${d.isPrimary ? 'bg-brand-primary/10 text-brand-primary' : 'bg-bg-elevated text-text-muted'}`}
              >
                <Monitor size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {d.label || `Display ${d.id}`}
                  {d.isPrimary && (
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-wider">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {d.width} × {d.height} px · 60Hz
                </p>
              </div>
            </div>
            {!d.isPrimary && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-live-green/10 text-live-green border border-live-green/20">
                <div className="w-1.5 h-1.5 rounded-full bg-live-green animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Active Output
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-status-info/5 border border-status-info/10 flex gap-3">
        <Info size={18} className="text-status-info shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          SION Media mendeteksi monitor secara otomatis. Pastikan proyektor terhubung dalam mode
          &quot;Extend&quot; di pengaturan Windows untuk hasil terbaik.
        </p>
      </div>
    </div>
  )
}
