import React, { useState, useRef, useEffect } from 'react'
import { MonitorPlay, Library, LayoutDashboard, Settings, ChevronDown } from 'lucide-react'
import { useModeStore, AppMode } from '../../store/useModeStore'

const MODE_CONFIG: Record<
  AppMode,
  { label: string; sub: string; icon: React.ReactNode; colorClass: string }
> = {
  PROJECTION: {
    label: 'Projection',
    sub: 'Live Scene & Output',
    icon: <MonitorPlay size={16} strokeWidth={1.5} />,
    colorClass: 'text-brand-primary'
  },
  LIBRARY: {
    label: 'Library',
    sub: 'Media & Song Assets',
    icon: <Library size={16} strokeWidth={1.5} />,
    colorClass: 'text-brand-secondary'
  },
  BROADCAST: {
    label: 'Broadcast',
    sub: 'Streaming & Distribution',
    icon: <LayoutDashboard size={16} strokeWidth={1.5} />,
    colorClass: 'text-status-warning'
  },
  MANAGEMENT: {
    label: 'Management',
    sub: 'System Configuration',
    icon: <Settings size={16} strokeWidth={1.5} />,
    colorClass: 'text-text-primary'
  }
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
    <div className="title-bar-mode-switcher no-drag" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`title-bar-mode-trigger ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span
          className={`title-bar-mode-trigger__icon ${config.colorClass} ${isOpen ? 'is-open' : ''}`}
        >
          {config.icon}
        </span>
        <span className="title-bar-mode-trigger__text">{config.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`title-bar-mode-trigger__chevron ${isOpen ? 'is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="title-bar-mode-dropdown animate-in fade-in zoom-in-[0.98] duration-200">
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
                className={`title-bar-mode-option ${isActive ? 'is-active' : ''}`}
              >
                <div className="title-bar-mode-option__main">
                  <span className={`title-bar-mode-option__icon ${item.colorClass}`}>
                    {item.icon}
                  </span>
                  <div className="title-bar-mode-option__content">
                    <span className="title-bar-mode-option__label">{item.label}</span>
                    <span className="title-bar-mode-option__sub">{item.sub}</span>
                  </div>
                </div>
                {isActive && <div className="title-bar-mode-option__indicator" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
