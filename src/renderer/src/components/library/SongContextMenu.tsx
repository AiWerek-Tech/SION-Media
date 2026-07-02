import React, { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const MENU_WIDTH = 220
const MENU_MARGIN = 8
const MENU_ROW_HEIGHT = 36

export type SongContextMenuActionId =
  | 'open_song'
  | 'add_to_playlist'
  | 'toggle_favorite'
  | 'edit_song'
  | 'edit_lyrics'
  | 'copy_number'
  | 'copy_title'
  | 'view_relations'
  | 'duplicate_song'
  | 'delete_song'
  | 'pin'
  | 'close'

export interface SongContextMenuAction {
  id: SongContextMenuActionId
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
  dividerBefore?: boolean
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
  const menuHeight = actions.length * MENU_ROW_HEIGHT + 18
  const safeLeft =
    typeof window === 'undefined' ? x : Math.min(x, window.innerWidth - MENU_WIDTH - MENU_MARGIN)
  const safeTop =
    typeof window === 'undefined' ? y : Math.min(y, window.innerHeight - menuHeight - MENU_MARGIN)

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
          style={{ left: Math.max(MENU_MARGIN, safeLeft), top: Math.max(MENU_MARGIN, safeTop) }}
          role="menu"
          aria-label="Song actions"
        >
          {actions.map((a) => (
            <React.Fragment key={a.id}>
              {a.dividerBefore && <div className="my-1 border-t border-white/[0.06]" />}
              <button
                onClick={() => {
                  a.onClick()
                  if (a.id !== 'close') onClose()
                }}
                className={`
                  w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px]
                  transition-colors
                  ${
                    a.danger
                      ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                      : 'text-text-secondary hover:bg-surface-3/50 hover:text-text-primary'
                  }
                `}
                role="menuitem"
              >
                <span className={a.danger ? 'text-rose-400/60' : 'text-text-muted'}>{a.icon}</span>
                <span className="font-semibold">{a.label}</span>
              </button>
            </React.Fragment>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
