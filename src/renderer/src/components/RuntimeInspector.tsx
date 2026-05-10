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
  Clock,
  Activity,
  Ban,
  Monitor,
  Tv,
  Zap,
  Heart
} from 'lucide-react'
import type { RuntimeEvent, RuntimeEventFilter, CommandSource } from '../utils/runtimeCommandBus'
import {
  subscribeToRuntimeEvents,
  getRecentRuntimeEvents,
  clearRuntimeEvents
} from '../utils/runtimeCommandBus'
import { useHealthStore } from '../store/useHealthStore'

interface RuntimeInspectorProps {
  isOpen: boolean
  onClose: () => void
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

// Status badge component
function StatusBadge({ status }: { status: RuntimeEvent['status'] }): React.JSX.Element {
  const config = {
    SUCCESS: { icon: CheckCircle2, color: 'text-live', bg: 'bg-live/10', label: 'SUCCESS' },
    BLOCKED: { icon: Ban, color: 'text-warning', bg: 'bg-warning/10', label: 'BLOCKED' },
    ERROR: { icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/10', label: 'ERROR' }
  }
  const { icon: Icon, color, bg, label } = config[status]

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${bg} ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  )
}

// Source badge component
function SourceBadge({ source }: { source: CommandSource }): React.JSX.Element {
  const colors: Record<CommandSource, string> = {
    KEYBOARD: 'text-purple-400 bg-purple-500/10',
    UI_BUTTON: 'text-blue-400 bg-blue-500/10',
    QUICK_JUMP: 'text-cyan-400 bg-cyan-500/10',
    COMMAND_PALETTE: 'text-indigo-400 bg-indigo-500/10',
    MIDI: 'text-orange-400 bg-orange-500/10',
    STREAM_DECK: 'text-amber-400 bg-amber-500/10',
    REMOTE_APP: 'text-teal-400 bg-teal-500/10',
    WEBSOCKET: 'text-green-400 bg-green-500/10',
    AUTOMATION: 'text-rose-400 bg-rose-500/10',
    MACRO: 'text-pink-400 bg-pink-500/10'
  }

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${colors[source] || 'text-gray-400 bg-gray-500/10'}`}>
      {source}
    </span>
  )
}

// Event row component
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

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors ${
        isSelected ? 'bg-white/10' : ''
      }`}
    >
      <span className="text-[10px] font-mono text-gray-500 w-16 shrink-0">{time}</span>
      <SourceBadge source={event.command.source} />
      <span className="text-xs font-mono text-gray-300 truncate flex-1">{event.command.type}</span>
      <StatusBadge status={event.status} />
      {event.durationMs !== undefined && (
        <span className="text-[10px] font-mono text-gray-500 w-14 text-right">
          {event.durationMs.toFixed(1)}ms
        </span>
      )}
    </button>
  )
}

// Event details drawer
function EventDetails({ event }: { event: RuntimeEvent | null }): React.JSX.Element {
  if (!event) return <div className="p-4 text-xs text-gray-500">Select an event to view details</div>

  return (
    <div className="p-4 space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-gray-500">ID:</span>
          <span className="text-gray-300 ml-2 truncate block">{event.id}</span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>
          <StatusBadge status={event.status} />
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>
          <span className="text-gray-300 ml-2">{event.durationMs?.toFixed(2) ?? '-'}ms</span>
        </div>
        <div>
          <span className="text-gray-500">Timestamp:</span>
          <span className="text-gray-300 ml-2">{new Date(event.timestamp).toISOString()}</span>
        </div>
      </div>

      <div>
        <span className="text-gray-500 block mb-1">Command:</span>
        <div className="bg-black/30 rounded p-2 space-y-1">
          <div>
            <span className="text-purple-400">type:</span>{' '}
            <span className="text-gray-300">{event.command.type}</span>
          </div>
          <div>
            <span className="text-purple-400">source:</span>{' '}
            <span className="text-gray-300">{event.command.source}</span>
          </div>
          {event.command.correlationId && (
            <div>
              <span className="text-purple-400">correlationId:</span>{' '}
              <span className="text-gray-300">{event.command.correlationId}</span>
            </div>
          )}
          {event.command.payload && Object.keys(event.command.payload).length > 0 && (
            <div>
              <span className="text-purple-400">payload:</span>
              <pre className="text-gray-400 mt-1 text-[10px] overflow-auto">
                {JSON.stringify(event.command.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {event.error && (
        <div>
          <span className="text-danger block mb-1">Error:</span>
          <div className="bg-danger/10 rounded p-2 text-danger">{event.error}</div>
        </div>
      )}

      {event.result !== undefined && (
        <div>
          <span className="text-gray-500 block mb-1">Result:</span>
          <pre className="bg-black/30 rounded p-2 text-gray-400 text-[10px] overflow-auto">
            {JSON.stringify(event.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Health strip - Runtime health indicators
function HealthStrip({ health }: { health: HealthStatus }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-black/30 border-b border-border/30">
      {/* Runtime Health */}
      <div className="flex items-center gap-1.5">
        <Heart size={10} className={health.runtimeHealthy ? 'text-live' : 'text-danger'} />
        <span className="text-[10px] font-mono text-gray-400">Runtime</span>
        <span className={`text-[10px] font-mono ${health.runtimeHealthy ? 'text-live' : 'text-danger'}`}>
          {health.runtimeHealthy ? 'Healthy' : 'Degraded'}
        </span>
      </div>

      <div className="w-px h-3 bg-border/50" />

      {/* Latency */}
      <div className="flex items-center gap-1.5">
        <Zap size={10} className="text-accent" />
        <span className="text-[10px] font-mono text-gray-400">Latency:</span>
        <span className={`text-[10px] font-mono ${health.latency < 5 ? 'text-live' : health.latency < 20 ? 'text-warning' : 'text-danger'}`}>
          {health.latency.toFixed(2)}ms
        </span>
      </div>

      <div className="w-px h-3 bg-border/50" />

      {/* Blocked Ratio */}
      <div className="flex items-center gap-1.5">
        <Ban size={10} className={health.blockedRatio < 0.05 ? 'text-gray-400' : 'text-warning'} />
        <span className="text-[10px] font-mono text-gray-400">Blocked:</span>
        <span className={`text-[10px] font-mono ${health.blockedRatio < 0.05 ? 'text-gray-300' : health.blockedRatio < 0.15 ? 'text-warning' : 'text-danger'}`}>
          {(health.blockedRatio * 100).toFixed(1)}%
        </span>
      </div>

      <div className="w-px h-3 bg-border/50" />

      {/* Projection Connection */}
      <div className="flex items-center gap-1.5">
        <Monitor size={10} className={health.projectionConnected ? 'text-live' : 'text-gray-500'} />
        <span className="text-[10px] font-mono text-gray-400">Projection:</span>
        <span className={`text-[10px] font-mono ${health.projectionConnected ? 'text-live' : 'text-gray-500'}`}>
          {health.projectionConnected ? 'Connected' : 'None'}
        </span>
      </div>

      <div className="w-px h-3 bg-border/50" />

      {/* Confidence Monitor */}
      <div className="flex items-center gap-1.5">
        <Tv size={10} className={health.confidenceConnected ? 'text-live' : 'text-gray-500'} />
        <span className="text-[10px] font-mono text-gray-400">Confidence:</span>
        <span className={`text-[10px] font-mono ${health.confidenceConnected ? 'text-live' : 'text-gray-500'}`}>
          {health.confidenceConnected ? 'Connected' : 'None'}
        </span>
      </div>
    </div>
  )
}

// Metrics header
function MetricsHeader({ metrics }: { metrics: EventMetrics }): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-border/50 bg-black/20">
      <div className="flex items-center gap-1.5">
        <Activity size={12} className="text-gray-400" />
        <span className="text-[10px] text-gray-500">Total:</span>
        <span className="text-xs font-mono text-gray-300">{metrics.total}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Zap size={12} className="text-accent" />
        <span className="text-[10px] text-gray-500">Rate:</span>
        <span className="text-xs font-mono text-accent">{metrics.commandsPerSec.toFixed(1)}/s</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={12} className="text-live" />
        <span className="text-[10px] text-gray-500">Success:</span>
        <span className="text-xs font-mono text-live">{metrics.success}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Ban size={12} className="text-warning" />
        <span className="text-[10px] text-gray-500">Blocked:</span>
        <span className="text-xs font-mono text-warning">{metrics.blocked}</span>
        <span className="text-[10px] font-mono text-gray-500">({(metrics.blockedRatio * 100).toFixed(1)}%)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <AlertCircle size={12} className="text-danger" />
        <span className="text-[10px] text-gray-500">Errors:</span>
        <span className="text-xs font-mono text-danger">{metrics.error}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock size={12} className="text-gray-400" />
        <span className="text-[10px] text-gray-500">Avg:</span>
        <span className="text-xs font-mono text-gray-300">{metrics.avgDuration.toFixed(1)}ms</span>
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
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
      <Filter size={12} className="text-gray-400" />

      {/* Status filters */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFilterChange({ ...filters, success: undefined })}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
            filters.success === undefined ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, success: true })}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
            filters.success === true ? 'bg-live/20 text-live' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          SUCCESS
        </button>
        <button
          onClick={() => onFilterChange({ ...filters, success: false })}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
            filters.success === false ? 'bg-warning/20 text-warning' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          BLOCKED
        </button>
      </div>

      <div className="w-px h-4 bg-border/50" />

      {/* Source filter dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSourceDropdown(!showSourceDropdown)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-gray-500 hover:text-gray-300 transition-colors"
        >
          SOURCE
          {showSourceDropdown ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        <AnimatePresence>
          {showSourceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 mt-1 bg-surface-elevated border border-border rounded shadow-lg z-50 min-w-[140px]"
            >
              <button
                onClick={() => {
                  onFilterChange({ ...filters, sources: undefined })
                  setShowSourceDropdown(false)
                }}
                className="w-full px-3 py-1.5 text-left text-[10px] font-mono text-gray-300 hover:bg-white/5"
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
                  className="w-full px-3 py-1.5 text-left text-[10px] font-mono text-gray-300 hover:bg-white/5"
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
        className="ml-auto px-2 py-1 rounded text-[10px] font-mono text-gray-500 hover:text-danger transition-colors"
      >
        CLEAR LOG
      </button>
    </div>
  )
}

export function RuntimeInspector({ isOpen, onClose }: RuntimeInspectorProps): React.JSX.Element {
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<RuntimeEvent | null>(null)
  const [filters, setFilters] = useState<RuntimeEventFilter>({})
  const [autoScroll, setAutoScroll] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  // Subscribe to runtime events
  useEffect(() => {
    if (!isOpen) return

    // Load initial events
    setEvents(getRecentRuntimeEvents(200))

    // Subscribe to new events
    const unsubscribe = subscribeToRuntimeEvents((event) => {
      setEvents((prev) => [...prev.slice(-199), event])
    })

    return unsubscribe
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
    const avgDuration = total > 0 ? events.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) / total : 0

    // Calculate commands per second (last 60 seconds window)
    const now = Date.now()
    const windowMs = 60000
    const recentEvents = events.filter((e) => now - e.timestamp < windowMs)
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
  }, [events])

  const endpoints = useHealthStore((s) => s.endpoints)

  // Calculate health status
  const health = useMemo<HealthStatus>(() => {
    const runtimeHealthy = metrics.blockedRatio < 0.2 && metrics.errorRatio < 0.1 && metrics.avgDuration < 50
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
      animate={{ height: 280, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-border bg-surface-elevated flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-black/20">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-accent" />
          <span className="text-xs font-medium">Runtime Inspector</span>
          <span className="text-[10px] text-gray-500 font-mono">({events.length} events)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* Health Strip */}
      <HealthStrip health={health} />

      {/* Metrics */}
      <MetricsHeader metrics={metrics} />

      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Event list */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {displayEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500">
              No events match current filters
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
        <div className="w-72 border-l border-border/50 overflow-y-auto bg-black/10">
          <div className="px-4 py-2 border-b border-border/50 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            Event Details
          </div>
          <EventDetails event={selectedEvent} />
        </div>
      </div>
    </motion.div>
  )
}
