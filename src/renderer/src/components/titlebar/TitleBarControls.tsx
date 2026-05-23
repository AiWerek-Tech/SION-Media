import React, { useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { logger } from '../../utils/logger'

export function TitleBarControls(): React.JSX.Element {
  const isWindows = navigator.userAgent.toLowerCase().includes('windows')
  const { isMaximized, setMaximized } = useAppStore()

  useEffect(() => {
    if (isWindows) return
    window.api.window
      .isMaximized()
      .then(setMaximized)
      .catch((err) => logger.error('isMaximized failed:', err))
    return window.api.window.onMaximizedChanged(setMaximized)
  }, [isWindows, setMaximized])

  if (isWindows) return <></>

  return (
    <div className="window-controls">
      <button
        className="window-control-btn"
        onClick={() => window.api.window.minimize()}
        title="Minimize"
        aria-label="Minimize window"
      >
        <Minus size={14} />
      </button>
      <button
        className="window-control-btn"
        onClick={() => window.api.window.maximize()}
        title={isMaximized ? 'Restore' : 'Maximize'}
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
      >
        {isMaximized ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
      </button>
      <button
        className="window-control-btn close"
        onClick={() => window.api.window.close()}
        title="Close"
        aria-label="Close window"
      >
        <X size={15} />
      </button>
    </div>
  )
}
