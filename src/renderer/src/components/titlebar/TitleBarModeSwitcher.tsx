import React, { useState, useRef, useEffect } from 'react'
import { MonitorPlay, Library, LayoutDashboard, Settings, ChevronDown } from 'lucide-react'
import { useModeStore, AppMode } from '../../store/useModeStore'

const MODE_CONFIG: Record<AppMode, { label: string; icon: React.ReactNode; colorClass: string }> = {
  PROJECTION: {
    label: 'Projection',
    icon: <MonitorPlay size={12} />,
    colorClass: 'text-brand-primary'
  },
  LIBRARY: { label: 'Library', icon: <Library size={12} />, colorClass: 'text-brand-secondary' },
  BROADCAST: {
    label: 'Broadcast',
    icon: <LayoutDashboard size={12} />,
    colorClass: 'text-status-warning'
  },
  MANAGEMENT: { label: 'Management', icon: <Settings size={12} />, colorClass: 'text-text-primary' }
}

export function TitleBarModeSwitcher(): React.JSX.Element {
  const { currentMode, setMode } = useModeStore()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const config = MODE_CONFIG[currentMode]

  return (
    <div className="relative flex items-center h-full no-drag" ref={menuRef}>
      <div className="title-bar-separator" />
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/[0.06] transition-all duration-200 mx-1 active:scale-95"
      >
        <span
          className={`${config.colorClass} flex items-center transition-transform duration-300 ${isOpen ? 'scale-110' : ''}`}
        >
          {config.icon}
        </span>
        <span className="text-[11px] font-bold text-text-primary uppercase tracking-[0.05em]">
          {config.label}
        </span>
        <ChevronDown
          size={12}
          className={`text-text-muted transition-all duration-300 ${isOpen ? 'rotate-180 text-brand-primary' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="title-bar-dropdown absolute top-full left-0 mt-1.5 w-52 animate-in fade-in zoom-in-[0.98] duration-150 origin-top-left">
          {(Object.keys(MODE_CONFIG) as AppMode[]).map((mode) => {
            const item = MODE_CONFIG[mode]
            const isActive = currentMode === mode
            return (
              <button
                key={mode}
                onClick={() => {
                  setMode(mode)
                  setIsOpen(false)
                }}
                className={`title-bar-dropdown-item mb-0.5 last:mb-0 ${
                  isActive ? 'bg-brand-primary/15 text-brand-primary' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-brand-primary' : item.colorClass}>
                    {item.icon}
                  </span>
                  <span className={isActive ? 'font-bold' : ''}>{item.label}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-glow-sm" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
