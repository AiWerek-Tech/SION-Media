/**
 * Virtual Input Adapter Simulator
 *
 * Simulates external input sources for testing, stress testing,
 * session replay, and automated QA.
 *
 * Capabilities:
 * - Random command emission
 * - Sequence replay
 * - Command storm testing
 * - Latency simulation
 * - Reconnect simulation
 *
 * @module virtualInputAdapter
 */

import type { RuntimeCommandType, CommandSource } from './runtimeCommandBus'
import { BaseRuntimeInputAdapter, type AdapterHealth } from './runtimeInputAdapter'

// ============================================================================
// Virtual Adapter Types
// ============================================================================

/**
 * Virtual Adapter Mode
 */
export type VirtualAdapterMode =
  | 'idle' // No automatic emission
  | 'random' // Random command emission
  | 'sequence' // Replay predefined sequence
  | 'storm' // High-frequency stress test
  | 'replay' // Replay recorded session

/**
 * Virtual Adapter Configuration
 */
export interface VirtualAdapterConfig {
  /** Adapter ID */
  id: string

  /** Display name */
  name: string

  /** Simulated source type */
  source: CommandSource

  /** Initial mode */
  mode?: VirtualAdapterMode

  /** Commands per second (for random/storm mode) */
  commandsPerSec?: number

  /** Latency simulation in ms */
  simulatedLatency?: number

  /** Auto-reconnect simulation */
  simulateReconnect?: boolean

  /** Reconnect interval in ms */
  reconnectInterval?: number

  /** Available commands to emit */
  availableCommands?: RuntimeCommandType[]

  /** Sequence to replay (for sequence/replay mode) */
  sequence?: CommandSequenceStep[]
}

/**
 * Command Sequence Step
 */
export interface CommandSequenceStep {
  /** Command type */
  type: RuntimeCommandType

  /** Optional payload */
  payload?: Record<string, unknown>

  /** Delay before this step in ms */
  delayMs: number
}

/**
 * Recorded Session
 */
export interface RecordedSession {
  /** Session ID */
  id: string

  /** Session name */
  name: string

  /** Recording start time */
  startTime: number

  /** Recording end time */
  endTime: number

  /** Recorded steps */
  steps: CommandSequenceStep[]

  /** Metadata */
  metadata?: {
    songId?: number
    playlistId?: number
    eventName?: string
  }
}

/**
 * Virtual Adapter State
 */
export interface VirtualAdapterState {
  /** Current mode */
  mode: VirtualAdapterMode

  /** Is running */
  isRunning: boolean

  /** Commands emitted in current session */
  commandsEmitted: number

  /** Current sequence index */
  sequenceIndex: number

  /** Current session */
  currentSession: RecordedSession | null

  /** Available sessions for replay */
  savedSessions: RecordedSession[]
}

// ============================================================================
// Virtual Runtime Input Adapter
// ============================================================================

/**
 * Virtual Runtime Input Adapter
 *
 * Simulates external input for testing purposes.
 */
export class VirtualRuntimeInputAdapter extends BaseRuntimeInputAdapter {
  id: string
  name: string
  source: CommandSource

  private config: Required<Omit<VirtualAdapterConfig, 'sequence'>> & {
    sequence: CommandSequenceStep[]
  }
  private state: VirtualAdapterState
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private timeoutHandles: ReturnType<typeof setTimeout>[] = []
  private recordedSteps: CommandSequenceStep[] = []
  private isRecording: boolean = false

  constructor(config: VirtualAdapterConfig) {
    super()

    this.id = config.id
    this.name = config.name
    this.source = config.source

    this.config = {
      id: config.id,
      name: config.name,
      source: config.source,
      mode: config.mode ?? 'idle',
      commandsPerSec: config.commandsPerSec ?? 1,
      simulatedLatency: config.simulatedLatency ?? 0,
      simulateReconnect: config.simulateReconnect ?? false,
      reconnectInterval: config.reconnectInterval ?? 5000,
      availableCommands: config.availableCommands ?? [
        'NAV_NEXT_SLIDE',
        'NAV_PREV_SLIDE',
        'PROJ_TAKE_CUE',
        'PROJ_BLACK',
        'PROJ_CLEAR',
        'PROJ_FREEZE'
      ],
      sequence: config.sequence ?? []
    }

    this.state = {
      mode: this.config.mode,
      isRunning: false,
      commandsEmitted: 0,
      sequenceIndex: 0,
      currentSession: null,
      savedSessions: []
    }
  }

  // ============================================================================
  // Connection Lifecycle
  // ============================================================================

  async connect(): Promise<{
    success: boolean
    error?: string
    metadata?: Record<string, unknown>
  }> {
    // Simulate connection delay
    if (this.config.simulatedLatency > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.simulatedLatency))
    }

    this._isConnected = true
    this._deviceInfo = {
      name: `Virtual ${this.source}`,
      manufacturer: 'SION Media',
      firmware: '1.0.0-simulator'
    }

    // Start reconnect simulation if enabled
    if (this.config.simulateReconnect) {
      this.startReconnectSimulation()
    }

    return {
      success: true,
      metadata: {
        mode: this.state.mode,
        availableCommands: this.config.availableCommands.length
      }
    }
  }

  async disconnect(): Promise<void> {
    this.stop()
    this._isConnected = false
    this.clearAllTimers()
  }

  dispose(): void {
    this.stop()
    this.clearAllTimers()
    super.dispose()
  }

  // ============================================================================
  // Mode Control
  // ============================================================================

  /**
   * Set adapter mode
   */
  setMode(mode: VirtualAdapterMode): void {
    this.state.mode = mode
    if (this.state.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * Get current state
   */
  getState(): VirtualAdapterState {
    return { ...this.state }
  }

  /**
   * Start emission
   */
  start(): void {
    if (!this._isConnected || !this._isEnabled || this.state.isRunning) return

    this.state.isRunning = true
    this.state.commandsEmitted = 0

    switch (this.state.mode) {
      case 'random':
        this.startRandomEmission()
        break
      case 'storm':
        this.startStormEmission()
        break
      case 'sequence':
        this.startSequenceReplay()
        break
      case 'replay':
        this.startSessionReplay()
        break
      case 'idle':
      default:
        // No automatic emission
        break
    }
  }

  /**
   * Stop emission
   */
  stop(): void {
    this.state.isRunning = false
    this.clearAllTimers()
  }

  // ============================================================================
  // Emission Modes
  // ============================================================================

  /**
   * Random command emission
   */
  private startRandomEmission(): void {
    const intervalMs = 1000 / this.config.commandsPerSec

    this.intervalHandle = setInterval(() => {
      if (!this._isConnected || !this._isEnabled) return

      const randomCommand = this.getRandomCommand()
      this.emitCommand(randomCommand)
      this.state.commandsEmitted++
    }, intervalMs)
  }

  /**
   * Storm test - high frequency
   */
  private startStormEmission(): void {
    // Storm mode: 100 commands/sec
    const stormRate = 100

    this.intervalHandle = setInterval(() => {
      if (!this._isConnected || !this._isEnabled) return

      const randomCommand = this.getRandomCommand()
      this.emitCommand(randomCommand)
      this.state.commandsEmitted++
    }, 1000 / stormRate)
  }

  /**
   * Sequence replay
   */
  private startSequenceReplay(): void {
    const sequence = this.config.sequence
    if (sequence.length === 0) return

    let totalDelay = 0
    for (const step of sequence) {
      totalDelay += step.delayMs

      const handle = setTimeout(() => {
        if (!this._isConnected || !this._isEnabled) return

        this.emitCommand(step.type, step.payload)
        this.state.commandsEmitted++
        this.state.sequenceIndex++

        if (this.state.sequenceIndex >= sequence.length) {
          this.state.isRunning = false
        }
      }, totalDelay)

      this.timeoutHandles.push(handle)
    }
  }

  /**
   * Session replay
   */
  private startSessionReplay(): void {
    const session = this.state.currentSession
    if (!session || session.steps.length === 0) return

    let totalDelay = 0
    for (const step of session.steps) {
      totalDelay += step.delayMs

      const handle = setTimeout(() => {
        if (!this._isConnected || !this._isEnabled) return

        this.emitCommand(step.type, step.payload)
        this.state.commandsEmitted++
        this.state.sequenceIndex++

        if (this.state.sequenceIndex >= session.steps.length) {
          this.state.isRunning = false
        }
      }, totalDelay)

      this.timeoutHandles.push(handle)
    }
  }

  // ============================================================================
  // Recording
  // ============================================================================

  /**
   * Start recording commands
   */
  startRecording(name: string, metadata?: RecordedSession['metadata']): void {
    this.isRecording = true
    this.recordedSteps = []
    this.state.currentSession = {
      id: `session-${Date.now()}`,
      name,
      startTime: Date.now(),
      endTime: 0,
      steps: [],
      metadata
    }
  }

  /**
   * Record a command
   */
  recordCommand(type: RuntimeCommandType, payload?: Record<string, unknown>): void {
    if (!this.isRecording) return

    const lastStep = this.recordedSteps[this.recordedSteps.length - 1]
    const delayMs = lastStep ? 100 : 0 // Default 100ms between steps

    this.recordedSteps.push({
      type,
      payload,
      delayMs
    })
  }

  /**
   * Stop recording and save session
   */
  stopRecording(): RecordedSession | null {
    if (!this.isRecording || !this.state.currentSession) return null

    this.isRecording = false
    this.state.currentSession.endTime = Date.now()
    this.state.currentSession.steps = this.recordedSteps

    this.state.savedSessions.push(this.state.currentSession)

    return this.state.currentSession
  }

  /**
   * Load session for replay
   */
  loadSession(session: RecordedSession): void {
    this.state.currentSession = session
    this.state.mode = 'replay'
  }

  /**
   * Get saved sessions
   */
  getSavedSessions(): RecordedSession[] {
    return [...this.state.savedSessions]
  }

  /**
   * Clear saved sessions
   */
  clearSessions(): void {
    this.state.savedSessions = []
  }

  // ============================================================================
  // Manual Emission
  // ============================================================================

  /**
   * Manually emit a command
   */
  emitCommandManual(type: RuntimeCommandType, payload?: Record<string, unknown>): void {
    this.emitCommand(type, payload)

    // Record if recording
    if (this.isRecording) {
      this.recordCommand(type, payload)
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Get random command from available commands
   */
  private getRandomCommand(): RuntimeCommandType {
    const commands = this.config.availableCommands
    return commands[Math.floor(Math.random() * commands.length)]
  }

  /**
   * Start reconnect simulation
   */
  private startReconnectSimulation(): void {
    this.intervalHandle = setInterval(() => {
      if (!this._isConnected) return

      // Simulate disconnect
      this._isConnected = false
      this.recordReconnect()

      // Simulate reconnect after delay
      setTimeout(() => {
        this._isConnected = true
      }, 500)
    }, this.config.reconnectInterval)
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }

    for (const handle of this.timeoutHandles) {
      clearTimeout(handle)
    }
    this.timeoutHandles = []
  }

  // ============================================================================
  // Health Override
  // ============================================================================

  getHealth(): AdapterHealth {
    const baseHealth = super.getHealth()

    return {
      ...baseHealth,
      latencyMs: this.config.simulatedLatency,
      deviceInfo: {
        ...baseHealth.deviceInfo,
        name: `Virtual ${this.source} [${this.state.mode}]`
      }
    }
  }
}

// ============================================================================
// Pre-built Virtual Adapters
// ============================================================================

/**
 * Create a MIDI simulator
 */
export function createVirtualMIDIAdapter(): VirtualRuntimeInputAdapter {
  return new VirtualRuntimeInputAdapter({
    id: 'virtual-midi-1',
    name: 'Virtual MIDI Controller',
    source: 'MIDI',
    mode: 'idle',
    availableCommands: [
      'NAV_NEXT_SLIDE',
      'NAV_PREV_SLIDE',
      'PROJ_TAKE_CUE',
      'PROJ_BLACK',
      'PROJ_CLEAR'
    ]
  })
}

/**
 * Create a Stream Deck simulator
 */
export function createVirtualStreamDeckAdapter(): VirtualRuntimeInputAdapter {
  return new VirtualRuntimeInputAdapter({
    id: 'virtual-streamdeck-1',
    name: 'Virtual Stream Deck',
    source: 'STREAM_DECK',
    mode: 'idle',
    availableCommands: [
      'NAV_NEXT_SLIDE',
      'NAV_PREV_SLIDE',
      'PROJ_TAKE_CUE',
      'PROJ_BLACK',
      'PROJ_FREEZE',
      'PROJ_CLEAR'
    ]
  })
}

/**
 * Create a remote app simulator
 */
export function createVirtualRemoteAdapter(): VirtualRuntimeInputAdapter {
  return new VirtualRuntimeInputAdapter({
    id: 'virtual-remote-1',
    name: 'Virtual Remote App',
    source: 'REMOTE_APP',
    mode: 'idle',
    availableCommands: ['NAV_NEXT_SLIDE', 'NAV_PREV_SLIDE', 'NAV_GOTO_SLIDE', 'PROJ_TAKE_CUE']
  })
}

/**
 * Create a storm test adapter
 */
export function createStormTestAdapter(rate: number = 100): VirtualRuntimeInputAdapter {
  return new VirtualRuntimeInputAdapter({
    id: 'storm-test-1',
    name: 'Storm Test Adapter',
    source: 'AUTOMATION',
    mode: 'storm',
    commandsPerSec: rate,
    availableCommands: ['NAV_NEXT_SLIDE', 'NAV_PREV_SLIDE', 'PROJ_TAKE_CUE']
  })
}

// ============================================================================
// Session Storage Utilities
// ============================================================================

/**
 * Export session to JSON
 */
export function exportSession(session: RecordedSession): string {
  return JSON.stringify(session, null, 2)
}

/**
 * Import session from JSON
 */
export function importSession(json: string): RecordedSession {
  return JSON.parse(json) as RecordedSession
}

/**
 * Save sessions to localStorage
 */
export function saveSessionsToStorage(sessions: RecordedSession[]): void {
  localStorage.setItem('sion-virtual-sessions', JSON.stringify(sessions))
}

/**
 * Load sessions from localStorage
 */
export function loadSessionsFromStorage(): RecordedSession[] {
  const stored = localStorage.getItem('sion-virtual-sessions')
  if (!stored) return []

  try {
    return JSON.parse(stored) as RecordedSession[]
  } catch {
    return []
  }
}
