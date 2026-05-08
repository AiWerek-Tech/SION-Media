/**
 * About Settings Section
 * Displays application information and links
 */

import React from 'react'
import { ExternalLink } from 'lucide-react'

export function AboutSettings(): React.JSX.Element {
  return (
    <div className="space-y-10 animate-slide-up py-4">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-brand-primary to-brand-secondary shadow-2xl flex items-center justify-center p-5">
          <div className="w-full h-full rounded-full border-4 border-white/20 flex items-center justify-center">
            <span className="text-white text-4xl font-black italic">S</span>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-text-primary">SION Media</h2>
          <p className="text-xs text-brand-primary font-black tracking-[0.3em] uppercase">
            Version 3.0.0 &quot;Aurora&quot;
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center text-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Platform
          </span>
          <span className="text-sm font-bold text-text-primary">Electron + React</span>
        </div>
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default flex flex-col items-center text-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Database
          </span>
          <span className="text-sm font-bold text-text-primary">SQLite 3</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
          SION Media adalah solusi proyeksi lagu modern yang dirancang untuk mendukung kelancaran
          ibadah dan acara live production.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://sion-media.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
          >
            Website <ExternalLink size={10} />
          </a>
          <a
            href="https://docs.sion-media.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
          >
            Dokumentasi <ExternalLink size={10} />
          </a>
          <a
            href="https://github.com/sion-media/app"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-brand-primary hover:underline"
          >
            GitHub <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  )
}
