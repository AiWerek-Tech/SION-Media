import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export interface SongContextMenuAction {
  id: 'add_to_playlist' | 'toggle_favorite' | 'pin' | 'close'
  label: string
  icon: React.ReactNode
  onClick: () => void
}

export function SongContextMenu({
  open,
  x,
  y,
  onClose,
  actions
}: {
  open: boolean
  x: number
  y: number
  onClose: () => void
  actions: SongContextMenuAction[]
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.98, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -6 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[250] glass-panel-strong p-1.5 w-[220px]"
          style={{ left: x, top: y }}
          role="menu"
          aria-label="Song actions"
        >
          {actions.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                a.onClick()
                if (a.id !== 'close') onClose()
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] text-text-secondary hover:bg-surface-3/50 hover:text-text-primary transition-colors"
              role="menuitem"
            >
              <span className="text-text-muted">{a.icon}</span>
              <span className="font-semibold">{a.label}</span>
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
