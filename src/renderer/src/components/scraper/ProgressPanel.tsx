import React, { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { OrchestrationTimelineCompact } from './OrchestrationTimeline'

interface ScraperSongProgress {
  number: string
  status: 'PENDING' | 'FETCHING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
  attempts: number
  error?: string
  sourceUrl?: string
  title?: string
}

interface ScraperProgressPayload {
  taskId: string
  providerId: string
  state: 'RUNNING' | 'ABORTED' | 'COMPLETED' | 'IDLE'
  total: number
  processed: number
  success: number
  failed: number
  skipped: number
  retries: number
  songsPerSec: number
  etaSec: number | null
}

function pct(processed: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((processed / total) * 100)))
}

function getStateBadge(state: string): React.JSX.Element {
  switch (state) {
    case 'RUNNING':
      return (
        <span className="status-badge status-badge--unknown">
          <span className="status-badge__dot"></span>
          RUNNING
        </span>
      )
    case 'COMPLETED':
      return (
        <span className="status-badge status-badge--ok">
          <span className="status-badge__dot"></span>
          COMPLETED
        </span>
      )
    case 'ABORTED':
      return (
        <span className="status-badge status-badge--broken">
          <span className="status-badge__dot"></span>
          ABORTED
        </span>
      )
    default:
      return (
        <span className="status-badge status-badge--unknown">
          <span className="status-badge__dot"></span>
          IDLE
        </span>
      )
  }
}

function getSongStatusBadge(status: string): React.JSX.Element {
  switch (status) {
    case 'SUCCESS':
      return (
        <span
          className="status-badge status-badge--ok"
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          ✓
        </span>
      )
    case 'FAILED':
      return (
        <span
          className="status-badge status-badge--broken"
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          ✗
        </span>
      )
    case 'FETCHING':
      return (
        <span
          className="status-badge status-badge--unknown"
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          …
        </span>
      )
    default:
      return (
        <span
          className="status-badge status-badge--unknown"
          style={{ padding: '2px 6px', fontSize: '10px' }}
        >
          –
        </span>
      )
  }
}

export function ProgressPanel(props: {
  progress: ScraperProgressPayload | null
  rows: ScraperSongProgress[]
  hasConflicts?: boolean
}): React.JSX.Element {
  const p = props.progress

  const percent = useMemo(() => pct(p?.processed ?? 0, p?.total ?? 0), [p?.processed, p?.total])

  // Determine orchestration step based on state
  const orchestrationStep = useMemo(() => {
    if (!p || p.state === 'IDLE') return 'IDLE'
    if (p.state === 'COMPLETED') return 'IMPORT'
    if (p.processed === 0) return 'FETCH'
    if (p.processed < p.total) return 'NORMALIZE'
    return 'VALIDATE'
  }, [p])

  return (
    <div className="h-full min-h-0 card-modern flex flex-col">
      <div className="card-modern__header">
        <div>
          <div className="card-modern__title">Progress Orchestration</div>
          <div className="card-modern__subtitle">
            {p ? `Task ${p.taskId.slice(0, 8)}` : 'No active task'}
          </div>
        </div>
        {p && getStateBadge(p.state)}
      </div>

      {/* Orchestration Timeline */}
      <div className="px-5 py-3 border-b border-white/5">
        <OrchestrationTimelineCompact
          currentStep={orchestrationStep}
          hasConflicts={props.hasConflicts}
        />
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-label">Overall Progress</span>
          <span className="text-data font-semibold">{percent}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="command-stat">
            <span className="command-stat__value">{p?.processed ?? 0}</span>
            <span className="command-stat__label">Done</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-emerald-400">{p?.success ?? 0}</span>
            <span className="command-stat__label">Success</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-rose-400">{p?.failed ?? 0}</span>
            <span className="command-stat__label">Failed</span>
          </div>
          <div className="command-stat">
            <span className="command-stat__value text-amber-400">{p?.songsPerSec ?? 0}</span>
            <span className="command-stat__label">Rate/s</span>
          </div>
        </div>
      </div>

      {/* Per-song Status */}
      <div className="flex-1 min-h-0 overflow-auto border-t border-white/5">
        <div className="px-5 py-2 text-label">Per-song Status</div>
        <div className="activity-stream px-2 pb-2">
          {props.rows.slice(-200).map((r) => (
            <div key={r.number} className="activity-item">
              <span className="activity-item__timestamp font-mono">#{r.number}</span>
              {getSongStatusBadge(r.status)}
              <span className="activity-item__message truncate">{r.title || r.error || '—'}</span>
            </div>
          ))}
          {props.rows.length === 0 && (
            <div className="empty-state py-8">
              <div className="empty-state__icon" style={{ width: '48px', height: '48px' }}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="empty-state__title" style={{ fontSize: '14px' }}>
                No song updates yet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
