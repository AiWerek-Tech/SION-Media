import React, { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  FileText,
  Database,
  Search,
  AlertCircle
} from 'lucide-react'

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

interface ActivityItemProps {
  line: ScraperLogLine
}

function getActivityIcon(line: ScraperLogLine): React.ReactNode {
  const iconClass = 'w-4 h-4'

  // Phase-based icons
  if (line.phase === 'FETCH') return <Search className={iconClass} />
  if (line.phase === 'PARSE') return <FileText className={iconClass} />
  if (line.phase === 'NORMALIZE') return <Loader2 className={`${iconClass} animate-spin`} />
  if (line.phase === 'DB') return <Database className={iconClass} />
  if (line.phase === 'FTS') return <Search className={iconClass} />

  // Level-based icons
  if (line.level === 'ERROR') return <XCircle className={iconClass} />
  if (line.level === 'WARN') return <AlertTriangle className={iconClass} />
  if (line.level === 'INFO') {
    if (line.message.includes('success') || line.message.includes('completed')) {
      return <CheckCircle className={iconClass} />
    }
    if (line.message.includes('conflict') || line.message.includes('duplicate')) {
      return <AlertCircle className={iconClass} />
    }
    return <Info className={iconClass} />
  }

  return <Info className={iconClass} />
}

function getActivityVariant(line: ScraperLogLine): string {
  if (line.level === 'ERROR') return 'activity-item--error'
  if (line.level === 'WARN') return 'activity-item--warning'
  if (line.message.includes('success') || line.message.includes('completed')) {
    return 'activity-item--success'
  }
  if (line.message.includes('conflict') || line.message.includes('duplicate')) {
    return 'activity-item--warning'
  }
  return 'activity-item--info'
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function ActivityItem({ line }: ActivityItemProps): React.JSX.Element {
  return (
    <div className={`activity-item ${getActivityVariant(line)}`}>
      <span className="activity-item__timestamp">{formatTimestamp(line.ts)}</span>
      <span className="activity-item__icon">{getActivityIcon(line)}</span>
      <span className="activity-item__message">{line.message}</span>
      {line.songNumber && <span className="activity-item__detail">#{line.songNumber}</span>}
    </div>
  )
}

export function ActivityStream(props: { lines: ScraperLogLine[] }): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => props.lines.slice(-2000), [props.lines])

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20
  })

  return (
    <div className="h-full min-h-0 card-modern flex flex-col">
      <div className="card-modern__header">
        <div>
          <div className="card-modern__title">Activity Stream</div>
          <div className="card-modern__subtitle">Realtime Events</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-badge status-badge--unknown">
            <span className="status-badge__dot"></span>
            {items.length} events
          </span>
        </div>
      </div>

      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">
              <FileText className="w-6 h-6" />
            </div>
            <div className="empty-state__title">No activity yet</div>
            <div className="empty-state__description">Start a dry run to see realtime events</div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((v) => {
              const line = items[v.index]
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
                >
                  <ActivityItem line={line} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
