import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Terminal,
  X,
  CheckCircle2,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Ban,
  Monitor,
  Tv,
  Zap,
  Heart
} from 'lucide-react'
import type {
  RuntimeEvent,
  RuntimeEventFilter,
  CommandSource
} from '@renderer/utils/runtimeCommandBus'
import {
  subscribeToRuntimeEvents,
  getRecentRuntimeEvents,
  clearRuntimeEvents
} from '@renderer/utils/runtimeCommandBus'
import { useHealthStore } from '@renderer/store/useHealthStore'
import { getInputAdapterHealth } from '@renderer/utils/runtimeInputAdapter'
import { VirtualAdapterSimulator } from './VirtualAdapterPanel'
import {
  queryTraces,
  getTraceStats,
  eventLogger,
  type EventTrace,
  type TraceQuery,
  type TraceStats
} from '@core/projection'

interface RuntimeInspectorProps {
  isOpen: boolean
  onClose: () => void
}

function TabButton({
  tab,
  activeTab,
  onClick,
  hidden
}: {
  tab: InspectorTab
  activeTab: InspectorTab
  onClick: () => void
  hidden?: boolean
}): React.JSX.Element {
  if (hidden) return <></>

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        activeTab === tab
          ? 'bg-white/10 text-white shadow-sm'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
      }`}
    >
      {tab}
    </button>
  )
}

function InputsTab(): React.JSX.Element {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const adapterHealth = useMemo(() => {
    void tick
    return getInputAdapterHealth()
  }, [tick])

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="text-label mb-3">Input Adapters</div>

      {adapterHealth.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">No adapters registered</div>
          <div className="empty-state__description">Connect input devices to begin</div>
        </div>
      ) : (
        <div className="space-y-2">
          {adapterHealth.map((h) => (
            <div key={h.adapterId} className="card-modern p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-data font-mono">{h.adapterId}</span>
                <span
                  className={`status-badge ${h.connected ? 'status-badge--ok' : 'status-badge--broken'}`}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  <span className="status-badge__dot"></span>
                  {h.connected ? 'LIVE' : 'OFF'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="command-stat">
                  <span className="command-stat__value">{h.commandsEmitted}</span>
                  <span className="command-stat__label">Emitted</span>
                </div>
                <div className="command-stat">
                  <span className="command-stat__value text-amber-400">{h.commandsDropped}</span>
                  <span className="command-stat__label">Dropped</span>
                </div>
                <div className="command-stat">
                  <span className="command-stat__value">{h.reconnectCount}</span>
                  <span className="command-stat__label">Reconnects</span>
                </div>
              </div>
              {h.lastError && (
                <div className="mt-2 text-xs text-rose-400 font-mono">{h.lastError}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface EventMetrics {
  total: number
  success: number
  blocked: number
  error: number
  avgDuration: number
  // Enhanced metrics
  commandsPerSec: number
  blockedRatio: number
  errorRatio: number
  throughput: number
  lastError: string | null
  lastErrorTime: number | null
}

interface HealthStatus {
  runtimeHealthy: boolean
  latency: number
  blockedRatio: number
  projectionConnected: boolean
  confidenceConnected: boolean
}

type InspectorTab = 'EVENTS' | 'HEALTH' | 'INPUTS' | 'FSM' | 'SIMULATOR'

// Status badge component - using design system
function StatusBadge({ status }: { status: RuntimeEvent['status'] }): React.JSX.Element {
  const config = {
    SUCCESS: { icon: CheckCircle2, variant: 'status-badge--ok', label: 'SUCCESS' },
    BLOCKED: { icon: Ban, variant: 'status-badge--warning', label: 'BLOCKED' },
    ERROR: { icon: AlertCircle, variant: 'status-badge--broken', label: 'ERROR' }
  }
  const { icon: Icon, variant, label } = config[status]

  return (
    <span className={`status-badge ${variant}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
      <Icon size={10} />
      {label}
    </span>
  )
}

// Source badge component - semantic colors
function SourceBadge({ source }: { source: CommandSource }): React.JSX.Element {
  const colors: Record<CommandSource, string> = {
    KEYBOARD: 'text-purple-400 bg-purple-500/15',
    UI_BUTTON: 'text-blue-400 bg-blue-500/15',
    QUICK_JUMP: 'text-cyan-400 bg-cyan-500/15',
    COMMAND_PALETTE: 'text-indigo-400 bg-indigo-500/15',
    MIDI: 'text-orange-400 bg-orange-500/15',
    STREAM_DECK: 'text-amber-400 bg-amber-500/15',
    REMOTE_APP: 'text-teal-400 bg-teal-500/15',
    WEBSOCKET: 'text-emerald-400 bg-emerald-500/15',
    AUTOMATION: 'text-rose-400 bg-rose-500/15',
    MACRO: 'text-pink-400 bg-pink-500/15'
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${colors[source] || 'text-zinc-400 bg-zinc-500/15'}`}
    >
      {source}
    </span>
  )
}

// Event row component - activity-item style
function EventRow({
  event,
  isSelected,
  onClick
}: {
  event: RuntimeEvent
  isSelected: boolean
  onClick: () => void
}): React.JSX.Element {
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const variantClass =
    event.status === 'SUCCESS'
      ? 'activity-item--success'
      : event.status === 'ERROR'
        ? 'activity-item--error'
        : 'activity-item--warning'

  return (
    <button
      onClick={onClick}
      className={`activity-item ${variantClass} w-full ${isSelected ? 'bg-white/10' : ''}`}
    >
      <span className="activity-item__timestamp">{time}</span>
      <SourceBadge source={event.command.source} />
      <span className="activity-item__message truncate flex-1">{event.command.type}</span>
      {event.durationMs !== undefined && (
        <span className="activity-item__detail">{event.durationMs.toFixed(1)}ms</span>
      )}
    </button>
  )
}

// Event details drawer
function EventDetails({ event }: { event: RuntimeEvent | null }): React.JSX.Element {
  if (!event)
    return (
      <div className="empty-state h-full">
        <div className="empty-state__title">No event selected</div>
        <div className="empty-state__description">Click an event to inspect</div>
      </div>
    )

  return (
    <div className="p-4 space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-zinc-500">ID:</span>
          <span className="text-zinc-300 ml-2 truncate block">{event.id.slice(0, 16)}...</span>
        </div>
        <div>
          <span className="text-zinc-500">Status:</span>
          <StatusBadge status={event.status} />
        </div>
        <div>
          <span className="text-zinc-500">Duration:</span>
          <span className="text-amber-400 ml-2">{event.durationMs?.toFixed(2) ?? '-'}ms</span>
        </div>
        <div>
          <span className="text-zinc-500">Time:</span>
          <span className="text-zinc-300 ml-2">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div>
        <span className="text-label block mb-2">Command</span>
        <div className="card-modern p-3 space-y-1">
          <div>
            <span className="text-cyan-400">type:</span>{' '}
            <span className="text-zinc-300">{event.command.type}</span>
          </div>
          <div>
            <span className="text-cyan-400">source:</span>{' '}
            <span className="text-zinc-300">{event.command.source}</span>
          </div>
          {event.command.correlationId && (
            <div>
              <span className="text-cyan-400">correlationId:</span>{' '}
              <span className="text-zinc-300">{event.command.correlationId}</span>
            </div>
          )}
          {event.command.payload && Object.keys(event.command.payload).length > 0 && (
            <div>
              <span className="text-cyan-400">payload:</span>
              <pre className="text-zinc-400 mt-1 text-[10px] overflow-auto">
                {JSON.stringify(event.command.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {event.error && (
        <div>
          <span className="text-rose-400 block mb-1">Error:</span>
          <div className="card-modern p-2 text-rose-400 text-[11px]">{event.error}</div>
        </div>
      )}

      {event.result !== undefined && (
        <div>
          <span className="text-zinc-500 block mb-1">Result:</span>
          <pre className="card-modern p-2 text-zinc-400 text-[10px] overflow-auto">
            {JSON.stringify(event.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Health strip - Runtime health indicators with command-stat style
function HealthStrip({ health }: { health: HealthStatus }): React.JSX.Element {
  return (
    <div className="command-header" style={{ padding: '8px 16px' }}>
      {/* Runtime Health */}
      <div className="command-stat">
        <Heart size={12} className={health.runtimeHealthy ? 'text-emerald-400' : 'text-rose-400'} />
        <span className="command-stat__value" style={{ fontSize: '11px' }}>
          {health.runtimeHealthy ? 'HEALTHY' : 'DEGRADED'}
        </span>
      </div>

      {/* Latency */}
      <div className="command-stat">
        <Zap size={12} className="text-amber-400" />
        <span className="command-stat__value" style={{ fontSize: '11px' }}>
          {health.latency.toFixed(1)}ms
        </span>
        <span className="command-stat__label">latency</span>
      </div>

      {/* Blocked Ratio */}
      <div className="command-stat">
        <Ban
          size={12}
          className={health.blockedRatio < 0.05 ? 'text-zinc-400' : 'text-amber-400'}
        />
        <span className="command-stat__value" style={{ fontSize: '11px' }}>
          {(health.blockedRatio * 100).toFixed(1)}%
        </span>
        <span className="command-stat__label">blocked</span>
      </div>

      {/* Projection */}
      <div className="command-stat">
        <Monitor
          size={12}
          className={health.projectionConnected ? 'text-emerald-400' : 'text-zinc-500'}
        />
        <span className="command-stat__value" style={{ fontSize: '11px' }}>
          {health.projectionConnected ? 'LIVE' : 'OFF'}
        </span>
        <span className="command-stat__label">projection</span>
      </div>

      {/* Confidence Monitor */}
      <div className="command-stat">
        <Tv size={12} className={health.confidenceConnected ? 'text-cyan-400' : 'text-zinc-500'} />
        <span className="command-stat__value" style={{ fontSize: '11px' }}>
          {health.confidenceConnected ? 'LIVE' : 'OFF'}
        </span>
        <span className="command-stat__label">stage</span>
      </div>
    </div>
  )
}

// Metrics header - command-stat grid
function MetricsHeader({ metrics }: { metrics: EventMetrics }): React.JSX.Element {
  return (
    <div className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-white/5">
      <div className="command-stat">
        <span className="command-stat__value">{metrics.total}</span>
        <span className="command-stat__label">Total</span>
      </div>
      <div className="command-stat">
        <span className="command-stat__value text-amber-400">
          {metrics.commandsPerSec.toFixed(1)}
        </span>
        <span className="command-stat__label">Rate/s</span>
      </div>
      <div className="command-stat">
        <span className="command-stat__value text-emerald-400">{metrics.success}</span>
        <span className="command-stat__label">Success</span>
      </div>
      <div className="command-stat">
        <span className="command-stat__value text-amber-400">{metrics.blocked}</span>
        <span className="command-stat__label">Blocked</span>
      </div>
      <div className="command-stat">
        <span className="command-stat__value text-rose-400">{metrics.error}</span>
        <span className="command-stat__label">Errors</span>
      </div>
      <div className="command-stat">
        <span className="command-stat__value">{metrics.avgDuration.toFixed(1)}ms</span>
        <span className="command-stat__label">Avg</span>
      </div>
    </div>
  )
}

// Filter bar
function FilterBar({
  filters,
  onFilterChange
}: {
  filters: RuntimeEventFilter
  onFilterChange: (filters: RuntimeEventFilter) => void
}): React.JSX.Element {
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)

  const sources: CommandSource[] = [
    'KEYBOARD',
    'UI_BUTTON',
    'QUICK_JUMP',
    'COMMAND_PALETTE',
    'MIDI',
    'STREAM_DECK',
    'REMOTE_APP'
  ]

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
      <Filter size={14} className="text-zinc-500" />

      {/* Status filters */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFilterChange({ ...filters, success: undefined })}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filters.success === undefined
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, success: true })}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filters.success === true
              ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Success
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, success: false })}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            filters.success === false
              ? 'bg-amber-500/15 text-amber-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Blocked
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Source filter dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSourceDropdown(!showSourceDropdown)}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          Source
          {showSourceDropdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <AnimatePresence>
          {showSourceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 mt-1 card-modern p-1 z-50 min-w-[160px]"
            >
              <button
                onClick={() => {
                  onFilterChange({ ...filters, sources: undefined })
                  setShowSourceDropdown(false)
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
              >
                All Sources
              </button>
              {sources.map((source) => (
                <button
                  key={source}
                  onClick={() => {
                    onFilterChange({ ...filters, sources: [source] })
                    setShowSourceDropdown(false)
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5 rounded-lg transition-colors"
                >
                  {source}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear button */}
      <button
        onClick={() => clearRuntimeEvents()}
        className="ml-auto btn-premium btn-premium-ghost text-xs"
      >
        Clear
      </button>
    </div>
  )
}

function FsmTab(): React.JSX.Element {
  const [traces, setTraces] = useState<EventTrace[]>([])
  const [stats, setStats] = useState<TraceStats | null>(null)
  const [query, setQuery] = useState<TraceQuery>({})
  const [filterText, setFilterText] = useState('')

  const loadData = useCallback((): void => {
    try {
      const allTraces = queryTraces(query)
      const filteredTraces = filterText
        ? allTraces.filter((trace) =>
            JSON.stringify(trace).toLowerCase().includes(filterText.toLowerCase())
          )
        : allTraces

      setTraces(filteredTraces)
      setStats(getTraceStats())
    } catch (error) {
      console.error('Failed to load trace data:', error)
    }
  }, [query, filterText])

  useEffect(() => {
    const initialLoad = window.setTimeout(loadData, 0)
    const interval = window.setInterval(loadData, 1000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [loadData])

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getTraceIcon = (type: EventTrace['type']): string => {
    switch (type) {
      case 'COMMAND':
        return '📝'
      case 'TRANSITION':
        return '🔄'
      case 'EFFECT':
        return '⚡'
      case 'ERROR':
        return '❌'
      default:
        return '?'
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-xs">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <Filter size={14} className="text-zinc-500" />
        <input
          type="text"
          placeholder="Filter FSM traces..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white"
        />
        <select
          value={query.type || ''}
          onChange={(e) =>
            setQuery({ ...query, type: (e.target.value as EventTrace['type']) || undefined })
          }
          className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white"
        >
          <option value="">All Types</option>
          <option value="COMMAND">Commands</option>
          <option value="TRANSITION">Transitions</option>
          <option value="EFFECT">Effects</option>
          <option value="ERROR">Errors</option>
        </select>
        <button
          onClick={() => {
            eventLogger.clear()
            loadData()
          }}
          className="btn-premium btn-premium-ghost text-xs"
        >
          Clear FSM
        </button>
      </div>

      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-white/5 text-zinc-400 bg-black/20">
          <span>
            Total: <strong className="text-zinc-200">{stats.totalTraces}</strong>
          </span>
          <span>
            Errors: <strong className="text-rose-400">{stats.errorCount}</strong>
          </span>
          <span>
            Avg Duration:{' '}
            <strong className="text-zinc-200">{stats.averageDuration.toFixed(1)}ms</strong>
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-white/5">
          {traces.map((trace) => (
            <div key={trace.id} className="px-4 py-2 hover:bg-white/5 flex gap-3 items-start">
              <span className="text-base leading-none">{getTraceIcon(trace.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-300">{trace.type}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-400 text-[10px]">
                    {trace.source}
                  </span>
                  {trace.duration && (
                    <span className="text-zinc-500">{trace.duration.toFixed(1)}ms</span>
                  )}
                  <span className="text-zinc-500 ml-auto">{formatTimestamp(trace.timestamp)}</span>
                </div>
                {trace.command && (
                  <div className="text-zinc-400 mt-0.5">
                    <strong>Cmd:</strong> {trace.command.type}
                  </div>
                )}
                {trace.transition && (
                  <div className="text-zinc-400 mt-0.5">
                    <strong>Trans:</strong> {trace.transition.fromState} →{' '}
                    {trace.transition.toState}
                    <span className="text-cyan-400 ml-2">({trace.transition.event})</span>
                  </div>
                )}
                {trace.error && (
                  <div className="text-rose-400 mt-0.5">
                    <strong>Err:</strong> {trace.error.message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function RuntimeInspector({ isOpen, onClose }: RuntimeInspectorProps): React.JSX.Element {
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<RuntimeEvent | null>(null)
  const [filters, setFilters] = useState<RuntimeEventFilter>({})
  const [autoScroll, setAutoScroll] = useState(true)
  const [activeTab, setActiveTab] = useState<InspectorTab>('EVENTS')
  const [nowMs, setNowMs] = useState<number>(() => Date.now())
  const listRef = useRef<HTMLDivElement>(null)

  // Subscribe to runtime events
  useEffect(() => {
    if (!isOpen) return

    // Load initial events
    setTimeout(() => {
      setEvents(getRecentRuntimeEvents(200))
    }, 0)

    const clock = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    // Subscribe to new events
    const unsubscribe = subscribeToRuntimeEvents((event) => {
      setEvents((prev) => [...prev.slice(-199), event])
    })

    return () => {
      clearInterval(clock)
      unsubscribe()
    }
  }, [isOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [events, autoScroll])

  // Calculate enhanced metrics with time window
  const metrics = useMemo<EventMetrics>(() => {
    const total = events.length
    const success = events.filter((e) => e.status === 'SUCCESS').length
    const blocked = events.filter((e) => e.status === 'BLOCKED').length
    const error = events.filter((e) => e.status === 'ERROR').length
    const avgDuration =
      total > 0 ? events.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) / total : 0

    // Calculate commands per second (last 60 seconds window)
    const windowMs = 60000
    const recentEvents = events.filter((e) => nowMs - e.timestamp < windowMs)
    const commandsPerSec = recentEvents.length / 60

    // Calculate ratios
    const blockedRatio = total > 0 ? blocked / total : 0
    const errorRatio = total > 0 ? error / total : 0

    // Throughput (successful commands per second)
    const recentSuccess = recentEvents.filter((e) => e.status === 'SUCCESS').length
    const throughput = recentSuccess / 60

    // Last error info
    const lastErrorEvent = [...events].reverse().find((e) => e.status === 'ERROR')
    const lastError = lastErrorEvent?.error ?? null
    const lastErrorTime = lastErrorEvent?.timestamp ?? null

    return {
      total,
      success,
      blocked,
      error,
      avgDuration,
      commandsPerSec,
      blockedRatio,
      errorRatio,
      throughput,
      lastError,
      lastErrorTime
    }
  }, [events, nowMs])

  const endpoints = useHealthStore((s) => s.endpoints)

  // Calculate health status
  const health = useMemo<HealthStatus>(() => {
    const runtimeHealthy =
      metrics.blockedRatio < 0.2 && metrics.errorRatio < 0.1 && metrics.avgDuration < 50
    const projEndpoint = endpoints.get('PROJECTION_WINDOW')
    const stageEndpoint = endpoints.get('STAGE_DISPLAY')
    const projectionConnected = projEndpoint?.connected ?? false
    const confidenceConnected = stageEndpoint?.connected ?? false

    return {
      runtimeHealthy,
      latency: metrics.avgDuration,
      blockedRatio: metrics.blockedRatio,
      projectionConnected,
      confidenceConnected
    }
  }, [metrics, endpoints])

  // Filter events
  const filteredEvents = events.filter((event) => {
    if (filters.success !== undefined && event.success !== filters.success) return false
    if (filters.sources && !filters.sources.includes(event.command.source)) return false
    if (filters.types && !filters.types.includes(event.command.type)) return false
    return true
  })

  // Reverse for display (newest first)
  const displayEvents = [...filteredEvents].reverse()

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50
    setAutoScroll(isAtBottom)
  }, [])

  if (!isOpen) return <></>

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 320, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="card-modern flex flex-col overflow-hidden"
      style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}
    >
      {/* Header */}
      <div className="command-header" style={{ padding: '8px 16px' }}>
        <div className="command-header__left">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-sm font-semibold">Runtime Inspector</span>
          <span
            className="status-badge status-badge--unknown"
            style={{ padding: '2px 8px', fontSize: '10px' }}
          >
            <span className="status-badge__dot"></span>
            {events.length} events
          </span>
        </div>
        <div className="command-header__right">
          <button onClick={onClose} className="btn-premium btn-premium-ghost btn-premium-icon">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
        <TabButton tab="EVENTS" activeTab={activeTab} onClick={() => setActiveTab('EVENTS')} />
        <TabButton tab="FSM" activeTab={activeTab} onClick={() => setActiveTab('FSM')} />
        <TabButton tab="HEALTH" activeTab={activeTab} onClick={() => setActiveTab('HEALTH')} />
        <TabButton tab="INPUTS" activeTab={activeTab} onClick={() => setActiveTab('INPUTS')} />
        <TabButton
          tab="SIMULATOR"
          activeTab={activeTab}
          onClick={() => setActiveTab('SIMULATOR')}
          hidden={!import.meta.env.DEV}
        />
      </div>

      {/* Tab content */}
      {activeTab === 'EVENTS' && (
        <>
          <FilterBar filters={filters} onFilterChange={setFilters} />

          <div className="flex-1 flex overflow-hidden">
            {/* Event list */}
            <div
              ref={listRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overflow-x-hidden"
            >
              {displayEvents.length === 0 ? (
                <div className="empty-state h-full">
                  <div className="empty-state__title">No events</div>
                  <div className="empty-state__description">Trigger commands to see activity</div>
                </div>
              ) : (
                displayEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isSelected={selectedEvent?.id === event.id}
                    onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  />
                ))
              )}
            </div>

            {/* Event details drawer */}
            <div className="w-72 border-l border-white/5 overflow-y-auto bg-black/20">
              <div className="px-4 py-2 border-b border-white/5 text-label">Event Details</div>
              <EventDetails event={selectedEvent} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'HEALTH' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <HealthStrip health={health} />
          <MetricsHeader metrics={metrics} />

          <div className="flex-1 overflow-auto p-4">
            <div className="card-modern p-4">
              <div className="text-label mb-2">Diagnostics Ready</div>
              <div className="text-xs text-zinc-400 space-y-1">
                <div>• Adapter heartbeat monitoring</div>
                <div>• IPC round-trip time measurement</div>
                <div>• Memory pressure tracking</div>
                <div>• Event loop lag detection</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INPUTS' && <InputsTab />}

      {activeTab === 'FSM' && <FsmTab />}

      {activeTab === 'SIMULATOR' && import.meta.env.DEV && (
        <div className="flex-1 overflow-hidden p-4">
          <div className="text-label mb-3">Virtual Input Simulator</div>
          <VirtualAdapterSimulator />
        </div>
      )}
    </motion.div>
  )
}
