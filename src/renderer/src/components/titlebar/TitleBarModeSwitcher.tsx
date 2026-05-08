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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-bg-elevated transition-colors mx-1"
      >
        <span className={`${config.colorClass} flex items-center`}>{config.icon}</span>
        <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          {config.label}
        </span>
        <ChevronDown
          size={12}
          className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-bg-surface border border-border-strong rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-bg-elevated transition-colors ${
                  isActive ? 'bg-bg-active' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`${item.colorClass}`}>{item.icon}</span>
                  <span
                    className={`text-[12px] ${isActive ? 'text-text-primary font-bold' : 'text-text-secondary font-medium'}`}
                  >
                    {item.label}
                  </span>
                </div>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
