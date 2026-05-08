import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookOpen, ChevronDown, Command, Moon, Search, Sun, Wand2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'

export function LibraryCommandBar(): React.JSX.Element {
  const { hymnals, selectedHymnalId, setSelectedHymnalId } = useAppStore()
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = window.localStorage.getItem('sion:theme')
    return saved === 'light' ? 'light' : 'dark'
  })

  const ref = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => hymnals.find((h) => h.id === selectedHymnalId) || null,
    [hymnals, selectedHymnalId]
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('sion:theme', theme)
  }, [theme])

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const openGlobalSearch = (): void => {
    document.dispatchEvent(new Event('sion:toggle-command-palette'))
  }

  return (
    <div className="h-[48px] min-h-[48px] flex items-center justify-between px-4 border-b border-border-default/50 surface-2 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 text-text-muted text-[12px] font-semibold min-w-0">
          <span className="text-brand-primary">LIBRARY</span>
          <ArrowRight size={12} className="opacity-50" />
          <span className="truncate">{selected ? selected.name : 'Semua Hymnal'}</span>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={openGlobalSearch}
            className="h-9 px-3 rounded-xl bg-surface-0/60 border border-border-default/30 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-2/50 transition-all flex items-center gap-2"
            aria-label="Buka pencarian global"
            title="Pencarian global (Ctrl+K)"
          >
            <Search size={14} />
            <span className="truncate">Cari lagu, nomor, lirik…</span>
            <span className="ml-2 px-1.5 py-0.5 rounded-md bg-surface-3 text-[10px] font-bold text-text-muted flex items-center gap-1">
              <Command size={10} />K
            </span>
          </button>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="h-9 px-3 rounded-xl bg-surface-0/60 border border-border-default/30 text-[12px] text-text-muted hover:text-text-primary hover:bg-surface-2/50 transition-all flex items-center gap-2"
              aria-label="Pilih hymnal"
            >
              <BookOpen size={14} />
              <span className="max-w-[180px] truncate">
                {selected ? `${selected.code}. ${selected.name}` : 'Semua Hymnal'}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 top-full mt-2 w-[320px] glass-panel-strong p-1.5 max-h-[360px] overflow-y-auto scrollbar-thin"
                >
                  <button
                    onClick={() => {
                      setSelectedHymnalId(null)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-colors ${
                      selectedHymnalId === null
                        ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                        : 'text-text-secondary hover:bg-surface-3/50'
                    }`}
                  >
                    <span className="text-[10px] font-bold bg-surface-3 border border-border-default/30 rounded px-1.5 py-0.5">
                      ALL
                    </span>
                    Semua Hymnal
                  </button>

                  {hymnals.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedHymnalId(h.id)
                        setOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[12px] transition-colors ${
                        selectedHymnalId === h.id
                          ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                          : 'text-text-secondary hover:bg-surface-3/50'
                      }`}
                    >
                      <span className="text-[10px] font-bold bg-surface-3 border border-border-default/30 rounded px-1.5 py-0.5 min-w-[28px] text-center">
                        {h.code}
                      </span>
                      <span className="truncate">{h.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          className="btn-premium btn-premium-icon"
          aria-label="Toggle theme"
          title="Theme"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button
          onClick={() => useAppStore.getState().toggleFocusMode()}
          className="btn-premium btn-premium-icon"
          aria-label="Toggle focus mode"
          title="Focus mode"
        >
          <Wand2 size={16} />
        </button>
      </div>
    </div>
  )
}
