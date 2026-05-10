import React, { useCallback, useEffect, useState } from 'react'
import { Panel, PanelGroup } from 'react-resizable-panels'
import { ResizeHandle } from './ResizeHandle'
import {
  usePanelLayoutStore,
  PANEL_CONSTRAINTS,
  type PanelLayoutSizes
} from '../../store/usePanelLayoutStore'

interface PanelConfig {
  id: string
  minSize?: number
  maxSize?: number
  defaultSize?: number
  className?: string
}

interface ResizablePanelsProps {
  /** Layout mode key for persistence */
  layoutKey: keyof PanelLayoutSizes
  /** Panel configurations (left to right, or top to bottom) */
  panels: [PanelConfig, PanelConfig]
  /** Direction of panels */
  direction?: 'horizontal' | 'vertical'
  /** Additional className for container */
  className?: string
  /** Auto-save debounce delay in ms (default: 200) */
  saveDelay?: number
  /** Called when panel sizes change */
  onSizesChange?: (sizes: [number, number]) => void
  /** Children to render inside each panel */
  children: [React.ReactNode, React.ReactNode]
}

/**
 * Design-system-first resizable panel group
 *
 * Features:
 * - Automatic persistence via layoutKey
 * - Min/max constraints from PANEL_CONSTRAINTS
 * - Debounced save to prevent excessive writes
 * - Smooth resize behavior
 * - Keyboard accessible
 */
export function ResizablePanels({
  layoutKey,
  panels,
  direction = 'horizontal',
  className = '',
  saveDelay = 200,
  onSizesChange,
  children
}: ResizablePanelsProps): React.JSX.Element {
  const { getSizes, setSizes } = usePanelLayoutStore()
  const [sizes, setLocalSizes] = useState<[number, number]>(getSizes(layoutKey))
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Get constraints for this layout
  const constraints = PANEL_CONSTRAINTS[layoutKey]

  // Handle size changes with debounce
  const handleSizesChange = useCallback(
    (newSizes: [number, number]) => {
      setLocalSizes(newSizes)
      onSizesChange?.(newSizes)

      // Debounce save
      if (saveTimer) clearTimeout(saveTimer)
      setSaveTimer(
        setTimeout(() => {
          setSizes(layoutKey, newSizes)
        }, saveDelay)
      )
    },
    [layoutKey, saveDelay, saveTimer, setSizes, onSizesChange]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer) clearTimeout(saveTimer)
    }
  }, [saveTimer])

  // Merge panel configs with constraints
  const panelConfigs: [PanelConfig, PanelConfig] = [
    {
      ...panels[0],
      minSize: panels[0].minSize ?? constraints.minSizes[0],
      maxSize: panels[0].maxSize ?? constraints.maxSizes[0],
      defaultSize: sizes[0]
    },
    {
      ...panels[1],
      minSize: panels[1].minSize ?? constraints.minSizes[1],
      maxSize: panels[1].maxSize ?? constraints.maxSizes[1],
      defaultSize: sizes[1]
    }
  ]

  return (
    <PanelGroup
      direction={direction}
      className={['resizable-panels', className].filter(Boolean).join(' ')}
      onLayout={(layoutSizes) => {
        handleSizesChange(layoutSizes as [number, number])
      }}
    >
      <Panel
        id={panelConfigs[0].id}
        minSize={panelConfigs[0].minSize}
        maxSize={panelConfigs[0].maxSize}
        defaultSize={panelConfigs[0].defaultSize}
        className={panelConfigs[0].className}
      >
        {children[0]}
      </Panel>

      <ResizeHandle direction={direction === 'horizontal' ? 'vertical' : 'horizontal'} />

      <Panel
        id={panelConfigs[1].id}
        minSize={panelConfigs[1].minSize}
        maxSize={panelConfigs[1].maxSize}
        defaultSize={panelConfigs[1].defaultSize}
        className={panelConfigs[1].className}
      >
        {children[1]}
      </Panel>
    </PanelGroup>
  )
}

/**
 * Simple two-panel resizable layout
 * Convenience wrapper for common use cases
 */
interface TwoPanelLayoutProps {
  layoutKey: keyof PanelLayoutSizes
  left: React.ReactNode
  right: React.ReactNode
  className?: string
  leftClassName?: string
  rightClassName?: string
}

export function TwoPanelLayout({
  layoutKey,
  left,
  right,
  className,
  leftClassName,
  rightClassName
}: TwoPanelLayoutProps): React.JSX.Element {
  return (
    <ResizablePanels
      layoutKey={layoutKey}
      panels={[
        { id: 'left', className: leftClassName },
        { id: 'right', className: rightClassName }
      ]}
      className={className}
    >
      {[left, right]}
    </ResizablePanels>
  )
}
