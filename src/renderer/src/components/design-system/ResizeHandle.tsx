import React from 'react'
import { PanelResizeHandle } from 'react-resizable-panels'
import { GripVertical, GripHorizontal } from 'lucide-react'

type ResizeDirection = 'vertical' | 'horizontal'

interface ResizeHandleProps {
  direction?: ResizeDirection
  className?: string
  /** Show grip icon (default: true) */
  showGrip?: boolean
  /** Compact mode - minimal visual footprint */
  compact?: boolean
}

/**
 * Design-system-first resize handle for react-resizable-panels
 *
 * Features:
 * - Invisible idle state (1px separator)
 * - Subtle hover glow
 * - Clear active drag state
 * - Keyboard accessible
 * - Reduced motion support
 */
export function ResizeHandle({
  direction = 'vertical',
  className = '',
  showGrip = true,
  compact = false
}: ResizeHandleProps): React.JSX.Element {
  const isVertical = direction === 'vertical'

  return (
    <PanelResizeHandle
      className={[
        'resize-handle',
        isVertical ? 'resize-handle--vertical' : 'resize-handle--horizontal',
        compact && 'resize-handle--compact',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showGrip && (
        <div className="resize-handle__grip">
          {isVertical ? (
            <GripVertical size={12} className="resize-handle__icon" />
          ) : (
            <GripHorizontal size={12} className="resize-handle__icon" />
          )}
        </div>
      )}
    </PanelResizeHandle>
  )
}
