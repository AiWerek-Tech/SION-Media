import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Play, Square, Zap, CircleDot, ChevronDown, ChevronUp } from 'lucide-react'
import {
  VirtualRuntimeInputAdapter,
  VirtualAdapterMode,
  createVirtualMIDIAdapter,
  createVirtualStreamDeckAdapter,
  createVirtualRemoteAdapter,
  createStormTestAdapter,
  type RecordedSession
} from '@renderer/utils/virtualInputAdapter'
import { registerInputAdapter } from '@renderer/utils/runtimeInputAdapter'
import type { RuntimeCommandType } from '@renderer/utils/runtimeCommandBus'

// Mode badge component
function ModeBadge({ mode }: { mode: VirtualAdapterMode }): React.JSX.Element {
  const config: Record<VirtualAdapterMode, { color: string; bg: string; label: string }> = {
    idle: { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'IDLE' },
    random: { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'RANDOM' },
    sequence: { color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'SEQUENCE' },
    storm: { color: 'text-danger', bg: 'bg-danger/10', label: 'STORM' },
    replay: { color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'REPLAY' }
  }

  const { color, bg, label } = config[mode]

  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${bg} ${color}`}>{label}</span>
}

// Adapter card component
function AdapterCard({
  adapter,
  onStart,
  onStop,
  onModeChange,
  onManualEmit
}: {
  adapter: VirtualRuntimeInputAdapter
  onStart: () => void
  onStop: () => void
  onModeChange: (mode: VirtualAdapterMode) => void
  onManualEmit: (type: RuntimeCommandType) => void
}): React.JSX.Element {
  const state = adapter.getState()
  const health = adapter.getHealth()
  const [showSettings, setShowSettings] = useState(false)

  const commands = [
    'NAV_NEXT_SLIDE',
    'NAV_PREV_SLIDE',
    'PROJ_TAKE_CUE',
    'PROJ_BLACK',
    'PROJ_FREEZE',
    'PROJ_CLEAR'
  ] as RuntimeCommandType[]

  return (
    <div className="bg-black/20 rounded-lg border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-accent" />
          <span className="text-xs font-medium">{adapter.name}</span>
          <ModeBadge mode={state.mode} />
        </div>
        <div className="flex items-center gap-1">
          {state.isRunning ? (
            <button
              onClick={onStop}
              className="p-1 rounded hover:bg-danger/20 text-danger transition-colors"
            >
              <Square size={12} />
            </button>
          ) : (
            <button
              onClick={onStart}
              className="p-1 rounded hover:bg-live/20 text-live transition-colors"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-white/10 text-gray-400 transition-colors"
          >
            {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-3 py-1.5 text-[10px] font-mono text-gray-400">
        <span>
          Emitted: <span className="text-gray-300">{state.commandsEmitted}</span>
        </span>
        <span>
          Dropped: <span className="text-danger">{health.commandsDropped}</span>
        </span>
        <span>
          Status:
          <span className={state.isRunning ? 'text-live ml-1' : 'text-gray-500 ml-1'}>
            {state.isRunning ? 'Running' : 'Stopped'}
          </span>
        </span>
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30"
          >
            <div className="p-3 space-y-3">
              {/* Mode selector */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Mode</label>
                <div className="flex gap-1">
                  {(['idle', 'random', 'storm'] as VirtualAdapterMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onModeChange(mode)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                        state.mode === mode
                          ? 'bg-accent/20 text-accent'
                          : 'bg-white/5 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual emit */}
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Manual Emit</label>
                <div className="flex flex-wrap gap-1">
                  {commands.slice(0, 4).map((cmd) => (
                    <button
                      key={cmd}
                      onClick={() => onManualEmit(cmd)}
                      className="px-2 py-1 rounded text-[10px] font-mono bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {cmd.replace('NAV_', '').replace('PROJ_', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Session recorder component
function SessionRecorder({
  sessions,
  onRecord,
  onStopRecord,
  onLoad,
  onClear,
  isRecording
}: {
  sessions: RecordedSession[]
  onRecord: (name: string) => void
  onStopRecord: () => void
  onLoad: (session: RecordedSession) => void
  onClear: () => void
  isRecording: boolean
}): React.JSX.Element {
  const [sessionName, setSessionName] = useState('')

  return (
    <div className="bg-black/20 rounded-lg border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <CircleDot
            size={14}
            className={isRecording ? 'text-danger animate-pulse' : 'text-gray-400'}
          />
          <span className="text-xs font-medium">Session Recorder</span>
        </div>
        <div className="flex items-center gap-1">
          {isRecording ? (
            <button
              onClick={onStopRecord}
              className="px-2 py-1 rounded text-[10px] font-mono bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => {
                if (sessionName.trim()) {
                  onRecord(sessionName.trim())
                  setSessionName('')
                }
              }}
              className="px-2 py-1 rounded text-[10px] font-mono bg-live/20 text-live hover:bg-live/30 transition-colors"
            >
              Record
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {!isRecording && (
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session name..."
            className="w-full px-2 py-1 rounded bg-black/30 border border-border/30 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-accent/50"
          />
        )}

        {sessions.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Saved Sessions ({sessions.length})</span>
              <button
                onClick={onClear}
                className="text-[10px] text-gray-500 hover:text-danger transition-colors"
              >
                Clear
              </button>
            </div>
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onLoad(session)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-[10px] text-gray-300">{session.name}</span>
                <span className="text-[10px] text-gray-500">{session.steps.length} steps</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function VirtualAdapterSimulator(): React.JSX.Element {
  const [adapters, setAdapters] = useState<VirtualRuntimeInputAdapter[]>([])
  const [sessions, setSessions] = useState<RecordedSession[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingAdapter, setRecordingAdapter] = useState<VirtualRuntimeInputAdapter | null>(null)

  // Initialize adapters
  useEffect(() => {
    const midi = createVirtualMIDIAdapter()
    const streamDeck = createVirtualStreamDeckAdapter()
    const remote = createVirtualRemoteAdapter()

    // Register with input adapter registry
    registerInputAdapter(midi)
    registerInputAdapter(streamDeck)
    registerInputAdapter(remote)

    // Connect all
    midi.connect().catch(console.error)
    streamDeck.connect().catch(console.error)
    remote.connect().catch(console.error)

    setTimeout(() => {
      setAdapters([midi, streamDeck, remote])
    }, 0)

    return () => {
      midi.disconnect().catch(console.error)
      streamDeck.disconnect().catch(console.error)
      remote.disconnect().catch(console.error)
    }
  }, [])

  const handleStart = (adapter: VirtualRuntimeInputAdapter): void => {
    adapter.start()
    // Force re-render
    setAdapters([...adapters])
  }

  const handleStop = (adapter: VirtualRuntimeInputAdapter): void => {
    adapter.stop()
    setAdapters([...adapters])
  }

  const handleModeChange = (
    adapter: VirtualRuntimeInputAdapter,
    mode: VirtualAdapterMode
  ): void => {
    adapter.setMode(mode)
    setAdapters([...adapters])
  }

  const handleManualEmit = (
    adapter: VirtualRuntimeInputAdapter,
    type: RuntimeCommandType
  ): void => {
    adapter.emitCommandManual(type)
    setAdapters([...adapters])
  }

  const handleStartRecording = (name: string): void => {
    if (adapters.length === 0) return
    const adapter = adapters[0] // Use first adapter for recording
    adapter.startRecording(name)
    setIsRecording(true)
    setRecordingAdapter(adapter)
  }

  const handleStopRecording = (): void => {
    if (!recordingAdapter) return
    const session = recordingAdapter.stopRecording()
    if (session) {
      setSessions([...sessions, session])
    }
    setIsRecording(false)
    setRecordingAdapter(null)
  }

  const handleLoadSession = (session: RecordedSession): void => {
    if (adapters.length === 0) return
    const adapter = adapters[0]
    adapter.loadSession(session)
    adapter.start()
    setAdapters([...adapters])
  }

  const handleClearSessions = (): void => {
    setSessions([])
    adapters.forEach((a) => a.clearSessions())
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* Adapters */}
      {adapters.map((adapter) => (
        <AdapterCard
          key={adapter.id}
          adapter={adapter}
          onStart={() => handleStart(adapter)}
          onStop={() => handleStop(adapter)}
          onModeChange={(mode) => handleModeChange(adapter, mode)}
          onManualEmit={(type) => handleManualEmit(adapter, type)}
        />
      ))}

      {/* Session Recorder */}
      <SessionRecorder
        sessions={sessions}
        onRecord={handleStartRecording}
        onStopRecord={handleStopRecording}
        onLoad={handleLoadSession}
        onClear={handleClearSessions}
        isRecording={isRecording}
      />

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const storm = createStormTestAdapter(50)
            storm.connect().then(() => {
              registerInputAdapter(storm)
              storm.start()
              setAdapters([...adapters, storm])
            })
          }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors text-xs"
        >
          <Zap size={12} />
          Storm Test
        </button>
        <button
          onClick={() => {
            adapters.forEach((a) => {
              a.stop()
              a.disconnect()
            })
            setAdapters([])
          }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors text-xs"
        >
          <Square size={12} />
          Stop All
        </button>
      </div>
    </div>
  )
}
