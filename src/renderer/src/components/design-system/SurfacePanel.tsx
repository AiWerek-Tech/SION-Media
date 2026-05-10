import React from 'react'

interface SurfacePanelProps {
  children: React.ReactNode
  className?: string
  depth?: 0 | 1 | 2 | 3 | 4 | 5
}

const depthMap: Record<number, string> = {
  0: '',
  1: 'bg-white/[0.02] ring-1 ring-white/5',
  2: 'bg-white/[0.03] ring-1 ring-white/10',
  3: 'bg-white/[0.05] ring-1 ring-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]',
  4: 'bg-white/[0.06] ring-1 ring-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.28)]',
  5: 'bg-white/[0.08] ring-1 ring-white/12 shadow-[0_25px_80px_rgba(0,0,0,0.35)]'
}

export function SurfacePanel({
  children,
  className = '',
  depth = 2
}: SurfacePanelProps): React.JSX.Element {
  return (
    <div className={`rounded-2xl transition-shadow ${depthMap[depth]} ${className}`}>
      {children}
    </div>
  )
}
