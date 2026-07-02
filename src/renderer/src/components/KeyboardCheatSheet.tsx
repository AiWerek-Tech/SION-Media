import React from 'react'
import { Modal } from './modals/Modal'

interface KeyboardCheatSheetProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  {
    category: 'Navigasi Slide',
    items: [
      { keys: ['Space'], desc: 'TAKE cue ke Program' },
      { keys: ['Right', 'PageDown'], desc: 'Slide live berikutnya' },
      { keys: ['Left', 'PageUp'], desc: 'Slide live sebelumnya' },
      { keys: ['1-9'], desc: 'Pilih lagu di playlist' }
    ]
  },
  {
    category: 'Proyeksi',
    items: [
      { keys: ['B'], desc: 'Toggle Black Screen' },
      { keys: ['F'], desc: 'Toggle Freeze' },
      { keys: ['Esc'], desc: 'Clear Screen' }
    ]
  },
  {
    category: 'Sistem',
    items: [
      { keys: ['Ctrl+P'], desc: 'Command Palette' },
      { keys: ['Ctrl+F'], desc: 'Fokus pencarian lagu' },
      { keys: ['Ctrl+N'], desc: 'Tambah lagu baru' },
      { keys: ['Ctrl+S'], desc: 'Simpan di editor' },
      { keys: ['Ctrl+Shift+F'], desc: 'Focus Live Mode' },
      { keys: ['?'], desc: 'Keyboard Shortcuts' }
    ]
  }
]

export function KeyboardCheatSheet({
  isOpen,
  onClose
}: KeyboardCheatSheetProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <Modal
      id="keyboard-shortcuts"
      title="Keyboard Shortcuts"
      subtitle="Kontrol cepat untuk operator selama presentasi."
      size="md"
      onClose={onClose}
    >
      <div className="space-y-5">
        {SHORTCUTS.map((group) => (
          <div key={group.category}>
            <h4 className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-accent">
              {group.category}
            </h4>
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <div key={item.desc} className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-text-muted">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, index) => (
                      <React.Fragment key={key}>
                        {index > 0 && <span className="text-[12px] text-text-muted/40">atau</span>}
                        <kbd className="min-w-[28px] rounded border border-border-default bg-bg-elevated px-2 py-0.5 text-center font-mono text-[12px] text-text-primary">
                          {key}
                        </kbd>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
