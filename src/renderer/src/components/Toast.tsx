import React from 'react'
import { CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'

export function Toast(): React.JSX.Element | null {
  const { toast } = useAppStore()

  if (!toast) return null

  const icons = {
    info: <Info size={14} className="text-accent" />,
    success: <CheckCircle2 size={14} className="text-live" />,
    error: <AlertCircle size={14} className="text-danger" />
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-fadeIn">
      <div className="glass-panel px-4 py-2.5 rounded-full flex items-center gap-2 border border-border shadow-lg">
        {icons[toast.type]}
        <span className="text-xs font-medium">{toast.message}</span>
      </div>
    </div>
  )
}
