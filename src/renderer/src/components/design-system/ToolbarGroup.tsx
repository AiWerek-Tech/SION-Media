import React from 'react'

interface ToolbarGroupProps {
  label?: string
  children: React.ReactNode
  className?: string
}

export function ToolbarGroup({
  label,
  children,
  className = ''
}: ToolbarGroupProps): React.JSX.Element {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
          {label}
        </div>
      )}
      <div className="flex items-center gap-1.5 bg-white/[0.03] ring-1 ring-white/10 rounded-2xl p-1.5">
        {children}
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  accent?: boolean
  className?: string
  title?: string
}

export function ToolbarButton({
  children,
  onClick,
  active = false,
  accent = false,
  className = '',
  title
}: ToolbarButtonProps): React.JSX.Element {
  const baseClass = active
    ? 'bg-white/[0.08] text-text-primary'
    : accent
      ? 'bg-brand-primary/10 ring-1 ring-brand-primary/20 text-brand-primary hover:bg-brand-primary/15 active:bg-brand-primary/20'
      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06] active:bg-white/[0.08]'

  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        group relative
        px-3 h-8
        rounded-xl
        text-[11px] font-semibold
        active:scale-[0.98]
        transition-all duration-150
        ${baseClass}
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface ToolbarDividerProps {
  className?: string
}

export function ToolbarDivider({ className = '' }: ToolbarDividerProps): React.JSX.Element {
  return <div className={`hidden md:block w-px h-7 bg-white/5 ${className}`} />
}
