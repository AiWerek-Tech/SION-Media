import React from 'react'

interface EditorShellProps {
  children: React.ReactNode
  className?: string
}

export function EditorShell({ children, className = '' }: EditorShellProps): React.JSX.Element {
  return (
    <div className={`h-full w-full flex flex-col bg-bg-base overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface EditorWorkspaceProps {
  children: React.ReactNode
  className?: string
}

export function EditorWorkspace({
  children,
  className = ''
}: EditorWorkspaceProps): React.JSX.Element {
  return <div className={`flex-1 flex min-h-0 ${className}`}>{children}</div>
}

interface EditorColumnProps {
  children: React.ReactNode
  className?: string
  flex?: string
}

export function EditorColumn({
  children,
  className = '',
  flex = 'flex-[4]'
}: EditorColumnProps): React.JSX.Element {
  return <div className={`${flex} flex flex-col min-h-0 relative ${className}`}>{children}</div>
}
