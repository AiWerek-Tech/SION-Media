import React, { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

type ScraperLogLevel = 'INFO' | 'WARN' | 'ERROR'

type ScraperPhase = 'FETCH' | 'PARSE' | 'NORMALIZE' | 'DB' | 'FTS'

interface ScraperLogLine {
  ts: number
  level: ScraperLogLevel
  phase?: ScraperPhase
  message: string
  providerId?: string
  songNumber?: string
}

function levelColor(level: ScraperLogLevel): string {
  if (level === 'ERROR') return 'text-red-300'
  if (level === 'WARN') return 'text-yellow-300'
  return 'text-green-200'
}

export function LiveTaskConsole(props: { lines: ScraperLogLine[] }): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => props.lines.slice(-2000), [props.lines])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 18,
    overscan: 20
  })

  return (
    <div className="h-full min-h-0 rounded border border-border-subtle bg-black/30 flex flex-col">
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-sm font-semibold">Live Task Console</div>
        <div className="text-xs text-text-muted">Realtime logs (virtualized)</div>
      </div>

      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto font-mono text-xs">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((v) => {
            const line = items[v.index]
            const ts = new Date(line.ts).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })
            return (
              <div
                key={v.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${v.start}px)`
                }}
                className={`px-3 whitespace-pre ${levelColor(line.level)}`}
              >
                <span className="text-text-muted">[{ts}] </span>
                <span className="text-text-muted">[{line.level}]</span> {line.message}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
