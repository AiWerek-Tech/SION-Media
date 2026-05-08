/**
 * Shortcuts Settings Section
 * Displays keyboard shortcuts reference
 */

import React from 'react'
import { Keyboard } from 'lucide-react'

const SHORTCUTS = [
  { key: 'Space', action: 'TAKE cue ke Program' },
  { key: 'Right / PageDown', action: 'Slide live berikutnya' },
  { key: 'Left / PageUp', action: 'Slide live sebelumnya' },
  { key: 'B', action: 'Black Screen' },
  { key: 'F', action: 'Freeze Screen' },
  { key: 'C / Esc', action: 'Clear Screen' },
  { key: 'Ctrl+F', action: 'Cari lagu' },
  { key: 'Ctrl+Shift+F', action: 'Focus Live Mode' },
  { key: 'Ctrl+N', action: 'Lagu baru' },
  { key: 'Ctrl+P', action: 'Command Palette' },
  { key: '?', action: 'Daftar Shortcut' }
]

export function ShortcutsSettings(): React.JSX.Element {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Pintasan Keyboard (Shortcuts)</h2>
        <p className="text-caption">Gunakan keyboard untuk kendali lebih cepat saat live.</p>
      </div>

      <div className="grid gap-3">
        {SHORTCUTS.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between p-4 rounded-xl border border-border-default bg-bg-surface hover:bg-bg-elevated transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-bg-base text-text-muted group-hover:text-brand-primary transition-colors">
                <Keyboard size={16} />
              </div>
              <span className="text-sm font-medium text-text-primary">{s.action}</span>
            </div>
            <kbd className="min-w-[40px] px-3 py-1.5 rounded-lg bg-bg-base border border-border-strong text-[11px] font-mono font-black text-brand-primary shadow-sm">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}
